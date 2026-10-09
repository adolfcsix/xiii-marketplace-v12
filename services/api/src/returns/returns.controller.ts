import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtUser } from '../common/auth.types';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateDisputeDto, CreateReturnDto, FailRefundDto, ListDisputesDto, ListRefundsDto, ListReturnsDto, ProcessRefundDto, ResolveDisputeDto, ReturnShipmentDto, SellerDecisionDto, SellerRejectDto } from './returns.dto';
import { ReturnsService } from './returns.service';
import { ShopPermissions, AdminPermissions } from '../access-control/access.decorators';
import { ShopPermissionsGuard, AdminPermissionsGuard } from '../access-control/access.guards';

@Controller('returns')
@UseGuards(JwtGuard)
export class BuyerReturnsController {
  constructor(private readonly service: ReturnsService) {}
  @Get() list(@CurrentUser() u: JwtUser, @Query() q: ListReturnsDto) { return this.service.listBuyer(u.sub, q); }
  @Get('eligible/:subOrderCode') eligible(@CurrentUser() u: JwtUser, @Param('subOrderCode') code: string) { return this.service.eligibility(u.sub, code); }
  @Get(':requestCode') get(@CurrentUser() u: JwtUser, @Param('requestCode') code: string) { return this.service.getBuyer(u.sub, code); }
  @Post() create(@CurrentUser() u: JwtUser, @Body() dto: CreateReturnDto) { return this.service.createReturn(u.sub, dto); }
  @Post(':requestCode/shipment') shipment(@CurrentUser() u: JwtUser, @Param('requestCode') code: string, @Body() dto: ReturnShipmentDto) { return this.service.submitShipment(u.sub, code, dto); }
  @Post(':requestCode/dispute') dispute(@CurrentUser() u: JwtUser, @Param('requestCode') code: string, @Body() dto: CreateDisputeDto) { return this.service.openDispute(u.sub, code, dto); }
}

@Controller('seller/returns')
@UseGuards(JwtGuard, RolesGuard, ShopPermissionsGuard)
@Roles('SELLER','ADMIN','SUPER_ADMIN')
@ShopPermissions('RETURN_MANAGE')
export class SellerReturnsController {
  constructor(private readonly service: ReturnsService) {}
  @Get() list(@CurrentUser() u: JwtUser, @Query() q: ListReturnsDto) { return this.service.listSeller(u.sub, q); }
  @Get(':requestCode') get(@CurrentUser() u: JwtUser, @Param('requestCode') code: string) { return this.service.getSeller(u.sub, code); }
  @Post(':requestCode/approve') approve(@CurrentUser() u: JwtUser, @Param('requestCode') code: string, @Body() dto: SellerDecisionDto) { return this.service.sellerApprove(u.sub, code, dto); }
  @Post(':requestCode/reject') reject(@CurrentUser() u: JwtUser, @Param('requestCode') code: string, @Body() dto: SellerRejectDto) { return this.service.sellerReject(u.sub, code, dto); }
  @Post(':requestCode/received') received(@CurrentUser() u: JwtUser, @Param('requestCode') code: string, @Body() dto: SellerDecisionDto) { return this.service.sellerReceived(u.sub, code, dto); }
}

@Controller('admin/after-sales')
@UseGuards(JwtGuard, RolesGuard, AdminPermissionsGuard)
@Roles('ADMIN','SUPER_ADMIN')
@AdminPermissions('RETURNS_MANAGE')
export class AdminAfterSalesController {
  constructor(private readonly service: ReturnsService) {}
  @Get('summary') summary() { return this.service.adminSummary(); }
  @Get('disputes') disputes(@Query() q: ListDisputesDto) { return this.service.listDisputes(q); }
  @Get('disputes/:disputeCode') dispute(@Param('disputeCode') code: string) { return this.service.getDispute(code); }
  @Post('disputes/:disputeCode/resolve') resolve(@CurrentUser() u: JwtUser, @Param('disputeCode') code: string, @Body() dto: ResolveDisputeDto) { return this.service.resolveDispute(u.sub, code, dto); }
  @Get('refunds') refunds(@Query() q: ListRefundsDto) { return this.service.listRefunds(q); }
  @Post('refunds/:refundCode/start') startRefund(@CurrentUser() u: JwtUser, @Param('refundCode') code: string) { return this.service.startRefund(u.sub, code); }
  @Post('refunds/:refundCode/confirm') confirmRefund(@CurrentUser() u: JwtUser, @Param('refundCode') code: string, @Body() dto: ProcessRefundDto) { return this.service.confirmRefund(u.sub, code, dto); }
  @Post('refunds/:refundCode/fail') failRefund(@CurrentUser() u: JwtUser, @Param('refundCode') code: string, @Body() dto: FailRefundDto) { return this.service.failRefund(u.sub, code, dto); }
}
