import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Opportunity extends Document {
  @Prop({ required: true, unique: true })
  opportunityId: string;

  @Prop({ required: true })
  tenantId: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  requirements: string;

  @Prop({ required: true })
  location: string;

  @Prop({ required: true, default: false })
  is_remote: boolean;

  @Prop({ required: true })
  deadline: string;

  @Prop({ required: true })
  company_name: string;

  @Prop({ default: '' })
  apply_link: string;

  @Prop({ default: 'open' })
  status: string;

  @Prop({ type: [String], default: [] })
  required_skills: string[];

  @Prop({ type: [String], default: [] })
  media: string[];

  @Prop({ type: Array, default: [] })
  comments: Array<{
    id: string;
    userId: string;
    display_name: string;
    username: string;
    profile_picture?: string | null;
    role?: string | null;
    content: string;
    created_at: Date;
    replies?: Array<{
      id: string;
      userId: string;
      display_name: string;
      username: string;
      profile_picture?: string | null;
      role?: string | null;
      content: string;
      created_at: Date;
    }>;
  }>;

  @Prop({ default: false })
  is_deleted: boolean;

  @Prop({ default: Date.now })
  posted_at: Date;
}

export const OpportunitySchema = SchemaFactory.createForClass(Opportunity);
OpportunitySchema.index({ tenantId: 1, posted_at: -1 });
OpportunitySchema.index({ userId: 1 });
