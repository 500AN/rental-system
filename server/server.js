const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

const customerRoutes = require('./routes/customers');
const employeeRoutes = require('./routes/employees');
const productRoutes = require('./routes/products');
const locationRoutes = require('./routes/locations');
const bookingRoutes = require('./routes/bookings');
const saleRoutes = require('./routes/sales');
const inventoryRoutes = require('./routes/inventory');
const washingRoutes = require('./routes/washing');
const damageRoutes = require('./routes/damage');
const revenueRoutes = require('./routes/revenue');

app.use('/api/customers', customerRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/products', productRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/washing', washingRoutes);
app.use('/api/damage', damageRoutes);
app.use('/api/revenue', revenueRoutes);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/../public/index.html');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
