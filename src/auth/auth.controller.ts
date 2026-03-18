import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
    LoginDto,
    RegisterDto,
    ResetPasswordDto,
    SendOtpDto,
    VerifyOtpDto,
} from './dto/auth.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('send-otp')
    @ApiOperation({ summary: 'Send OTP to email for verification or forgot password' })
    sendOtp(@Body() dto: SendOtpDto) {
        return this.authService.sendOtp(dto);
    }

    @Post('verify-otp')
    @ApiOperation({ summary: 'Verify OTP and receive a short-lived verified_token' })
    verifyOtp(@Body() dto: VerifyOtpDto) {
        return this.authService.verifyOtp(dto);
    }

    @Post('register')
    @ApiOperation({ summary: 'Register a new alumni or student account' })
    register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }

    @Post('login')
    @ApiOperation({ summary: 'Login and receive a JWT token' })
    login(@Body() dto: LoginDto) {
        return this.authService.login(dto);
    }

    @Post('reset-password')
    @ApiOperation({ summary: 'Reset password using verified_token from OTP step' })
    resetPassword(@Body() dto: ResetPasswordDto) {
        return this.authService.resetPassword(dto);
    }
}
