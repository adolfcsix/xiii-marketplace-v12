import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RefreshDto, RegisterDto } from './auth.dto';
import { JwtGuard } from './jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtUser } from '../common/auth.types';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator';
@Controller('auth')
export class AuthController {
    constructor(private readonly auth: AuthService) { }
    @Post('register')
    @RateLimit(8, 60)
    register(
    @Body()
    dto: RegisterDto) { return this.auth.register(dto); }
    @Post('login')
    @RateLimit(10, 60)
    login(
    @Body()
    dto: LoginDto) { return this.auth.login(dto); }
    @Post('refresh')
    @RateLimit(30, 60)
    refresh(
    @Body()
    dto: RefreshDto) { return this.auth.refresh(dto.refreshToken); }
    @UseGuards(JwtGuard)
    @Post('logout')
    logout(
    @CurrentUser()
    user: JwtUser) { return this.auth.logout(user.sub); }
}

