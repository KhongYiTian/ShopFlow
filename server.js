require('dotenv').config();
const express = require("express");
const mysql = require("mysql2");
const path = require("path");
const { convertCurrency, getTrackingLocation, translateText } = require("./services/externalApis");
const { userValidationRules, validate, handleSecureLogin } = require("./middleware/security");

const app = express();
const PORT = process.env.PORT || 3000;

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "ecommerce_db"
});
const db = pool.promise();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

const handleError = (res, err, msg = "Server error", status = 500) => 
  res.status(status).json({ error: err?.message || msg });

app.post("/api/login", userValidationRules(), validate, async (req, res) => {
  await handleSecureLogin(req, res, db);
});

app.get("/api/products", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM products ORDER BY id DESC");
    res.json(rows);
  } catch (err) { handleError(res, err); }
});

// Dynamic UI Translation Endpoint
app.post("/api/translate/ui", async (req, res) => {
  const { lang = 'en', strings = {} } = req.body;

  if (lang === 'en') {
    return res.json(strings);
  }

  try {
    const translatedDictionary = {};
    for (const [key, text] of Object.entries(strings)) {
      translatedDictionary[key] = await translateText(text, lang);
    }
    res.json(translatedDictionary);
  } catch (err) {
    handleError(res, err, "UI Translation failed.");
  }
});

// Dynamic Catalog Translation Endpoint (Sequential to prevent rate limits)
app.get("/api/products/translated", async (req, res) => {
  const { lang = 'en' } = req.query;

  try {
    const [products] = await db.query("SELECT * FROM products ORDER BY id DESC");

    if (lang === 'en') {
      return res.json(products);
    }

    const translatedProducts = [];
    for (const product of products) {
      const translatedName = await translateText(product.name, lang);
      const translatedCategory = await translateText(product.category, lang);
      translatedProducts.push({
        ...product,
        name: translatedName,
        category: translatedCategory
      });
    }

    res.json(translatedProducts);
  } catch (err) {
    handleError(res, err, "Failed to load translated products.");
  }
});

// Direct Currency Exchange Rate Converter Endpoint
app.get("/api/currency/convert", async (req, res) => {
  const { amount = 1, currency = 'USD' } = req.query;
  try {
    const conversion = await convertCurrency(Number(amount), currency);
    res.json(conversion);
  } catch (err) {
    handleError(res, err, "Currency conversion failed.");
  }
});

// Shipment Tracking Search Endpoint (By Tracking Number or Order ID)
app.get("/api/tracking/:query", async (req, res) => {
  const { query } = req.params;
  try {
    const [rows] = await db.query(
      `SELECT t.*, o.customer_name, o.status as order_status, o.created_at 
       FROM shipment_trackings t 
       JOIN orders o ON t.order_id = o.id 
       WHERE t.tracking_number = ? OR t.order_id = ?`,
      [query, query]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Tracking record not found." });
    }

    res.json(rows[0]);
  } catch (err) {
    handleError(res, err, "Failed to retrieve tracking information.");
  }
});

// Order API with Transaction & Map Tracking
app.post("/api/orders", async (req, res) => {
  const { customerName, customerEmail, items, shippingAddress, currency = 'USD' } = req.body;

  if (!customerName || !customerEmail || !items?.length || !shippingAddress) {
    return handleError(res, null, "Customer details, shipping address, and cart items required.", 400);
  }

  const conn = await pool.promise().getConnection();
  try {
    await conn.beginTransaction();

    const productIds = items.map(i => i.id);
    const [products] = await conn.query(`SELECT * FROM products WHERE id IN (?)`, [productIds]);

    let total = 0;
    for (const item of items) {
      const p = products.find(prod => prod.id === Number(item.id));
      if (!p || item.quantity < 1 || p.stock < item.quantity) {
        throw new Error(`Insufficient stock for product ID ${item.id}`);
      }
      total += Number(p.price) * item.quantity;
    }

    const currencyData = await convertCurrency(total, currency);

    const [ord] = await conn.query(
      "INSERT INTO orders (customer_name, customer_email, total, currency, status) VALUES (?, ?, ?, ?, 'Pending')",
      [customerName, customerEmail, currencyData.convertedAmount, currencyData.currency]
    );

    const orderId = ord.insertId;
    for (const item of items) {
      const p = products.find(prod => prod.id === Number(item.id));
      await conn.query("INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)", [orderId, p.id, item.quantity, p.price]);
      await conn.query("UPDATE products SET stock = stock - ? WHERE id = ?", [item.quantity, p.id]);
    }

    const geoData = await getTrackingLocation(shippingAddress);
    const trackingNum = "TRK-" + Date.now();
    await conn.query(
      `INSERT INTO shipment_trackings (order_id, tracking_number, shipping_address, latitude, longitude) VALUES (?, ?, ?, ?, ?)`, 
      [orderId, trackingNum, shippingAddress, geoData?.latitude || 3.1390, geoData?.longitude || 101.6869]
    );

    await conn.commit();
    res.status(201).json({
      message: "Order placed successfully",
      orderId,
      trackingNumber: trackingNum,
      payment: currencyData,
      trackingLocation: geoData || { latitude: 3.1390, longitude: 101.6869, formattedAddress: shippingAddress }
    });
  } catch (err) {
    await conn.rollback();
    handleError(res, err);
  } finally {
    conn.release();
  }
});

app.get("/api/orders", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM orders ORDER BY id DESC");
    res.json(rows);
  } catch (err) { handleError(res, err); }
});

// Register New User / Admin Endpoint
app.post("/api/register", userValidationRules(), validate, async (req, res) => {
  const { username, password, role = 'user' } = req.body;
  
  // Restrict allowed roles
  const assignedRole = role === 'admin' ? 'admin' : 'user';

  try {
    const [existing] = await db.query("SELECT id FROM users WHERE username = ?", [username]);
    if (existing.length) {
      return res.status(400).json({ error: "Username already taken." });
    }

    const hashedPassword = await hashPassword(password);
    const [result] = await db.query(
      "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
      [username, hashedPassword, assignedRole]
    );

    res.status(201).json({
      message: "Account registered successfully!",
      user: { id: result.insertId, username, role: assignedRole }
    });
  } catch (err) {
    handleError(res, err, "Registration failed.");
  }
});

// Server-side Logout Endpoint
app.post("/api/logout", (req, res) => {
  // Clear server-side session/cookies if used in future
  res.json({ message: "Logout successful" });
});

app.listen(PORT, () => {
  console.log(`E-commerce system running at http://localhost:${PORT}`);
});