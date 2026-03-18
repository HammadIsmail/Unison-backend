export declare class SendOtpDto {
    email: string;
    type: 'email_verification' | 'forgot_password';
}
export declare class VerifyOtpDto {
    email: string;
    otp: string;
    type: 'email_verification' | 'forgot_password';
}
export declare class RegisterDto {
    verified_token: string;
    name: string;
    email: string;
    password: string;
    role: 'alumni' | 'student';
    roll_number: string;
    degree: string;
    graduation_year?: number;
    semester?: number;
}
export declare class LoginDto {
    email: string;
    password: string;
}
export declare class ResetPasswordDto {
    verified_token: string;
    new_password: string;
}
