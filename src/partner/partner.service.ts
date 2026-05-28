import { Injectable, NotFoundException } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { ActivityService, ActivityType } from '../common/activity/activity.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserAuth } from '../auth/schemas/user-auth.schema';
import { UpdatePartnerProfileDto } from './dto/partner.dto';

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

  async updateProfile(
    userId: string,
    dto: UpdatePartnerProfileDto,
    files?: { profile_picture?: Express.Multer.File[]; backDropImage?: Express.Multer.File[] },
  ) {
    if (files?.profile_picture?.length) {
      const file = files.profile_picture[0];
      try {
        const result = await this.neo4j.run(
          `MATCH (u:User {id: $userId}) RETURN u.profile_picture AS oldPic`,
          { userId },
        );
        const oldPic = result.records[0]?.get('oldPic');
        const uploadResult = await this.cloudinary.uploadFile(file);
        dto.profile_picture = uploadResult.secure_url;
        if (oldPic) {
          const publicId = this.cloudinary.extractPublicIdFromUrl(oldPic);
          if (publicId) await this.cloudinary.deleteImage(publicId);
        }
      } catch (err) {
        console.error('[Cloudinary] Profile picture update failed:', err);
      }
    }

    if (files?.backDropImage?.length) {
      const file = files.backDropImage[0];
      try {
        const result = await this.neo4j.run(
          `MATCH (u:User {id: $userId}) RETURN u.backDropImage AS oldPic`,
          { userId },
        );
        const oldPic = result.records[0]?.get('oldPic');
        const uploadResult = await this.cloudinary.uploadFile(file);
        dto.backDropImage = uploadResult.secure_url;
        if (oldPic) {
          const publicId = this.cloudinary.extractPublicIdFromUrl(oldPic);
          if (publicId) await this.cloudinary.deleteImage(publicId);
        }
      } catch (err) {
        console.error('[Cloudinary] Backdrop image update failed:', err);
      }
    }

    const setQuery = Object.keys(dto)
      .filter((k) => dto[k as keyof UpdatePartnerProfileDto] !== undefined)
      .map((k) => `u.${k} = $${k}`)
      .join(', ');

    if (!setQuery) return { message: 'No fields to update.' };

    await this.neo4j.run(
      `MATCH (u:User {id: $userId, role: 'partner'}) SET ${setQuery} RETURN u`,
      { userId, ...dto },
    );

    const nameResult = await this.neo4j.run(
      `MATCH (u:User {id: $userId}) RETURN u.display_name AS name`,
      { userId },
    );
    const name = nameResult.records[0]?.get('name') || 'User';

    await this.activity.logActivity(
      ActivityType.PROFILE_UPDATED,
      `${name} updated their profile information`,
      userId,
    );

    return { message: 'Profile updated successfully.' };
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
