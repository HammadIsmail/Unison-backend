import { Injectable } from '@nestjs/common';
import { Neo4jService } from '../../neo4j/neo4j.service';
import { v4 as uuidv4 } from 'uuid';

export enum ActivityType {
  USER_REGISTERED = 'USER_REGISTERED',
  ACCOUNT_APPROVED = 'ACCOUNT_APPROVED',
  OPPORTUNITY_POSTED = 'OPPORTUNITY_POSTED',
  PROFILE_UPDATED = 'PROFILE_UPDATED',
  EXPERIENCE_ADDED = 'EXPERIENCE_ADDED',
}

@Injectable()
export class ActivityService {
  constructor(private readonly neo4j: Neo4jService) { }

  async logActivity(type: ActivityType, description: string, relatedId?: string) {
    const activityId = uuidv4();
    const now = new Date().toISOString();

    await this.neo4j.run(
      `CREATE (a:Activity {
        id: $activityId,
        type: $type,
        description: $description,
        related_id: $relatedId,
        created_at: $now
      })`,
      { activityId, type, description, relatedId: relatedId || null, now }
    );
  }
}
