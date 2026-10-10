-- Database Initialization & Context Selection
CREATE DATABASE IF NOT EXISTS ecommerce_db;
USE ecommerce_db;

-- Environment Cleanup: Drop existing tables in reverse-dependency order
DROP TABLE IF EXISTS shipment_trackings;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS users;

-- User Authentication & Access Control Table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user'
);

-- Default Administrator Credentials Seed Data
INSERT IGNORE INTO users (username, password, role) VALUES
('admin', '$2b$10$1KggGLooAYwkTAuN0eEAH.51d2TC5EB7okE3J4GBIUw2STQOW1vWu', 'admin');

-- Inventory & Catalog Products Table
CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  image_url VARCHAR(255) DEFAULT 'default.jpg',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer Orders Summary Table
CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_name VARCHAR(100) NOT NULL,
  customer_email VARCHAR(120) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD',
  status VARCHAR(30) NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order Items Junction Table with Cascading Relational Constraints
CREATE TABLE order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Shipment Trackings
CREATE TABLE shipment_trackings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL UNIQUE,
  tracking_number VARCHAR(100) NOT NULL UNIQUE,
  carrier VARCHAR(50) DEFAULT 'Standard Express',
  shipping_address TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  current_status VARCHAR(50) DEFAULT 'In Transit',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Catalog Seed Data
INSERT INTO products (name, category, price, stock, image_url) VALUES
('Wireless Headphones', 'Electronics', 129.90, 20, 'Wireless Headphones.jpg'),
('Smart Watch', 'Electronics', 199.90, 15, 'Smart Watch.png'),
('Backpack', 'Fashion', 79.90, 25, 'Backpack.jpg'),
('USB-C Cable', 'Accessories', 29.90, 40, 'USB-C Cable.jpg'),
('Running Shoes', 'Sports', 159.90, 12, 'Running Shoes.jpg');