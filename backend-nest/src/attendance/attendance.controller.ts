import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { AttendanceListQuery } from './attendance.service';

@Controller('attendance')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  @Permissions('view_attendance')
  list(@Query() query: AttendanceListQuery) {
    return this.attendanceService.list(query);
  }

  @Get('stats')
  @Permissions('view_attendance')
  stats(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return this.attendanceService.stats(startDate, endDate);
  }

  @Get('anomalies')
  @Permissions('view_attendance')
  anomalies(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return this.attendanceService.anomalies(startDate, endDate);
  }

  @Post()
  @Permissions('edit_attendance')
  create(@Body() dto: CreateAttendanceDto) {
    return this.attendanceService.create(dto);
  }

  @Get('employee/:employeeId/date/:date')
  @Permissions('view_attendance')
  employeeOnDate(@Param('employeeId') employeeId: string, @Param('date') date: string) {
    return this.attendanceService.employeeOnDate(employeeId, date);
  }

  @Get('employee/:employeeId/period')
  @Permissions('view_attendance')
  employeePeriod(
    @Param('employeeId') employeeId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.attendanceService.employeePeriod(employeeId, startDate, endDate);
  }

  @Get(':recordId')
  @Permissions('view_attendance')
  getById(@Param('recordId') recordId: string) {
    return this.attendanceService.getById(recordId);
  }

  @Put(':recordId')
  @Permissions('edit_attendance')
  update(@Param('recordId') recordId: string, @Body() dto: UpdateAttendanceDto) {
    return this.attendanceService.update(recordId, dto);
  }
}
