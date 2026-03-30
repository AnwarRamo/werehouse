import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class AdjustStockDto {
  @IsString()
  @IsNotEmpty()
  sku: string;

  @IsString()
  @IsNotEmpty()
  location: string;

  @IsNumber()
  change: number;

  @IsString()
  reason: string;
}
