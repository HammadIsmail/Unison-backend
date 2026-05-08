import * as neo4j from 'neo4j-driver';
import { MongoClient } from 'mongodb';
import * as fs from 'fs';
import * as path from 'path';

async function verifyFixes() {
    // 1. Load Env
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf-8');
        envConfig.split('\n').forEach(line => {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0) {
                process.env[key.trim()] = valueParts.join('=').trim();
            }
        });
    }

    const { NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD, MONGODB_URI } = process.env;
    const driver = neo4j.driver(NEO4J_URI!, neo4j.auth.basic(NEO4J_USERNAME!, NEO4J_PASSWORD!));
    const session = driver.session();
    const mongoClient = new MongoClient(MONGODB_URI!);
    await mongoClient.connect();
    const db = mongoClient.db();

    try {
        console.log('--- Verifying Neo4j Constraints ---');
        const constraints = await session.run(`SHOW CONSTRAINTS`);
        const names = constraints.records.map(r => r.get('name'));
        console.log('Active constraints:', names);
        if (names.includes('user_id_unique')) console.log('✅ User ID constraint active');
        if (names.includes('user_username_unique')) console.log('✅ Username constraint active');

        console.log('--- Verifying Soft Delete Schema ---');
        const userAuth = await db.collection('userauths').findOne({});
        if (userAuth && userAuth.hasOwnProperty('is_deleted')) {
            console.log('✅ MongoDB Schema updated with is_deleted');
        } else {
            console.log('⚠️ MongoDB Schema not yet populated with is_deleted (this is normal for existing records)');
        }

        console.log('Verification finished.');
    } finally {
        await session.close();
        await driver.close();
        await mongoClient.close();
    }
}

verifyFixes();
