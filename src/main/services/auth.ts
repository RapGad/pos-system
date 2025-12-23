import db from '../database/connection.js';
import crypto from 'crypto';

export interface User {
  id: number;
  username: string;
  role: 'admin' | 'manager' | 'cashier';
}

const hashPassword = (password: string): string => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

export const login = (username: string, passwordRaw: string): User | null => {
  const user = db.prepare('SELECT id, username, password_hash, role FROM users WHERE username = ?').get(username) as any;
  
  if (!user) {
    return null;
  }
  
  const inputHash = hashPassword(passwordRaw);
  
  if (inputHash !== user.password_hash) {
    return null;
  }
  
  return {
    id: user.id,
    username: user.username,
    role: user.role
  };
};

export const getUsers = () => {
  return db.prepare('SELECT id, username, role, created_at FROM users').all();
};

export const createUser = (username: string, passwordRaw: string, role: string) => {
  const password_hash = hashPassword(passwordRaw);
  const result = db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run(username, password_hash, role);
  return result.lastInsertRowid;
};

export const updateUser = (id: number, username: string, role: string, passwordRaw?: string) => {
  if (passwordRaw) {
    const password_hash = hashPassword(passwordRaw);
    return db.prepare('UPDATE users SET username = ?, role = ?, password_hash = ? WHERE id = ?').run(username, role, password_hash, id);
  }
  return db.prepare('UPDATE users SET username = ?, role = ? WHERE id = ?').run(username, role, id);
};

export const deleteUser = (id: number) => {
  return db.prepare('DELETE FROM users WHERE id = ?').run(id);
};
