import db from '../database/connection.js';

export const getDailySales = (date: string, userId?: number) => {
  // date format: YYYY-MM-DD
  let query = `
    SELECT 
      COUNT(*) as total_transactions,
      SUM(total_amount) as total_revenue,
      SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END) as cash_total,
      SUM(CASE WHEN payment_method = 'card' THEN total_amount ELSE 0 END) as card_total
    FROM sales
    WHERE date(created_at) = ?
  `;
  
  const params: any[] = [date];
  
  if (userId) {
    query += ' AND user_id = ?';
    params.push(userId);
  }
  
  return db.prepare(query).get(...params);
};

export const getProductPerformance = (dateFrom: string, dateTo: string, userId?: number) => {
  let query = `
    SELECT 
      p.name,
      c.name as category,
      SUM(si.quantity) as units_sold,
      SUM(si.quantity * si.price_at_sale) as revenue,
      SUM(si.quantity * (si.price_at_sale - p.cost)) as profit
    FROM sale_items si
    JOIN products p ON si.product_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    JOIN sales s ON si.sale_id = s.id
    WHERE date(s.created_at) BETWEEN ? AND ?
  `;
  
  const params: any[] = [dateFrom, dateTo];
  
  if (userId) {
    query += ' AND s.user_id = ?';
    params.push(userId);
  }
  
  query += ' GROUP BY p.id ORDER BY revenue DESC';
  
  return db.prepare(query).all(...params);
};

export const getInventoryValuation = () => {
  const stats = db.prepare(`
    SELECT 
      SUM(stock_quantity * cost) as total_cost_value,
      SUM(stock_quantity * price) as total_retail_value,
      COUNT(*) as total_products
    FROM products
    WHERE is_active = 1
  `).get() as any;

  const threshold = db.prepare("SELECT value FROM settings WHERE key = 'low_stock_threshold'").get() as { value: string } | undefined;
  const lowStockProducts = db.prepare(`
    SELECT id, name, stock_quantity 
    FROM products 
    WHERE is_active = 1 AND stock_quantity <= ?
    ORDER BY stock_quantity ASC
  `).all(Number(threshold?.value || 10));

  // Products expiring within 2 months (60 days)
  const expiringProducts = db.prepare(`
    SELECT id, name, expiry_date, stock_quantity
    FROM products
    WHERE is_active = 1 
      AND expiry_date IS NOT NULL 
      AND date(expiry_date) <= date('now', '+2 months')
    ORDER BY expiry_date ASC
  `).all();

  return { 
    ...stats, 
    low_stock_products: lowStockProducts,
    expiring_products: expiringProducts
  };
};

export const getSalesHistory = (days: number = 30, userId?: number, dateFrom?: string, dateTo?: string) => {
  let query = `
    SELECT 
      date(s.created_at) as date,
      COUNT(DISTINCT s.id) as transactions,
      SUM(si.quantity * si.price_at_sale) as revenue,
      SUM(si.quantity * (si.price_at_sale - p.cost)) as profit
    FROM sales s
    JOIN sale_items si ON s.id = si.sale_id
    JOIN products p ON si.product_id = p.id
    WHERE 1=1
  `;
  
  const params: any[] = [];

  if (dateFrom && dateTo) {
    query += ' AND date(s.created_at) BETWEEN ? AND ?';
    params.push(dateFrom, dateTo);
  } else {
    query += " AND s.created_at >= date('now', ?)";
    params.push(`-${days} days`);
  }
  
  if (userId) {
    query += ' AND s.user_id = ?';
    params.push(userId);
  }
  
  query += ' GROUP BY date(s.created_at) ORDER BY date ASC';
  
  return db.prepare(query).all(...params);
};
