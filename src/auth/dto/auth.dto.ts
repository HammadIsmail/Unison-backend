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
    @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
    @IsString()
    @IsNotEmpty()
    verified_token: string;

    @ApiProperty({ example: 'Ahmed Hassan' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ example: 'ahmed_h' })
    @IsString()
    @IsNotEmpty()
    username: string;

    @ApiPropertyOptional({ example: 'Ahmed The Dev' })
    @IsString()
    @IsOptional()
    display_name?: string;

    @ApiProperty({ example: 'ahmed@uet.edu.pk' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'StrongPassword123' })
    @IsString()
    @MinLength(8)
    password: string;

    @ApiProperty({ enum: ['alumni', 'student'], example: 'alumni' })
    @IsEnum(['alumni', 'student'])
    role: 'alumni' | 'student';

    @ApiProperty({ example: '2021-CS-101' })
    @IsString()
    @IsNotEmpty()
    roll_number: string;

    @ApiProperty({ example: 'BS Computer Science' })
    @IsString()
    @IsNotEmpty()
    degree: string;

    @ApiPropertyOptional({ description: 'Alumni only', example: 2025 })
    @IsOptional()
    @IsInt()
    graduation_year?: number;

    @ApiPropertyOptional({ description: 'Student only', example: 6 })
    @IsOptional()
    @IsInt()
    semester?: number;
}

export class LoginDto {
    @ApiProperty({ example: 'ahmed@uet.edu.pk' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'StrongPassword123' })
    @IsString()
    @IsNotEmpty()
    password: string;
}

export class ResetPasswordDto {
    @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
    @IsString()
    @IsNotEmpty()
    verified_token: string;

    @ApiProperty({ example: 'NewStrongPassword456' })
    @IsString()
    @MinLength(8)
    new_password: string;
}
