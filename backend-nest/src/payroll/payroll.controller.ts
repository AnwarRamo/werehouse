import { Body, Controller, Delete, Get, Param, Post, Put, Query, Res, UseGuards } from '@nestjs/common';
import { Req } from '@nestjs/common';
import { ApiTags, ApiCookieAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { Response } from 'express';
import { PayrollService } from './payroll.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { EmployeeAccessService } from '../common/services/employee-access.service';
import { CalculatePayrollDto } from './dto/calculate-payroll.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuditService } from '../common/services/audit.service';
import { AuthenticatedUser } from '../common/types/authenticated-user.types';
import { PayrollListQueryDto } from './dto/payroll-list-query.dto';
import { PayrollSummaryQueryDto } from './dto/payroll-summary-query.dto';
import { RejectPayrollDto } from './dto/reject-payroll.dto';
import { PayrollInputsQueryDto, UpsertPayrollInputDto } from './dto/payroll-input.dto';
import {
  BulkUpsertPayrollReceiptsDto,
  PayrollReceiptsQueryDto,
  UpsertPayrollReceiptDto,
} from './dto/payroll-receipt.dto';

@ApiTags('payroll')
@ApiCookieAuth()
@Controller('payroll')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PayrollController {
  constructor(
    private readonly payrollService: PayrollService,
    private readonly audit: AuditService,
    private readonly employeeAccess: EmployeeAccessService,
  ) {}

  @Get()
  @Permissions('view_payroll')
  list(@Query() query: PayrollListQueryDto) {
    return this.payrollService.list(query);
  }

  @Get('summary')
  @Permissions('view_payroll')
  summary(@Query() query: PayrollSummaryQueryDto) {
    return this.payrollService.summary(query.periodStart, query.periodEnd);
  }

  @Get('inputs')
  @Permissions('view_payroll')
  listInputs(@Query() query: PayrollInputsQueryDto) {
    return this.payrollService.listInputs(query);
  }

  @Post('inputs')
  @Permissions('run_payroll')
  upsertInputs(@Body() dto: UpsertPayrollInputDto) {
    return this.payrollService.upsertInput(dto);
  }

  @Get('provisional-settlement')
  @Permissions('view_payroll')
  provisionalSettlement(
    @Query('employeeId') employeeId: string,
    @Query('terminationDate') terminationDate: string,
  ) {
    return this.payrollService.calculateProvisionalSettlement(employeeId, terminationDate);
  }

  @Post('calculate')
  @Permissions('run_payroll')
  calculate(@Body() dto: CalculatePayrollDto, @CurrentUser() user: AuthenticatedUser) {
    return this.payrollService.calculate(dto, user?.userId);
  }

  @Post('calculate/async')
  @Permissions('run_payroll')
  calculateAsync(@Body() dto: CalculatePayrollDto, @CurrentUser() user: AuthenticatedUser) {
    return this.payrollService.calculateAsync(dto, user?.userId);
  }

  @Get('report/:month')
  @Permissions('view_payroll')
  report(@Param('month') month: string) {
    return this.payrollService.report(month);
  }

  @Get('receipts')
  @Permissions('view_payroll')
  listReceipts(@Query() query: PayrollReceiptsQueryDto) {
    return this.payrollService.listReceipts(query);
  }

  @Put('receipts/:employeeId')
  @Permissions('view_payroll')
  async upsertReceipt(
    @Param('employeeId') employeeId: string,
    @Body() dto: UpsertPayrollReceiptDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const result = await this.payrollService.upsertReceipt(employeeId, dto, user);
    this.audit.log(
      {
        action: 'payroll.receipt.upsert',
        actorId: user?.userId,
        actorUsername: user?.username,
        targetType: 'employee',
        targetId: employeeId,
        metadata: { month: dto.month, isReceived: dto.isReceived, receivedAt: dto.receivedAt ?? null },
      },
      req,
    );
    return result;
  }

  @Post('receipts/bulk')
  @Permissions('view_payroll')
  async bulkUpsertReceipts(
    @Body() dto: BulkUpsertPayrollReceiptsDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const result = await this.payrollService.bulkUpsertReceipts(dto, user);
    this.audit.log(
      {
        action: 'payroll.receipt.bulk-upsert',
        actorId: user?.userId,
        actorUsername: user?.username,
        targetType: 'payroll_receipt',
        targetId: dto.month,
        metadata: { month: dto.month, count: dto.employeeIds.length, isReceived: dto.isReceived },
      },
      req,
    );
    return result;
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
    @CurrentUser() user: AuthenticatedUser,
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
    @Body() dto: RejectPayrollDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const result = await this.payrollService.reject(runId, dto.reason, user?.userId);
    this.audit.log(
      {
        action: 'payroll.reject',
        actorId: user?.userId,
        actorUsername: user?.username,
        targetType: 'payroll_run',
        targetId: runId,
        metadata: { reason: dto.reason },
      },
      req,
    );
    return result;
  }

  @Get(':runId/export')
  @Permissions('view_payroll')
  async export(@Param('runId') runId: string, @Req() req: Request, @Res() res: Response) {
    const payload = await this.payrollService.export(runId);
    this.audit.log(
      {
        action: 'payroll.export',
        targetType: 'payroll_run',
        targetId: runId,
      },
      req,
    );

    res.setHeader('Content-Type', payload.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${payload.fileName}"`);
    res.status(200).send(payload.content);
  }

  @Get(':runId/export/pdf')
  @Permissions('view_payroll')
  async exportPdf(@Param('runId') runId: string, @Req() req: Request, @Res() res: Response) {
    const payload = await this.payrollService.exportPdf(runId);
    this.audit.log(
      {
        action: 'payroll.export.pdf',
        targetType: 'payroll_run',
        targetId: runId,
      },
      req,
    );

    res.setHeader('Content-Type', payload.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${payload.fileName}"`);
    res.status(200).send(payload.content);
  }

  @Delete(':runId')
  @Permissions('delete_payroll')
  async delete(
    @Param('runId') runId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const result = await this.payrollService.deletePayrollRun(runId, user?.userId);
    this.audit.log(
      {
        action: 'payroll.delete',
        actorId: user?.userId,
        actorUsername: user?.username,
        targetType: 'payroll_run',
        targetId: runId,
      },
      req,
    );
    return result;
  }

  @Get('employee/:employeeId')
  @Permissions('view_payroll')
  async employeeHistory(
    @Param('employeeId') employeeId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.employeeAccess.assertCanAccessEmployee(user, employeeId, [
      'view_payroll',
      'run_payroll',
      'approve_payroll',
    ]);
    return this.payrollService.getEmployeeHistory(employeeId);
  }
}
