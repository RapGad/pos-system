import { useState, useEffect, useCallback } from 'react';

export interface Product {
  id: number;
  barcode: string;
  name: string;
  category_id: number;
  category_name?: string;
  price: number;
  cost: number;
  stock_quantity: number;
  is_active: number;
}

export interface Category {
  id: number;
  name: string;
}

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchProducts = useCallback(async (filters: { search?: string; categoryId?: number; stockStatus?: 'all' | 'low' | 'out'; page?: number; pageSize?: number } = {}) => {
    setLoading(true);
    try {
      // @ts-ignore
      const result = await window.electronAPI.invoke('products:get-all', filters);
      // Handle both old (array) and new (object) return types for safety during transition
      if (Array.isArray(result)) {
        setProducts(result);
        setTotalProducts(result.length);
      } else {
        setProducts(result.products);
        setTotalProducts(result.total);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      // @ts-ignore
      const result = await window.electronAPI.invoke('categories:get-all');
      setCategories(result);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  }, []);

  const createProduct = async (product: Omit<Product, 'id' | 'category_name' | 'is_active'>, userRole?: string) => {
    try {
      // @ts-ignore
      await window.electronAPI.invoke('products:create', { product, userRole });
      fetchProducts();
      return true;
    } catch (error) {
      console.error('Failed to create product:', error);
      return false;
    }
  };

  const updateProduct = async (id: number, product: Partial<Product>, userRole?: string) => {
    try {
      // @ts-ignore
      await window.electronAPI.invoke('products:update', { id, product, userRole });
      fetchProducts();
      return true;
    } catch (error) {
      console.error('Failed to update product:', error);
      return false;
    }
  };

  const deleteProduct = async (id: number, userRole?: string) => {
    try {
      // @ts-ignore
      await window.electronAPI.invoke('products:delete', { id, userRole });
      fetchProducts();
      return true;
    } catch (error) {
      console.error('Failed to delete product:', error);
      return false;
    }
  };

  const createCategory = async (name: string, userRole?: string) => {
    try {
      // @ts-ignore
      await window.electronAPI.invoke('categories:create', { name, userRole });
      fetchCategories();
      return true;
    } catch (error) {
      console.error('Failed to create category:', error);
      return false;
    }
  };

  const updateCategory = async (id: number, name: string, userRole?: string) => {
    try {
      // @ts-ignore
      await window.electronAPI.invoke('categories:update', { id, name, userRole });
      fetchCategories();
      return true;
    } catch (error) {
      console.error('Failed to update category:', error);
      return false;
    }
  };

  const deleteCategory = async (id: number, userRole?: string) => {
    try {
      // @ts-ignore
      await window.electronAPI.invoke('categories:delete', { id, userRole });
      fetchCategories();
      return true;
    } catch (error: any) {
      console.error('Failed to delete category:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [fetchProducts, fetchCategories]);

  return {
    products,
    totalProducts,
    categories,
    loading,
    fetchProducts,
    fetchCategories,
    createProduct,
    updateProduct,
    deleteProduct,
    createCategory,
    updateCategory,
    deleteCategory
  };
};
