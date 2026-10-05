import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private jwt: JwtService) {}
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const t = (req.headers.authorization || '').replace('Bearer ', '');
    try { req.user = this.jwt.verify(t); return true; } catch { throw new UnauthorizedException(); }
  }
}
