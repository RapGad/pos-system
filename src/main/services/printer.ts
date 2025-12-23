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
          printer
            .font('A')
            .align('CT')
            .style('B')
            .size(1, 1)
            .text(settings.store_name)
            .style('NORMAL')
            .size(1, 1)
            .text(settings.store_address)
            .text(settings.store_phone)
            .text('--------------------------------')
            .text(`Receipt: ${sale.receipt_number}`)
            .text(new Date(sale.created_at || Date.now()).toLocaleString())
            .text('--------------------------------')
            .align('LT');

          // Items
          sale.items.forEach((item: any) => {
            const total = (item.price_at_sale * item.quantity / 100).toFixed(2);
            printer.text(`${item.name}`);
            printer.tableCustom([
              { text: `${item.quantity} x ${(item.price_at_sale / 100).toFixed(2)}`, align: 'LEFT', width: 0.65 },
              { text: `${settings.currency_symbol}${total}`, align: 'RIGHT', width: 0.35 }
            ] as any);
          });

          printer.align('CT').text('--------------------------------').align('RT');

          // Totals
          const totalAmount = (sale.total_amount / 100).toFixed(2);
          printer.text(`TOTAL: ${settings.currency_symbol}${totalAmount}`);
          printer.text(`Payment: ${sale.payment_method?.toUpperCase() || 'CASH'}`);

          printer.align('CT').text('--------------------------------');
          
          // Footer
          if (settings.receipt_footer) {
            printer.text(settings.receipt_footer);
          }
          
          // Barcode
          printer.barcode(sale.receipt_number, 'CODE128', { width: 2, height: 50 } as any);
          
          // Cut
          printer.cut();
          
          // Close
          printer.close();
          resolve(true);
        } catch (printError) {
          console.error('Error sending commands to printer:', printError);
          reject(printError);
          // Ensure we try to close if possible, though close() might throw if not open
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
