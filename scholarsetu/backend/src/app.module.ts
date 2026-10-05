import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { OtpService } from './auth/otp.service';
import { JwtGuard } from './auth/jwt.guard';
import { User } from './auth/user.entity';
import { DigiLockerAdapter } from './adapters/digilocker.adapter';
import { SmsService } from './sms/sms.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),           // reads .env
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }]), // basic rate limit
    TypeOrmModule.forRootAsync({                         // CONNECT DATABASE #1 (PostgreSQL)
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({ type: 'postgres', url: c.getOrThrow('DATABASE_URL'), entities: [User] }),
    }),
    TypeOrmModule.forFeature([User]),
    JwtModule.registerAsync({ global: true, inject: [ConfigService],
      useFactory: (c: ConfigService) => ({ secret: c.getOrThrow('JWT_SECRET'), signOptions: { expiresIn: '15m' } }) }),
  ],
  controllers: [AuthController],
  providers: [AuthService, OtpService, SmsService, DigiLockerAdapter, JwtGuard,
    { provide: 'REDIS', inject: [ConfigService], useFactory: (c: ConfigService) => new Redis(c.getOrThrow('REDIS_URL')) }], // DATABASE #2 (Redis)
})
export class AppModule {}
