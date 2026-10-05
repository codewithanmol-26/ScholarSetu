import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as argon2 from 'argon2';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class AuthService {
  constructor(@InjectRepository(User) private users: Repository<User>, private jwt: JwtService) {}
  private token(u: User) { return { accessToken: this.jwt.sign({ sub: u.id, role: u.role }), user: { id: u.id, role: u.role } }; }

  async loginByMobile(mobile: string) {            // used after OTP is verified
    const u = (await this.users.findOne({ where: { mobile } })) ?? (await this.users.save(this.users.create({ mobile })));
    return this.token(u);
  }
  async register(mobile: string, password: string) {
    if (!password || password.length < 8) throw new BadRequestException('Password needs at least 8 characters');
    if (await this.users.findOne({ where: { mobile } })) throw new ConflictException('Already registered');
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    return this.token(await this.users.save(this.users.create({ mobile, passwordHash })));
  }
  async loginPassword(mobile: string, password: string) {
    const u = await this.users.findOne({ where: { mobile } });
    if (!u?.passwordHash || !(await argon2.verify(u.passwordHash, password))) throw new UnauthorizedException('Wrong mobile or password');
    return this.token(u);
  }
  async loginByDigiLocker(digilockerId: string) {
    const u = (await this.users.findOne({ where: { digilockerId } })) ?? (await this.users.save(this.users.create({ digilockerId })));
    return this.token(u);
  }
  me(id: string) { return this.users.findOneByOrFail({ id }).then(({ passwordHash, ...safe }) => safe); }
}
