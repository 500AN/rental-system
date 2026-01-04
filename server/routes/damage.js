const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/', async (req, res) => {
  try {
    const [damaged] = await db.query(`
      SELECT d.*, p.product_name
      FROM damaged_items d
      JOIN products p ON d.product_id = p.product_id
      WHERE d.status = 'Damaged'
      ORDER BY d.date_damaged DESC
    `);
    res.json(damaged);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { product_id, quantity, damage_details } = req.body;

    if (!product_id || !quantity) {
      return res.status(400).json({ error: 'Product and quantity are required' });
    }

    const [result] = await connection.query(
      'INSERT INTO damaged_items (product_id, quantity, damage_details) VALUES (?, ?, ?)',
      [product_id, quantity, damage_details || '']
    );

    await connection.query(
      'UPDATE inventory_status SET quantity_available = quantity_available - ?, quantity_damaged = quantity_damaged + ? WHERE product_id = ?',
      [quantity, quantity, product_id]
    );

    await connection.commit();

    res.status(201).json({ message: 'Damage recorded successfully' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

router.put('/:id/repair', async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [damaged] = await connection.query(
      'SELECT * FROM damaged_items WHERE damage_id = ?',
      [req.params.id]
    );

    if (damaged.length === 0) {
      return res.status(404).json({ error: 'Damaged item not found' });
    }

    await connection.query(
      'UPDATE inventory_status SET quantity_damaged = quantity_damaged - ?, quantity_available = quantity_available + ? WHERE product_id = ?',
      [damaged[0].quantity, damaged[0].quantity, damaged[0].product_id]
    );

    await connection.query(
      'UPDATE damaged_items SET status = ? WHERE damage_id = ?',
      ['Repaired', req.params.id]
    );

    await connection.commit();

    res.json({ message: 'Item repaired successfully' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

module.exports = router;
