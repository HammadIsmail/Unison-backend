import { ObjectType, Field, ID, Int, Float, InputType } from '@nestjs/graphql';

// ─────────────────────────────────────────────────────────────────────────
// Common & Tenant Types
// ─────────────────────────────────────────────────────────────────────────

@ObjectType('PublicTenant')
export class PublicTenantType {
  @Field(() => ID)
  id: string;

  @Field()
  slug: string;

  @Field()
  name: string;

  @Field(() => String, { nullable: true })
  logo_url?: string | null;
}

@ObjectType('Tenant')
export class TenantType {
  @Field(() => ID)
  id: string;

  @Field()
  slug: string;

  @Field()
  name: string;

  @Field(() => String, { nullable: true })
  logo_url?: string | null;

  @Field(() => String, { nullable: true })
  contact_email?: string | null;

  @Field(() => [String])
  allowed_email_domains: string[];

  @Field()
  status: string;

  @Field(() => String, { nullable: true })
  suspended_reason?: string | null;

  @Field(() => String, { nullable: true })
  createdAt?: string | null;

  @Field(() => String, { nullable: true })
  updatedAt?: string | null;
}

@ObjectType('SuccessMessage')
export class SuccessMessageType {
  @Field()
  message: string;

  @Field(() => String, { nullable: true })
  id?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────
// Auth Types
// ─────────────────────────────────────────────────────────────────────────

@ObjectType('AuthUser')
export class AuthUserType {
  @Field(() => ID)
  id: string;

  @Field()
  email: string;

  @Field()
  role: string;

  @Field(() => String, { nullable: true })
  name?: string | null;

  @Field(() => String, { nullable: true })
  tenant_id?: string | null;
}

@ObjectType('AuthTenant')
export class AuthTenantType {
  @Field(() => ID)
  id: string;

  @Field()
  slug: string;

  @Field()
  name: string;

  @Field(() => String, { nullable: true })
  logo_url?: string | null;
}

@ObjectType('AuthResponse')
export class AuthResponseType {
  @Field()
  access_token: string;

  @Field(() => AuthUserType)
  user: AuthUserType;

  @Field(() => AuthTenantType, { nullable: true })
  tenant?: AuthTenantType | null;

  @Field(() => String, { nullable: true })
  account_status?: string | null;
}

@InputType('LoginInput')
export class LoginInput {
  @Field()
  email: string;

  @Field()
  password: string;
}

@InputType('RegisterInput')
export class RegisterInput {
  @Field()
  email: string;

  @Field()
  password: string;

  @Field()
  role: string;

  @Field()
  tenant_id: string;

  @Field()
  display_name: string;

  @Field()
  username: string;

  @Field(() => String, { nullable: true })
  degree?: string;

  @Field(() => String, { nullable: true })
  batch?: string;

  @Field(() => String, { nullable: true })
  roll_number?: string;

  @Field(() => Int, { nullable: true })
  semester?: number;

  @Field(() => Int, { nullable: true })
  graduation_year?: number;

  @Field(() => String, { nullable: true })
  job_title?: string;

  @Field(() => String, { nullable: true })
  affiliation?: string;
}



// ─────────────────────────────────────────────────────────────────────────
// Profile & User Types
// ─────────────────────────────────────────────────────────────────────────

@ObjectType('WorkExperience')
export class WorkExperienceType {
  @Field(() => ID, { nullable: true })
  id?: string | null;

  @Field(() => String, { nullable: true })
  company_name?: string | null;

  @Field(() => String, { nullable: true })
  role?: string | null;

  @Field(() => String, { nullable: true })
  start_date?: string | null;

  @Field(() => String, { nullable: true })
  end_date?: string | null;

  @Field(() => Boolean, { nullable: true })
  is_current?: boolean | null;

  @Field(() => String, { nullable: true })
  employment_type?: string | null;
}

@ObjectType('Education')
export class EducationType {
  @Field(() => ID, { nullable: true })
  id?: string | null;

  @Field(() => String, { nullable: true })
  university?: string | null;

