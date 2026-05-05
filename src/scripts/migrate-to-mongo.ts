import * as neo4j from 'neo4j-driver';
import { MongoClient } from 'mongodb';
import * as fs from 'fs';
import * as path from 'path';

async function migrate() {
    // 1. Load Env
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
        console.log('Loading .env file...');
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

    console.log('Connecting to Neo4j...');
    const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USERNAME!, NEO4J_PASSWORD!));
    const session = driver.session();

    console.log('Connecting to MongoDB...');
    const mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    const db = mongoClient.db();

    try {
        // --- 2. Migrate Users ---
        console.log('Migrating Users...');
        const userResult = await session.run(`
            MATCH (u:User) 
            RETURN u.id AS userId, u.email AS email, u.password AS password, u.role AS role, u.account_status AS account_status
        `);

        const userAuths = userResult.records.map(r => ({
            userId: r.get('userId'),
            email: r.get('email'),
            password: r.get('password'),
            role: r.get('role'),
            account_status: r.get('account_status') || 'pending',
            createdAt: new Date(),
            updatedAt: new Date()
        }));

        if (userAuths.length > 0) {
            const userAuthCollection = db.collection('userauths');
            for (const auth of userAuths) {
                await userAuthCollection.updateOne(
                    { userId: auth.userId },
                    { $set: auth },
                    { upsert: true }
                );
            }
            console.log(`Migrated ${userAuths.length} users.`);
        }

        // --- 3. Migrate Notifications ---
        console.log('Migrating Notifications...');
        const notifResult = await session.run(`
            MATCH (n:Notification)-[:FOR]->(u:User)
            RETURN n, u.id AS recipientId
        `);

        const notifications = notifResult.records.map(r => {
            const n = r.get('n').properties;
            return {
                recipientId: r.get('recipientId'),
                message: n.message,
                type: n.type,
                is_read: n.is_read || false,
                sender_username: n.sender_username || null,
                sender_display_name: n.sender_display_name || null,
                sender_profile_picture: n.sender_profile_picture || null,
                reference_link: n.reference_link || null,
                created_at: n.created_at ? new Date(n.created_at) : new Date()
            };
        });

        if (notifications.length > 0) {
            await db.collection('notifications').insertMany(notifications);
            console.log(`Migrated ${notifications.length} notifications.`);
        }

        // --- 4. Migrate Activities ---
        console.log('Migrating Activities...');
        const activityResult = await session.run(`
            MATCH (a:Activity)
            RETURN a
        `);

        const activities = activityResult.records.map(r => {
            const a = r.get('a').properties;
            return {
                type: a.type,
                description: a.description,
                related_id: a.related_id || null,
                created_at: a.created_at ? new Date(a.created_at) : new Date()
            };
        });

        if (activities.length > 0) {
            await db.collection('activities').insertMany(activities);
            console.log(`Migrated ${activities.length} activities.`);
        }

        console.log('Migration completed successfully!');
        console.log('\nNOTE: You can now safely remove "password" and "Notification" nodes from Neo4j.');
        console.log('Run the following Cypher queries in Neo4j Browser if you wish to clean up:');
        console.log('1. MATCH (u:User) REMOVE u.password');
        console.log('2. MATCH (n:Notification) DETACH DELETE n');
        console.log('3. MATCH (a:Activity) DETACH DELETE a');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await session.close();
        await driver.close();
        await mongoClient.close();
    }
}

migrate();
