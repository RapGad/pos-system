import db from '../database/connection.js';

export interface SaleItem {
  product_id: number;
  quantity: number;
  price_at_sale: number;
  discount: number;
}

export interface Sale {
  receipt_number: string;
  total_amount: number;
  payment_method: string;
  customer_name?: string;
  user_id: number;
  items: SaleItem[];
}

export const createSale = (sale: Sale) => {
  const { items, ...saleData } = sale;
  
  // Use a transaction to ensure data integrity
  const transaction = db.transaction(() => {
    // 0. Check Stock Availability
    const checkStock = db.prepare('SELECT stock_quantity, name FROM products WHERE id = ?');
    for (const item of items) {
      const product = checkStock.get(item.product_id) as any;
      if (!product || product.stock_quantity < item.quantity) {
        throw new Error(`Insufficient stock for ${product?.name || 'product'}`);
      }
    }

    // 1. Create Sale Record
    const insertSale = db.prepare(`
      INSERT INTO sales (receipt_number, total_amount, payment_method, customer_name, user_id)
      VALUES (@receipt_number, @total_amount, @payment_method, @customer_name, @user_id)
    `);
    const info = insertSale.run(saleData);
    const saleId = info.lastInsertRowid;
    
    // 2. Insert Sale Items and Update Stock
    const insertItem = db.prepare(`
      INSERT INTO sale_items (sale_id, product_id, quantity, price_at_sale, discount)
      VALUES (@sale_id, @product_id, @quantity, @price_at_sale, @discount)
    `);
    
    const updateStock = db.prepare(`
      UPDATE products 
      SET stock_quantity = stock_quantity - @quantity 
      WHERE id = @product_id
    `);
    
    const logInventory = db.prepare(`
      INSERT INTO inventory_logs (product_id, change_amount, reason, user_id)
      VALUES (@product_id, @change_amount, 'sale', @user_id)
    `);
    
    for (const item of items) {
      insertItem.run({ ...item, sale_id: saleId });
      updateStock.run({ quantity: item.quantity, product_id: item.product_id });
      logInventory.run({ 
        product_id: item.product_id, 
        change_amount: -item.quantity, 
        user_id: sale.user_id 
      });
    }
    
    return saleId;
  });
  
  try {
    return transaction();
  } catch (error) {
    console.error('Sale transaction failed:', error);
    throw error;
  }
};

export const getSales = (filters: { dateFrom?: string; dateTo?: string; paymentMethod?: string; userId?: number; receiptNumber?: string; customerName?: string; page?: number; pageSize?: number } = {}) => {
  const { dateFrom, dateTo, paymentMethod, userId, receiptNumber, customerName, page = 0, pageSize = 10 } = filters;
  let baseQuery = `
    FROM sales s
    LEFT JOIN users u ON s.user_id = u.id
    WHERE 1=1
  `;
  
  const params: any[] = [];
  
  if (dateFrom && dateTo) {
    baseQuery += ' AND date(s.created_at) BETWEEN ? AND ?';
    params.push(dateFrom, dateTo);
  }
  
  if (paymentMethod) {
    baseQuery += ' AND s.payment_method = ?';
    params.push(paymentMethod);
  }
  
  if (userId) {
    baseQuery += ' AND s.user_id = ?';
    params.push(userId);
  }
  
  if (receiptNumber) {
    baseQuery += ' AND s.receipt_number LIKE ?';
    params.push(`%${receiptNumber}%`);
  }

  if (customerName) {
    baseQuery += ' AND s.customer_name LIKE ?';
    params.push(`%${customerName}%`);
  }
  
  // Get total count
  const countResult = db.prepare(`SELECT COUNT(*) as count ${baseQuery}`).get(...params) as { count: number };
  
  // Get paginated data
  const dataQuery = `SELECT s.*, u.username ${baseQuery} ORDER BY s.created_at DESC LIMIT ? OFFSET ?`;
  const sales = db.prepare(dataQuery).all(...params, pageSize, page * pageSize);
  
  return {
    sales,
    total: countResult.count
  };
};

export const getSaleDetails = (saleId: number) => {
  const sale = db.prepare(`
    SELECT s.*, u.username 
    FROM sales s
    LEFT JOIN users u ON s.user_id = u.id
    WHERE s.id = ?
  `).get(saleId);
  
  if (!sale) return null;
  
  const items = db.prepare(`
    SELECT si.*, p.name as product_name
    FROM sale_items si
    JOIN products p ON si.product_id = p.id
    WHERE si.sale_id = ?
  `).all(saleId);
  
  return { ...sale, items };
};
