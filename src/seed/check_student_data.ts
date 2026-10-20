
import neo4j from 'neo4j-driver';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkData() {
    const driver = neo4j.driver(
        process.env.NEO4J_URI || '',
        neo4j.auth.basic(process.env.NEO4J_USERNAME || '', process.env.NEO4J_PASSWORD || '')
    );
    const session = driver.session();

    try {
        console.log('--- Checking Approved Students ---');
        const result = await session.run(
            "MATCH (u:User {role: 'student', account_status: 'approved'}) RETURN u.id, u.name, u.email LIMIT 10"
        );
        
        if (result.records.length === 0) {
            console.log('No approved students found.');
            
            console.log('\n--- Checking ALL Students (Any Status) ---');
            const allStudents = await session.run(
                "MATCH (u:User {role: 'student'}) RETURN u.id, u.name, u.account_status LIMIT 10"
            );
            allStudents.records.forEach(r => {
                console.log(`ID: ${r.get('u.id')}, Name: ${r.get('u.name')}, Status: ${r.get('u.account_status')}`);
            });
        } else {
            console.log(`Found ${result.records.length} approved students:`);
            result.records.forEach(r => {
                console.log(`ID: ${r.get('u.id')}, Name: ${r.get('u.name')}, Email: ${r.get('u.email')}`);
            });
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await session.close();
        await driver.close();
    }
}

checkData();
