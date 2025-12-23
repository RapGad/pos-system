import { ipcMain } from 'electron';
import { createSale, getSales, getSaleDetails } from '../services/sales.js';

export const registerSalesHandlers = () => {
  ipcMain.handle('sales:create', (_, sale) => createSale(sale));
  ipcMain.handle('sales:get-history', (_, filters) => getSales(filters));
  ipcMain.handle('sales:get-details', (_, saleId) => getSaleDetails(saleId));
};
