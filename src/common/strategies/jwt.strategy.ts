import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ClsService } from 'nestjs-cls';
import { Neo4jService } from '../../neo4j/neo4j.service';
import { UserAuth } from '../../auth/schemas/user-auth.schema';
import { TenantsService } from '../../tenants/tenants.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  tenantId?: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly neo4j: Neo4jService,
    private readonly cls: ClsService,
    private readonly tenantsService: TenantsService,
    @InjectModel(UserAuth.name)
    private readonly userAuthModel: Model<UserAuth>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        ExtractJwt.fromUrlQueryParameter('token'),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET')!,
    });
  }

  async validate(payload: JwtPayload) {
    // 1. Super admin has no tenant and no Neo4j node
    if (payload.role === 'super_admin') {
      const auth = await this.userAuthModel
        .findOne({ userId: payload.sub, role: 'super_admin', is_deleted: { $ne: true } })
        .setOptions({ skipTenantScope: true })
        .exec();

      if (!auth || auth.account_status !== 'approved') {
        throw new UnauthorizedException('User not found or token invalid.');
      }

      return {
        sub: auth.userId,
        email: auth.email,
        role: 'super_admin',
        name: 'Super Admin',
        tenantId: null,
      };
    }

    // 2. Non-super-admin tokens MUST carry tenantId (fail closed on old/missing tenantId)
    if (!payload.tenantId) {
      throw new UnauthorizedException('Session outdated. Please log in again.');
    }

    // 3. Verify tenant is active (cached ~60s). Throws 403 if suspended, 401 if missing.
    await this.tenantsService.getActiveTenantOrThrow(payload.tenantId);

    // 4. Set CLS context for the request
    this.cls.set('tenantId', payload.tenantId);

    // 5. Look up user in Neo4j with tenantId filter
    const result = await this.neo4j.run(
      `MATCH (u:User {id: $id, email: $email, tenantId: $tenantId})
       WHERE u.is_deleted IS NULL OR u.is_deleted = false
       RETURN u`,
      { id: payload.sub, email: payload.email, tenantId: payload.tenantId },
    );

    if (!result.records.length) {
      throw new UnauthorizedException('User not found or token invalid.');
    }

    const user = result.records[0].get('u').properties;
    return {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.display_name || user.name || user.username,
      tenantId: payload.tenantId,
    };
  }
}
