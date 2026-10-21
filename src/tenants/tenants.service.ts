import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Tenant, TenantDocument } from './schemas/tenant.schema';

interface CachedTenant {
  tenant: Tenant;
  expiresAt: number;
}

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);
  private readonly cache = new Map<string, CachedTenant>();
  private readonly ttlMs: number;

  constructor(
    @InjectModel(Tenant.name)
    private readonly tenantModel: Model<TenantDocument>,
    private readonly config: ConfigService,
  ) {
    const ttlSeconds = Number(this.config.get<string | number>('TENANT_CACHE_TTL_SECONDS') || 60);
    this.ttlMs = ttlSeconds * 1000;
  }

  async getActiveTenantOrThrow(tenantId: string): Promise<Tenant> {
    const tenant = await this.getTenantById(tenantId);
    if (!tenant) {
      throw new UnauthorizedException('Tenant not found or invalid.');
    }
    if (tenant.status === 'suspended') {
      throw new ForbiddenException("This university's access has been suspended.");
    }
    return tenant;
  }

  async getTenantById(tenantId: string): Promise<Tenant | null> {
    const cached = this.cache.get(tenantId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.tenant;
    }

    const tenant = await this.tenantModel.findOne({ id: tenantId }).lean().exec();
    if (tenant) {
      this.cache.set(tenantId, {
        tenant: tenant as unknown as Tenant,
        expiresAt: Date.now() + this.ttlMs,
      });
    }
    return tenant as unknown as Tenant | null;
  }

  async getTenantBySlug(slug: string): Promise<Tenant | null> {
    return (await this.tenantModel.findOne({ slug: slug.toLowerCase().trim() }).lean().exec()) as unknown as Tenant | null;
  }

  invalidate(tenantId: string): void {
    this.cache.delete(tenantId);
    this.logger.debug(`Invalidated cache for tenant: ${tenantId}`);
  }

  invalidateAll(): void {
    this.cache.clear();
  }

  async listPublicActiveTenants(): Promise<Array<{ id: string; slug: string; name: string; logo_url: string | null }>> {
    const tenants = await this.tenantModel
      .find({ status: 'active' }, { id: 1, slug: 1, name: 1, logo_url: 1, _id: 0 })
      .lean()
      .exec();

    return tenants.map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      logo_url: t.logo_url || null,
    }));
  }
}
