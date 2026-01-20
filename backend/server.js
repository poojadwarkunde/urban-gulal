const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const XLSX = require('xlsx');
const cron = require('node-cron');
const https = require('https');
const { PRODUCTS, CATEGORIES } = require('./products');

const app = express();
const PORT = process.env.PORT || 3002;

// Generate admin notification message for new order (for logging)
function getAdminNewOrderMessage(order) {
  const itemsList = order.items.map(i => `${i.name} x${i.qty}`).join('\n• ');
  const address = `${order.address}${order.city ? ', ' + order.city : ''}${order.pincode ? ' - ' + order.pincode : ''}`;
  
  return `🔔 *NEW ORDER ALERT!*

📋 Order #${order.orderId}
👤 Customer: ${order.customerName}
📱 Phone: ${order.phone}
📍 Address: ${address}

🛍️ *Items:*
• ${itemsList}

💰 *Total: ₹${order.totalAmount}*
${order.notes ? `\n📝 Notes: ${order.notes}` : ''}

⏰ Received at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;
}

// Generate order status message for Urban Gulal
function getStatusMessage(order, status) {
  const itemsList = order.items.map(i => `${i.name} x${i.qty}`).join('\n• ');
  const address = `${order.address}${order.city ? ', ' + order.city : ''}${order.pincode ? ' - ' + order.pincode : ''}`;
  
  switch (status) {
    case 'NEW':
      return `🎨 *Urban Gulal - Order Received!*

📋 Order #${order.orderId}
👤 ${order.customerName}
📍 ${address}

🛍️ *Items:*
• ${itemsList}

💰 *Total: ₹${order.totalAmount}*

✅ We've received your order and will process it soon!

Thank you for shopping with Urban Gulal! 🙏`;
    case 'CONFIRMED':
      return `✅ *Urban Gulal - Order Confirmed!*

📋 Order #${order.orderId}

🛍️ *Items:*
• ${itemsList}

💰 *Total: ₹${order.totalAmount}*

📦 Your order has been confirmed and is being prepared for dispatch.

Thank you for your patience! 🙏`;
    case 'SHIPPED':
      return `🚚 *Urban Gulal - Order Shipped!*

📋 Order #${order.orderId}
📍 Delivery Address: ${address}

🛍️ *Items:*
• ${itemsList}

🎉 Your order is on its way!

You will receive it soon. Thank you for shopping with Urban Gulal! 🙏`;
    case 'DELIVERED':
      return `🎉 *Urban Gulal - Order Delivered!*

📋 Order #${order.orderId}

✅ Your order has been delivered!

We hope you love your purchase. Thank you for shopping with Urban Gulal! 🎨🙏`;
    case 'CANCELLED':
      return `❌ *Urban Gulal - Order Cancelled*

📋 Order #${order.orderId}

⚠️ Reason: ${order.cancelReason || 'N/A'}

If you have questions, please contact us.`;
    default:
      return `🎨 *Urban Gulal - Order Update*

📋 Order #${order.orderId}
📊 Status: ${status}

🛍️ *Items:*
• ${itemsList}

💰 *Total: ₹${order.totalAmount}*`;
  }
}

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://urbangulal:UrbanGulal2026%21@cluster0.ucxzf4e.mongodb.net/urbangulal?retryWrites=true&w=majority';

// GitHub Configuration for auto-push Excel reports
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const GITHUB_REPO = 'poojadwarkunde/urban-gulal';
const GITHUB_BRANCH = 'main';

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

const ratingSchema = new mongoose.Schema({
  orderId: { type: Number, required: true },
  productId: { type: Number, required: true },
  productName: String,
  customerName: String,
  phone: String,
  rating: { type: Number, required: true, min: 1, max: 5 },
  review: String,
  createdAt: { type: Date, default: Date.now }
});

const feedbackScreenshotSchema = new mongoose.Schema({
  imageUrl: { type: String, required: true },
  caption: String,
  customerName: String,
  active: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', orderSchema);
const ProductOverride = mongoose.model('ProductOverride', productOverrideSchema);
const User = mongoose.model('User', userSchema);
const Counter = mongoose.model('Counter', counterSchema);
const Rating = mongoose.model('Rating', ratingSchema);
const FeedbackScreenshot = mongoose.model('FeedbackScreenshot', feedbackScreenshotSchema);

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

// GitHub API: Upload file to repository
async function uploadToGitHub(filepath, filename, folder = 'reports') {
  if (!GITHUB_TOKEN) {
    console.log('⚠️ GitHub token not configured, skipping upload');
    return null;
  }

  try {
    const content = fs.readFileSync(filepath);
    const base64Content = content.toString('base64');
    const githubPath = `${folder}/${filename}`;

    // Check if file exists (to get SHA for update)
    let sha = null;
    try {
      const checkResponse = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/${githubPath}?ref=${GITHUB_BRANCH}`,
        {
          headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );
      if (checkResponse.ok) {
        const existingFile = await checkResponse.json();
        sha = existingFile.sha;
      }
    } catch (e) {
      // File doesn't exist, that's fine
    }

    const body = {
      message: `📊 Update ${filename} - ${new Date().toISOString()}`,
      content: base64Content,
      branch: GITHUB_BRANCH
    };
    if (sha) body.sha = sha;

    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${githubPath}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }
    );

    if (response.ok) {
      console.log(`✅ Uploaded to GitHub: ${githubPath}`);
      return githubPath;
    } else {
      const error = await response.text();
      console.error('❌ GitHub upload failed:', error);
      return null;
    }
  } catch (error) {
    console.error('❌ GitHub upload error:', error);
    return null;
  }
}

