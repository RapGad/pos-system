import { getSettings } from './settings.js';
import bwipjs from 'bwip-js';
// @ts-ignore
import escpos from 'escpos';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Polyfill usb.on to prevent escpos-usb crash
try {
  const usb = require('usb');
  if (usb && !usb.on) {
    usb.on = () => {}; // No-op polyfill
  }
} catch (e) {
  console.error('Failed to patch usb module:', e);
}

// @ts-ignore
import USB from 'escpos-usb';

// Set the adapter
escpos.USB = USB;

export const getPrinters = async () => {
  try {
    // escpos-usb doesn't have a simple "list all" method that returns details easily in all versions,
    // but we can try to find connected USB printers.
    const devices = USB.findPrinter();
    return devices.map((d: any) => ({
      name: `USB Printer (VID:${d.deviceDescriptor.idVendor.toString(16).toUpperCase()} PID:${d.deviceDescriptor.idProduct.toString(16).toUpperCase()})`,
      displayName: 'USB Thermal Printer',
      description: 'Direct USB Connection',
      status: 0,
      isDefault: false,
      deviceDescriptor: {
        idVendor: d.deviceDescriptor.idVendor,
        idProduct: d.deviceDescriptor.idProduct
      }
    }));
  } catch (error) {
    console.error('Failed to list USB printers:', error);
    return [];
  }
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

export const getSystemPrinters = async () => {
  try {
    const { BrowserWindow } = require('electron');
    // We need a window to access webContents
    const win = BrowserWindow.getAllWindows()[0];
    if (!win) return [];
    
    const printers = await win.webContents.getPrintersAsync();
    return printers.map((p: any) => ({
      name: p.name,
      displayName: p.displayName,
      description: p.description,
      status: p.status,
      isDefault: p.isDefault,
      isSystem: true
    }));
  } catch (error) {
    console.error('Failed to get system printers:', error);
    return [];
  }
};

export const printViaWebContents = async (html: string, printerName?: string): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    try {
      const { BrowserWindow } = require('electron');
      
      const workerWindow = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false
        }
      });

      workerWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));

      workerWindow.webContents.on('did-finish-load', () => {
        workerWindow.webContents.print({ 
          silent: true, 
          printBackground: true,
          deviceName: printerName,
          margins: { marginType: 'none' } // Crucial for thermal printers
        }, (success: boolean, errorType: string) => {
          if (!success) {
            console.error('Failed to print via WebContents:', errorType);
            reject(new Error(errorType));
          } else {
            resolve(true);
          }
          workerWindow.close();
        });
      });
    } catch (error) {
      console.error('Error in printViaWebContents:', error);
      reject(error);
    }
  });
};