  @Field(() => String, { nullable: true })
  degree?: string | null;

  @Field(() => String, { nullable: true })
  field_of_study?: string | null;

  @Field(() => Int, { nullable: true })
  start_year?: number | null;

  @Field(() => Int, { nullable: true })
  end_year?: number | null;
}

@ObjectType('UserProfile')
export class UserProfileType {
  @Field(() => ID)
  id: string;

  @Field()
  username: string;

  @Field()
  display_name: string;

  @Field()
  email: string;

  @Field()
  role: string;

  @Field(() => String, { nullable: true })
  profile_picture?: string | null;

  @Field(() => String, { nullable: true })
  bio?: string | null;

  @Field(() => String, { nullable: true })
  phone?: string | null;

  @Field(() => String, { nullable: true })
  location?: string | null;

  @Field(() => String, { nullable: true })
  degree?: string | null;

  @Field(() => String, { nullable: true })
  batch?: string | null;

  @Field(() => String, { nullable: true })
  roll_number?: string | null;

  @Field(() => Int, { nullable: true })
  semester?: number | null;

  @Field(() => Int, { nullable: true })
  graduation_year?: number | null;

  @Field(() => String, { nullable: true })
  affiliation?: string | null;

  @Field(() => String, { nullable: true })
  job_title?: string | null;

  @Field(() => String, { nullable: true })
  linkedin_url?: string | null;

  @Field(() => String, { nullable: true })
  github_url?: string | null;

  @Field(() => [String], { nullable: true })
  skills?: string[] | null;

  @Field(() => [WorkExperienceType], { nullable: true })
  work_experiences?: WorkExperienceType[] | null;

  @Field(() => [EducationType], { nullable: true })
  education?: EducationType[] | null;

  @Field(() => Int, { nullable: true })
  followers_count?: number | null;

  @Field(() => Int, { nullable: true })
  following_count?: number | null;

  @Field(() => Int, { nullable: true })
  connections_count?: number | null;

  @Field(() => Boolean, { nullable: true })
  is_following?: boolean | null;

  @Field(() => Boolean, { nullable: true })
  is_connected?: boolean | null;

  @Field(() => String, { nullable: true })
  connection_status?: string | null;

  @Field(() => String, { nullable: true })
  created_at?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────
// Opportunity Types
// ─────────────────────────────────────────────────────────────────────────

@ObjectType('Opportunity')
export class OpportunityType {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field()
  type: string;

  @Field()
  description: string;

  @Field(() => String, { nullable: true })
  requirements?: string | null;

  @Field(() => String, { nullable: true })
  location?: string | null;

  @Field(() => Boolean, { nullable: true })
  is_remote?: boolean | null;

  @Field(() => String, { nullable: true })
  deadline?: string | null;

  @Field(() => String, { nullable: true })
  company_name?: string | null;

  @Field(() => String, { nullable: true })
  apply_link?: string | null;

  @Field(() => [String], { nullable: true })
  skills?: string[] | null;

  @Field(() => [String], { nullable: true })
  media_urls?: string[] | null;

  @Field(() => String, { nullable: true })
  posted_by?: string | null;

  @Field(() => String, { nullable: true })
  poster_username?: string | null;

  @Field(() => String, { nullable: true })
  posted_at?: string | null;
}

@ObjectType('OpportunityPagination')
export class OpportunityPaginationType {
  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => [OpportunityType])
  data: OpportunityType[];
}

@InputType('CreateOpportunityInput')
export class CreateOpportunityInput {
  @Field()
  title: string;

  @Field()
  type: string;

  @Field()
  description: string;

  @Field(() => String, { nullable: true })
  requirements?: string;

  @Field(() => String, { nullable: true })
  location?: string;

  @Field(() => Boolean, { nullable: true })
  is_remote?: boolean;

  @Field(() => String, { nullable: true })
  deadline?: string;

  @Field(() => String, { nullable: true })
  company_name?: string;

  @Field(() => String, { nullable: true })
  apply_link?: string;

