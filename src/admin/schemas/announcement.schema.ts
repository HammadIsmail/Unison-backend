import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: false } })
export class Announcement extends Document {
  created_at: Date;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: true })
  description: string;

  @Prop({ type: String })
  event_date?: string;

  @Prop({ type: String })
  media_url?: string;

  @Prop({ type: String, enum: ['image', 'video'] })
  media_type?: string;

  @Prop({ type: String, required: true })
  created_by_admin: string;
}

export const AnnouncementSchema = SchemaFactory.createForClass(Announcement);
