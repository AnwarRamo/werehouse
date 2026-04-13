import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class PayrollListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(['draft', 'queued', 'processing', 'completed', 'approved', 'failed'])
  status?: string;

  @IsOptional()
  @IsString()
  @IsIn(['pending', 'approved', 'rejected'])
  approvalStatus?: string;
}
