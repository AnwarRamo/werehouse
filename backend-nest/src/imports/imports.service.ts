import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { parse as parseCsv } from 'csv-parse/sync';
import { extname } from 'path';
import { Queue } from 'bullmq';
import ExcelJS from 'exceljs';
import { QUEUE_JOBS, QUEUE_NAMES } from '../queues/queue.constants';
import { PaginationQueryParams } from '../common/types/query.types';
import { resolvePagination } from '../common/utils/pagination.util';

type ParsedRow = Record<string, string>;
type RowError = { row: number; error: string };
type ParseResult = { rows: ParsedRow[]; headers: string[] };

const IMPORT_BATCH_SIZE = 50;
const IMPORT_MAX_ROWS = 50_000;

type ImportQueuePayload = {
  importJobRecordId: string;
  rows: ParsedRow[];
};

type RowParseValue = string | number | boolean | Date | null | undefined;

type RowParseError = {
  message?: string;
};

export type ImportsHistoryQuery = PaginationQueryParams & {
  entity?: string;
  status?: string;
};

@Injectable()
export class ImportsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.IMPORTS) private readonly importsQueue: Queue,
  ) {}

  async history(query: ImportsHistoryQuery) {
    const { page, limit, skip } = resolvePagination(query);
    const where: Prisma.ImportJobWhereInput = {};
    if (query.entity) where.entity = query.entity;
    if (query.status) where.status = query.status;

    const [imports, total] = await Promise.all([
      this.prisma.importJob.findMany({
        where,
        orderBy: { uploadedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.importJob.count({ where }),
    ]);

    return { imports, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async stats() {
    const jobs = await this.prisma.importJob.findMany();
    const byEntity: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    for (const job of jobs) {
      byEntity[job.entity] = (byEntity[job.entity] || 0) + 1;
      byStatus[job.status] = (byStatus[job.status] || 0) + 1;
    }

    const totalRowsProcessed = jobs.reduce((s: number, j: (typeof jobs)[number]) => s + (j.totalRows || 0), 0);
    const totalRowsFailed = jobs.reduce((s: number, j: (typeof jobs)[number]) => s + (j.errorRows || 0), 0);

    return {
      totalImports: jobs.length,
      byEntity,
      byStatus,
      totalRowsProcessed,
      totalRowsFailed,
      successRate: totalRowsProcessed
        ? (((totalRowsProcessed - totalRowsFailed) / totalRowsProcessed) * 100).toFixed(2)
        : '0.00',
    };
  }

  async details(jobId: string) {
    const job = await this.prisma.importJob.findUnique({ where: { jobId } });
    if (!job) throw new NotFoundException('Import job not found');

    const errorSummary: Record<string, number> = {};
    for (const e of (job.errors as RowError[] | undefined) || []) {
      const key = e.error || 'Unknown error';
      errorSummary[key] = (errorSummary[key] || 0) + 1;
    }

    return { ...job, errorSummary };
  }

  getEmployeesTemplateCsv() {
    return [
      'employeeId,name,email,hourlyRate,currency,department,status,scheduledStart,scheduledEnd,roleId',
      'EMP001,John Doe,john.doe@example.com,12.5,SYP,Warehouse,active,08:00,16:00,',
    ].join('\n');
  }

  getProductsTemplateCsv() {
    return [
      'sku,name,category,unitPrice,costPrice,reorderLevel,status',
      'SKU-001,Sample Item,General,100,70,10,active',
    ].join('\n');
  }

  async validateEmployeesImport(file: Express.Multer.File) {
    if (!file?.buffer) throw new BadRequestException('CSV/XLSX file is required in field: file');
    const { rows, headers } = await this.parseImportRowsAsync(file.buffer, file?.originalname, file?.mimetype);
    this.assertEmployeesHeaders(headers);
    const result = await this.processEmployeesRows(rows, false);
    return { message: 'Employees import validation completed (dry-run)', ...result };
  }

  async validateProductsImport(file: Express.Multer.File) {
    if (!file?.buffer) throw new BadRequestException('CSV/XLSX file is required in field: file');
    const { rows, headers } = await this.parseImportRowsAsync(file.buffer, file?.originalname, file?.mimetype);
    this.assertProductsHeaders(headers);
    const result = await this.processProductsRows(rows, false);
    return { message: 'Products import validation completed (dry-run)', ...result };
  }

  async importEmployees(file: Express.Multer.File, userId: string) {
    if (!file?.buffer) throw new BadRequestException('CSV/XLSX file is required in field: file');

    const { rows, headers } = await this.parseImportRowsAsync(file.buffer, file?.originalname, file?.mimetype);
    this.assertEmployeesHeaders(headers);

    const jobId = `IMP-EMP-${Date.now()}`;
    const job = await this.prisma.importJob.create({
      data: {
        jobId,
        entity: 'employees',
        fileName: file?.originalname || 'employees.csv',
        uploadedBy: userId || 'system',
        status: 'processing',
        totalRows: rows.length,
      },
    });

    const result = await this.processEmployeesRows(rows, true);
    const { totalRows, successRows, errorRows, errors } = result;
    const status = this.jobStatus(totalRows, successRows, errorRows);

    await this.prisma.importJob.update({
      where: { id: job.id },
      data: {
        status,
        totalRows,
        successRows,
        errorRows,
        errors,
      },
    });

    return { message: 'Employee import processed', jobId: job.jobId, status, totalRows, successRows, errorRows };
  }

  async importEmployeesAsync(file: Express.Multer.File, userId: string) {
    if (!file?.buffer) throw new BadRequestException('CSV/XLSX file is required in field: file');

    const { rows, headers } = await this.parseImportRowsAsync(file.buffer, file?.originalname, file?.mimetype);
    this.assertEmployeesHeaders(headers);

    const jobId = `IMP-EMP-${Date.now()}`;
    const job = await this.prisma.importJob.create({
      data: {
        jobId,
        entity: 'employees',
        fileName: file?.originalname || 'employees.csv',
        uploadedBy: userId || 'system',
        status: 'queued',
        totalRows: rows.length,
      },
    });

    await this.enqueueImportJob(QUEUE_JOBS.IMPORT_EMPLOYEES, { importJobRecordId: job.id, rows });

    return { message: 'Employee import queued', jobId: job.jobId, status: 'queued', totalRows: rows.length };
  }

  async importProducts(file: Express.Multer.File, userId: string) {
    if (!file?.buffer) throw new BadRequestException('CSV/XLSX file is required in field: file');

    const { rows, headers } = await this.parseImportRowsAsync(file.buffer, file?.originalname, file?.mimetype);
    this.assertProductsHeaders(headers);

    const jobId = `IMP-PROD-${Date.now()}`;
    const job = await this.prisma.importJob.create({
      data: {
        jobId,
        entity: 'products',
        fileName: file?.originalname || 'products.csv',
        uploadedBy: userId || 'system',
        status: 'processing',
        totalRows: rows.length,
      },
    });

    const result = await this.processProductsRows(rows, true);
    const { totalRows, successRows, errorRows, errors } = result;
    const status = this.jobStatus(totalRows, successRows, errorRows);

    await this.prisma.importJob.update({
      where: { id: job.id },
      data: {
        status,
        totalRows,
        successRows,
        errorRows,
        errors,
      },
    });

    return { message: 'Product import processed', jobId: job.jobId, status, totalRows, successRows, errorRows };
  }

  async importProductsAsync(file: Express.Multer.File, userId: string) {
    if (!file?.buffer) throw new BadRequestException('CSV/XLSX file is required in field: file');

    const { rows, headers } = await this.parseImportRowsAsync(file.buffer, file?.originalname, file?.mimetype);
    this.assertProductsHeaders(headers);

    const jobId = `IMP-PROD-${Date.now()}`;
    const job = await this.prisma.importJob.create({
      data: {
        jobId,
        entity: 'products',
        fileName: file?.originalname || 'products.csv',
        uploadedBy: userId || 'system',
        status: 'queued',
        totalRows: rows.length,
      },
    });

    await this.enqueueImportJob(QUEUE_JOBS.IMPORT_PRODUCTS, { importJobRecordId: job.id, rows });

    return { message: 'Product import queued', jobId: job.jobId, status: 'queued', totalRows: rows.length };
  }

  async retry(jobId: string, userId: string) {
    const original = await this.prisma.importJob.findUnique({ where: { jobId } });
    if (!original) throw new NotFoundException('Import job not found');

    const retryJob = await this.prisma.importJob.create({
      data: {
        jobId: `${jobId}-RETRY-${Date.now()}`,
        entity: original.entity,
        fileName: `${original.fileName} (Retry)`,
        uploadedBy: userId || 'system',
        status: 'pending',
        totalRows: original.errorRows || 0,
      },
    });

    return { message: 'Retry initiated', originalJobId: jobId, retryJobId: retryJob.jobId, status: retryJob.status };
  }

  async processEmployeesImportJob(importJobRecordId: string, rows: ParsedRow[]) {
    await this.prisma.importJob.update({ where: { id: importJobRecordId }, data: { status: 'processing' } });
    const { totalRows, successRows, errorRows, errors } = await this.processEmployeesRows(rows, true);
    const status = this.jobStatus(totalRows, successRows, errorRows);
    await this.prisma.importJob.update({
      where: { id: importJobRecordId },
      data: { status, totalRows, successRows, errorRows, errors },
    });
    return { status, totalRows, successRows, errorRows };
  }

  async processProductsImportJob(importJobRecordId: string, rows: ParsedRow[]) {
    await this.prisma.importJob.update({ where: { id: importJobRecordId }, data: { status: 'processing' } });
    const { totalRows, successRows, errorRows, errors } = await this.processProductsRows(rows, true);
    const status = this.jobStatus(totalRows, successRows, errorRows);
    await this.prisma.importJob.update({
      where: { id: importJobRecordId },
      data: { status, totalRows, successRows, errorRows, errors },
    });
    return { status, totalRows, successRows, errorRows };
  }

  async markImportJobFailed(importJobRecordId: string, message: string) {
    await this.prisma.importJob.update({
      where: { id: importJobRecordId },
      data: {
        status: 'failed',
        errors: [{ row: 0, error: message || 'Unexpected import error' }],
      },
    });
  }

  private async enqueueImportJob(jobName: string, payload: ImportQueuePayload) {
    try {
      await this.importsQueue.add(jobName, payload, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2_000 },
      });
      return;
    } catch {
      if (jobName === QUEUE_JOBS.IMPORT_EMPLOYEES) {
        await this.processEmployeesImportJob(payload.importJobRecordId, payload.rows);
        return;
      }

      if (jobName === QUEUE_JOBS.IMPORT_PRODUCTS) {
        await this.processProductsImportJob(payload.importJobRecordId, payload.rows);
        return;
      }

      throw new Error('Unable to enqueue import job');
    }
  }

  private parseImportRows(buffer: Buffer, fileName?: string, mimeType?: string): ParseResult {
    const extension = extname(fileName || '').toLowerCase();
    const detectedFormat =
      extension === '.xlsx' ||
      extension === '.xls' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mimeType === 'application/vnd.ms-excel'
        ? 'xlsx'
        : 'csv';

    if (detectedFormat === 'xlsx') {
      // exceljs requires async — we use a sync-compatible workaround via loadFile on buffer
      // We return a promise-based result wrapped in a sync throw if needed.
      // Since NestJS services are async-capable, callers must await this.
      throw new BadRequestException(
        'Excel parsing is async — use parseImportRowsAsync instead',
      );
    }

    const text = buffer.toString('utf8');
    const parsed = parseCsv(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    }) as Record<string, RowParseValue>[];
    const first = parsed[0] || {};
    const headers = Object.keys(first).map((key) => this.normalizeHeader(key));
    const rows = parsed.map((row) => {
      const normalized: ParsedRow = {};
      for (const [key, value] of Object.entries(row)) {
        normalized[this.normalizeHeader(key)] = String(value ?? '').trim();
      }
      return normalized;
    });
    if (rows.length > IMPORT_MAX_ROWS) {
      throw new BadRequestException(
        `Import file is too large. Maximum allowed rows is ${IMPORT_MAX_ROWS}. Split the file and retry.`,
      );
    }

    return { rows, headers };
  }

  private async parseImportRowsAsync(buffer: Buffer, fileName?: string, mimeType?: string): Promise<ParseResult> {
    const extension = extname(fileName || '').toLowerCase();
    const isExcel =
      extension === '.xlsx' ||
      extension === '.xls' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mimeType === 'application/vnd.ms-excel';

    if (isExcel) {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer);
      const worksheet = workbook.worksheets[0];
      if (!worksheet) throw new BadRequestException('Excel file must contain at least one worksheet');

      const rawRows: string[][] = [];
      worksheet.eachRow((row) => {
        rawRows.push(
          (row.values as (ExcelJS.CellValue | null)[])
            .slice(1) // exceljs row.values is 1-indexed with undefined at [0]
            .map((v) => (v === null || v === undefined ? '' : String(v).trim())),
        );
      });

      if (rawRows.length < 1) return { rows: [], headers: [] };

      const headers = rawRows[0].map((h) => this.normalizeHeader(h));
      const rows: ParsedRow[] = rawRows.slice(1).map((cells) => {
        const row: ParsedRow = {};
        headers.forEach((h, i) => { row[h] = cells[i] ?? ''; });
        return row;
      });

      if (rows.length > IMPORT_MAX_ROWS) {
        throw new BadRequestException(
          `Import file is too large. Maximum allowed rows is ${IMPORT_MAX_ROWS}. Split the file and retry.`,
        );
      }

      return { rows, headers };
    }

    // CSV path
    const text = buffer.toString('utf8');
    const parsed = parseCsv(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    }) as Record<string, RowParseValue>[];
    const first = parsed[0] || {};
    const headers = Object.keys(first).map((key) => this.normalizeHeader(key));
    const rows = parsed.map((row) => {
      const normalized: ParsedRow = {};
      for (const [key, value] of Object.entries(row)) {
        normalized[this.normalizeHeader(key)] = String(value ?? '').trim();
      }
      return normalized;
    });
    if (rows.length > IMPORT_MAX_ROWS) {
      throw new BadRequestException(
        `Import file is too large. Maximum allowed rows is ${IMPORT_MAX_ROWS}. Split the file and retry.`,
      );
    }

    return { rows, headers };
  }

  private value(row: ParsedRow, aliases: string[]) {
    for (const key of aliases) {
      const found = row[this.normalizeHeader(key)];
      if (found !== undefined && found !== '') return found;
    }
    return '';
  }

  private async resolveDefaultRoleId(): Promise<string> {
    const preferred = await this.prisma.role.findFirst({ where: { name: { in: ['staff', 'admin'] } } });
    if (preferred?.id) return preferred.id;
    const first = await this.prisma.role.findFirst();
    if (first?.id) return first.id;
    const created = await this.prisma.role.create({
      data: { name: 'staff', description: 'Default staff role', permissions: [] },
    });
    return created.id;
  }

  private async resolveRoleId(roleIdRaw: string, fallbackRoleId: string): Promise<string> {
    if (!roleIdRaw) return fallbackRoleId;
    const role = await this.prisma.role.findUnique({ where: { id: roleIdRaw } });
    if (!role) throw new Error('roleId not found');
    return role.id;
  }

  private assertEmployeesHeaders(headers: string[]) {
    const missing = [
      ['employeeid', 'employee_id', 'id'],
      ['name', 'fullname', 'full_name'],
      ['email', 'mail'],
      ['hourlyrate', 'hourly_rate', 'rate'],
    ]
      .filter((aliases) => !this.headerExists(headers, aliases))
      .map((aliases) => aliases[0]);
    if (missing.length > 0) throw new BadRequestException(`Missing required CSV headers: ${missing.join(', ')}`);
  }

  private assertProductsHeaders(headers: string[]) {
    const missing = [['sku'], ['name'], ['category'], ['unitprice', 'unit_price', 'price'], ['costprice', 'cost_price']]
      .filter((aliases) => !this.headerExists(headers, aliases))
      .map((aliases) => aliases[0]);
    if (missing.length > 0) throw new BadRequestException(`Missing required CSV headers: ${missing.join(', ')}`);
  }

  private headerExists(headers: string[], aliases: string[]) {
    const set = new Set(headers.map((h) => this.normalizeHeader(h)));
    return aliases.some((a) => set.has(this.normalizeHeader(a)));
  }

  private async processEmployeesRows(rows: ParsedRow[], persist: boolean) {
    const errors: RowError[] = [];
    let successRows = 0;
    const defaultRoleId = persist ? await this.resolveDefaultRoleId() : '';

    for (let offset = 0; offset < rows.length; offset += IMPORT_BATCH_SIZE) {
      const batch = rows.slice(offset, offset + IMPORT_BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (input, index) => {
          try {
        const employeeId = this.value(input, ['employeeid', 'employee_id', 'id']);
        const name = this.value(input, ['name', 'fullname', 'full_name']);
        const email = this.value(input, ['email', 'mail']);
        const hourlyRateRaw = this.value(input, ['hourlyrate', 'hourly_rate', 'rate']);
        const currency = this.value(input, ['currency']) || 'SYP';
        const department = this.value(input, ['department']) || 'Warehouse';
        const scheduledStart = this.value(input, ['scheduledstart', 'scheduled_start', 'start']) || undefined;
        const scheduledEnd = this.value(input, ['scheduledend', 'scheduled_end', 'end']) || undefined;
        const status = this.value(input, ['status']) || 'active';
        const roleIdRaw = this.value(input, ['roleid', 'role_id']);

        if (!employeeId || !name || !email || !hourlyRateRaw) throw new Error('Missing required fields: employeeId, name, email, hourlyRate');
        const hourlyRate = Number(hourlyRateRaw);
        if (Number.isNaN(hourlyRate) || hourlyRate < 0) throw new Error('hourlyRate must be a valid non-negative number');
        if (!['active', 'inactive', 'on_leave', 'terminated'].includes(status)) throw new Error('status must be one of: active, inactive, on_leave, terminated');

        if (persist) {
          const roleId = await this.resolveRoleId(roleIdRaw, defaultRoleId);
          await this.prisma.employee.upsert({
            where: { employeeId },
            update: {
              name,
              email: email.toLowerCase(),
              hourlyRate: new Prisma.Decimal(hourlyRate),
              currency,
              department,
              scheduledStart,
              scheduledEnd,
              status,
              roleId,
            },
            create: {
              employeeId,
              name,
              email: email.toLowerCase(),
              hourlyRate: new Prisma.Decimal(hourlyRate),
              currency,
              department,
              scheduledStart,
              scheduledEnd,
              status,
              roleId,
            },
          });
        }
            return null;
          } catch (error: unknown) {
            const typedError = error as RowParseError;
            return {
              row: offset + index + 1,
              error: typedError.message || 'Unknown validation error',
            };
          }
        }),
      );

      for (const result of batchResults) {
        if (result) {
          errors.push(result);
        } else {
          successRows++;
        }
      }
    }

    return { totalRows: rows.length, successRows, errorRows: errors.length, errors };
  }

  private async processProductsRows(rows: ParsedRow[], persist: boolean) {
    const errors: RowError[] = [];
    let successRows = 0;

    for (let offset = 0; offset < rows.length; offset += IMPORT_BATCH_SIZE) {
      const batch = rows.slice(offset, offset + IMPORT_BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (input, index) => {
          try {
        const sku = this.value(input, ['sku']);
        const name = this.value(input, ['name']);
        const category = this.value(input, ['category']);
        const unitPriceRaw = this.value(input, ['unitprice', 'unit_price', 'price']);
        const costPriceRaw = this.value(input, ['costprice', 'cost_price']);
        const reorderLevelRaw = this.value(input, ['reorderlevel', 'reorder_level', 'reorder']);
        const status = this.value(input, ['status']) || 'active';

        if (!sku || !name || !category || !unitPriceRaw || !costPriceRaw) throw new Error('Missing required fields: sku, name, category, unitPrice, costPrice');
        const unitPrice = Number(unitPriceRaw);
        const costPrice = Number(costPriceRaw);
        const reorderLevel = reorderLevelRaw ? Number(reorderLevelRaw) : 10;
        if (Number.isNaN(unitPrice) || Number.isNaN(costPrice) || Number.isNaN(reorderLevel)) throw new Error('unitPrice, costPrice and reorderLevel must be valid numbers');
        if (unitPrice < 0 || costPrice < 0 || reorderLevel < 0) throw new Error('unitPrice, costPrice and reorderLevel must be non-negative numbers');

        if (persist) {
          await this.prisma.product.upsert({
            where: { sku },
            update: {
              name,
              category,
              unitPrice: new Prisma.Decimal(unitPrice),
              costPrice: new Prisma.Decimal(costPrice),
              reorderLevel,
              status,
            },
            create: {
              sku,
              name,
              category,
              unitPrice: new Prisma.Decimal(unitPrice),
              costPrice: new Prisma.Decimal(costPrice),
              reorderLevel,
              status,
            },
          });
        }
            return null;
          } catch (error: unknown) {
            const typedError = error as RowParseError;
            return {
              row: offset + index + 1,
              error: typedError.message || 'Unknown validation error',
            };
          }
        }),
      );

      for (const result of batchResults) {
        if (result) {
          errors.push(result);
        } else {
          successRows++;
        }
      }
    }

    return { totalRows: rows.length, successRows, errorRows: errors.length, errors };
  }

  private normalizeHeader(value: string) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  private jobStatus(totalRows: number, successRows: number, errorRows: number) {
    if (totalRows === 0 || errorRows === 0) return 'completed';
    if (successRows === 0) return 'failed';
    return 'partial';
  }
}
