import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateBonusDto {
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
  period?: string;
}
