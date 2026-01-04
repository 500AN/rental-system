const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/', async (req, res) => {
  try {
    const [locations] = await db.query(
      'SELECT * FROM storage_locations ORDER BY location_name'
    );
    res.json(locations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { location_name } = req.body;
    
    if (!location_name) {
      return res.status(400).json({ error: 'Location name is required' });
    }

    const [result] = await db.query(
      'INSERT INTO storage_locations (location_name) VALUES (?)',
      [location_name]
    );

    const [newLocation] = await db.query(
      'SELECT * FROM storage_locations WHERE location_id = ?',
      [result.insertId]
    );

    res.status(201).json(newLocation[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
