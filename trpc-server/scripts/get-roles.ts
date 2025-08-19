#!/usr/bin/env bun

import fs from 'fs';
import path from 'path';
import knex from 'knex';
import dotenv from 'dotenv';
import migrations from '@migrations';

dotenv.config();

const master = knex({
  client: 'pg',
  connection: {
    host: 'localhost',
    user: 'postgres',
    database: 'postgres',
  },
});

await master.raw(`DROP DATABASE IF EXISTS roles_temp`);
await master.raw(`CREATE DATABASE roles_temp`);

const temp = knex({
  client: 'pg',
  connection: {
    host: 'localhost',
    user: 'postgres',
    database: 'roles_temp',
  },
});

try {
  for (const [, sql] of migrations) {
    await temp.raw(sql);
  }

  const roles = await temp('roles').select('name').then(rows => rows.map(r => r['name']));

  const generatedDir = path.join(__dirname, '..', 'src', 'generated');
  fs.mkdirSync(generatedDir, { recursive: true });
  
  const rolesPath = path.join(generatedDir, 'roles.ts');

  let content = `export const ROLES = ${JSON.stringify(roles)} as const;`;
  content += `\n\n` + `export type Role = (typeof ROLES)[number];\n`;

  fs.writeFileSync(rolesPath, content);
} finally {
  await temp.destroy();
  await master.raw(`DROP DATABASE IF EXISTS roles_temp`);
  await master.destroy();
}




