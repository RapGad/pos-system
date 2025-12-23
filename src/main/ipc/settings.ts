import { ipcMain } from 'electron';
import { getSettings, saveSettings } from '../services/settings.js';
import { getPrinters } from '../services/printer.js';
import { resetDatabase } from '../database/migrator.js';

export const registerSettingsHandlers = () => {
  ipcMain.handle('settings:get', () => {
    return getSettings();
  });

  ipcMain.handle('settings:save', (_, { settings, userRole }) => {
    console.log('Settings save request from role:', userRole);
    if (userRole !== 'admin') throw new Error('Unauthorized');
    return saveSettings(settings);
  });

  ipcMain.handle('printer:get-list', async () => {
    return await getPrinters();
  });

  ipcMain.handle('database:reset', (_, { userRole }) => {
    console.log('Database reset request from role:', userRole);
    if (userRole !== 'admin') throw new Error('Unauthorized');
    return resetDatabase();
  });
};
