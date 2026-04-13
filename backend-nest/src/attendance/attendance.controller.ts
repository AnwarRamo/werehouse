import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { AttendanceListQueryDto } from './dto/attendance-list-query.dto';
import { AttendanceRangeQueryDto } from './dto/attendance-range-query.dto';
import { AttendancePeriodQueryDto } from './dto/attendance-period-query.dto';
import { AttendanceAlertsQueryDto } from './dto/attendance-alerts-query.dto';
import { AuthenticatedUser } from '../common/types/authenticated-user.types';

@Controller('attendance')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  private static readonly uploadOptions = {
    fileFilter: (
      _req: Request,
      file: Express.Multer.File,
      cb: (error: Error | null, acceptFile: boolean) => void,
    ) => {
      const allowedExtensions = ['.csv', '.tsv', '.txt', '.json', '.xlsx', '.xls', '.xlsm', '.xlsb', '.ods'];
      const originalName = String(file?.originalname || '').toLowerCase();
      const hasAllowedExtension = allowedExtensions.some((extension) => originalName.endsWith(extension));

      if (!hasAllowedExtension) {
        cb(
          new BadRequestException(
            'Only tabular attendance files are allowed (csv, tsv, txt, json, xlsx, xls, xlsm, xlsb, ods)',
          ) as unknown as Error,
          false,
        );
        return;
      }

      cb(null, true);
    },
    limits: {
      fileSize: 10 * 1024 * 1024,
    },
  };

  @Get()
  @Permissions('view_attendance')
  list(@Query() query: AttendanceListQueryDto) {
    return this.attendanceService.list(query);
  }

  @Get('stats')
  @Permissions('view_attendance')
  stats(@Query() query: AttendanceRangeQueryDto) {
    return this.attendanceService.stats(query.startDate, query.endDate);
  }

  @Get('anomalies')
  @Permissions('view_attendance')
  anomalies(@Query() query: AttendanceRangeQueryDto) {
    return this.attendanceService.anomalies(query.startDate, query.endDate);
  }

  @Get('alerts')
  @Permissions('view_attendance')
  alerts(@Query() query: AttendanceAlertsQueryDto) {
    return this.attendanceService.alerts(query.date, query.lateThresholdMinutes);
  }

  @Get('deleted/history')
  @Permissions('edit_attendance')
  listDeletedHistory() {
    return this.attendanceService.listDeletedHistory();
  }

  @Post()
  @Permissions('edit_attendance')
  create(@Body() dto: CreateAttendanceDto) {
    return this.attendanceService.create(dto);
  }

  @Post('upload')
  @Permissions('edit_attendance')
  @UseInterceptors(FileInterceptor('file', AttendanceController.uploadOptions))
  upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendanceService.upload(file, user?.userId);
  }

  @Post('restore/:historyId')
  @Permissions('edit_attendance')
  restore(
    @Param('historyId') historyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendanceService.restore(historyId, user?.userId);
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
    @Query() query: AttendancePeriodQueryDto,
  ) {
    return this.attendanceService.employeePeriod(employeeId, query.startDate, query.endDate);
  }

  @Get(':month(\\d{4}-\\d{2})')
  @Permissions('view_attendance')
  month(@Param('month') month: string) {
    return this.attendanceService.month(month);
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

  @Delete(':recordId')
  @Permissions('edit_attendance')
  remove(@Param('recordId') recordId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.remove(recordId, user?.userId);
  }
}
