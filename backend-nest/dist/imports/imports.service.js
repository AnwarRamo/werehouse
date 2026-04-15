"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportsService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const sync_1 = require("csv-parse/sync");
const path_1 = require("path");
const bullmq_2 = require("bullmq");
const XLSX = __importStar(require("xlsx"));
const queue_constants_1 = require("../queues/queue.constants");
const pagination_util_1 = require("../common/utils/pagination.util");
const IMPORT_BATCH_SIZE = 50;
const IMPORT_MAX_ROWS = 50_000;
const SIMPLE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TIME_24H_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const PRODUCT_ALLOWED_STATUSES = new Set(['active', 'inactive']);
const EXCEL_EXTENSIONS = new Set(['.xlsx', '.xls', '.xlsm', '.xlsb', '.ods']);
const EXCEL_MIME_TYPES = new Set([
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel.sheet.macroenabled.12',
    'application/vnd.ms-excel.sheet.binary.macroenabled.12',
    'application/vnd.oasis.opendocument.spreadsheet',
]);
const JSON_MIME_TYPES = new Set(['application/json', 'text/json']);
const EMPLOYEE_HEADER_ALIASES = {
    employeeid: [
        'employeeid',
        'employee_id',
        'id',
        'empid',
        'employeecode',
        'employeenumber',
        'staffid',
        'userid',
        'رقمالموظف',
        'كودالموظف',
        'معرفالموظف',
    ],
    name: [
        'name',
        'fullname',
        'full_name',
        'employeename',
        'employee_name',
        'الاسم',
        'اسم',
        'اسمالموظف',
    ],
    email: [
        'email',
        'mail',
        'e-mail',
        'workemail',
        'companyemail',
        'الايميل',
        'ايميل',
        'البريدالالكتروني',
    ],
    hourlyrate: [
        'hourlyrate',
        'hourly_rate',
        'rate',
        'rateperhour',
        'hourlywage',
        'wage',
        'سعرالساعة',
        'اجرالساعة',
        'الاجرالساعة',
    ],
};
const PRODUCT_HEADER_ALIASES = {
    sku: [
        'sku',
        'productcode',
        'product_id',
        'productid',
        'itemcode',
        'code',
        'رمزالصنف',
        'كودالصنف',
        'كودالمنتج',
    ],
    name: [
        'name',
        'productname',
        'product_name',
        'itemname',
        'اسم',
        'اسمالمنتج',
        'اسم_المنتج',
    ],
    category: [
        'category',
        'type',
        'group',
        'classification',
        'التصنيف',
        'الفئة',
        'فئة',
    ],
    unitprice: [
        'unitprice',
        'unit_price',
        'price',
        'sellprice',
        'sellingprice',
        'retailprice',
        'سعرالبيع',
        'سعرالوحدة',
        'السعر',
    ],
    costprice: [
        'costprice',
        'cost_price',
        'cost',
        'buyprice',
        'purchaseprice',
        'سعرالشراء',
        'التكلفة',
        'تكلفة',
    ],
};
const EMPLOYEE_POSITIONAL_HEADERS = [
    'employeeid',
    'name',
    'email',
    'hourlyrate',
];
const PRODUCT_POSITIONAL_HEADERS = [
    'sku',
    'name',
    'category',
    'unitprice',
    'costprice',
];
let ImportsService = class ImportsService {
    constructor(prisma, importsQueue) {
        this.prisma = prisma;
        this.importsQueue = importsQueue;
    }
    async history(query) {
        const { page, limit, skip } = (0, pagination_util_1.resolvePagination)(query);
        const where = {};
        if (query.entity)
            where.entity = query.entity;
        if (query.status)
            where.status = query.status;
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
        const [aggregate, entityCounts, statusCounts] = await Promise.all([
            this.prisma.importJob.aggregate({
                _count: { _all: true },
                _sum: { totalRows: true, errorRows: true },
            }),
            this.prisma.importJob.groupBy({
                by: ['entity'],
                _count: { _all: true },
            }),
            this.prisma.importJob.groupBy({
                by: ['status'],
                _count: { _all: true },
            }),
        ]);
        const byEntity = entityCounts.reduce((accumulator, entry) => {
            accumulator[entry.entity] = entry._count._all;
            return accumulator;
        }, {});
        const byStatus = statusCounts.reduce((accumulator, entry) => {
            accumulator[entry.status] = entry._count._all;
            return accumulator;
        }, {});
        const totalRowsProcessed = Number(aggregate._sum.totalRows || 0);
        const totalRowsFailed = Number(aggregate._sum.errorRows || 0);
        return {
            totalImports: aggregate._count._all,
            byEntity,
            byStatus,
            totalRowsProcessed,
            totalRowsFailed,
            successRate: totalRowsProcessed
                ? (((totalRowsProcessed - totalRowsFailed) / totalRowsProcessed) * 100).toFixed(2)
                : '0.00',
        };
    }
    async details(jobId) {
        const job = await this.prisma.importJob.findUnique({ where: { jobId } });
        if (!job)
            throw new common_1.NotFoundException('Import job not found');
        const errorSummary = {};
        for (const e of job.errors || []) {
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
    async validateEmployeesImport(file) {
        if (!file?.buffer)
            throw new common_1.BadRequestException('CSV/XLSX file is required in field: file');
        const parsed = await this.parseImportRowsAsync(file.buffer, file?.originalname, file?.mimetype);
        const { rows, headers } = this.mapRowsToCanonicalHeaders(parsed.rows, parsed.headers, EMPLOYEE_HEADER_ALIASES, EMPLOYEE_POSITIONAL_HEADERS);
        this.assertEmployeesHeaders(headers);
        const result = await this.processEmployeesRows(rows, false);
        return { message: 'Employees import validation completed (dry-run)', ...result };
    }
    async validateProductsImport(file) {
        if (!file?.buffer)
            throw new common_1.BadRequestException('CSV/XLSX file is required in field: file');
        const parsed = await this.parseImportRowsAsync(file.buffer, file?.originalname, file?.mimetype);
        const { rows, headers } = this.mapRowsToCanonicalHeaders(parsed.rows, parsed.headers, PRODUCT_HEADER_ALIASES, PRODUCT_POSITIONAL_HEADERS);
        this.assertProductsHeaders(headers);
        const result = await this.processProductsRows(rows, false);
        return { message: 'Products import validation completed (dry-run)', ...result };
    }
    async importEmployees(file, userId) {
        if (!file?.buffer)
            throw new common_1.BadRequestException('CSV/XLSX file is required in field: file');
        const parsed = await this.parseImportRowsAsync(file.buffer, file?.originalname, file?.mimetype);
        const { rows, headers } = this.mapRowsToCanonicalHeaders(parsed.rows, parsed.headers, EMPLOYEE_HEADER_ALIASES, EMPLOYEE_POSITIONAL_HEADERS);
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
    async importEmployeesAsync(file, userId) {
        if (!file?.buffer)
            throw new common_1.BadRequestException('CSV/XLSX file is required in field: file');
        const parsed = await this.parseImportRowsAsync(file.buffer, file?.originalname, file?.mimetype);
        const { rows, headers } = this.mapRowsToCanonicalHeaders(parsed.rows, parsed.headers, EMPLOYEE_HEADER_ALIASES, EMPLOYEE_POSITIONAL_HEADERS);
        this.assertEmployeesHeaders(headers);
        const validationResult = await this.processEmployeesRows(rows, false);
        this.ensureNoValidationErrors(validationResult, 'employees');
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
        await this.enqueueImportJob(queue_constants_1.QUEUE_JOBS.IMPORT_EMPLOYEES, { importJobRecordId: job.id, rows });
        return { message: 'Employee import queued', jobId: job.jobId, status: 'queued', totalRows: rows.length };
    }
    async importProducts(file, userId) {
        if (!file?.buffer)
            throw new common_1.BadRequestException('CSV/XLSX file is required in field: file');
        const parsed = await this.parseImportRowsAsync(file.buffer, file?.originalname, file?.mimetype);
        const { rows, headers } = this.mapRowsToCanonicalHeaders(parsed.rows, parsed.headers, PRODUCT_HEADER_ALIASES, PRODUCT_POSITIONAL_HEADERS);
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
    async importProductsAsync(file, userId) {
        if (!file?.buffer)
            throw new common_1.BadRequestException('CSV/XLSX file is required in field: file');
        const parsed = await this.parseImportRowsAsync(file.buffer, file?.originalname, file?.mimetype);
        const { rows, headers } = this.mapRowsToCanonicalHeaders(parsed.rows, parsed.headers, PRODUCT_HEADER_ALIASES, PRODUCT_POSITIONAL_HEADERS);
        this.assertProductsHeaders(headers);
        const validationResult = await this.processProductsRows(rows, false);
        this.ensureNoValidationErrors(validationResult, 'products');
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
        await this.enqueueImportJob(queue_constants_1.QUEUE_JOBS.IMPORT_PRODUCTS, { importJobRecordId: job.id, rows });
        return { message: 'Product import queued', jobId: job.jobId, status: 'queued', totalRows: rows.length };
    }
    async retry(jobId, userId) {
        const original = await this.prisma.importJob.findUnique({ where: { jobId } });
        if (!original)
            throw new common_1.NotFoundException('Import job not found');
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
    async processEmployeesImportJob(importJobRecordId, rows) {
        await this.prisma.importJob.update({ where: { id: importJobRecordId }, data: { status: 'processing' } });
        const { totalRows, successRows, errorRows, errors } = await this.processEmployeesRows(rows, true);
        const status = this.jobStatus(totalRows, successRows, errorRows);
        await this.prisma.importJob.update({
            where: { id: importJobRecordId },
            data: { status, totalRows, successRows, errorRows, errors },
        });
        return { status, totalRows, successRows, errorRows };
    }
    async processProductsImportJob(importJobRecordId, rows) {
        await this.prisma.importJob.update({ where: { id: importJobRecordId }, data: { status: 'processing' } });
        const { totalRows, successRows, errorRows, errors } = await this.processProductsRows(rows, true);
        const status = this.jobStatus(totalRows, successRows, errorRows);
        await this.prisma.importJob.update({
            where: { id: importJobRecordId },
            data: { status, totalRows, successRows, errorRows, errors },
        });
        return { status, totalRows, successRows, errorRows };
    }
    async markImportJobFailed(importJobRecordId, message) {
        await this.prisma.importJob.update({
            where: { id: importJobRecordId },
            data: {
                status: 'failed',
                errors: [{ row: 0, error: message || 'Unexpected import error' }],
            },
        });
    }
    async enqueueImportJob(jobName, payload) {
        try {
            if (!this.importsQueue) {
                throw new Error('Imports queue is not available');
            }
            await this.importsQueue.add(jobName, payload, {
                attempts: 3,
                backoff: { type: 'exponential', delay: 2_000 },
            });
            return;
        }
        catch {
            if (jobName === queue_constants_1.QUEUE_JOBS.IMPORT_EMPLOYEES) {
                await this.processEmployeesImportJob(payload.importJobRecordId, payload.rows);
                return;
            }
            if (jobName === queue_constants_1.QUEUE_JOBS.IMPORT_PRODUCTS) {
                await this.processProductsImportJob(payload.importJobRecordId, payload.rows);
                return;
            }
            throw new Error('Unable to enqueue import job');
        }
    }
    ensureNoValidationErrors(result, entity) {
        if (result.errorRows === 0) {
            return;
        }
        const sampleErrors = result.errors.slice(0, 10);
        throw new common_1.BadRequestException({
            message: `Import blocked: ${entity} file has invalid rows. Please fix the file and try again.`,
            errorRows: result.errorRows,
            errors: sampleErrors,
        });
    }
    parseImportRows(buffer, fileName, mimeType) {
        const format = this.detectImportFormat(fileName, mimeType);
        if (format === 'excel') {
            throw new common_1.BadRequestException('Excel parsing is async — use parseImportRowsAsync instead');
        }
        if (format === 'json') {
            return this.parseJsonRows(buffer);
        }
        if (format === 'tsv') {
            return this.parseDelimitedRows(buffer.toString('utf8'), '\t');
        }
        if (format === 'txt') {
            const text = buffer.toString('utf8');
            return this.parseDelimitedRows(text, this.detectDelimiter(text));
        }
        const text = buffer.toString('utf8');
        return this.parseDelimitedRows(text, this.detectDelimiter(text));
    }
    async parseImportRowsAsync(buffer, fileName, mimeType) {
        const format = this.detectImportFormat(fileName, mimeType);
        if (format === 'excel') {
            return this.parseSpreadsheetRows(buffer);
        }
        if (format === 'json') {
            return this.parseJsonRows(buffer);
        }
        if (format === 'tsv') {
            return this.parseDelimitedRows(buffer.toString('utf8'), '\t');
        }
        if (format === 'txt') {
            const text = buffer.toString('utf8');
            return this.parseDelimitedRows(text, this.detectDelimiter(text));
        }
        const text = buffer.toString('utf8');
        return this.parseDelimitedRows(text, this.detectDelimiter(text));
    }
    detectImportFormat(fileName, mimeType) {
        const extension = (0, path_1.extname)(fileName || '').toLowerCase();
        const normalizedMime = String(mimeType || '').toLowerCase();
        if (extension === '.json' || JSON_MIME_TYPES.has(normalizedMime)) {
            return 'json';
        }
        if (extension === '.tsv' || normalizedMime === 'text/tab-separated-values') {
            return 'tsv';
        }
        if (extension === '.txt') {
            return 'txt';
        }
        if (EXCEL_EXTENSIONS.has(extension) || EXCEL_MIME_TYPES.has(normalizedMime)) {
            return 'excel';
        }
        return 'csv';
    }
    parseDelimitedRows(content, delimiter) {
        let parsed;
        try {
            parsed = (0, sync_1.parse)(content, {
                columns: true,
                skip_empty_lines: true,
                trim: true,
                bom: true,
                delimiter,
            });
        }
        catch {
            throw new common_1.BadRequestException('Unable to parse delimited file. Ensure the file has valid tabular content');
        }
        const first = parsed[0] || {};
        const headers = Object.keys(first).map((key) => this.normalizeHeader(key));
        const rows = parsed
            .map((row) => {
            const normalized = {};
            for (const [key, value] of Object.entries(row)) {
                normalized[this.normalizeHeader(key)] = String(value ?? '').trim();
            }
            return normalized;
        })
            .filter((row) => Object.values(row).some((value) => value !== ''));
        this.assertRowsLimit(rows.length);
        return { rows, headers };
    }
    parseSpreadsheetRows(buffer) {
        try {
            const workbook = XLSX.read(buffer, {
                type: 'buffer',
                raw: false,
                cellDates: false,
                dense: true,
            });
            const firstSheetName = workbook.SheetNames?.[0];
            if (!firstSheetName) {
                throw new common_1.BadRequestException('Excel file must contain at least one worksheet');
            }
            const worksheet = workbook.Sheets[firstSheetName];
            const matrix = XLSX.utils.sheet_to_json(worksheet, {
                header: 1,
                raw: false,
                defval: '',
                blankrows: false,
            });
            if (matrix.length === 0) {
                return { rows: [], headers: [] };
            }
            const firstRow = Array.isArray(matrix[0]) ? matrix[0] : [];
            const headers = firstRow.map((cell) => this.normalizeHeader(String(cell ?? '')));
            const rows = matrix
                .slice(1)
                .map((cells) => {
                const normalized = {};
                headers.forEach((header, index) => {
                    normalized[header] = String(Array.isArray(cells) ? cells[index] ?? '' : '').trim();
                });
                return normalized;
            })
                .filter((row) => Object.values(row).some((value) => value !== ''));
            this.assertRowsLimit(rows.length);
            return { rows, headers };
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException('Unable to parse spreadsheet file. Ensure file content is valid');
        }
    }
    parseJsonRows(buffer) {
        const content = buffer.toString('utf8').trim();
        if (!content) {
            return { rows: [], headers: [] };
        }
        let payload;
        try {
            payload = JSON.parse(content);
        }
        catch {
            throw new common_1.BadRequestException('JSON file is invalid');
        }
        const sourceRows = Array.isArray(payload)
            ? payload
            : payload && typeof payload === 'object' && 'rows' in payload && Array.isArray(payload.rows)
                ? payload.rows
                : null;
        if (!sourceRows) {
            throw new common_1.BadRequestException('JSON file must contain an array or a rows[] property');
        }
        if (sourceRows.length === 0) {
            return { rows: [], headers: [] };
        }
        if (sourceRows.every((entry) => Array.isArray(entry))) {
            const matrix = sourceRows;
            const firstRow = Array.isArray(matrix[0]) ? matrix[0] : [];
            const headers = firstRow.map((cell) => this.normalizeHeader(String(cell ?? '')));
            const rows = matrix
                .slice(1)
                .map((cells) => {
                const normalized = {};
                headers.forEach((header, index) => {
                    normalized[header] = String(Array.isArray(cells) ? cells[index] ?? '' : '').trim();
                });
                return normalized;
            })
                .filter((row) => Object.values(row).some((value) => value !== ''));
            this.assertRowsLimit(rows.length);
            return { rows, headers };
        }
        const objectRows = sourceRows.filter((entry) => entry && typeof entry === 'object' && !Array.isArray(entry));
        if (objectRows.length === 0) {
            throw new common_1.BadRequestException('JSON structure is not supported for tabular imports');
        }
        const rawHeaders = Array.from(new Set(objectRows.flatMap((row) => Object.keys(row))));
        const headers = rawHeaders.map((header) => this.normalizeHeader(header));
        const rows = objectRows
            .map((row) => {
            const normalized = {};
            rawHeaders.forEach((rawHeader, index) => {
                normalized[headers[index]] = String(row[rawHeader] ?? '').trim();
            });
            return normalized;
        })
            .filter((row) => Object.values(row).some((value) => value !== ''));
        this.assertRowsLimit(rows.length);
        return { rows, headers };
    }
    detectDelimiter(content) {
        const firstLine = (content.split(/\r?\n/, 1)[0] || '').trim();
        const candidates = ['\t', ',', ';', '|'];
        let bestDelimiter = ',';
        let bestScore = 0;
        for (const candidate of candidates) {
            const score = firstLine.split(candidate).length - 1;
            if (score > bestScore) {
                bestScore = score;
                bestDelimiter = candidate;
            }
        }
        return bestScore > 0 ? bestDelimiter : ',';
    }
    assertRowsLimit(count) {
        if (count <= IMPORT_MAX_ROWS) {
            return;
        }
        throw new common_1.BadRequestException(`Import file is too large. Maximum allowed rows is ${IMPORT_MAX_ROWS}. Split the file and retry.`);
    }
    value(row, aliases) {
        for (const key of aliases) {
            const found = row[this.normalizeHeader(key)];
            if (found !== undefined && found !== '')
                return found;
        }
        return '';
    }
    parseFlexibleNumber(rawValue) {
        let normalized = String(rawValue ?? '')
            .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 1632))
            .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 1776))
            .trim();
        if (!normalized) {
            return Number.NaN;
        }
        normalized = normalized
            .replace(/\u00A0/g, ' ')
            .replace(/\s+/g, '')
            .replace(/[^\d.,+\-]/g, '');
        if (!normalized || /^[-+]?([.,])?$/.test(normalized)) {
            return Number.NaN;
        }
        const commaCount = (normalized.match(/,/g) || []).length;
        const dotCount = (normalized.match(/\./g) || []).length;
        if (commaCount > 0 && dotCount > 0) {
            if (normalized.lastIndexOf(',') > normalized.lastIndexOf('.')) {
                normalized = normalized.replace(/\./g, '').replace(/,/g, '.');
            }
            else {
                normalized = normalized.replace(/,/g, '');
            }
        }
        else if (commaCount > 0) {
            if (commaCount > 1) {
                normalized = normalized.replace(/,/g, '');
            }
            else {
                const commaIndex = normalized.indexOf(',');
                const fractionLength = normalized.length - commaIndex - 1;
                const integerLength = commaIndex;
                if (fractionLength === 3 && integerLength >= 1) {
                    normalized = normalized.replace(/,/g, '');
                }
                else {
                    normalized = normalized.replace(',', '.');
                }
            }
        }
        else if (dotCount > 1) {
            normalized = normalized.replace(/\./g, '');
        }
        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : Number.NaN;
    }
    async resolveDefaultRoleId() {
        const preferred = await this.prisma.role.findFirst({ where: { name: { in: ['staff', 'admin'] } } });
        if (preferred?.id)
            return preferred.id;
        const first = await this.prisma.role.findFirst();
        if (first?.id)
            return first.id;
        const created = await this.prisma.role.create({
            data: { name: 'staff', description: 'Default staff role', permissions: [] },
        });
        return created.id;
    }
    async resolveRoleId(roleIdRaw, fallbackRoleId) {
        if (!roleIdRaw)
            return fallbackRoleId;
        const role = await this.prisma.role.findUnique({ where: { id: roleIdRaw } });
        if (!role)
            throw new Error('roleId not found');
        return role.id;
    }
    assertEmployeesHeaders(headers) {
        const missing = Object.entries(EMPLOYEE_HEADER_ALIASES)
            .filter(([, aliases]) => !this.headerExists(headers, aliases))
            .map(([key]) => key);
        if (missing.length > 0)
            throw new common_1.BadRequestException(`Missing required CSV headers: ${missing.join(', ')}`);
    }
    assertProductsHeaders(headers) {
        const missing = Object.entries(PRODUCT_HEADER_ALIASES)
            .filter(([, aliases]) => !this.headerExists(headers, aliases))
            .map(([key]) => key);
        if (missing.length > 0)
            throw new common_1.BadRequestException(`Missing required CSV headers: ${missing.join(', ')}`);
    }
    headerExists(headers, aliases) {
        const set = new Set(headers.map((h) => this.normalizeHeader(h)));
        return aliases.some((a) => set.has(this.normalizeHeader(a)));
    }
    async processEmployeesRows(rows, persist) {
        const errors = [];
        let successRows = 0;
        const defaultRoleId = persist ? await this.resolveDefaultRoleId() : '';
        for (let offset = 0; offset < rows.length; offset += IMPORT_BATCH_SIZE) {
            const batch = rows.slice(offset, offset + IMPORT_BATCH_SIZE);
            const batchResults = await Promise.all(batch.map(async (input, index) => {
                try {
                    const employeeId = this.value(input, EMPLOYEE_HEADER_ALIASES.employeeid);
                    const name = this.value(input, EMPLOYEE_HEADER_ALIASES.name);
                    const email = this.value(input, EMPLOYEE_HEADER_ALIASES.email);
                    const hourlyRateRaw = this.value(input, EMPLOYEE_HEADER_ALIASES.hourlyrate);
                    const currency = this.value(input, ['currency']) || 'SYP';
                    const department = this.value(input, ['department']) || 'Warehouse';
                    const scheduledStartRaw = this.value(input, ['scheduledstart', 'scheduled_start', 'start']);
                    const scheduledEndRaw = this.value(input, ['scheduledend', 'scheduled_end', 'end']);
                    const scheduledStart = scheduledStartRaw || undefined;
                    const scheduledEnd = scheduledEndRaw || undefined;
                    const status = this.value(input, ['status']) || 'active';
                    const roleIdRaw = this.value(input, ['roleid', 'role_id']);
                    if (!employeeId || !name || !email || !hourlyRateRaw)
                        throw new Error('Missing required fields: employeeId, name, email, hourlyRate');
                    const normalizedEmail = email.toLowerCase();
                    if (!SIMPLE_EMAIL_REGEX.test(normalizedEmail)) {
                        throw new Error('email must be a valid email address');
                    }
                    const hourlyRate = this.parseFlexibleNumber(hourlyRateRaw);
                    if (!Number.isFinite(hourlyRate) || hourlyRate < 0) {
                        throw new Error('hourlyRate must be a finite non-negative number');
                    }
                    if (scheduledStart && !TIME_24H_REGEX.test(scheduledStart)) {
                        throw new Error('scheduledStart must be in HH:mm format');
                    }
                    if (scheduledEnd && !TIME_24H_REGEX.test(scheduledEnd)) {
                        throw new Error('scheduledEnd must be in HH:mm format');
                    }
                    if (!['active', 'inactive', 'on_leave', 'terminated'].includes(status))
                        throw new Error('status must be one of: active, inactive, on_leave, terminated');
                    if (persist) {
                        const roleId = await this.resolveRoleId(roleIdRaw, defaultRoleId);
                        await this.prisma.employee.upsert({
                            where: { employeeId },
                            update: {
                                name,
                                email: normalizedEmail,
                                hourlyRate: new client_1.Prisma.Decimal(hourlyRate),
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
                                email: normalizedEmail,
                                hourlyRate: new client_1.Prisma.Decimal(hourlyRate),
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
                }
                catch (error) {
                    const typedError = error;
                    return {
                        row: offset + index + 1,
                        error: typedError.message || 'Unknown validation error',
                    };
                }
            }));
            for (const result of batchResults) {
                if (result) {
                    errors.push(result);
                }
                else {
                    successRows++;
                }
            }
        }
        return { totalRows: rows.length, successRows, errorRows: errors.length, errors };
    }
    async processProductsRows(rows, persist) {
        const errors = [];
        let successRows = 0;
        for (let offset = 0; offset < rows.length; offset += IMPORT_BATCH_SIZE) {
            const batch = rows.slice(offset, offset + IMPORT_BATCH_SIZE);
            const batchResults = await Promise.all(batch.map(async (input, index) => {
                try {
                    const sku = this.value(input, PRODUCT_HEADER_ALIASES.sku);
                    const name = this.value(input, PRODUCT_HEADER_ALIASES.name);
                    const category = this.value(input, PRODUCT_HEADER_ALIASES.category);
                    const unitPriceRaw = this.value(input, PRODUCT_HEADER_ALIASES.unitprice);
                    const costPriceRaw = this.value(input, PRODUCT_HEADER_ALIASES.costprice);
                    const reorderLevelRaw = this.value(input, ['reorderlevel', 'reorder_level', 'reorder']);
                    const status = this.value(input, ['status']) || 'active';
                    const normalizedStatus = String(status).toLowerCase();
                    if (!sku || !name || !category || !unitPriceRaw || !costPriceRaw)
                        throw new Error('Missing required fields: sku, name, category, unitPrice, costPrice');
                    const unitPrice = this.parseFlexibleNumber(unitPriceRaw);
                    const costPrice = this.parseFlexibleNumber(costPriceRaw);
                    const reorderLevel = reorderLevelRaw ? this.parseFlexibleNumber(reorderLevelRaw) : 10;
                    if (!Number.isFinite(unitPrice) || !Number.isFinite(costPrice) || !Number.isFinite(reorderLevel)) {
                        throw new Error('unitPrice, costPrice and reorderLevel must be finite numbers');
                    }
                    if (!Number.isInteger(reorderLevel)) {
                        throw new Error('reorderLevel must be an integer number');
                    }
                    if (unitPrice < 0 || costPrice < 0 || reorderLevel < 0) {
                        throw new Error('unitPrice, costPrice and reorderLevel must be non-negative numbers');
                    }
                    if (!PRODUCT_ALLOWED_STATUSES.has(normalizedStatus)) {
                        throw new Error('status must be one of: active, inactive');
                    }
                    if (persist) {
                        await this.prisma.product.upsert({
                            where: { sku },
                            update: {
                                name,
                                category,
                                unitPrice: new client_1.Prisma.Decimal(unitPrice),
                                costPrice: new client_1.Prisma.Decimal(costPrice),
                                reorderLevel,
                                status: normalizedStatus,
                            },
                            create: {
                                sku,
                                name,
                                category,
                                unitPrice: new client_1.Prisma.Decimal(unitPrice),
                                costPrice: new client_1.Prisma.Decimal(costPrice),
                                reorderLevel,
                                status: normalizedStatus,
                            },
                        });
                    }
                    return null;
                }
                catch (error) {
                    const typedError = error;
                    return {
                        row: offset + index + 1,
                        error: typedError.message || 'Unknown validation error',
                    };
                }
            }));
            for (const result of batchResults) {
                if (result) {
                    errors.push(result);
                }
                else {
                    successRows++;
                }
            }
        }
        return { totalRows: rows.length, successRows, errorRows: errors.length, errors };
    }
    mapRowsToCanonicalHeaders(rows, headers, aliasesMap, positionalFallbackOrder) {
        if (rows.length === 0 && headers.length === 0) {
            return { rows, headers };
        }
        const normalizedHeaders = headers.map((header) => this.normalizeHeader(header));
        const canonicalToSource = {};
        const usedSources = new Set();
        for (const [canonical, aliases] of Object.entries(aliasesMap)) {
            const normalizedAliases = aliases.map((alias) => this.normalizeHeader(alias));
            const matchedHeader = normalizedAliases.find((alias) => normalizedHeaders.includes(alias));
            if (matchedHeader) {
                canonicalToSource[canonical] = matchedHeader;
                usedSources.add(matchedHeader);
            }
        }
        positionalFallbackOrder.forEach((canonical, index) => {
            if (canonicalToSource[canonical]) {
                return;
            }
            const positionalHeader = normalizedHeaders[index];
            if (positionalHeader && !usedSources.has(positionalHeader)) {
                canonicalToSource[canonical] = positionalHeader;
                usedSources.add(positionalHeader);
            }
        });
        const mappedRows = rows.map((row) => {
            const mapped = { ...row };
            for (const [canonical, source] of Object.entries(canonicalToSource)) {
                if (!mapped[canonical] && mapped[source] !== undefined) {
                    mapped[canonical] = mapped[source];
                }
            }
            return mapped;
        });
        const mergedHeaders = Array.from(new Set([...normalizedHeaders, ...Object.keys(canonicalToSource)]));
        return { rows: mappedRows, headers: mergedHeaders };
    }
    normalizeHeader(value) {
        return String(value || '')
            .trim()
            .toLowerCase()
            .normalize('NFKC')
            .replace(/[\s_\-./\\()]+/g, '')
            .replace(/[^\p{L}\p{N}]/gu, '');
    }
    jobStatus(totalRows, successRows, errorRows) {
        if (totalRows === 0 || errorRows === 0)
            return 'completed';
        if (successRows === 0)
            return 'failed';
        return 'partial';
    }
};
exports.ImportsService = ImportsService;
exports.ImportsService = ImportsService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Optional)()),
    __param(1, (0, bullmq_1.InjectQueue)(queue_constants_1.QUEUE_NAMES.IMPORTS)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        bullmq_2.Queue])
], ImportsService);
//# sourceMappingURL=imports.service.js.map