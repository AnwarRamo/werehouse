import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  sku: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsNumber()
  unitPrice: number;

  @IsNumber()
  costPrice: number;

  @IsOptional()
  @IsNumber()
  reorderLevel?: number;
}
