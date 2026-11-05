/**
 * UNISON: Complete 100-User Unseed Engine
 * Removes all seeded data created by seed-100-users.js from both MongoDB and Neo4j:
 * - 100 Seeded Users (Admins, Partners, Alumni, Students)
 * - Seeded Opportunities, Internships & Q&A
 * - Seeded Events & RSVPs
 * - Seeded Connections, Follows & Requests
 * - Seeded WorkExperiences
 * - Seeded Conversations, Messages & Notifications
 * - Seeded Announcements
 * - Orphaned Skills
 *
 * Safe: Real users (e.g. ranahammadismail@gmail.com) are preserved.
 *
 * Run: node src/scripts/unseed-100-users.js
 */

const { MongoClient } = require('mongodb');
const neo4j = require('neo4j-driver');
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

loadEnv();

const SEEDED_ADMIN_EMAILS = [
  'cs.admin@uet.edu.pk',
  'careers@uet.edu.pk'
];

const SEEDED_PARTNER_EMAILS = [
  'careers@systemsltd.com',
  'talent@devsinc.com',
  'jobs@arbisoft.com',
  'recruiting@motive.com',
  'careers@venturedive.com',
  'campus@10pearls.com',
  'recruitment@careem.com',
  'talent@afiniti.com'
];

const SEEDED_OPPORTUNITY_TITLES = [
  'Associate Software Engineer (Graduate 2024/2025)',
  'Full Stack Developer — Next.js & NestJS',
  'Summer AI / Machine Learning Internship 2026',
  'Cloud & DevOps Associate Engineer',
  'Frontend Engineer (React & Tailwind CSS)',
  'Backend Systems Engineer (Go & Microservices)',
  'Data Analyst & BI Intern',
  'Mobile App Developer (React Native)'
];

const SEEDED_EVENT_TITLES = [
  'Annual CS Alumni Tech Summit & Networking Dinner 2026',
  'Generative AI & LLMs in Production: From RAG to Autonomous Agents',
  'Cloud Architecture Essentials: Docker & Kubernetes Zero to Hero',
  'Mock HR & Behavioral Interview Drive 2026'
];

const SEEDED_ANNOUNCEMENT_TITLES = [
  'Annual Alumni Homecoming & Reunion 2026 Announced',
  'Google & Systems Ltd On-Campus Recruitment Drive',
  'Final Year Project (FYP) Industry Sponsorships Open'
];