  @Field(() => [String], { nullable: true })
  skills?: string[];
}

@InputType('UpdateOpportunityInput')
export class UpdateOpportunityInput {
  @Field(() => String, { nullable: true })
  title?: string;

  @Field(() => String, { nullable: true })
  type?: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  requirements?: string;

  @Field(() => String, { nullable: true })
  location?: string;

  @Field(() => Boolean, { nullable: true })
  is_remote?: boolean;

  @Field(() => String, { nullable: true })
  deadline?: string;

  @Field(() => String, { nullable: true })
  company_name?: string;

  @Field(() => String, { nullable: true })
  apply_link?: string;

  @Field(() => [String], { nullable: true })
  skills?: string[];
}

// ─────────────────────────────────────────────────────────────────────────
// Event Types
// ─────────────────────────────────────────────────────────────────────────

@ObjectType('Event')
export class EventType {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field()
  description: string;

  @Field()
  type: string;

  @Field()
  date: string;

  @Field(() => Boolean)
  is_online: boolean;

  @Field(() => String, { nullable: true })
  location?: string | null;

  @Field(() => String, { nullable: true })
  meeting_link?: string | null;

  @Field(() => Int, { nullable: true })
  max_attendees?: number | null;

  @Field(() => String, { nullable: true })
  banner_url?: string | null;

  @Field(() => String, { nullable: true })
  hosted_by?: string | null;

  @Field(() => String, { nullable: true })
  host_username?: string | null;

  @Field(() => String, { nullable: true })
  created_at?: string | null;
}

@ObjectType('EventPagination')
export class EventPaginationType {
  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => [EventType])
  data: EventType[];
}

@InputType('CreateEventInput')
export class CreateEventInput {
  @Field()
  title: string;

  @Field()
  description: string;

  @Field()
  type: string;

  @Field()
  date: string;

  @Field(() => Boolean)
  is_online: boolean;

  @Field(() => String, { nullable: true })
  location?: string;

  @Field(() => String, { nullable: true })
  meeting_link?: string;

  @Field(() => Int, { nullable: true })
  max_attendees?: number;
}

// ─────────────────────────────────────────────────────────────────────────
// Announcement Types
// ─────────────────────────────────────────────────────────────────────────

@ObjectType('AnnouncementAdmin')
export class AnnouncementAdminType {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;
}

@ObjectType('Announcement')
export class AnnouncementType {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field()
  description: string;

  @Field(() => String, { nullable: true })
  event_date?: string | null;

  @Field(() => String, { nullable: true })
  media_url?: string | null;

  @Field(() => String, { nullable: true })
  media_type?: string | null;

  @Field(() => AnnouncementAdminType, { nullable: true })
  created_by_admin?: AnnouncementAdminType | null;

  @Field(() => String, { nullable: true })
  created_at?: string | null;
}

@ObjectType('AnnouncementPagination')
export class AnnouncementPaginationType {
  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => [AnnouncementType])
  data: AnnouncementType[];
}

@InputType('CreateAnnouncementInput')
export class CreateAnnouncementInput {
  @Field()
  title: string;

  @Field()
  description: string;

  @Field(() => String, { nullable: true })
  event_date?: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Admin & Analytics Types
// ─────────────────────────────────────────────────────────────────────────

@ObjectType('AdminDashboardStats')
export class AdminDashboardStatsType {
  @Field(() => Int)
  total_alumni: number;

  @Field(() => Int)
  total_students: number;

  @Field(() => Int)
  pending_accounts: number;

  @Field(() => Int)
  total_opportunities: number;

  @Field(() => Int)
  total_companies: number;

  @Field(() => [String])
  most_common_skills: string[];
}

@ObjectType('PendingAccount')
export class PendingAccountType {
  @Field(() => ID)
  id: string;

  @Field()
  username: string;

  @Field()
  display_name: string;

  @Field()
  email: string;

  @Field()
  role: string;

  @Field(() => String, { nullable: true })
  registered_at?: string | null;

