import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { GqlExecutionContext } from '@nestjs/graphql';
import { TenantsService } from '../../tenants/tenants.service';

@Injectable()
export class TenantContextGuard implements CanActivate {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly cls: ClsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    let req: any;
    const contextType = context.getType<string>();

    if (contextType === 'http') {
      req = context.switchToHttp().getRequest();
    } else if (contextType === 'graphql') {
      const gqlCtx = GqlExecutionContext.create(context);
      req = gqlCtx.getContext()?.req;
    } else {
      return true;
    }

    if (!req) {
      return true;
    }

    const user = req.user;
    if (!user) {
      // Public route or unauthenticated
      return true;
    }

    if (user.role === 'super_admin') {
      // Super admin operates globally without a tenant context
      this.cls.set('isSuperAdmin', true);
      this.cls.set('skipTenantScope', true);
      this.cls.set('userRole', 'super_admin');
      if (user.sub) this.cls.set('userId', user.sub);
      return true;
    }

    if (!user.tenantId) {
      throw new UnauthorizedException('Session outdated. Please log in again.');
    }

    // Validate tenant is active (cached, TTL ~60s). Throws 403 if suspended, 401 if missing.
    await this.tenantsService.getActiveTenantOrThrow(user.tenantId);

    // Set tenantId in CLS async local storage
    this.cls.set('tenantId', user.tenantId);

    return true;
  }
}
