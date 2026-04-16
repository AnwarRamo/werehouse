import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class BiometricRegisterStartDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  keyId: string;

  @IsString()
  @IsNotEmpty()
  publicKeyBase64: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  deviceName?: string;
}
