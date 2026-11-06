/**
 * Synchronize missing users and connections from MongoDB to Neo4j AuraDB.
 */
const mongoose = require('mongoose');
const neo4j = require('neo4j-driver');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../../.env');
const content = fs.readFileSync(envPath, 'utf8');
const env = {};
content.split('\n').forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] ? match[2].trim() : '';
    value = value.replace(/^['"](.*)['"]$/, '$1');
    env[match[1]] = value;
  }
});

async function sync() {
  console.log('Connecting to MongoDB Atlas and Neo4j AuraDB...');
  await mongoose.connect(env.MONGODB_URI);
  const db = mongoose.connection.db;

  const driver = neo4j.driver(env.NEO4J_URI, neo4j.auth.basic(env.NEO4J_USERNAME, env.NEO4J_PASSWORD));
  const session = driver.session();

  const mongoUsers = await db.collection('userauths').find({ is_deleted: { $ne: true } }).toArray();
  console.log(`Found ${mongoUsers.length} active users in MongoDB.`);

  let syncedUsersCount = 0;

  for (const u of mongoUsers) {
    if (!u.userId || !u.email) continue;

    await session.run(
      `
      MERGE (user:User {id: $id})
      SET user.email = $email,
          user.username = $username,
          user.display_name = $display_name,
          user.role = $role,
          user.account_status = $account_status,
          user.tenantId = $tenantId,
          user.degree = $degree,
          user.batch = $batch,
          user.roll_number = $roll_number,
          user.semester = $semester,
          user.graduation_year = $graduation_year,
          user.profile_picture = $profile_picture,
          user.bio = $bio,
          user.phone = $phone,
          user.created_at = coalesce(user.created_at, datetime())
      `,
      {
        id: u.userId,
        email: u.email.toLowerCase().trim(),
        username: u.username || u.email.split('@')[0],
        display_name: u.display_name || u.username || 'User',
        role: u.role,
        account_status: u.account_status || 'approved',
        tenantId: u.tenantId || null,
        degree: u.degree || null,
        batch: u.batch || null,
        roll_number: u.roll_number || null,
        semester: u.semester ? neo4j.int(u.semester) : null,
        graduation_year: u.graduation_year ? neo4j.int(u.graduation_year) : null,
        profile_picture: u.profile_picture || null,
        bio: u.bio || null,
        phone: u.phone || null,
      }
    );

    // Sync skills
    if (Array.isArray(u.skills)) {
      for (const skillName of u.skills) {
        if (!skillName) continue;
        await session.run(
          `
          MERGE (s:Skill {name: $skillName})
          WITH s
          MATCH (user:User {id: $userId})
          MERGE (user)-[:HAS_SKILL]->(s)
          `,
          { skillName, userId: u.userId }
        );
      }
    }

    syncedUsersCount++;
    console.log(` Synced user: ${u.display_name || u.username} (${u.email}) [ID: ${u.userId}]`);
  }

  // Also sync accepted connections from MongoDB to Neo4j
  console.log('\n--- Syncing Connections ---');
  const mongoConns = await db.collection('connections').find({ status: 'accepted' }).toArray();
  let syncedConnsCount = 0;
  for (const conn of mongoConns) {
    if (!conn.senderId || !conn.receiverId) continue;
    const res = await session.run(
      `
      MATCH (s:User {id: $sId}), (r:User {id: $rId})
      MERGE (s)-[rel:CONNECTED_TO]->(r)
      ON CREATE SET rel.status = 'accepted', rel.created_at = datetime()
      MERGE (s)-[:FOLLOWS]->(r)
      MERGE (r)-[:FOLLOWS]->(s)
      RETURN count(rel) AS count
      `,
      { sId: conn.senderId, rId: conn.receiverId }
    );
    if (res.records[0]?.get('count')?.toNumber() > 0) {
      syncedConnsCount++;
    }
  }
  console.log(` Synced ${syncedConnsCount} accepted connections.`);

  await session.close();
  await driver.close();
  await mongoose.disconnect();

  console.log('\n===============================================');
  console.log(` Successfully synchronized ${syncedUsersCount} users to Neo4j!`);
  console.log('===============================================\n');
}

sync().catch((err) => {
  console.error('Sync failed:', err);
  process.exit(1);
});

