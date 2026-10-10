import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);
async function run() {
  await pool.query(`TRUNCATE sales_orders CASCADE`);
  console.log('done truncating');
  process.exit(0);
}
run();
