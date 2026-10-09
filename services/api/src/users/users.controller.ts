import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtUser } from '../common/auth.types';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { AddressDto, UpdateMeDto } from './users.dto';
import { UsersService } from './users.service';
import { Types } from 'mongoose';
@Controller('users/me')
@UseGuards(JwtGuard)
export class UsersController {
    constructor(private readonly users: UsersService) { }
    @Get()
    me(
    @CurrentUser()
    u: JwtUser) { return this.users.me(u.sub); }
    @Patch()
    update(
    @CurrentUser()
    u: JwtUser, 
    @Body()
    dto: UpdateMeDto) { return this.users.updateMe(u.sub, dto); }
    @Get('addresses')
    addresses(
    @CurrentUser()
    u: JwtUser) { return this.users.listAddresses(u.sub); }
    @Post('addresses')
    createAddress(
    @CurrentUser()
    u: JwtUser, 
    @Body()
    dto: AddressDto) { return this.users.createAddress(u.sub, dto); }
    @Patch('addresses/:id')
    updateAddress(
    @CurrentUser()
    u: JwtUser, 
    @Param('id', ParseObjectIdPipe)
    id: Types.ObjectId, 
    @Body()
    dto: AddressDto) { return this.users.updateAddress(u.sub, id, dto); }
    @Delete('addresses/:id')
    deleteAddress(
    @CurrentUser()
    u: JwtUser, 
    @Param('id', ParseObjectIdPipe)
    id: Types.ObjectId) { return this.users.deleteAddress(u.sub, id); }
}