export const printReceipt = async (sale: any) => {
  const settings = getSettings();
  
  // Dispatch based on printer type
  if (settings.printer_type === 'system') {
    const html = await generateReceiptHTML(sale);
    return printViaWebContents(html, settings.printer_device_name);
  }

  // Fallback to USB logic
  // Sanitize currency symbol for physical print (Cedi sign often fails)
  const currencySymbol = settings.currency_symbol === '₵' ? 'GHS ' : settings.currency_symbol;
  
  const is58mm = settings.printer_paper_width === '58mm';
  // Reduce width to be safe and prevent wrapping
  // 58mm: usually 32 chars, reducing to 28
  // 80mm: usually 48 chars, reducing to 42
  const width = is58mm ? 28 : 42; 
  
  // Helper for two-column layout (Name ...... Price)
  const twoColumns = (left: string, right: string): string => {
    const spaceNeeded = width - left.length - right.length;
    if (spaceNeeded < 1) {
      // If text is too long, truncate or wrap (simple truncate for now)
      const availableForLeft = width - right.length - 1;
      return left.substring(0, availableForLeft) + ' ' + right;
    }
    return left + ' '.repeat(spaceNeeded) + right;
  };

  return new Promise((resolve, reject) => {
    try {
      // Parse VID/PID from settings if available, or try to find the first printer
      let device;
      if (settings.printer_device_name && settings.printer_device_name.includes('VID')) {
        // Extract VID and PID
        const vidMatch = settings.printer_device_name.match(/VID:([0-9A-F]+)/);
        const pidMatch = settings.printer_device_name.match(/PID:([0-9A-F]+)/);
        if (vidMatch && pidMatch) {
          const vid = parseInt(vidMatch[1], 16);
          const pid = parseInt(pidMatch[1], 16);
          device = new escpos.USB(vid as any, pid as any);
        }
      }
      
      if (!device) {
        // Fallback to auto-detect
        device = new escpos.USB();
      }

      const printer = new escpos.Printer(device);

      device.open((error: any) => {
        if (error) {
          console.error('Failed to open printer:', error);
          reject(error);
          return;
        }

        // Add a small delay to ensure printer is ready to receive data
        setTimeout(() => {
          try {
            // Initialize printer - minimal commands to avoid garbage
            // Break chains to ensure commands are processed reliably
            printer.hardware('INIT');
            printer.align('CT');
            printer.text(settings.store_name);
            printer.text(settings.store_address);
            printer.text(settings.store_phone);
            printer.text('-'.repeat(width));
            printer.text(`Receipt: ${sale.receipt_number}`);
            printer.text(new Date(sale.created_at || Date.now()).toLocaleString());
            
            if (sale.customer_name) {
              printer.text(`Customer: ${sale.customer_name}`);
            }
            
            printer.text('-'.repeat(width));
            
            // Flush header before items
            printer.control('LF'); 
            
            // Explicitly set left alignment for items
            printer.align('LT'); 
            
            // Items
            sale.items.forEach((item: any) => {
              const price = Number(item.price_at_sale || item.price || 0);
              const qty = Number(item.quantity || 0);
              const total = (price * qty / 100).toFixed(2);
              
              // Ensure currency symbol is a string
              const safeCurrency = currencySymbol || '';
              const priceStr = `${safeCurrency}${total}`;
              const qtyStr = `${qty} x ${(price / 100).toFixed(2)}`;
              
              // Print name
              printer.text(item.name);
              // Force a line feed to ensure the name prints and we move to the next line
              printer.control('LF');
              
              // Print qty and price on the next line
              const detailLine = twoColumns(qtyStr, priceStr);
              printer.text(detailLine);
              // Force another LF to ensure this line prints
              printer.control('LF');
            });

            // Reset to center for totals
            printer.align('CT');
            printer.text('-'.repeat(width));
            
            // Right align for totals
            printer.align('RT'); 
            
            // Totals
            const totalAmount = (Number(sale.total_amount || 0) / 100).toFixed(2);
            printer.text(`TOTAL: ${currencySymbol}${totalAmount}`);
            printer.text(`Payment: ${sale.payment_method?.toUpperCase() || 'CASH'}`);

            printer.align('CT');
            printer.text('-'.repeat(width));
            
            // Footer
            if (settings.receipt_footer) {
              printer.text(settings.receipt_footer);
            }
            
            // Barcode
            printer.feed(1);
            printer.align('CT');
            // CODE128 is standard for alphanumeric receipt numbers
            printer.barcode(sale.receipt_number, 'CODE128');
            printer.feed(1);
            
            // Feed before cut to ensure footer/barcode isn't cut
            printer.feed(4);
            
            // Cut
            printer.cut();
            
            // Close
            setTimeout(() => {
              try {
                printer.close();
                resolve(true);
              } catch (e) {
                resolve(true);
              }
            }, 1000);
            
          } catch (printError) {
            console.error('Error sending commands to printer:', printError);
            reject(printError);
            try { printer.close(); } catch (e) {}
          }
        }, 100); // 100ms delay after open
      });
    } catch (err) {
      console.error('Error initializing printer:', err);
      reject(err);
    }
  });
};

