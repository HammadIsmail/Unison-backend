import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class UserAuth extends Document {
  @Prop({ type: String, required: true, unique: true, index: true })
  userId: string;

  // NOTE: Uniqueness is NOT enforced here — it is enforced via a partial unique
  // index created in migrate-email-index.ts, which only requires uniqueness
  // when is_deleted != true. This allows email reuse after soft deletion.
  @Prop({ type: String, required: true, index: true })
  email: string;

  @Prop({ type: String, required: true })
  password: string;

  @Prop({ type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' })
  account_status: string;

  @Prop({ type: String, enum: ['alumni', 'student', 'partner', 'admin', 'super_admin'], required: true })
  role: string;

  @Prop({ type: String, required: false, index: true, default: null })
  tenantId: string | null;

  @Prop({ type: String })
  rejection_reason: string;

  @Prop({ type: String })
  username?: string;

  @Prop({ type: String })
  display_name?: string;

  @Prop({ type: String })
  roll_number?: string;

  @Prop({ type: String })
  degree?: string;

  @Prop({ type: Number })
  semester?: number;

  @Prop({ type: String })
  batch?: string;

  @Prop({ type: Number })
  graduation_year?: number;

  @Prop({ type: String })
  affiliation?: string | null;

  @Prop({ type: String })
  job_title?: string | null;

  @Prop({ type: String })
  profile_picture?: string | null;

  @Prop({ type: String, default: null })
  backDropImage?: string | null;

  @Prop({ type: String, default: null })
  bio?: string | null;

  @Prop({ type: String, default: null })
  phone?: string | null;

  @Prop({ type: String, default: null })
  linkedin_url?: string | null;

  @Prop({ type: [String], default: [] })
  skills?: string[];

  @Prop({ type: [Object], default: [] })
  detailed_skills?: Array<{
    id: string;
    name: string;
    category?: string | null;
    proficiency_level?: string;
    years_experience?: number;
  }>;

  @Prop({ type: [Object], default: [] })
  education?: Array<{
    id: string;
    university: string;
    degree: string;
    field_of_study?: string | null;
    start_date: string;
    end_date?: string | null;
    is_current: boolean;
  }>;

  @Prop({ type: [Object], default: [] })
  work_experiences?: Array<{
    id: string;
    company_name: string;
    role: string;
    start_date: string;
    end_date?: string | null;
    is_current: boolean;
    employment_type?: string | null;
  }>;

  @Prop({ type: String })
  student_card_url?: string | null;

  @Prop({ type: String, default: null })
  upgrade_status?: string | null;

  @Prop({ type: String, default: null })
  upgrade_rejection_reason?: string | null;

  // ─── Soft Delete ──────────────────────────────────────────────────────────
  @Prop({ type: Boolean, default: false, index: true })
  is_deleted: boolean;

  @Prop({ type: Date })
  deleted_at: Date;

  /** UUID of the admin or system actor that initiated the deletion */
  @Prop({ type: String })
  deleted_by: string;

  /** Human-readable reason for deletion (e.g. "Violation of community guidelines") */
  @Prop({ type: String })
  deletion_reason: string;

  /** Source of the deletion action: 'admin' | 'self' | 'system' */
  @Prop({ type: String, enum: ['admin', 'self', 'system'] })
  deletion_source: string;

  // ─── Restoration ─────────────────────────────────────────────────────────
  @Prop({ type: Date })
  restored_at: Date;

  /** UUID of the admin who restored the account */
  @Prop({ type: String })
  restored_by: string;

  // ─── Login Rate Limiting ──────────────────────────────────────────────────
  /** Number of consecutive failed login attempts */
  @Prop({ type: Number, default: 0 })
  login_attempts: number;

  /** Timestamp until which login is locked (null = not locked) */
  @Prop({ type: Date, default: null })
  login_locked_until: Date | null;
}

export const UserAuthSchema = SchemaFactory.createForClass(UserAuth);
