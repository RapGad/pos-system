import db from '../database/connection.js';

export interface Product {
  id: number;
  barcode: string;
  name: string;
  category_id: number;
  price: number;
  cost: number;
  stock_quantity: number;
  is_active: number;
}

export const getProducts = (filters: { search?: string; categoryId?: number; stockStatus?: 'all' | 'low' | 'out'; includeInactive?: boolean; page?: number; pageSize?: number } = {}) => {
  const { search, categoryId, stockStatus, includeInactive = false, page = 0, pageSize = 10 } = filters;
  
  let baseQuery = `
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE (p.is_active = 1 OR ? = 1)
  `;
  const params: any[] = [includeInactive ? 1 : 0];

  if (search) {
    baseQuery += ' AND (p.name LIKE ? OR p.barcode LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  if (categoryId) {
    baseQuery += ' AND p.category_id = ?';
    params.push(categoryId);
  }

  if (stockStatus === 'low') {
    const threshold = db.prepare("SELECT value FROM settings WHERE key = 'low_stock_threshold'").get() as { value: string } | undefined;
    baseQuery += ' AND p.stock_quantity > 0 AND p.stock_quantity <= ?';
    params.push(Number(threshold?.value || 10));
  } else if (stockStatus === 'out') {
    baseQuery += ' AND p.stock_quantity <= 0';
  }

  // Get total count
  const countResult = db.prepare(`SELECT COUNT(*) as count ${baseQuery}`).get(...params) as { count: number };
  
  // Get paginated data
  const dataQuery = `SELECT p.*, c.name as category_name ${baseQuery} LIMIT ? OFFSET ?`;
  const products = db.prepare(dataQuery).all(...params, pageSize, page * pageSize);

  return {
    products,
    total: countResult.count
  };
};

export const getProductByBarcode = (barcode: string) => {
  return db.prepare(`
    SELECT p.*, c.name as category_name 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.barcode = ?
  `).get(barcode);
};

export const createProduct = (product: Omit<Product, 'id'>) => {
  const stmt = db.prepare(`
    INSERT INTO products (barcode, name, category_id, price, cost, stock_quantity)
    VALUES (@barcode, @name, @category_id, @price, @cost, @stock_quantity)
  `);
  return stmt.run(product);
};

export const updateProduct = (id: number, product: Partial<Product>) => {
  // Dynamic update query
  const keys = Object.keys(product).filter(k => k !== 'id');
  if (keys.length === 0) return;
  
  const setClause = keys.map(k => `${k} = @${k}`).join(', ');
  const stmt = db.prepare(`UPDATE products SET ${setClause} WHERE id = @id`);
  return stmt.run({ ...product, id });
};

export const getCategories = () => {
  return db.prepare('SELECT * FROM categories ORDER BY name ASC').all();
};

export const createCategory = (name: string) => {
  return db.prepare('INSERT INTO categories (name) VALUES (?)').run(name);
};

export const updateCategory = (id: number, name: string) => {
  return db.prepare('UPDATE categories SET name = ? WHERE id = ?').run(name, id);
};

export const deleteCategory = (id: number) => {
  // Check if products exist in this category
  const productsCount = db.prepare('SELECT COUNT(*) as count FROM products WHERE category_id = ? AND is_active = 1').get(id) as { count: number };
  if (productsCount.count > 0) {
    throw new Error('Cannot delete category with active products');
  }
  return db.prepare('DELETE FROM categories WHERE id = ?').run(id);
};

export const deleteProduct = (id: number) => {
  // Soft delete to avoid foreign key constraint issues and preserve history
  return db.prepare('UPDATE products SET is_active = 0 WHERE id = ?').run(id);
};
