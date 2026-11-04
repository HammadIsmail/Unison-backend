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

async function createSuperAdmin() {
  loadEnv();

  const email = 'hammad@gmail.com';
  const password = 'Admin@123456';

  const mongoClient = new MongoClient(process.env.MONGODB_URI);
  await mongoClient.connect();
  const db = mongoClient.db();

  try {
    const coll = db.collection('userauths');
    const normalizedEmail = email.toLowerCase().trim();
    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date();

    const existing = await coll.findOne({ email: normalizedEmail });
    if (existing) {
      await coll.updateOne(
        { email: normalizedEmail },
        {
          $set: {
            role: 'super_admin',
            account_status: 'approved',
            password: passwordHash,
            tenantId: null,
            is_deleted: false,
            login_attempts: 0,
            login_locked_until: null,
            updatedAt: now,
          },
        }
      );
      console.log(`✅ Existing account "${normalizedEmail}" upgraded to Super Admin.`);
    } else {
      await coll.insertOne({
        userId: uuidv4(),
        email: normalizedEmail,
        password: passwordHash,
        role: 'super_admin',
        account_status: 'approved',
        tenantId: null,
        is_deleted: false,
        login_attempts: 0,
        login_locked_until: null,
        createdAt: now,
        updatedAt: now,
      });
      console.log(`✅ Super Admin created: "${normalizedEmail}".`);
    }

    console.log('Role: super_admin | Password: Admin@123456 | Access: http://localhost:5173/login -> /super-admin');
  } finally {
    await mongoClient.close();
  }
}

createSuperAdmin().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
