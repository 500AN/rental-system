const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { sendBookingNotifications } = require('../services/notificationService');

router.get('/', async (req, res) => {
  try {
    const [bookings] = await db.query(`
      SELECT b.*, c.customer_name, c.phone_number, e.employee_name
      FROM bookings b
      JOIN customers c ON b.customer_id = c.customer_id
      JOIN employees e ON b.employee_id = e.employee_id
      ORDER BY b.created_at DESC
    `);
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/due-today', async (req, res) => {
  try {
    const [bookings] = await db.query(`
      SELECT b.*, c.customer_name, c.phone_number, e.employee_name
      FROM bookings b
      JOIN customers c ON b.customer_id = c.customer_id
      JOIN employees e ON b.employee_id = e.employee_id
      WHERE b.rental_end_date = CURDATE() AND b.booking_status = 'Active'
      ORDER BY b.booking_number
    `);
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [bookings] = await db.query(`
      SELECT b.*, c.customer_name, c.phone_number, e.employee_name
      FROM bookings b
      JOIN customers c ON b.customer_id = c.customer_id
      JOIN employees e ON b.employee_id = e.employee_id
      WHERE b.booking_id = ?
    `, [req.params.id]);

    if (bookings.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const [items] = await db.query(`
      SELECT bi.*, p.product_name
      FROM booking_items bi
      JOIN products p ON bi.product_id = p.product_id
      WHERE bi.booking_id = ?
    `, [req.params.id]);

    res.json({ ...bookings[0], items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    let {
      booking_number,
      customer_id,
      employee_id,
      rental_start_date,
      rental_end_date,
      items,
      advance_amount,
      advance_payment_method
    } = req.body;

    if (!customer_id || !employee_id || !rental_start_date || !rental_end_date || !items || items.length === 0) {
      return res.status(400).json({ error: 'All booking fields are required' });
    }

    if (!booking_number) {
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

      const [lastBooking] = await connection.query(
        `SELECT booking_number FROM bookings
         WHERE booking_number LIKE ?
         ORDER BY booking_number DESC LIMIT 1`,
        [`BK-${dateStr}-%`]
      );

      let sequence = 1;
      if (lastBooking.length > 0) {
        const lastNumber = lastBooking[0].booking_number;
        const lastSeq = parseInt(lastNumber.split('-')[2]);
        sequence = lastSeq + 1;
      }

      booking_number = `BK-${dateStr}-${String(sequence).padStart(3, '0')}`;
    }

    const [existingBooking] = await connection.query(
      'SELECT booking_id FROM bookings WHERE booking_number = ?',
      [booking_number]
    );

    if (existingBooking.length > 0) {
      return res.status(400).json({ error: 'Booking number already exists' });
    }

    let totalAmount = 0;
    for (const item of items) {
      totalAmount += parseFloat(item.item_total_amount);
    }

    const [bookingResult] = await connection.query(
      `INSERT INTO bookings (booking_number, customer_id, employee_id, rental_start_date, rental_end_date,
       total_amount, advance_amount, remaining_balance, advance_payment_method)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [booking_number, customer_id, employee_id, rental_start_date, rental_end_date, 
       totalAmount, advance_amount || 0, totalAmount - (advance_amount || 0), advance_payment_method || null]
    );

    const bookingId = bookingResult.insertId;

    for (const item of items) {
      await connection.query(
        `INSERT INTO booking_items (booking_id, product_id, quantity, rental_duration_days, 
         default_rental_price, agreed_rental_price, item_total_amount) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [bookingId, item.product_id, item.quantity, item.rental_duration_days, 
         item.default_rental_price, item.agreed_rental_price, item.item_total_amount]
      );
    }

    if (advance_amount && advance_amount > 0) {
      await connection.query(
        'INSERT INTO payments (booking_id, payment_type, amount, payment_method) VALUES (?, ?, ?, ?)',
        [bookingId, 'Advance', advance_amount, advance_payment_method || null]
      );

      await connection.query(
        'INSERT INTO revenue_logs (log_date, booking_id, revenue_type, amount) VALUES (CURDATE(), ?, ?, ?)',
        [bookingId, 'Rental_Advance', advance_amount]
      );
    }

    await connection.commit();

    const [newBooking] = await connection.query(
      'SELECT * FROM bookings WHERE booking_id = ?',
      [bookingId]
    );

    const [customer] = await connection.query(
      'SELECT customer_name, phone_number, email FROM customers WHERE customer_id = ?',
      [customer_id]
    );

    const [bookingItems] = await connection.query(`
      SELECT bi.*, p.product_name
      FROM booking_items bi
      JOIN products p ON bi.product_id = p.product_id
      WHERE bi.booking_id = ?
    `, [bookingId]);

    const notificationData = {
      booking_number,
      customer_name: customer[0].customer_name,
      rental_start_date,
      rental_end_date,
      items: bookingItems.map(item => ({
        product_name: item.product_name,
        quantity: item.quantity,
        agreed_price: item.agreed_rental_price,
        total_amount: item.item_total_amount
      })),
      total_amount: totalAmount,
      advance_amount: advance_amount || 0
    };

    sendBookingNotifications(customer[0], notificationData).catch(err => {
      console.error('Error sending notifications:', err);
    });

    res.status(201).json(newBooking[0]);
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

router.put('/:id/pickup', async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { final_amount, payment_method, additional_items } = req.body;
    const bookingId = req.params.id;

    const [booking] = await connection.query(
      'SELECT * FROM bookings WHERE booking_id = ?',
      [bookingId]
    );

    if (booking.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const [items] = await connection.query(
      'SELECT * FROM booking_items WHERE booking_id = ?',
      [bookingId]
    );

    for (const item of items) {
      await connection.query(
        'UPDATE inventory_status SET quantity_available = quantity_available - ?, quantity_rented = quantity_rented + ? WHERE product_id = ?',
        [item.quantity, item.quantity, item.product_id]
      );
    }

    let additionalTotal = 0;

    // Process additional items if any
    if (additional_items && additional_items.length > 0) {
      for (const item of additional_items) {
        // Add to booking_items
        await connection.query(
          'INSERT INTO booking_items (booking_id, product_id, quantity, agreed_rental_price, rental_duration_days, item_total_amount) VALUES (?, ?, ?, ?, ?, ?)',
          [bookingId, item.product_id, item.quantity, item.agreed_rental_price, item.rental_duration_days, item.item_total_amount]
        );

        // Update inventory
        await connection.query(
          'UPDATE inventory_status SET quantity_available = quantity_available - ?, quantity_rented = quantity_rented + ? WHERE product_id = ?',
          [item.quantity, item.quantity, item.product_id]
        );

        additionalTotal += parseFloat(item.item_total_amount);
      }
    }

    const newTotalAmount = parseFloat(booking[0].total_amount) + additionalTotal;
    const remainingBalance = newTotalAmount - booking[0].advance_amount - (final_amount || 0);

    await connection.query(
      'UPDATE bookings SET booking_status = ?, final_amount = ?, remaining_balance = ?, total_amount = ? WHERE booking_id = ?',
      ['Active', final_amount || 0, remainingBalance, newTotalAmount, bookingId]
    );

    if (final_amount && final_amount > 0) {
      await connection.query(
        'INSERT INTO payments (booking_id, payment_type, amount, payment_method) VALUES (?, ?, ?, ?)',
        [bookingId, 'Final', final_amount, payment_method || null]
      );

      await connection.query(
        'INSERT INTO revenue_logs (log_date, booking_id, revenue_type, amount) VALUES (CURDATE(), ?, ?, ?)',
        [bookingId, 'Rental_Final', final_amount]
      );
    }

    await connection.commit();

    const [updatedBooking] = await connection.query(
      'SELECT * FROM bookings WHERE booking_id = ?',
      [bookingId]
    );

    // Get customer details and items for notification
    const [customerData] = await connection.query(
      'SELECT c.customer_name, c.phone_number, c.email FROM customers c JOIN bookings b ON c.customer_id = b.customer_id WHERE b.booking_id = ?',
      [bookingId]
    );

    const [bookingItems] = await connection.query(
      `SELECT bi.*, p.product_name
       FROM booking_items bi
       JOIN products p ON bi.product_id = p.product_id
       WHERE bi.booking_id = ?`,
      [bookingId]
    );

    // Send pickup confirmation notification
    if (customerData.length > 0) {
      const pickupDetails = {
        booking_number: booking[0].booking_number,
        customer_name: customerData[0].customer_name,
        rental_start_date: booking[0].rental_start_date,
        rental_end_date: booking[0].rental_end_date,
        items: bookingItems,
        total_amount: booking[0].total_amount,
        final_amount: final_amount || 0,
        remaining_balance: remainingBalance
      };

      sendBookingNotifications(customerData[0], pickupDetails, 'pickup').catch(err => {
        console.error('Failed to send pickup notification:', err);
      });
    }

    res.json(updatedBooking[0]);
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

router.put('/:id/return', async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { items_action } = req.body;
    const bookingId = req.params.id;

    const [items] = await connection.query(
      'SELECT * FROM booking_items WHERE booking_id = ?',
      [bookingId]
    );

    for (const item of items) {
      const action = items_action.find(a => a.product_id === item.product_id);
      
      if (action.action === 'return') {
        await connection.query(
          'UPDATE inventory_status SET quantity_available = quantity_available + ?, quantity_rented = quantity_rented - ? WHERE product_id = ?',
          [item.quantity, item.quantity, item.product_id]
        );
      } else if (action.action === 'washing') {
        await connection.query(
          'UPDATE inventory_status SET quantity_rented = quantity_rented - ?, quantity_washing = quantity_washing + ? WHERE product_id = ?',
          [item.quantity, item.quantity, item.product_id]
        );

        await connection.query(
          'INSERT INTO washing_items (product_id, quantity) VALUES (?, ?)',
          [item.product_id, item.quantity]
        );
      } else if (action.action === 'damaged') {
        await connection.query(
          'UPDATE inventory_status SET quantity_rented = quantity_rented - ?, quantity_damaged = quantity_damaged + ? WHERE product_id = ?',
          [item.quantity, item.quantity, item.product_id]
        );

        await connection.query(
          'INSERT INTO damaged_items (product_id, quantity, damage_details) VALUES (?, ?, ?)',
          [item.product_id, item.quantity, action.damage_details || '']
        );
      }
    }

    await connection.query(
      'UPDATE bookings SET booking_status = ? WHERE booking_id = ?',
      ['Completed', bookingId]
    );

    await connection.commit();

    // Get customer details and booking info for notification
    const [booking] = await connection.query(
      'SELECT b.*, c.customer_name, c.phone_number, c.email FROM bookings b JOIN customers c ON b.customer_id = c.customer_id WHERE b.booking_id = ?',
      [bookingId]
    );

    const [bookingItems] = await connection.query(
      `SELECT bi.*, p.product_name
       FROM booking_items bi
       JOIN products p ON bi.product_id = p.product_id
       WHERE bi.booking_id = ?`,
      [bookingId]
    );

    // Send return confirmation notification
    if (booking.length > 0) {
      const returnDetails = {
        booking_number: booking[0].booking_number,
        customer_name: booking[0].customer_name,
        rental_start_date: booking[0].rental_start_date,
        rental_end_date: booking[0].rental_end_date,
        items: bookingItems,
        total_amount: booking[0].total_amount,
        items_action: items_action
      };

      const customerData = {
        customer_name: booking[0].customer_name,
        phone_number: booking[0].phone_number,
        email: booking[0].email
      };

      sendBookingNotifications(customerData, returnDetails, 'return').catch(err => {
        console.error('Failed to send return notification:', err);
      });
    }

    res.json({ message: 'Booking returned successfully' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

module.exports = router;
