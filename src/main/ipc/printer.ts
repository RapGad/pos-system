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
    } catch (error: any) {
      console.error('Direct printing failed, attempting fallback:', error);
      
      // Check for specific Windows USB error or generic failure
      if (process.platform === 'win32' || error.message?.includes('LIBUSB') || error.message?.includes('NOT_SUPPORTED')) {
        try {
          console.log('Falling back to system printer...');
          const html = await generateReceiptHTML(sale);
          const { printViaWebContents } = await import('../services/printer.js');
          await printViaWebContents(html);
          return true;
        } catch (fallbackError) {
          console.error('Fallback printing also failed:', fallbackError);
          throw fallbackError; // Throw original or fallback error? Throw fallback for now.
        }
      }
      
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
