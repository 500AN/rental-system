# Rental Management System

A simple, user-friendly rental management system built with MySQL, Node.js, Express, and vanilla JavaScript. Designed for non-technical users to manage rental operations efficiently.

## Features

### Core Functionality
- **Customer Management**: Add and manage customers with phone numbers, email (optional), and ID proof
- **Employee Management**: Track employees handling bookings and sales
- **Product/Inventory Management**: Complete inventory tracking with barcode support and real-time status updates
- **Booking System**: Create bookings with product-wise editable pricing for special/group rates
- **Barcode Scanner**: Quick product addition by scanning barcodes in booking section
- **Automated Notifications**: Send booking confirmations via Email and WhatsApp
- **Pickup/Rental Start**: Confirm rentals and update inventory automatically
- **Return Management**: Handle returns with options to send items to washing or mark as damaged
- **Sales**: Direct product sales with automatic inventory reduction
- **Washing Management**: Track items in washing with 3-day alerts
- **Damage Management**: Record and manage damaged items
- **Revenue Reports**: Daily and monthly revenue tracking with detailed breakdowns

### Key Features
✅ **Auto-generated booking numbers** - Format: BK-YYYYMMDD-XXX
✅ **Barcode scanning** - Quick product addition in bookings
✅ **Email notifications** - Automatic booking confirmations sent to customers
✅ **WhatsApp notifications** - Booking details sent via WhatsApp
✅ **Double-booking prevention** - Automatic availability checking
✅ **Product-wise pricing** - Edit rental prices per booking for special rates
✅ **Agreed pricing locked** - Special prices saved and used throughout rental lifecycle
✅ **Advance + Final payments** - Track partial payments and balances
✅ **Inventory tracking** - Real-time status: Available, Rented, Washing, Damaged
✅ **Overdue alerts** - Visual warnings for late returns
✅ **Washing alerts** - Notifications for items in washing > 3 days
✅ **Simple UI** - Large buttons, dropdowns, minimal typing required  

## Technology Stack

- **Database**: MySQL
- **Backend**: Node.js with Express
- **Frontend**: HTML, CSS, Vanilla JavaScript
- **Dependencies**: mysql2, cors, dotenv, body-parser

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MySQL (v5.7 or higher)
- npm or yarn

### Step 1: Clone or Download
```bash
cd "stock application"
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Configure Database
1. Create a `.env` file in the root directory:
```bash
cp .env.example .env
```

2. Edit `.env` with your MySQL credentials:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=rental_management
DB_PORT=3306
PORT=3000

EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_NUMBER=+14155238886
```

**Note**: Email and WhatsApp notifications are optional. The system will work without them if credentials are not provided.

### Step 4: Create Database
1. Open MySQL command line or MySQL Workbench
2. Run the schema file:
```bash
mysql -u root -p < database/schema.sql
```

Or manually:
```sql
source database/schema.sql
```

### Step 5: Start the Server
```bash
npm start
```

For development with auto-restart:
```bash
npm run dev
```

### Step 6: Access the Application
Open your browser and navigate to:
```
http://localhost:3000
```

## Usage Guide

### 1. Dashboard
- View returns due today
- Check washing alerts (items > 3 days)
- See today's revenue summary

### 2. New Booking
1. **Booking number is auto-generated** (Format: BK-YYYYMMDD-XXX)
2. Select or add customer (email is optional for notifications)
3. Select employee
4. Choose rental dates
5. Add products using either method:
   - **Barcode Scanner**: Scan or enter barcode and press Enter
   - **Manual Selection**: Click "+ Add Product Manually" and select from dropdown
6. For each product:
   - Enter quantity
   - **Edit price if needed** (for special/group rates)
   - System calculates total automatically
7. Enter advance payment (optional)
8. Save booking
9. **Automatic notifications sent**: Email and WhatsApp confirmations sent to customer (if configured)

**Important**: The edited price becomes the "agreed price" and will be used throughout the rental lifecycle.

### 3. Pickup / Start Rental
1. Select booking from dropdown
2. Review booking details with agreed prices
3. Enter final payment amount
4. Confirm pickup
5. Inventory automatically updated to "Rented"

### 4. Return Items
1. Select active booking
2. System shows overdue warning if applicable
3. For each item, choose:
   - **Return to Inventory** - Item goes back to available
   - **Send to Washing** - Item marked as washing
   - **Mark as Damaged** - Enter damage details
4. Complete return

### 5. Sale
1. Select product
2. Enter quantity
3. Adjust sale price if needed
4. Select customer (optional)
5. Select employee
6. Complete sale
7. Inventory permanently reduced

### 6. Products
- View all products with inventory status
- Add new products with rental and sale prices
- Track quantities: Total, Available, Rented, Washing, Damaged

### 7. Washing Management
- View all items in washing
- See days in washing
- Get alerts for items > 3 days
- Mark items as returned (moves to available)

### 8. Damage Management
- View all damaged items
- See damage details
- Mark items as repaired (moves to available)

### 9. Revenue Reports
- **Daily**: View revenue for specific date
- **Monthly**: View monthly summary with daily breakdown
- Breakdown by type: Rental Advance, Rental Final, Sale

## Database Schema

### Main Tables
- `customers` - Customer information
- `employees` - Employee records
- `products` - Product catalog
- `storage_locations` - Storage location tracking
- `inventory_status` - Real-time inventory tracking
- `bookings` - Rental bookings
- `booking_items` - Product-wise booking details with agreed pricing
- `payments` - Payment records
- `sales` - Sales transactions
- `washing_items` - Items in washing
- `damaged_items` - Damaged items tracking
- `revenue_logs` - Revenue tracking