  @Field(() => String, { nullable: true })
  profile_picture?: string | null;

  @Field(() => String, { nullable: true })
  student_card_url?: string | null;

  @Field(() => String, { nullable: true })
  affiliation?: string | null;

  @Field(() => String, { nullable: true })
  job_title?: string | null;
}

@ObjectType('PendingUpgrade')
export class PendingUpgradeType {
  @Field(() => ID)
  id: string;

  @Field()
  username: string;

  @Field()
  display_name: string;

  @Field()
  email: string;

  @Field(() => String, { nullable: true })
  roll_number?: string | null;

  @Field(() => Int, { nullable: true })
  graduation_year?: number | null;

  @Field(() => String, { nullable: true })
  upgrade_status?: string | null;

  @Field(() => String, { nullable: true })
  profile_picture?: string | null;
}

@ObjectType('StaffMember')
export class StaffMemberType {
  @Field(() => ID)
  id: string;

  @Field()
  username: string;

  @Field()
  display_name: string;

  @Field()
  role: string;

  @Field()
  email: string;

  @Field(() => String, { nullable: true })
  profile_picture?: string | null;
}

@InputType('CreateStaffInput')
export class CreateStaffInput {
  @Field()
  email: string;

  @Field()
  password: string;

  @Field()
  username: string;

  @Field()
  display_name: string;

  @Field()
  role: string; // 'admin' | 'moderator'
}

@InputType('UpdateTenantSettingsInput')
export class UpdateTenantSettingsInput {
  @Field(() => String, { nullable: true })
  name?: string;

  @Field(() => String, { nullable: true })
  logo_url?: string;

  @Field(() => String, { nullable: true })
  contact_email?: string;

  @Field(() => [String], { nullable: true })
  allowed_email_domains?: string[];
}

// ─────────────────────────────────────────────────────────────────────────
// Super Admin Types
// ─────────────────────────────────────────────────────────────────────────

@ObjectType('SuperAdminTenant')
export class SuperAdminTenantType {
  @Field(() => ID)
  id: string;

  @Field()
  slug: string;

  @Field()
  name: string;

  @Field()
  status: string;

  @Field(() => [String])
  allowed_email_domains: string[];

  @Field(() => String, { nullable: true })
  logo_url?: string | null;

  @Field(() => String, { nullable: true })
  contact_email?: string | null;

  @Field(() => String, { nullable: true })
  suspended_reason?: string | null;

  @Field(() => String, { nullable: true })
  createdAt?: string | null;

  @Field(() => String, { nullable: true })
  updatedAt?: string | null;

  @Field(() => Int, { nullable: true })
  total_users?: number | null;
}

@ObjectType('SuperAdminStats')
export class SuperAdminStatsType {
  @Field(() => Int)
  total_tenants: number;

  @Field(() => Int)
  active_tenants: number;

  @Field(() => Int)
  suspended_tenants: number;

  @Field(() => Int)
  total_users: number;

  @Field(() => Int)
  total_opportunities: number;

  @Field(() => Int)
  total_events: number;
}

@InputType('CreateTenantAdminInput')
export class CreateTenantAdminInput {
  @Field()
  email: string;

  @Field()
  password: string;

  @Field()
  username: string;

  @Field()
  display_name: string;
}

@InputType('CreateTenantInput')
export class CreateTenantInput {
  @Field()
  slug: string;

  @Field()
  name: string;

  @Field(() => [String])
  allowed_email_domains: string[];

  @Field(() => String, { nullable: true })
  logo_url?: string;

  @Field(() => String, { nullable: true })
  contact_email?: string;

  @Field(() => CreateTenantAdminInput)
  admin: CreateTenantAdminInput;
}


@InputType('UpdateTenantInput')
export class UpdateTenantInput {
  @Field(() => String, { nullable: true })
  name?: string;

  @Field(() => String, { nullable: true })
  logo_url?: string;

  @Field(() => String, { nullable: true })
  contact_email?: string;

  @Field(() => [String], { nullable: true })
  allowed_email_domains?: string[];
}
