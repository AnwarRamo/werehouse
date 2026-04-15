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
const short_cache_service_1 = require("../common/cache/short-cache.service");
const DEFAULT_PROFILE_RANGE_DAYS = 30;
const DEFAULT_PROFILE_LIMIT = 200;
let EmployeesService = class EmployeesService {
    constructor(prisma, shortCache) {
        this.prisma = prisma;
        this.shortCache = shortCache;
    }
    normalizeOptionalString(value) {
        if (value === null || value === undefined)
            return null;
        const trimmed = value.trim();
        return trimmed ? trimmed : null;
    }
    parseOptionalDate(value, fieldName) {
        if (value === null || value === undefined)
            return null;
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            throw new common_1.BadRequestException(`${fieldName} must be a valid ISO date`);
        }
        return parsed;
    }
    validateEmploymentDates(employmentStartDate, terminationDate) {
        if (employmentStartDate && terminationDate && employmentStartDate > terminationDate) {
            throw new common_1.BadRequestException('employmentStartDate cannot be later than terminationDate');
        }
    }
    resolveProfileRange(startDate, endDate) {
        if (startDate && endDate) {
            if (startDate > endDate) {
                throw new common_1.BadRequestException('startDate must be less than or equal to endDate');
            }
            return { startDate, endDate };
        }
        if (startDate || endDate) {
            throw new common_1.BadRequestException('startDate and endDate must be provided together');
        }
        const end = new Date();
        const start = new Date(end);
        start.setDate(start.getDate() - DEFAULT_PROFILE_RANGE_DAYS);
        return {
            startDate: start.toISOString().slice(0, 10),
            endDate: end.toISOString().slice(0, 10),
        };
    }
    hasPermission(user, permission) {
        if (!user)
            return false;
        if (user.role === 'admin' || user.roles?.includes('admin')) {
            return true;
        }
        return user.permissions?.includes(permission) ?? false;
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
                { mobile: { contains: query.search, mode: 'insensitive' } },
                { nationalId: { contains: query.search, mode: 'insensitive' } },
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
        return this.shortCache.getOrSetJson('employees:stats', 30, async () => {
            const [total, active, inactive, terminated, groupedByDepartment] = await Promise.all([
                this.prisma.employee.count(),
                this.prisma.employee.count({ where: { status: 'active' } }),
                this.prisma.employee.count({ where: { status: 'inactive' } }),
                this.prisma.employee.count({ where: { status: 'terminated' } }),
                this.prisma.employee.groupBy({
                    by: ['department'],
                    _count: { _all: true },
                }),
            ]);
            const byDepartment = groupedByDepartment.reduce((accumulator, entry) => {
                const key = entry.department || 'Unassigned';
                accumulator[key] = entry._count._all;
                return accumulator;
            }, {});
            return {
                total,
                active,
                inactive,
                terminated,
                byDepartment,
            };
        });
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
        const mobile = this.normalizeOptionalString(dto.mobile);
        const nationalId = this.normalizeOptionalString(dto.nationalId);
        const employmentStartDate = this.parseOptionalDate(dto.employmentStartDate, 'employmentStartDate');
        const terminationDate = this.parseOptionalDate(dto.terminationDate, 'terminationDate');
        if (terminationDate) {
            throw new common_1.BadRequestException('terminationDate cannot be set during creation. Use update/remove when terminating an employee');
        }
        this.validateEmploymentDates(employmentStartDate, terminationDate);
        const uniqueChecks = [
            { employeeId: dto.employeeId },
            { email: { equals: email, mode: 'insensitive' } },
        ];
        if (nationalId) {
            uniqueChecks.push({ nationalId });
        }
        const exists = await this.prisma.employee.findFirst({
            where: {
                OR: uniqueChecks,
            },
        });
        if (exists) {
            if (exists.employeeId === dto.employeeId) {
                throw new common_1.BadRequestException('Employee ID already exists');
            }
            if (exists.email.toLowerCase() === email) {
                throw new common_1.BadRequestException('Employee email already exists');
            }
            if (nationalId && exists.nationalId === nationalId) {
                throw new common_1.BadRequestException('Employee national ID already exists');
            }
            throw new common_1.BadRequestException('Employee unique fields conflict with an existing record');
        }
        const employee = await this.prisma.employee.create({
            data: {
                employeeId: dto.employeeId,
                name: dto.name,
                email,
                mobile,
                nationalId,
                hourlyRate: new client_1.Prisma.Decimal(dto.hourlyRate),
                roleId: dto.roleId,
                department: dto.department || 'Warehouse',
                scheduledStart: dto.scheduledStart || null,
                scheduledEnd: dto.scheduledEnd || null,
                employmentStartDate,
                terminationDate: null,
                status: 'active',
            },
        });
        await this.shortCache.invalidatePrefix('employees:stats');
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
        const email = dto.email?.toLowerCase();
        const nationalId = dto.nationalId !== undefined
            ? this.normalizeOptionalString(dto.nationalId)
            : undefined;
        const employmentStartDate = dto.employmentStartDate !== undefined
            ? this.parseOptionalDate(dto.employmentStartDate, 'employmentStartDate')
            : undefined;
        const terminationDate = dto.terminationDate !== undefined
            ? this.parseOptionalDate(dto.terminationDate, 'terminationDate')
            : undefined;
        const nextEmploymentStartDate = employmentStartDate === undefined ? employee.employmentStartDate : employmentStartDate;
        const nextTerminationDate = terminationDate === undefined ? employee.terminationDate : terminationDate;
        this.validateEmploymentDates(nextEmploymentStartDate, nextTerminationDate);
        if (email || nationalId !== undefined) {
            const uniqueChecks = [];
            if (email) {
                uniqueChecks.push({ email: { equals: email, mode: 'insensitive' } });
            }
            if (nationalId) {
                uniqueChecks.push({ nationalId });
            }
            if (uniqueChecks.length > 0) {
                const conflict = await this.prisma.employee.findFirst({
                    where: {
                        AND: [
                            { employeeId: { not: employeeId } },
                            { OR: uniqueChecks },
                        ],
                    },
                });
                if (conflict) {
                    if (email && conflict.email.toLowerCase() === email) {
                        throw new common_1.BadRequestException('Employee email already exists');
                    }
                    if (nationalId && conflict.nationalId === nationalId) {
                        throw new common_1.BadRequestException('Employee national ID already exists');
                    }
                    throw new common_1.BadRequestException('Employee unique fields conflict with an existing record');
                }
            }
        }
        const mobile = dto.mobile !== undefined
            ? this.normalizeOptionalString(dto.mobile)
            : undefined;
        const payload = {
            ...(dto.name !== undefined && { name: dto.name }),
            ...(email !== undefined && { email }),
            ...(mobile !== undefined && { mobile }),
            ...(nationalId !== undefined && { nationalId }),
            ...(dto.hourlyRate !== undefined && {
                hourlyRate: new client_1.Prisma.Decimal(dto.hourlyRate),
            }),
            ...(dto.roleId !== undefined && { roleId: dto.roleId }),
            ...(dto.department !== undefined && { department: dto.department }),
            ...(dto.scheduledStart !== undefined && { scheduledStart: dto.scheduledStart }),
            ...(dto.scheduledEnd !== undefined && { scheduledEnd: dto.scheduledEnd }),
            ...(employmentStartDate !== undefined && { employmentStartDate }),
            ...(terminationDate !== undefined && { terminationDate }),
        };
        const updated = await this.prisma.employee.update({
            where: { employeeId },
            data: payload,
        });
        await this.shortCache.invalidatePrefix('employees:stats');
        return { message: 'Employee updated successfully', employee: updated };
    }
    async getProfile(employeeId, query, user) {
        const employee = await this.getByEmployeeId(employeeId);
        const canViewSalary = this.hasPermission(user, 'manage_salary');
        const canViewAttendance = this.hasPermission(user, 'view_attendance');
        const canViewAdvances = this.hasPermission(user, 'manage_advances');
        const canViewBonuses = this.hasPermission(user, 'manage_bonuses');
        const attendanceRange = this.resolveProfileRange(query.startDate, query.endDate);
        const attendanceLimit = query.attendanceLimit ?? DEFAULT_PROFILE_LIMIT;
        const advancesLimit = query.advancesLimit ?? DEFAULT_PROFILE_LIMIT;
        const bonusesLimit = query.bonusesLimit ?? DEFAULT_PROFILE_LIMIT;
        const attendanceWhere = {
            employeeId,
            date: {
                gte: attendanceRange.startDate,
                lte: attendanceRange.endDate,
            },
        };
        const bonusesWhere = {
            employeeId,
            ...(query.period ? { period: query.period } : {}),
        };
        const salaryPromise = canViewSalary
            ? this.prisma.employeeSalary.findUnique({ where: { employeeId } })
            : Promise.resolve(null);
        const attendancePromise = canViewAttendance
            ? Promise.all([
                this.prisma.attendanceRecord.findMany({
                    where: attendanceWhere,
                    orderBy: [{ date: 'asc' }, { timestamp: 'asc' }],
                    take: attendanceLimit,
                }),
                this.prisma.attendanceRecord.count({ where: attendanceWhere }),
                this.prisma.attendanceRecord.groupBy({ by: ['date'], where: attendanceWhere }),
            ]).then(([records, totalRecords, groupedDays]) => ({
                period: attendanceRange,
                statistics: {
                    totalDays: groupedDays.length,
                    totalRecords,
                },
                records,
            }))
            : Promise.resolve(null);
        const advancesPromise = canViewAdvances
            ? Promise.all([
                this.prisma.employeeAdvance.findMany({
                    where: { employeeId },
                    orderBy: { issueDate: 'desc' },
                    take: advancesLimit,
                }),
                this.prisma.employeeAdvance.count({ where: { employeeId } }),
                this.prisma.employeeAdvance.aggregate({
                    where: { employeeId },
                    _sum: {
                        totalAmount: true,
                        remainingAmount: true,
                    },
                }),
            ]).then(([advances, totalAdvances, aggregate]) => ({
                summary: {
                    totalAdvances,
                    totalAmount: Number(aggregate._sum.totalAmount || 0),
                    remainingAmount: Number(aggregate._sum.remainingAmount || 0),
                },
                advances,
            }))
            : Promise.resolve(null);
        const bonusesPromise = canViewBonuses
            ? Promise.all([
                this.prisma.employeeBonus.findMany({
                    where: bonusesWhere,
                    orderBy: { createdAt: 'desc' },
                    take: bonusesLimit,
                }),
                this.prisma.employeeBonus.count({ where: bonusesWhere }),
                this.prisma.employeeBonus.aggregate({
                    where: bonusesWhere,
                    _sum: {
                        bonusAmount: true,
                        assistanceAmount: true,
                    },
                }),
            ]).then(([bonuses, totalRecords, aggregate]) => ({
                period: query.period || null,
                summary: {
                    totalRecords,
                    totalBonus: Number(aggregate._sum.bonusAmount || 0),
                    totalAssistance: Number(aggregate._sum.assistanceAmount || 0),
                },
                bonuses,
            }))
            : Promise.resolve(null);
        const [salary, attendance, advances, bonuses] = await Promise.all([
            salaryPromise,
            attendancePromise,
            advancesPromise,
            bonusesPromise,
        ]);
        return {
            employee,
            access: {
                salary: canViewSalary,
                attendance: canViewAttendance,
                advances: canViewAdvances,
                bonuses: canViewBonuses,
            },
            filters: {
                attendance: attendanceRange,
                bonuses: {
                    period: query.period || null,
                },
                limits: {
                    attendance: attendanceLimit,
                    advances: advancesLimit,
                    bonuses: bonusesLimit,
                },
            },
            salary,
            attendance,
            advances,
            bonuses,
        };
    }
    async remove(employeeId) {
        const employee = await this.prisma.employee.findUnique({ where: { employeeId } });
        if (!employee)
            throw new common_1.NotFoundException('Employee not found');
        await this.prisma.employee.update({
            where: { employeeId },
            data: {
                status: 'terminated',
                terminationDate: employee.terminationDate || new Date(),
            },
        });
        await this.shortCache.invalidatePrefix('employees:stats');
        return { message: 'Employee terminated successfully' };
    }
};
exports.EmployeesService = EmployeesService;
exports.EmployeesService = EmployeesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        short_cache_service_1.ShortCacheService])
], EmployeesService);
//# sourceMappingURL=employees.service.js.map