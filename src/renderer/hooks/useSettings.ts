import { useState, useEffect, useCallback } from 'react';

export interface Settings {
  store_name: string;
  store_address: string;
  store_phone: string;
  receipt_footer: string;
  printer_device_name: string;
  currency_symbol: string;
  tax_percentage: number;
  low_stock_threshold: number;
}

export const useSettings = () => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      // @ts-ignore
      const result = await window.electronAPI.invoke('settings:get');
      setSettings(result);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    loading,
    fetchSettings
  };
};
