import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateAdvanceDto {
  @IsString()
  employeeId: string;

  @IsOptional()
  @IsIn(['salary', 'clothing', 'other'])
  advanceType?: string;

  @IsNumber()
  @Min(0)
  totalAmount: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  installmentAmount?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