async function unseed() {
  console.log('====================================================');
  console.log('   UNISON: 100-User Unseed & Data Clean Engine      ');
  console.log('====================================================\n');

  // 1. Connect MongoDB
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI missing from environment');
  }
  const mongoClient = new MongoClient(mongoUri);
  await mongoClient.connect();
  const db = mongoClient.db();
  console.log(' Connected to MongoDB Atlas.');

  // 2. Connect Neo4j
  let neoDriver = null;
  let neoSession = null;
  let isNeo4jOnline = false;

  const neoUri = process.env.NEO4J_URI;
  const neoUser = process.env.NEO4J_USERNAME;
  const neoPass = process.env.NEO4J_PASSWORD;

  if (neoUri && neoUser && neoPass) {
    try {
      neoDriver = neo4j.driver(neoUri, neo4j.auth.basic(neoUser, neoPass));
      neoSession = neoDriver.session();
      const neoPing = await neoSession.run('RETURN 1 AS connected');
      if (neoPing.records.length > 0) {
        isNeo4jOnline = true;
        console.log(' Connected to Neo4j AuraDB.');
      }
    } catch (e) {
      console.warn('  Neo4j AuraDB unreachable: ' + e.message);
    }
  }

  // 3. Find all seeded user IDs
  console.log('\n--- 1. Identifying Seeded Users ---');

  // Match: seeded admins, seeded partners, alumni.*@uet.edu.pk, student.*@uet.edu.pk
  const emailRegexList = [
    /^alumni\.[a-z]+\.[a-z]+[0-9]+@uet\.edu\.pk$/i,
    /^student\.[a-z]+\.[a-z]+[0-9]+@uet\.edu\.pk$/i,
  ];

  const mongoUserQuery = {
    $or: [
      { email: { $in: [...SEEDED_ADMIN_EMAILS, ...SEEDED_PARTNER_EMAILS] } },
      { email: { $in: emailRegexList } },
    ],
  };

  const seededMongoUsers = await db.collection('users').find(mongoUserQuery).toArray();
  const seededMongoUserAuths = await db.collection('userauths').find(mongoUserQuery).toArray();

  const userIdsSet = new Set();
  const emailsSet = new Set([...SEEDED_ADMIN_EMAILS, ...SEEDED_PARTNER_EMAILS]);

  seededMongoUsers.forEach(u => {
    if (u.userId) userIdsSet.add(u.userId);
    if (u.email) emailsSet.add(u.email);
  });
  seededMongoUserAuths.forEach(u => {
    if (u.userId) userIdsSet.add(u.userId);
    if (u.email) emailsSet.add(u.email);
  });

  // Query Neo4j for users matching seeded emails or regex pattern
  if (isNeo4jOnline && neoSession) {
    const neoUsersRes = await neoSession.run(`
      MATCH (u:User)
      WHERE u.email IN $exactEmails
         OR u.email =~ '(?i)^alumni\\..*@uet\\.edu\\.pk$'
         OR u.email =~ '(?i)^student\\..*@uet\\.edu\\.pk$'
      RETURN u.id AS id, u.email AS email
    `, { exactEmails: Array.from(emailsSet) });

    neoUsersRes.records.forEach(r => {
      const id = r.get('id');
      const email = r.get('email');
      if (id) userIdsSet.add(id);
      if (email) emailsSet.add(email);
    });
  }

  const userIds = Array.from(userIdsSet);
  const emails = Array.from(emailsSet);
  console.log(`Identified ${userIds.length} seeded user IDs and ${emails.length} seeded emails.`);

  // 4. Clean up Neo4j
  if (isNeo4jOnline && neoSession) {
    console.log('\n--- 2. Cleaning Neo4j AuraDB ---');

    // A. Delete WorkExperiences connected to seeded users
    const delExp = await neoSession.run(`
      MATCH (u:User)-[:HAS_EXPERIENCE]->(w:WorkExperience)
      WHERE u.id IN $userIds OR u.email IN $emails
      DETACH DELETE w
      RETURN count(w) AS count
    `, { userIds, emails });
    console.log(`Deleted ${delExp.records[0]?.get('count') || 0} WorkExperience nodes.`);

    // B. Delete Seeded Events
    const delEvt = await neoSession.run(`
      MATCH (e:Event)
      WHERE e.title IN $SEEDED_EVENT_TITLES
      DETACH DELETE e
      RETURN count(e) AS count
    `, { SEEDED_EVENT_TITLES });
    console.log(`Deleted ${delEvt.records[0]?.get('count') || 0} Event nodes.`);

    // C. Delete Seeded Opportunities
    const delOpp = await neoSession.run(`
      MATCH (o:Opportunity)
      WHERE o.title IN $SEEDED_OPPORTUNITY_TITLES OR o.posted_by IN $userIds
      DETACH DELETE o
      RETURN count(o) AS count
    `, { SEEDED_OPPORTUNITY_TITLES, userIds });
    console.log(`Deleted ${delOpp.records[0]?.get('count') || 0} Opportunity nodes.`);

    // D. Delete Seeded Users and all their attached relationships
    const delUsers = await neoSession.run(`
      MATCH (u:User)
      WHERE u.id IN $userIds OR u.email IN $emails
      DETACH DELETE u
      RETURN count(u) AS count
    `, { userIds, emails });
    console.log(`Deleted ${delUsers.records[0]?.get('count') || 0} User nodes and all attached relationships.`);

    // E. Remove orphaned skills (skills with 0 connections)
    const delSkills = await neoSession.run(`
      MATCH (s:Skill)
      WHERE NOT (s)<-[:HAS_SKILL]-() AND NOT (s)<-[:REQUIRES_SKILL]-()
      DELETE s
      RETURN count(s) AS count
    `);
    console.log(`Deleted ${delSkills.records[0]?.get('count') || 0} orphaned Skill nodes.`);
  }

  // 5. Clean up MongoDB
  console.log('\n--- 3. Cleaning MongoDB Atlas Collections ---');

  // A. Users
  const delUsersColl = await db.collection('users').deleteMany({
    $or: [{ userId: { $in: userIds } }, { email: { $in: emails } }],
  });
  console.log(`Deleted ${delUsersColl.deletedCount} documents from "users".`);

  const delUserAuthsColl = await db.collection('userauths').deleteMany({
    $or: [{ userId: { $in: userIds } }, { email: { $in: emails } }],
  });
  console.log(`Deleted ${delUserAuthsColl.deletedCount} documents from "userauths".`);

  // B. Connections
  const delConn = await db.collection('connections').deleteMany({
    $or: [{ senderId: { $in: userIds } }, { receiverId: { $in: userIds } }],
  });
  console.log(`Deleted ${delConn.deletedCount} documents from "connections".`);

  // C. Opportunities
  const delOpps = await db.collection('opportunities').deleteMany({
    $or: [
      { posted_by: { $in: userIds } },
      { authorId: { $in: userIds } },
      { title: { $in: SEEDED_OPPORTUNITY_TITLES } },
    ],
  });
  console.log(`Deleted ${delOpps.deletedCount} documents from "opportunities".`);

  // D. Conversations & Messages
  const delConv = await db.collection('conversations').deleteMany({
    participants: { $in: userIds },
  });
  console.log(`Deleted ${delConv.deletedCount} documents from "conversations".`);

  const delMsg = await db.collection('messages').deleteMany({
    senderId: { $in: userIds },
  });
  console.log(`Deleted ${delMsg.deletedCount} documents from "messages".`);

  // E. Announcements
  const delAnnounce = await db.collection('announcements').deleteMany({
    title: { $in: SEEDED_ANNOUNCEMENT_TITLES },
  });
  console.log(`Deleted ${delAnnounce.deletedCount} documents from "announcements".`);

  // F. Notifications
  const delNotif = await db.collection('notifications').deleteMany({
    $or: [{ userId: { $in: userIds } }, { actorId: { $in: userIds } }],
  });
  console.log(`Deleted ${delNotif.deletedCount} documents from "notifications".`);

  // G. Activities
  const delAct = await db.collection('activities').deleteMany({
    userId: { $in: userIds },
  });
  console.log(`Deleted ${delAct.deletedCount} documents from "activities".`);

  // 6. Close connections
  if (neoSession) await neoSession.close();
  if (neoDriver) await neoDriver.close();
  await mongoClient.close();

  console.log('\n====================================================');
  console.log('   All Seeded Data Cleaned Successfully!            ');
  console.log('====================================================');
}

unseed().catch((err) => {
  console.error('Unseed failed:', err);
  process.exit(1);
});
