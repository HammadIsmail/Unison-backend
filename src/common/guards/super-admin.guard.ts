import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    let req: any;
    const contextType = context.getType<string>();
    if (contextType === 'http') {
      req = context.switchToHttp().getRequest();
    } else if (contextType === 'graphql') {
      req = GqlExecutionContext.create(context).getContext()?.req;
    }

    const user = req?.user;
    if (!user || user.role !== 'super_admin') {
      throw new ForbiddenException('Access denied. Super admin privileges required.');
    }

    return true;
  }
}
