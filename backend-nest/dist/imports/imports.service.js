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
const IMPORT_BATCH_SIZE = 50;
const IMPORT_MAX_ROWS = 50_000;
let ImportsService = class ImportsService {
    constructor(prisma, importsQueue) {
        this.prisma = prisma;
        this.importsQueue = importsQueue;
    }
    async history(query) {
        const page = Number(query.page || 1);
        const limit = Math.min(Number(query.limit || 50), 200);
        const skip = (page - 1) * limit;
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
        const jobs = await this.prisma.importJob.findMany();
        const byEntity = {};
        const byStatus = {};
        for (const job of jobs) {
            byEntity[job.entity] = (byEntity[job.entity] || 0) + 1;
            byStatus[job.status] = (byStatus[job.status] || 0) + 1;
        }
        const totalRowsProcessed = jobs.reduce((s, j) => s + (j.totalRows || 0), 0);
        const totalRowsFailed = jobs.reduce((s, j) => s + (j.errorRows || 0), 0);
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
        const { rows, headers } = this.parseImportRows(file.buffer, file?.originalname, file?.mimetype);
        this.assertEmployeesHeaders(headers);
        const result = await this.processEmployeesRows(rows, false);
        return { message: 'Employees import validation completed (dry-run)', ...result };
    }
    async validateProductsImport(file) {
        if (!file?.buffer)
            throw new common_1.BadRequestException('CSV/XLSX file is required in field: file');
        const { rows, headers } = this.parseImportRows(file.buffer, file?.originalname, file?.mimetype);
        this.assertProductsHeaders(headers);
        const result = await this.processProductsRows(rows, false);
        return { message: 'Products import validation completed (dry-run)', ...result };
    }
    async importEmployees(file, userId) {
        if (!file?.buffer)
            throw new common_1.BadRequestException('CSV/XLSX file is required in field: file');
        const { rows, headers } = this.parseImportRows(file.buffer, file?.originalname, file?.mimetype);
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
        const { rows, headers } = this.parseImportRows(file.buffer, file?.originalname, file?.mimetype);
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
        await this.importsQueue.add(queue_constants_1.QUEUE_JOBS.IMPORT_EMPLOYEES, { importJobRecordId: job.id, rows }, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2_000 },
        });
        return { message: 'Employee import queued', jobId: job.jobId, status: 'queued', totalRows: rows.length };
    }
    async importProducts(file, userId) {
        if (!file?.buffer)
            throw new common_1.BadRequestException('CSV/XLSX file is required in field: file');
        const { rows, headers } = this.parseImportRows(file.buffer, file?.originalname, file?.mimetype);
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
        const { rows, headers } = this.parseImportRows(file.buffer, file?.originalname, file?.mimetype);
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
        await this.importsQueue.add(queue_constants_1.QUEUE_JOBS.IMPORT_PRODUCTS, { importJobRecordId: job.id, rows }, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2_000 },
        });
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
    parseImportRows(buffer, fileName, mimeType) {
        const extension = (0, path_1.extname)(fileName || '').toLowerCase();
        const detectedFormat = extension === '.xlsx' ||
            extension === '.xls' ||
            mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            mimeType === 'application/vnd.ms-excel'
            ? 'xlsx'
            : 'csv';
        if (detectedFormat === 'xlsx') {
            const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false, raw: false });
            const sheetName = workbook.SheetNames[0];
            if (!sheetName)
                throw new common_1.BadRequestException('Excel file must contain at least one worksheet');
            const worksheet = workbook.Sheets[sheetName];
            const parsed = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });
            const first = parsed[0] || {};
            const headers = Object.keys(first).map((key) => this.normalizeHeader(key));
            const rows = parsed.map((row) => {
                const normalized = {};
                for (const [key, value] of Object.entries(row)) {
                    normalized[this.normalizeHeader(key)] = String(value ?? '').trim();
                }
                return normalized;
            });
            if (rows.length > IMPORT_MAX_ROWS) {
                throw new common_1.BadRequestException(`Import file is too large. Maximum allowed rows is ${IMPORT_MAX_ROWS}. Split the file and retry.`);
            }
            return { rows, headers };
        }
        const text = buffer.toString('utf8');
        const parsed = (0, sync_1.parse)(text, { columns: true, skip_empty_lines: true, trim: true, bom: true });
        const first = parsed[0] || {};
        const headers = Object.keys(first).map((key) => this.normalizeHeader(key));
        const rows = parsed.map((row) => {
            const normalized = {};
            for (const [key, value] of Object.entries(row)) {
                normalized[this.normalizeHeader(key)] = String(value ?? '').trim();
            }
            return normalized;
        });
        if (rows.length > IMPORT_MAX_ROWS) {
            throw new common_1.BadRequestException(`Import file is too large. Maximum allowed rows is ${IMPORT_MAX_ROWS}. Split the file and retry.`);
        }
        return { rows, headers };
    }
    value(row, aliases) {
        for (const key of aliases) {
            const found = row[this.normalizeHeader(key)];
            if (found !== undefined && found !== '')
                return found;
        }
        return '';
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
        const missing = [
            ['employeeid', 'employee_id', 'id'],
            ['name', 'fullname', 'full_name'],
            ['email', 'mail'],
            ['hourlyrate', 'hourly_rate', 'rate'],
        ]
            .filter((aliases) => !this.headerExists(headers, aliases))
            .map((aliases) => aliases[0]);
        if (missing.length > 0)
            throw new common_1.BadRequestException(`Missing required CSV headers: ${missing.join(', ')}`);
    }
    assertProductsHeaders(headers) {
        const missing = [['sku'], ['name'], ['category'], ['unitprice', 'unit_price', 'price'], ['costprice', 'cost_price']]
            .filter((aliases) => !this.headerExists(headers, aliases))
            .map((aliases) => aliases[0]);
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
                    if (!employeeId || !name || !email || !hourlyRateRaw)
                        throw new Error('Missing required fields: employeeId, name, email, hourlyRate');
                    const hourlyRate = Number(hourlyRateRaw);
                    if (Number.isNaN(hourlyRate) || hourlyRate < 0)
                        throw new Error('hourlyRate must be a valid non-negative number');
                    if (!['active', 'inactive', 'on_leave', 'terminated'].includes(status))
                        throw new Error('status must be one of: active, inactive, on_leave, terminated');
                    if (persist) {
                        const roleId = await this.resolveRoleId(roleIdRaw, defaultRoleId);
                        await this.prisma.employee.upsert({
                            where: { employeeId },
                            update: {
                                name,
                                email: email.toLowerCase(),
                                hourlyRate: new client_1.Prisma.Decimal(hourlyRate),
                                currency,
                                department,
                                scheduledStart,
                                scheduledEnd,
                                status: status,
                                roleId,
                            },
                            create: {
                                employeeId,
                                name,
                                email: email.toLowerCase(),
                                hourlyRate: new client_1.Prisma.Decimal(hourlyRate),
                                currency,
                                department,
                                scheduledStart,
                                scheduledEnd,
                                status: status,
                                roleId,
                            },
                        });
                    }
                    return null;
                }
                catch (error) {
                    return { row: offset + index + 1, error: error?.message || 'Unknown validation error' };
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
                    const sku = this.value(input, ['sku']);
                    const name = this.value(input, ['name']);
                    const category = this.value(input, ['category']);
                    const unitPriceRaw = this.value(input, ['unitprice', 'unit_price', 'price']);
                    const costPriceRaw = this.value(input, ['costprice', 'cost_price']);
                    const reorderLevelRaw = this.value(input, ['reorderlevel', 'reorder_level', 'reorder']);
                    const status = this.value(input, ['status']) || 'active';
                    if (!sku || !name || !category || !unitPriceRaw || !costPriceRaw)
                        throw new Error('Missing required fields: sku, name, category, unitPrice, costPrice');
                    const unitPrice = Number(unitPriceRaw);
                    const costPrice = Number(costPriceRaw);
                    const reorderLevel = reorderLevelRaw ? Number(reorderLevelRaw) : 10;
                    if (Number.isNaN(unitPrice) || Number.isNaN(costPrice) || Number.isNaN(reorderLevel))
                        throw new Error('unitPrice, costPrice and reorderLevel must be valid numbers');
                    if (unitPrice < 0 || costPrice < 0 || reorderLevel < 0)
                        throw new Error('unitPrice, costPrice and reorderLevel must be non-negative numbers');
                    if (persist) {
                        await this.prisma.product.upsert({
                            where: { sku },
                            update: {
                                name,
                                category,
                                unitPrice: new client_1.Prisma.Decimal(unitPrice),
                                costPrice: new client_1.Prisma.Decimal(costPrice),
                                reorderLevel,
                                status,
                            },
                            create: {
                                sku,
                                name,
                                category,
                                unitPrice: new client_1.Prisma.Decimal(unitPrice),
                                costPrice: new client_1.Prisma.Decimal(costPrice),
                                reorderLevel,
                                status,
                            },
                        });
                    }
                    return null;
                }
                catch (error) {
                    return { row: offset + index + 1, error: error?.message || 'Unknown validation error' };
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
    normalizeHeader(value) {
        return String(value || '')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '');
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
    __param(1, (0, bullmq_1.InjectQueue)(queue_constants_1.QUEUE_NAMES.IMPORTS)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        bullmq_2.Queue])
], ImportsService);
//# sourceMappingURL=imports.service.js.map