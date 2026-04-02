import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: {
    page?: number;
    limit?: number;
    department?: string;
    status?: string;
    search?: string;
  }) {
    const page = Number(query.page || 1);
    const limit = Math.min(Number(query.limit || 50), 200);
    const skip = (page - 1) * limit;
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

    for (const e of employees) {
      byDepartment[e.department || 'Unassigned'] =
        (byDepartment[e.department || 'Unassigned'] || 0) + 1;
    }

    return {
      total: employees.length,
      active: employees.filter((e: (typeof employees)[number]) => e.status === 'active').length,
      inactive: employees.filter((e: (typeof employees)[number]) => e.status === 'inactive').length,
      terminated: employees.filter((e: (typeof employees)[number]) => e.status === 'terminated').length,
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
