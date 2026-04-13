import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { FinancesService } from './finances.service';
import { CreateFinanceAdvanceDto } from './dto/create-finance-advance.dto';
import { CreateFinanceBonusDto } from './dto/create-finance-bonus.dto';
import { FinancesSummaryQueryDto } from './dto/finances-summary-query.dto';

@Controller('finances')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FinancesController {
  constructor(private readonly financesService: FinancesService) {}

  @Post('advances')
  @Permissions('manage_advances')
  createAdvance(@Body() dto: CreateFinanceAdvanceDto) {
    return this.financesService.createAdvance(dto);
  }

  @Post('bonuses')
  @Permissions('manage_bonuses')
  createBonus(@Body() dto: CreateFinanceBonusDto) {
    return this.financesService.createBonus(dto);
  }

  @Get('summary/:empId')
  @Permissions('view_payroll')
  summary(@Param('empId') employeeId: string, @Query() query: FinancesSummaryQueryDto) {
    return this.financesService.summary(employeeId, query.month);
  }
}
