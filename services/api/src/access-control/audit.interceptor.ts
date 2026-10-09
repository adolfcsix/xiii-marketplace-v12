import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { Types } from 'mongoose';
import { AuditService } from './audit.service';
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private audit:AuditService){}
  intercept(ctx:ExecutionContext,next:CallHandler):Observable<any>{
    if(ctx.getType()!=='http')return next.handle();
    const req=ctx.switchToHttp().getRequest(); const res=ctx.switchToHttp().getResponse();
    if(!req.user?.sub || !['POST','PATCH','PUT','DELETE'].includes(req.method)) return next.handle();
    const started=Date.now();
    const write=(success:boolean,statusCode:number,errorCode?:string)=>this.audit.recordSafe({
      actorId:new Types.ObjectId(req.user.sub),actorEmail:req.user.email||'',actorRoles:req.user.roles||[],
      shopId:req.shopAccess?.shopId,action:`${req.method} ${req.route?.path||req.path}`,method:req.method,path:req.originalUrl||req.url,statusCode,success,
      resourceType:String(req.route?.path||'').split('/').filter(Boolean).slice(-2,-1)[0]||'',resourceId:String(req.params?.id||req.params?.code||req.params?.requestCode||req.params?.subOrderCode||''),
      ip:req.ip||'',userAgent:String(req.headers?.['user-agent']||''),metadata:{durationMs:Date.now()-started,queryKeys:Object.keys(req.query||{}),bodyKeys:Object.keys(req.body||{}),errorCode:errorCode||''}
    });
    return next.handle().pipe(tap(()=>{void write(true,res.statusCode||200);}),catchError(err=>{void write(false,err?.status||500,err?.response?.message||err?.message);return throwError(()=>err);}));
  }
}
