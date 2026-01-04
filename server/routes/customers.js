const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/', async (req, res) => {
  try {
    const [customers] = await db.query(
      'SELECT * FROM customers ORDER BY customer_name'
    );
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [customers] = await db.query(
      'SELECT * FROM customers WHERE customer_id = ?',
      [req.params.id]
    );
    if (customers.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(customers[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { customer_name, phone_number, email, id_proof } = req.body;

    if (!customer_name || !phone_number) {
      return res.status(400).json({ error: 'Customer name and phone number are required' });
    }

    const [result] = await db.query(
      'INSERT INTO customers (customer_name, phone_number, email, id_proof) VALUES (?, ?, ?, ?)',
      [customer_name, phone_number, email || null, id_proof || null]
    );

    const [newCustomer] = await db.query(
      'SELECT * FROM customers WHERE customer_id = ?',
      [result.insertId]
    );

    res.status(201).json(newCustomer[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { customer_name, phone_number, email, id_proof } = req.body;

    await db.query(
      'UPDATE customers SET customer_name = ?, phone_number = ?, email = ?, id_proof = ? WHERE customer_id = ?',
      [customer_name, phone_number, email || null, id_proof || null, req.params.id]
    );

    const [updatedCustomer] = await db.query(
      'SELECT * FROM customers WHERE customer_id = ?',
      [req.params.id]
    );

    res.json(updatedCustomer[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM customers WHERE customer_id = ?', [req.params.id]);
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
