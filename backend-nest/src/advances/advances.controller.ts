import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AdvancesService } from './advances.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/types/authenticated-user.types';
import { CreateAdvanceDto } from './dto/create-advance.dto';
import { UpdateAdvanceDto } from './dto/update-advance.dto';
import { AdvancesListQueryDto } from './dto/advances-list-query.dto';

@Controller('advances')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdvancesController {
  constructor(private readonly advancesService: AdvancesService) {}

  @Get()
  @Permissions('manage_advances')
  list(@Query() query: AdvancesListQueryDto) {
    return this.advancesService.list(query.employeeId);
  }

  @Get('summary/:employeeId')
  @Permissions('manage_advances')
  summary(@Param('employeeId') employeeId: string) {
    return this.advancesService.summary(employeeId);
  }

  @Get('deleted/history')
  @Permissions('manage_advances')
  listDeletedHistory() {
    return this.advancesService.listDeletedHistory();
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

  @Post('restore/:historyId')
  @Permissions('manage_advances')
  restore(
    @Param('historyId') historyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.advancesService.restore(historyId, user?.userId);
  }

  @Put(':id')
  @Permissions('manage_advances')
  update(@Param('id') id: string, @Body() dto: UpdateAdvanceDto) {
    return this.advancesService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('manage_advances')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.advancesService.remove(id, user?.userId);
  }
}
