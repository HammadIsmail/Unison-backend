import { Body, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import {
    LoginDto,
    RegisterDto,
    ResetPasswordDto,
    SendOtpDto,
    VerifyOtpDto,
} from './dto/auth.dto';
import {
    LoginResponseDto,
    MessageResponseDto,
    OtpResponseDto,
    VerifyOtpResponseDto,
} from './dto/auth-response.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('send-otp')
    @ApiOperation({ summary: 'Send OTP to email for verification or forgot password' })
    @ApiResponse({ status: 201, type: OtpResponseDto })
    sendOtp(@Body() dto: SendOtpDto) {
        return this.authService.sendOtp(dto);
    }

    @Post('verify-otp')
    @ApiOperation({ summary: 'Verify OTP and receive a short-lived verified_token' })
    @ApiResponse({ status: 201, type: VerifyOtpResponseDto })
    verifyOtp(@Body() dto: VerifyOtpDto) {
        return this.authService.verifyOtp(dto);
    }

    @Post('register')
    @UseInterceptors(FileInterceptor('student_card'))
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Register a new alumni or student account' })
    @ApiResponse({ status: 201, type: MessageResponseDto })
    register(
        @Body() dto: RegisterDto,
        @UploadedFile() file: Express.Multer.File
    ) {
        return this.authService.register(dto, file);
    }

    @Post('login')
    @ApiOperation({ summary: 'Login and receive a JWT token' })
    @ApiResponse({ status: 201, type: LoginResponseDto })
    login(@Body() dto: LoginDto) {
        return this.authService.login(dto);
    }

    @Post('reset-password')
    @ApiOperation({ summary: 'Reset password using verified_token from OTP step' })
    @ApiResponse({ status: 201, type: MessageResponseDto })
    resetPassword(@Body() dto: ResetPasswordDto) {
        return this.authService.resetPassword(dto);
    }
}
