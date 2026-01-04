const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setupDatabase() {
    console.log('Starting database setup...');
    
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            port: process.env.DB_PORT || 3306,
            multipleStatements: true
        });

        console.log('Connected to MySQL server');

        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        await connection.query(schema);
        
        console.log('✓ Database created successfully');
        console.log('✓ Tables created successfully');
        console.log('✓ Initial data inserted');
        console.log('\nDatabase setup complete!');
        console.log('\nYou can now start the server with: npm start');

        await connection.end();
    } catch (error) {
        console.error('Error setting up database:', error.message);
        console.error('\nPlease check:');
        console.error('1. MySQL is running');
        console.error('2. .env file has correct credentials');
        console.error('3. MySQL user has CREATE DATABASE privileges');
        process.exit(1);
    }
}

setupDatabase();
