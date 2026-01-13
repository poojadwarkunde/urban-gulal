const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const db = require('./database');
const { PRODUCTS, CATEGORIES } = require('./products');

const app = express();
const PORT = process.env.PORT || 3002;

// Storage files
const PRICES_FILE = path.join(__dirname, 'prices.json');
const USERS_FILE = path.join(__dirname, 'users.json');
const PRODUCT_OVERRIDES_FILE = path.join(__dirname, 'product_overrides.json');

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

// Product overrides storage (for name, description, image, availability)
function loadProductOverrides() {
  try {
    if (fs.existsSync(PRODUCT_OVERRIDES_FILE)) {
      const data = fs.readFileSync(PRODUCT_OVERRIDES_FILE, 'utf8');
      return JSON.parse(data).products || {};
    }
  } catch (err) {
    console.error('Error loading product overrides:', err);
  }
  return {};
}

function saveProductOverrides(products) {
  fs.writeFileSync(PRODUCT_OVERRIDES_FILE, JSON.stringify({ products }, null, 2));
}

// Users storage
function loadUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading users:', err);
  }
  return { users: [], nextUserId: 1 };
}

function saveUsers(data) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));
}

// Initialize users file if it doesn't exist
if (!fs.existsSync(USERS_FILE)) {
  saveUsers({ users: [], nextUserId: 1 });
  console.log('Created users.json file');
}

app.use(cors());
app.use(express.json());

// Serve static frontend files in production
app.use(express.static(path.join(__dirname, 'public')));

// GET all products (with dynamic prices and overrides)
app.get('/api/products', (req, res) => {
  const { category, includeHidden } = req.query;
  const prices = loadPrices();
  const overrides = loadProductOverrides();
  
  let products = PRODUCTS.map(p => {
    const override = overrides[p.id] || {};
    return {
      ...p,
      name: override.name || p.name,
      description: override.description || p.description,
      image: override.image || p.image,
      category: override.category || p.category,
      available: override.available !== undefined ? override.available : true,
      inStock: override.inStock !== undefined ? override.inStock : true,
      price: prices[p.id] !== undefined ? prices[p.id] : p.price
    };
  });
  
  // Filter out unavailable products unless admin requests them
  if (includeHidden !== 'true') {
    products = products.filter(p => p.available !== false);
  }
  
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

// PUT update product details (Admin only)
app.put('/api/products/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, image, category, available, inStock, price } = req.body;
    
    const product = PRODUCTS.find(p => p.id === parseInt(id));
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Update price if provided
    if (price !== undefined) {
      const prices = loadPrices();
      prices[id] = parseInt(price);
      savePrices(prices);
    }
    
    // Update other fields via overrides
    const overrides = loadProductOverrides();
    if (!overrides[id]) overrides[id] = {};
    
    if (name !== undefined) overrides[id].name = name;
    if (description !== undefined) overrides[id].description = description;
    if (image !== undefined) overrides[id].image = image;
    if (category !== undefined) overrides[id].category = category;
    if (available !== undefined) overrides[id].available = available;
    if (inStock !== undefined) overrides[id].inStock = inStock;
    
    saveProductOverrides(overrides);
    
    // Return updated product
    const prices = loadPrices();
    const updatedProduct = {
      ...product,
      name: overrides[id].name || product.name,
      description: overrides[id].description || product.description,
      image: overrides[id].image || product.image,
      category: overrides[id].category || product.category,
      available: overrides[id].available !== undefined ? overrides[id].available : true,
      inStock: overrides[id].inStock !== undefined ? overrides[id].inStock : true,
      price: prices[id] !== undefined ? prices[id] : product.price
    };
    
    res.json(updatedProduct);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// POST add new product (Admin only)
app.post('/api/products', (req, res) => {
  try {
    const { name, description, image, category, price } = req.body;
    
    if (!name || !category) {
      return res.status(400).json({ error: 'Name and category are required' });
    }
    
    // Get next available ID
    const maxId = Math.max(...PRODUCTS.map(p => p.id), 0);
    const newId = maxId + 1;
    
    // Store in overrides as a new product
    const overrides = loadProductOverrides();
    overrides[newId] = {
      id: newId,
      name,
      description: description || '',
      image: image || '/placeholder.png',
      category,
      available: true,
      isCustom: true // Mark as custom added product
    };
    saveProductOverrides(overrides);
    
    // Store price
    if (price !== undefined) {
      const prices = loadPrices();
      prices[newId] = parseInt(price) || 0;
      savePrices(prices);
    }
    
    res.status(201).json({
      id: newId,
      name,
      description: description || '',
      image: image || '/placeholder.png',
      category,
      available: true,
      price: price || 0
    });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ error: 'Failed to add product' });
  }
});

// GET custom products (ones added via admin)
app.get('/api/products/custom', (req, res) => {
  try {
    const overrides = loadProductOverrides();
    const prices = loadPrices();
    
    const customProducts = Object.entries(overrides)
      .filter(([id, product]) => product.isCustom)
      .map(([id, product]) => ({
        ...product,
        id: parseInt(id),
        price: prices[id] || 0
      }));
    
    res.json(customProducts);
  } catch (error) {
    console.error('Error fetching custom products:', error);
    res.status(500).json({ error: 'Failed to fetch custom products' });
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
    const { status, paymentStatus, cancelReason, cancelledAt, adminFeedback, feedbackAt } = req.body;
    
    const updates = {};
    if (status) updates.status = status;
    if (paymentStatus) updates.paymentStatus = paymentStatus;
    if (cancelReason !== undefined) updates.cancelReason = cancelReason;
    if (cancelledAt) updates.cancelledAt = cancelledAt;
    if (adminFeedback !== undefined) updates.adminFeedback = adminFeedback;
    if (feedbackAt) updates.feedbackAt = feedbackAt;
    
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

// =====================
// USER ENDPOINTS
// =====================

// Register new user
app.post('/api/users/register', (req, res) => {
  try {
    const { name, mobile } = req.body;
    
    if (!name || !mobile) {
      return res.status(400).json({ error: 'Name and mobile are required' });
    }
    
    // Validate mobile (10 digits)
    if (!/^\d{10}$/.test(mobile)) {
      return res.status(400).json({ error: 'Mobile must be 10 digits' });
    }
    
    const userData = loadUsers();
    
    // Check if mobile already exists
    const existingUser = userData.users.find(u => u.mobile === mobile);
    if (existingUser) {
      return res.status(400).json({ error: 'Mobile number already registered. Please login.' });
    }
    
    const newUser = {
      id: userData.nextUserId,
      name: name.trim(),
      mobile,
      createdAt: new Date().toISOString()
    };
    
    userData.users.push(newUser);
    userData.nextUserId++;
    saveUsers(userData);
    
    res.status(201).json({ success: true, user: newUser });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Login user (by mobile)
app.post('/api/users/login', (req, res) => {
  try {
    const { mobile } = req.body;
    
    if (!mobile) {
      return res.status(400).json({ error: 'Mobile number is required' });
    }
    
    const userData = loadUsers();
    const user = userData.users.find(u => u.mobile === mobile);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found. Please register first.' });
    }
    
    res.json({ success: true, user });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Get user by mobile
app.get('/api/users/:mobile', (req, res) => {
  try {
    const { mobile } = req.params;
    const userData = loadUsers();
    const user = userData.users.find(u => u.mobile === mobile);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Get all users (Admin only)
app.get('/api/users', (req, res) => {
  try {
    const userData = loadUsers();
    res.json(userData.users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
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
