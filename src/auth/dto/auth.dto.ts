import {
    IsEmail,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendOtpDto {
    @ApiProperty({ example: 'ahmed@uet.edu.pk' })
    @IsEmail()
    email: string;

    @ApiProperty({ enum: ['email_verification', 'forgot_password'] })
    @IsEnum(['email_verification', 'forgot_password'])
    type: 'email_verification' | 'forgot_password';
}

export class VerifyOtpDto {
    @ApiProperty({ example: 'ahmed@uet.edu.pk' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: '482910' })
    @IsString()
    @IsNotEmpty()
    otp: string;

    @ApiProperty({ enum: ['email_verification', 'forgot_password'] })
    @IsEnum(['email_verification', 'forgot_password'])
    type: 'email_verification' | 'forgot_password';
}

export class RegisterDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    verified_token: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty()
    @IsEmail()
    email: string;

    @ApiProperty()
    @IsString()
    @MinLength(8)
    password: string;

    @ApiProperty({ enum: ['alumni', 'student'] })
    @IsEnum(['alumni', 'student'])
    role: 'alumni' | 'student';

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    roll_number: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    degree: string;

    @ApiPropertyOptional({ description: 'Alumni only' })
    @IsOptional()
    @IsInt()
    graduation_year?: number;

    @ApiPropertyOptional({ description: 'Student only' })
    @IsOptional()
    @IsInt()
    semester?: number;
}

export class LoginDto {
    @ApiProperty()
    @IsEmail()
    email: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    password: string;
}

export class ResetPasswordDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    verified_token: string;

    @ApiProperty()
    @IsString()
    @MinLength(8)
    new_password: string;
}
