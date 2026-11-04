const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.resolve(__dirname, '../../.env');
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf-8').split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      }
    });
  }
}

async function createTenantAdmin() {
  loadEnv();

  const email = 'rida@gmail.com';
  const password = 'Admin@1234';
  const tenantId = '60c33446-5f36-4c3f-95ff-8daa69598506';

  const mongoClient = new MongoClient(process.env.MONGODB_URI);
  await mongoClient.connect();
  const db = mongoClient.db();

  try {
    const coll = db.collection('userauths');
    const tenant = await db.collection('tenants').findOne({ id: tenantId });
    if (!tenant) {
      console.error(`❌ Tenant not found: ${tenantId}`);
      process.exit(1);
    }

    const normalizedEmail = email.toLowerCase().trim();
    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date();

    const existing = await coll.findOne({ email: normalizedEmail });
    if (existing) {
      await coll.updateOne(
        { email: normalizedEmail },
        {
          $set: {
            role: 'admin',
            account_status: 'approved',
            password: passwordHash,
            tenantId,
            is_deleted: false,
            login_attempts: 0,
            login_locked_until: null,
            updatedAt: now,
          },
        }
      );
      console.log(`✅ Existing account "${normalizedEmail}" updated as Tenant Admin.`);
    } else {
      await coll.insertOne({
        userId: uuidv4(),
        email: normalizedEmail,
        password: passwordHash,
        role: 'admin',
        account_status: 'approved',
        tenantId,
        is_deleted: false,
        login_attempts: 0,
        login_locked_until: null,
        createdAt: now,
        updatedAt: now,
      });
      console.log(`✅ Tenant Admin created: "${normalizedEmail}".`);
    }

    console.log(`Tenant: ${tenant.name} (${tenant.slug}) | ID: ${tenantId}`);
    console.log('Role: admin | Password: Admin@1234 | Access: http://localhost:5173/login -> /');

    // Optional Neo4j sync (graceful if unavailable)
    const { NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD } = process.env;
    if (NEO4J_URI && NEO4J_USERNAME && NEO4J_PASSWORD) {
      try {
        const neo4j = require('neo4j-driver');
        const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD));
        const session = driver.session();
        try {
          const userDoc = await coll.findOne({ email: normalizedEmail });
          await session.run(
            `MERGE (u:User {id: $userId})
             SET u.email = $email,
                 u.display_name = $name,
                 u.role = 'admin',
                 u.account_status = 'approved',
                 u.tenantId = $tenantId,
                 u.updated_at = datetime()
             RETURN u`,
            {
              userId: userDoc.userId,
              email: normalizedEmail,
              name: 'Rida - Tenant Admin',
              tenantId,
            }
          );
          console.log('✅ Neo4j: User node synced.');
        } finally {
          await session.close();
          await driver.close();
        }
      } catch (neoErr) {
        console.warn(`⚠️ Neo4j sync skipped: ${neoErr.message || neoErr}`);
      }
    }
  } finally {
    await mongoClient.close();
  }
}

createTenantAdmin().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
