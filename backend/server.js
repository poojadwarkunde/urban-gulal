const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');
const { PRODUCTS, CATEGORIES } = require('./products');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// Serve static frontend files in production
app.use(express.static(path.join(__dirname, 'public')));

// GET all products
app.get('/api/products', (req, res) => {
  const { category } = req.query;
  let products = PRODUCTS;
  
  if (category && category !== 'All') {
    products = PRODUCTS.filter(p => p.category === category);
  }
  
  res.json(products);
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
