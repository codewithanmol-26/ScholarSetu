import { HttpException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import Redis from 'ioredis';
import { SmsService } from '../sms/sms.service';

@Injectable()
export class OtpService {
  constructor(@Inject('REDIS') private r: Redis, private sms: SmsService, private c: ConfigService) {}
  private hash(mobile: string, otp: string) {
    return createHmac('sha256', this.c.getOrThrow('OTP_PEPPER')).update(mobile + otp).digest('hex');
  }
  async send(mobile: string) {
    if (!/^[6-9]\d{9}$/.test(mobile)) throw new HttpException('Enter a valid 10-digit mobile number', 400);
    if (await this.r.get(`cool:${mobile}`)) throw new HttpException('Wait 30 seconds before asking again', 429);
    const otp = String(randomInt(100000, 1000000));
    await this.r.set(`otp:${mobile}`, this.hash(mobile, otp), 'EX', 300); // store only the hash, 5 min
    await this.r.set(`tries:${mobile}`, 0, 'EX', 300);
    await this.r.set(`cool:${mobile}`, 1, 'EX', 30);
    await this.sms.sendOtp(mobile, otp);
  }
  async verify(mobile: string, otp: string) {
    if ((await this.r.incr(`tries:${mobile}`)) > 3) throw new UnauthorizedException('Too many attempts. Ask for a new OTP.');
    const stored = await this.r.get(`otp:${mobile}`);
    const given = this.hash(mobile, otp || '');
    if (!stored || stored.length !== given.length || !timingSafeEqual(Buffer.from(stored), Buffer.from(given)))
      throw new UnauthorizedException('Wrong or expired OTP');
    await this.r.del(`otp:${mobile}`); // one-time use
  }
}
