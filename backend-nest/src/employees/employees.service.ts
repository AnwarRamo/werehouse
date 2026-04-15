import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { resolvePagination } from '../common/utils/pagination.util';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeesListQueryDto } from './dto/employees-list-query.dto';
import { ShortCacheService } from '../common/cache/short-cache.service';
import { EmployeeProfileQueryDto } from './dto/employee-profile-query.dto';
import { AuthenticatedUser } from '../common/types/authenticated-user.types';

const DEFAULT_PROFILE_RANGE_DAYS = 30;
const DEFAULT_PROFILE_LIMIT = 200;

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shortCache: ShortCacheService,
  ) {}

  private normalizeOptionalString(value?: string | null) {
    if (value === null || value === undefined) return null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  private parseOptionalDate(value: string | null | undefined, fieldName: string) {
    if (value === null || value === undefined) return null;

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`${fieldName} must be a valid ISO date`);
    }

    return parsed;
  }

  private validateEmploymentDates(
    employmentStartDate: Date | null | undefined,
    terminationDate: Date | null | undefined,
  ) {
    if (employmentStartDate && terminationDate && employmentStartDate > terminationDate) {
      throw new BadRequestException('employmentStartDate cannot be later than terminationDate');
    }
  }

  private resolveProfileRange(startDate?: string, endDate?: string) {
    if (startDate && endDate) {
      if (startDate > endDate) {
        throw new BadRequestException('startDate must be less than or equal to endDate');
      }

      return { startDate, endDate };
    }

    if (startDate || endDate) {
      throw new BadRequestException('startDate and endDate must be provided together');
    }

    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - DEFAULT_PROFILE_RANGE_DAYS);

    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    };
  }

  private hasPermission(user: AuthenticatedUser | undefined, permission: string) {
    if (!user) return false;
    if (user.role === 'admin' || user.roles?.includes('admin')) {
      return true;
    }

    return user.permissions?.includes(permission) ?? false;
  }

  async list(query: EmployeesListQueryDto) {
    const { page, limit, skip } = resolvePagination(query);
    const where: Prisma.EmployeeWhereInput = {};

    if (query.department) where.department = query.department;
    if (query.status) where.status = query.status;

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

      const byDepartment = groupedByDepartment.reduce<Record<string, number>>((accumulator, entry) => {
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

  async byDepartment(department: string) {
    const employees = await this.prisma.employee.findMany({
      where: { department, status: 'active' },
      orderBy: { createdAt: 'desc' },
    });
    return { department, count: employees.length, employees };
  }

  async create(dto: CreateEmployeeDto) {
    const email = dto.email.toLowerCase();
    const mobile = this.normalizeOptionalString(dto.mobile);
    const nationalId = this.normalizeOptionalString(dto.nationalId);
    const employmentStartDate = this.parseOptionalDate(
      dto.employmentStartDate,
      'employmentStartDate',
    );
    const terminationDate = this.parseOptionalDate(dto.terminationDate, 'terminationDate');

    if (terminationDate) {
      throw new BadRequestException(
        'terminationDate cannot be set during creation. Use update/remove when terminating an employee',
      );
    }

    this.validateEmploymentDates(employmentStartDate, terminationDate);

    const uniqueChecks: Prisma.EmployeeWhereInput[] = [
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
        throw new BadRequestException('Employee ID already exists');
      }

      if (exists.email.toLowerCase() === email) {
        throw new BadRequestException('Employee email already exists');
      }

      if (nationalId && exists.nationalId === nationalId) {
        throw new BadRequestException('Employee national ID already exists');
      }

      throw new BadRequestException('Employee unique fields conflict with an existing record');
    }

    const employee = await this.prisma.employee.create({
      data: {
        employeeId: dto.employeeId,
        name: dto.name,
        email,
        mobile,
        nationalId,
        hourlyRate: new Prisma.Decimal(dto.hourlyRate),
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

  async getByEmployeeId(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({ where: { employeeId } });
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  async update(employeeId: string, dto: UpdateEmployeeDto) {
    const employee = await this.prisma.employee.findUnique({ where: { employeeId } });

    if (!employee) throw new NotFoundException('Employee not found');

    const email = dto.email?.toLowerCase();
    const nationalId =
      dto.nationalId !== undefined
        ? this.normalizeOptionalString(dto.nationalId)
        : undefined;
    const employmentStartDate =
      dto.employmentStartDate !== undefined
        ? this.parseOptionalDate(dto.employmentStartDate, 'employmentStartDate')
        : undefined;
    const terminationDate =
      dto.terminationDate !== undefined
        ? this.parseOptionalDate(dto.terminationDate, 'terminationDate')
        : undefined;

    const nextEmploymentStartDate =
      employmentStartDate === undefined ? employee.employmentStartDate : employmentStartDate;
    const nextTerminationDate =
      terminationDate === undefined ? employee.terminationDate : terminationDate;

    this.validateEmploymentDates(nextEmploymentStartDate, nextTerminationDate);

    if (email || nationalId !== undefined) {
      const uniqueChecks: Prisma.EmployeeWhereInput[] = [];
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
            throw new BadRequestException('Employee email already exists');
          }

          if (nationalId && conflict.nationalId === nationalId) {
            throw new BadRequestException('Employee national ID already exists');
          }

          throw new BadRequestException('Employee unique fields conflict with an existing record');
        }
      }
    }

    const mobile =
      dto.mobile !== undefined
        ? this.normalizeOptionalString(dto.mobile)
        : undefined;

    const payload: Prisma.EmployeeUncheckedUpdateInput = {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(email !== undefined && { email }),
      ...(mobile !== undefined && { mobile }),
      ...(nationalId !== undefined && { nationalId }),
      ...(dto.hourlyRate !== undefined && {
        hourlyRate: new Prisma.Decimal(dto.hourlyRate),
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

  async getProfile(
    employeeId: string,
    query: EmployeeProfileQueryDto,
    user?: AuthenticatedUser,
  ) {
    const employee = await this.getByEmployeeId(employeeId);

    const canViewSalary = this.hasPermission(user, 'manage_salary');
    const canViewAttendance = this.hasPermission(user, 'view_attendance');
    const canViewAdvances = this.hasPermission(user, 'manage_advances');
    const canViewBonuses = this.hasPermission(user, 'manage_bonuses');

    const attendanceRange = this.resolveProfileRange(query.startDate, query.endDate);
    const attendanceLimit = query.attendanceLimit ?? DEFAULT_PROFILE_LIMIT;
    const advancesLimit = query.advancesLimit ?? DEFAULT_PROFILE_LIMIT;
    const bonusesLimit = query.bonusesLimit ?? DEFAULT_PROFILE_LIMIT;

    const attendanceWhere: Prisma.AttendanceRecordWhereInput = {
      employeeId,
      date: {
        gte: attendanceRange.startDate,
        lte: attendanceRange.endDate,
      },
    };

    const bonusesWhere: Prisma.EmployeeBonusWhereInput = {
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

  async remove(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({ where: { employeeId } });

    if (!employee) throw new NotFoundException('Employee not found');

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
}
