import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class EmployeesListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  department?: string;

  @IsOptional()
  @IsString()
  @IsIn(['active', 'inactive', 'terminated'])
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}
