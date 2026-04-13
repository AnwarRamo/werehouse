import { IsOptional, IsString, Matches } from 'class-validator';

export class BonusesListQueryDto {
  @IsOptional()
  @IsString()
  @Matches(/^EMP[0-9]{3,}$/)
  employeeId?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/)
  period?: string;
}
