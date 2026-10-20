import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from '../common/strategies/jwt.strategy';
import { NotificationModule } from '../notification/notification.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { UserAuth, UserAuthSchema } from './schemas/user-auth.schema';
import { OTPRecord, OTPSchema } from './schemas/otp.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: UserAuth.name, schema: UserAuthSchema },
            { name: OTPRecord.name, schema: OTPSchema },
        ]),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                secret: config.get<string>('JWT_SECRET')!,
                signOptions: { expiresIn: (config.get<string>('JWT_EXPIRES_IN') || '7d') as any },
            }),
        }),
        forwardRef(() => NotificationModule),
        CloudinaryModule,
    ],
    controllers: [AuthController],
    providers: [AuthService, JwtStrategy],
    exports: [JwtModule, PassportModule],
})
export class AuthModule { }
