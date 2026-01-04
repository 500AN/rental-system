const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/daily', async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const [revenue] = await db.query(`
      SELECT 
        revenue_type,
        SUM(amount) as total_amount,
        COUNT(*) as transaction_count
      FROM revenue_logs
      WHERE log_date = ?
      GROUP BY revenue_type
    `, [targetDate]);

    const [total] = await db.query(`
      SELECT SUM(amount) as total_revenue
      FROM revenue_logs
      WHERE log_date = ?
    `, [targetDate]);

    res.json({
      date: targetDate,
      breakdown: revenue,
      total: total[0].total_revenue || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/monthly', async (req, res) => {
  try {
    const { year, month } = req.query;
    const targetYear = year || new Date().getFullYear();
    const targetMonth = month || (new Date().getMonth() + 1);

    const [revenue] = await db.query(`
      SELECT 
        revenue_type,
        SUM(amount) as total_amount,
        COUNT(*) as transaction_count
      FROM revenue_logs
      WHERE YEAR(log_date) = ? AND MONTH(log_date) = ?
      GROUP BY revenue_type
    `, [targetYear, targetMonth]);

    const [total] = await db.query(`
      SELECT SUM(amount) as total_revenue
      FROM revenue_logs
      WHERE YEAR(log_date) = ? AND MONTH(log_date) = ?
    `, [targetYear, targetMonth]);

    const [dailyBreakdown] = await db.query(`
      SELECT 
        log_date,
        SUM(amount) as daily_total
      FROM revenue_logs
      WHERE YEAR(log_date) = ? AND MONTH(log_date) = ?
      GROUP BY log_date
      ORDER BY log_date
    `, [targetYear, targetMonth]);

    res.json({
      year: targetYear,
      month: targetMonth,
      breakdown: revenue,
      total: total[0].total_revenue || 0,
      daily_breakdown: dailyBreakdown
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/all', async (req, res) => {
  try {
    const [logs] = await db.query(`
      SELECT r.*, b.booking_number, s.sale_id
      FROM revenue_logs r
      LEFT JOIN bookings b ON r.booking_id = b.booking_id
      LEFT JOIN sales s ON r.sale_id = s.sale_id
      ORDER BY r.log_date DESC, r.created_at DESC
      LIMIT 100
    `);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
