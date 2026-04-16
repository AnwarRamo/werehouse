import { IsNotEmpty, IsString } from 'class-validator';

export class BiometricLoginStartDto {
  @IsString()
  @IsNotEmpty()
  username: string;
}
