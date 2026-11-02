/**
 * UNISON: Complete 100-User Seed Engine
 * Seeds realistic multi-tenant data across MongoDB Atlas and Neo4j AuraDB:
 * - 100 Diverse Users (55 Students, 35 Alumni, 8 Partners, 2 Admins)
 * - All accounts share password: "Password@123"
 * - Dual-Database synchronization (shared UUIDs across Mongo & Neo4j)
 * - Social Graph: Accepted connections, pending requests, mutual followers
 * - Skill Graph: Canonical skills linked to users and job postings
 * - Opportunities & Internships: With embedded Q&A comments & replies
 * - Events & RSVPs: Campus & webinars with attendee RSVPs
 * - Direct Conversations & Chat messages
 * - Campus Announcements & Notifications
 *
 * Run: node src/scripts/seed-100-users.js
 */

const dns = require('node:dns');
dns.setDefaultResultOrder?.('ipv4first');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const { MongoClient } = require('mongodb');
const neo4j = require('neo4j-driver');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// ─── 1. Load Environment Variables ───────────────────────────────────────────
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

// ─── 2. Data Pools ───────────────────────────────────────────────────────────
const FIRST_NAMES = [
  'Ahmed', 'Fatima', 'Ali', 'Ayesha', 'Bilal', 'Zainab', 'Usman', 'Sara',
  'Hamza', 'Hina', 'Saad', 'Mariam', 'Taha', 'Noor', 'Zaid', 'Mahnoor',
  'Hassan', 'Sana', 'Omer', 'Anum', 'Daniyal', 'Rabia', 'Farhan', 'Mehwish',
  'Shahzaib', 'Kinza', 'Waqas', 'Areeba', 'Asad', 'Iqra', 'Khurram', 'Sidra',
  'Muneeb', 'Bushra', 'Arsalan', 'Laiba', 'Noman', 'Sadia', 'Adeel', 'Komal',
  'Umair', 'Amna', 'Junaid', 'Sobia', 'Haris', 'Rimsha', 'Talha', 'Kiran',
  'Zubair', 'Nida', 'Faisal', 'Zahra', 'Adnan', 'Samina', 'Babar', 'Farah'
];

const LAST_NAMES = [
  'Khan', 'Ismail', 'Raza', 'Malik', 'Chaudhry', 'Bhatti', 'Sheikh', 'Qureshi',
  'Siddiqui', 'Dar', 'Abbasi', 'Butt', 'Mirza', 'Javed', 'Akram', 'Tariq',
  'Anwar', 'Rashid', 'Latif', 'Mahmood', 'Iqbal', 'Sultan', 'Rehman', 'Ghafoor'
];

const DEGREES = [
  'BS Computer Science',
  'BS Software Engineering',
  'BS Data Science',
  'BS Electrical Engineering',
  'BS Information Technology'
];

const COMPANIES = [
  { name: 'Google', location: 'Mountain View, CA / Remote' },
  { name: 'Microsoft', location: 'Redmond, WA / Remote' },
  { name: 'Systems Limited', location: 'Lahore, Pakistan' },
  { name: 'DevSinc', location: 'Lahore, Pakistan' },
  { name: 'Arbisoft', location: 'Lahore, Pakistan' },
  { name: 'Motive (KeepTruckin)', location: 'Lahore / San Francisco' },
  { name: 'VentureDive', location: 'Lahore / Dubai' },
  { name: '10Pearls', location: 'Karachi / Lahore' },
  { name: 'Afiniti', location: 'Islamabad, Pakistan' },
  { name: 'NetSol Technologies', location: 'Lahore, Pakistan' },
  { name: 'Careem', location: 'Dubai / Lahore' },
  { name: 'Dubizzle Labs', location: 'Lahore, Pakistan' }
];

const ALUMNI_ROLES = [
  'Senior Software Engineer',
  'Full Stack Lead',
  'Frontend Engineer',
  'Backend Engineer',
  'DevOps Architect',
  'AI / Machine Learning Engineer',
  'Data Scientist',
  'Mobile Application Engineer',
  'Product Manager',
  'Cybersecurity Specialist'
];

const SKILLS_POOL = [
  'TypeScript', 'JavaScript', 'Node.js', 'NestJS', 'React', 'Next.js',
  'Python', 'FastAPI', 'Docker', 'Kubernetes', 'AWS', 'PostgreSQL',
  'MongoDB', 'Neo4j', 'Redis', 'GraphQL', 'TailwindCSS', 'Machine Learning',
  'Deep Learning', 'PyTorch', 'TensorFlow', 'Java', 'Spring Boot', 'C++', 'Go'
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pickN = (arr, n) => {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(n, arr.length));
};

