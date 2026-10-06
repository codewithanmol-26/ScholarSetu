import { Body, Controller, Get, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { DigiLockerAdapter } from '../adapters/digilocker.adapter';
import { AuthService } from './auth.service';
import { JwtGuard } from './jwt.guard';
import { OtpService } from './otp.service';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService, private otp: OtpService, private dl: DigiLockerAdapter) {}

  // 1) OTP login
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('otp/send') async send(@Body('mobile') mobile: string) { await this.otp.send(mobile); return { sent: true }; }
  @Post('otp/verify') async verify(@Body() b: { mobile: string; otp: string }) {
    await this.otp.verify(b.mobile, b.otp); return this.auth.loginByMobile(b.mobile);
  }
  // 2) Password login
  @Post('password/register') register(@Body() b: { mobile: string; password: string }) { return this.auth.register(b.mobile, b.password); }
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('password/login') login(@Body() b: { mobile: string; password: string }) { return this.auth.loginPassword(b.mobile, b.password); }
  // 3) DigiLocker login
  @Get('digilocker/start') async start(@Res() res) { res.redirect(await this.dl.authUrl()); }
  @Get('digilocker/callback') async cb(@Query('code') code: string, @Query('state') state: string) {
    const p = await this.dl.exchange(code, state); return this.auth.loginByDigiLocker(p.id);
  }
  // protected example
  @UseGuards(JwtGuard) @Get('me') me(@Req() req) { return this.auth.me(req.user.sub); }
}
