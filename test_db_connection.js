const neo4j = require('neo4j-driver');
require('dotenv').config();

async function testConnection() {
  const uri = process.env.NEO4J_URI;
  const user = process.env.NEO4J_USERNAME;
  const password = process.env.NEO4J_PASSWORD;

  console.log(`Connecting to ${uri}...`);
  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  const session = driver.session();

  try {
    const result = await session.run('RETURN "Connected Successfully!" AS message');
    console.log(result.records[0].get('message'));
  } catch (error) {
    console.error('Connection failed:', error);
  } finally {
    await session.close();
    await driver.close();
  }
}

testConnection();
