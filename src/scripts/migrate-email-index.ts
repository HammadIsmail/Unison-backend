/**
 * migrate-email-index.ts
 *
 * Idempotent migration script — replaces the hard unique email index in the
 * UserAuth collection with a PARTIAL unique index that only enforces uniqueness
 * when is_deleted is not true.
 *
 * This allows email addresses to be reused after a user is soft-deleted.
 *
 * Run once (or on every deploy — it is safe to re-run):
 *   npx ts-node -r tsconfig-paths/register src/scripts/migrate-email-index.ts
 */

import * as mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';

async function migrateEmailIndex() {
  // Load env
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach((line) => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    });
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Missing MONGODB_URI environment variable.');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  const conn = await mongoose.connect(uri);
  const db = conn.connection.db;
  if (!db) throw new Error('MongoDB connection succeeded but db is undefined.');

  const collection = db.collection('userauths');

  // ── Step 1: Drop the old hard unique email index (if it exists) ────────────
  try {
    const indexes = await collection.listIndexes().toArray();
    const oldIndex = indexes.find(
      (idx) => idx.key?.email === 1 && idx.unique === true && !idx.partialFilterExpression,
    );

    if (oldIndex) {
      console.log(`Dropping old unique email index: "${oldIndex.name}"...`);
      await collection.dropIndex(oldIndex.name);
      console.log('Old index dropped.');
    } else {
      console.log('Old hard unique email index not found — skipping drop.');
    }
  } catch (err: any) {
    // Index may already be gone — safe to continue
    console.warn('Warning during index drop (safe to ignore):', err.message);
  }

  // ── Step 2: Create partial unique email index ──────────────────────────────
  // Unique only among documents where is_deleted is NOT true.
  // Soft-deleted documents (is_deleted: true) are excluded from the constraint
  // and their emails can be reused by new registrations.
  try {
    console.log('Creating partial unique email index...');
    await collection.createIndex(
      { email: 1 },
      {
        unique: true,
        // Only enforce uniqueness for active (non-deleted) documents.
        // Documents where is_deleted is true are excluded from this constraint,
        // allowing their email to be reused by a fresh registration.
        // Note: MongoDB Atlas does not support $ne in partialFilterExpression;
        // using equality { is_deleted: false } is equivalent because all active
        // accounts are created with is_deleted: false (schema default).
        partialFilterExpression: { is_deleted: false },
        name: 'email_unique_active',
      },
    );
    console.log('Partial unique email index "email_unique_active" created.');
  } catch (err: any) {
    if (err.code === 85 || err.codeName === 'IndexOptionsConflict') {
      // Index already exists with the same key — safe to skip
      console.log('Partial unique email index already exists — skipping.');
    } else {
      console.error('Failed to create partial index:', err);
      process.exit(1);
    }
  }

  await mongoose.disconnect();
  console.log('Migration complete.');
}

migrateEmailIndex();
