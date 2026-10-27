import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ClsService } from 'nestjs-cls';
import { Activity } from './schemas/activity.schema';

export enum ActivityType {
  USER_REGISTERED = 'USER_REGISTERED',
  ACCOUNT_APPROVED = 'ACCOUNT_APPROVED',
  OPPORTUNITY_POSTED = 'OPPORTUNITY_POSTED',
  PROFILE_UPDATED = 'PROFILE_UPDATED',
  EXPERIENCE_ADDED = 'EXPERIENCE_ADDED',
}

@Injectable()
export class ActivityService {
  constructor(
    @InjectModel(Activity.name)
    private readonly activityModel: Model<Activity>,
    private readonly cls: ClsService,
  ) { }

  async logActivity(type: ActivityType, description: string, relatedId?: string, tenantId?: string | null) {
    const resolvedTenantId = tenantId || this.cls.get<string>('tenantId') || null;
    await this.activityModel.create({
      type,
      description,
      related_id: relatedId,
      tenantId: resolvedTenantId,
    });
  }
}
