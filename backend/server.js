const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const XLSX = require('xlsx');
const cron = require('node-cron');
const https = require('https');
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const { PRODUCTS, CATEGORIES } = require('./products');

const app = express();
const PORT = process.env.PORT || 3002;

// =====================
// WHATSAPP WEB CLIENT
// =====================
let whatsappClient = null;
let whatsappQR = null;
let whatsappStatus = 'disconnected'; // disconnected, qr_ready, connecting, connected

// Initialize WhatsApp client
function initWhatsApp() {
  console.log('📱 Initializing WhatsApp client...');
  
  whatsappClient = new Client({
    authStrategy: new LocalAuth({
      dataPath: path.join(__dirname, '.wwebjs_auth')
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    }
  });

  whatsappClient.on('qr', async (qr) => {
    console.log('📱 WhatsApp QR Code received. Scan to authenticate.');
    whatsappStatus = 'qr_ready';
    try {
      whatsappQR = await QRCode.toDataURL(qr);
    } catch (err) {
      console.error('Error generating QR code:', err);
    }
  });

  whatsappClient.on('ready', () => {
    console.log('✅ WhatsApp client is ready!');
    whatsappStatus = 'connected';
    whatsappQR = null;
  });

  whatsappClient.on('authenticated', () => {
    console.log('✅ WhatsApp authenticated');
    whatsappStatus = 'connecting';
  });

  whatsappClient.on('auth_failure', (msg) => {
    console.error('❌ WhatsApp auth failure:', msg);
    whatsappStatus = 'disconnected';
  });

  whatsappClient.on('disconnected', (reason) => {
    console.log('📱 WhatsApp disconnected:', reason);
    whatsappStatus = 'disconnected';
    whatsappQR = null;
    // Auto reconnect after 5 seconds
    setTimeout(() => {
      console.log('📱 Attempting to reconnect WhatsApp...');
      initWhatsApp();
    }, 5000);
  });

  whatsappClient.initialize();
}

// Format phone number for WhatsApp
function formatPhoneForWhatsApp(phone) {
  if (!phone) return null;
  let cleaned = phone.toString().replace(/\D/g, '');
  if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    // Already formatted correctly
  } else if (cleaned.length > 10 && !cleaned.startsWith('91')) {
    // Might be international, keep as is
  } else {
    return null;
  }
  return cleaned;
}

// Send WhatsApp message
async function sendWhatsAppMessage(phone, message) {
  if (!whatsappClient || whatsappStatus !== 'connected') {
    console.log('⚠️ WhatsApp not connected. Message not sent.');
    return { success: false, error: 'WhatsApp not connected' };
  }

  const formattedPhone = formatPhoneForWhatsApp(phone);
  if (!formattedPhone) {
    console.log('⚠️ Invalid phone number:', phone);
    return { success: false, error: 'Invalid phone number' };
  }

  try {
    const chatId = formattedPhone + '@c.us';
    await whatsappClient.sendMessage(chatId, message);
    console.log(`✅ WhatsApp message sent to ${formattedPhone}`);
    return { success: true };
  } catch (error) {
    console.error('❌ WhatsApp send error:', error);
    return { success: false, error: error.message };
  }
}

// Generate admin notification message for new order
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

// Initialize WhatsApp on startup
initWhatsApp();

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://urbangulal:UrbanGulal2026%21@cluster0.ucxzf4e.mongodb.net/urbangulal?retryWrites=true&w=majority';

// GitHub Configuration for auto-push Excel reports
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const GITHUB_REPO = 'poojadwarkunde/urban-gulal';
const GITHUB_BRANCH = 'main';

// Admin Phone Number for order notifications (set via env variable or hardcode)
const ADMIN_PHONE = process.env.ADMIN_PHONE || '9999999999'; // Replace with your WhatsApp number

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
    
    // Auto-send WhatsApp notification to customer for new order
    if (phone) {
      const message = getStatusMessage(order, 'NEW');
      sendWhatsAppMessage(phone, message).catch(err => console.error('WhatsApp send error (customer):', err));
    }
    
    // Auto-send WhatsApp notification to admin for new order
    if (ADMIN_PHONE) {
      const adminMessage = getAdminNewOrderMessage(order);
      sendWhatsAppMessage(ADMIN_PHONE, adminMessage).catch(err => console.error('WhatsApp send error (admin):', err));
    }
    
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

    // Auto-send WhatsApp notification if status changed
    if (status && status !== oldStatus && order.phone) {
      const message = getStatusMessage(order, status);
      sendWhatsAppMessage(order.phone, message).catch(err => console.error('WhatsApp send error:', err));
    }

    // Auto-generate and upload reports to GitHub on status/payment update
    generateAndUploadReports().catch(err => console.error('Report generation error:', err));

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

// =====================
// WHATSAPP ENDPOINTS
// =====================

// Get WhatsApp status
app.get('/api/whatsapp/status', (req, res) => {
  res.json({
    status: whatsappStatus,
    connected: whatsappStatus === 'connected',
    qrAvailable: whatsappStatus === 'qr_ready' && whatsappQR !== null
  });
});

// Get QR code for WhatsApp authentication
app.get('/api/whatsapp/qr', (req, res) => {
  if (whatsappStatus === 'connected') {
    return res.json({ 
      success: false, 
      message: 'WhatsApp already connected',
      status: 'connected'
    });
  }
  if (whatsappQR) {
    return res.json({ 
      success: true, 
      qr: whatsappQR,
      status: whatsappStatus
    });
  }
  res.json({ 
    success: false, 
    message: 'QR code not available yet. Please wait...',
    status: whatsappStatus
  });
});

// Restart WhatsApp client (if needed)
app.post('/api/whatsapp/restart', (req, res) => {
  console.log('📱 Restarting WhatsApp client...');
  if (whatsappClient) {
    whatsappClient.destroy().then(() => {
      whatsappStatus = 'disconnected';
      whatsappQR = null;
      setTimeout(() => {
        initWhatsApp();
      }, 2000);
      res.json({ success: true, message: 'WhatsApp client restarting...' });
    }).catch(err => {
      console.error('Error destroying client:', err);
      res.json({ success: false, error: err.message });
    });
  } else {
    initWhatsApp();
    res.json({ success: true, message: 'WhatsApp client starting...' });
  }
});

// Logout WhatsApp (to reset and get new QR)
app.post('/api/whatsapp/logout', async (req, res) => {
  try {
    if (whatsappClient) {
      await whatsappClient.logout();
      console.log('📱 WhatsApp logged out');
    }
    // Delete auth data
    const authPath = path.join(__dirname, '.wwebjs_auth');
    if (fs.existsSync(authPath)) {
      fs.rmSync(authPath, { recursive: true, force: true });
    }
    whatsappStatus = 'disconnected';
    whatsappQR = null;
    setTimeout(() => {
      initWhatsApp();
    }, 2000);
    res.json({ success: true, message: 'Logged out. Scan new QR code to reconnect.' });
  } catch (error) {
    console.error('Logout error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Manual send message endpoint
app.post('/api/whatsapp/send', async (req, res) => {
  const { phone, message } = req.body;
  if (!phone || !message) {
    return res.status(400).json({ error: 'Phone and message required' });
  }
  const result = await sendWhatsAppMessage(phone, message);
  res.json(result);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    shop: 'Urban Gulal', 
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    whatsapp: whatsappStatus
  });
});

// Serve frontend for all other routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🎨 Urban Gulal API running on http://localhost:${PORT}`);
});
