import db from '../database/connection.js';

export interface Settings {
  store_name: string;
  store_address: string;
  store_phone: string;
  receipt_footer: string;
  printer_device_name: string;
  printer_paper_width: '80mm' | '58mm';
  currency_symbol: string;
  tax_percentage: number;
  low_stock_threshold: number;
}

const DEFAULT_SETTINGS: Settings = {
  store_name: 'My Store',
  store_address: '123 Main St',
  store_phone: '555-0123',
  receipt_footer: 'Thank you for your business!',
  printer_device_name: '',
  printer_paper_width: '80mm',
  currency_symbol: '₵',
  tax_percentage: 0,
  low_stock_threshold: 10
};

export const getSettings = (): Settings => {
  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string, value: string }[];
  
  const settings: any = { ...DEFAULT_SETTINGS };
  
  rows.forEach(row => {
    if (row.key in settings) {
      settings[row.key] = row.value;
    }
  });

  return settings as Settings;
};

export const saveSettings = (settings: Partial<Settings>) => {
  const insert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (@key, @value)');
  
  const transaction = db.transaction((settingsObj) => {
    for (const [key, value] of Object.entries(settingsObj)) {
      insert.run({ key, value: String(value) });
    }
  });

  transaction(settings);
  return getSettings();
};
