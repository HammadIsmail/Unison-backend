/**
 * migrate-multitenant.ts
 *
 * Idempotent multi-tenant migration script:
 * 1. Creates the default tenant if missing (slug from DEFAULT_TENANT_SLUG, name from DEFAULT_TENANT_NAME)
 * 2. Backfills tenantId in MongoDB collections: userauths, conversations, messages, notifications, activities, announcements
 * 3. Backfills tenantId in Neo4j nodes: User, Opportunity, Event, WorkExperience, Education
 * 4. Creates Neo4j indexes on tenantId for tenant-owned labels
 * 5. Seeds super_admin in MongoDB UserAuth if SUPER_ADMIN_EMAIL is configured and doesn't exist
 * 6. Performs verification check asserting 0 tenant-owned records remain without tenantId
 *
 * Safe to re-run multiple times (idempotent).
 */

import * as mongoose from 'mongoose';
import neo4j from 'neo4j-driver';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      }
    });
  }
}

async function migrate() {
  loadEnv();

  const mongoUri = process.env.MONGODB_URI;
  const neo4jUri = process.env.NEO4J_URI;
  const neo4jUser = process.env.NEO4J_USERNAME;
  const neo4jPassword = process.env.NEO4J_PASSWORD;

  if (!mongoUri || !neo4jUri || !neo4jUser || !neo4jPassword) {
    console.error('❌ Missing database credentials in environment.');
    process.exit(1);
  }

  const defaultSlug = (process.env.DEFAULT_TENANT_SLUG || 'uet-faisalabad').toLowerCase().trim();
  const defaultName = process.env.DEFAULT_TENANT_NAME || 'UET Lahore (Faisalabad Campus)';
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL?.toLowerCase().trim();
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;

  console.log('========================================================');
  console.log('🚀 Starting UNISON Multi-Tenant Migration & Seed');
  console.log('========================================================');

  // 1. Connect MongoDB
  console.log('\n--- 1. Connecting to MongoDB ---');
  const conn = await mongoose.connect(mongoUri);
  const db = conn.connection.db;
  if (!db) throw new Error('MongoDB connection succeeded but db is undefined.');

  // 2. Connect Neo4j
  console.log('--- 2. Connecting to Neo4j ---');
  const driver = neo4j.driver(neo4jUri, neo4j.auth.basic(neo4jUser, neo4jPassword));
  const session = driver.session();

  try {
    // 3. Create or resolve default tenant
    console.log(`\n--- 3. Ensuring Default Tenant (${defaultSlug}) ---`);
    const tenantsColl = db.collection('tenants');
    let defaultTenant = await tenantsColl.findOne({ slug: defaultSlug });

    let defaultTenantId: string;
    if (!defaultTenant) {
      defaultTenantId = uuidv4();
      const newTenant = {
        id: defaultTenantId,
        slug: defaultSlug,
        name: defaultName,
        status: 'active',
        allowed_email_domains: ['uet.edu.pk'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await tenantsColl.insertOne(newTenant);
      console.log(`✅ Default tenant created: "${defaultName}" (ID: ${defaultTenantId}, slug: ${defaultSlug})`);
    } else {
      defaultTenantId = defaultTenant.id;
      console.log(`ℹ️ Default tenant already exists: "${defaultTenant.name}" (ID: ${defaultTenantId})`);
    }

    // 4. Backfill MongoDB Collections
    console.log('\n--- 4. Backfilling MongoDB Collections with tenantId ---');
    const mongoCollections = [
      { name: 'userauths', filter: { role: { $ne: 'super_admin' }, $or: [{ tenantId: { $exists: false } }, { tenantId: null }] } },
      { name: 'conversations', filter: { $or: [{ tenantId: { $exists: false } }, { tenantId: null }] } },
      { name: 'messages', filter: { $or: [{ tenantId: { $exists: false } }, { tenantId: null }] } },
      { name: 'notifications', filter: { $or: [{ tenantId: { $exists: false } }, { tenantId: null }] } },
      { name: 'activities', filter: { $or: [{ tenantId: { $exists: false } }, { tenantId: null }] } },
      { name: 'announcements', filter: { $or: [{ tenantId: { $exists: false } }, { tenantId: null }] } },
    ];

    for (const item of mongoCollections) {
      const coll = db.collection(item.name);
      const res = await coll.updateMany(item.filter, { $set: { tenantId: defaultTenantId } });
      console.log(`  • ${item.name}: ${res.modifiedCount} records backfilled with tenantId.`);
    }

    // 5. Backfill Neo4j Nodes
    console.log('\n--- 5. Backfilling Neo4j Nodes with tenantId ---');
    const neo4jLabels = ['User', 'Opportunity', 'Event', 'WorkExperience', 'Education'];

    for (const label of neo4jLabels) {
      const cypher = `
        MATCH (n:${label})
        WHERE n.tenantId IS NULL
        SET n.tenantId = $tenantId
        RETURN count(n) AS updatedCount
      `;
      const res = await session.run(cypher, { tenantId: defaultTenantId });
      const updated = res.records[0]?.get('updatedCount')?.toNumber?.() || 0;
      console.log(`  • Label (:${label}): ${updated} nodes backfilled with tenantId.`);
    }

    // 6. Create Neo4j Indexes on tenantId
    console.log('\n--- 6. Setting up Neo4j Indexes on tenantId ---');
    for (const label of neo4jLabels) {
      const indexName = `${label.toLowerCase()}_tenant_idx`;
      await session.run(
        `CREATE INDEX ${indexName} IF NOT EXISTS FOR (n:${label}) ON (n.tenantId)`,
      );
      console.log(`  • Index ${indexName} on :${label}(tenantId) ensured.`);
    }

    // 7. Seed Super Admin
    console.log('\n--- 7. Checking Super Admin Seed ---');
    if (superAdminEmail && superAdminPassword) {
      const userAuthColl = db.collection('userauths');
      const existingSuperAdmin = await userAuthColl.findOne({ email: superAdminEmail });

      if (!existingSuperAdmin) {
        const hashed = await bcrypt.hash(superAdminPassword, 10);
        const superAdminDoc = {
          userId: uuidv4(),
          email: superAdminEmail,
          password: hashed,
          role: 'super_admin',
          account_status: 'approved',
          tenantId: null,
          is_deleted: false,
          login_attempts: 0,
          login_locked_until: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await userAuthColl.insertOne(superAdminDoc);
        console.log(`✅ Super Admin created: ${superAdminEmail}`);
      } else {
        console.log(`ℹ️ Super Admin already exists: ${superAdminEmail}`);
      }
    } else {
      console.log('ℹ️ SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD not set. Skipping super admin seed.');
    }

    // 8. Verification Pass (Fail if any record lacks tenantId)
    console.log('\n--- 8. Verification Pass ---');
    let hasFailures = false;

    for (const item of mongoCollections) {
      const coll = db.collection(item.name);
      const remaining = await coll.countDocuments(item.filter);
      if (remaining > 0) {
        console.error(`❌ Verification failed: ${remaining} un-scoped records found in collection '${item.name}'!`);
        hasFailures = true;
      } else {
        console.log(`✅ Collection '${item.name}': 0 un-scoped records.`);
      }
    }

    for (const label of neo4jLabels) {
      const verifyRes = await session.run(
        `MATCH (n:${label}) WHERE n.tenantId IS NULL RETURN count(n) AS unScopedCount`,
      );
      const unScoped = verifyRes.records[0]?.get('unScopedCount')?.toNumber?.() || 0;
      if (unScoped > 0) {
        console.error(`❌ Verification failed: ${unScoped} un-scoped nodes found for label ':${label}'!`);
        hasFailures = true;
      } else {
        console.log(`✅ Label ':${label}': 0 un-scoped nodes.`);
      }
    }

    if (hasFailures) {
      console.error('\n❌ Migration completed with verification errors.');
      process.exit(1);
    }

    console.log('\n🎉 Multi-tenant migration and seeding completed successfully!');
    console.log('========================================================\n');
  } catch (error) {
    console.error('❌ Migration failed with error:', error);
    process.exit(1);
  } finally {
    await session.close();
    await driver.close();
    await mongoose.disconnect();
  }
}

migrate();