// Generate and upload reports to GitHub
async function generateAndUploadReports() {
  try {
    const daily = await generateDailySheet();
    const consolidated = await generateConsolidatedSheet();
    
    // Upload to GitHub
    await uploadToGitHub(daily.filepath, daily.filename);
    await uploadToGitHub(consolidated.filepath, consolidated.filename);
    
    console.log('📊 Reports generated and uploaded to GitHub');
  } catch (error) {
    console.error('Error generating reports:', error);
  }
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

// Get order history for a customer by phone number
app.get('/api/orders/history/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    // Clean phone number - remove non-digits
    const cleanedPhone = phone.replace(/\D/g, '');
    
    // Find orders matching the phone number (last 10 digits)
    const orders = await Order.find({
      $or: [
        { phone: cleanedPhone },
        { phone: { $regex: cleanedPhone.slice(-10) + '$' } }
      ]
    }).sort({ createdAt: -1 });
    
    res.json(orders.map(o => ({ 
      ...o.toObject(), 
      id: o.orderId,
      // Format date for display
      orderDate: new Date(o.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }),
      orderTime: new Date(o.createdAt).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    })));
  } catch (error) {
    console.error('Error fetching order history:', error);
    res.status(500).json({ error: 'Failed to fetch order history' });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const { customerName, phone, address, city, pincode, items, totalAmount, notes, createdAt, status, paymentStatus } = req.body;

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
      status: status || 'NEW',
      paymentStatus: paymentStatus || 'PENDING',
      notes: notes || '',
      createdAt: createdAt ? new Date(createdAt) : new Date()
    });

    await order.save();
    
    // Log new order for admin (WhatsApp removed - use SMS or manual notification)
    const isBackdated = createdAt && new Date(createdAt).toDateString() !== new Date().toDateString();
    console.log(`📋 ${isBackdated ? 'Backdated order' : 'New order'} created: #${order.orderId} - Customer: ${order.customerName}`);
    
    // Auto-generate and upload reports to GitHub
    generateAndUploadReports().catch(err => console.error('Report generation error:', err));
    
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

    // Get old order to check status change
    const oldOrder = await Order.findOne({ orderId: parseInt(id) });
    const oldStatus = oldOrder ? oldOrder.status : null;

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

    // Log status change
    if (status && status !== oldStatus) {
      console.log(`📋 Order #${order.orderId} status changed: ${oldStatus} → ${status}`);
    }

    // Auto-generate and upload reports to GitHub on status/payment update
    generateAndUploadReports().catch(err => console.error('Report generation error:', err));

    res.json({ ...order.toObject(), id: order.orderId });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// Update order items (admin feature) - full replace, add, remove, update qty
