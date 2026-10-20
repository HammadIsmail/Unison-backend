
import neo4j from 'neo4j-driver';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkUser() {
    const driver = neo4j.driver(
        process.env.NEO4J_URI!,
        neo4j.auth.basic(process.env.NEO4J_USERNAME!, process.env.NEO4J_PASSWORD!),
    );
    const session = driver.session();
    try {
        const result = await session.run(
            'MATCH (u:User {email: $email}) RETURN u',
            { email: 'admin@uet.edu.pk' }
        );
        if (result.records.length === 0) {
            console.log('RESULT: User NOT found');
        } else {
            const user = result.records[0].get('u').properties;
            console.log('RESULT: User found');
            console.log('ROLE:', user.role);
            console.log('STATUS:', user.account_status);
            // Don't log password hash for security, but we know it's there
        }
    } catch (error) {
        console.error('Error connecting to Neo4j:', error);
    } finally {
        await session.close();
        await driver.close();
    }
}

checkUser();
