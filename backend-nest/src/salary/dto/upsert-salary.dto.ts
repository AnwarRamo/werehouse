import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpsertSalaryDto {
  @IsOptional()
  @IsString()
  profession?: string;

  @IsNumber()
  @Min(0)
  baseSalary: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  responsibilityAllowance?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  productionIncentive?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  transportAllowance?: number;
}
