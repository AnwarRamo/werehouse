import { Body, Controller, Delete, Get, Param, Patch, Put, UseGuards } from '@nestjs/common';
import { InsuranceService } from './insurance.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { UpsertInsuranceDto } from './dto/upsert-insurance.dto';

@Controller('insurance')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InsuranceController {
  constructor(private readonly insuranceService: InsuranceService) {}

  @Get()
  @Permissions('manage_insurance')
  list() {
    return this.insuranceService.list();
  }

  @Get('status')
  @Permissions('manage_insurance')
  status() {
    return this.insuranceService.status();
  }

  @Get(':employeeId')
  @Permissions('manage_insurance')
  getOne(@Param('employeeId') employeeId: string) {
    return this.insuranceService.getByEmployee(employeeId);
  }

  @Put(':employeeId')
  @Permissions('manage_insurance')
  upsert(@Param('employeeId') employeeId: string, @Body() dto: UpsertInsuranceDto) {
    return this.insuranceService.upsert(employeeId, dto);
  }

  @Patch('update/:employeeId')
  @Permissions('manage_insurance')
  updateAlias(@Param('employeeId') employeeId: string, @Body() dto: UpsertInsuranceDto) {
    return this.insuranceService.upsert(employeeId, dto);
  }

  @Delete(':employeeId')
  @Permissions('manage_insurance')
  remove(@Param('employeeId') employeeId: string) {
    return this.insuranceService.remove(employeeId);
  }
}
