import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AdminService } from '../../admin/admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetUser } from '../../common/decorators/get-user.decorator';
import {
  AnnouncementType,
  AnnouncementPaginationType,
  CreateAnnouncementInput,
  SuccessMessageType,
} from '../types/graphql.types';

@Resolver()
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnnouncementsResolver {
  constructor(private readonly adminService: AdminService) {}

  @Query(() => AnnouncementPaginationType, { name: 'announcements', description: 'List tenant announcements' })
  async getAnnouncements(
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
  ): Promise<AnnouncementPaginationType> {
    const res = await this.adminService.getAnnouncements(page, limit);
    return {
      total: res.total,
      page: res.page,
      data: res.data.map((a: any) => ({
        id: a.id.toString(),
        title: a.title,
        description: a.description,
        event_date: a.event_date ? a.event_date.toString() : null,
        media_url: a.media_url || null,
        media_type: a.media_type || null,
        created_by_admin: a.created_by_admin
          ? {
              id: a.created_by_admin.id,
              name: a.created_by_admin.name,
            }
          : null,
        created_at: a.created_at ? a.created_at.toString() : null,
      })),
    };
  }

  @Query(() => AnnouncementType, { name: 'announcement', description: 'Get announcement by ID' })
  async getAnnouncement(@Args('id') id: string): Promise<AnnouncementType> {
    const a = await this.adminService.getAnnouncementById(id);
    return {
      id: a.id.toString(),
      title: a.title,
      description: a.description,
      event_date: a.event_date ? a.event_date.toString() : null,
      media_url: a.media_url || null,
      media_type: a.media_type || null,
      created_by_admin: a.created_by_admin
        ? {
            id: a.created_by_admin.id,
            name: a.created_by_admin.name,
          }
        : null,
      created_at: a.created_at ? a.created_at.toString() : null,
    };
  }

  @Mutation(() => SuccessMessageType, { name: 'broadcastAnnouncement', description: 'Broadcast a new tenant announcement' })
  @Roles('admin')
  async broadcastAnnouncement(
    @GetUser() user: any,
    @Args('input') input: CreateAnnouncementInput,
  ): Promise<SuccessMessageType> {
    const res = await this.adminService.broadcastAnnouncement(user.sub, {
      title: input.title,
      description: input.description,
      event_date: input.event_date,
    });

    return {
      message: res.message,
      id: res.id.toString(),
    };
  }

  @Mutation(() => SuccessMessageType, { name: 'deleteAnnouncement', description: 'Delete an announcement' })
  @Roles('admin')
  async deleteAnnouncement(@Args('id') id: string): Promise<SuccessMessageType> {
    const res = await this.adminService.deleteAnnouncement(id);
    return {
      message: res.message,
      id,
    };
  }
}
