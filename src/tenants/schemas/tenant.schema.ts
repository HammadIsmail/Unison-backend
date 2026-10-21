import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TenantDocument = Tenant & Document;

@Schema({ timestamps: true, collection: 'tenants' })
export class Tenant {
  @Prop({ required: true, unique: true, index: true })
  id: string; // uuid v4

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ enum: ['active', 'suspended'], default: 'active' })
  status: 'active' | 'suspended';

  @Prop({ type: [String], default: [] })
  allowed_email_domains: string[];

  @Prop({ required: false })
  logo_url?: string;

  @Prop({ required: false })
  contact_email?: string;

  @Prop({ required: false })
  suspended_reason?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const TenantSchema = SchemaFactory.createForClass(Tenant);
