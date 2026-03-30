import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class ReserveStockDto {
  @IsString()
  @IsNotEmpty()
  sku: string;

  @IsString()
  @IsNotEmpty()
  location: string;

  @IsNumber()
  quantity: number;

  @IsString()
  reason: string;
}
