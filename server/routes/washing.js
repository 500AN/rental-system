const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/', async (req, res) => {
  try {
    const [washing] = await db.query(`
      SELECT w.*, p.product_name,
             DATEDIFF(NOW(), w.date_sent) as days_in_washing
      FROM washing_items w
      JOIN products p ON w.product_id = p.product_id
      WHERE w.status = 'Washing'
      ORDER BY w.date_sent
    `);
    res.json(washing);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/alerts', async (req, res) => {
  try {
    const [alerts] = await db.query(`
      SELECT w.*, p.product_name,
             DATEDIFF(NOW(), w.date_sent) as days_in_washing
      FROM washing_items w
      JOIN products p ON w.product_id = p.product_id
      WHERE w.status = 'Washing' AND DATEDIFF(NOW(), w.date_sent) > 3
      ORDER BY w.date_sent
    `);
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/return', async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [washing] = await connection.query(
      'SELECT * FROM washing_items WHERE washing_id = ?',
      [req.params.id]
    );

    if (washing.length === 0) {
      return res.status(404).json({ error: 'Washing item not found' });
    }

    await connection.query(
      'UPDATE inventory_status SET quantity_washing = quantity_washing - ?, quantity_available = quantity_available + ? WHERE product_id = ?',
      [washing[0].quantity, washing[0].quantity, washing[0].product_id]
    );

    await connection.query(
      'UPDATE washing_items SET status = ?, date_returned = NOW() WHERE washing_id = ?',
      ['Returned', req.params.id]
    );

    await connection.commit();

    res.json({ message: 'Item returned from washing successfully' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

module.exports = router;
