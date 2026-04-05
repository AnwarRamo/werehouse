import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AdvancesService } from './advances.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CreateAdvanceDto } from './dto/create-advance.dto';
import { UpdateAdvanceDto } from './dto/update-advance.dto';

@Controller('advances')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdvancesController {
  constructor(private readonly advancesService: AdvancesService) {}

  @Get()
  @Permissions('manage_advances')
  list(@Query('employeeId') employeeId?: string) {
    return this.advancesService.list(employeeId);
  }

  @Get('summary/:employeeId')
  @Permissions('manage_advances')
  summary(@Param('employeeId') employeeId: string) {
    return this.advancesService.summary(employeeId);
  }

  @Get(':id')
  @Permissions('manage_advances')
  getOne(@Param('id') id: string) {
    return this.advancesService.getById(id);
  }

  @Post()
  @Permissions('manage_advances')
  create(@Body() dto: CreateAdvanceDto) {
    return this.advancesService.create(dto);
  }

  @Put(':id')
  @Permissions('manage_advances')
  update(@Param('id') id: string, @Body() dto: UpdateAdvanceDto) {
    return this.advancesService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('manage_advances')
  remove(@Param('id') id: string) {
    return this.advancesService.remove(id);
  }
}
