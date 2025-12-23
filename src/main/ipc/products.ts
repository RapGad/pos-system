import { ipcMain } from 'electron';
import { 
  getProducts, 
  getProductByBarcode, 
  createProduct, 
  updateProduct, 
  getCategories, 
  createCategory,
  updateCategory,
  deleteCategory,
  deleteProduct 
} from '../services/products.js';

export const registerProductHandlers = () => {
  ipcMain.handle('products:get-all', (_, filters) => {
    return getProducts(filters);
  });
  ipcMain.handle('products:get-by-barcode', (_, barcode) => {
    return getProductByBarcode(barcode);
  });
  ipcMain.handle('products:create', (_, { product, userRole }) => {
    if (userRole === 'cashier') throw new Error('Unauthorized');
    return createProduct(product);
  });
  ipcMain.handle('products:update', (_, { id, product, userRole }) => {
    if (userRole === 'cashier') throw new Error('Unauthorized');
    return updateProduct(id, product);
  });
  ipcMain.handle('products:delete', (_, { id, userRole }) => {
    if (userRole === 'cashier') throw new Error('Unauthorized');
    return deleteProduct(id);
  });
  
  // Categories
  ipcMain.handle('categories:get-all', () => {
    return getCategories();
  });
  ipcMain.handle('categories:create', (_, { name, userRole }) => {
    if (userRole === 'cashier') throw new Error('Unauthorized');
    return createCategory(name);
  });
  ipcMain.handle('categories:update', (_, { id, name, userRole }) => {
    if (userRole === 'cashier') throw new Error('Unauthorized');
    return updateCategory(id, name);
  });
  ipcMain.handle('categories:delete', (_, { id, userRole }) => {
    if (userRole === 'cashier') throw new Error('Unauthorized');
    return deleteCategory(id);
  });
};
