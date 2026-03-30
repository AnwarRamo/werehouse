import { IsDateString, IsNumber, IsOptional } from 'class-validator';

export class CalculatePayrollDto {
  @IsDateString()
  periodStart: string;

  @IsDateString()
  periodEnd: string;

  @IsOptional()
  @IsNumber()
  gracePeriodMinutes?: number;
}
