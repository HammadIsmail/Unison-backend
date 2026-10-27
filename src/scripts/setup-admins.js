const neo4j = require('neo4j-driver');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.resolve(__dirname, '../../.env');
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

async function setupAdmins() {
  loadEnv();

  const mongoUri = process.env.MONGODB_URI;
  const neo4jUri = process.env.NEO4J_URI;
  const neo4jUser = process.env.NEO4J_USERNAME;
  const neo4jPassword = process.env.NEO4J_PASSWORD;

  if (!mongoUri) {
    console.error('❌ Missing MONGODB_URI in environment.');
    process.exit(1);
  }

  const defaultSlug = (process.env.DEFAULT_TENANT_SLUG || 'uet-faisalabad').toLowerCase().trim();
  const defaultName = process.env.DEFAULT_TENANT_NAME || 'UET Lahore (Faisalabad Campus)';
  
  const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || 'ranahammadismail@gmail.com').toLowerCase().trim();
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'Admin@123456';
  
  const universityAdminEmail = 'admin@uet.edu.pk';
  const universityAdminPassword = 'Admin@123456';

  console.log('========================================================');
  console.log('🚀 UNISON: Initializing Tenants & Admin Accounts');
  console.log('========================================================');

  // 1. Connect MongoDB
  console.log('\n--- 1. Connecting to MongoDB ---');
  const mongoClient = new MongoClient(mongoUri);
  await mongoClient.connect();
  const db = mongoClient.db();
  console.log('✅ Connected to MongoDB successfully.');

  try {
    // 2. Ensure Default Tenant
    console.log(`\n--- 2. Checking Default Tenant: ${defaultSlug} ---`);
    const tenantsColl = db.collection('tenants');
    let defaultTenant = await tenantsColl.findOne({ slug: defaultSlug });

    let defaultTenantId;
    if (!defaultTenant) {
      defaultTenantId = uuidv4();
      await tenantsColl.insertOne({
        id: defaultTenantId,
        slug: defaultSlug,
        name: defaultName,
        status: 'active',
        allowed_email_domains: ['uet.edu.pk', 'gmail.com'],
        contact_email: superAdminEmail,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`✅ Default tenant created: "${defaultName}" (ID: ${defaultTenantId}, slug: ${defaultSlug})`);
    } else {
      defaultTenantId = defaultTenant.id;
      console.log(`ℹ️ Default tenant already exists: "${defaultTenant.name}" (ID: ${defaultTenantId})`);
    }

    // 3. Backfill collections with tenantId if un-scoped
    console.log('\n--- 3. Backfilling collections with default tenantId ---');
    const collectionsToBackfill = ['conversations', 'messages', 'notifications', 'activities', 'announcements'];
    for (const collName of collectionsToBackfill) {
      const coll = db.collection(collName);
      const res = await coll.updateMany(
        { $or: [{ tenantId: { $exists: false } }, { tenantId: null }] },
        { $set: { tenantId: defaultTenantId } }
      );
      if (res.modifiedCount > 0) {
        console.log(`  • ${collName}: backfilled ${res.modifiedCount} records.`);
      }
    }

    const userAuthColl = db.collection('userauths');
    const sharedPasswordHash = await bcrypt.hash(superAdminPassword, 10);

    // 4. Setup Super Admin
    console.log('\n--- 4. Setting up Super Admin Account ---');
    const existingSuperAdmin = await userAuthColl.findOne({ email: superAdminEmail });
    const superAdminUserId = existingSuperAdmin?.userId || uuidv4();

    if (existingSuperAdmin) {
      await userAuthColl.updateOne(
        { email: superAdminEmail },
        {
          $set: {
            role: 'super_admin',
            account_status: 'approved',
            password: sharedPasswordHash,
            tenantId: null,
            is_deleted: false,
            login_attempts: 0,
            login_locked_until: null,
            updatedAt: new Date(),
          },
        }
      );
      console.log(`✅ Existing account "${superAdminEmail}" upgraded to Super Admin with password "${superAdminPassword}".`);
    } else {
      await userAuthColl.insertOne({
        userId: superAdminUserId,
        email: superAdminEmail,
        password: sharedPasswordHash,
        role: 'super_admin',
        account_status: 'approved',
        tenantId: null,
        is_deleted: false,
        login_attempts: 0,
        login_locked_until: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`✅ Super Admin created: "${superAdminEmail}" with password "${superAdminPassword}".`);
    }

    // 5. Setup University Admin (admin@uet.edu.pk)
    console.log('\n--- 5. Setting up University Admin (Tenant Admin) ---');
    const existingUnivAdmin = await userAuthColl.findOne({ email: universityAdminEmail });
    const univAdminUserId = existingUnivAdmin?.userId || uuidv4();

    if (existingUnivAdmin) {
      await userAuthColl.updateOne(
        { email: universityAdminEmail },
        {
          $set: {
            role: 'admin',
            tenantId: defaultTenantId,
            account_status: 'approved',
            password: sharedPasswordHash,
            is_deleted: false,
            login_attempts: 0,
            login_locked_until: null,
            updatedAt: new Date(),
          },
        }
      );
      console.log(`✅ University Admin "${universityAdminEmail}" updated (Tenant: ${defaultTenantId}).`);
    } else {
      await userAuthColl.insertOne({
        userId: univAdminUserId,
        email: universityAdminEmail,
        password: sharedPasswordHash,
        role: 'admin',
        account_status: 'approved',
        tenantId: defaultTenantId,
        is_deleted: false,
        login_attempts: 0,
        login_locked_until: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`✅ University Admin created: "${universityAdminEmail}" with password "${universityAdminPassword}" (Tenant: ${defaultTenantId}).`);
    }

    // Also update existing testadmin@gmail.com with tenantId if present
    const testAdmin = await userAuthColl.findOne({ email: 'testadmin@gmail.com' });
    if (testAdmin) {
      await userAuthColl.updateOne(
        { email: 'testadmin@gmail.com' },
        {
          $set: {
            tenantId: defaultTenantId,
            role: 'admin',
            account_status: 'approved',
            password: sharedPasswordHash,
            login_attempts: 0,
            login_locked_until: null,
            updatedAt: new Date(),
          },
        }
      );
      console.log(`ℹ️ Existing testadmin@gmail.com updated with tenantId "${defaultTenantId}" and password "${superAdminPassword}".`);
    }

    // 6. Connect Neo4j (Optional / Graceful)
    console.log('\n--- 6. Syncing with Neo4j ---');
    if (neo4jUri && neo4jUser && neo4jPassword) {
      try {
        const driver = neo4j.driver(neo4jUri, neo4j.auth.basic(neo4jUser, neo4jPassword));
        const session = driver.session();

        try {
          // Sync university admin node
          await session.run(
            `MERGE (u:User {id: $userId})
             SET u.email = $email,
                 u.username = $username,
                 u.display_name = $name,
                 u.role = 'admin',
                 u.account_status = 'approved',
                 u.tenantId = $tenantId,
                 u.updated_at = datetime()
             RETURN u`,
            {
              userId: univAdminUserId,
              email: universityAdminEmail,
              username: 'admin_uet',
              name: 'UET Campus Administrator',
              tenantId: defaultTenantId,
            }
          );
          console.log(`✅ Neo4j: University admin node synced for "${universityAdminEmail}".`);
          
          if (testAdmin) {
            await session.run(
              `MERGE (u:User {id: $userId})
               SET u.email = 'testadmin@gmail.com',
                   u.username = 'testadmin',
                   u.display_name = 'Test Admin',
                   u.role = 'admin',
                   u.account_status = 'approved',
                   u.tenantId = $tenantId,
                   u.updated_at = datetime()
               RETURN u`,
              {
                userId: testAdmin.userId,
                tenantId: defaultTenantId,
              }
            );
            console.log(`✅ Neo4j: Test admin node synced for "testadmin@gmail.com".`);
          }
        } finally {
          await session.close();
          await driver.close();
        }
      } catch (neoErr) {
        console.warn(`⚠️ Neo4j sync notice: ${neoErr.message || neoErr}`);
        console.warn('   Note: Super Admin works purely via MongoDB and is ready immediately.');
        console.warn('   When Neo4j Aura is available, you can re-run this script to sync Neo4j nodes.');
      }
    }

    console.log('\n========================================================');
    console.log('🎉 Setup Completed Successfully!');
    console.log('========================================================');
    console.log('1. Super Admin Account (Platform-wide):');
    console.log(`   Email:    ${superAdminEmail}`);
    console.log(`   Password: ${superAdminPassword}`);
    console.log(`   Role:     super_admin`);
    console.log(`   Access:   http://localhost:5173/login -> /super-admin\n`);
    console.log('2. University Admin Account (Tenant-level):');
    console.log(`   Email:    ${universityAdminEmail}`);
    console.log(`   Password: ${universityAdminPassword}`);
    console.log(`   Role:     admin`);
    console.log(`   Tenant:   ${defaultName} (${defaultSlug})`);
    console.log(`   Access:   http://localhost:5173/login -> /\n`);
    console.log('3. Additional University Admin Account:');
    console.log(`   Email:    testadmin@gmail.com`);
    console.log(`   Password: ${superAdminPassword}`);
    console.log(`   Role:     admin`);
    console.log('========================================================\n');
  } finally {
    await mongoClient.close();
  }
}

setupAdmins().catch((err) => {
  console.error('Fatal error during setup:', err);
  process.exit(1);
});
