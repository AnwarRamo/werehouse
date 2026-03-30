import { IsNotEmpty, IsNumber, IsOptional, IsString, Matches } from 'class-validator';

export class CreateDeviceDto {
  @IsString()
  @Matches(/^DEV[0-9]{3,}$/)
  deviceId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  location: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  ip?: string;

  @IsOptional()
  @IsNumber()
  port?: number;
}
