import { getSettings } from './settings.js';
import bwipjs from 'bwip-js';
// @ts-ignore
import escpos from 'escpos';
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

export const printReceipt = async (sale: any) => {
  const settings = getSettings();
  const is58mm = settings.printer_paper_width === '58mm';
  const width = is58mm ? 32 : 48; // Approximate character width for standard fonts
  
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

        try {
          // Initialize printer
          printer
            .font('A')
            .align('CT')
            .style('B')
            .size(1, 1)
            .text(settings.store_name)
            .style('NORMAL')
            .size(1, 1) // Reset size to normal (1,1 is standard)
            .text(settings.store_address)
            .text(settings.store_phone)
            .text('-'.repeat(width))
            .text(`Receipt: ${sale.receipt_number}`)
            .text(new Date(sale.created_at || Date.now()).toLocaleString())
            .text('-'.repeat(width))
            .align('LT'); // Left align for items

          // Items
          sale.items.forEach((item: any) => {
            const total = (item.price_at_sale * item.quantity / 100).toFixed(2);
            const priceStr = `${settings.currency_symbol}${total}`;
            const qtyStr = `${item.quantity} x ${(item.price_at_sale / 100).toFixed(2)}`;
            
            // Print name on its own line if it's long, or just print it
            printer.text(item.name);
            // Print qty and price on the next line
            printer.text(twoColumns(qtyStr, priceStr));
          });

          printer.align('CT').text('-'.repeat(width)).align('RT'); // Right align for totals

          // Totals
          const totalAmount = (sale.total_amount / 100).toFixed(2);
          printer.text(`TOTAL: ${settings.currency_symbol}${totalAmount}`);
          printer.text(`Payment: ${sale.payment_method?.toUpperCase() || 'CASH'}`);

          printer.align('CT').text('-'.repeat(width));
          
          // Footer
          if (settings.receipt_footer) {
            printer.text(settings.receipt_footer);
          }
          
          // Barcode - simplified or disabled if causing issues
          // The "random numbers" issue is often caused by barcode commands on incompatible printers.
          // We'll try a standard CODE39 which is widely supported, or skip it if needed.
          // For now, let's try to print it but catch errors, and ensure we feed paper first.
          printer.feed(1);
          try {
             // Using CODE39 as it's very common, but it requires uppercase alphanumeric only usually.
             // If receipt_number has special chars, this might fail.
             // Let's stick to text for the receipt number for now to be safe, 
             // as the user specifically mentioned "random numbers" appearing.
             // printer.barcode(sale.receipt_number, 'CODE39', { width: 1, height: 50 });
             printer.text(`*${sale.receipt_number}*`); // Text representation
          } catch (e) {
             console.warn('Barcode printing skipped', e);
          }
          
          // Cut
          printer.cut();
          
          // Close
          // Important: Some printers need a small delay before closing to finish printing buffer
          setTimeout(() => {
            try {
              printer.close();
              resolve(true);
            } catch (e) {
              resolve(true); // Ignore close errors
            }
          }, 1000);
          
        } catch (printError) {
          console.error('Error sending commands to printer:', printError);
          reject(printError);
          try { printer.close(); } catch (e) {}
        }
      });
    } catch (err) {
      console.error('Error initializing printer:', err);
      reject(err);
    }
  });
};

export const generateReceiptHTML = async (sale: any) => {
  const settings = getSettings();
  // 58mm is roughly 200-220px printable, 80mm is roughly 280-300px printable in CSS pixels usually
  // But for preview, we want to simulate the physical look.
  const cssWidth = settings.printer_paper_width === '58mm' ? '220px' : '300px';
  
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
          @import url('https://fonts.googleapis.com/css2?family=Courier+Prime&display=swap');
          
          body { 
            font-family: 'Courier Prime', 'Courier New', monospace; 
            width: ${cssWidth}; 
            margin: 0 auto; 
            padding: 10px; 
            background-color: #fff;
            color: #000;
            font-size: 12px;
            line-height: 1.2;
          }
          
          /* Reset box sizing */
          * { box-sizing: border-box; }

          .header { text-align: center; margin-bottom: 15px; }
          .header h1 { margin: 0 0 5px 0; font-size: 16px; font-weight: bold; text-transform: uppercase; }
          .header p { margin: 2px 0; font-size: 12px; }
          
          .divider { 
            border-top: 1px dashed #000; 
            margin: 10px 0; 
            width: 100%;
          }
          
          .meta {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            margin-bottom: 10px;
          }

          .items-header {
            display: flex;
            font-weight: bold;
            border-bottom: 1px solid #000;
            padding-bottom: 5px;
            margin-bottom: 5px;
          }
          
          .items { margin-bottom: 10px; }
          .item { 
            display: flex; 
            margin-bottom: 5px; 
            align-items: flex-start;
          }
          
          .col-name { flex: 1; padding-right: 5px; word-break: break-all; }
          .col-qty { width: 30px; text-align: center; flex-shrink: 0; }
          .col-price { width: 60px; text-align: right; flex-shrink: 0; }
          
          .totals { margin-top: 10px; }
          .row { display: flex; justify-content: space-between; margin-bottom: 3px; }
          .total-row { 
            font-weight: bold; 
            font-size: 14px; 
            margin-top: 10px; 
            border-top: 1px solid #000; 
            border-bottom: 1px solid #000;
            padding: 5px 0;
          }
          
          .footer { text-align: center; margin-top: 20px; font-size: 11px; }
          .barcode { text-align: center; margin-top: 15px; }
          .barcode img { max-width: 100%; height: auto; }
          
          /* Simulate paper cut */
          .cut-line {
            border-top: 1px dotted #ccc;
            margin-top: 20px;
            padding-top: 5px;
            text-align: center;
            color: #999;
            font-size: 10px;
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

        <div class="divider"></div>
        
        <div class="items-header">
          <span class="col-name">Item</span>
          <span class="col-qty">Qty</span>
          <span class="col-price">Total</span>
        </div>
        
        <div class="items">
          ${sale.items.map((item: any) => `
            <div class="item">
              <span class="col-name">${item.name}</span>
              <span class="col-qty">${item.quantity}</span>
              <span class="col-price">${settings.currency_symbol}${(item.price_at_sale * item.quantity / 100).toFixed(2)}</span>
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
          <div class="row" style="margin-top: 5px;">
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
      </body>
    </html>
  `;
};
