const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/', async (req, res) => {
  try {
    const [inventory] = await db.query(`
      SELECT i.*, p.product_name
      FROM inventory_status i
      JOIN products p ON i.product_id = p.product_id
      ORDER BY p.product_name
    `);
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/check-availability', async (req, res) => {
  try {
    const { product_id, quantity, start_date, end_date } = req.query;

    const [inventory] = await db.query(
      'SELECT quantity_available FROM inventory_status WHERE product_id = ?',
      [product_id]
    );

    if (inventory.length === 0) {
      return res.json({ available: false, message: 'Product not found' });
    }

    const [overlappingBookings] = await db.query(`
      SELECT SUM(bi.quantity) as booked_quantity
      FROM booking_items bi
      JOIN bookings b ON bi.booking_id = b.booking_id
      WHERE bi.product_id = ?
      AND b.booking_status IN ('Booked', 'Active')
      AND (
        (b.rental_start_date <= ? AND b.rental_end_date >= ?)
        OR (b.rental_start_date <= ? AND b.rental_end_date >= ?)
        OR (b.rental_start_date >= ? AND b.rental_end_date <= ?)
      )
    `, [product_id, end_date, start_date, end_date, end_date, start_date, end_date]);

    const bookedQty = overlappingBookings[0].booked_quantity || 0;
    const availableQty = inventory[0].quantity_available - bookedQty;

    if (availableQty >= parseInt(quantity)) {
      res.json({ available: true, available_quantity: availableQty });
    } else {
      res.json({ 
        available: false, 
        available_quantity: availableQty,
        message: `Only ${availableQty} units available for selected dates` 
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
