import { IsDateString, IsOptional, IsString, Matches } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class AttendanceListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @Matches(/^EMP[0-9]{3,}$/)
  employeeId?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
