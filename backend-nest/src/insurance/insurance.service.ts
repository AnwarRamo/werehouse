import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertInsuranceDto } from './dto/upsert-insurance.dto';

@Injectable()
export class InsuranceService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.employeeInsurance.findMany({ orderBy: { employeeId: 'asc' } });
  }

  async getByEmployee(employeeId: string) {
    const record = await this.prisma.employeeInsurance.findUnique({ where: { employeeId } });
    if (!record) throw new NotFoundException(`No insurance record for employee ${employeeId}`);
    return record;
  }

  async upsert(employeeId: string, dto: UpsertInsuranceDto) {
    const data = {
      insuranceSalary: new Prisma.Decimal(dto.insuranceSalary),
      socialSecurityNumber: dto.socialSecurityNumber ?? null,
      registrationDate: dto.registrationDate ? new Date(dto.registrationDate) : null,
    };

    return this.prisma.employeeInsurance.upsert({
      where: { employeeId },
      update: data,
      create: { employeeId, ...data },
    });
  }

  async remove(employeeId: string) {
    await this.getByEmployee(employeeId);
    await this.prisma.employeeInsurance.delete({ where: { employeeId } });
    return { message: 'Insurance record deleted' };
  }
}
