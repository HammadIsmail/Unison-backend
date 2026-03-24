import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MessageResponseDto {
    @ApiProperty({ example: 'Operation successful.' })
    message: string;
}

export class OtpResponseDto {
    @ApiProperty({ example: 'Operation successful.' })
    message: string;

    @ApiProperty({ example: '10 minutes' })
    otp_expires_in: string;
}

export class VerifyOtpResponseDto {
    @ApiProperty({ example: 'Operation successful.' })
    message: string;

    @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
    verified_token: string;
}

export class UserProfileDto {
    @ApiProperty({ example: 'uuid-user-123' })
    id: string;


    @ApiProperty({ example: 'ahmed_h' })
    username: string;

    @ApiProperty({ example: 'Ahmed The Dev' })
    display_name: string;

    @ApiProperty({ example: 'ahmed@uet.edu.pk' })
    email: string;

    @ApiProperty({ example: 'alumni' })
    role: string;

    @ApiProperty({ example: 'BS Computer Science' })
    degree: string;

    @ApiProperty({ example: '2021-CS-101' })
    roll_number: string;

    @ApiPropertyOptional({ example: '2021-2025' })
    batch?: string;

    @ApiPropertyOptional({ example: 2025 })
    graduation_year?: number;

    @ApiPropertyOptional({ example: 6 })
    semester?: number;

    @ApiPropertyOptional({ example: '+923001234567' })
    phone?: string;
}

export class LoginResponseDto {
    @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
    token: string;

    @ApiProperty({ example: 'alumni' })
    role: string;

    @ApiProperty({ example: 'approved' })
    account_status: string;

    @ApiProperty({ type: UserProfileDto })
    profile: UserProfileDto;
}
