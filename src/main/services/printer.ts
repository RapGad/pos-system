import { BrowserWindow } from 'electron';
import { getSettings } from './settings.js';
import bwipjs from 'bwip-js';
import fs from 'fs';
import path from 'path';
import os from 'os';

// This implementation uses the system's printer driver via Electron's BrowserWindow.print().
// It supports standard thermal printers (80mm/58mm).

export const getPrinters = async () => {
  const win = new BrowserWindow({ show: false });
  const printers = await win.webContents.getPrintersAsync();
  win.close();
  return printers;
};

const generateBarcodeBase64 = async (text: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    bwipjs.toBuffer({
      bcid: 'code128',       // Barcode type
      text: text,            // Text to encode
      scale: 3,              // 3x scaling factor
      height: 10,            // Bar height, in millimeters
      includetext: true,     // Show human-readable text
      textxalign: 'center',  // Always good to set this
    }, (err: any, png: Buffer) => {
      if (err) {
        reject(err);
      } else {
        resolve(`data:image/png;base64,${png.toString('base64')}`);
      }
    });
  });
};

export const printReceipt = async (htmlContent: string) => {
  const settings = getSettings();
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  // Create a temporary file for the receipt
  const tempDir = os.tmpdir();
  const tempFilePath = path.join(tempDir, `receipt-${Date.now()}.html`);
  
  try {
    // Write HTML content to the temp file
    console.log('Writing receipt to temp file:', tempFilePath);
    await fs.promises.writeFile(tempFilePath, htmlContent, 'utf-8');
    
    // Load the file using loadFile
    console.log('Loading temp file into window...');
    await win.loadFile(tempFilePath);
    
    // Wait for content to load and render - increased to 1.5s to ensure rendering
    console.log('Waiting for render...');
    await new Promise(resolve => setTimeout(resolve, 1500));

    return new Promise((resolve, reject) => {
      // If no printer is selected, default to showing the dialog
      const shouldShowDialog = !settings.printer_device_name;
      
      const printOptions = {
        silent: !shouldShowDialog,
        printBackground: true,
        deviceName: settings.printer_device_name || ''
      };

      console.log('Starting print job with options:', JSON.stringify(printOptions));

      win.webContents.print(printOptions, (success, errorType) => {
        console.log('Print callback:', { success, errorType });
        
        if (!success) {
          console.error('Print failed:', errorType);
          
          // If silent print failed, try again with the dialog (on ALL platforms)
          if (!shouldShowDialog) {
             console.log('Silent print failed, attempting with dialog...');
             win.webContents.print({ ...printOptions, silent: false }, (successWithDialog, errorWithDialog) => {
               if (successWithDialog) {
                 resolve(true);
               } else {
                 console.error('Dialog print failed:', errorWithDialog);
                 reject(errorWithDialog);
               }
               win.close();
             });
          } else {
            reject(errorType);
            win.close();
          }
        } else {
          resolve(true);
          win.close();
        }
      });
    });
  } catch (error) {
    console.error('Printing error:', error);
    win.close();
    throw error;
  } finally {
    // Clean up temp file
    try {
      if (fs.existsSync(tempFilePath)) {
        await fs.promises.unlink(tempFilePath);
      }
    } catch (cleanupError) {
      console.error('Failed to clean up temp receipt file:', cleanupError);
    }
  }
};

export const generateReceiptHTML = async (sale: any) => {
  const settings = getSettings();
  const width = settings.printer_paper_width === '58mm' ? '190px' : '270px';
  const fontSize = settings.printer_paper_width === '58mm' ? '10px' : '12px';
  
  // Generate barcode
  let barcodeImg = '';
  try {
    barcodeImg = await generateBarcodeBase64(sale.receipt_number);
  } catch (e) {
    console.error('Failed to generate barcode:', e);
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { 
            font-family: 'Courier New', monospace; 
            width: ${width}; 
            margin: 0; 
            padding: 0; 
            font-size: ${fontSize}; 
            line-height: 1.2;
            color: black;
          }
          .header { text-align: center; margin-bottom: 10px; }
          .header h3 { margin: 0 0 5px 0; font-size: 1.2em; font-weight: bold; }
          .header p { margin: 2px 0; }
          
          .divider { border-top: 1px dashed black; margin: 5px 0; }
          
          .items { margin-bottom: 5px; }
          .item { display: flex; justify-content: space-between; margin-bottom: 2px; }
          .item-name { flex: 1; padding-right: 5px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
          .item-qty { width: 30px; text-align: center; }
          .item-price { width: 60px; text-align: right; }
          
          .totals { margin-top: 5px; }
          .row { display: flex; justify-content: space-between; margin-bottom: 2px; }
          .total-row { font-weight: bold; font-size: 1.1em; margin-top: 5px; }
          
          .footer { text-align: center; margin-top: 15px; font-size: 0.9em; }
          .barcode { text-align: center; margin-top: 10px; }
          .barcode img { max-width: 100%; }
        </style>
      </head>
      <body>
        <div class="header">
          <h3>${settings.store_name}</h3>
          <p>${settings.store_address}</p>
          <p>${settings.store_phone}</p>
          <div class="divider"></div>
          <p>Receipt #${sale.receipt_number}</p>
          <p>${new Date(sale.created_at || Date.now()).toLocaleString()}</p>
        </div>
        
        <div class="divider"></div>
        
        <div class="items">
          ${sale.items.map((item: any) => `
            <div class="item">
              <span class="item-name">${item.name}</span>
              <span class="item-qty">x${item.quantity}</span>
              <span class="item-price">${settings.currency_symbol}${(item.price_at_sale / 100).toFixed(2)}</span>
            </div>
          `).join('')}
        </div>
        
        <div class="divider"></div>
        
        <div class="totals">
          <div class="row">
            <span>Subtotal</span>
            <span>${settings.currency_symbol}${(sale.total_amount / 100).toFixed(2)}</span>
          </div>
          ${settings.tax_percentage > 0 ? `
          <div class="row">
            <span>Tax (${settings.tax_percentage}%)</span>
            <span>${settings.currency_symbol}${((sale.total_amount * settings.tax_percentage / 100) / 100).toFixed(2)}</span>
          </div>
          ` : ''}
          <div class="row total-row">
            <span>TOTAL</span>
            <span>${settings.currency_symbol}${(sale.total_amount / 100).toFixed(2)}</span>
          </div>
          <div class="row">
            <span>Payment</span>
            <span>${sale.payment_method?.toUpperCase() || 'CASH'}</span>
          </div>
        </div>
        
        <div class="divider"></div>
        
        <div class="footer">
          <p>${settings.receipt_footer}</p>
          ${barcodeImg ? `
          <div class="barcode">
            <img src="${barcodeImg}" alt="Barcode" />
          </div>
          ` : ''}
          <!-- Add extra space for paper cut -->
          <div style="height: 20px;"></div>
        </div>
      </body>
    </html>
  `;
};
