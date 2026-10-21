import { Resolver, Query, Args } from '@nestjs/graphql';
import { NotFoundException } from '@nestjs/common';
import { TenantsService } from '../../tenants/tenants.service';
import { PublicTenantType, TenantType } from '../types/graphql.types';

@Resolver()
export class TenantsResolver {
  constructor(private readonly tenantsService: TenantsService) {}

  @Query(() => [PublicTenantType], { name: 'tenants', description: 'List public active universities/tenants' })
  async getTenants(): Promise<PublicTenantType[]> {
    return this.tenantsService.listPublicActiveTenants();
  }

  @Query(() => TenantType, { name: 'tenant', description: 'Get tenant details by slug' })
  async getTenantBySlug(@Args('slug') slug: string): Promise<TenantType> {
    const tenant = await this.tenantsService.getTenantBySlug(slug);
    if (!tenant) {
      throw new NotFoundException(`Tenant with slug "${slug}" not found`);
    }
    return {
      ...tenant,
      createdAt: tenant.createdAt ? tenant.createdAt.toString() : null,
      updatedAt: tenant.updatedAt ? tenant.updatedAt.toString() : null,
    };
  }
}
