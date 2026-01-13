const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const XLSX = require('xlsx');
const cron = require('node-cron');
const { PRODUCTS, CATEGORIES } = require('./products');

const app = express();
const PORT = process.env.PORT || 3002;

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://urbangulal:UrbanGulal2026%21@cluster0.ucxzf4e.mongodb.net/urbangulal?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// MongoDB Schemas
const orderSchema = new mongoose.Schema({
  orderId: { type: Number, unique: true },
  customerName: String,
  phone: String,
  address: String,
  city: String,
  pincode: String,
  items: [{
    id: Number,
    name: String,
    price: Number,
    qty: Number
  }],
  totalAmount: Number,
  status: { type: String, default: 'NEW' },
  paymentStatus: { type: String, default: 'PENDING' },
  notes: String,
  cancelReason: String,
  cancelledAt: Date,
  adminFeedback: String,
  feedbackAt: Date,
  createdAt: { type: Date, default: Date.now }
});

const productOverrideSchema = new mongoose.Schema({
  productId: { type: Number, unique: true },
  name: String,
  description: String,
  image: String,
  category: String,
  available: { type: Boolean, default: true },
  inStock: { type: Boolean, default: true },
  price: Number,
  isCustom: { type: Boolean, default: false }
});

const userSchema = new mongoose.Schema({
  userId: { type: Number, unique: true },
  name: String,
  mobile: { type: String, unique: true },
  createdAt: { type: Date, default: Date.now }
});

const counterSchema = new mongoose.Schema({
  name: String,
  value: Number
});

const Order = mongoose.model('Order', orderSchema);
const ProductOverride = mongoose.model('ProductOverride', productOverrideSchema);
const User = mongoose.model('User', userSchema);
const Counter = mongoose.model('Counter', counterSchema);

// Get next ID for a counter
async function getNextId(counterName) {
  const counter = await Counter.findOneAndUpdate(
    { name: counterName },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );
  return counter.value;
}

// Excel Export Functions
const EXPORTS_DIR = path.join(__dirname, 'exports');
if (!fs.existsSync(EXPORTS_DIR)) {
  fs.mkdirSync(EXPORTS_DIR, { recursive: true });
}

