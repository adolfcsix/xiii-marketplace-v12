import { createHash, randomUUID } from 'node:crypto';
import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from './user.schema';
import { LoginDto, RegisterDto } from './auth.dto';
import { RealtimePublisher } from '../notifications/realtime-publisher.service';
@Injectable()
export class AuthService {
    constructor(
    @InjectModel(User.name)
    private readonly users: Model<User>, private readonly jwt: JwtService, private readonly realtime: RealtimePublisher) { }
    async register(dto: RegisterDto) {
        const email = dto.email.toLowerCase().trim();
        const phone = dto.phone?.trim() || undefined;
        if (await this.users.exists({ email }))
            throw new ConflictException('EMAIL_EXISTS');
        if (phone && await this.users.exists({ phone }))
            throw new ConflictException('PHONE_EXISTS');
        let user: UserDocument;
        try {
          user = await this.users.create({
            email, phone, fullName: dto.fullName.trim(), passwordHash: await bcrypt.hash(dto.password, 12), roles: ['BUYER'], status: 'ACTIVE'
          });
        } catch (error) {
          if ((error as any)?.code === 11000) {
            if ((error as any)?.keyPattern?.email) throw new ConflictException('EMAIL_EXISTS');
            if ((error as any)?.keyPattern?.phone) throw new ConflictException('PHONE_EXISTS');
          }
          throw error;
        }
        return this.issueTokens(user as UserDocument);
    }
    async login(dto: LoginDto) {
        const user = await this.users.findOne({ email: dto.email.toLowerCase().trim() });
        if (!user || !(await bcrypt.compare(dto.password, user.passwordHash)))
            throw new UnauthorizedException('INVALID_CREDENTIALS');
        if (user.status !== 'ACTIVE')
            throw new UnauthorizedException('ACCOUNT_NOT_ACTIVE');
        user.lastLoginAt = new Date();
        await user.save();
        return this.issueTokens(user as UserDocument);
    }
    async refresh(refreshToken: string) {
        let payload: any;
        try {
            payload = await this.jwt.verifyAsync(refreshToken, { secret: process.env.JWT_REFRESH_SECRET || 'dev-refresh' });
        }
        catch {
            throw new UnauthorizedException('INVALID_REFRESH_TOKEN');
        }
        const user = await this.users.findById(payload.sub);
        if (!user?.refreshTokenHash?.startsWith('sha256:') || !(await bcrypt.compare(createHash('sha256').update(refreshToken).digest('hex'), user.refreshTokenHash.replace(/^sha256:/, ''))))
            throw new UnauthorizedException('INVALID_REFRESH_TOKEN');
        if (user.status !== 'ACTIVE')
            throw new UnauthorizedException('ACCOUNT_NOT_ACTIVE');
        return this.issueTokens(user as UserDocument, user.refreshTokenHash);
    }
    async logout(userId: string) {
        await this.users.updateOne({ _id: userId }, { $unset: { refreshTokenHash: 1 } });
        this.realtime.disconnectUser(userId);
        return { loggedOut: true };
    }
    private async issueTokens(user: UserDocument, expectedRefreshHash?: string) {
        const payload = { sub: user._id.toString(), email: user.email, roles: user.roles, name: user.fullName };
        const accessToken = await this.jwt.signAsync(payload, { secret: process.env.JWT_ACCESS_SECRET || 'dev-access', expiresIn: '15m' });
        const refreshToken = await this.jwt.signAsync({ ...payload, jti: randomUUID() }, { secret: process.env.JWT_REFRESH_SECRET || 'dev-refresh', expiresIn: '30d' });
        const refreshTokenHash = 'sha256:' + await bcrypt.hash(createHash('sha256').update(refreshToken).digest('hex'), 10);
        const filter = { _id: user._id, status: 'ACTIVE', ...(expectedRefreshHash ? { refreshTokenHash: expectedRefreshHash } : {}) };
        const updated = await this.users.updateOne(filter, { $set: { refreshTokenHash } });
        if (updated.matchedCount !== 1) throw new UnauthorizedException('INVALID_REFRESH_TOKEN');
        return {
            user: { id: payload.sub, email: user.email, phone: user.phone, fullName: user.fullName, avatar: user.avatar, roles: user.roles, status: user.status },
            accessToken, refreshToken
        };
    }
}

