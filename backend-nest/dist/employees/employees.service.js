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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeesService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const pagination_util_1 = require("../common/utils/pagination.util");
let EmployeesService = class EmployeesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(query) {
        const { page, limit, skip } = (0, pagination_util_1.resolvePagination)(query);
        const where = {};
        if (query.department)
            where.department = query.department;
        if (query.status)
            where.status = query.status;
        if (query.search) {
            where.OR = [
                { name: { contains: query.search, mode: 'insensitive' } },
                { employeeId: { contains: query.search, mode: 'insensitive' } },
                { email: { contains: query.search, mode: 'insensitive' } },
            ];
        }
        const [employees, total] = await Promise.all([
            this.prisma.employee.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.employee.count({ where }),
        ]);
        return {
            employees,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }
    async stats() {
        const employees = await this.prisma.employee.findMany();
        const byDepartment = {};
        let active = 0;
        let inactive = 0;
        let terminated = 0;
        for (const e of employees) {
            byDepartment[e.department || 'Unassigned'] =
                (byDepartment[e.department || 'Unassigned'] || 0) + 1;
            if (e.status === 'active')
                active += 1;
            if (e.status === 'inactive')
                inactive += 1;
            if (e.status === 'terminated')
                terminated += 1;
        }
        return {
            total: employees.length,
            active,
            inactive,
            terminated,
            byDepartment,
        };
    }
    async byDepartment(department) {
        const employees = await this.prisma.employee.findMany({
            where: { department, status: 'active' },
            orderBy: { createdAt: 'desc' },
        });
        return { department, count: employees.length, employees };
    }
    async create(dto) {
        const email = dto.email.toLowerCase();
        const exists = await this.prisma.employee.findFirst({
            where: {
                OR: [
                    { employeeId: dto.employeeId },
                    { email: { equals: email, mode: 'insensitive' } },
                ],
            },
        });
        if (exists) {
            throw new common_1.BadRequestException('Employee ID or email already exists');
        }
        const employee = await this.prisma.employee.create({
            data: {
                ...dto,
                email,
                hourlyRate: new client_1.Prisma.Decimal(dto.hourlyRate),
                department: dto.department || 'Warehouse',
                status: 'active',
            },
        });
        return { message: 'Employee created successfully', employee };
    }
    async getByEmployeeId(employeeId) {
        const employee = await this.prisma.employee.findUnique({ where: { employeeId } });
        if (!employee)
            throw new common_1.NotFoundException('Employee not found');
        return employee;
    }
    async update(employeeId, dto) {
        const employee = await this.prisma.employee.findUnique({ where: { employeeId } });
        if (!employee)
            throw new common_1.NotFoundException('Employee not found');
        if (dto.email) {
            dto.email = dto.email.toLowerCase();
        }
        const updated = await this.prisma.employee.update({
            where: { employeeId },
            data: {
                ...dto,
                email: dto.email,
                hourlyRate: dto.hourlyRate !== undefined ? new client_1.Prisma.Decimal(dto.hourlyRate) : undefined,
            },
        });
        return { message: 'Employee updated successfully', employee: updated };
    }
    async remove(employeeId) {
        const employee = await this.prisma.employee.findUnique({ where: { employeeId } });
        if (!employee)
            throw new common_1.NotFoundException('Employee not found');
        await this.prisma.employee.update({
            where: { employeeId },
            data: { status: 'terminated' },
        });
        return { message: 'Employee terminated successfully' };
    }
};
exports.EmployeesService = EmployeesService;
exports.EmployeesService = EmployeesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EmployeesService);
//# sourceMappingURL=employees.service.js.map