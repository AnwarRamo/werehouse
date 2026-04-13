import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { BonusesService } from './bonuses.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CreateBonusDto } from './dto/create-bonus.dto';
import { UpdateBonusDto } from './dto/update-bonus.dto';
import { BonusesListQueryDto } from './dto/bonuses-list-query.dto';

@Controller('bonuses')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BonusesController {
  constructor(private readonly bonusesService: BonusesService) {}

  @Get()
  @Permissions('manage_bonuses')
  list(@Query() query: BonusesListQueryDto) {
    return this.bonusesService.list(query.employeeId, query.period);
  }

  @Get('summary/:period')
  @Permissions('manage_bonuses')
  periodSummary(@Param('period') period: string) {
    return this.bonusesService.periodSummary(period);
  }

  @Get(':id')
  @Permissions('manage_bonuses')
  getOne(@Param('id') id: string) {
    return this.bonusesService.getById(id);
  }

  @Post()
  @Permissions('manage_bonuses')
  create(@Body() dto: CreateBonusDto) {
    return this.bonusesService.create(dto);
  }

  @Put(':id')
  @Permissions('manage_bonuses')
  update(@Param('id') id: string, @Body() dto: UpdateBonusDto) {
    return this.bonusesService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('manage_bonuses')
  remove(@Param('id') id: string) {
    return this.bonusesService.remove(id);
  }
}
