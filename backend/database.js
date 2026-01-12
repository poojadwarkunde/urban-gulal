const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'data.json');

// Initialize database file if it doesn't exist
if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, JSON.stringify({ orders: [], nextOrderId: 1 }, null, 2));
}

// Read all orders
function getAllOrders() {
  const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  return data.orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// Create a new order
function createOrder(order) {
  const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  const newOrder = {
    id: data.nextOrderId,
    ...order,
    createdAt: new Date().toISOString()
  };
  data.orders.push(newOrder);
  data.nextOrderId++;
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
  return newOrder;
}

// Update an order
function updateOrder(id, updates) {
  const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  const index = data.orders.findIndex(o => o.id === parseInt(id));
  if (index === -1) return null;
  
  data.orders[index] = { ...data.orders[index], ...updates };
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
  return data.orders[index];
}

module.exports = {
  getAllOrders,
  createOrder,
  updateOrder
};
