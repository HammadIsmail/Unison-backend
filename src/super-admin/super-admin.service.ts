import {
  Injectable,
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcryptjs';
import { Tenant, TenantDocument } from '../tenants/schemas/tenant.schema';
import { UserAuth } from '../auth/schemas/user-auth.schema';
import { TenantsService } from '../tenants/tenants.service';
import { Neo4jService } from '../neo4j/neo4j.service';
import { Activity } from '../common/activity/schemas/activity.schema';
import { ActivityType } from '../common/activity/activity.service';
import {
  CreateTenantDto,
  UpdateTenantDto,
  SuspendTenantDto,
} from './dto/super-admin.dto';

@Injectable()
export class SuperAdminService {
  private readonly logger = new Logger(SuperAdminService.name);

  constructor(
    @InjectModel(Tenant.name)
    private readonly tenantModel: Model<TenantDocument>,
    @InjectModel(UserAuth.name)
    private readonly userAuthModel: Model<UserAuth>,
    @InjectModel(Activity.name)
    private readonly activityModel: Model<Activity>,
    private readonly tenantsService: TenantsService,
    private readonly neo4j: Neo4jService,
  ) {}


  async createTenant(dto: CreateTenantDto) {
    const slug = dto.slug.toLowerCase().trim();

    // 1. Check duplicate slug
    const existingTenant = await this.tenantModel.findOne({ slug }).lean().exec();
    if (existingTenant) {
      throw new ConflictException(`A tenant with slug '${slug}' already exists.`);
    }

    // 2. Check duplicate email in UserAuth (global uniqueness)
    const adminEmail = dto.admin.email.toLowerCase().trim();
    const existingEmail = await this.userAuthModel
      .findOne({ email: adminEmail, is_deleted: { $ne: true } })
      .setOptions({ skipTenantScope: true })
      .exec();
    if (existingEmail) {
      throw new ConflictException(`An account with email '${adminEmail}' already exists.`);
    }

    // 3. Check duplicate username in Neo4j (global uniqueness)
    const adminUsername = dto.admin.username.trim();
    const existingUsername = await this.neo4j.run(
      'MATCH (u:User {username: $username}) RETURN u.id AS id',
      { username: adminUsername },
    );
    if (existingUsername.records.length > 0) {
      throw new ConflictException(`Username '${adminUsername}' is already taken.`);
    }

    const tenantId = uuidv4();
    const adminUserId = uuidv4();
    const hashedPassword = await bcrypt.hash(dto.admin.password, 10);
    const now = new Date();

    // Step A: Create Tenant in MongoDB
    let tenantCreated = false;
    let authCreated = false;
    let neo4jCreated = false;

    try {
      await this.tenantModel.create({
        id: tenantId,
        slug,
        name: dto.name.trim(),
        status: 'active',
        allowed_email_domains: dto.allowed_email_domains || [],
        logo_url: dto.logo_url,
        contact_email: dto.contact_email,
      });
      tenantCreated = true;

      // Step B: Create UserAuth in MongoDB
      await this.userAuthModel.create({
        userId: adminUserId,
        email: adminEmail,
        password: hashedPassword,
        role: 'admin',
        account_status: 'approved',
        tenantId,
      });
      authCreated = true;

      // Step C: Create Admin node in Neo4j
      await this.neo4j.run(
        `CREATE (u:User {
          id: $id,
          username: $username,
          display_name: $display_name,
          email: $email,
          role: 'admin',
          account_status: 'approved',
          tenantId: $tenantId,
          created_at: $created_at
        })`,
        {
          id: adminUserId,
          username: adminUsername,
          display_name: dto.admin.display_name.trim(),
          email: adminEmail,
          tenantId,
          created_at: now.toISOString(),
        },
      );
      neo4jCreated = true;

      // Step D: Log activity in new tenant context
      await this.activityModel.create({
        tenantId,
        type: ActivityType.USER_REGISTERED,
        description: `University tenant created with admin ${dto.admin.display_name}`,
        related_id: adminUserId,
      });

      this.tenantsService.invalidate(tenantId);

      return {
        message: 'Tenant created.',
        tenant: {
          id: tenantId,
          slug,
          name: dto.name.trim(),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to create tenant ${slug}. Initiating compensation rollback.`, error);
      // Compensation / Rollback
      if (neo4jCreated) {
        await this.neo4j
          .run('MATCH (u:User {id: $id, tenantId: $tenantId}) DETACH DELETE u', {
            id: adminUserId,
            tenantId,
          })
          .catch((e) => this.logger.error('Rollback Neo4j user failed', e));
      }
      if (authCreated) {
        await this.userAuthModel
          .deleteOne({ userId: adminUserId })
          .setOptions({ skipTenantScope: true })
          .catch((e) => this.logger.error('Rollback UserAuth failed', e));
      }
      if (tenantCreated) {
        await this.tenantModel
          .deleteOne({ id: tenantId })
          .catch((e) => this.logger.error('Rollback Tenant failed', e));
      }
      throw new InternalServerErrorException('Failed to create tenant. Transaction rolled back.');
    }
  }

  async listTenants(query: { page?: number; limit?: number; search?: string; status?: string }) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit || 20)));
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query.status) {
      filter.status = query.status;
    }
    if (query.search) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filter.$or = [{ name: searchRegex }, { slug: searchRegex }];
    }

    const total = await this.tenantModel.countDocuments(filter).exec();
    const tenants = await this.tenantModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();

    // Populate aggregate counts without exposing user PII
    const tenantIds = tenants.map((t) => t.id);
    const countsMap = await this.getTenantCountsMap(tenantIds);

    const data = tenants.map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      status: t.status,
      created_at: t.createdAt,
      counts: countsMap.get(t.id) || {
        users: 0,
        alumni: 0,
        students: 0,
        partners: 0,
        pending: 0,
      },
    }));

    return { total, page, limit, data };
  }

  async getTenant(id: string) {
    const tenant = await this.tenantModel.findOne({ id }).lean().exec();
    if (!tenant) {
      throw new NotFoundException('Tenant not found.');
    }

    const countsMap = await this.getTenantCountsMap([id]);
    const counts = countsMap.get(id) || {
      users: 0,
      alumni: 0,
      students: 0,
      partners: 0,
      pending: 0,
    };

    return {
      ...tenant,
      counts,
    };
  }

  async updateTenant(id: string, dto: UpdateTenantDto) {
    const tenant = await this.tenantModel.findOne({ id }).exec();
    if (!tenant) {
      throw new NotFoundException('Tenant not found.');
    }

    if (dto.name !== undefined) tenant.name = dto.name.trim();
    if (dto.logo_url !== undefined) tenant.logo_url = dto.logo_url;
    if (dto.contact_email !== undefined) tenant.contact_email = dto.contact_email;
    if (dto.allowed_email_domains !== undefined) tenant.allowed_email_domains = dto.allowed_email_domains;

    await tenant.save();
    this.tenantsService.invalidate(id);

    return tenant;
  }

  async suspendTenant(id: string, dto: SuspendTenantDto) {
    const tenant = await this.tenantModel.findOne({ id }).exec();
    if (!tenant) {
      throw new NotFoundException('Tenant not found.');
    }

    tenant.status = 'suspended';
    tenant.suspended_reason = dto.reason || 'Suspended by super admin';
    await tenant.save();

    this.tenantsService.invalidate(id);
    return { message: 'Tenant suspended.' };
  }

  async reactivateTenant(id: string) {
    const tenant = await this.tenantModel.findOne({ id }).exec();
    if (!tenant) {
      throw new NotFoundException('Tenant not found.');
    }

    tenant.status = 'active';
    tenant.suspended_reason = undefined;
    await tenant.save();

    this.tenantsService.invalidate(id);
    return { message: 'Tenant reactivated.' };
  }

  async getPlatformStats() {
    const totalTenants = await this.tenantModel.countDocuments().exec();
    const activeTenants = await this.tenantModel.countDocuments({ status: 'active' }).exec();
    const suspendedTenants = await this.tenantModel.countDocuments({ status: 'suspended' }).exec();

    const userStats = await this.userAuthModel
      .aggregate([
        { $match: { role: { $ne: 'super_admin' }, is_deleted: { $ne: true } } },
        { $group: { _id: '$role', count: { $sum: 1 } } },
      ])
      .exec();

    const usersByRole: Record<string, number> = {
      alumni: 0,
      student: 0,
      partner: 0,
      admin: 0,
    };
    userStats.forEach((s) => {
      if (s._id) usersByRole[s._id] = s.count;
    });

    // Opportunities & Events counts from Neo4j
    const neo4jCounts = await this.neo4j.run(
      `MATCH (o:Opportunity) WHERE o.is_deleted IS NULL OR o.is_deleted = false
       WITH count(o) AS total_opportunities
       MATCH (e:Event) WHERE e.is_deleted IS NULL OR e.is_deleted = false
       RETURN total_opportunities, count(e) AS total_events`,
    );

    const totalOpportunities = neo4jCounts.records[0]?.get('total_opportunities')?.toNumber?.() || 0;
    const totalEvents = neo4jCounts.records[0]?.get('total_events')?.toNumber?.() || 0;

    return {
      tenants: {
        total: totalTenants,
        active: activeTenants,
        suspended: suspendedTenants,
      },
      users: usersByRole,
      content: {
        total_opportunities: totalOpportunities,
        total_events: totalEvents,
      },
    };
  }

  private async getTenantCountsMap(tenantIds: string[]) {
    const map = new Map<
      string,
      { users: number; alumni: number; students: number; partners: number; pending: number }
    >();

    if (tenantIds.length === 0) return map;

    const pipeline = [
      {
        $match: {
          tenantId: { $in: tenantIds },
          is_deleted: { $ne: true },
        },
      },
      {
        $group: {
          _id: { tenantId: '$tenantId', role: '$role', status: '$account_status' },
          count: { $sum: 1 },
        },
      },
    ];

    const results = await this.userAuthModel.aggregate(pipeline).exec();

    for (const tId of tenantIds) {
      map.set(tId, { users: 0, alumni: 0, students: 0, partners: 0, pending: 0 });
    }

    for (const r of results) {
      const entry = map.get(r._id.tenantId);
      if (entry) {
        entry.users += r.count;
        if (r._id.role === 'alumni') entry.alumni += r.count;
        if (r._id.role === 'student') entry.students += r.count;
        if (r._id.role === 'partner') entry.partners += r.count;
        if (r._id.status === 'pending') entry.pending += r.count;
      }
    }

    return map;
  }
}
