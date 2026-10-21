import { Resolver, Query, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ProfilesService } from '../../profiles/profiles.service';
import { SearchService } from '../../search/search.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { UserProfileType } from '../types/graphql.types';

@Resolver()
@UseGuards(JwtAuthGuard)
export class ProfilesResolver {
  constructor(
    private readonly profilesService: ProfilesService,
    private readonly searchService: SearchService,
  ) {}

  @Query(() => UserProfileType, { name: 'userProfile', description: 'Get public profile for a user' })
  async getUserProfile(
    @Args('id') id: string,
    @GetUser() user: any,
  ): Promise<UserProfileType> {
    const profile: any = await this.profilesService.getUserPublicProfile(id, user.sub);
    return {
      ...profile,
      created_at: profile.created_at ? profile.created_at.toString() : null,
    };

  }

  @Query(() => [UserProfileType], { name: 'searchUsers', description: 'Search users within the tenant' })
  async searchUsers(
    @GetUser() user: any,
    @Args('displayName', { nullable: true }) displayName?: string,
    @Args('company', { nullable: true }) company?: string,
    @Args('skill', { nullable: true }) skill?: string,
    @Args('batchYear', { nullable: true }) batchYear?: string,
    @Args('degree', { nullable: true }) degree?: string,
  ): Promise<UserProfileType[]> {
    const results = await this.searchService.searchUsers(
      user.sub,
      displayName,
      company,
      skill,
      batchYear,
      degree,
    );
    return results.map((r: any) => ({
      ...r,
      created_at: r.created_at ? r.created_at.toString() : null,
    }));
  }
}
