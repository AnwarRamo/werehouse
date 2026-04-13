import { IsDateString, IsOptional } from 'class-validator';

export class PayrollSummaryQueryDto {
  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @IsOptional()
  @IsDateString()
  periodEnd?: string;
}
