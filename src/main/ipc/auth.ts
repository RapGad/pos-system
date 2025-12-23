import { ipcMain } from 'electron';
import { login, getUsers, createUser, updateUser, deleteUser } from '../services/auth.js';

export const registerAuthHandlers = () => {
  ipcMain.handle('auth:login', (_, { username, password }) => {
    return login(username, password);
  });
  
  ipcMain.handle('auth:get-users', () => {
    return getUsers();
  });

  ipcMain.handle('auth:create-user', (_, { username, password, role, userRole }) => {
    if (userRole !== 'admin') throw new Error('Unauthorized');
    return createUser(username, password, role);
  });

  ipcMain.handle('auth:update-user', (_, { id, username, role, password, userRole }) => {
    if (userRole !== 'admin') throw new Error('Unauthorized');
    return updateUser(id, username, role, password);
  });

  ipcMain.handle('auth:delete-user', (_, { id, userRole }) => {
    if (userRole !== 'admin') throw new Error('Unauthorized');
    return deleteUser(id);
  });
};
