import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { EventsService } from '../../events/events.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetUser } from '../../common/decorators/get-user.decorator';
import {
  EventType,
  EventPaginationType,
  CreateEventInput,
  SuccessMessageType,
} from '../types/graphql.types';

@Resolver()
@UseGuards(JwtAuthGuard, RolesGuard)
export class EventsResolver {
  constructor(private readonly eventsService: EventsService) {}

  @Query(() => EventPaginationType, { name: 'events', description: 'List upcoming and past events' })
  async getEvents(
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
    @Args('type', { nullable: true }) type?: string,
    @Args('isOnline', { nullable: true }) isOnline?: boolean,
    @Args('status', { nullable: true }) status?: 'upcoming' | 'past',
  ): Promise<EventPaginationType> {
    const offset = (page - 1) * limit;
    const res = await this.eventsService.getEvents({
      type,
      is_online: isOnline !== undefined ? String(isOnline) : undefined,
      status,
      limit,
      offset,
    });

    return {
      total: res.length,
      page,
      data: res.map((e: any) => ({
        id: e.id,
        title: e.title,
        description: e.description || '',
        type: e.type,
        date: e.date ? e.date.toString() : '',
        is_online: e.is_online ?? false,
        location: e.location || null,
        meeting_link: e.meeting_link || null,
        max_attendees: e.max_attendees ? Number(e.max_attendees) : null,
        banner_url: e.banner_url || null,
        hosted_by: e.host?.name || null,
        host_username: e.host?.username || null,
        created_at: e.created_at ? e.created_at.toString() : null,
      })),
    };
  }

  @Query(() => EventType, { name: 'event', description: 'Get event details by ID' })
  async getEvent(
    @GetUser() user: any,
    @Args('id') id: string,
  ): Promise<EventType> {
    const e: any = await this.eventsService.getEventDetails(user.sub, id);
    return {
      id: e.id,
      title: e.title,
      description: e.description,
      type: e.type,
      date: e.date ? e.date.toString() : '',
      is_online: e.is_online ?? false,
      location: e.location || null,
      meeting_link: e.meeting_link || null,
      max_attendees: e.max_attendees ? Number(e.max_attendees) : null,
      banner_url: e.banner_url || null,
      hosted_by: e.host?.name || null,
      host_username: e.host?.username || null,
      created_at: e.created_at ? e.created_at.toString() : null,
    };
  }

  @Mutation(() => SuccessMessageType, { name: 'createEvent', description: 'Create a new event' })
  @Roles('admin', 'alumni', 'partner')
  async createEvent(
    @GetUser() user: any,
    @Args('input') input: CreateEventInput,
  ): Promise<SuccessMessageType> {
    const res = await this.eventsService.createEvent(user.sub, {
      title: input.title,
      description: input.description,
      type: input.type,
      date: input.date,
      is_online: input.is_online,
      location: input.location,
      meeting_link: input.meeting_link,
      max_attendees: input.max_attendees,
    } as any);

    return {
      message: 'Event created successfully',
      id: res.eventId,
    };
  }

  @Mutation(() => SuccessMessageType, { name: 'deleteEvent', description: 'Delete an event' })
  @Roles('admin', 'alumni', 'partner')
  async deleteEvent(
    @GetUser() user: any,
    @Args('id') id: string,
  ): Promise<SuccessMessageType> {
    const res = await this.eventsService.deleteEvent(user.sub, id);
    return {
      message: res.message,
      id,
    };
  }
}
