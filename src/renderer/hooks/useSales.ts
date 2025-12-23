import { useState, useCallback } from 'react';

export interface Sale {
  id: number;
  receipt_number: string;
  total_amount: number;
  payment_method: string;
  user_id: number;
  username: string;
  created_at: string;
}

export interface SaleDetail extends Sale {
  items: Array<{
    id: number;
    product_id: number;
    product_name: string;
    quantity: number;
    price_at_sale: number;
    discount: number;
  }>;
}

export const useSales = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [totalSales, setTotalSales] = useState(0);
  const [selectedSale, setSelectedSale] = useState<SaleDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSales = useCallback(async (filters: { dateFrom?: string; dateTo?: string; paymentMethod?: string; userId?: number; receiptNumber?: string; page?: number; pageSize?: number } = {}) => {
    setLoading(true);
    try {
      // @ts-ignore
      const result = await window.electronAPI.invoke('sales:get-history', filters);
      // Handle both old (array) and new (object) return types for safety during transition
      if (Array.isArray(result)) {
        setSales(result);
        setTotalSales(result.length);
      } else {
        setSales(result.sales);
        setTotalSales(result.total);
      }
    } catch (error) {
      console.error('Failed to fetch sales history:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSaleDetails = useCallback(async (saleId: number) => {
    setLoading(true);
    try {
      // @ts-ignore
      const result = await window.electronAPI.invoke('sales:get-details', saleId);
      setSelectedSale(result);
    } catch (error) {
      console.error('Failed to fetch sale details:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    sales,
    totalSales,
    selectedSale,
    loading,
    fetchSales,
    fetchSaleDetails,
    setSelectedSale
  };
};
