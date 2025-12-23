import { ipcMain } from 'electron';
import { printReceipt, generateReceiptHTML, getPrinters } from '../services/printer.js';

export const registerPrinterHandlers = () => {
  ipcMain.handle('printer:get-printers', async () => {
    try {
      return await getPrinters();
    } catch (error) {
      console.error('Failed to get printers:', error);
      return [];
    }
  });

  ipcMain.handle('printer:print-receipt', async (_, sale) => {
    try {
      await printReceipt(sale);
      return true;
    } catch (error) {
      console.error('Printing failed:', error);
      return false;
    }
  });

  ipcMain.handle('printer:generate-preview', async (_, sale) => {
    try {
      return await generateReceiptHTML(sale);
    } catch (error) {
      console.error('Failed to generate receipt preview:', error);
      throw error;
    }
  });

  ipcMain.handle('printer:print-html', async (_, html) => {
    try {
      await printReceipt(html);
      return true;
    } catch (error) {
      console.error('Printing HTML failed:', error);
      return false;
    }
  });
};
