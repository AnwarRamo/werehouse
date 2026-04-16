import { IsNotEmpty, IsString } from 'class-validator';

export class BiometricLoginFinishDto {
  @IsString()
  @IsNotEmpty()
  challengeId: string;

  @IsString()
  @IsNotEmpty()
  challengeBase64: string;

  @IsString()
  @IsNotEmpty()
  keyId: string;

  @IsString()
  @IsNotEmpty()
  signatureBase64: string;
}
