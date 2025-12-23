import { ipcMain } from 'electron';
import { manualBackup } from '../services/backup.js';

export const registerBackupHandlers = () => {
  ipcMain.handle('backup:create-manual', async () => {
    return manualBackup();
  });
};
