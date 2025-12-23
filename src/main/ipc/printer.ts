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
      const html = generateReceiptHTML(sale);
      await printReceipt(html);
      return true;
    } catch (error) {
      console.error('Printing failed:', error);
      return false;
    }
  });
};
