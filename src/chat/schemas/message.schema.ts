import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Conversation } from './conversation.schema';

@Schema({ timestamps: true })
export class Message extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Conversation', required: true })
  conversationId: Conversation;

  @Prop({ type: String, required: true })
  senderId: string;

  @Prop({ type: String, required: true })
  content: string;

  @Prop({ type: String, enum: ['text', 'image'], default: 'text' })
  messageType: string;

  @Prop({ type: String, required: false })
  imageUrl?: string;

  @Prop({ type: Boolean, default: false })
  isRead: boolean;

  @Prop({ type: Date })
  readAt: Date;

  @Prop({ type: Boolean, default: false })
  isEdited: boolean;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
