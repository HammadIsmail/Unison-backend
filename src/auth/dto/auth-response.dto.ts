import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SuccessResponseDto } from '../../common/dto/response.dto';

export { SuccessResponseDto };


export class OtpResponseDto {
    @ApiProperty({ example: 'OTP sent to your email.' })
    message: string;

    @ApiProperty({ example: '10 minutes' })
    otp_expires_in: string;
}

export class RateLimitResponseDto {
    @ApiProperty({ example: 'Please wait before requesting another OTP.' })
    message: string;

    @ApiProperty({ example: 47, description: 'Seconds to wait before retrying' })
    retry_after_seconds: number;
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

    @ApiProperty({ example: 5 })
    posts_count: number;
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
