import {
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateEmployeeDto {
  @IsString()
  @Matches(/^EMP[0-9]{3,}$/)
  employeeId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  mobile?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  nationalId?: string;

  @IsNumber()
  hourlyRate: number;

  @IsString()
  @IsNotEmpty()
  roleId: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  scheduledStart?: string;

  @IsOptional()
  @IsString()
  scheduledEnd?: string;

  @IsOptional()
  @IsDateString()
  employmentStartDate?: string;

  @IsOptional()
  @IsDateString()
  terminationDate?: string;
}
