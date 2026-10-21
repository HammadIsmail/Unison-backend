import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Message } from './message.schema';

@Schema({ timestamps: true })
export class Conversation extends Document {
  @Prop({ type: String, required: true, index: true })
  tenantId: string;

  @Prop({ type: [String], required: true })
  participants: string[];

  @Prop({ type: Types.ObjectId, ref: 'Message' })
  lastMessage: Message;

  @Prop({ type: Map, of: Date, default: {} })
  clearedAt: Map<string, Date>;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
ConversationSchema.index({ tenantId: 1, participants: 1 });

