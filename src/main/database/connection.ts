import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs-extra';
import { app } from 'electron';

const isDev = process.env.NODE_ENV === 'development';

// Determine database path
// In production: C:\Users\Public\LiquorPOS\data\pos.db (Windows) or User Data (Mac)
// In dev: ./data/pos.db
const getDbPath = () => {
  if (isDev) {
    return path.resolve(__dirname, '../../../data/pos.db');
  }
  
  if (process.platform === 'win32') {
    return 'C:\\Users\\Public\\LiquorPOS\\data\\pos.db';
  }
  
  return path.join(app.getPath('userData'), 'pos.db');
};

const dbPath = getDbPath();
fs.ensureDirSync(path.dirname(dbPath));

const db = new Database(dbPath, { verbose: isDev ? console.log : undefined });

// Enable WAL mode for reliability
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL'); // Faster, still safe in WAL mode

export default db;
