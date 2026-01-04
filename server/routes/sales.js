const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/', async (req, res) => {
  try {
    const [sales] = await db.query(`
      SELECT s.*, p.product_name, c.customer_name, e.employee_name
      FROM sales s
      JOIN products p ON s.product_id = p.product_id
      LEFT JOIN customers c ON s.customer_id = c.customer_id
      LEFT JOIN employees e ON s.employee_id = e.employee_id
      ORDER BY s.sale_date DESC
    `);
    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { product_id, quantity, sale_price, customer_id, employee_id, notes } = req.body;

    if (!product_id || !quantity || !sale_price) {
      return res.status(400).json({ error: 'Product, quantity, and sale price are required' });
    }

    const [inventory] = await connection.query(
      'SELECT quantity_available FROM inventory_status WHERE product_id = ?',
      [product_id]
    );

    if (inventory.length === 0 || inventory[0].quantity_available < quantity) {
      return res.status(400).json({ error: 'Insufficient inventory' });
    }

    const totalAmount = sale_price * quantity;

    const [result] = await connection.query(
      'INSERT INTO sales (product_id, quantity, sale_price, total_amount, customer_id, employee_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [product_id, quantity, sale_price, totalAmount, customer_id || null, employee_id || null, notes || null]
    );

    await connection.query(
      'UPDATE inventory_status SET quantity_available = quantity_available - ? WHERE product_id = ?',
      [quantity, product_id]
    );

    await connection.query(
      'UPDATE products SET total_quantity = total_quantity - ? WHERE product_id = ?',
      [quantity, product_id]
    );

    await connection.query(
      'INSERT INTO revenue_logs (log_date, sale_id, revenue_type, amount) VALUES (CURDATE(), ?, ?, ?)',
      [result.insertId, 'Sale', totalAmount]
    );

    await connection.commit();

    const [newSale] = await connection.query(
      'SELECT * FROM sales WHERE sale_id = ?',
      [result.insertId]
    );

    res.status(201).json(newSale[0]);
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

module.exports = router;