function formatDate(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateTime(date) {
  const d = new Date(date);
  return `${formatDate(date)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

async function generateDailySheet(date = new Date()) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const orders = await Order.find({
    createdAt: { $gte: startOfDay, $lte: endOfDay }
  }).sort({ createdAt: -1 });

  const data = orders.map(order => ({
    'Order ID': order.orderId,
    'Date': formatDateTime(order.createdAt),
    'Customer': order.customerName,
    'Phone': order.phone,
    'Address': `${order.address}, ${order.city} ${order.pincode}`.trim(),
    'Items': order.items.map(i => `${i.name} x${i.qty}`).join(', '),
    'Total': order.totalAmount,
    'Status': order.status,
    'Payment': order.paymentStatus,
    'Notes': order.notes || '',
    'Cancel Reason': order.cancelReason || '',
    'Feedback': order.adminFeedback || ''
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Daily Orders');

  // Add summary sheet
  const summary = [{
    'Total Orders': orders.length,
    'New': orders.filter(o => o.status === 'NEW').length,
    'Confirmed': orders.filter(o => o.status === 'CONFIRMED').length,
    'Shipped': orders.filter(o => o.status === 'SHIPPED').length,
    'Delivered': orders.filter(o => o.status === 'DELIVERED').length,
    'Cancelled': orders.filter(o => o.status === 'CANCELLED').length,
    'Total Revenue': orders.filter(o => o.status !== 'CANCELLED').reduce((sum, o) => sum + o.totalAmount, 0),
    'Paid Amount': orders.filter(o => o.paymentStatus === 'PAID').reduce((sum, o) => sum + o.totalAmount, 0)
  }];
  const summaryWs = XLSX.utils.json_to_sheet(summary);
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

  const filename = `UrbanGulal_Daily_${formatDate(date)}.xlsx`;
  const filepath = path.join(EXPORTS_DIR, filename);
  XLSX.writeFile(wb, filepath);
  
  console.log(`📊 Daily sheet generated: ${filename}`);
  return { filename, filepath };
}

async function generateConsolidatedSheet() {
  const orders = await Order.find().sort({ createdAt: -1 });

  const data = orders.map(order => ({
    'Order ID': order.orderId,
    'Date': formatDateTime(order.createdAt),
    'Customer': order.customerName,
    'Phone': order.phone,
    'Address': `${order.address}, ${order.city} ${order.pincode}`.trim(),
    'Items': order.items.map(i => `${i.name} x${i.qty}`).join(', '),
    'Total': order.totalAmount,
    'Status': order.status,
    'Payment': order.paymentStatus,
    'Notes': order.notes || '',
    'Cancel Reason': order.cancelReason || '',
    'Feedback': order.adminFeedback || ''
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'All Orders');

  // Add daily summary sheet
  const ordersByDate = {};
  orders.forEach(order => {
    const date = formatDate(order.createdAt);
    if (!ordersByDate[date]) {
      ordersByDate[date] = { orders: [], revenue: 0, paid: 0 };
    }
    ordersByDate[date].orders.push(order);
    if (order.status !== 'CANCELLED') {
      ordersByDate[date].revenue += order.totalAmount;
    }
    if (order.paymentStatus === 'PAID') {
      ordersByDate[date].paid += order.totalAmount;
    }
  });

  const dailySummary = Object.entries(ordersByDate).map(([date, data]) => ({
    'Date': date,
    'Total Orders': data.orders.length,
    'Delivered': data.orders.filter(o => o.status === 'DELIVERED').length,
    'Cancelled': data.orders.filter(o => o.status === 'CANCELLED').length,
    'Revenue': data.revenue,
    'Paid': data.paid,
    'Pending': data.revenue - data.paid
  }));

  const summaryWs = XLSX.utils.json_to_sheet(dailySummary);
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Daily Summary');

  const filename = `UrbanGulal_Consolidated_${formatDate(new Date())}.xlsx`;
  const filepath = path.join(EXPORTS_DIR, filename);
  XLSX.writeFile(wb, filepath);
  
  console.log(`📊 Consolidated sheet generated: ${filename}`);
  return { filename, filepath };
}

// Schedule daily export at 11:59 PM
cron.schedule('59 23 * * *', async () => {
  console.log('⏰ Running scheduled daily export...');
  try {
    await generateDailySheet();
    await generateConsolidatedSheet();
  } catch (err) {
    console.error('Error in scheduled export:', err);
  }
});

app.use(cors());
app.use(express.json());

// Serve static frontend files in production
app.use(express.static(path.join(__dirname, 'public')));
app.use('/exports', express.static(EXPORTS_DIR));

// =====================
// PRODUCT ENDPOINTS
// =====================

app.get('/api/products', async (req, res) => {
  try {
    const { category, includeHidden } = req.query;
    const overrides = await ProductOverride.find();
    const overrideMap = {};
    overrides.forEach(o => { overrideMap[o.productId] = o; });

    let products = PRODUCTS.map(p => {
      const override = overrideMap[p.id] || {};
      return {
        ...p,
        name: override.name || p.name,
        description: override.description || p.description,
        image: override.image || p.image,
        category: override.category || p.category,
        available: override.available !== undefined ? override.available : true,
        inStock: override.inStock !== undefined ? override.inStock : true,
        price: override.price !== undefined ? override.price : p.price
      };
    });

    // Add custom products
    const customProducts = overrides
      .filter(o => o.isCustom)
      .map(o => ({
        id: o.productId,
        name: o.name,
        description: o.description || '',
        image: o.image || '/placeholder.png',
        category: o.category,
        available: o.available !== undefined ? o.available : true,
        inStock: o.inStock !== undefined ? o.inStock : true,
        price: o.price || 0,
        isCustom: true
      }));

    products = [...products, ...customProducts];

    if (includeHidden !== 'true') {
      products = products.filter(p => p.available !== false);
    }

    if (category && category !== 'All') {
      products = products.filter(p => p.category === category);
    }

    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, image, category, available, inStock, price } = req.body;

    const update = {};
    if (name !== undefined) update.name = name;
    if (description !== undefined) update.description = description;
    if (image !== undefined) update.image = image;
    if (category !== undefined) update.category = category;
    if (available !== undefined) update.available = available;
    if (inStock !== undefined) update.inStock = inStock;
    if (price !== undefined) update.price = price;

    const override = await ProductOverride.findOneAndUpdate(
      { productId: parseInt(id) },
      { $set: update },
      { new: true, upsert: true }
    );

    const product = PRODUCTS.find(p => p.id === parseInt(id)) || {};
    res.json({
      id: parseInt(id),
      name: override.name || product.name,
      description: override.description || product.description,
      image: override.image || product.image,
      category: override.category || product.category,
      available: override.available,
      inStock: override.inStock,
      price: override.price || product.price
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const { name, description, image, category, price } = req.body;

    if (!name || !category) {
      return res.status(400).json({ error: 'Name and category are required' });
    }

    const maxProduct = await ProductOverride.findOne().sort({ productId: -1 });
    const maxBaseId = Math.max(...PRODUCTS.map(p => p.id), 0);
    const newId = Math.max(maxProduct?.productId || 0, maxBaseId) + 1;

    const newProduct = new ProductOverride({
      productId: newId,
      name,
      description: description || '',
      image: image || '/placeholder.png',
      category,
      available: true,
      inStock: true,
      price: price || 0,
      isCustom: true
    });

    await newProduct.save();
    res.status(201).json({
      id: newId,
      name,
      description: description || '',
      image: image || '/placeholder.png',
      category,
      available: true,
      inStock: true,
      price: price || 0
    });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ error: 'Failed to add product' });
  }
});

app.put('/api/products/prices/bulk', async (req, res) => {
  try {
    const { prices } = req.body;
    
    for (const [id, price] of Object.entries(prices)) {
      await ProductOverride.findOneAndUpdate(
        { productId: parseInt(id) },
        { $set: { price: parseInt(price) } },
        { upsert: true }
      );
    }
    
    res.json({ success: true, updated: Object.keys(prices).length });
  } catch (error) {
    console.error('Error bulk updating prices:', error);
    res.status(500).json({ error: 'Failed to update prices' });
  }
});

app.get('/api/categories', (req, res) => {
  res.json(CATEGORIES);
});

// =====================
// ORDER ENDPOINTS
// =====================

app.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders.map(o => ({ ...o.toObject(), id: o.orderId })));
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const { customerName, phone, address, city, pincode, items, totalAmount, notes } = req.body;

    if (!customerName || !phone || !address || !items || items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const orderId = await getNextId('orderId');
    const order = new Order({
      orderId,
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

    await order.save();
    res.status(201).json({ ...order.toObject(), id: order.orderId });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

app.put('/api/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paymentStatus, cancelReason, cancelledAt, adminFeedback, feedbackAt } = req.body;

    const updates = {};
    if (status) updates.status = status;
    if (paymentStatus) updates.paymentStatus = paymentStatus;
    if (cancelReason !== undefined) updates.cancelReason = cancelReason;
    if (cancelledAt) updates.cancelledAt = cancelledAt;
    if (adminFeedback !== undefined) updates.adminFeedback = adminFeedback;
    if (feedbackAt) updates.feedbackAt = feedbackAt;

    const order = await Order.findOneAndUpdate(
      { orderId: parseInt(id) },
      { $set: updates },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ ...order.toObject(), id: order.orderId });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// =====================
// USER ENDPOINTS
// =====================

app.post('/api/users/register', async (req, res) => {
  try {
    const { name, mobile } = req.body;

    if (!name || !mobile) {
      return res.status(400).json({ error: 'Name and mobile are required' });
    }

    if (!/^\d{10}$/.test(mobile)) {
      return res.status(400).json({ error: 'Mobile must be 10 digits' });
    }

    const existingUser = await User.findOne({ mobile });
    if (existingUser) {
      return res.status(400).json({ error: 'Mobile number already registered. Please login.' });
    }

    const userId = await getNextId('userId');
    const user = new User({
      userId,
      name: name.trim(),
      mobile
    });

    await user.save();
    res.status(201).json({ success: true, user: user.toObject() });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

app.post('/api/users/login', async (req, res) => {
  try {
    const { mobile } = req.body;

    if (!mobile) {
      return res.status(400).json({ error: 'Mobile number is required' });
    }

    const user = await User.findOne({ mobile });
    if (!user) {
      return res.status(404).json({ error: 'User not found. Please register first.' });
    }

    res.json({ success: true, user: user.toObject() });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// =====================
// EXPORT ENDPOINTS
// =====================

app.get('/api/export/daily', async (req, res) => {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const { filename, filepath } = await generateDailySheet(date);
    res.download(filepath, filename);
  } catch (error) {
    console.error('Error exporting daily sheet:', error);
    res.status(500).json({ error: 'Failed to export daily sheet' });
  }
});

app.get('/api/export/consolidated', async (req, res) => {
  try {
    const { filename, filepath } = await generateConsolidatedSheet();
    res.download(filepath, filename);
  } catch (error) {
    console.error('Error exporting consolidated sheet:', error);
    res.status(500).json({ error: 'Failed to export consolidated sheet' });
  }
});

app.get('/api/export/list', (req, res) => {
  try {
    const files = fs.readdirSync(EXPORTS_DIR)
      .filter(f => f.endsWith('.xlsx'))
      .map(f => ({
        name: f,
        url: `/exports/${f}`,
        created: fs.statSync(path.join(EXPORTS_DIR, f)).mtime
      }))
      .sort((a, b) => b.created - a.created);
    res.json(files);
  } catch (error) {
    res.json([]);
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', shop: 'Urban Gulal', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

// Serve frontend for all other routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🎨 Urban Gulal API running on http://localhost:${PORT}`);
});
