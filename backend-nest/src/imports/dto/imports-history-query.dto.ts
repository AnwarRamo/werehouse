import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ImportsHistoryQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(['employees', 'products'])
  entity?: string;

  @IsOptional()
  @IsString()
  @IsIn(['pending', 'queued', 'processing', 'completed', 'partial', 'failed'])
  status?: string;
}
