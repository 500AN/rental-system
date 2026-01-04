CREATE DATABASE IF NOT EXISTS rental_management;
USE rental_management;

CREATE TABLE customers (
    customer_id INT PRIMARY KEY AUTO_INCREMENT,
    customer_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    id_proof VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_phone (phone_number),
    INDEX idx_name (customer_name),
    INDEX idx_email (email)
);

CREATE TABLE employees (
    employee_id INT PRIMARY KEY AUTO_INCREMENT,
    employee_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (employee_name)
);

CREATE TABLE storage_locations (
    location_id INT PRIMARY KEY AUTO_INCREMENT,
    location_name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE products (
    product_id INT PRIMARY KEY AUTO_INCREMENT,
    product_name VARCHAR(255) NOT NULL,
    barcode VARCHAR(100),
    total_quantity INT NOT NULL DEFAULT 0,
    rental_price DECIMAL(10, 2) NOT NULL,
    sale_price DECIMAL(10, 2) NOT NULL,
    storage_location_id INT,
    status ENUM('Available', 'Disabled') DEFAULT 'Available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (storage_location_id) REFERENCES storage_locations(location_id),
    INDEX idx_name (product_name),
    INDEX idx_status (status),
    INDEX idx_barcode (barcode)
);

CREATE TABLE inventory_status (
    inventory_id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    quantity_available INT NOT NULL DEFAULT 0,
    quantity_rented INT NOT NULL DEFAULT 0,
    quantity_washing INT NOT NULL DEFAULT 0,
    quantity_damaged INT NOT NULL DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
    UNIQUE KEY unique_product (product_id)
);

CREATE TABLE washing_items (
    washing_id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    date_sent TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_returned TIMESTAMP NULL,
    status ENUM('Washing', 'Returned') DEFAULT 'Washing',
    notes TEXT,
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    INDEX idx_status (status),
    INDEX idx_date_sent (date_sent)
);

CREATE TABLE damaged_items (
    damage_id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    damage_details TEXT,
    date_damaged TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('Damaged', 'Repaired', 'Discarded') DEFAULT 'Damaged',
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    INDEX idx_status (status)
);

CREATE TABLE bookings (
    booking_id INT PRIMARY KEY AUTO_INCREMENT,
    booking_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id INT NOT NULL,
    employee_id INT NOT NULL,
    rental_start_date DATE NOT NULL,
    rental_end_date DATE NOT NULL,
    booking_status ENUM('Booked', 'Active', 'Completed', 'Cancelled') DEFAULT 'Booked',
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    advance_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    final_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    remaining_balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
    advance_payment_method VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id),
    INDEX idx_booking_number (booking_number),
    INDEX idx_status (booking_status),
    INDEX idx_dates (rental_start_date, rental_end_date)
);

CREATE TABLE booking_items (
    booking_item_id INT PRIMARY KEY AUTO_INCREMENT,
    booking_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    rental_duration_days INT NOT NULL,
    default_rental_price DECIMAL(10, 2) NOT NULL,
    agreed_rental_price DECIMAL(10, 2) NOT NULL,
    item_total_amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    INDEX idx_booking (booking_id),
    INDEX idx_product (product_id)
);

CREATE TABLE payments (
    payment_id INT PRIMARY KEY AUTO_INCREMENT,
    booking_id INT,
    payment_type ENUM('Advance', 'Final', 'Sale') NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50),
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id),
    INDEX idx_booking (booking_id),
    INDEX idx_type (payment_type),
    INDEX idx_date (payment_date)
);

CREATE TABLE sales (
    sale_id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    sale_price DECIMAL(10, 2) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    customer_id INT,
    employee_id INT,
    sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id),
    INDEX idx_date (sale_date),
    INDEX idx_product (product_id)
);

CREATE TABLE revenue_logs (
    log_id INT PRIMARY KEY AUTO_INCREMENT,
    log_date DATE NOT NULL,
    booking_id INT,
    sale_id INT,
    revenue_type ENUM('Rental_Advance', 'Rental_Final', 'Sale') NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id),
    FOREIGN KEY (sale_id) REFERENCES sales(sale_id),
    INDEX idx_date (log_date),
    INDEX idx_type (revenue_type)
);

INSERT INTO storage_locations (location_name) VALUES 
('Godown'),
('Shop'),
('Branch');

INSERT INTO employees (employee_name) VALUES 
('Admin');
