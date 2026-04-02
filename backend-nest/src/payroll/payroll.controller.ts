import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Req } from '@nestjs/common';
import { Request } from 'express';
import { PayrollService } from './payroll.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CalculatePayrollDto } from './dto/calculate-payroll.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuditService } from '../common/services/audit.service';

@Controller('payroll')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PayrollController {
  constructor(
    private readonly payrollService: PayrollService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @Permissions('view_payroll')
  list(@Query() query: any) {
    return this.payrollService.list(query);
  }

  @Get('summary')
  @Permissions('view_payroll')
  summary(@Query('periodStart') periodStart: string, @Query('periodEnd') periodEnd: string) {
    return this.payrollService.summary(periodStart, periodEnd);
  }

  @Post('calculate')
  @Permissions('run_payroll')
  calculate(@Body() dto: CalculatePayrollDto, @CurrentUser() user: any) {
    return this.payrollService.calculate(dto, user?.userId);
  }

  @Get(':runId')
  @Permissions('view_payroll')
  getById(@Param('runId') runId: string) {
    return this.payrollService.getRun(runId);
  }

  @Get(':runId/anomalies')
  @Permissions('view_payroll')
  anomalies(@Param('runId') runId: string) {
    return this.payrollService.anomalies(runId);
  }

  @Put(':runId/approve')
  @Permissions('approve_payroll')
  async approve(
    @Param('runId') runId: string,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    const result = await this.payrollService.approve(runId, user?.userId);
    this.audit.log(
      {
        action: 'payroll.approve',
        actorId: user?.userId,
        actorUsername: user?.username,
        targetType: 'payroll_run',
        targetId: runId,
      },
      req,
    );
    return result;
  }

  @Put(':runId/reject')
  @Permissions('approve_payroll')
  async reject(
    @Param('runId') runId: string,
    @Body('reason') reason: string,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    const result = await this.payrollService.reject(runId, reason, user?.userId);
    this.audit.log(
      {
        action: 'payroll.reject',
        actorId: user?.userId,
        actorUsername: user?.username,
        targetType: 'payroll_run',
        targetId: runId,
        metadata: { reason },
      },
      req,
    );
    return result;
  }

  @Get(':runId/export')
  @Permissions('view_payroll')
  export(@Param('runId') runId: string) {
    return this.payrollService.export(runId);
  }

  @Get('employee/:employeeId')
  @Permissions('view_payroll')
  employeeHistory(@Param('employeeId') employeeId: string) {
    return this.payrollService.getEmployeeHistory(employeeId);
  }
}
