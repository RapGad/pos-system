import { useState, useCallback } from 'react';
import type { Product } from './useProducts';
import { useAuth } from './useAuth';

export interface CartItem extends Product {
  quantity: number;
}

export const useCart = () => {
  const { user } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToCart = useCallback((product: Product): { success: boolean; error?: string } => {
    let result: { success: boolean; error?: string } = { success: true };
    
    if (product.stock_quantity <= 0) {
      return { success: false, error: 'Product is out of stock' };
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock_quantity) {
          result = { success: false, error: `Only ${product.stock_quantity} units available` };
          return prev;
        }
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    
    return result;
  }, []);

  const removeFromCart = useCallback((productId: number) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: number, quantity: number): { success: boolean; error?: string } => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return { success: true };
    }

    let result: { success: boolean; error?: string } = { success: true };

    setCart((prev) => {
      const item = prev.find(i => i.id === productId);
      if (item && quantity > item.stock_quantity) {
        result = { success: false, error: `Only ${item.stock_quantity} units available` };
        return prev;
      }
      return prev.map((item) => (item.id === productId ? { ...item, quantity } : item));
    });

    return result;
  }, [removeFromCart]);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const checkout = async (paymentMethod: 'cash' | 'card', customerName?: string, amountPaid?: number): Promise<{ success: boolean; error?: string; saleData?: any }> => {
    if (!user) return { success: false, error: 'User not authenticated' };
    
    const saleData: any = {
      receipt_number: `REC-${Date.now()}`, // Simple receipt number generation
      total_amount: total,
      payment_method: paymentMethod,
      customer_name: customerName,
      user_id: user.id,
      // Manually format local time as YYYY-MM-DDTHH:mm:ss to ensure consistency across all locales
      created_at: (() => {
        const now = new Date();
        const pad = (num: number) => num.toString().padStart(2, '0');
        const year = now.getFullYear();
        const month = pad(now.getMonth() + 1);
        const day = pad(now.getDate());
        const hours = pad(now.getHours());
        const minutes = pad(now.getMinutes());
        const seconds = pad(now.getSeconds());
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
      })(),
      items: cart.map((item) => ({
        product_id: item.id,
        quantity: item.quantity,
        price_at_sale: item.price,
        discount: 0,
        name: item.name // Add name for printer
      }))
    };

    // Add payment tracking for cash transactions
    if (paymentMethod === 'cash' && amountPaid != null) {
      saleData.amount_paid = amountPaid;
      saleData.change_given = amountPaid - total;
    }

    try {
      // @ts-ignore
      await window.electronAPI.invoke('sales:create', saleData);
      clearCart();
      return { success: true, saleData };
    } catch (error: any) {
      console.error('Checkout failed:', error);
      return { success: false, error: error.message || 'Checkout failed' };
    }
  };

  return {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    total,
    checkout
  };
};
