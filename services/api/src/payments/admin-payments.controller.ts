import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AdminPermissions } from '../access-control/access.decorators';
import { AdminPermissionsGuard } from '../access-control/access.guards';
import { PaymentsService } from './payments.service';
@Controller('admin/payments')
@UseGuards(JwtGuard,RolesGuard,AdminPermissionsGuard) @Roles('ADMIN','SUPER_ADMIN')
export class AdminPaymentsController{
  constructor(private payments:PaymentsService){}
  @Get() @AdminPermissions('PAYMENTS_MANAGE') list(@Query()q:any){return this.payments.listForAdmin(q);}
  @Get(':paymentCode') @AdminPermissions('PAYMENTS_MANAGE') get(@Param('paymentCode')code:string){return this.payments.getForAdmin(code);}
  @Post('maintenance/expire-due') @AdminPermissions('PAYMENTS_MANAGE') expire(){return this.payments.expirePendingPayments();}
}
