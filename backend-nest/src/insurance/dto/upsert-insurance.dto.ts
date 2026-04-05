import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpsertInsuranceDto {
  @IsNumber()
  @Min(0)
  insuranceSalary: number;

  @IsOptional()
  @IsString()
  socialSecurityNumber?: string;

  @IsOptional()
  @IsDateString()
  registrationDate?: string;
}
