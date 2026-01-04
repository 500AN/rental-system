const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/', async (req, res) => {
  try {
    const [employees] = await db.query(
      'SELECT * FROM employees ORDER BY employee_name'
    );
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { employee_name } = req.body;
    
    if (!employee_name) {
      return res.status(400).json({ error: 'Employee name is required' });
    }

    const [result] = await db.query(
      'INSERT INTO employees (employee_name) VALUES (?)',
      [employee_name]
    );

    const [newEmployee] = await db.query(
      'SELECT * FROM employees WHERE employee_id = ?',
      [result.insertId]
    );

    res.status(201).json(newEmployee[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
