import { IsBoolean, IsDateString, IsIn, IsOptional, IsString, Matches } from 'class-validator';

export class CreateAttendanceDto {
  @IsString()
  @Matches(/^EMP[0-9]{3,}$/)
  employeeId: string;

  @IsDateString()
  timestamp: string;

  @IsString()
  @IsIn(['IN', 'OUT'])
  type: string;

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsBoolean()
  verified?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
