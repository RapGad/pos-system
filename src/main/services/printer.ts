import { BrowserWindow } from 'electron';
import { getSettings } from './settings.js';

// This implementation uses the system's printer driver via Electron's BrowserWindow.print().
// This ensures compatibility with any printer installed on the OS (USB, Network, Bluetooth)
// without requiring specific raw commands or native dependencies.
// It supports standard thermal printers (80mm/58mm) provided they have a driver.

export const getPrinters = async () => {
  const win = new BrowserWindow({ show: false });
  const printers = await win.webContents.getPrintersAsync();
  win.close();
  return printers;
};

export const printReceipt = async (htmlContent: string) => {
  const settings = getSettings();
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false,
    }
  });

  await win.loadURL(`data:text/html;charset=utf-8,${encodeURI(htmlContent)}`);
  
  // Wait for content to load
  await new Promise(resolve => setTimeout(resolve, 500));

  return new Promise((resolve, reject) => {
    win.webContents.print({
      silent: true,
      printBackground: true,
      deviceName: settings.printer_device_name || '' // Use configured printer or default
    }, (success, errorType) => {
      if (!success) {
        console.error('Print failed:', errorType);
        reject(errorType);
      } else {
        resolve(true);
      }
      win.close();
    });
  });
};

export const generateReceiptHTML = (sale: any) => {
  const settings = getSettings();
  
  // Simple HTML template for thermal printer (80mm width usually ~280-300px safe area)
  return `
    <html>
      <head>
        <style>
          body { font-family: 'Courier New', monospace; width: 300px; margin: 0; padding: 10px; font-size: 12px; }
          .header { text-align: center; margin-bottom: 10px; }
          .item { display: flex; justify-content: space-between; margin-bottom: 5px; }
          .total { border-top: 1px dashed black; margin-top: 10px; padding-top: 5px; font-weight: bold; text-align: right; }
          .footer { text-align: center; margin-top: 20px; font-size: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h3>${settings.store_name}</h3>
          <p>${settings.store_address}</p>
          <p>Tel: ${settings.store_phone}</p>
          <p>Receipt: ${sale.receipt_number}</p>
          <p>${new Date().toLocaleString()}</p>
        </div>
        <div class="items">
          ${sale.items.map((item: any) => `
            <div class="item">
              <span>${item.name} x${item.quantity}</span>
              <span>$${(item.price_at_sale / 100).toFixed(2)}</span>
            </div>
          `).join('')}
        </div>
        <div class="total">
          TOTAL: $${(sale.total_amount / 100).toFixed(2)}
        </div>
        <div class="footer">
          <p>${settings.receipt_footer}</p>
        </div>
      </body>
    </html>
  `;
};
