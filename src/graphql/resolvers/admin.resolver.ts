import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AdminService } from '../../admin/admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  AdminDashboardStatsType,
  PendingAccountType,
  PendingUpgradeType,
  TenantType,
  StaffMemberType,
  UpdateTenantSettingsInput,
  CreateStaffInput,
  SuccessMessageType,
} from '../types/graphql.types';

@Resolver()
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminResolver {
  constructor(private readonly adminService: AdminService) {}

  @Query(() => AdminDashboardStatsType, { name: 'adminDashboardStats', description: 'Get tenant dashboard statistics' })
  @Roles('admin', 'moderator')
  async getDashboardStats(): Promise<AdminDashboardStatsType> {
    return this.adminService.getDashboardStats();
  }

  @Query(() => [PendingAccountType], { name: 'adminPendingAccounts', description: 'List pending accounts for moderation' })
  @Roles('admin', 'moderator')
  async getPendingAccounts(): Promise<PendingAccountType[]> {
    return this.adminService.getPendingAccounts();
  }

  @Query(() => [PendingUpgradeType], { name: 'adminPendingUpgrades', description: 'List pending student-to-alumni upgrades' })
  @Roles('admin', 'moderator')
  async getPendingUpgrades(): Promise<PendingUpgradeType[]> {
    return this.adminService.getPendingUpgrades();
  }

  @Query(() => TenantType, { name: 'adminCurrentTenant', description: 'Get settings for current tenant' })
  @Roles('admin')
  async getCurrentTenantSettings(): Promise<TenantType> {
    return this.adminService.getCurrentTenantSettings();
  }

  @Query(() => [StaffMemberType], { name: 'adminStaffList', description: 'List tenant staff members' })
  @Roles('admin')
  async getStaffList(): Promise<StaffMemberType[]> {
    return this.adminService.getStaffList();
  }

  @Mutation(() => SuccessMessageType, { name: 'adminApproveAccount', description: 'Approve a pending account' })
  @Roles('admin', 'moderator')
  async approveAccount(@Args('id') id: string): Promise<SuccessMessageType> {
    const res = await this.adminService.approveAccount(id);
    return {
      message: res.message,
      id,
    };
  }

  @Mutation(() => SuccessMessageType, { name: 'adminRejectAccount', description: 'Reject a pending account request' })
  @Roles('admin', 'moderator')
  async rejectAccount(
    @Args('id') id: string,
    @Args('reason') reason: string,
  ): Promise<SuccessMessageType> {
    const res = await this.adminService.rejectAccount(id, { rejection_reason: reason });
    return {
      message: res.message,
      id,
    };
  }

  @Mutation(() => SuccessMessageType, { name: 'adminApproveUpgrade', description: 'Approve student to alumni upgrade' })
  @Roles('admin', 'moderator')
  async approveUpgrade(@Args('id') id: string): Promise<SuccessMessageType> {
    const res = await this.adminService.approveUpgrade(id);
    return {
      message: res.message,
      id,
    };
  }

  @Mutation(() => SuccessMessageType, { name: 'adminRejectUpgrade', description: 'Reject student to alumni upgrade' })
  @Roles('admin', 'moderator')
  async rejectUpgrade(
    @Args('id') id: string,
    @Args('reason') reason: string,
  ): Promise<SuccessMessageType> {
    const res = await this.adminService.rejectUpgrade(id, { rejection_reason: reason });
    return {
      message: res.message,
      id,
    };
  }

  @Mutation(() => TenantType, { name: 'adminUpdateTenant', description: 'Update current tenant settings' })
  @Roles('admin')
  async updateCurrentTenantSettings(
    @Args('input') input: UpdateTenantSettingsInput,
  ): Promise<TenantType> {
    return this.adminService.updateCurrentTenantSettings(input);
  }

  @Mutation(() => SuccessMessageType, { name: 'adminCreateStaff', description: 'Create a new staff member' })
  @Roles('admin')
  async createStaff(@Args('input') input: CreateStaffInput): Promise<SuccessMessageType> {
    const res = await this.adminService.createStaff({
      email: input.email,
      password: input.password,
      username: input.username,
      display_name: input.display_name,
      role: input.role as 'admin' | 'moderator',
    });
    return {
      message: res.message,
      id: res.userId,
    };
  }
}
