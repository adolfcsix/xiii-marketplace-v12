import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { JwtUser } from '../common/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateWithdrawalDto, ListLedgerDto, ListWithdrawalsDto, MarkPaidWithdrawalDto, RejectWithdrawalDto, SavePayoutAccountDto, UpdateFinanceSettingsDto } from './finance.dto';
import { FinanceService } from './finance.service';
import { ShopPermissions, AdminPermissions } from '../access-control/access.decorators';
import { ShopPermissionsGuard, AdminPermissionsGuard } from '../access-control/access.guards';

@Controller('seller/finance')
@UseGuards(JwtGuard, RolesGuard, ShopPermissionsGuard)
@Roles('SELLER','ADMIN','SUPER_ADMIN')
export class SellerFinanceController {
  constructor(private readonly finance: FinanceService) {}
  @Get('summary') @ShopPermissions('FINANCE_VIEW') summary(@CurrentUser() u:JwtUser){return this.finance.sellerSummary(u.sub);}
  @Get('ledger') @ShopPermissions('FINANCE_VIEW') ledger(@CurrentUser() u:JwtUser,@Query() q:ListLedgerDto){return this.finance.listLedger(u.sub,q);}
  @Get('payout-account') @ShopPermissions('FINANCE_VIEW') payout(@CurrentUser() u:JwtUser){return this.finance.getPayoutAccount(u.sub);}
  @Patch('payout-account') @ShopPermissions('FINANCE_WITHDRAW') savePayout(@CurrentUser() u:JwtUser,@Body() d:SavePayoutAccountDto){return this.finance.savePayoutAccount(u.sub,d);}
  @Get('withdrawals') @ShopPermissions('FINANCE_VIEW') withdrawals(@CurrentUser() u:JwtUser,@Query() q:ListWithdrawalsDto){return this.finance.listWithdrawalsForSeller(u.sub,q);}
  @Post('withdrawals') @ShopPermissions('FINANCE_WITHDRAW') createWithdrawal(@CurrentUser() u:JwtUser,@Body() d:CreateWithdrawalDto){return this.finance.createWithdrawal(u.sub,d);}
  @Post('withdrawals/:code/cancel') @ShopPermissions('FINANCE_WITHDRAW') cancel(@CurrentUser() u:JwtUser,@Param('code') code:string){return this.finance.cancelWithdrawal(u.sub,code);}
}

@Controller('admin/finance')
@UseGuards(JwtGuard, RolesGuard, AdminPermissionsGuard)
@Roles('ADMIN','SUPER_ADMIN')
@AdminPermissions('FINANCE_MANAGE')
export class AdminFinanceController {
  constructor(private readonly finance: FinanceService) {}
  @Get('summary') summary(){return this.finance.adminSummary();}
  @Get('settings') settings(){return this.finance.getSettings();}
  @Patch('settings') updateSettings(@CurrentUser() u:JwtUser,@Body() d:UpdateFinanceSettingsDto){return this.finance.updateSettings(u.sub,d);}
  @Get('withdrawals') withdrawals(@Query() q:ListWithdrawalsDto){return this.finance.adminListWithdrawals(q);}
  @Get('withdrawals/:code') detail(@Param('code') code:string){return this.finance.adminWithdrawalDetail(code);}
  @Post('withdrawals/:code/approve') approve(@CurrentUser() u:JwtUser,@Param('code') code:string){return this.finance.approveWithdrawal(u.sub,code);}
  @Post('withdrawals/:code/process') process(@CurrentUser() u:JwtUser,@Param('code') code:string){return this.finance.processWithdrawal(u.sub,code);}
  @Post('withdrawals/:code/reject') reject(@CurrentUser() u:JwtUser,@Param('code') code:string,@Body() d:RejectWithdrawalDto){return this.finance.rejectWithdrawal(u.sub,code,d);}
  @Post('withdrawals/:code/paid') paid(@CurrentUser() u:JwtUser,@Param('code') code:string,@Body() d:MarkPaidWithdrawalDto){return this.finance.markWithdrawalPaid(u.sub,code,d);}
}
