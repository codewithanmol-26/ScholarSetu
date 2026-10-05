import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import Redis from 'ioredis';

// OAuth2 authorization-code flow. Check exact URLs and response fields in your DigiLocker partner documentation.
@Injectable()
export class DigiLockerAdapter {
  name = 'digilocker';
  constructor(private c: ConfigService, @Inject('REDIS') private r: Redis) {}
  async authUrl() {
    const state = randomBytes(16).toString('hex');
    await this.r.set(`dlstate:${state}`, 1, 'EX', 600);            // protects against forged callbacks
    const q = new URLSearchParams({ response_type: 'code', client_id: this.c.getOrThrow('DL_CLIENT_ID'),
      redirect_uri: this.c.getOrThrow('DL_REDIRECT_URI'), state });
    return `${this.c.getOrThrow('DL_AUTH_URL')}?${q}`;
  }
  async exchange(code: string, state: string) {
    if (!(await this.r.del(`dlstate:${state}`))) throw new UnauthorizedException('Invalid state');
    const res = await fetch(this.c.getOrThrow('DL_TOKEN_URL'), { method: 'POST', body: new URLSearchParams({
      grant_type: 'authorization_code', code, client_id: this.c.getOrThrow('DL_CLIENT_ID'),
      client_secret: this.c.getOrThrow('DL_CLIENT_SECRET'), redirect_uri: this.c.getOrThrow('DL_REDIRECT_URI') }) });
    const t: any = await res.json();
    if (!t.access_token) throw new UnauthorizedException('DigiLocker login failed');
    return { id: t.digilockerid as string, accessToken: t.access_token as string };
  }
}
