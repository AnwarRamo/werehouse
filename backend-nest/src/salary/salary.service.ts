import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertSalaryDto } from './dto/upsert-salary.dto';

@Injectable()
export class SalaryService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.employeeSalary.findMany({ orderBy: { employeeId: 'asc' } });
  }

  async getByEmployee(employeeId: string) {
    const record = await this.prisma.employeeSalary.findUnique({ where: { employeeId } });
    if (!record) throw new NotFoundException(`No salary record for employee ${employeeId}`);
    return record;
  }

  async upsert(employeeId: string, dto: UpsertSalaryDto) {
    const data = {
      profession: dto.profession ?? null,
      baseSalary: new Prisma.Decimal(dto.baseSalary),
      responsibilityAllowance: new Prisma.Decimal(dto.responsibilityAllowance ?? 0),
      productionIncentive: new Prisma.Decimal(dto.productionIncentive ?? 0),
      transportAllowance: new Prisma.Decimal(dto.transportAllowance ?? 0),
    };

    return this.prisma.employeeSalary.upsert({
      where: { employeeId },
      update: data,
      create: { employeeId, ...data },
    });
  }

  async remove(employeeId: string) {
    await this.getByEmployee(employeeId);
    await this.prisma.employeeSalary.delete({ where: { employeeId } });
    return { message: 'Salary record deleted' };
  }
}
