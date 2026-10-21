import { Resolver, Mutation, Query, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthService } from '../../auth/auth.service';
import { ProfilesService } from '../../profiles/profiles.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import {
  AuthResponseType,
  LoginInput,
  RegisterInput,
  SuccessMessageType,
  UserProfileType,
} from '../types/graphql.types';

@Resolver()
export class AuthResolver {
  constructor(
    private readonly authService: AuthService,
    private readonly profilesService: ProfilesService,
  ) {}

  @Mutation(() => AuthResponseType, { name: 'login', description: 'Authenticate user with email and password' })
  async login(@Args('input') input: LoginInput): Promise<AuthResponseType> {
    const res = await this.authService.login({
      email: input.email,
      password: input.password,
    });

    return {
      access_token: res.token,
      user: {
        id: res.profile.id,
        email: res.profile.email,
        role: res.role,
        name: res.profile.display_name || res.profile.username || null,
        tenant_id: res.profile.tenant_id || null,
      },
      tenant: res.tenant
        ? {
            id: res.tenant.id,
            slug: res.tenant.slug,
            name: res.tenant.name,
            logo_url: res.tenant.logo_url || null,
          }
        : null,
      account_status: res.account_status || 'approved',
    };
  }

  @Mutation(() => SuccessMessageType, { name: 'register', description: 'Register a new tenant user account' })
  async register(@Args('input') input: RegisterInput): Promise<SuccessMessageType> {
    const res = await this.authService.register({
      email: input.email,
      password: input.password,
      role: input.role as any,
      tenant_id: input.tenant_id,
      display_name: input.display_name,
      username: input.username,
      degree: input.degree,
      batch: input.batch,
      roll_number: input.roll_number,
      semester: input.semester,
      graduation_year: input.graduation_year,
      job_title: input.job_title,
      affiliation: input.affiliation,
      student_card: undefined,
      verified_token: '',
    });




    return {
      message: res.message,
      id: null,
    };
  }

  @Query(() => UserProfileType, { name: 'me', description: 'Get current authenticated user profile' })
  @UseGuards(JwtAuthGuard)
  async me(@GetUser() user: any): Promise<UserProfileType> {
    const profile: any = await this.profilesService.getUserPublicProfile(user.sub, user.sub);
    return {
      ...profile,
      created_at: profile.created_at ? profile.created_at.toString() : null,
    };
  }
}
