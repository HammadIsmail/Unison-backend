import { IsString, IsNotEmpty, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectAccountDto {
  @ApiProperty({ description: 'Reason for rejecting the account registration', example: 'Invalid roll number provided.' })
  @IsString()
  @IsNotEmpty()
  rejection_reason: string;
}

export class RequestEmailChangeDto {
  @ApiProperty({ example: 'new-email@admin.unison.pk' })
  @IsNotEmpty()
  @IsEmail()
  new_email: string;
}

export class VerifyEmailChangeDto {
  @ApiProperty({ example: 'new-email@admin.unison.pk' })
  @IsNotEmpty()
  @IsEmail()
  new_email: string;

  @ApiProperty({ example: '123456' })
  @IsNotEmpty()
  @IsString()
  otp: string;
}
