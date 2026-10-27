import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Connection extends Document {
  @Prop({ required: true, unique: true })
  connectionId: string;

  @Prop({ required: true, index: true })
  tenantId: string;

  @Prop({ required: true, index: true })
  senderId: string;

  @Prop({ required: true, index: true })
  receiverId: string;

  @Prop({ required: true, enum: ['pending', 'accepted', 'rejected'], default: 'pending', index: true })
  status: string;

  @Prop({ type: Date, default: Date.now })
  created_at: Date;

  @Prop({ type: Date, default: null })
  accepted_at: Date | null;
}

export const ConnectionSchema = SchemaFactory.createForClass(Connection);
ConnectionSchema.index({ tenantId: 1, senderId: 1, receiverId: 1 });
ConnectionSchema.index({ tenantId: 1, receiverId: 1, status: 1 });
ConnectionSchema.index({ tenantId: 1, senderId: 1, status: 1 });
