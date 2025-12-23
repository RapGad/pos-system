import db from './connection.js';
import { schema } from './schema.js';
import crypto from 'crypto';

const hashPassword = (password: string): string => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

export const runMigrations = () => {
  try {
    console.log('Running migrations...');
    db.exec(schema);
    
    // Check if we need to seed initial data
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    
    if (userCount.count === 0) {
      console.log('Seeding initial data...');
      const insertUser = db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)');
      // Default admin: admin / admin123
      const defaultHash = hashPassword('admin123');
      insertUser.run('admin', defaultHash, 'admin'); 
      
      const insertCategory = db.prepare('INSERT INTO categories (name) VALUES (?)');
      insertCategory.run('Spirits');
      insertCategory.run('Wine');
      insertCategory.run('Beer');
      insertCategory.run('Mixers');
    } else {
      // Check if admin user has a stale bcrypt hash and update it
      const adminUser = db.prepare('SELECT * FROM users WHERE username = ?').get('admin') as any;
      if (adminUser && adminUser.password_hash.startsWith('$2')) {
        console.log('Updating admin user password hash from bcrypt to SHA-256...');
        const updateHash = hashPassword('admin123');
        db.prepare('UPDATE users SET password_hash = ? WHERE username = ?').run(updateHash, 'admin');
      }
    }
    
    console.log('Migrations completed.');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
};

export const resetDatabase = () => {
  try {
    console.log('Resetting database...');
    
    // Disable foreign key checks to allow dropping tables
    db.pragma('foreign_keys = OFF');
    
    const tables = [
      'sale_items',
      'sales',
      'inventory_logs',
      'products',
      'categories',
      'users',
      'settings'
    ];
    
    for (const table of tables) {
      db.prepare(`DROP TABLE IF EXISTS ${table}`).run();
    }
    
    // Re-enable foreign key checks
    db.pragma('foreign_keys = ON');
    
    console.log('Database reset. Running migrations...');
    runMigrations();
    
    return true;
  } catch (error) {
    console.error('Database reset failed:', error);
    return false;
  }
};
