import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class UserAuth extends Document {
  @Prop({ type: String, required: true, unique: true, index: true })
  userId: string;

  @Prop({ type: String, required: true, unique: true, index: true })
  email: string;

  @Prop({ type: String, required: true })
  password: string;

  @Prop({ type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' })
  account_status: string;

  @Prop({ type: String, required: true })
  role: string;

  @Prop({ type: String })
  rejection_reason: string;
}

export const UserAuthSchema = SchemaFactory.createForClass(UserAuth);
