import { IsDateString, IsOptional } from 'class-validator';

export class AttendanceRangeQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
