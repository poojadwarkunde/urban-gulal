const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const db = require('./database');
const { PRODUCTS, CATEGORIES } = require('./products');

const app = express();
const PORT = process.env.PORT || 3002;

// Prices storage
const PRICES_FILE = path.join(__dirname, 'prices.json');

function loadPrices() {
  try {
    if (fs.existsSync(PRICES_FILE)) {
      const data = fs.readFileSync(PRICES_FILE, 'utf8');
      return JSON.parse(data).prices || {};
    }
  } catch (err) {
    console.error('Error loading prices:', err);
  }
  return {};
}

function savePrices(prices) {
  fs.writeFileSync(PRICES_FILE, JSON.stringify({ prices }, null, 2));
}

app.use(cors());
app.use(express.json());

// Serve static frontend files in production
app.use(express.static(path.join(__dirname, 'public')));

// GET all products (with dynamic prices)
app.get('/api/products', (req, res) => {
  const { category } = req.query;
  const prices = loadPrices();
  
  let products = PRODUCTS.map(p => ({
    ...p,
    price: prices[p.id] !== undefined ? prices[p.id] : p.price
  }));
  
  if (category && category !== 'All') {
    products = products.filter(p => p.category === category);
  }
  
  res.json(products);
});

// PUT update product price (Admin only)
app.put('/api/products/:id/price', (req, res) => {
  try {
    const { id } = req.params;
    const { price } = req.body;
    
    if (price === undefined || isNaN(price) || price < 0) {
      return res.status(400).json({ error: 'Invalid price' });
    }
    
    const product = PRODUCTS.find(p => p.id === parseInt(id));
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const prices = loadPrices();
    prices[id] = parseInt(price);
    savePrices(prices);
    
    res.json({ id: parseInt(id), price: parseInt(price), name: product.name });
  } catch (error) {
    console.error('Error updating price:', error);
    res.status(500).json({ error: 'Failed to update price' });
  }
});

// PUT bulk update prices (Admin only)
app.put('/api/products/prices/bulk', (req, res) => {
  try {
    const { prices: newPrices } = req.body;
    
    if (!newPrices || typeof newPrices !== 'object') {
      return res.status(400).json({ error: 'Invalid prices data' });
    }
    
    const prices = loadPrices();
    Object.entries(newPrices).forEach(([id, price]) => {
      if (!isNaN(price) && price >= 0) {
        prices[id] = parseInt(price);
      }
    });
    savePrices(prices);
    
    res.json({ success: true, updated: Object.keys(newPrices).length });
  } catch (error) {
    console.error('Error bulk updating prices:', error);
    res.status(500).json({ error: 'Failed to update prices' });
  }
});

// GET categories
app.get('/api/categories', (req, res) => {
  res.json(CATEGORIES);
});

// GET all orders (sorted by latest first)
app.get('/api/orders', (req, res) => {
  try {
    const orders = db.getAllOrders();
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// POST new order
app.post('/api/orders', (req, res) => {
  try {
    const { customerName, phone, address, city, pincode, items, totalAmount, notes } = req.body;
    
    if (!customerName || !phone || !address || !items || items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const order = db.createOrder({
      customerName,
      phone,
      address,
      city: city || '',
      pincode: pincode || '',
      items,
      totalAmount,
      status: 'NEW',
      paymentStatus: 'PENDING',
      notes: notes || ''
    });
    
    res.status(201).json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// PUT update order (status/paymentStatus)
app.put('/api/orders/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { status, paymentStatus } = req.body;
    
    const updates = {};
    if (status) updates.status = status;
    if (paymentStatus) updates.paymentStatus = paymentStatus;
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    const order = db.updateOrder(id, updates);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json(order);
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', shop: 'Urban Gulal' });
});

// Serve frontend for all other routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🎨 Urban Gulal API running on http://localhost:${PORT}`);
});
