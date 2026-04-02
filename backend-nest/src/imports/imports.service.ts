import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { parse } from 'csv-parse/sync';

type ParsedRow = Record<string, string>;
type RowError = { row: number; error: string };
type ParseResult = { rows: ParsedRow[]; headers: string[] };

@Injectable()
export class ImportsService {
  constructor(private readonly prisma: PrismaService) {}

  async history(query: any) {
    const page = Number(query.page || 1);
    const limit = Math.min(Number(query.limit || 50), 200);
    const skip = (page - 1) * limit;
    const where: Prisma.ImportJobWhereInput = {};
    if (query.entity) where.entity = query.entity;

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

  async validateEmployeesImport(file: any) {
    if (!file?.buffer) throw new BadRequestException('CSV file is required in field: file');
    const { rows, headers } = this.parseCsvRows(file.buffer);
    this.assertEmployeesHeaders(headers);
    const result = await this.processEmployeesRows(rows, false);
    return { message: 'Employees CSV validation completed (dry-run)', ...result };
  }

  async validateProductsImport(file: any) {
    if (!file?.buffer) throw new BadRequestException('CSV file is required in field: file');
    const { rows, headers } = this.parseCsvRows(file.buffer);
    this.assertProductsHeaders(headers);
    const result = await this.processProductsRows(rows, false);
    return { message: 'Products CSV validation completed (dry-run)', ...result };
  }

  async importEmployees(file: any, userId: string) {
    if (!file?.buffer) throw new BadRequestException('CSV file is required in field: file');

    const jobId = `IMP-EMP-${Date.now()}`;
    const job = await this.prisma.importJob.create({
      data: {
        jobId,
        entity: 'employees',
        fileName: file?.originalname || 'employees.csv',
        uploadedBy: userId || 'system',
        status: 'processing',
      },
    });

    const { rows, headers } = this.parseCsvRows(file.buffer);
    this.assertEmployeesHeaders(headers);
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

  async importProducts(file: any, userId: string) {
    if (!file?.buffer) throw new BadRequestException('CSV file is required in field: file');

    const jobId = `IMP-PROD-${Date.now()}`;
    const job = await this.prisma.importJob.create({
      data: {
        jobId,
        entity: 'products',
        fileName: file?.originalname || 'products.csv',
        uploadedBy: userId || 'system',
        status: 'processing',
      },
    });

    const { rows, headers } = this.parseCsvRows(file.buffer);
    this.assertProductsHeaders(headers);
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

  private parseCsvRows(buffer: Buffer): ParseResult {
    const text = buffer.toString('utf8');
    const parsed = parse(text, { columns: true, skip_empty_lines: true, trim: true, bom: true }) as Record<string, any>[];
    const first = parsed[0] || {};
    const headers = Object.keys(first).map((key) => key.toLowerCase().replace(/[^a-z0-9]/g, ''));
    const rows = parsed.map((row) => {
      const normalized: ParsedRow = {};
      for (const [key, value] of Object.entries(row)) {
        normalized[key.toLowerCase().replace(/[^a-z0-9]/g, '')] = String(value ?? '').trim();
      }
      return normalized;
    });
    return { rows, headers };
  }

  private value(row: ParsedRow, aliases: string[]) {
    for (const key of aliases) {
      const found = row[key.toLowerCase().replace(/[^a-z0-9]/g, '')];
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
    const set = new Set(headers.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, '')));
    return aliases.some((a) => set.has(a.toLowerCase().replace(/[^a-z0-9]/g, '')));
  }

  private async processEmployeesRows(rows: ParsedRow[], persist: boolean) {
    const errors: RowError[] = [];
    let successRows = 0;
    const defaultRoleId = persist ? await this.resolveDefaultRoleId() : '';

    for (let i = 0; i < rows.length; i++) {
      try {
        const input = rows[i];
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
              status: status as any,
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
              status: status as any,
              roleId,
            },
          });
        }
        successRows++;
      } catch (error: any) {
        errors.push({ row: i + 1, error: error?.message || 'Unknown validation error' });
      }
    }

    return { totalRows: rows.length, successRows, errorRows: errors.length, errors };
  }

  private async processProductsRows(rows: ParsedRow[], persist: boolean) {
    const errors: RowError[] = [];
    let successRows = 0;

    for (let i = 0; i < rows.length; i++) {
      try {
        const input = rows[i];
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
        successRows++;
      } catch (error: any) {
        errors.push({ row: i + 1, error: error?.message || 'Unknown validation error' });
      }
    }

    return { totalRows: rows.length, successRows, errorRows: errors.length, errors };
  }

  private jobStatus(totalRows: number, successRows: number, errorRows: number) {
    if (totalRows === 0 || errorRows === 0) return 'completed';
    if (successRows === 0) return 'failed';
    return 'partial';
  }
}
