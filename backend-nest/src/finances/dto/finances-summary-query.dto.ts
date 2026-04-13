import { IsOptional, IsString, Matches } from 'class-validator';

export class FinancesSummaryQueryDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  month?: string;
}