## Key Business Rules

### Booking Stage
- Booking number must be unique
- Products can have **custom agreed prices** different from default
- Advance payment is optional
- System checks availability for selected dates
- Prevents double-booking automatically

### Pickup Stage
- Uses **agreed prices** from booking (not default prices)
- Updates inventory: Available → Rented
- Records final payment
- Tracks remaining balance

### Return Stage
- Shows overdue warning if past due date
- Must specify action for each item:
  - Return: Available quantity increases
  - Washing: Washing quantity increases
  - Damaged: Damaged quantity increases, requires details
- Updates booking status to Completed

### Inventory Rules
- Total Quantity = Available + Rented + Washing + Damaged
- Only Available items can be booked or sold
- Sales permanently reduce Total Quantity
- Washing and Damaged items excluded from availability

### Revenue Tracking
- Advance payments logged immediately
- Final payments logged at pickup
- Sales logged immediately
- All revenue categorized by type

## API Endpoints

### Customers
- `GET /api/customers` - List all customers
- `POST /api/customers` - Add new customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### Employees
- `GET /api/employees` - List all employees
- `POST /api/employees` - Add new employee

### Products
- `GET /api/products` - List all products
- `GET /api/products/available` - List available products
- `POST /api/products` - Add new product
- `PUT /api/products/:id` - Update product

### Bookings
- `GET /api/bookings` - List all bookings
- `GET /api/bookings/due-today` - Get returns due today
- `GET /api/bookings/:id` - Get booking details
- `POST /api/bookings` - Create new booking
- `PUT /api/bookings/:id/pickup` - Confirm pickup
- `PUT /api/bookings/:id/return` - Complete return

### Sales
- `GET /api/sales` - List all sales
- `POST /api/sales` - Create new sale

### Inventory
- `GET /api/inventory` - Get inventory status
- `GET /api/inventory/check-availability` - Check product availability

### Washing
- `GET /api/washing` - List items in washing
- `GET /api/washing/alerts` - Get washing alerts (>3 days)
- `PUT /api/washing/:id/return` - Mark as returned

### Damage
- `GET /api/damage` - List damaged items
- `POST /api/damage` - Record damage
- `PUT /api/damage/:id/repair` - Mark as repaired

### Revenue
- `GET /api/revenue/daily?date=YYYY-MM-DD` - Daily revenue
- `GET /api/revenue/monthly?year=YYYY&month=MM` - Monthly revenue
- `GET /api/revenue/all` - All revenue logs

## Troubleshooting

### Database Connection Error
- Verify MySQL is running
- Check `.env` credentials
- Ensure database exists: `CREATE DATABASE rental_management;`

### Port Already in Use
- Change PORT in `.env` file
- Or stop the process using port 3000

### Products Not Showing in Booking
- Check product status is 'Available'
- Verify quantity_available > 0
- Refresh the page

### Double Booking Still Happening
- Ensure dates are selected correctly
- Check if booking status is 'Booked' or 'Active'
- Verify inventory_status table is updated

## Notifications Setup (Optional)

### Email Notifications
To enable email notifications for booking confirmations:

1. **For Gmail**:
   - Enable 2-factor authentication on your Google account
   - Generate an App Password: https://myaccount.google.com/apppasswords
   - Use the app password in `.env` file

2. **Configuration**:
```
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_16_digit_app_password
```

3. **Other Email Services**:
   - Supported: Gmail, Outlook, Yahoo, etc.
   - Change `EMAIL_SERVICE` to your provider

### WhatsApp Notifications
To enable WhatsApp notifications:

1. **Sign up for Twilio**:
   - Create account at https://www.twilio.com
   - Get your Account SID and Auth Token
   - Activate WhatsApp Sandbox or get approved WhatsApp number

2. **Configuration**:
```
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=+14155238886
```

3. **Testing**:
   - Use Twilio Sandbox for testing (free)
   - Production requires WhatsApp Business approval

**Note**: The system works perfectly without notifications. They are completely optional features.

## Barcode Scanner Setup

### Hardware Barcode Scanner
1. Connect USB barcode scanner to your computer
2. Scanner should be configured to send "Enter" after scan
3. Focus on the barcode input field in booking section
4. Scan product barcode - product will be added automatically

### Manual Barcode Entry
1. Type or paste barcode in the input field
2. Press Enter or click "Search" button
3. Product will be added if barcode matches

### Adding Barcodes to Products
1. Go to Products section
2. Click "+ Add New Product"
3. Enter barcode in the "Barcode (Optional)" field
4. Save product

## Future Enhancements

The system is designed to support:
- Online payment integration
- Mobile/tablet responsive UI
- Role-based access control
- Report exports (PDF, Excel)
- Customer portal
- Multi-branch inventory management

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review database schema and API endpoints
3. Check browser console for errors
4. Verify MySQL logs

## License

MIT License - Free to use and modify

## Notes

- **Auto-generated Booking Numbers** - Format: BK-YYYYMMDD-XXX (e.g., BK-20240115-001)
- **Email Optional** - Customer email is optional but enables booking confirmations
- **Barcode Support** - Products can have barcodes for quick scanning in bookings
- **Notifications Optional** - Email and WhatsApp notifications work only if configured
- **ID Proof is optional** - Not mandatory for customers
- **Agreed Pricing** - Special prices set during booking are locked and used throughout
- **No Technical Terms** - UI designed for non-technical users
- **Large Buttons** - Easy to click and use
- **Dropdown-First** - Minimal typing required
- **Clear Alerts** - Visual warnings for important actions

---

**Built for real-world rental operations with simplicity and reliability in mind.**
#   r e n t a l - s y s t e m  
 