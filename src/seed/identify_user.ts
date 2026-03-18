
import neo4j from 'neo4j-driver';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkUser(id: string) {
    const driver = neo4j.driver(
        process.env.NEO4J_URI!,
        neo4j.auth.basic(process.env.NEO4J_USERNAME!, process.env.NEO4J_PASSWORD!),
    );
    const session = driver.session();
    try {
        const result = await session.run(
            'MATCH (u:User {id: $id}) RETURN u',
            { id }
        );
        if (result.records.length === 0) {
            console.log(`RESULT: User with ID ${id} NOT found`);
            
            // Let's also check by email if we can find who the user might be
            // But we don't have the email. Let's see all users.
            const allUsers = await session.run('MATCH (u:User) RETURN u.id as id, u.email as email, u.role as role LIMIT 10');
            console.log('Existing users in DB (first 10):');
            allUsers.records.forEach(r => {
                console.log(`ID: ${r.get('id')}, Email: ${r.get('email')}, Role: ${r.get('role')}`);
            });

        } else {
            const user = result.records[0].get('u').properties;
            console.log('RESULT: User found');
            console.log('ID:', user.id);
            console.log('EMAIL:', user.email);
            console.log('ROLE:', user.role);
            console.log('STATUS:', user.account_status);
        }
    } catch (error) {
        console.error('Error connecting to Neo4j:', error);
    } finally {
        await session.close();
        await driver.close();
    }
}

const targetId = process.argv[2] || '076f1c3a-741c-4e62-b918-e3122d052ff1';
checkUser(targetId);
