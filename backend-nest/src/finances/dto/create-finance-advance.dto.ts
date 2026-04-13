import { IsDateString, IsIn, IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';

export class CreateFinanceAdvanceDto {
  @IsString()
  @Matches(/^EMP[0-9]{3,}$/)
  employeeId: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsIn(['salary', 'clothing', 'other'])
  advanceType?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  installmentAmount?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
