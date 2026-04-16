import { IsNotEmpty, IsString } from 'class-validator';

export class BiometricRegisterFinishDto {
  @IsString()
  @IsNotEmpty()
  challengeId: string;

  @IsString()
  @IsNotEmpty()
  challengeBase64: string;

  @IsString()
  @IsNotEmpty()
  signatureBase64: string;
}
