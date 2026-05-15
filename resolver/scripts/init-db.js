#!/usr/bin/env node
/**
 * Apply Tech Spec v0.5 §3 schema to DATABASE_PATH (default ./data/profiles.sqlite).
 */
require('dotenv').config();
const path = require('path');
const { openDatabase } = require('../lib/db');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'data', 'profiles.sqlite');
openDatabase(dbPath);
console.log('SQLite schema applied:', path.resolve(dbPath));
