import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
@Injectable()
export class SmsService {
  constructor(private c: ConfigService) {}
  async sendOtp(mobile: string, otp: string) {
    const url = this.c.get('SMS_API_URL');
    if (!url) { Logger.warn(`DEV MODE: OTP for ${mobile} is ${otp}`); return; }   // no gateway configured
    // Adjust body/headers to your provider (NIC SMS gateway etc). Template must be DLT-registered.
    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.c.get('SMS_API_KEY')}` },
      body: JSON.stringify({ to: mobile, sender: this.c.get('SMS_SENDER_ID'), templateId: this.c.get('SMS_DLT_TEMPLATE_ID'), vars: { otp } }) });
  }
}
