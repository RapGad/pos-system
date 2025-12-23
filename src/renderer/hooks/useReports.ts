import { useState, useCallback } from 'react';

export interface DailySales {
  total_transactions: number;
  total_revenue: number;
  cash_total: number;
  card_total: number;
}

export interface ProductPerformance {
  name: string;
  category: string;
  units_sold: number;
  revenue: number;
  profit: number;
}

export interface SalesHistory {
  date: string;
  revenue: number;
  transactions: number;
}

export interface InventoryValuation {
  total_cost_value: number;
  total_retail_value: number;
  total_products: number;
  low_stock_products: Array<{ id: number; name: string; stock_quantity: number }>;
}

export const useReports = () => {
  const [dailySales, setDailySales] = useState<DailySales | null>(null);
  const [productPerformance, setProductPerformance] = useState<ProductPerformance[]>([]);
  const [salesHistory, setSalesHistory] = useState<SalesHistory[]>([]);
  const [inventoryValuation, setInventoryValuation] = useState<InventoryValuation | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDailySales = useCallback(async (date: string, userId?: number) => {
    setLoading(true);
    try {
      // @ts-ignore
      const result = await window.electronAPI.invoke('reports:daily-sales', { date, userId });
      setDailySales(result);
    } catch (error) {
      console.error('Failed to fetch daily sales:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProductPerformance = useCallback(async (dateFrom: string, dateTo: string, userId?: number) => {
    setLoading(true);
    try {
      // @ts-ignore
      const result = await window.electronAPI.invoke('reports:product-performance', { dateFrom, dateTo, userId });
      setProductPerformance(result);
    } catch (error) {
      console.error('Failed to fetch product performance:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSalesHistory = useCallback(async (days: number = 30, userId?: number) => {
    setLoading(true);
    try {
      // @ts-ignore
      const result = await window.electronAPI.invoke('reports:sales-history', { days, userId });
      setSalesHistory(result);
    } catch (error) {
      console.error('Failed to fetch sales history:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchInventoryValuation = useCallback(async () => {
    setLoading(true);
    try {
      // @ts-ignore
      const result = await window.electronAPI.invoke('reports:inventory-valuation');
      setInventoryValuation(result);
    } catch (error) {
      console.error('Failed to fetch inventory valuation:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    dailySales,
    productPerformance,
    salesHistory,
    inventoryValuation,
    loading,
    fetchDailySales,
    fetchProductPerformance,
    fetchSalesHistory,
    fetchInventoryValuation
  };
};