app.put('/api/orders/:id/items', async (req, res) => {
  try {
    const { id } = req.params;
    const { items, mode } = req.body;
    
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Items array is required' });
    }
    
    const order = await Order.findOne({ orderId: parseInt(id) });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    let finalItems;
    
    if (mode === 'replace') {
      // Replace all items with the new list
      finalItems = items.map(item => ({
        id: item.id || Date.now(),
        name: item.name,
        price: parseInt(item.price) || 0,
        qty: parseInt(item.qty) || 1
      })).filter(item => item.qty > 0);
    } else {
      // Default: add to existing items (backward compatible)
      const existingItems = order.items || [];
      const newItems = items.map(item => ({
        id: item.id || Date.now(),
        name: item.name,
        price: parseInt(item.price) || 0,
        qty: parseInt(item.qty) || 1
      }));
      finalItems = [...existingItems, ...newItems];
    }
    
    if (finalItems.length === 0) {
      return res.status(400).json({ error: 'Order must have at least one item' });
    }
    
    // Recalculate total
    const newTotal = finalItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
    
    // Update order
    const updatedOrder = await Order.findOneAndUpdate(
      { orderId: parseInt(id) },
      { 
        $set: { 
          items: finalItems, 
          totalAmount: newTotal 
        } 
      },
      { new: true }
    );
    
    console.log(`📋 Order #${updatedOrder.orderId} - Items updated. New total: ₹${newTotal}`);
    
    // Auto-generate and upload reports to GitHub
    generateAndUploadReports().catch(err => console.error('Report generation error:', err));
    
    res.json({ ...updatedOrder.toObject(), id: updatedOrder.orderId });
  } catch (error) {
    console.error('Error updating order items:', error);
    res.status(500).json({ error: 'Failed to update order items' });
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

// =====================
// RATING ENDPOINTS
// =====================

// Submit rating for an order
app.post('/api/ratings', async (req, res) => {
  try {
    const { orderId, ratings, customerName, phone } = req.body;
    
    // ratings is an array of { productId, productName, rating, review }
    const savedRatings = [];
    for (const r of ratings) {
      const rating = new Rating({
        orderId,
        productId: r.productId,
        productName: r.productName,
        customerName,
        phone,
        rating: r.rating,
        review: r.review || ''
      });
      await rating.save();
      savedRatings.push(rating);
    }
    
    res.json({ success: true, ratings: savedRatings });
  } catch (error) {
    console.error('Error saving ratings:', error);
    res.status(500).json({ error: 'Failed to save ratings' });
  }
});

// Get ratings for a specific order
app.get('/api/ratings/order/:orderId', async (req, res) => {
  try {
    const ratings = await Rating.find({ orderId: parseInt(req.params.orderId) });
    res.json(ratings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ratings' });
  }
});

// Get average rating for a product
app.get('/api/ratings/product/:productId', async (req, res) => {
  try {
    const ratings = await Rating.find({ productId: parseInt(req.params.productId) });
    if (ratings.length === 0) {
      return res.json({ avgRating: 0, count: 0 });
    }
    const avg = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
    res.json({ avgRating: Math.round(avg * 10) / 10, count: ratings.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ratings' });
  }
});

// Get all product ratings (for displaying on shop)
app.get('/api/ratings/all', async (req, res) => {
  try {
    const ratings = await Rating.find();
    // Group by productId and calculate averages
    const productRatings = {};
    for (const r of ratings) {
      if (!productRatings[r.productId]) {
        productRatings[r.productId] = { sum: 0, count: 0, reviews: [] };
      }
      productRatings[r.productId].sum += r.rating;
      productRatings[r.productId].count++;
      if (r.review) {
        productRatings[r.productId].reviews.push({
          rating: r.rating,
          review: r.review,
          customerName: r.customerName,
          createdAt: r.createdAt
        });
      }
    }
    
    // Convert to final format
    const result = {};
    for (const [productId, data] of Object.entries(productRatings)) {
      result[productId] = {
        avgRating: Math.round((data.sum / data.count) * 10) / 10,
        count: data.count,
        reviews: data.reviews.slice(-5) // Last 5 reviews
      };
    }
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ratings' });
  }
});

// =====================
// FEEDBACK SCREENSHOTS
// =====================

// Get all active feedback screenshots (for shop page)
app.get('/api/feedback-screenshots', async (req, res) => {
  try {
    const screenshots = await FeedbackScreenshot.find({ active: true }).sort({ order: 1, createdAt: -1 });
    res.json(screenshots);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch screenshots' });
  }
});

// Get all feedback screenshots (for admin)
app.get('/api/feedback-screenshots/all', async (req, res) => {
  try {
    const screenshots = await FeedbackScreenshot.find().sort({ order: 1, createdAt: -1 });
    res.json(screenshots);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch screenshots' });
  }
});

// Add new feedback screenshot
app.post('/api/feedback-screenshots', async (req, res) => {
  try {
    const { imageUrl, caption, customerName } = req.body;
    const count = await FeedbackScreenshot.countDocuments();
    const screenshot = new FeedbackScreenshot({
      imageUrl,
      caption,
      customerName,
      order: count
    });
    await screenshot.save();
    res.json(screenshot);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add screenshot' });
  }
});

// Update feedback screenshot
app.put('/api/feedback-screenshots/:id', async (req, res) => {
  try {
    const screenshot = await FeedbackScreenshot.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(screenshot);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update screenshot' });
  }
});

// Delete feedback screenshot
app.delete('/api/feedback-screenshots/:id', async (req, res) => {
  try {
    await FeedbackScreenshot.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete screenshot' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    shop: 'Urban Gulal', 
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Serve frontend for all other routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🎨 Urban Gulal API running on http://localhost:${PORT}`);
});
