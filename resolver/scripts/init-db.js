const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const root = path.join(__dirname, '..');
const dbPath = process.env.DATABASE_PATH || path.join(root, 'data', 'profiles.sqlite');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
const schema = fs.readFileSync(path.join(root, 'schema.sql'), 'utf8');
db.exec(schema);
db.close();
console.log('Database initialized at', dbPath);
