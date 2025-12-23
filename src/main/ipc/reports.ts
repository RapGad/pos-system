import { ipcMain } from 'electron';
import { getDailySales, getProductPerformance, getInventoryValuation, getSalesHistory } from '../services/reports.js';

export const registerReportHandlers = () => {
  ipcMain.handle('reports:daily-sales', (_, { date, userId }) => getDailySales(date, userId));
  ipcMain.handle('reports:product-performance', (_, { dateFrom, dateTo, userId }) => getProductPerformance(dateFrom, dateTo, userId));
  ipcMain.handle('reports:inventory-valuation', () => getInventoryValuation());
  ipcMain.handle('reports:sales-history', (_, { days, userId }) => getSalesHistory(days, userId));
};
