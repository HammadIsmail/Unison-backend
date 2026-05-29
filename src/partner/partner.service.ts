import { Injectable, NotFoundException } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { ActivityService, ActivityType } from '../common/activity/activity.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserAuth } from '../auth/schemas/user-auth.schema';


@Injectable()
export class PartnerService {
  constructor(
    private readonly neo4j: Neo4jService,
    private readonly cloudinary: CloudinaryService,
    private readonly activity: ActivityService,
    @InjectModel(UserAuth.name)
    private readonly userAuthModel: Model<UserAuth>,
  ) {}

  async getProfile(id: string) {
    const result = await this.neo4j.run(
      `MATCH (u:User {id: $id, role: 'partner'})
       WHERE u.is_deleted IS NULL OR u.is_deleted = false
       OPTIONAL MATCH (u)-[:CONNECTED_TO {status: 'accepted'}]-(c:User)
       WHERE c.is_deleted IS NULL OR c.is_deleted = false
       RETURN u, count(DISTINCT c) AS connections_count`,
      { id },
    );

    if (!result.records.length) {
      throw new NotFoundException('Partner profile not found.');
    }

    const record = result.records[0];
    const user = record.get('u').properties;
    const connections_count = record.get('connections_count').toNumber();

    return {
      username: user.username,
      display_name: user.display_name,
      email: user.email,
      bio: user.bio || null,
      affiliation: user.affiliation || null,
      job_title: user.job_title || null,
      phone: user.phone || null,
      linkedin_url: user.linkedin_url || null,
      profile_picture: user.profile_picture || null,
      backDropImage: user.backDropImage || null,
      connections_count,
    };
  }



  async getConnections(userId: string) {
    const result = await this.neo4j.run(
      `MATCH (u:User {id: $userId})-[r:CONNECTED_TO {status: 'accepted'}]-(c:User)
       WHERE (c.is_deleted IS NULL OR c.is_deleted = false) AND NOT c.role IN ['admin', 'moderator']
       OPTIONAL MATCH (c)-[:HAS_EXPERIENCE]->(w:WorkExperience {is_current: true})
       RETURN c.id AS id, c.display_name AS display_name, c.username AS username,
              c.profile_picture AS profile_picture, c.bio AS bio, c.backDropImage AS backDropImage,
              w.company_name AS company, w.role AS role`,
      { userId },
    );

    return result.records.map((r) => ({
      id: r.get('id'),
      display_name: r.get('display_name'),
      username: r.get('username'),
      profile_picture: r.get('profile_picture') || null,
      bio: r.get('bio') || null,
      backDropImage: r.get('backDropImage') || null,
      company: r.get('company') || null,
      role: r.get('role') || null,
    }));
  }

  async deleteAccount(userId: string) {
    const now = new Date().toISOString();

    await this.neo4j.run(
      `MATCH (u:User {id: $userId})
       SET u.is_deleted = true, u.deleted_at = $now`,
      { userId, now },
    );

    await this.userAuthModel.updateOne(
      { userId },
      { is_deleted: true, deleted_at: new Date() },
    );

    return { message: 'Your account has been soft-deleted. Historical data is preserved.' };
  }
}
