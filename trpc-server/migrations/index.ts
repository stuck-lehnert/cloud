import fs from 'fs';
import path from 'path';

const sqlFiles = fs.readdirSync(__dirname).filter(f => f.endsWith('.sql'));
sqlFiles.sort();

const migrations = sqlFiles.map(f => [
  f.substring(0, f.length - '.sql'.length),
  fs.readFileSync(path.join(__dirname, f)).toString(),
] as [string, string]);

export default migrations;

