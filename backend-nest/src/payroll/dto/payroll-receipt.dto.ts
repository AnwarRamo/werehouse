import { ArrayMinSize, IsArray, IsBoolean, IsDateString, IsOptional, IsString, Matches } from 'class-validator';

const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

export class PayrollReceiptsQueryDto {
  @Matches(MONTH_REGEX, { message: 'month must be in YYYY-MM format' })
  month: string;

  @IsOptional()
  @IsString()
  employeeId?: string;
}

export class UpsertPayrollReceiptDto {
  @Matches(MONTH_REGEX, { message: 'month must be in YYYY-MM format' })
  month: string;

  @IsBoolean()
  isReceived: boolean;

  @IsOptional()
  @IsDateString()
  receivedAt?: string;
}

export class BulkUpsertPayrollReceiptsDto extends UpsertPayrollReceiptDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  employeeIds: string[];
}