export const generateReceiptHTML = async (sale: any) => {
  const settings = getSettings();
  const is58mm = settings.printer_paper_width === '58mm';
  
  // Thermal printers usually have a printable area slightly smaller than the paper width
  // 58mm -> ~48mm printable
  // 80mm -> ~72mm printable
  const printableWidth = is58mm ? '48mm' : '72mm';
  
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
          @page {
            margin: 0;
            size: auto;
          }

          body { 
            font-family: 'Consolas', 'monaco', 'Courier New', monospace; 
            width: ${printableWidth};
            margin: 0; 
            padding: 2mm; 
            background-color: #fff;
            color: #000;
            font-size: 10pt;
            line-height: 1.2;
            overflow: hidden;
          }
          
          /* Reset box sizing */
          * { box-sizing: border-box; }

          .header { text-align: center; margin-bottom: 4mm; }
          .header h1 { margin: 0 0 1mm 0; font-size: 12pt; font-weight: bold; text-transform: uppercase; }
          .header p { margin: 0.5mm 0; font-size: 9pt; }
          
          .divider { 
            border-top: 1px dashed #000; 
            margin: 2mm 0; 
            width: 100%;
          }
          
          .meta {
            display: flex;
            justify-content: space-between;
            font-size: 9pt;
            margin-bottom: 2mm;
          }

          .items { margin-bottom: 2mm; }
          .item { 
            display: flex; 
            flex-direction: column;
            margin-bottom: 1.5mm; 
            border-bottom: 1px dotted #ccc;
            padding-bottom: 0.5mm;
          }
          
          .item-name { font-weight: bold; margin-bottom: 0.5mm; font-size: 10pt; }
          .item-details { display: flex; justify-content: space-between; font-size: 9pt; }
          
          .totals { margin-top: 2mm; }
          .row { display: flex; justify-content: space-between; margin-bottom: 1mm; }
          .total-row { 
            font-weight: bold; 
            font-size: 11pt; 
            margin-top: 2mm; 
            border-top: 1px solid #000; 
            border-bottom: 1px solid #000;
            padding: 1.5mm 0;
          }
          
          .footer { text-align: center; margin-top: 4mm; font-size: 9pt; }
          .barcode { text-align: center; margin-top: 3mm; }
          .barcode img { max-width: 100%; height: auto; }
          
          /* Feed for manual tear-off */
          .feed {
            height: 50mm; 
            width: 100%;
          }
          
          .cut-line {
            border-top: 1px dotted #000;
            margin-top: 2mm;
            padding-top: 1mm;
            text-align: center;
            font-size: 8pt;
            color: #000;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${settings.store_name}</h1>
          <p>${settings.store_address}</p>
          <p>${settings.store_phone}</p>
        </div>
        
        <div class="divider"></div>
        
        <div class="meta">
          <span>${new Date(sale.created_at || Date.now()).toLocaleDateString()}</span>
          <span>${new Date(sale.created_at || Date.now()).toLocaleTimeString()}</span>
        </div>
        <div class="meta">
          <span>Receipt: ${sale.receipt_number}</span>
        </div>
        ${sale.customer_name ? `<div class="meta"><span>Customer: ${sale.customer_name}</span></div>` : ''}

        <div class="divider"></div>
        
        <div class="items">
          ${sale.items.map((item: any) => {
            const price = Number(item.price_at_sale || item.price || 0);
            const qty = Number(item.quantity || 0);
            const total = (price * qty / 100).toFixed(2);
            return `
            <div class="item">
              <span class="item-name">${item.name}</span>
              <div class="item-details">
                <span>${qty} x ${settings.currency_symbol}${(price / 100).toFixed(2)}</span>
                <span>${settings.currency_symbol}${total}</span>
              </div>
            </div>
          `}).join('')}
        </div>
        
        <div class="divider"></div>
        
        <div class="totals">
          <div class="row">
            <span>Subtotal</span>
            <span>${settings.currency_symbol}${(Number(sale.total_amount || 0) / 100).toFixed(2)}</span>
          </div>
          ${settings.tax_percentage > 0 ? `
          <div class="row">
            <span>Tax (${settings.tax_percentage}%)</span>
            <span>${settings.currency_symbol}${((Number(sale.total_amount || 0) * settings.tax_percentage / 100) / 100).toFixed(2)}</span>
          </div>
          ` : ''}
          <div class="row total-row">
            <span>TOTAL</span>
            <span>${settings.currency_symbol}${(Number(sale.total_amount || 0) / 100).toFixed(2)}</span>
          </div>
          <div class="row" style="margin-top: 1mm;">
            <span>Payment Method</span>
            <span>${sale.payment_method?.toUpperCase() || 'CASH'}</span>
          </div>
        </div>
        
        <div class="footer">
          <p>${settings.receipt_footer}</p>
          ${barcodeImg ? `
          <div class="barcode">
            <img src="${barcodeImg}" alt="Barcode" />
          </div>
          ` : ''}
        </div>
        
        <div class="cut-line">--- Tear Here ---</div>
        <div class="feed"></div>
      </body>
    </html>
  `;
};


