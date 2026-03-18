/**
 * Admin Seed Script — creates an admin user in Neo4j Aura DB
 * Run once: npx ts-node src/seed/admin.seed.ts
 */
import neo4j from 'neo4j-driver';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';

dotenv.config();

async function seed() {
    const driver = neo4j.driver(
        process.env.NEO4J_URI!,
        neo4j.auth.basic(process.env.NEO4J_USERNAME!, process.env.NEO4J_PASSWORD!),
    );
    const session = driver.session();

    const adminEmail = 'admin@uet.edu.pk';
    const adminPassword = 'Admin@1234'; // Change after first login!
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    await session.run(
        `MERGE (u:User {email: $email})
     ON CREATE SET
       u.id = $id,
       u.name = 'UNISON Admin',
       u.email = $email,
       u.password = $password,
       u.role = 'admin',
       u.account_status = 'approved',
       u.created_at = datetime()`,
        { id: uuidv4(), email: adminEmail, password: hashedPassword },
    );

    console.log(`✅ Admin user seeded: ${adminEmail} / Admin@1234`);
    console.log('⚠️  Please change the admin password after first login!');

    await session.close();
    await driver.close();
}

seed().catch(console.error);
