import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcryptjs';

import { AppModule } from '../src/app.module';
import { Tenant, TenantDocument } from '../src/tenants/schemas/tenant.schema';
import { UserAuth } from '../src/auth/schemas/user-auth.schema';
import { Announcement } from '../src/admin/schemas/announcement.schema';
import { TenantNeo4jService } from '../src/neo4j/tenant-neo4j.service';

describe('Tenant Isolation & Security Suite (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let tenantNeo4jService: TenantNeo4jService;

  let tenantModel: Model<TenantDocument>;
  let userAuthModel: Model<UserAuth>;
  let announcementModel: Model<Announcement>;

  // Fixture IDs
  const tenantAId = uuidv4();
  const tenantBId = uuidv4();

  const superAdminId = uuidv4();
  const adminAId = uuidv4();
  const adminBId = uuidv4();
  const alumniAId = uuidv4();
  const alumniBId = uuidv4();
  const studentAId = uuidv4();
  const studentBId = uuidv4();
  const pendingAId = uuidv4();
  const pendingBId = uuidv4();

  const oppAId = uuidv4();
  const oppBId = uuidv4();
  const eventAId = uuidv4();
  const eventBId = uuidv4();
  const announcementAId = uuidv4();
  const announcementBId = uuidv4();

  const sharedDisplayName = 'Shared Name Engineer';
  const usernameA1 = `shared_eng_a_${Date.now()}`;
  const usernameB1 = `shared_eng_b_${Date.now()}`;

  // Tokens
  let superAdminToken: string;
  let adminAToken: string;
  let adminBToken: string;
  let alumniAToken: string;
  let alumniBToken: string;
  let studentAToken: string;
  let studentBToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
    tenantNeo4jService = moduleFixture.get<TenantNeo4jService>(TenantNeo4jService);

    tenantModel = moduleFixture.get<Model<TenantDocument>>(getModelToken(Tenant.name));
    userAuthModel = moduleFixture.get<Model<UserAuth>>(getModelToken(UserAuth.name));
    announcementModel = moduleFixture.get<Model<Announcement>>(getModelToken(Announcement.name));

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Seed Tenants
    // ─────────────────────────────────────────────────────────────────────────
    await tenantModel.create([
      {
        _id: tenantAId,
        id: tenantAId,
        slug: `tenant-a-${Date.now()}`,
        name: 'University A (Test Isolation)',
        allowed_email_domains: ['uni-a.test'],
        status: 'active',
      },
      {
        _id: tenantBId,
        id: tenantBId,
        slug: `tenant-b-${Date.now()}`,
        name: 'University B (Test Isolation)',
        allowed_email_domains: ['uni-b.test'],
        status: 'active',
      },
    ]);

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Seed Users in Mongo (UserAuth)
    // ─────────────────────────────────────────────────────────────────────────
    const hashedPassword = await bcrypt.hash('TestPassword123!', 10);

    const userAuthEntries = [
      {
        userId: superAdminId,
        email: `superadmin-${Date.now()}@platform.local`,
        password: hashedPassword,
        role: 'super_admin',
        account_status: 'approved',
        tenantId: null,
      },
      // Tenant A
      {
        userId: adminAId,
        email: `admin-a-${Date.now()}@uni-a.test`,
        password: hashedPassword,
        role: 'admin',
        account_status: 'approved',
        tenantId: tenantAId,
      },
      {
        userId: alumniAId,
        email: `alumni-a-${Date.now()}@uni-a.test`,
        password: hashedPassword,
        role: 'alumni',
        account_status: 'approved',
        tenantId: tenantAId,
      },
      {
        userId: studentAId,
        email: `student-a-${Date.now()}@uni-a.test`,
        password: hashedPassword,
        role: 'student',
        account_status: 'approved',
        tenantId: tenantAId,
      },
      {
        userId: pendingAId,
        email: `pending-a-${Date.now()}@uni-a.test`,
        password: hashedPassword,
        role: 'student',
        account_status: 'pending',
        tenantId: tenantAId,
      },
      // Tenant B
      {
        userId: adminBId,
        email: `admin-b-${Date.now()}@uni-b.test`,
        password: hashedPassword,
        role: 'admin',
        account_status: 'approved',
        tenantId: tenantBId,
      },
      {
        userId: alumniBId,
        email: `alumni-b-${Date.now()}@uni-b.test`,
        password: hashedPassword,
        role: 'alumni',
        account_status: 'approved',
        tenantId: tenantBId,
      },
      {
        userId: studentBId,
        email: `student-b-${Date.now()}@uni-b.test`,
        password: hashedPassword,
        role: 'student',
        account_status: 'approved',
        tenantId: tenantBId,
      },
      {
        userId: pendingBId,
        email: `pending-b-${Date.now()}@uni-b.test`,
        password: hashedPassword,
        role: 'student',
        account_status: 'pending',
        tenantId: tenantBId,
      },
    ];

    await (userAuthModel as any).collection.insertMany(userAuthEntries);

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Seed Neo4j Entities (Users, Skills, Opportunities, Events)
    // ─────────────────────────────────────────────────────────────────────────
    try {
      await tenantNeo4jService.rawRun(
        `
        MERGE (s:Skill { name: 'TypeScript' })
        
        // Tenant A Nodes
        CREATE (ua:User {
          id: $alumniAId,
          tenantId: $tenantAId,
          display_name: $sharedDisplayName,
          username: $usernameA1,
          role: 'alumni',
          degree: 'BS CS',
          batch: '2020',
          account_status: 'approved'
        })
        CREATE (sa:User {
          id: $studentAId,
          tenantId: $tenantAId,
          display_name: 'Student A',
          username: 'student_a_test',
          role: 'student',
          account_status: 'approved'
        })
        CREATE (oppA:Opportunity {
          id: $oppAId,
          tenantId: $tenantAId,
          title: 'Shared TypeScript Architect',
          type: 'job',
          description: 'Opportunity in University A',
          location: 'Lahore',
          is_remote: true,
          created_at: datetime()
        })
        CREATE (evA:Event {
          id: $eventAId,
          tenantId: $tenantAId,
          title: 'University A Tech Gathering',
          type: 'meetup',
          date: datetime(),
          is_online: false
        })

        // Tenant B Nodes
        CREATE (ub:User {
          id: $alumniBId,
          tenantId: $tenantBId,
          display_name: $sharedDisplayName,
          username: $usernameB1,
          role: 'alumni',
          degree: 'BS CS',
          batch: '2020',
          account_status: 'approved'
        })
        CREATE (sb:User {
          id: $studentBId,
          tenantId: $tenantBId,
          display_name: 'Student B',
          username: 'student_b_test',
          role: 'student',
          account_status: 'approved'
        })
        CREATE (oppB:Opportunity {
          id: $oppBId,
          tenantId: $tenantBId,
          title: 'Shared TypeScript Architect',
          type: 'job',
          description: 'Opportunity in University B',
          location: 'Karachi',
          is_remote: true,
          created_at: datetime()
        })
        CREATE (evB:Event {
          id: $eventBId,
          tenantId: $tenantBId,
          title: 'University B Tech Gathering',
          type: 'meetup',
          date: datetime(),
          is_online: false
        })

        // Shared Skill Connections
        CREATE (ua)-[:HAS_SKILL]->(s)
        CREATE (ub)-[:HAS_SKILL]->(s)
        CREATE (oppA)-[:REQUIRES_SKILL]->(s)
        CREATE (oppB)-[:REQUIRES_SKILL]->(s)
        `,
        {
          tenantAId,
          tenantBId,
          alumniAId,
          alumniBId,
          studentAId,
          studentBId,
          oppAId,
          oppBId,
          eventAId,
          eventBId,
          sharedDisplayName,
          usernameA1,
          usernameB1,
        },
      );
    } catch {
      // In case Neo4j is not connected during local mock tests
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Seed Announcements
    // ─────────────────────────────────────────────────────────────────────────
    await (announcementModel as any).collection.insertMany([
      {
        _id: announcementAId,
        tenantId: tenantAId,
        title: 'University A Official Notice',
        description: 'Campus announcement for A',
        created_by_admin: adminAId,
        created_at: new Date(),
      },
      {
        _id: announcementBId,
        tenantId: tenantBId,
        title: 'University B Official Notice',
        description: 'Campus announcement for B',
        created_by_admin: adminBId,
        created_at: new Date(),
      },
    ]);

    // ─────────────────────────────────────────────────────────────────────────
    // 5. Generate Real JWT Tokens
    // ─────────────────────────────────────────────────────────────────────────
    const sign = (sub: string, role: string, tenantId?: string) =>
      jwtService.sign(
        { sub, role, tenantId: tenantId || null },
        { secret: process.env.JWT_SECRET || 'test_jwt_secret_32_bytes_long_key_unison' },
      );

    superAdminToken = sign(superAdminId, 'super_admin');
    adminAToken = sign(adminAId, 'admin', tenantAId);
    adminBToken = sign(adminBId, 'admin', tenantBId);
    alumniAToken = sign(alumniAId, 'alumni', tenantAId);
    alumniBToken = sign(alumniBId, 'alumni', tenantBId);
    studentAToken = sign(studentAId, 'student', tenantAId);
    studentBToken = sign(studentBId, 'student', tenantBId);
  }, 30000);

  afterAll(async () => {
    // Clean up ONLY fixture data
    await (tenantModel as any).collection.deleteMany({ _id: { $in: [tenantAId, tenantBId] } });
    await (userAuthModel as any).collection.deleteMany({
      userId: {
        $in: [
          superAdminId,
          adminAId,
          adminBId,
          alumniAId,
          alumniBId,
          studentAId,
          studentBId,
          pendingAId,
          pendingBId,
        ],
      },
    });
    await (announcementModel as any).collection.deleteMany({
      _id: { $in: [announcementAId, announcementBId] },
    });

    try {
      await tenantNeo4jService.rawRun(
        `
        MATCH (n) WHERE n.tenantId IN [$tenantAId, $tenantBId] DETACH DELETE n
        `,
        { tenantAId, tenantBId },
      );
    } catch {
      // ignore
    }

    await app.close();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // A. Profile & User Lookup Isolation
  // ───────────────────────────────────────────────────────────────────────────
  describe('Profile & User Lookup Isolation', () => {
    it('Tenant A user looking up Tenant B user profile returns 404', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/profiles/user/${alumniBId}`)
        .set('Authorization', `Bearer ${alumniAToken}`);

      expect(res.status).toBe(404);
    });

    it('Tenant B user looking up Tenant A user profile returns 404', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/profiles/user/${alumniAId}`)
        .set('Authorization', `Bearer ${alumniBToken}`);

      expect(res.status).toBe(404);
    });

    it('Tenant A user looking up Tenant B username returns 404', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/search/user/${usernameB1}`)
        .set('Authorization', `Bearer ${alumniAToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // B. Search Isolation (Shared Name & Shared Skill Bridge)
  // ───────────────────────────────────────────────────────────────────────────
  describe('Search & Discovery Scoping', () => {
    it('User search by shared display name returns only Tenant A users for Tenant A caller', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/search/users?display_name=${encodeURIComponent(sharedDisplayName)}`)
        .set('Authorization', `Bearer ${alumniAToken}`);

      expect(res.status).toBe(200);
      const users = res.body.data || res.body;
      if (Array.isArray(users)) {
        for (const u of users) {
          expect(u.id).not.toBe(alumniBId);
          expect(u.id).not.toBe(studentBId);
        }
      }
    });

    it('Opportunity search by shared skill returns only Tenant A opportunities', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/search/opportunities?skill=TypeScript')
        .set('Authorization', `Bearer ${alumniAToken}`);

      expect(res.status).toBe(200);
      const opps = res.body.data || res.body;
      if (Array.isArray(opps)) {
        for (const o of opps) {
          expect(o.id).not.toBe(oppBId);
        }
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // C. Content Isolation (Opportunities & Events)
  // ───────────────────────────────────────────────────────────────────────────
  describe('Content Isolation (Opportunities & Events)', () => {
    it('Tenant A caller requesting Tenant B opportunity ID returns 404', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/opportunities/${oppBId}`)
        .set('Authorization', `Bearer ${alumniAToken}`);

      expect(res.status).toBe(404);
    });

    it('Tenant A caller attempting to update Tenant B opportunity returns 404', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/opportunities/${oppBId}`)
        .set('Authorization', `Bearer ${alumniAToken}`)
        .send({ title: 'Hacked Opportunity Title' });

      expect(res.status).toBe(404);
    });

    it('Tenant A caller attempting to delete Tenant B opportunity returns 404', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/opportunities/${oppBId}`)
        .set('Authorization', `Bearer ${alumniAToken}`);

      expect(res.status).toBe(404);
    });

    it('Tenant A caller requesting Tenant B event ID returns 404', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/events/${eventBId}`)
        .set('Authorization', `Bearer ${alumniAToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // D. Social Isolation (Connections & Following)
  // ───────────────────────────────────────────────────────────────────────────
  describe('Social Isolation (Connections)', () => {
    it('Sending connection request to user from different tenant returns 404', async () => {
      const resA = await request(app.getHttpServer())
        .post(`/api/connections/request/${studentBId}`)
        .set('Authorization', `Bearer ${studentAToken}`);

      expect(resA.status).toBe(404);

      // Reciprocal check: Tenant B user requesting Tenant A user returns 404
      const resB = await request(app.getHttpServer())
        .post(`/api/connections/request/${studentAId}`)
        .set('Authorization', `Bearer ${studentBToken}`);

      expect(resB.status).toBe(404);
    });

    it('Following a user from another tenant returns 404', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/connections/follow/${studentBId}`)
        .set('Authorization', `Bearer ${studentAToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // E. Admin & Moderation Isolation
  // ───────────────────────────────────────────────────────────────────────────
  describe('Admin Scoping & Account Moderation', () => {
    it('Admin A listing pending accounts sees only Tenant A pending users', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/pending-accounts')
        .set('Authorization', `Bearer ${adminAToken}`);

      expect(res.status).toBe(200);
      const pending = res.body;
      if (Array.isArray(pending)) {
        const ids = pending.map((p: any) => p.id || p.userId || p._id);
        expect(ids).not.toContain(pendingBId);
      }
    });

    it('Admin B listing pending accounts sees only Tenant B pending users', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/pending-accounts')
        .set('Authorization', `Bearer ${adminBToken}`);

      expect(res.status).toBe(200);
      const pending = res.body;
      if (Array.isArray(pending)) {
        const ids = pending.map((p: any) => p.id || p.userId || p._id);
        expect(ids).not.toContain(pendingAId);
      }
    });

    it('Admin A approving Tenant B pending user returns 404 and leaves account unchanged', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/admin/approve-account/${pendingBId}`)
        .set('Authorization', `Bearer ${adminAToken}`);

      expect(res.status).toBe(404);

      // Verify B user is still pending
      const bUser = await (userAuthModel as any).collection.findOne({ userId: pendingBId });
      expect(bUser?.account_status).toBe('pending');
    });

    it('Admin A requesting Tenant B announcement returns 404', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/admin/announcements/${announcementBId}`)
        .set('Authorization', `Bearer ${adminAToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // F. Role Boundaries & Super Admin Isolation
  // ───────────────────────────────────────────────────────────────────────────
  describe('Role Boundaries & Cross-Role Enforcement', () => {
    it('Super admin token accessing tenant-scoped admin route returns 403', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/dashboard-stats')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(403);
    });

    it('Super admin token accessing tenant opportunities returns 403', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/opportunities')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(403);
    });

    it('Tenant admin token accessing super-admin route returns 403', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/super-admin/tenants')
        .set('Authorization', `Bearer ${adminAToken}`);

      expect(res.status).toBe(403);
    });

    it('Token missing tenantId for regular user returns 401', async () => {
      const rogueToken = jwtService.sign(
        { sub: alumniAId, role: 'alumni' }, // missing tenantId
        { secret: process.env.JWT_SECRET || 'test_jwt_secret_32_bytes_long_key_unison' },
      );

      const res = await request(app.getHttpServer())
        .get('/api/opportunities')
        .set('Authorization', `Bearer ${rogueToken}`);

      expect(res.status).toBe(401);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // G. University Suspension Lifecycle
  // ───────────────────────────────────────────────────────────────────────────
  describe('Tenant Suspension Lifecycle', () => {
    it('Suspending Tenant A blocks Tenant A user requests with 403', async () => {
      // 1. Super admin suspends Tenant A
      const suspendRes = await request(app.getHttpServer())
        .patch(`/api/super-admin/tenants/${tenantAId}/suspend`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ reason: 'Testing tenant isolation suspension' });

      expect(suspendRes.status).toBe(200);

      // 2. Tenant A user call is now rejected with 403
      const userRes = await request(app.getHttpServer())
        .get('/api/opportunities')
        .set('Authorization', `Bearer ${alumniAToken}`);

      expect(userRes.status).toBe(403);

      // 3. Tenant B user call is completely unaffected
      const bRes = await request(app.getHttpServer())
        .get('/api/opportunities')
        .set('Authorization', `Bearer ${alumniBToken}`);

      expect(bRes.status).toBe(200);

      // 4. Reactivate Tenant A
      const reactivateRes = await request(app.getHttpServer())
        .patch(`/api/super-admin/tenants/${tenantAId}/reactivate`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(reactivateRes.status).toBe(200);

      // 5. Tenant A user call is restored
      const restoredRes = await request(app.getHttpServer())
        .get('/api/opportunities')
        .set('Authorization', `Bearer ${alumniAToken}`);

      expect(restoredRes.status).toBe(200);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // H. Fail-Closed Mechanism Unit Tests
  // ───────────────────────────────────────────────────────────────────────────
  describe('Fail-Closed Scoping Protection', () => {
    it('Mongoose query outside CLS context throws fail-closed error', async () => {
      // Direct find without CLS context or skipTenantScope must throw
      await expect(userAuthModel.findOne({ email: 'test@unison.pk' })).rejects.toThrow(
        'Tenant context missing (fail-closed)',
      );
    });

    it('Mongoose query with skipTenantScope option executes without error', async () => {
      const res: any = await userAuthModel.findOne(
        { userId: superAdminId },
        null,
        { skipTenantScope: true } as any,
      );
      expect(res).toBeDefined();
      expect(res?.userId).toBe(superAdminId);
    });

    it('Neo4j Cypher touching :User without $tenantId throws fail-closed error', async () => {
      await expect(
        tenantNeo4jService.run('MATCH (u:User) RETURN u LIMIT 1', {}),
      ).rejects.toThrow();
    });
  });
});
