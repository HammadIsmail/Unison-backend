import {
    IsEmail,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    MinLength,
    MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

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


    @ApiProperty({ example: 'ahmed_h', maxLength: 20 })
    @IsString()
    @IsNotEmpty()
    @MaxLength(20)
    username: string;

    @ApiProperty({ example: 'Ahmed The Dev', maxLength: 25 })
    @IsString()
    @IsNotEmpty()
    @MaxLength(25)
    display_name: string;

    @ApiProperty({ example: 'ahmed@uet.edu.pk' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'StrongPassword123', maxLength: 50 })
    @IsString()
    @MinLength(8)
    @MaxLength(50)
    password: string;

    @ApiProperty({ enum: ['alumni', 'student', 'partner'], example: 'alumni' })
    @IsEnum(['alumni', 'student', 'partner'])
    role: 'alumni' | 'student' | 'partner';

    @ApiPropertyOptional({ example: '2021-CS-101' })
    @IsOptional()
    @IsString()
    roll_number?: string;

    @ApiPropertyOptional({ example: 'BS Computer Science' })
    @IsOptional()
    @IsString()
    degree?: string;

    @ApiProperty({ type: 'string', format: 'binary', description: 'Student card image file', required: true })
    @IsOptional()
    student_card: any;

    @ApiPropertyOptional({ description: 'Alumni only', example: 2025 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    graduation_year?: number;

    @ApiPropertyOptional({ description: 'Student only', example: 6 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    semester?: number;

    @ApiPropertyOptional({ description: 'Batch year (e.g., 2021)', example: '2021' })
    @IsOptional()
    @IsString()
    batch?: string;

    @ApiPropertyOptional({ example: 'Google' })
    @IsOptional()
    @IsString()
    affiliation?: string;

    @ApiPropertyOptional({ example: 'Talent Acquisition' })
    @IsOptional()
    @IsString()
    job_title?: string;
}

export class LoginDto {
    @ApiProperty({ example: 'ahmed@uet.edu.pk' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'StrongPassword123', maxLength: 50 })
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    password: string;
}

export class ResetPasswordDto {
    @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
    @IsString()
    @IsNotEmpty()
    verified_token: string;

    @ApiProperty({ example: 'NewStrongPassword456', maxLength: 50 })
    @IsString()
    @MinLength(8)
    @MaxLength(50)
    new_password: string;
}
