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

  @Prop({ type: String, required: true })
  role: string;

  @Prop({ type: String })
  rejection_reason: string;

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
}

export const UserAuthSchema = SchemaFactory.createForClass(UserAuth);
