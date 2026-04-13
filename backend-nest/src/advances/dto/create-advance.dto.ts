import { IsDateString, IsIn, IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';

export class CreateAdvanceDto {
  @IsString()
  @Matches(/^EMP[0-9]{3,}$/)
  employeeId: string;

  @IsOptional()
  @IsIn(['salary', 'clothing', 'other'])
  advanceType?: string;

  @IsNumber()
  @Min(0.01)
  totalAmount: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  installmentAmount?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  issueDate?: string;
}
