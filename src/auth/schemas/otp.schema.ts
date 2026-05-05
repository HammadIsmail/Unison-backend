import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: { createdAt: 'last_sent_at', updatedAt: 'last_sent_at' } })
export class OTPRecord extends Document {
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
}

export const OTPSchema = SchemaFactory.createForClass(OTPRecord);
