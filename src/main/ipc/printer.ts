import { ipcMain } from 'electron';
import { printReceipt, generateReceiptHTML, getPrinters, printViaWebContents } from '../services/printer.js';

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
      console.log('Attempting direct USB print...');
      await printReceipt(sale);
      console.log('Direct USB print successful');
      return true;
    } catch (error: any) {
      console.error('Direct printing failed:', error);
      
      // Always try fallback on Windows or if specific errors occur
      if (process.platform === 'win32' || error.message?.includes('LIBUSB') || error.message?.includes('NOT_SUPPORTED') || error.message?.includes('claimed')) {
        try {
          console.log('Attempting fallback to system printer...');
          const html = await generateReceiptHTML(sale);
          await printViaWebContents(html);
          console.log('Fallback system print successful');
          return true;
        } catch (fallbackError) {
          console.error('Fallback printing also failed:', fallbackError);
          // Return false instead of throwing to prevent crashing the renderer with an ugly error, 
          // but maybe we want to show the error.
          // Let's throw the fallback error so the user knows why it failed.
          throw new Error(`Printing failed. USB Error: ${error.message}. System Print Error: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`);
        }
      }
      
      throw error; // Re-throw if not handled by fallback
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
