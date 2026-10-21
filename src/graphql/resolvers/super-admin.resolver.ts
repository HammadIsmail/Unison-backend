import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { SuperAdminService } from '../../super-admin/super-admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  SuperAdminTenantType,
  SuperAdminStatsType,
  CreateTenantInput,
  UpdateTenantInput,
  SuccessMessageType,
} from '../types/graphql.types';

@Resolver()
@UseGuards(JwtAuthGuard, RolesGuard, SuperAdminGuard)
@Roles('super_admin')
export class SuperAdminResolver {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Query(() => SuperAdminStatsType, { name: 'superAdminPlatformStats', description: 'Platform-wide aggregated statistics' })
  async getPlatformStats(): Promise<SuperAdminStatsType> {
    const stats = await this.superAdminService.getPlatformStats();
    const totalUsers = Object.values(stats.users).reduce((a, b) => a + b, 0);
    return {
      total_tenants: stats.tenants.total,
      active_tenants: stats.tenants.active,
      suspended_tenants: stats.tenants.suspended,
      total_users: totalUsers,
      total_opportunities: stats.content.total_opportunities,
      total_events: stats.content.total_events,
    };
  }

  @Query(() => [SuperAdminTenantType], { name: 'superAdminTenants', description: 'List all platform tenants' })
  async listTenants(
    @Args('status', { nullable: true }) status?: 'active' | 'suspended',
    @Args('search', { nullable: true }) search?: string,
  ): Promise<SuperAdminTenantType[]> {
    const res = await this.superAdminService.listTenants({ status, search });
    return res.data.map((t: any) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      status: t.status,
      allowed_email_domains: t.allowed_email_domains || [],
      logo_url: t.logo_url || null,
      contact_email: t.contact_email || null,
      suspended_reason: t.suspended_reason || null,
      createdAt: t.created_at ? t.created_at.toString() : null,
      updatedAt: t.updated_at ? t.updated_at.toString() : null,
      total_users: t.counts?.users ?? 0,
    }));
  }

  @Query(() => SuperAdminTenantType, { name: 'superAdminTenant', description: 'Get tenant details by ID' })
  async getTenant(@Args('id') id: string): Promise<SuperAdminTenantType> {
    const t: any = await this.superAdminService.getTenant(id);
    return {
      id: t.id,
      slug: t.slug,
      name: t.name,
      status: t.status,
      allowed_email_domains: t.allowed_email_domains || [],
      logo_url: t.logo_url || null,
      contact_email: t.contact_email || null,
      suspended_reason: t.suspended_reason || null,
      createdAt: t.createdAt ? t.createdAt.toString() : null,
      updatedAt: t.updatedAt ? t.updatedAt.toString() : null,
      total_users: t.total_users ?? 0,
    };
  }

  @Mutation(() => SuperAdminTenantType, { name: 'superAdminCreateTenant', description: 'Onboard a new university tenant' })
  async createTenant(
    @Args('input') input: CreateTenantInput,
  ): Promise<SuperAdminTenantType> {
    const t: any = await this.superAdminService.createTenant({
      slug: input.slug,
      name: input.name,
      allowed_email_domains: input.allowed_email_domains,
      logo_url: input.logo_url,
      contact_email: input.contact_email,
      admin: {
        email: input.admin.email,
        password: input.admin.password,
        username: input.admin.username,
        display_name: input.admin.display_name,
      },
    });

    return {
      id: t.id,
      slug: t.slug,
      name: t.name,
      status: t.status,
      allowed_email_domains: t.allowed_email_domains || [],
      logo_url: t.logo_url || null,
      contact_email: t.contact_email || null,
      suspended_reason: null,
      createdAt: t.createdAt ? t.createdAt.toString() : null,
      updatedAt: t.updatedAt ? t.updatedAt.toString() : null,
      total_users: 0,
    };
  }

  @Mutation(() => SuperAdminTenantType, { name: 'superAdminUpdateTenant', description: 'Update a tenant' })
  async updateTenant(
    @Args('id') id: string,
    @Args('input') input: UpdateTenantInput,
  ): Promise<SuperAdminTenantType> {
    const t: any = await this.superAdminService.updateTenant(id, {
      name: input.name,
      logo_url: input.logo_url,
      contact_email: input.contact_email,
      allowed_email_domains: input.allowed_email_domains,
    });

    return {
      id: t.id,
      slug: t.slug,
      name: t.name,
      status: t.status,
      allowed_email_domains: t.allowed_email_domains || [],
      logo_url: t.logo_url || null,
      contact_email: t.contact_email || null,
      suspended_reason: t.suspended_reason || null,
      createdAt: t.createdAt ? t.createdAt.toString() : null,
      updatedAt: t.updatedAt ? t.updatedAt.toString() : null,
      total_users: t.total_users ?? 0,
    };
  }

  @Mutation(() => SuccessMessageType, { name: 'superAdminSuspendTenant', description: 'Suspend a tenant' })
  async suspendTenant(
    @Args('id') id: string,
    @Args('reason') reason: string,
  ): Promise<SuccessMessageType> {
    const res = await this.superAdminService.suspendTenant(id, { reason });
    return {
      message: res.message,
      id,
    };
  }

  @Mutation(() => SuccessMessageType, { name: 'superAdminReactivateTenant', description: 'Reactivate a suspended tenant' })
  async reactivateTenant(@Args('id') id: string): Promise<SuccessMessageType> {
    const res = await this.superAdminService.reactivateTenant(id);
    return {
      message: res.message,
      id,
    };
  }
}
