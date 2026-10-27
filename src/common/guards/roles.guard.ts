import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    let req: any;
    const contextType = context.getType<string>();
    if (contextType === 'http') {
      req = context.switchToHttp().getRequest();
    } else if (contextType === 'graphql') {
      req = GqlExecutionContext.create(context).getContext()?.req;
    }

    const user = req?.user;
    if (!user || (!requiredRoles.includes(user.role) && user.role !== 'super_admin')) {
      throw new ForbiddenException('You do not have permission to access this resource.');
    }

    // Tenant admin guard constraint: must have a valid tenantId
    if (user.role === 'admin' && !user.tenantId) {
      throw new ForbiddenException('Tenant context missing.');
    }

    return true;
  }
}
