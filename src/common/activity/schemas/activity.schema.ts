import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: false } })
export class Activity extends Document {
  created_at: Date;

  @Prop({ type: String, required: true })
  type: string;

  @Prop({ type: String, required: true })
  description: string;

  @Prop({ type: String })
  related_id: string;
}

export const ActivitySchema = SchemaFactory.createForClass(Activity);
