import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateAdvanceDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  remainingAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  installmentAmount?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
