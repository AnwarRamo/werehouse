"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const sync_1 = require("csv-parse/sync");
const import_job_schema_1 = require("./schemas/import-job.schema");
const employee_schema_1 = require("../employees/schemas/employee.schema");
const product_schema_1 = require("../inventory/schemas/product.schema");
const role_schema_1 = require("../auth/schemas/role.schema");
let ImportsService = class ImportsService {
    constructor(importJobModel, employeeModel, productModel, roleModel) {
        this.importJobModel = importJobModel;
        this.employeeModel = employeeModel;
        this.productModel = productModel;
        this.roleModel = roleModel;
    }
    async history(query) {
        const page = Number(query.page || 1);
        const limit = Number(query.limit || 50);
        const skip = (page - 1) * limit;
        const filter = {};
        if (query.entity)
            filter.entity = query.entity;
        const [imports, total] = await Promise.all([
            this.importJobModel.find(filter).sort({ uploadedAt: -1 }).skip(skip).limit(limit),
            this.importJobModel.countDocuments(filter),
        ]);
        return { imports, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
    }
    async stats() {
        const jobs = await this.importJobModel.find();
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
        const job = await this.importJobModel.findOne({ jobId });
        if (!job)
            throw new common_1.NotFoundException('Import job not found');
        const errorSummary = {};
        for (const e of job.errors || []) {
            const key = e.error || 'Unknown error';
            errorSummary[key] = (errorSummary[key] || 0) + 1;
        }
        return { ...job.toObject(), errorSummary };
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
            throw new common_1.BadRequestException('CSV file is required in field: file');
        const { rows, headers } = this.parseCsvRows(file.buffer);
        this.assertEmployeesHeaders(headers);
        const result = await this.processEmployeesRows(rows, false);
        return {
            message: 'Employees CSV validation completed (dry-run)',
            ...result,
        };
    }
    async validateProductsImport(file) {
        if (!file?.buffer)
            throw new common_1.BadRequestException('CSV file is required in field: file');
        const { rows, headers } = this.parseCsvRows(file.buffer);
        this.assertProductsHeaders(headers);
        const result = await this.processProductsRows(rows, false);
        return {
            message: 'Products CSV validation completed (dry-run)',
            ...result,
        };
    }
    async importEmployees(file, userId) {
        if (!file?.buffer)
            throw new common_1.BadRequestException('CSV file is required in field: file');
        const jobId = `IMP-EMP-${Date.now()}`;
        const job = await this.importJobModel.create({
            jobId,
            entity: 'employees',
            fileName: file?.originalname || 'employees.csv',
            uploadedBy: userId || 'system',
            status: 'processing',
            totalRows: 0,
            successRows: 0,
            errorRows: 0,
            errors: [],
        });
        const { rows, headers } = this.parseCsvRows(file.buffer);
        this.assertEmployeesHeaders(headers);
        const result = await this.processEmployeesRows(rows, true);
        const { totalRows, successRows, errorRows, errors } = result;
        const status = this.jobStatus(totalRows, successRows, errorRows);
        await this.importJobModel.updateOne({ _id: job._id }, { $set: { status, totalRows, successRows, errorRows, errors } });
        return {
            message: 'Employee import processed',
            jobId: job.jobId,
            status,
            totalRows,
            successRows,
            errorRows,
        };
    }
    async importProducts(file, userId) {
        if (!file?.buffer)
            throw new common_1.BadRequestException('CSV file is required in field: file');
        const jobId = `IMP-PROD-${Date.now()}`;
        const job = await this.importJobModel.create({
            jobId,
            entity: 'products',
            fileName: file?.originalname || 'products.csv',
            uploadedBy: userId || 'system',
            status: 'processing',
            totalRows: 0,
            successRows: 0,
            errorRows: 0,
            errors: [],
        });
        const { rows, headers } = this.parseCsvRows(file.buffer);
        this.assertProductsHeaders(headers);
        const result = await this.processProductsRows(rows, true);
        const { totalRows, successRows, errorRows, errors } = result;
        const status = this.jobStatus(totalRows, successRows, errorRows);
        await this.importJobModel.updateOne({ _id: job._id }, { $set: { status, totalRows, successRows, errorRows, errors } });
        return {
            message: 'Product import processed',
            jobId: job.jobId,
            status,
            totalRows,
            successRows,
            errorRows,
        };
    }
    async retry(jobId, userId) {
        const original = await this.importJobModel.findOne({ jobId });
        if (!original)
            throw new common_1.NotFoundException('Import job not found');
        const retryJob = await this.importJobModel.create({
            jobId: `${jobId}-RETRY-${Date.now()}`,
            entity: original.entity,
            fileName: `${original.fileName} (Retry)`,
            uploadedBy: userId || 'system',
            status: 'pending',
            totalRows: original.errorRows || 0,
            successRows: 0,
            errorRows: 0,
            errors: [],
        });
        return {
            message: 'Retry initiated',
            originalJobId: jobId,
            retryJobId: retryJob.jobId,
            status: retryJob.status,
        };
    }
    parseCsvRows(buffer) {
        const text = buffer.toString('utf8');
        const parsed = (0, sync_1.parse)(text, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            bom: true,
        });
        const first = parsed[0] || {};
        const headers = Object.keys(first).map((key) => key.toLowerCase().replace(/[^a-z0-9]/g, ''));
        const rows = parsed.map((row) => {
            const normalized = {};
            for (const [key, value] of Object.entries(row)) {
                const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
                normalized[normalizedKey] = String(value ?? '').trim();
            }
            return normalized;
        });
        return { rows, headers };
    }
    value(row, aliases) {
        for (const key of aliases) {
            const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');
            const found = row[normalized];
            if (found !== undefined && found !== '')
                return found;
        }
        return '';
    }
    async resolveDefaultRoleId() {
        const preferred = await this.roleModel.findOne({ name: { $in: ['staff', 'admin'] } });
        if (preferred?._id)
            return preferred._id;
        const firstRole = await this.roleModel.findOne();
        if (firstRole?._id)
            return firstRole._id;
        const created = await this.roleModel.create({
            name: 'staff',
            description: 'Default staff role for imported employees',
            permissions: [],
        });
        return created._id;
    }
    async resolveRoleId(roleIdRaw, fallbackRoleId) {
        if (!roleIdRaw)
            return fallbackRoleId;
        if (!mongoose_2.Types.ObjectId.isValid(roleIdRaw)) {
            throw new Error('roleId is not a valid Mongo ObjectId');
        }
        const role = await this.roleModel.findById(roleIdRaw);
        if (!role)
            throw new Error('roleId not found');
        return role._id;
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
        if (missing.length > 0) {
            throw new common_1.BadRequestException(`Missing required CSV headers: ${missing.join(', ')}`);
        }
    }
    assertProductsHeaders(headers) {
        const missing = [['sku'], ['name'], ['category'], ['unitprice', 'unit_price', 'price'], ['costprice', 'cost_price']]
            .filter((aliases) => !this.headerExists(headers, aliases))
            .map((aliases) => aliases[0]);
        if (missing.length > 0) {
            throw new common_1.BadRequestException(`Missing required CSV headers: ${missing.join(', ')}`);
        }
    }
    headerExists(headers, aliases) {
        const normalizedHeaders = new Set(headers.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, '')));
        return aliases.some((alias) => normalizedHeaders.has(alias.toLowerCase().replace(/[^a-z0-9]/g, '')));
    }
    async processEmployeesRows(rows, persist) {
        const errors = [];
        let successRows = 0;
        const defaultRoleId = persist ? await this.resolveDefaultRoleId() : undefined;
        for (let i = 0; i < rows.length; i += 1) {
            const rowNumber = i + 1;
            try {
                const input = rows[i];
                const employeeId = this.value(input, ['employeeid', 'employee_id', 'id']);
                const name = this.value(input, ['name', 'fullname', 'full_name']);
                const email = this.value(input, ['email', 'mail']);
                const hourlyRateRaw = this.value(input, ['hourlyrate', 'hourly_rate', 'rate']);
                const currency = this.value(input, ['currency']) || 'SYP';
                const department = this.value(input, ['department']) || 'Warehouse';
                const scheduledStart = this.value(input, ['scheduledstart', 'scheduled_start', 'start']);
                const scheduledEnd = this.value(input, ['scheduledend', 'scheduled_end', 'end']);
                const status = this.value(input, ['status']) || 'active';
                const roleIdRaw = this.value(input, ['roleid', 'role_id']);
                if (!employeeId || !name || !email || !hourlyRateRaw) {
                    throw new Error('Missing required fields: employeeId, name, email, hourlyRate');
                }
                const hourlyRate = Number(hourlyRateRaw);
                if (Number.isNaN(hourlyRate) || hourlyRate < 0) {
                    throw new Error('hourlyRate must be a valid non-negative number');
                }
                if (!['active', 'inactive', 'on_leave', 'terminated'].includes(status)) {
                    throw new Error('status must be one of: active, inactive, on_leave, terminated');
                }
                if (persist) {
                    const roleId = await this.resolveRoleId(roleIdRaw, defaultRoleId);
                    await this.employeeModel.updateOne({ employeeId }, {
                        $set: {
                            employeeId,
                            name,
                            email: email.toLowerCase(),
                            hourlyRate,
                            currency,
                            department,
                            scheduledStart: scheduledStart || undefined,
                            scheduledEnd: scheduledEnd || undefined,
                            status,
                            roleId,
                        },
                    }, { upsert: true });
                }
                successRows += 1;
            }
            catch (error) {
                errors.push({ row: rowNumber, error: error?.message || 'Unknown validation error' });
            }
        }
        return {
            totalRows: rows.length,
            successRows,
            errorRows: errors.length,
            errors,
        };
    }
    async processProductsRows(rows, persist) {
        const errors = [];
        let successRows = 0;
        for (let i = 0; i < rows.length; i += 1) {
            const rowNumber = i + 1;
            try {
                const input = rows[i];
                const sku = this.value(input, ['sku']);
                const name = this.value(input, ['name']);
                const category = this.value(input, ['category']);
                const unitPriceRaw = this.value(input, ['unitprice', 'unit_price', 'price']);
                const costPriceRaw = this.value(input, ['costprice', 'cost_price']);
                const reorderLevelRaw = this.value(input, ['reorderlevel', 'reorder_level', 'reorder']);
                const status = this.value(input, ['status']) || 'active';
                if (!sku || !name || !category || !unitPriceRaw || !costPriceRaw) {
                    throw new Error('Missing required fields: sku, name, category, unitPrice, costPrice');
                }
                const unitPrice = Number(unitPriceRaw);
                const costPrice = Number(costPriceRaw);
                const reorderLevel = reorderLevelRaw ? Number(reorderLevelRaw) : 10;
                if (Number.isNaN(unitPrice) || Number.isNaN(costPrice) || Number.isNaN(reorderLevel)) {
                    throw new Error('unitPrice, costPrice and reorderLevel must be valid numbers');
                }
                if (unitPrice < 0 || costPrice < 0 || reorderLevel < 0) {
                    throw new Error('unitPrice, costPrice and reorderLevel must be non-negative numbers');
                }
                if (persist) {
                    await this.productModel.updateOne({ sku }, {
                        $set: {
                            sku,
                            name,
                            category,
                            unitPrice,
                            costPrice,
                            reorderLevel,
                            status,
                        },
                    }, { upsert: true });
                }
                successRows += 1;
            }
            catch (error) {
                errors.push({ row: rowNumber, error: error?.message || 'Unknown validation error' });
            }
        }
        return {
            totalRows: rows.length,
            successRows,
            errorRows: errors.length,
            errors,
        };
    }
    jobStatus(totalRows, successRows, errorRows) {
        if (totalRows === 0)
            return 'completed';
        if (errorRows === 0)
            return 'completed';
        if (successRows === 0)
            return 'failed';
        return 'partial';
    }
};
exports.ImportsService = ImportsService;
exports.ImportsService = ImportsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(import_job_schema_1.ImportJob.name)),
    __param(1, (0, mongoose_1.InjectModel)(employee_schema_1.Employee.name)),
    __param(2, (0, mongoose_1.InjectModel)(product_schema_1.Product.name)),
    __param(3, (0, mongoose_1.InjectModel)(role_schema_1.Role.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], ImportsService);
//# sourceMappingURL=imports.service.js.map