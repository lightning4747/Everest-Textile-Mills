// @ts-nocheck
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './index.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runMigrations() {
  console.log('Running database migrations...');
  const migrationsFolder = path.join(__dirname, '../../drizzle/migrations');
  try {
    await migrate(db, { migrationsFolder });
  } catch (e: any) {
    console.warn('Drizzle migrator notice:', e?.message ?? e);
  }

  // Execute incremental migrations safely
  const files = ['0001_normalize_qc_result.sql', '0002_inventory_core.sql', '0003_person_b_features.sql', '0004_procurement_po.sql'];
  for (const f of files) {
    const filePath = path.join(migrationsFolder, f);
    if (fs.existsSync(filePath)) {
      const sql = fs.readFileSync(filePath, 'utf-8');
      await pool.query(sql);
    }
  }

  console.log('Migrations complete.');
  await pool.end();
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
