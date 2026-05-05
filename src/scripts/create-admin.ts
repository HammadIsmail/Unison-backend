import * as neo4j from 'neo4j-driver';
import { MongoClient } from 'mongodb';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

async function createAdmin() {
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

    const {
        NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD,
        MONGODB_URI
    } = process.env;

    if (!NEO4J_URI || !MONGODB_URI) {
        console.error('Missing required environment variables.');
        process.exit(1);
    }

    // Get args
    const email = process.argv[2];
    const password = process.argv[3];
    const name = process.argv[4] || 'Admin';

    if (!email || !password) {
        console.log('Usage: npx ts-node src/scripts/create-admin.ts <email> <password> [name]');
        process.exit(1);
    }

    console.log(`Creating Admin: ${email}`);

    // Connections
    const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USERNAME!, NEO4J_PASSWORD!));
    const session = driver.session();
    const mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    const db = mongoClient.db();

    try {
        const userId = uuidv4();
        const hashedPassword = await bcrypt.hash(password, 10);
        const normalizedEmail = email.toLowerCase().trim();

        // 1. Check if exists
        const existing = await db.collection('userauths').findOne({ email: normalizedEmail });
        if (existing) {
            console.error('User already exists in MongoDB.');
            process.exit(1);
        }

        // 2. Create in MongoDB
        await db.collection('userauths').insertOne({
            userId,
            email: normalizedEmail,
            password: hashedPassword,
            role: 'admin',
            account_status: 'approved',
            createdAt: new Date(),
            updatedAt: new Date()
        });
        console.log('Admin added to MongoDB.');

        // 3. Create in Neo4j
        await session.run(`
            CREATE (u:User {
                id: $userId,
                email: $email,
                name: $name,
                role: 'admin',
                account_status: 'approved',
                created_at: datetime()
            })
        `, { userId, email: normalizedEmail, name });
        console.log('Admin added to Neo4j.');

        console.log('\nAdmin account created successfully!');
        console.log(`Email: ${normalizedEmail}`);
        console.log(`Password: (as provided)`);

    } catch (error) {
        console.error('Failed to create admin:', error);
    } finally {
        await session.close();
        await driver.close();
        await mongoClient.close();
    }
}

createAdmin();
