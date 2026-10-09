import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) { }
    canActivate(context: ExecutionContext): boolean {
        const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);
        if (!required?.length)
            return true;
        const user = context.switchToHttp().getRequest().user as {
            roles?: string[];
        } | undefined;
        if (!user)
            throw new ForbiddenException('AUTH_REQUIRED');
        if (!required.some((role) => user.roles?.includes(role)))
            throw new ForbiddenException('INSUFFICIENT_ROLE');
        return true;
    }
}

