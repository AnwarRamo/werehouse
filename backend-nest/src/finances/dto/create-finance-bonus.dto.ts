import { IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';

export class CreateFinanceBonusDto {
  @IsString()
  @Matches(/^EMP[0-9]{3,}$/)
  employeeId: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bonusAmount?: number;

  @IsOptional()
  @IsString()
  bonusReason?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  assistanceAmount?: number;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  period?: string;
}
