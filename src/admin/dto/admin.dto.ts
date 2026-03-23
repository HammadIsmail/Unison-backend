import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum UserRole {
  ALUMNI = 'alumni',
  STUDENT = 'student',
}

export class RejectAccountDto {
  @ApiProperty({ description: 'Reason for rejecting the account registration', example: 'Invalid roll number provided.' })
  @IsString()
  @IsNotEmpty()
  rejection_reason: string;
}

