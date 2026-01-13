# 🎨 Urban Gulal - Decorative & Gift Items Shop

A full-stack e-commerce web application for ordering decorative items, pooja items, kitchen products, bags, and gift items.

---

## 📋 Table of Contents

- [Tech Stack](#tech-stack)
- [Features](#features)
- [Application Screens](#application-screens)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)

---

## 🛠 Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 18** | UI Library |
| **Vite** | Build tool & dev server |
| **React Router** | Client-side routing |
| **CSS3** | Styling (custom CSS variables, responsive design) |

### Backend
| Technology | Purpose |
|------------|---------|
| **Node.js 20** | Runtime environment |
| **Express.js** | Web framework |
| **MongoDB Atlas** | Cloud database |
| **Mongoose** | MongoDB ODM |
| **XLSX** | Excel file generation |
| **node-cron** | Scheduled tasks |
| **CORS** | Cross-origin resource sharing |

### Deployment
| Service | Purpose |
|---------|---------|
| **Render** | Hosting (backend + frontend) |
| **MongoDB Atlas** | Database hosting |
| **GitHub** | Version control + Excel reports storage |

---

## ✨ Features

### Customer Features
- 🛒 **Product Browsing** - Browse products by category
- 🔍 **Category Filtering** - Filter by Pooja Items, Kitchen, Bags, Gift Items
- 🛍️ **Shopping Cart** - Add/remove items, adjust quantities
- 📱 **User Registration/Login** - Mobile number based authentication
- 📝 **Order Placement** - Complete checkout with address details
- ✅ **Order Confirmation** - Instant order confirmation

### Admin Features
- 📊 **Dashboard** - Today's summary (orders, revenue, collected amount)
- 📋 **Order Management** - View all orders with filters & sorting
- 🔄 **Status Updates** - NEW → CONFIRMED → SHIPPED → DELIVERED
- 💳 **Payment Tracking** - Mark orders as PAID/PENDING/REFUNDED
- ❌ **Order Cancellation** - Cancel with reason
- 💬 **Feedback System** - Add admin feedback to orders
- 📱 **Customer Notifications** - Send WhatsApp/SMS updates (auto on status change)
- 🏷️ **Product Management** - Add/Edit/Delete products
- 💰 **Price Management** - Update prices, bulk price updates
- 📦 **Stock Management** - Mark products In Stock/Out of Stock
- 👁️ **Visibility Control** - Show/Hide products
- 📥 **Excel Export** - Daily reports & consolidated reports
- 🔄 **Auto GitHub Sync** - Auto-upload reports to GitHub on order changes

### Order Status Flow
```
NEW → CONFIRMED → SHIPPED → DELIVERED
  ↓
CANCELLED (with reason)
```

### Payment Status Flow
```
PENDING → PAID
    ↓
  REFUNDED
```

---

## 📱 Application Screens

### 1. Shop Page (`/`)
**Purpose:** Customer-facing product catalog and shopping experience

**Components:**
- Header with logo, login/register buttons, cart icon
- Category navigation tabs (All, Pooja Items, Kitchen, Bags, Gift Items)
- Product grid with cards showing:
  - Product image
  - Category badge
  - Product name
  - Price
  - Add to cart buttons (+1, Add Multiple)
  - Quantity controls (when item in cart)
- Out of Stock badge (for unavailable items)
- Cart sidebar with:
  - Item list with quantities
  - Total amount
  - Checkout button
- Checkout modal with:
  - Customer details form
  - Address fields
  - Order notes
  - Place Order button
- Order success confirmation

**Authentication Modal:**
- Login tab (mobile number)
- Register tab (name + mobile number)
- Auto-fill customer details after login

### 2. Admin Page (`/admin`)
**Purpose:** Order management, product management, analytics

**Tabs:**

#### Orders Tab
- Summary cards (Today's Orders, Total Revenue, Collected Amount)
- Export buttons (Daily Report, All Orders)
- Filter & Sort section:
  - Search (name, phone, item)
  - Status filter
  - Payment filter
  - Date filter
  - Sort options (Newest, Oldest, Amount High/Low)
- Order cards showing:
  - Order ID, Customer name, Phone
  - Address
  - Items list
  - Notes, Cancel reason, Feedback
  - Total amount
  - Status dropdown
  - Payment toggle button
  - Action buttons (Cancel, Feedback, Notify)

#### By Status Tab
- Collapsible sections:
  - 🆕 New Orders
  - 🔄 In Progress (Confirmed + Shipped)
  - 📦 Delivered - Payment Pending
  - ✅ Completed (Delivered + Paid) - Auto-collapsed
  - ❌ Cancelled

#### Products Tab
- Product grid by category
- Product cards showing:
  - Image
  - Name
  - Editable price field
  - Edit button
  - Stock toggle (In Stock / Out of Stock)
  - Visibility toggle (Show / Hide)
- Add Product button
- Save All Prices button

**Modals:**
- Cancel Order Modal (with reason input)
- Feedback Modal (with feedback text)
- Notify Modal (WhatsApp/SMS preview)
- Product Edit Modal (all product fields)
- Add Product Modal

---

## 🗄️ Database Schema

### Orders Collection
```javascript
{
  orderId: Number,          // Auto-increment ID
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
  status: String,           // NEW, CONFIRMED, SHIPPED, DELIVERED, CANCELLED
  paymentStatus: String,    // PENDING, PAID, REFUNDED
  notes: String,
  cancelReason: String,
  cancelledAt: Date,
  adminFeedback: String,
  feedbackAt: Date,
  createdAt: Date
}
```

### ProductOverrides Collection
```javascript
{
  productId: Number,
  name: String,
  description: String,
  image: String,
  category: String,
  available: Boolean,       // Show/Hide
  inStock: Boolean,         // In Stock/Out of Stock
  price: Number,
  isCustom: Boolean         // true for admin-added products
}
```

### Users Collection
```javascript
{
  userId: Number,
  name: String,
  mobile: String,           // Unique, 10 digits
  createdAt: Date
}
```

### Counters Collection
```javascript
{
  name: String,             // 'orderId', 'userId', 'productId'
  value: Number
}
```

---

## 🔌 API Endpoints

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | Get all products |
| GET | `/api/products?includeHidden=true` | Get all products (admin) |
| GET | `/api/products?category=Kitchen` | Filter by category |
| PUT | `/api/products/:id` | Update product |
| POST | `/api/products` | Add new product |
| PUT | `/api/products/prices/bulk` | Bulk update prices |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orders` | Get all orders |
| POST | `/api/orders` | Create new order |
| PUT | `/api/orders/:id` | Update order status/payment |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/users/register` | Register new user |
| POST | `/api/users/login` | Login user |
| GET | `/api/users` | Get all users (admin) |

### Export
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/export/daily` | Download daily Excel report |
| GET | `/api/export/daily?date=2026-01-13` | Download specific date report |
| GET | `/api/export/consolidated` | Download all orders report |
| GET | `/api/export/list` | List all exported files |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check + DB status |
| GET | `/api/categories` | Get all categories |

---

## 🔐 Environment Variables

### Required for Render
```env
MONGODB_URI=mongodb+srv://urbangulal:password@cluster0.xxx.mongodb.net/urbangulal?retryWrites=true&w=majority
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
```

### Optional (defaults provided)
```env
PORT=3002
```

---

## 🚀 Deployment

### Render Configuration
- **Build Command:** 
  ```
  npm config set registry https://registry.npmjs.org/ && cd frontend && npm install && npm run build && mkdir -p ../backend/public && cp -r dist/* ../backend/public/ && cd ../backend && npm install
  ```
- **Start Command:** `node server.js`
- **Root Directory:** (leave empty)

### Auto-Generated Reports
Reports are automatically generated and uploaded to GitHub:
- On new order creation
- On order status update
- On payment status update
- Daily at 11:59 PM

**Report Files:**
- `reports/UrbanGulal_Daily_YYYY-MM-DD.xlsx`
- `reports/UrbanGulal_Consolidated_YYYY-MM-DD.xlsx`

---

## 📁 Project Structure

```
urban-gulal/
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── ShopPage.jsx      # Customer shopping page
│   │   │   └── AdminPage.jsx     # Admin dashboard
│   │   ├── App.jsx               # Router setup
│   │   ├── main.jsx              # Entry point
│   │   └── index.css             # Global styles
│   ├── public/
│   │   └── images/               # Product images
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── backend/
│   ├── server.js                 # Express server + all APIs
│   ├── products.js               # Base product catalog
│   ├── exports/                  # Generated Excel files
│   └── package.json
├── reports/                      # Auto-synced Excel reports
├── package.json                  # Root build scripts
├── render.yaml                   # Render deployment config
└── README.md
```

---

## 👥 User Roles

| Role | Access |
|------|--------|
| **Customer** | Shop page, place orders, view cart |
| **Admin** | `/admin` - Full order & product management |

---

## 📞 Support

For issues or feature requests, contact the development team.

---

**Built with ❤️ for Urban Gulal**
