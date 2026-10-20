import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: false } })
export class Notification extends Document {
  created_at: Date;

  @Prop({ type: String, required: true, index: true })
  recipientId: string;

  @Prop({ type: String, required: true })
  message: string;

  @Prop({ type: String, required: true })
  type: string;

  @Prop({ type: Boolean, default: false })
  is_read: boolean;

  @Prop({ type: String })
  sender_username: string;

  @Prop({ type: String })
  sender_display_name: string;

  @Prop({ type: String })
  sender_profile_picture: string;

  @Prop({ type: String })
  reference_link: string;

  @Prop({ type: String })
  reference_id: string;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
