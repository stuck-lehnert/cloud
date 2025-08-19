import knex from 'knex';
import migrations from '@migrations';
import dotenv from 'dotenv';
import { log } from './log';

dotenv.config();

if (!process.env.PG_DSN) {
  console.error('missing env PG_DSN, exiting...');
  process.exit(1);
}

export const db = knex({
  client: 'pg',
  connection: process.env.PG_DSN!,
});

export async function migrate() {
  await db.raw(`
    CREATE TABLE IF NOT EXISTS __migrations (
      name TEXT PRIMARY KEY,
      timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.transaction(async tx => {
    try {
      const applied = (await tx('__migrations').select('name'))
        .map(row => row['name']);

      for (const [name, sql] of migrations) {
        if (applied.includes(name)) continue;
        
        log(`Applying ${name}`);

        await tx.raw(sql);
        await tx('__migrations').insert({ name });
      }
    } catch (e) {
      log(e);
      await tx.rollback().catch(() => {});
    }
  });
}

