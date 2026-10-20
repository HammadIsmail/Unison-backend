
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
        console.log('--- Checking Approved Alumni ---');
        const result = await session.run(
            "MATCH (u:User {role: 'alumni', account_status: 'approved'}) RETURN u.id, u.name, u.email LIMIT 10"
        );
        
        if (result.records.length === 0) {
            console.log('No approved alumni found.');
            
            console.log('\n--- Checking ALL Alumni (Any Status) ---');
            const allAlumni = await session.run(
                "MATCH (u:User {role: 'alumni'}) RETURN u.id, u.name, u.account_status LIMIT 10"
            );
            allAlumni.records.forEach(r => {
                console.log(`ID: ${r.get('u.id')}, Name: ${r.get('u.name')}, Status: ${r.get('u.account_status')}`);
            });
        } else {
            console.log(`Found ${result.records.length} approved alumni:`);
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
