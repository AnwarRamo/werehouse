import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class BiometricRevokeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  keyId: string;
}
