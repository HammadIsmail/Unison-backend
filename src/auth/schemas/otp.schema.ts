import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'last_sent_at' } })
export class OTPRecord extends Document {
  created_at: Date;
  last_sent_at: Date;

  @Prop({ type: String, required: true, index: true })
  email: string;

  @Prop({ type: String, required: true, index: true })
  type: string;

  @Prop({ type: String, required: true })
  otp: string;

  @Prop({ type: Date, required: true })
  expires_at: Date;

  @Prop({ type: Boolean, default: false })
  verified: boolean;

  @Prop({ type: Number, default: 0 })
  attempts: number;

  @Prop({ type: Date, default: null })
  locked_until: Date | null;
}

export const OTPSchema = SchemaFactory.createForClass(OTPRecord);
