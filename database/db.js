const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, 'data');
const JSON_DB_PATH = path.join(DATA_DIR, 'db.json');

let isUsingMySQL = false;
let pool = null;

// Initial JSON DB Structure & Seed Data
const defaultJsonDb = {
  users: [
    { id: 1, username: 'PRIYAM MOBILES', password_hash: '$2a$10$uSgLnp0KLOfL4Vvq/hbuM.4sNVYnd0N9g9TnYI2zXytfTx4ldCttu', full_name: 'Priyam Admin', role: 'admin', created_at: new Date().toISOString() },
    { id: 2, username: 'employee', password_hash: '$2a$10$uSgLnp0KLOfL4Vvq/hbuM.4sNVYnd0N9g9TnYI2zXytfTx4ldCttu', full_name: 'Priyam Staff', role: 'employee', created_at: new Date().toISOString() }
  ],
  products: [
    {
      id: 1,
      brand: 'Apple',
      model: 'iPhone 15 Pro Max',
      ram: '8GB',
      storage: '256GB',
      battery: '4441 mAh',
      camera: '48MP + 12MP + 12MP',
      processor: 'A17 Pro',
      imei: '359123456789012',
      purchase_price: 120000,
      selling_price: 139900,
      quantity: 5,
      warranty: '1 Year',
      image_url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&auto=format&fit=crop&q=60',
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      brand: 'Samsung',
      model: 'Galaxy S24 Ultra',
      ram: '12GB',
      storage: '512GB',
      battery: '5000 mAh',
      camera: '200MP + 50MP + 12MP + 10MP',
      processor: 'Snapdragon 8 Gen 3',
      imei: '359987654321098',
      purchase_price: 110000,
      selling_price: 129999,
      quantity: 8,
      warranty: '1 Year',
      image_url: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600&auto=format&fit=crop&q=60',
      created_at: new Date().toISOString()
    },
    {
      id: 3,
      brand: 'OnePlus',
      model: 'OnePlus 12',
      ram: '16GB',
      storage: '512GB',
      battery: '5400 mAh',
      camera: '50MP + 64MP + 48MP',
      processor: 'Snapdragon 8 Gen 3',
      imei: '359456789123456',
      purchase_price: 55000,
      selling_price: 64999,
      quantity: 12,
      warranty: '1 Year',
      image_url: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&auto=format&fit=crop&q=60',
      created_at: new Date().toISOString()
    },
    {
      id: 4,
      brand: 'Redmi',
      model: 'Redmi Note 13 Pro',
      ram: '8GB',
      storage: '256GB',
      battery: '5000 mAh',
      camera: '200MP + 8MP + 2MP',
      processor: 'Dimensity 7200-Ultra',
      imei: '359543216789012',
      purchase_price: 20000,
      selling_price: 25999,
      quantity: 2, // Low stock indicator
      warranty: '1 Year',
      image_url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=60',
      created_at: new Date().toISOString()
    },
    {
      id: 5,
      brand: 'Nothing',
      model: 'Nothing Phone (2)',
      ram: '12GB',
      storage: '256GB',
      battery: '4700 mAh',
      camera: '50MP + 50MP',
      processor: 'Snapdragon 8+ Gen 1',
      imei: '359012345678901',
      purchase_price: 35000,
      selling_price: 39999,
      quantity: 0, // Out of stock indicator
      warranty: '1 Year',
      image_url: 'https://images.unsplash.com/photo-1616348436168-de43ad0db179?w=600&auto=format&fit=crop&q=60',
      created_at: new Date().toISOString()
    }
  ],
  customers: [
    { id: 1, name: 'Rajesh Kumar', phone: '9876543210', email: 'rajesh@gmail.com', address: '12 Main St, Perumulai, Titakudi', created_at: new Date().toISOString() },
    { id: 2, name: 'Priya Dharshini', phone: '8765432109', email: 'priya@yahoo.com', address: '24 Gandhi Nagar, Titakudi', created_at: new Date().toISOString() },
    { id: 3, name: 'Vignesh S', phone: '7654321098', email: 'vignesh@outlook.com', address: '5 Temple View Rd, Perumulai', created_at: new Date().toISOString() }
  ],
  sales: [
    {
      id: 1,
      invoice_number: 'PM-INV-1001',
      customer_id: 1,
      subtotal: 139900,
      discount: 5000,
      gst: 24282, // 18% of subtotal after discount
      total_amount: 159182,
      payment_mode: 'UPI',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      employee_id: 1,
      items: [
        { product_id: 1, brand: 'Apple', model: 'iPhone 15 Pro Max', quantity: 1, unit_price: 139900, total_price: 139900 }
      ]
    },
    {
      id: 2,
      invoice_number: 'PM-INV-1002',
      customer_id: 3,
      subtotal: 64999,
      discount: 2000,
      gst: 11340,
      total_amount: 74339,
      payment_mode: 'Google Pay',
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      employee_id: 2,
      items: [
        { product_id: 3, brand: 'OnePlus', model: 'OnePlus 12', quantity: 1, unit_price: 64999, total_price: 64999 }
      ]
    }
  ],
  service_requests: [
    {
      id: 'PM-SR-1001',
      customer_name: 'K. Selvam',
      customer_phone: '9988776655',
      device_model: 'Samsung Galaxy A54',
      issue_description: 'Screen replacement & glass shattered',
      status: 'Ready for Collection',
      estimated_cost: 4500,
      actual_cost: 4500,
      comments: 'Original display fitted. Tested display touch controls and brightness. OK.',
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'PM-SR-1002',
      customer_name: 'Meera Bai',
      customer_phone: '8877665544',
      device_model: 'iPhone 13',
      issue_description: 'Battery health 72%, draining rapidly, requires replacement',
      status: 'Under Repair',
      estimated_cost: 3200,
      actual_cost: 0,
      comments: 'Received device. Diagnostics complete. Battery replacement in progress.',
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'PM-SR-1003',
      customer_name: 'Arul Murugan',
      customer_phone: '7766554433',
      device_model: 'Redmi Note 10 Pro',
      issue_description: 'Type-C charging port not working or loose connection',
      status: 'Pending',
      estimated_cost: 800,
      actual_cost: 0,
      comments: 'Awaiting technician assignment.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ]
};

// Ensure JSON DB directory and file exist
function initJsonDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(JSON_DB_PATH)) {
    fs.writeFileSync(JSON_DB_PATH, JSON.stringify(defaultJsonDb, null, 2));
    console.log('[DB] JSON database file created and seeded.');
  }
}

