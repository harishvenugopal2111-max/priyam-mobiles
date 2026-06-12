require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const db = require('./database/db');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'priyam_mobiles_secret_jwt_key_2026';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Verify JWT Token Middleware
function verifyToken(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) return res.status(403).json({ error: 'No token provided' });

  const tokenParts = token.split(' ');
  const bearerToken = tokenParts[1] || token;

  jwt.verify(bearerToken, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Failed to authenticate token' });
    req.userId = decoded.id;
    req.userRole = decoded.role;
    req.userFullName = decoded.fullName;
    next();
  });
}

// Require Admin Role Middleware
function requireAdmin(req, res, next) {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// -------------------------------------------------------------
// AUTH ENDPOINTS
// -------------------------------------------------------------

// Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const user = await db.users.getByUsername(username);
    if (!user) return res.status(401).json({ error: 'Invalid username or password' });

    const passwordIsValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordIsValid) return res.status(401).json({ error: 'Invalid username or password' });

    const token = jwt.sign(
      { id: user.id, role: user.role, fullName: user.full_name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify Token
app.get('/api/auth/verify', verifyToken, (req, res) => {
  res.json({
    valid: true,
    user: {
      id: req.userId,
      role: req.userRole,
      fullName: req.userFullName
    }
  });
});

// -------------------------------------------------------------
// PRODUCTS / INVENTORY ENDPOINTS
// -------------------------------------------------------------

// Get all products (Public & Admin)
app.get('/api/products', async (req, res) => {
  const { brand, search, sortByPrice } = req.query;
  try {
    const products = await db.products.getAll({ brand, search, sortByPrice });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single product
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await db.products.getById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add product (Employee & Admin)
app.post('/api/products', verifyToken, async (req, res) => {
  try {
    const product = await db.products.create(req.body);
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update product (Employee & Admin)
app.put('/api/products/:id', verifyToken, async (req, res) => {
  try {
    const product = await db.products.update(req.params.id, req.body);
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete product (Admin only)
app.delete('/api/products/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    await db.products.delete(req.params.id);
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// CUSTOMERS / CRM ENDPOINTS
// -------------------------------------------------------------

// Get all customers (Employee & Admin)
app.get('/api/customers', verifyToken, async (req, res) => {
  try {
    const customers = await db.customers.getAll();
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single customer
app.get('/api/customers/:id', verifyToken, async (req, res) => {
  try {
    const customer = await db.customers.getById(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Find customer by phone
app.get('/api/customers/search/phone', verifyToken, async (req, res) => {
  const { phone } = req.query;
  try {
    const customer = await db.customers.getByPhone(phone);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create customer
app.post('/api/customers', verifyToken, async (req, res) => {
  try {
    const customer = await db.customers.create(req.body);
    res.status(201).json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update customer
app.put('/api/customers/:id', verifyToken, async (req, res) => {
  try {
    const customer = await db.customers.update(req.params.id, req.body);
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete customer (Admin only)
app.delete('/api/customers/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    await db.customers.delete(req.params.id);
    res.json({ message: 'Customer deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Customer Purchase History
app.get('/api/customers/:id/history', verifyToken, async (req, res) => {
  try {
    const history = await db.customers.getPurchaseHistory(req.params.id);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// SALES / BILLING TRANSACTION ENDPOINTS
// -------------------------------------------------------------

// List sales
app.get('/api/sales', verifyToken, async (req, res) => {
  try {
    const sales = await db.sales.getAll();
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single sale details (Invoice view)
app.get('/api/sales/:id', verifyToken, async (req, res) => {
  try {
    const sale = await db.sales.getById(req.params.id);
    if (!sale) return res.status(404).json({ error: 'Invoice not found' });
    res.json(sale);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create sale (Process billing invoice)
app.post('/api/sales', verifyToken, async (req, res) => {
  const { customer, items, discount, payment_mode } = req.body;
  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'No items selected for sale' });
  }

  try {
    // 1. Identify/Create customer
    let customerId = null;
    if (customer) {
      if (customer.id) {
        customerId = customer.id;
      } else if (customer.phone) {
        const c = await db.customers.create({
          name: customer.name || 'Walk-in Customer',
          phone: customer.phone,
          email: customer.email || '',
          address: customer.address || ''
        });
        customerId = c.id;
      }
    }

    // 2. Insert invoice details and decrement stock
    const saleResult = await db.sales.create(
      { customer_id: customerId, discount, payment_mode },
      items,
      req.userId
    );

    res.status(201).json({
      message: 'Sale transaction completed successfully',
      sale: saleResult
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// MOBILE REPAIR / SERVICE CENTER ENDPOINTS
// -------------------------------------------------------------

// Get all service requests
app.get('/api/services', verifyToken, async (req, res) => {
  try {
    const requests = await db.services.getAll();
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single service request (Admin/Employee - full data)
app.get('/api/services/:id', verifyToken, async (req, res) => {
  try {
    const request = await db.services.getById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Service request not found' });
    res.json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public repair request tracker status search (no auth token required!)
app.get('/api/services/track/:id', async (req, res) => {

  try {
    const request = await db.services.getById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Service tracking ID not found' });
    
    // Return safe data for public tracking
    res.json({
      id: request.id,
      customer_name: request.customer_name,
      device_model: request.device_model,
      status: request.status,
      issue_description: request.issue_description,
      estimated_cost: request.estimated_cost,
      actual_cost: request.status === 'Delivered' || request.status === 'Ready for Collection' ? request.actual_cost : 0,
      comments: request.comments,
      updated_at: request.updated_at
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Submit service request
app.post('/api/services', verifyToken, async (req, res) => {
  try {
    const request = await db.services.create(req.body);
    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update service status/details
app.put('/api/services/:id', verifyToken, async (req, res) => {
  try {
    const request = await db.services.update(req.params.id, req.body);
    res.json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// MARKETING MODULE
// -------------------------------------------------------------

// Simulate campaign message trigger
app.post('/api/marketing/send', verifyToken, async (req, res) => {
  const { campaignType, audienceGroup, messageContent } = req.body;
  if (!campaignType || !audienceGroup || !messageContent) {
    return res.status(400).json({ error: 'Campaign details are required' });
  }

  try {
    const customers = await db.customers.getAll();
    let targets = [];

    if (audienceGroup === 'all') {
      targets = customers;
    } else if (audienceGroup === 'recent_buyers') {
      // Pick customers who have made a purchase in the last month
      const sales = await db.sales.getAll();
      const oneMonthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const recentCustomerIds = new Set(
        sales
          .filter(s => new Date(s.date).getTime() > oneMonthAgo)
          .map(s => s.customer_id)
      );
      targets = customers.filter(c => recentCustomerIds.has(c.id));
    } else {
      // Pick random customer as test
      targets = customers.slice(0, 1);
    }

    console.log(`[CAMPAIGN] Sending simulated ${campaignType} to ${targets.length} customers:`, messageContent);

    res.json({
      message: `Simulated campaign triggered successfully! sent to ${targets.length} customers.`,
      recipient_count: targets.length,
      recipients: targets.map(t => ({ name: t.name, phone: t.phone }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// ANALYTICS & REPORTS ENDPOINTS
// -------------------------------------------------------------

// Aggregated stats for the Dashboard UI
app.get('/api/analytics', verifyToken, async (req, res) => {
  try {
    const products = await db.products.getAll();
    const customers = await db.customers.getAll();
    const sales = await db.sales.getAll();
    const serviceRequests = await db.services.getAll();

    // Summary Widgets calculation
    let totalRevenue = 0;
    let totalProfit = 0;
    let todaySales = 0;
    const startOfToday = new Date();
    startOfToday.setHours(0,0,0,0);

    for (const sale of sales) {
      totalRevenue += parseFloat(sale.total_amount);
      
      // Calculate profit if fallback details or items are present
      // Profit = saleTotal - purchaseCost
      let saleCost = 0;
      if (sale.items) {
        for (const item of sale.items) {
          const prod = products.find(p => p.id === item.product_id);
          const pPrice = prod ? prod.purchase_price : (item.unit_price * 0.8); // Estimate cost if missing
          saleCost += pPrice * item.quantity;
        }
      } else {
        saleCost = sale.subtotal * 0.8; // Estimate cost
      }
      const saleNet = sale.subtotal - sale.discount;
      totalProfit += (saleNet - saleCost);

      if (new Date(sale.date) >= startOfToday) {
        todaySales += parseFloat(sale.total_amount);
      }
    }

    const lowStockCount = products.filter(p => p.quantity > 0 && p.quantity <= 3).length;
    const outOfStockCount = products.filter(p => p.quantity === 0).length;
    const activeRepairsCount = serviceRequests.filter(sr => sr.status !== 'Delivered').length;

    // Charts: 1. Sales Trend (Last 7 days)
    const salesTrend = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      salesTrend[dateString] = 0;
    }

    for (const sale of sales) {
      const saleDate = new Date(sale.date);
      const key = saleDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      if (salesTrend[key] !== undefined) {
        salesTrend[key] += parseFloat(sale.total_amount);
      }
    }

    // Charts: 2. Brand Popularity
    const brandPopularity = {};
    for (const p of products) {
      brandPopularity[p.brand] = 0;
    }
    for (const sale of sales) {
      if (sale.items) {
        for (const item of sale.items) {
          brandPopularity[item.brand] = (brandPopularity[item.brand] || 0) + item.quantity;
        }
      }
    }

    // Charts: 3. Payment Methods distribution
    const paymentMethods = { UPI: 0, Cash: 0, PhonePe: 0, 'Google Pay': 0, Paytm: 0 };
    for (const sale of sales) {
      paymentMethods[sale.payment_mode] = (paymentMethods[sale.payment_mode] || 0) + parseFloat(sale.total_amount);
    }

    res.json({
      summary: {
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalProfit: parseFloat(totalProfit.toFixed(2)),
        todaySales: parseFloat(todaySales.toFixed(2)),
        totalCustomers: customers.length,
        totalProducts: products.length,
        lowStock: lowStockCount,
        outOfStock: outOfStockCount,
        activeRepairs: activeRepairsCount
      },
      charts: {
        salesTrend: {
          labels: Object.keys(salesTrend),
          data: Object.values(salesTrend)
        },
        brandPopularity: {
          labels: Object.keys(brandPopularity).filter(k => brandPopularity[k] > 0),
          data: Object.values(brandPopularity).filter(v => v > 0)
        },
        paymentMethods: {
          labels: Object.keys(paymentMethods),
          data: Object.values(paymentMethods)
        }
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fallback HTML router
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
db.init().then(() => {
  app.listen(PORT, () => {
    console.log(`[SERVER] Priyam Mobiles app listening at http://localhost:${PORT}`);
  });
});
