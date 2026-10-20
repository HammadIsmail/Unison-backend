import * as neo4j from 'neo4j-driver';
import * as fs from 'fs';
import * as path from 'path';

async function initNeo4j() {
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
        NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD
    } = process.env;

    if (!NEO4J_URI) {
        console.error('Missing required NEO4J_URI environment variable.');
        process.exit(1);
    }

    console.log('Connecting to Neo4j...');
    const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USERNAME!, NEO4J_PASSWORD!));
    const session = driver.session();

    try {
        console.log('--- Setting up Constraints ---');
        
        // User Uniqueness
        console.log('Creating uniqueness constraint on User(id)...');
        await session.run(`CREATE CONSTRAINT user_id_unique IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE`);
        
        console.log('Creating uniqueness constraint on User(username)...');
        await session.run(`CREATE CONSTRAINT user_username_unique IF NOT EXISTS FOR (u:User) REQUIRE u.username IS UNIQUE`);

        console.log('Creating uniqueness constraint on User(email)...');
        // NOTE: Email uniqueness for active users is enforced in MongoDB via a partial
        // unique index (migrate-email-index.ts). Neo4j does NOT support partial constraints,
        // so we only keep a range index here for query performance.
        await session.run(`CREATE INDEX user_email_idx IF NOT EXISTS FOR (u:User) ON (u.email)`);

        console.log('Creating range index on User(is_deleted) for soft-delete filtering...');
        await session.run(`CREATE INDEX user_is_deleted_idx IF NOT EXISTS FOR (u:User) ON (u.is_deleted)`);

        // Opportunity Uniqueness
        console.log('Creating uniqueness constraint on Opportunity(id)...');
        await session.run(`CREATE CONSTRAINT opportunity_id_unique IF NOT EXISTS FOR (o:Opportunity) REQUIRE o.id IS UNIQUE`);

        // Skill Uniqueness
        console.log('Creating uniqueness constraint on Skill(name)...');
        await session.run(`CREATE CONSTRAINT skill_name_unique IF NOT EXISTS FOR (s:Skill) REQUIRE s.name IS UNIQUE`);

        console.log('--- Setting up Full-Text Indices ---');
        
        // Full-text index for User search
        console.log('Creating full-text index for User profiles...');
        await session.run(`
            CREATE FULLTEXT INDEX user_search_index IF NOT EXISTS 
            FOR (n:User) 
            ON EACH [n.username, n.display_name, n.bio]
        `);

        // Full-text index for Opportunity search
        console.log('Creating full-text index for Opportunities...');
        await session.run(`
            CREATE FULLTEXT INDEX opportunity_search_index IF NOT EXISTS 
            FOR (n:Opportunity) 
            ON EACH [n.title, n.description, n.company_name]
        `);

        console.log('Neo4j initialization completed successfully!');

    } catch (error) {
        console.error('Initialization failed:', error);
    } finally {
        await session.close();
        await driver.close();
    }
}

initNeo4j();
