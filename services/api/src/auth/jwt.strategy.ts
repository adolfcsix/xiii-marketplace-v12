import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Model } from 'mongoose';
import { User } from './user.schema';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@InjectModel(User.name) private readonly users: Model<User>) {
    super({ jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), ignoreExpiration: false, secretOrKey: process.env.JWT_ACCESS_SECRET || 'dev-access' });
  }
  async validate(payload: any) {
    const user = await this.users.findById(payload.sub).select({ email: 1, fullName: 1, roles: 1, status: 1 }).lean<any>();
    if (!user || user.status !== 'ACTIVE') throw new UnauthorizedException('ACCOUNT_NOT_ACTIVE');
    return { sub: user._id.toString(), email: user.email, roles: user.roles ?? ['BUYER'], name: user.fullName };
  }
}