// ─── 3. Main Seeding Engine ──────────────────────────────────────────────────
async function runSeed() {
  loadEnv();

  const mongoUri = process.env.MONGODB_URI;
  const neo4jUri = process.env.NEO4J_URI;
  const neo4jUser = process.env.NEO4J_USERNAME;
  const neo4jPassword = process.env.NEO4J_PASSWORD;

  if (!mongoUri) {
    console.error('❌ MONGODB_URI missing in .env');
    process.exit(1);
  }

  console.log('===============================================================');
  console.log('🚀 UNISON: 100-User Multi-Tenant Seeding Engine');
  console.log('===============================================================');

  // Connect MongoDB
  console.log('\n--- 1. Connecting to MongoDB Atlas ---');
  const mongoClient = new MongoClient(mongoUri);
  await mongoClient.connect();
  const db = mongoClient.db();
  console.log('✅ MongoDB Atlas connected successfully.');

  // Connect Neo4j (resilient)
  console.log('\n--- 2. Checking Neo4j AuraDB Connection ---');
  let neoSession = null;
  let neoDriver = null;
  let isNeo4jOnline = false;

  if (neo4jUri && neo4jUser && neo4jPassword) {
    try {
      neoDriver = neo4j.driver(neo4jUri, neo4j.auth.basic(neo4jUser, neo4jPassword), {
        connectionTimeout: 5000,
      });
      neoSession = neoDriver.session();
      const neoPing = await neoSession.run('RETURN 1 AS connected');
      if (neoPing.records.length > 0) {
        isNeo4jOnline = true;
        console.log('✅ Neo4j AuraDB connected successfully.');
      }
    } catch (neoErr) {
      console.warn('⚠️  Neo4j AuraDB is currently unreachable or paused in Neo4j Cloud:');
      console.warn(`    Details: ${neoErr.message}`);
      console.warn('👉 To activate graph sync in AuraDB: Visit https://console.neo4j.io and click "Resume" / "Unpause" on your instance.');
      console.warn('ℹ️  Proceeding with full MongoDB Atlas persistence (100 users, connections, opportunities, chat, announcements)...');
      if (neoSession) try { await neoSession.close(); } catch(e){}
      if (neoDriver) try { await neoDriver.close(); } catch(e){}
      neoSession = null;
      neoDriver = null;
    }
  }

  try {
    // 3. Check or create Tenant
    const defaultSlug = (process.env.DEFAULT_TENANT_SLUG || 'uet-faisalabad').toLowerCase().trim();
    const defaultName = process.env.DEFAULT_TENANT_NAME || 'UET Lahore (Faisalabad Campus)';
    const tenantsColl = db.collection('tenants');
    
    let tenant = await tenantsColl.findOne({ slug: defaultSlug });
    let tenantId;
    if (!tenant) {
      tenantId = uuidv4();
      await tenantsColl.insertOne({
        id: tenantId,
        slug: defaultSlug,
        name: defaultName,
        status: 'active',
        allowed_email_domains: ['uet.edu.pk', 'gmail.com'],
        contact_email: 'admin@uet.edu.pk',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`✅ Provisioned default tenant: "${defaultName}" (ID: ${tenantId})`);
    } else {
      tenantId = tenant.id;
      console.log(`ℹ️ Target Tenant: "${tenant.name}" (ID: ${tenantId})`);
    }

    // 4. Common password hash
    console.log('\n--- 3. Hashing universal test password: "Password@123" ---');
    const hashedPassword = bcrypt.hashSync('Password@123', 10);
    console.log('✅ Password pre-computed for high performance.');

    // 5. Generate 100 Users
    console.log('\n--- 4. Generating 100 Diverse Users ---');
    const users = [];

    // Admins (2)
    users.push({
      userId: uuidv4(),
      role: 'admin',
      account_status: 'approved',
      email: 'cs.admin@uet.edu.pk',
      username: 'cs_admin_uet',
      display_name: 'UET CS Department Admin',
      affiliation: defaultName,
      job_title: 'Department Administrator',
      skills: ['Administration', 'Academic Governance', 'Student Counseling'],
    });
    users.push({
      userId: uuidv4(),
      role: 'admin',
      account_status: 'approved',
      email: 'careers@uet.edu.pk',
      username: 'uet_careers',
      display_name: 'UET Career Placement Cell',
      affiliation: defaultName,
      job_title: 'Director Career Placement',
      skills: ['Career Placement', 'Industry Partnerships', 'Talent Scouting'],
    });

    // Industry Partners (8)
    const partnerOrgs = [
      { name: 'Systems Limited Hiring Hub', company: 'Systems Limited', email: 'careers@systemsltd.com' },
      { name: 'DevSinc Talent Acquisition', company: 'DevSinc', email: 'talent@devsinc.com' },
      { name: 'Arbisoft Engineering Recruitment', company: 'Arbisoft', email: 'jobs@arbisoft.com' },
      { name: 'Motive Talent Team', company: 'Motive', email: 'recruiting@motive.com' },
      { name: 'VentureDive People Operations', company: 'VentureDive', email: 'careers@venturedive.com' },
      { name: '10Pearls University Relations', company: '10Pearls', email: 'campus@10pearls.com' },
      { name: 'Careem Tech Recruiting', company: 'Careem', email: 'recruitment@careem.com' },
      { name: 'Afiniti Global Talent', company: 'Afiniti', email: 'talent@afiniti.com' },
    ];
    partnerOrgs.forEach((p, idx) => {
      users.push({
        userId: uuidv4(),
        role: 'partner',
        account_status: 'approved',
        email: p.email,
        username: `partner_${p.company.toLowerCase().replace(/[^a-z]/g, '')}`,
        display_name: p.name,
        affiliation: p.company,
        job_title: 'Technical Talent Acquisition Lead',
        skills: ['Technical Recruiting', 'Talent Sourcing', 'Engineering Interviewing'],
      });
    });

    // Alumni (35)
    for (let i = 1; i <= 35; i++) {
      const fName = pick(FIRST_NAMES);
      const lName = pick(LAST_NAMES);
      const company = pick(COMPANIES);
      const jobTitle = pick(ALUMNI_ROLES);
      const gradYear = 2018 + (i % 7); // 2018 to 2024
      const userSkills = pickN(SKILLS_POOL, 5);

      users.push({
        userId: uuidv4(),
        role: 'alumni',
        account_status: 'approved',
        email: `alumni.${fName.toLowerCase()}.${lName.toLowerCase()}${i}@uet.edu.pk`,
        username: `${fName.toLowerCase()}_${lName.toLowerCase()}_${gradYear}`,
        display_name: `${fName} ${lName}`,
        graduation_year: gradYear,
        batch: `${gradYear - 4}-${gradYear}`,
        degree: pick(DEGREES),
        affiliation: company.name,
        job_title: jobTitle,
        skills: userSkills,
        work_experiences: [
          {
            id: uuidv4(),
            company_name: company.name,
            role: jobTitle,
            start_date: `${gradYear + 1}-01-01`,
            end_date: null,
            is_current: true,
            employment_type: 'Full-time',
          },
          {
            id: uuidv4(),
            company_name: pick(COMPANIES).name,
            role: 'Junior Software Engineer',
            start_date: `${gradYear}-06-01`,
            end_date: `${gradYear + 1}-01-01`,
            is_current: false,
            employment_type: 'Full-time',
          },
        ],
        education: [
          {
            id: uuidv4(),
            university: defaultName,
            degree: pick(DEGREES),
            field_of_study: 'Computer Science',
            start_date: `${gradYear - 4}-09-01`,
            end_date: `${gradYear}-06-30`,
            is_current: false,
          },
        ],
      });
    }

    // Students (55)
    for (let i = 1; i <= 55; i++) {
      const fName = pick(FIRST_NAMES);
      const lName = pick(LAST_NAMES);
      const degree = pick(DEGREES);
      const semester = [2, 4, 6, 8][i % 4];
      const startYear = 2025 - Math.ceil(semester / 2);
      const endYear = startYear + 4;
      const rollSuffix = String(i).padStart(2, '0');
      const deptCode = degree.includes('Computer Science') ? 'CS' : degree.includes('Software') ? 'SE' : degree.includes('Data') ? 'DS' : 'EE';
      const userSkills = pickN(SKILLS_POOL, 4);

      users.push({
        userId: uuidv4(),
        role: 'student',
        // 50 approved, 5 pending
        account_status: i > 50 ? 'pending' : 'approved',
        email: `student.${fName.toLowerCase()}.${lName.toLowerCase()}${i}@uet.edu.pk`,
        username: `${fName.toLowerCase()}_${lName.toLowerCase()}_${deptCode.toLowerCase()}${i}`,
        display_name: `${fName} ${lName}`,
        roll_number: `${startYear}-${deptCode}-${rollSuffix}`,
        degree,
        semester,
        batch: `${startYear}-${endYear}`,
        skills: userSkills,
        education: [
          {
            id: uuidv4(),
            university: defaultName,
            degree,
            field_of_study: degree,
            start_date: `${startYear}-09-01`,
            end_date: `${endYear}-06-30`,
            is_current: true,
          },
        ],
      });
    }

    console.log(`✅ Prepared 100 test user definitions (2 Admins, 8 Partners, 35 Alumni, 55 Students).`);

    // ── Insert Users into MongoDB ───────────────────────────────────────────
    console.log('\n--- 5. Synchronizing Users into MongoDB Atlas ---');
    const usersColl = db.collection('users');
    const mongoUserDocs = users.map((u) => ({
      userId: u.userId,
      email: u.email,
      password: hashedPassword,
      role: u.role,
      account_status: u.account_status,
      tenantId: tenantId,
      username: u.username,
      display_name: u.display_name,
      roll_number: u.roll_number || null,
      degree: u.degree || null,
      semester: u.semester || null,
      batch: u.batch || null,
      graduation_year: u.graduation_year || null,
      affiliation: u.affiliation || null,
      job_title: u.job_title || null,
      profile_picture: `https://images.unsplash.com/photo-${1500000000000 + (Math.floor(Math.random() * 50000000))}?auto=format&fit=crop&w=256&h=256&q=80`,
      backDropImage: null,
      bio: `Hello! I am ${u.display_name}, ${u.role === 'alumni' ? `${u.job_title} at ${u.affiliation}` : u.role === 'student' ? `${u.degree} student (Semester ${u.semester})` : u.job_title}. Interested in networking, career development, and open source.`,
      skills: u.skills,
      detailed_skills: (u.skills || []).map((s) => ({
        id: uuidv4(),
        name: s,
        category: 'Technical',
        proficiency_level: u.role === 'alumni' ? 'Advanced' : 'Intermediate',
        years_experience: u.role === 'alumni' ? 3 : 1,
      })),
      education: u.education || [],
      work_experiences: u.work_experiences || [],
      is_deleted: false,
      login_attempts: 0,
      login_locked_until: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    for (const doc of mongoUserDocs) {
      await usersColl.updateOne(
        { email: doc.email },
        { $set: doc },
        { upsert: true }
      );
    }
    console.log(`✅ MongoDB users synchronized (${mongoUserDocs.length} accounts).`);

    // ── Insert Users into Neo4j (if online) ─────────────────────────────────
    if (isNeo4jOnline && neoSession) {
      console.log('\n--- 6. Synchronizing Users into Neo4j AuraDB ---');
      for (const u of users) {
        await neoSession.run(
          `
          MERGE (u:User {id: $id})
          SET u.username = $username,
              u.display_name = $display_name,
              u.email = $email,
              u.role = $role,
              u.account_status = $account_status,
              u.tenantId = $tenantId,
              u.roll_number = $roll_number,
              u.degree = $degree,
              u.semester = $semester,
              u.batch = $batch,
              u.graduation_year = $graduation_year,
              u.affiliation = $affiliation,
              u.job_title = $job_title,
              u.is_deleted = false,
              u.created_at = datetime()
          `,
          {
            id: u.userId,
            username: u.username,
            display_name: u.display_name,
            email: u.email,
            role: u.role,
            account_status: u.account_status,
            tenantId: tenantId,
            roll_number: u.roll_number || null,
            degree: u.degree || null,
            semester: u.semester ? neo4j.int(u.semester) : null,
            batch: u.batch || null,
            graduation_year: u.graduation_year ? neo4j.int(u.graduation_year) : null,
            affiliation: u.affiliation || null,
            job_title: u.job_title || null,
          }
        );

        for (const skillName of u.skills || []) {
          await neoSession.run(
            `
            MERGE (s:Skill {name: $skillName})
            WITH s
            MATCH (u:User {id: $userId})
            MERGE (u)-[:HAS_SKILL]->(s)
            `,
            { skillName, userId: u.userId }
          );
        }

        if (u.work_experiences) {
          for (const exp of u.work_experiences) {
            await neoSession.run(
              `
              MATCH (u:User {id: $userId})
              CREATE (w:WorkExperience {
                id: $expId,
                tenantId: $tenantId,
                company_name: $company_name,
                role: $role,
                start_date: $start_date,
                is_current: $is_current
              })
              CREATE (u)-[:HAS_EXPERIENCE]->(w)
              `,
              {
                userId: u.userId,
                expId: exp.id,
                tenantId,
                company_name: exp.company_name,
                role: exp.role,
                start_date: exp.start_date,
                is_current: exp.is_current,
              }
            );
          }
        }
      }
      console.log('✅ Neo4j AuraDB users and graph nodes synchronized.');
    }

    // ── Generate Social Connections ─────────────────────────────────────────
    console.log('\n--- 7. Generating Social Graph (Connections & Requests) ---');
    const connectionsColl = db.collection('connections');
    const studentUsers = users.filter((u) => u.role === 'student' && u.account_status === 'approved');
    const alumniUsers = users.filter((u) => u.role === 'alumni');
    const partnerUsers = users.filter((u) => u.role === 'partner');

    let acceptedConnsCount = 0;
    let pendingConnsCount = 0;

    // Student to Alumni Connections
    for (let i = 0; i < studentUsers.length; i++) {
      const student = studentUsers[i];
      const mentors = pickN(alumniUsers, 2);
      for (const mentor of mentors) {
        const connId = uuidv4();
        await connectionsColl.updateOne(
          {
            $or: [
              { senderId: student.userId, receiverId: mentor.userId },
              { senderId: mentor.userId, receiverId: student.userId },
            ],
          },
          {
            $setOnInsert: {
              connectionId: connId,
              tenantId,
              senderId: student.userId,
              receiverId: mentor.userId,
              status: 'accepted',
              created_at: new Date(Date.now() - (10 * 86400000)),
              accepted_at: new Date(Date.now() - (9 * 86400000)),
            },
          },
          { upsert: true }
        );

        if (isNeo4jOnline && neoSession) {
          await neoSession.run(
            `
            MATCH (s:User {id: $sId}), (m:User {id: $mId})
            MERGE (s)-[r:CONNECTED_TO]->(m)
            ON CREATE SET r.status = 'accepted', r.created_at = datetime()
            MERGE (s)-[:FOLLOWS]->(m)
            MERGE (m)-[:FOLLOWS]->(s)
            `,
            { sId: student.userId, mId: mentor.userId }
          );
        }
        acceptedConnsCount++;
      }
    }

    // Student to Student Connections
    for (let i = 0; i < 20; i++) {
      const [s1, s2] = pickN(studentUsers, 2);
      if (s1 && s2 && s1.userId !== s2.userId) {
        const connId = uuidv4();
        await connectionsColl.updateOne(
          {
            $or: [
              { senderId: s1.userId, receiverId: s2.userId },
              { senderId: s2.userId, receiverId: s1.userId },
            ],
          },
          {
            $setOnInsert: {
              connectionId: connId,
              tenantId,
              senderId: s1.userId,
              receiverId: s2.userId,
              status: 'accepted',
              created_at: new Date(),
              accepted_at: new Date(),
            },
          },
          { upsert: true }
        );

        if (isNeo4jOnline && neoSession) {
          await neoSession.run(
            `
            MATCH (u1:User {id: $id1}), (u2:User {id: $id2})
            MERGE (u1)-[r:CONNECTED_TO]->(u2)
            ON CREATE SET r.status = 'accepted', r.created_at = datetime()
            MERGE (u1)-[:FOLLOWS]->(u2)
            MERGE (u2)-[:FOLLOWS]->(u1)
            `,
            { id1: s1.userId, id2: s2.userId }
          );
        }
        acceptedConnsCount++;
      }
    }

    // Pending Requests
    for (let i = 0; i < 15; i++) {
      const student = pick(studentUsers);
      const target = pick([...alumniUsers, ...partnerUsers]);
      if (student && target && student.userId !== target.userId) {
        const connId = uuidv4();
        await connectionsColl.updateOne(
          {
            $or: [
              { senderId: student.userId, receiverId: target.userId },
              { senderId: target.userId, receiverId: student.userId },
            ],
          },
          {
            $setOnInsert: {
              connectionId: connId,
              tenantId,
              senderId: student.userId,
              receiverId: target.userId,
              status: 'pending',
              created_at: new Date(),
              accepted_at: null,
            },
          },
          { upsert: true }
        );

        if (isNeo4jOnline && neoSession) {
          await neoSession.run(
            `
            MATCH (s:User {id: $sId}), (t:User {id: $tId})
            MERGE (s)-[r:CONNECTED_TO]->(t)
            ON CREATE SET r.status = 'pending', r.created_at = datetime()
            `,
            { sId: student.userId, tId: target.userId }
          );
        }
        pendingConnsCount++;
      }
    }
    console.log(`✅ Social Graph seeded: ${acceptedConnsCount} accepted connections, ${pendingConnsCount} pending requests.`);

    // ── Generate Career Opportunities & Inquiries ───────────────────────────
    console.log('\n--- 8. Generating Opportunities, Internships & Q&A ---');
    const oppsColl = db.collection('opportunities');
    const OPPORTUNITY_TEMPLATES = [
      {
        title: 'Associate Software Engineer (Graduate 2024/2025)',
        type: 'Job',
        description: 'We are seeking passionate fresh graduates with strong foundations in Data Structures, OOP, and modern Web frameworks (React, NestJS, Node.js). Excellent mentorship provided.',
        requirements: 'BS in Computer Science or Software Engineering. Problem solving skills and hands-on portfolio projects.',
        is_remote: false,
        skills: ['TypeScript', 'Node.js', 'React', 'PostgreSQL'],
      },
      {
        title: 'Full Stack Developer — Next.js & NestJS',
        type: 'Job',
        description: 'Build enterprise-scale cloud SaaS products using Next.js 14, NestJS, and GraphQL. You will collaborate with distributed international teams.',
        requirements: '1-3 years experience or outstanding portfolio. Strong proficiency in TypeScript, Docker, and RESTful APIs.',
        is_remote: true,
        skills: ['Next.js', 'NestJS', 'GraphQL', 'Docker', 'MongoDB'],
      },
      {
        title: 'Summer AI / Machine Learning Internship 2026',
        type: 'Internship',
        description: 'Exciting 3-month paid summer internship working on LLMs, Retrieval Augmented Generation (RAG), and PyTorch model fine-tuning.',
        requirements: 'Enrolled in 6th or 8th semester of BS Computer Science or Data Science. Familiarity with Python and PyTorch.',
        is_remote: false,
        skills: ['Python', 'Machine Learning', 'PyTorch', 'FastAPI'],
      },
      {
        title: 'Cloud & DevOps Associate Engineer',
        type: 'Job',
        description: 'Automate CI/CD pipelines, manage Kubernetes clusters, and scale AWS cloud infrastructure for high-throughput microservices.',
        requirements: 'Solid understanding of Linux internals, Docker containers, Kubernetes, and AWS fundamentals.',
        is_remote: false,
        skills: ['Docker', 'Kubernetes', 'AWS', 'Python'],
      },
      {
        title: 'Frontend Engineer (React & Tailwind CSS)',
        type: 'Job',
        description: 'Design responsive, accessible, and fast web experiences using modern React, Tailwind CSS, and state management.',
        requirements: 'Proficiency in modern JavaScript/TypeScript, CSS grid/flexbox, and client-side performance optimization.',
        is_remote: true,
        skills: ['React', 'JavaScript', 'TailwindCSS', 'TypeScript'],
      },
      {
        title: 'Backend Systems Engineer (Go & Microservices)',
        type: 'Job',
        description: 'Join our core platform engineering team building low-latency message streaming pipelines with Go and Redis.',
        requirements: 'Experience with concurrent programming, distributed storage, and Redis caching architectures.',
        is_remote: true,
        skills: ['Go', 'Redis', 'PostgreSQL', 'Docker'],
      },
      {
        title: 'Data Analyst & BI Intern',
        type: 'Internship',
        description: 'Extract business insights, build dashboard visualizations in PowerBI/Tableau, and write advanced analytical SQL queries.',
        requirements: 'Strong SQL skills, Python for data analysis (Pandas/NumPy), and clear communication.',
        is_remote: false,
        skills: ['Python', 'PostgreSQL', 'Data Science'],
      },
      {
        title: 'Mobile App Developer (React Native)',
        type: 'Job',
        description: 'Develop and maintain cross-platform iOS and Android applications used by millions of active daily users.',
        requirements: 'Experience with React Native, Redux/Zustand, native modules, and mobile UI design guidelines.',
        is_remote: false,
        skills: ['React', 'JavaScript', 'TypeScript'],
      },
    ];

    const allPosters = [...alumniUsers, ...partnerUsers];
    let createdOppsCount = 0;

    for (let i = 0; i < 20; i++) {
      const template = OPPORTUNITY_TEMPLATES[i % OPPORTUNITY_TEMPLATES.length];
      const poster = pick(allPosters);
      const company = poster.affiliation || 'Tech Innovations Inc.';
      const oppId = uuidv4();
      const student1 = pick(studentUsers);
      const student2 = pick(studentUsers);

      const comments = [
        {
          id: uuidv4(),
          userId: student1.userId,
          display_name: student1.display_name,
          username: student1.username,
          profile_picture: `https://images.unsplash.com/photo-${1500000000000 + i}?auto=format&fit=crop&w=256&h=256&q=80`,
          role: 'student',
          content: 'Is this position eligible for students currently in their final semester graduating this summer?',
          created_at: new Date(Date.now() - 3600000 * 5),
          replies: [
            {
              id: uuidv4(),
              userId: poster.userId,
              display_name: poster.display_name,
              username: poster.username,
              profile_picture: null,
              role: poster.role,
              content: 'Yes, absolutely! 2025/2026 graduates are encouraged to apply. Please mention your graduation month in your application.',
              created_at: new Date(Date.now() - 3600000 * 2),
            },
          ],
        },
        {
          id: uuidv4(),
          userId: student2.userId,
          display_name: student2.display_name,
          username: student2.username,
          profile_picture: null,
          role: 'student',
          content: 'What is the interview process like? Are there live coding assessments?',
          created_at: new Date(Date.now() - 3600000 * 1),
          replies: [],
        },
      ];

      await oppsColl.updateOne(
        { opportunityId: oppId },
        {
          $setOnInsert: {
            opportunityId: oppId,
            tenantId,
            userId: poster.userId,
            title: template.title,
            type: template.type,
            description: template.description,
            requirements: template.requirements,
            location: template.is_remote ? 'Remote' : (poster.affiliation?.includes('Islamabad') ? 'Islamabad' : 'Lahore, Pakistan'),
            is_remote: template.is_remote,
            deadline: '2026-12-31',
            company_name: company,
            apply_link: `https://${company.toLowerCase().replace(/[^a-z]/g, '')}.com/careers/apply-${oppId.slice(0, 8)}`,
            status: 'open',
            required_skills: template.skills,
            media: [`https://images.unsplash.com/photo-${1510000000000 + (i * 100000)}?auto=format&fit=crop&w=800&q=80`],
            comments,
            is_deleted: false,
            posted_at: new Date(Date.now() - (i * 86400000)),
            created_at: new Date(Date.now() - (i * 86400000)),
            updated_at: new Date(),
          },
        },
        { upsert: true }
      );

      if (isNeo4jOnline && neoSession) {
        await neoSession.run(
          `
          MATCH (u:User {id: $posterId})
          CREATE (o:Opportunity {
            id: $oppId,
            tenantId: $tenantId,
            title: $title,
            description: $description,
            type: $type,
            company_name: $company_name,
            location: $location,
            is_remote: $is_remote,
            deadline: $deadline,
            status: 'open',
            is_deleted: false,
            posted_at: datetime()
          })
          CREATE (u)-[:POSTED]->(o)
          `,
          {
            posterId: poster.userId,
            oppId,
            tenantId,
            title: template.title,
            description: template.description,
            type: template.type,
            company_name: company,
            location: template.is_remote ? 'Remote' : 'Lahore, Pakistan',
            is_remote: template.is_remote,
            deadline: '2026-12-31',
          }
        );

        for (const skill of template.skills) {
          await neoSession.run(
            `
            MERGE (s:Skill {name: $skill})
            WITH s
            MATCH (o:Opportunity {id: $oppId})
            MERGE (o)-[:REQUIRES_SKILL]->(s)
            `,
            { skill, oppId }
          );
        }
      }

      createdOppsCount++;
    }
    console.log(`✅ Seeded ${createdOppsCount} career opportunities with skills and inquiries.`);

    // ── Generate Campus & Virtual Events ────────────────────────────────────
    console.log('\n--- 9. Generating Campus & Virtual Events ---');
    const EVENTS_DATA = [
      {
        title: 'Annual CS Alumni Tech Summit & Networking Dinner 2026',
        type: 'reunion',
        description: 'Join distinguished alumni from Google, Microsoft, and leading Pakistani tech firms for an evening of panel discussions, keynote talks, and networking with graduating students.',
        date: '2026-11-20T18:00:00Z',
        is_online: false,
        location: 'UET Main Auditorium, Faisalabad Campus',
        max_attendees: 150,
      },
      {
        title: 'Cracking the Technical Coding Interview: Graph & Dynamic Programming',
        type: 'workshop',
        description: 'Hands-on interactive masterclass led by Senior Engineers. We will solve top LeetCode patterns live and review clean code standards.',
        date: '2026-11-25T15:00:00Z',
        is_online: true,
        meeting_link: 'https://meet.google.com/uet-tech-interview',
        max_attendees: 200,
      },
      {
        title: 'Generative AI & LLMs in Production: From RAG to Autonomous Agents',
        type: 'webinar',
        description: 'Deep dive into production architectures using Vector Databases, embeddings, and LangChain/LlamaIndex. Hosted by UET AI Research alumni.',
        date: '2026-12-05T17:00:00Z',
        is_online: true,
        meeting_link: 'https://meet.google.com/uet-ai-masterclass',
        max_attendees: 250,
      },
      {
        title: 'Cloud Architecture Essentials: Docker & Kubernetes Zero to Hero',
        type: 'workshop',
        description: 'Learn container orchestration from scratch, deploy microservices, and manage Kubernetes ingress controllers live on AWS.',
        date: '2026-12-12T14:00:00Z',
        is_online: true,
        meeting_link: 'https://meet.google.com/uet-cloud-k8s',
        max_attendees: 100,
      },
      {
        title: 'Mock HR & Behavioral Interview Drive 2026',
        type: 'workshop',
        description: 'One-on-one 20-minute mock interviews with corporate recruiters from Systems Ltd, DevSinc, and Arbisoft with actionable feedback on your resume.',
        date: '2026-12-18T10:00:00Z',
        is_online: false,
        location: 'CS Department Seminar Hall',
        max_attendees: 60,
      },
    ];

    if (isNeo4jOnline && neoSession) {
      for (const evt of EVENTS_DATA) {
        const eventId = uuidv4();
        const host = pick(alumniUsers);

        await neoSession.run(
          `
          MATCH (h:User {id: $hostId})
          CREATE (e:Event {
            id: $eventId,
            tenantId: $tenantId,
            title: $title,
            description: $description,
            type: $type,
            date: datetime($date),
            is_online: $is_online,
            location: $location,
            meeting_link: $meeting_link,
            max_attendees: $max_attendees,
            banner_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1000&q=80',
            created_at: datetime(),
            is_deleted: false
          })
          CREATE (h)-[:CREATED_EVENT]->(e)
          `,
          {
            hostId: host.userId,
            eventId,
            tenantId,
            title: evt.title,
            description: evt.description,
            type: evt.type,
            date: evt.date,
            is_online: evt.is_online,
            location: evt.location || null,
            meeting_link: evt.meeting_link || null,
            max_attendees: neo4j.int(evt.max_attendees),
          }
        );

        const attendees = pickN(studentUsers, 12);
        for (const att of attendees) {
          await neoSession.run(
            `
            MATCH (u:User {id: $userId}), (e:Event {id: $eventId})
            MERGE (u)-[r:RSVP]->(e)
            ON CREATE SET r.status = 'attending', r.created_at = datetime()
            `,
            { userId: att.userId, eventId }
          );
        }
      }
      console.log(`✅ Seeded ${EVENTS_DATA.length} events with RSVPs in Neo4j.`);
    }

    // ── Generate 1-on-1 Chat Conversations & Messages ───────────────────────
    console.log('\n--- 10. Generating Direct Conversations & Chat History ---');
    const convColl = db.collection('conversations');
    const msgColl = db.collection('messages');

    const sampleConvs = [
      {
        s: studentUsers[0],
        a: alumniUsers[0],
        messages: [
          { from: 'student', text: 'Hi! I saw your profile and noticed you are working at Google as a Senior Software Engineer. Could I ask for some guidance on preparing for technical interviews?' },
          { from: 'alumni', text: 'Hey! Absolutely. I am glad to help. Are you focusing more on Data Structures or System Design at the moment?' },
          { from: 'student', text: 'Currently focusing on LeetCode Mediums (Arrays, Binary Trees, and Graphs). Do you recommend practicing on specific problem sets?' },
          { from: 'alumni', text: 'Yes, start with the Blind 75 and NeetCode 150 roadmaps. Make sure you understand the time and space complexity tradeoffs before coding.' },
        ],
      },
      {
        s: studentUsers[1],
        a: alumniUsers[1],
        messages: [
          { from: 'student', text: 'Hello! I am a final-year software engineering student. Are there any openings at Systems Limited for backend roles?' },
          { from: 'alumni', text: 'Hello! Yes, our department is actively hiring Associate Software Engineers. Send me your resume and I will gladly submit an internal referral for you.' },
          { from: 'student', text: 'That would be incredible! Thank you so much. I will review and send my updated PDF.' },
        ],
      },
      {
        s: studentUsers[2],
        a: partnerUsers[0],
        messages: [
          { from: 'partner', text: 'Hi! We reviewed your profile and noticed your strong projects in React and NestJS. We have an upcoming Graduate Bootcamp and would love to invite you to interview.' },
          { from: 'student', text: 'Thank you for reaching out! I would be thrilled to participate. When does the interview process begin?' },
          { from: 'partner', text: 'Our technical screening round starts next Monday. Check your university email for the calendar invitation.' },
        ],
      },
    ];

    for (const convData of sampleConvs) {
      const p1 = convData.s.userId;
      const p2 = convData.a.userId;

      const createdConv = await convColl.insertOne({
        tenantId,
        participants: [p1, p2],
        clearedAt: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      let lastMsgId = null;
      for (const m of convData.messages) {
        const senderId = m.from === 'student' ? p1 : p2;
        const msgRes = await msgColl.insertOne({
          tenantId,
          conversationId: createdConv.insertedId,
          senderId,
          content: m.text,
          messageType: 'text',
          isRead: true,
          readAt: new Date(),
          isEdited: false,
          isDeleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        lastMsgId = msgRes.insertedId;
      }

      if (lastMsgId) {
        await convColl.updateOne(
          { _id: createdConv.insertedId },
          { $set: { lastMessage: lastMsgId } }
        );
      }
    }
    console.log(`✅ Seeded direct messaging threads and chat logs.`);

    // ── Generate Campus Announcements ───────────────────────────────────────
    console.log('\n--- 11. Generating Campus Announcements ---');
    const announceColl = db.collection('announcements');
    const adminUser = users.find((u) => u.role === 'admin');

    const ANNOUNCEMENTS = [
      {
        title: 'Annual Campus Placement Drive 2026 Announced',
        description: 'The Career Placement Cell is pleased to announce that over 30 leading software and engineering companies will be visiting UET Faisalabad Campus for on-campus interviews starting next month. All final-year students must verify their profiles and upload current resumes.',
        event_date: '2026-11-30',
        media_type: 'image',
        media_url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1000&q=80',
      },
      {
        title: 'Final Year Project (FYP) Exhibition & Industry Awards',
        description: 'Registration for the FYP Expo 2026 is now officially open! Top projects will be evaluated by industry judges and rewarded with cash prizes and direct recruitment fast-tracks.',
        event_date: '2026-12-15',
        media_type: 'image',
        media_url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1000&q=80',
      },
      {
        title: 'Alumni Mentorship Program — Batch of 2026 Registration',
        description: 'Connect with seasoned graduates working at Fortune 500 companies. Applications for 1-on-1 mentorship pairings close this Friday. Go to your Network tab to explore mentors.',
        event_date: '2026-11-15',
        media_type: 'image',
        media_url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1000&q=80',
      },
    ];

    for (const ann of ANNOUNCEMENTS) {
      await announceColl.insertOne({
        tenantId,
        title: ann.title,
        description: ann.description,
        event_date: ann.event_date,
        media_url: ann.media_url,
        media_type: ann.media_type,
        created_by_admin: adminUser.userId,
        created_at: new Date(),
      });
    }
    console.log(`✅ Seeded ${ANNOUNCEMENTS.length} campus announcements.`);

    // ── Generate Sample Notifications ───────────────────────────────────────
    console.log('\n--- 12. Generating In-App Notifications ---');
    const notifColl = db.collection('notifications');
    const sampleStudent = studentUsers[0];
    const sampleAlumni = alumniUsers[0];

    await notifColl.insertMany([
      {
        tenantId,
        recipientId: sampleStudent.userId,
        message: `${sampleAlumni.display_name} accepted your connection request.`,
        type: 'connection_accepted',
        is_read: false,
        sender_username: sampleAlumni.username,
        sender_display_name: sampleAlumni.display_name,
        sender_profile_picture: null,
        reference_link: '/network',
        created_at: new Date(),
      },
      {
        tenantId,
        recipientId: sampleStudent.userId,
        message: 'New campus announcement: Annual Campus Placement Drive 2026 Announced.',
        type: 'announcement',
        is_read: true,
        reference_link: '/feed',
        created_at: new Date(Date.now() - 3600000),
      },
      {
        tenantId,
        recipientId: sampleAlumni.userId,
        message: `${sampleStudent.display_name} sent you a connection request.`,
        type: 'connection_request',
        is_read: false,
        sender_username: sampleStudent.username,
        sender_display_name: sampleStudent.display_name,
        reference_link: '/network/requests',
        created_at: new Date(),
      },
    ]);
    console.log('✅ Seeded in-app notifications.');

    // ── Final Verification & Summary ────────────────────────────────────────
    console.log('\n===============================================================');
    console.log('🎉 SEEDING COMPLETED SUCCESSFULLY!');
    console.log('===============================================================');

    const totalMongoUsers = await usersColl.countDocuments({ tenantId });
    const totalConns = await connectionsColl.countDocuments({ tenantId });
    const totalOpps = await oppsColl.countDocuments({ tenantId });
    const totalConvs = await convColl.countDocuments({ tenantId });

    console.log(`\n📊 DATABASE SUMMARY FOR TENANT: "${defaultName}"`);
    console.log(`---------------------------------------------------------------`);
    console.log(`• MongoDB Total Users:           ${totalMongoUsers}`);
    console.log(`• MongoDB Active Connections:    ${totalConns}`);
    console.log(`• MongoDB Opportunities:         ${totalOpps}`);
    console.log(`• MongoDB Chat Conversations:    ${totalConvs}`);
    if (isNeo4jOnline && neoSession) {
      const totalNeoUsers = await neoSession.run('MATCH (u:User {tenantId: $tenantId}) RETURN count(u) AS count', { tenantId });
      console.log(`• Neo4j Graph Users:             ${totalNeoUsers.records[0].get('count').toString()}`);
    } else {
      console.log(`• Neo4j Aura Graph:              [Currently Paused in Cloud]`);
    }

    console.log(`\n🔑 SAMPLE LOGIN CREDENTIALS (All use password: "Password@123")`);
    console.log(`---------------------------------------------------------------`);
    console.log(`1. Campus Admin:        cs.admin@uet.edu.pk`);
    console.log(`2. Corporate Partner:   careers@systemsltd.com`);
    console.log(`3. Active Alumni:       ${alumniUsers[0].email} (${alumniUsers[0].affiliation})`);
    console.log(`4. Enrolled Student:    ${studentUsers[0].email} (${studentUsers[0].roll_number})`);
    console.log(`---------------------------------------------------------------`);
    console.log(`👉 You can log into any of these accounts in your frontend now!`);

  } catch (error) {
    console.error('❌ Seeding failed with error:', error);
  } finally {
    if (neoSession) try { await neoSession.close(); } catch(e){}
    if (neoDriver) try { await neoDriver.close(); } catch(e){}
    await mongoClient.close();
  }
}

runSeed();
