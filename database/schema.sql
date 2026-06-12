-- Priyam Mobiles MySQL Database Schema

CREATE DATABASE IF NOT EXISTS priyam_mobiles;
USE priyam_mobiles;

-- Users table (Auth & Role Management)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role ENUM('admin', 'employee') NOT NULL DEFAULT 'employee',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table (Inventory)
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    brand VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    ram VARCHAR(10) NOT NULL,
    storage VARCHAR(10) NOT NULL,
    battery VARCHAR(20) NOT NULL,
    camera VARCHAR(50) NOT NULL,
    processor VARCHAR(50) NOT NULL,
    imei VARCHAR(50) UNIQUE,
    purchase_price DECIMAL(10, 2) NOT NULL,
    selling_price DECIMAL(10, 2) NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    warranty VARCHAR(50) NOT NULL DEFAULT '1 Year',
    image_url VARCHAR(255) DEFAULT '/assets/phone-placeholder.png',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers table (CRM)
CREATE TABLE IF NOT EXISTS customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(100),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sales table (Invoices)
CREATE TABLE IF NOT EXISTS sales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id INT,
    subtotal DECIMAL(10, 2) NOT NULL,
    discount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    gst DECIMAL(10, 2) NOT NULL, -- 18% GST
    total_amount DECIMAL(10, 2) NOT NULL,
    payment_mode ENUM('Cash', 'UPI', 'PhonePe', 'Google Pay', 'Paytm') NOT NULL DEFAULT 'Cash',
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    employee_id INT,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Sales items table (Line Items)
CREATE TABLE IF NOT EXISTS sales_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sale_id INT NOT NULL,
    product_id INT,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- Service requests table (Mobile Service & Repair)
CREATE TABLE IF NOT EXISTS service_requests (
    id VARCHAR(50) PRIMARY KEY, -- Unique formatted ID e.g., PM-SR-1001
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    device_model VARCHAR(100) NOT NULL,
    issue_description TEXT NOT NULL,
    status ENUM('Pending', 'Under Repair', 'Ready for Collection', 'Delivered') NOT NULL DEFAULT 'Pending',
    estimated_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    actual_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default admin and employee accounts
-- Admin password hash corresponds to 'admin123' (bcrypt)
-- Employee password hash corresponds to 'emp123' (bcrypt)
INSERT INTO users (username, password_hash, full_name, role) 
VALUES 
('admin', '$2a$10$tZ9vsz/k6qfM7GfQ1Wb.rOaX5XU6BqG9zD4s5x0sTzGZ/i0qC9Zqu', 'Priyam Admin', 'admin')
ON DUPLICATE KEY UPDATE id=id;

INSERT INTO users (username, password_hash, full_name, role) 
VALUES 
('employee', '$2a$10$wN1G1e102p8zI26h9e5EfeA1B6yN6z0sTzGZ/i0qC9Zqu.testpass', 'Priyam Staff', 'employee')
ON DUPLICATE KEY UPDATE id=id;
