import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);
async function run() {
  const res = await pool.query(`SELECT count(*) FROM products`);
  console.log('Products count:', res.rows[0].count);
  process.exit(0);
}
run();
