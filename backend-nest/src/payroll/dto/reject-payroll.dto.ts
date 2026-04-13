import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RejectPayrollDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}
