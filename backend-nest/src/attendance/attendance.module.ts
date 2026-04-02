import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';

@Module({
  imports: [],
  controllers: [AttendanceController],
  providers: [AttendanceService],
})
export class AttendanceModule {}
