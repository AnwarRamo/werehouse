import { Body, Controller, Delete, Get, Param, Put, UseGuards } from '@nestjs/common';
import { SalaryService } from './salary.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { UpsertSalaryDto } from './dto/upsert-salary.dto';

@Controller('salary')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SalaryController {
  constructor(private readonly salaryService: SalaryService) {}

  @Get()
  @Permissions('manage_salary')
  list() {
    return this.salaryService.list();
  }

  @Get(':employeeId')
  @Permissions('manage_salary')
  getOne(@Param('employeeId') employeeId: string) {
    return this.salaryService.getByEmployee(employeeId);
  }

  @Put(':employeeId')
  @Permissions('manage_salary')
  upsert(@Param('employeeId') employeeId: string, @Body() dto: UpsertSalaryDto) {
    return this.salaryService.upsert(employeeId, dto);
  }

  @Delete(':employeeId')
  @Permissions('manage_salary')
  remove(@Param('employeeId') employeeId: string) {
    return this.salaryService.remove(employeeId);
  }
}
