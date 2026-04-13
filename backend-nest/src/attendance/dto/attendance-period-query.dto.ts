import { IsDateString } from 'class-validator';

export class AttendancePeriodQueryDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
