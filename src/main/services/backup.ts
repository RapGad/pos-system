import fs from 'fs-extra';
import path from 'path';
import { app, dialog } from 'electron';
import db from '../database/connection.js';

const getDbPath = () => {
  if (process.env.NODE_ENV === 'development') {
    return path.resolve(__dirname, '../../../data/pos.db');
  }
  if (process.platform === 'win32') {
    return 'C:\\Users\\Public\\LiquorPOS\\data\\pos.db';
  }
  return path.join(app.getPath('userData'), 'pos.db');
};

export const performBackup = async (destination?: string) => {
  const source = getDbPath();
  
  // If no destination provided, create a daily backup in the same folder
  if (!destination) {
    const backupDir = path.join(path.dirname(source), 'backups');
    await fs.ensureDir(backupDir);
    const date = new Date().toISOString().split('T')[0];
    destination = path.join(backupDir, `pos_backup_${date}.db`);
  }

  try {
    // Checkpoint WAL to ensure main DB file is up to date
    db.pragma('wal_checkpoint(RESTART)');
    
    await fs.copy(source, destination);
    console.log(`Backup created at ${destination}`);
    return true;
  } catch (error) {
    console.error('Backup failed:', error);
    return false;
  }
};

export const manualBackup = async () => {
  const { filePath } = await dialog.showSaveDialog({
    title: 'Save Backup',
    defaultPath: `pos_backup_${new Date().toISOString().split('T')[0]}.db`,
    filters: [{ name: 'SQLite Database', extensions: ['db'] }]
  });

  if (filePath) {
    return performBackup(filePath);
  }
  return false;
};

// Auto-run backup on startup
export const initAutoBackup = () => {
  // Run backup 5 seconds after startup to not block initial load
  setTimeout(() => {
    performBackup();
  }, 5000);
};
