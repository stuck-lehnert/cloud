import type PG from "pg";
import fs from 'fs/promises';
import path from 'path';

export async function $migrate({pool, directory}: {
    pool: PG.Pool;
    directory: string;
}) {
    if (!await fs.exists(directory)) return;

    const stat = await fs.stat(directory);
    if (!stat.isDirectory()) return;

    let contents = await fs.readdir(directory);
    contents.sort();

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        await client.query(`
            CREATE TABLE IF NOT EXISTS __migrations (
                name TEXT PRIMARY KEY,
                timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);

        let { rows } = await client.query('SELECT *FROM __migrations');
        const applied = rows.map(({ name }) => name);

        for (const file of contents) {
            if (!file.endsWith('.sql')) continue;

            const name = file.substring(0, file.length - '.sql'.length);
            if (!name || applied.includes(name)) continue;

            console.log('$migrate:', name);

            const filePath = path.join(directory, file);
            const migration = await fs.readFile(filePath, 'utf-8');

            await client.query(migration);
            await client.query('INSERT INTO __migrations (name) VALUES ($1)', [name]);
        }

        await client.query('COMMIT');
    } finally {
        client.release();
    }
}