import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { OpportunityService } from '../../opportunity/opportunity.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetUser } from '../../common/decorators/get-user.decorator';
import {
  OpportunityType,
  OpportunityPaginationType,
  CreateOpportunityInput,
  UpdateOpportunityInput,
  SuccessMessageType,
} from '../types/graphql.types';

@Resolver()
@UseGuards(JwtAuthGuard, RolesGuard)
export class OpportunityResolver {
  constructor(private readonly opportunityService: OpportunityService) {}

  @Query(() => OpportunityPaginationType, { name: 'opportunities', description: 'List opportunities with filters' })
  async getOpportunities(
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
    @Args('type', { nullable: true }) type?: string,
    @Args('skill', { nullable: true }) skill?: string,
    @Args('isRemote', { nullable: true }) isRemote?: boolean,
  ): Promise<OpportunityPaginationType> {
    const res = await this.opportunityService.findAll(
      page,
      limit,
      type,
      skill,
      isRemote !== undefined ? String(isRemote) : undefined,
    );

    return {
      total: res.total,
      page: res.page,
      data: res.data.map((o: any) => ({
        id: o.id,
        title: o.title,
        type: o.type,
        description: o.description,
        location: o.location || null,
        is_remote: o.is_remote ?? null,
        deadline: o.deadline ? o.deadline.toString() : null,
        company_name: typeof o.company === 'object' ? o.company?.name : o.company || null,
        apply_link: o.apply_link || null,
        posted_by: o.posted_by?.display_name || null,
        poster_username: o.posted_by?.username || null,
        posted_at: o.posted_at ? o.posted_at.toString() : null,
        skills: o.skills || null,
        media_urls: o.media || null,
      })),
    };
  }

  @Query(() => OpportunityType, { name: 'opportunity', description: 'Get a single opportunity by ID' })
  async getOpportunity(@Args('id') id: string): Promise<OpportunityType> {
    const opp: any = await this.opportunityService.findOne(id);
    return {
      id: opp.id,
      title: opp.title,
      type: opp.type,
      description: opp.description,
      requirements: opp.requirements || null,
      location: opp.location || null,
      is_remote: opp.is_remote ?? null,
      deadline: opp.deadline ? opp.deadline.toString() : null,
      company_name: typeof opp.company === 'object' ? opp.company?.name : opp.company || null,
      apply_link: opp.apply_link || null,
      posted_by: opp.posted_by?.name || opp.posted_by?.display_name || null,
      poster_username: opp.posted_by?.username || null,
      posted_at: opp.posted_at ? opp.posted_at.toString() : null,
      skills: opp.required_skills || null,
      media_urls: opp.media || null,
    };
  }

  @Mutation(() => SuccessMessageType, { name: 'createOpportunity', description: 'Create a new opportunity' })
  @Roles('admin', 'alumni', 'partner')
  async createOpportunity(
    @GetUser() user: any,
    @Args('input') input: CreateOpportunityInput,
  ): Promise<SuccessMessageType> {
    const res = await this.opportunityService.create(user.sub, {
      title: input.title,
      type: input.type,
      description: input.description,
      requirements: input.requirements,
      location: input.location,
      is_remote: input.is_remote !== undefined ? String(input.is_remote) : undefined,
      deadline: input.deadline,
      company_name: input.company_name,
      apply_link: input.apply_link,
      skills: input.skills,
    } as any);

    return {
      message: res.message,
      id: res.opportunity_id,
    };
  }

  @Mutation(() => SuccessMessageType, { name: 'updateOpportunity', description: 'Update an existing opportunity' })
  @Roles('admin', 'alumni', 'partner')
  async updateOpportunity(
    @GetUser() user: any,
    @Args('id') id: string,
    @Args('input') input: UpdateOpportunityInput,
  ): Promise<SuccessMessageType> {
    const res = await this.opportunityService.update(user.sub, user.role, id, {
      title: input.title,
      type: input.type,
      description: input.description,
      requirements: input.requirements,
      location: input.location,
      is_remote: input.is_remote !== undefined ? String(input.is_remote) : undefined,
      deadline: input.deadline,
      company_name: input.company_name,
      apply_link: input.apply_link,
      skills: input.skills,
    } as any);

    return {
      message: res.message,
      id,
    };
  }

  @Mutation(() => SuccessMessageType, { name: 'deleteOpportunity', description: 'Delete an opportunity' })
  @Roles('admin', 'alumni', 'partner')
  async deleteOpportunity(
    @GetUser() user: any,
    @Args('id') id: string,
  ): Promise<SuccessMessageType> {
    const res = await this.opportunityService.remove(user.sub, user.role, id);
    return {
      message: res.message,
      id,
    };
  }
}
