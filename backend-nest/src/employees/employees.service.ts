import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryParams } from '../common/types/query.types';
import { resolvePagination } from '../common/utils/pagination.util';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

export type EmployeesListQuery = PaginationQueryParams & {
  department?: string;
  status?: string;
  search?: string;
};

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: EmployeesListQuery) {
    const { page, limit, skip } = resolvePagination(query);
    const where: Prisma.EmployeeWhereInput = {};

    if (query.department) where.department = query.department;
    if (query.status) where.status = query.status;

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
    const byDepartment: Record<string, number> = {};
    let active = 0;
    let inactive = 0;
    let terminated = 0;

    for (const e of employees) {
      byDepartment[e.department || 'Unassigned'] =
        (byDepartment[e.department || 'Unassigned'] || 0) + 1;

      if (e.status === 'active') active += 1;
      if (e.status === 'inactive') inactive += 1;
      if (e.status === 'terminated') terminated += 1;
    }

    return {
      total: employees.length,
      active,
      inactive,
      terminated,
      byDepartment,
    };
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
    const exists = await this.prisma.employee.findFirst({
      where: {
        OR: [
          { employeeId: dto.employeeId },
          { email: { equals: email, mode: 'insensitive' } },
        ],
      },
    });

    if (exists) {
      throw new BadRequestException('Employee ID or email already exists');
    }

    const employee = await this.prisma.employee.create({
      data: {
        ...dto,
        email,
        hourlyRate: new Prisma.Decimal(dto.hourlyRate),
        department: dto.department || 'Warehouse',
        status: 'active',
      },
    });

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

    if (dto.email) {
      dto.email = dto.email.toLowerCase();
    }

    const updated = await this.prisma.employee.update({
      where: { employeeId },
      data: {
        ...dto,
        email: dto.email,
        hourlyRate:
          dto.hourlyRate !== undefined ? new Prisma.Decimal(dto.hourlyRate) : undefined,
      },
    });

    return { message: 'Employee updated successfully', employee: updated };
  }

  async remove(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({ where: { employeeId } });

    if (!employee) throw new NotFoundException('Employee not found');

    await this.prisma.employee.update({
      where: { employeeId },
      data: { status: 'terminated' },
    });

    return { message: 'Employee terminated successfully' };
  }
}
