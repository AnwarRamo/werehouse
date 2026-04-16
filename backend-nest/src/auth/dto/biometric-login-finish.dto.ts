import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

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

  @IsOptional()
  @IsBoolean()
  markAttendance?: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^EMP[0-9]{3,}$/)
  employeeId?: string;

  @IsOptional()
  @IsString()
  @IsIn(['IN', 'OUT'])
  attendanceType?: 'IN' | 'OUT';

  @IsOptional()
  @IsString()
  attendanceDeviceId?: string;

  @IsOptional()
  @IsString()
  attendanceLocation?: string;

  @IsOptional()
  @IsString()
  attendanceNotes?: string;
}