// Helpers to read/write JSON file
function readJsonDb() {
  initJsonDb();
  try {
    const content = fs.readFileSync(JSON_DB_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error('[DB] Error reading JSON file, resetting to seed data', err);
    return defaultJsonDb;
  }
}

function writeJsonDb(data) {
  try {
    fs.writeFileSync(JSON_DB_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('[DB] Error writing to JSON database', err);
  }
}

// Database Connection & Mode Selector
async function init() {
  // Read config from .env
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'priyam_mobiles',
    port: parseInt(process.env.DB_PORT) || 3306
  };

  try {
    console.log('[DB] Attempting connection to MySQL...');
    // Create connection pool
    pool = mysql.createPool(dbConfig);
    // Ping database to test connection
    const connection = await pool.getConnection();
    console.log('[DB] Successfully connected to MySQL!');
    isUsingMySQL = true;
    connection.release();
  } catch (err) {
    console.log('[DB] MySQL connection failed. Error:', err.message);
    console.log('[DB] Switching to JSON-file Database fallback.');
    isUsingMySQL = false;
    initJsonDb();
  }
}

// Database Interface Implementation
const db = {
  isUsingMySQL: () => isUsingMySQL,
  init,

  users: {
    getByUsername: async (username) => {
      if (isUsingMySQL) {
        const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        return rows[0] || null;
      } else {
        const data = readJsonDb();
        return data.users.find(u => u.username === username) || null;
      }
    },
    getById: async (id) => {
      if (isUsingMySQL) {
        const [rows] = await pool.query('SELECT id, username, full_name, role, created_at FROM users WHERE id = ?', [id]);
        return rows[0] || null;
      } else {
        const data = readJsonDb();
        const user = data.users.find(u => u.id === parseInt(id));
        if (!user) return null;
        const { password_hash, ...userWithoutPassword } = user;
        return userWithoutPassword;
      }
    },
    create: async (username, password, fullName, role) => {
      const passwordHash = await bcrypt.hash(password, 10);
      if (isUsingMySQL) {
        const [result] = await pool.query(
          'INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
          [username, passwordHash, fullName, role]
        );
        return { id: result.insertId, username, fullName, role };
      } else {
        const data = readJsonDb();
        const id = data.users.length > 0 ? Math.max(...data.users.map(u => u.id)) + 1 : 1;
        const newUser = { id, username, password_hash: passwordHash, full_name: fullName, role, created_at: new Date().toISOString() };
        data.users.push(newUser);
        writeJsonDb(data);
        return { id, username, fullName, role };
      }
    }
  },

  products: {
    getAll: async (filters = {}) => {
      if (isUsingMySQL) {
        let sql = 'SELECT * FROM products WHERE 1=1';
        const params = [];
        if (filters.brand) {
          sql += ' AND brand = ?';
          params.push(filters.brand);
        }
        if (filters.search) {
          sql += ' AND (brand LIKE ? OR model LIKE ?)';
          params.push(`%${filters.search}%`, `%${filters.search}%`);
        }
        if (filters.sortByPrice) {
          sql += ` ORDER BY selling_price ${filters.sortByPrice === 'desc' ? 'DESC' : 'ASC'}`;
        } else {
          sql += ' ORDER BY id DESC';
        }
        const [rows] = await pool.query(sql, params);
        return rows;
      } else {
        const data = readJsonDb();
        let list = [...data.products];

        if (filters.brand) {
          list = list.filter(p => p.brand.toLowerCase() === filters.brand.toLowerCase());
        }
        if (filters.search) {
          const q = filters.search.toLowerCase();
          list = list.filter(p => p.brand.toLowerCase().includes(q) || p.model.toLowerCase().includes(q));
        }
        if (filters.sortByPrice) {
          list.sort((a, b) => {
            return filters.sortByPrice === 'desc' 
              ? b.selling_price - a.selling_price 
              : a.selling_price - b.selling_price;
          });
        } else {
          list.reverse(); // Newest first
        }
        return list;
      }
    },
    getById: async (id) => {
      if (isUsingMySQL) {
        const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
        return rows[0] || null;
      } else {
        const data = readJsonDb();
        return data.products.find(p => p.id === parseInt(id)) || null;
      }
    },
    create: async (productData) => {
      const { brand, model, ram, storage, battery, camera, processor, imei, purchase_price, selling_price, quantity, warranty, image_url } = productData;
      if (isUsingMySQL) {
        const [result] = await pool.query(
          `INSERT INTO products 
          (brand, model, ram, storage, battery, camera, processor, imei, purchase_price, selling_price, quantity, warranty, image_url) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [brand, model, ram, storage, battery, camera, processor, imei, purchase_price, selling_price, quantity, warranty, image_url]
        );
        return { id: result.insertId, ...productData };
      } else {
        const data = readJsonDb();
        const id = data.products.length > 0 ? Math.max(...data.products.map(p => p.id)) + 1 : 1;
        const newProduct = {
          id,
          brand,
          model,
          ram,
          storage,
          battery,
          camera,
          processor,
          imei,
          purchase_price: parseFloat(purchase_price),
          selling_price: parseFloat(selling_price),
          quantity: parseInt(quantity),
          warranty: warranty || '1 Year',
          image_url: image_url || 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600&auto=format&fit=crop&q=60',
          created_at: new Date().toISOString()
        };
        data.products.push(newProduct);
        writeJsonDb(data);
        return newProduct;
      }
    },
    update: async (id, productData) => {
      const { brand, model, ram, storage, battery, camera, processor, imei, purchase_price, selling_price, quantity, warranty, image_url } = productData;
      if (isUsingMySQL) {
        await pool.query(
          `UPDATE products 
          SET brand=?, model=?, ram=?, storage=?, battery=?, camera=?, processor=?, imei=?, purchase_price=?, selling_price=?, quantity=?, warranty=?, image_url=? 
          WHERE id=?`,
          [brand, model, ram, storage, battery, camera, processor, imei, purchase_price, selling_price, quantity, warranty, image_url, id]
        );
        return { id, ...productData };
      } else {
        const data = readJsonDb();
        const index = data.products.findIndex(p => p.id === parseInt(id));
        if (index === -1) throw new Error('Product not found');
        
        data.products[index] = {
          ...data.products[index],
          brand,
          model,
          ram,
          storage,
          battery,
          camera,
          processor,
          imei,
          purchase_price: parseFloat(purchase_price),
          selling_price: parseFloat(selling_price),
          quantity: parseInt(quantity),
          warranty,
          image_url: image_url || data.products[index].image_url
        };
        writeJsonDb(data);
        return data.products[index];
      }
    },
    delete: async (id) => {
      if (isUsingMySQL) {
        await pool.query('DELETE FROM products WHERE id = ?', [id]);
        return true;
      } else {
        const data = readJsonDb();
        const initialLen = data.products.length;
        data.products = data.products.filter(p => p.id !== parseInt(id));
        if (data.products.length === initialLen) throw new Error('Product not found');
        writeJsonDb(data);
        return true;
      }
    }
  },

  customers: {
    getAll: async () => {
      if (isUsingMySQL) {
        const [rows] = await pool.query('SELECT * FROM customers ORDER BY name ASC');
        return rows;
      } else {
        const data = readJsonDb();
        return [...data.customers].sort((a, b) => a.name.localeCompare(b.name));
      }
    },
    getById: async (id) => {
      if (isUsingMySQL) {
        const [rows] = await pool.query('SELECT * FROM customers WHERE id = ?', [id]);
        return rows[0] || null;
      } else {
        const data = readJsonDb();
        return data.customers.find(c => c.id === parseInt(id)) || null;
      }
    },
    getByPhone: async (phone) => {
      if (isUsingMySQL) {
        const [rows] = await pool.query('SELECT * FROM customers WHERE phone = ?', [phone]);
        return rows[0] || null;
      } else {
        const data = readJsonDb();
        return data.customers.find(c => c.phone === phone) || null;
      }
    },
    create: async (customerData) => {
      const { name, phone, email, address } = customerData;
      if (isUsingMySQL) {
        const [result] = await pool.query(
          'INSERT INTO customers (name, phone, email, address) VALUES (?, ?, ?, ?)',
          [name, phone, email, address]
        );
        return { id: result.insertId, ...customerData };
      } else {
        const data = readJsonDb();
        // Check if customer phone already exists
        const existing = data.customers.find(c => c.phone === phone);
        if (existing) return existing;

        const id = data.customers.length > 0 ? Math.max(...data.customers.map(c => c.id)) + 1 : 1;
        const newCustomer = { id, name, phone, email, address, created_at: new Date().toISOString() };
        data.customers.push(newCustomer);
        writeJsonDb(data);
        return newCustomer;
      }
    },
    update: async (id, customerData) => {
      const { name, phone, email, address } = customerData;
      if (isUsingMySQL) {
        await pool.query(
          'UPDATE customers SET name=?, phone=?, email=?, address=? WHERE id=?',
          [name, phone, email, address, id]
        );
        return { id, ...customerData };
      } else {
        const data = readJsonDb();
        const index = data.customers.findIndex(c => c.id === parseInt(id));
        if (index === -1) throw new Error('Customer not found');
        data.customers[index] = { ...data.customers[index], name, phone, email, address };
        writeJsonDb(data);
        return data.customers[index];
      }
    },
    delete: async (id) => {
      if (isUsingMySQL) {
        await pool.query('DELETE FROM customers WHERE id = ?', [id]);
        return true;
      } else {
        const data = readJsonDb();
        data.customers = data.customers.filter(c => c.id !== parseInt(id));
        writeJsonDb(data);
        return true;
      }
    },
    getPurchaseHistory: async (customerId) => {
      if (isUsingMySQL) {
        // Return sales matching customer_id with sales_items and products info
        const [rows] = await pool.query(
          `SELECT s.*, si.quantity as item_quantity, si.unit_price, si.total_price as item_total, p.brand, p.model
           FROM sales s
           JOIN sales_items si ON s.id = si.sale_id
           LEFT JOIN products p ON si.product_id = p.id
           WHERE s.customer_id = ?
           ORDER BY s.date DESC`,
          [customerId]
        );
        return rows;
      } else {
        const data = readJsonDb();
        const customerSales = data.sales.filter(s => s.customer_id === parseInt(customerId));
        const history = [];
        for (const sale of customerSales) {
          for (const item of sale.items) {
            history.push({
              id: sale.id,
              invoice_number: sale.invoice_number,
              date: sale.date,
              subtotal: sale.subtotal,
              discount: sale.discount,
              gst: sale.gst,
              total_amount: sale.total_amount,
              payment_mode: sale.payment_mode,
              brand: item.brand,
              model: item.model,
              item_quantity: item.quantity,
              unit_price: item.unit_price,
              item_total: item.total_price
            });
          }
        }
        return history.sort((a, b) => new Date(b.date) - new Date(a.date));
      }
    }
  },

  sales: {
    getAll: async () => {
      if (isUsingMySQL) {
        const [rows] = await pool.query(
          `SELECT s.*, c.name as customer_name, c.phone as customer_phone
           FROM sales s 
           LEFT JOIN customers c ON s.customer_id = c.id 
           ORDER BY s.date DESC`
        );
        return rows;
      } else {
        const data = readJsonDb();
        return data.sales.map(s => {
          const customer = data.customers.find(c => c.id === s.customer_id);
          return {
            ...s,
            customer_name: customer ? customer.name : 'Walk-in Customer',
            customer_phone: customer ? customer.phone : 'N/A'
          };
        }).sort((a, b) => new Date(b.date) - new Date(a.date));
      }
    },
    getById: async (id) => {
      if (isUsingMySQL) {
        const [salesRows] = await pool.query(
          `SELECT s.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email, c.address as customer_address, u.full_name as employee_name
           FROM sales s
           LEFT JOIN customers c ON s.customer_id = c.id
           LEFT JOIN users u ON s.employee_id = u.id
           WHERE s.id = ?`,
          [id]
        );
        if (salesRows.length === 0) return null;
        
        const [itemsRows] = await pool.query(
          `SELECT si.*, p.brand, p.model
           FROM sales_items si
           LEFT JOIN products p ON si.product_id = p.id
           WHERE si.sale_id = ?`,
          [id]
        );
        
        return {
          ...salesRows[0],
          items: itemsRows
        };
      } else {
        const data = readJsonDb();
        const sale = data.sales.find(s => s.id === parseInt(id));
        if (!sale) return null;
        
        const customer = data.customers.find(c => c.id === sale.customer_id) || {};
        const employee = data.users.find(u => u.id === sale.employee_id) || {};
        
        return {
          ...sale,
          customer_name: customer.name || 'Walk-in Customer',
          customer_phone: customer.phone || 'N/A',
          customer_email: customer.email || '',
          customer_address: customer.address || '',
          employee_name: employee.full_name || 'System',
        };
      }
    },
    create: async (saleData, saleItems, employeeId) => {
      let { customer_id, discount, payment_mode } = saleData;
      discount = parseFloat(discount || 0);

      // Fetch products to verify pricing & stock and calculate subtotal
      let subtotal = 0;
      const verifiedItems = [];

      if (isUsingMySQL) {
        const connection = await pool.getConnection();
        try {
          await connection.beginTransaction();

          for (const item of saleItems) {
            const [pRows] = await connection.query('SELECT * FROM products WHERE id = ?', [item.product_id]);
            const product = pRows[0];
            if (!product) throw new Error(`Product ID ${item.product_id} not found`);
            if (product.quantity < item.quantity) {
              throw new Error(`Insufficient stock for ${product.brand} ${product.model}. Available: ${product.quantity}`);
            }

            const itemTotal = product.selling_price * item.quantity;
            subtotal += itemTotal;

            verifiedItems.push({
              product_id: product.id,
              brand: product.brand,
              model: product.model,
              quantity: item.quantity,
              unit_price: product.selling_price,
              total_price: itemTotal
            });

            // Decrement Stock
            await connection.query('UPDATE products SET quantity = quantity - ? WHERE id = ?', [item.quantity, product.id]);
          }

          const gst = parseFloat(((subtotal - discount) * 0.18).toFixed(2));
          const totalAmount = parseFloat((subtotal - discount + gst).toFixed(2));
          const invoiceNumber = `PM-INV-${Date.now().toString().slice(-6)}`;

          // Create sale
          const [salesResult] = await connection.query(
            `INSERT INTO sales 
            (invoice_number, customer_id, subtotal, discount, gst, total_amount, payment_mode, employee_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [invoiceNumber, customer_id, subtotal, discount, gst, totalAmount, payment_mode, employeeId]
          );
          const saleId = salesResult.insertId;

          // Insert sale items
          for (const vi of verifiedItems) {
            await connection.query(
              `INSERT INTO sales_items (sale_id, product_id, quantity, unit_price, total_price) 
              VALUES (?, ?, ?, ?, ?)`,
              [saleId, vi.product_id, vi.quantity, vi.unit_price, vi.total_price]
            );
          }

          await connection.commit();
          return { id: saleId, invoice_number: invoiceNumber, total_amount: totalAmount };
        } catch (err) {
          await connection.rollback();
          throw err;
        } finally {
          connection.release();
        }
      } else {
        const data = readJsonDb();
        
        for (const item of saleItems) {
          const product = data.products.find(p => p.id === parseInt(item.product_id));
          if (!product) throw new Error(`Product ID ${item.product_id} not found`);
          if (product.quantity < item.quantity) {
            throw new Error(`Insufficient stock for ${product.brand} ${product.model}. Available: ${product.quantity}`);
          }
          
          const itemTotal = product.selling_price * item.quantity;
          subtotal += itemTotal;
          
          verifiedItems.push({
            product_id: product.id,
            brand: product.brand,
            model: product.model,
            quantity: item.quantity,
            unit_price: product.selling_price,
            total_price: itemTotal
          });

          // Decrement Stock
          product.quantity -= item.quantity;
        }

        const gst = parseFloat(((subtotal - discount) * 0.18).toFixed(2));
        const totalAmount = parseFloat((subtotal - discount + gst).toFixed(2));
        const invoiceNumber = `PM-INV-${Date.now().toString().slice(-6)}`;
        const saleId = data.sales.length > 0 ? Math.max(...data.sales.map(s => s.id)) + 1 : 1;

        const newSale = {
          id: saleId,
          invoice_number: invoiceNumber,
          customer_id: parseInt(customer_id) || null,
          subtotal,
          discount,
          gst,
          total_amount: totalAmount,
          payment_mode,
          date: new Date().toISOString(),
          employee_id: employeeId,
          items: verifiedItems
        };

        data.sales.push(newSale);
        writeJsonDb(data);
        return { id: saleId, invoice_number: invoiceNumber, total_amount: totalAmount };
      }
    }
  },

  services: {
    getAll: async () => {
      if (isUsingMySQL) {
        const [rows] = await pool.query('SELECT * FROM service_requests ORDER BY created_at DESC');
        return rows;
      } else {
        const data = readJsonDb();
        return [...data.service_requests].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      }
    },
    getById: async (id) => {
      if (isUsingMySQL) {
        const [rows] = await pool.query('SELECT * FROM service_requests WHERE id = ?', [id]);
        return rows[0] || null;
      } else {
        const data = readJsonDb();
        return data.service_requests.find(sr => sr.id.toLowerCase() === id.toLowerCase()) || null;
      }
    },
    create: async (serviceData) => {
      const { customer_name, customer_phone, device_model, issue_description, estimated_cost } = serviceData;
      const trackingId = `PM-SR-${Date.now().toString().slice(-4)}`;
      const estVal = parseFloat(estimated_cost || 0);

      if (isUsingMySQL) {
        await pool.query(
          `INSERT INTO service_requests 
          (id, customer_name, customer_phone, device_model, issue_description, status, estimated_cost, actual_cost, comments) 
          VALUES (?, ?, ?, ?, ?, 'Pending', ?, 0.00, '')`,
          [trackingId, customer_name, customer_phone, device_model, issue_description, estVal]
        );
        return { id: trackingId, ...serviceData, status: 'Pending', actual_cost: 0.00, comments: '' };
      } else {
        const data = readJsonDb();
        const newReq = {
          id: trackingId,
          customer_name,
          customer_phone,
          device_model,
          issue_description,
          status: 'Pending',
          estimated_cost: estVal,
          actual_cost: 0.00,
          comments: 'Request submitted successfully.',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        data.service_requests.push(newReq);
        writeJsonDb(data);
        return newReq;
      }
    },
    update: async (id, updateData) => {
      const { status, estimated_cost, actual_cost, comments } = updateData;
      const estVal = parseFloat(estimated_cost || 0);
      const actVal = parseFloat(actual_cost || 0);

      if (isUsingMySQL) {
        await pool.query(
          `UPDATE service_requests 
          SET status=?, estimated_cost=?, actual_cost=?, comments=?, updated_at=CURRENT_TIMESTAMP 
          WHERE id=?`,
          [status, estVal, actVal, comments, id]
        );
        const [rows] = await pool.query('SELECT * FROM service_requests WHERE id = ?', [id]);
        return rows[0];
      } else {
        const data = readJsonDb();
        const index = data.service_requests.findIndex(sr => sr.id.toLowerCase() === id.toLowerCase());
        if (index === -1) throw new Error('Service request not found');

        data.service_requests[index] = {
          ...data.service_requests[index],
          status,
          estimated_cost: estVal,
          actual_cost: actVal,
          comments,
          updated_at: new Date().toISOString()
        };
        writeJsonDb(data);
        return data.service_requests[index];
      }
    }
  }
};

module.exports = db;
