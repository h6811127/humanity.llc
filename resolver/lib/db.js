const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

/**
 * Open SQLite and apply `schema.sql` (Tech Spec v0.5 §3).
 * @param {string} dbFilePath Absolute or relative path, or `:memory:` for tests.
 */
function openDatabase(dbFilePath) {
  if (dbFilePath !== ':memory:') {
    fs.mkdirSync(path.dirname(path.resolve(dbFilePath)), { recursive: true });
  }
  const db = new Database(dbFilePath);
  const schemaPath = path.join(__dirname, '..', 'schema.sql');
  db.exec(fs.readFileSync(schemaPath, 'utf8'));
  return db;
}

module.exports = { openDatabase };
