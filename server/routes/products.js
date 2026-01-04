const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/', async (req, res) => {
  try {
    const [products] = await db.query(`
      SELECT p.*, sl.location_name, 
             COALESCE(i.quantity_available, 0) as quantity_available,
             COALESCE(i.quantity_rented, 0) as quantity_rented,
             COALESCE(i.quantity_washing, 0) as quantity_washing,
             COALESCE(i.quantity_damaged, 0) as quantity_damaged
      FROM products p
      LEFT JOIN storage_locations sl ON p.storage_location_id = sl.location_id
      LEFT JOIN inventory_status i ON p.product_id = i.product_id
      ORDER BY p.product_name
    `);
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/available', async (req, res) => {
  try {
    const [products] = await db.query(`
      SELECT p.*, sl.location_name, 
             COALESCE(i.quantity_available, 0) as quantity_available
      FROM products p
      LEFT JOIN storage_locations sl ON p.storage_location_id = sl.location_id
      LEFT JOIN inventory_status i ON p.product_id = i.product_id
      WHERE p.status = 'Available' AND COALESCE(i.quantity_available, 0) > 0
      ORDER BY p.product_name
    `);
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/barcode/:barcode', async (req, res) => {
  try {
    const [products] = await db.query(`
      SELECT p.*, sl.location_name,
             COALESCE(i.quantity_available, 0) as quantity_available
      FROM products p
      LEFT JOIN storage_locations sl ON p.storage_location_id = sl.location_id
      LEFT JOIN inventory_status i ON p.product_id = i.product_id
      WHERE p.barcode = ? AND p.status = 'Available'
    `, [req.params.barcode]);

    if (products.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(products[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [products] = await db.query(`
      SELECT p.*, sl.location_name, 
             COALESCE(i.quantity_available, 0) as quantity_available,
             COALESCE(i.quantity_rented, 0) as quantity_rented,
             COALESCE(i.quantity_washing, 0) as quantity_washing,
             COALESCE(i.quantity_damaged, 0) as quantity_damaged
      FROM products p
      LEFT JOIN storage_locations sl ON p.storage_location_id = sl.location_id
      LEFT JOIN inventory_status i ON p.product_id = i.product_id
      WHERE p.product_id = ?
    `, [req.params.id]);
    
    if (products.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(products[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { product_name, barcode, total_quantity, rental_price, sale_price, storage_location_id } = req.body;

    if (!product_name || total_quantity === undefined || !rental_price || !sale_price) {
      return res.status(400).json({ error: 'All product fields are required' });
    }

    const [result] = await connection.query(
      'INSERT INTO products (product_name, barcode, total_quantity, rental_price, sale_price, storage_location_id) VALUES (?, ?, ?, ?, ?, ?)',
      [product_name, barcode || null, total_quantity, rental_price, sale_price, storage_location_id || null]
    );

    await connection.query(
      'INSERT INTO inventory_status (product_id, quantity_available) VALUES (?, ?)',
      [result.insertId, total_quantity]
    );

    await connection.commit();

    const [newProduct] = await connection.query(
      'SELECT * FROM products WHERE product_id = ?',
      [result.insertId]
    );

    res.status(201).json(newProduct[0]);
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { product_name, barcode, total_quantity, rental_price, sale_price, storage_location_id, status } = req.body;

    await db.query(
      'UPDATE products SET product_name = ?, barcode = ?, total_quantity = ?, rental_price = ?, sale_price = ?, storage_location_id = ?, status = ? WHERE product_id = ?',
      [product_name, barcode || null, total_quantity, rental_price, sale_price, storage_location_id || null, status || 'Available', req.params.id]
    );

    const [updatedProduct] = await db.query(
      'SELECT * FROM products WHERE product_id = ?',
      [req.params.id]
    );

    res.json(updatedProduct[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
