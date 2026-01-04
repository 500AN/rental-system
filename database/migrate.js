const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306
  });

  try {
    console.log('Starting database migration...');

    const [customerColumns] = await connection.query(
      "SHOW COLUMNS FROM customers LIKE 'email'"
    );
    
    if (customerColumns.length === 0) {
      console.log('Adding email column to customers table...');
      await connection.query(
        'ALTER TABLE customers ADD COLUMN email VARCHAR(255) AFTER phone_number, ADD INDEX idx_email (email)'
      );
      console.log('✓ Email column added to customers table');
    } else {
      console.log('✓ Email column already exists in customers table');
    }

    const [productColumns] = await connection.query(
      "SHOW COLUMNS FROM products LIKE 'barcode'"
    );
    
    if (productColumns.length === 0) {
      console.log('Adding barcode column to products table...');
      await connection.query(
        'ALTER TABLE products ADD COLUMN barcode VARCHAR(100) AFTER product_name, ADD INDEX idx_barcode (barcode)'
      );
      console.log('✓ Barcode column added to products table');
    } else {
      console.log('✓ Barcode column already exists in products table');
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\nNew features available:');
    console.log('- Customer email field (optional)');
    console.log('- Product barcode field (optional)');
    console.log('- Barcode scanner in booking section');
    console.log('- Email notifications for bookings');
    console.log('- WhatsApp notifications for bookings');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

migrate();
