# 🎨 Urban Gulal - Decorative & Gift Items Shop

An e-commerce website for selling decorative items, pooja items, kitchen accessories, bags, and gift items.

## Features

- **Product Catalog** with categories: Pooja Items, Kitchen, Bags, Gift Items
- **Shopping Cart** with quantity management
- **Checkout** with delivery details
- **Admin Dashboard** for order management
- Mobile-first responsive design

## Tech Stack

- **Frontend**: React 18 + Vite
- **Backend**: Node.js + Express
- **Database**: JSON file storage
- **Styling**: Custom CSS

## Quick Start

### 1. Install Backend Dependencies

```bash
cd backend
npm install
```

### 2. Start Backend Server

```bash
npm start
```

Backend runs on `http://localhost:3002`

### 3. Install Frontend Dependencies (new terminal)

```bash
cd frontend
npm install
```

### 4. Start Frontend Dev Server

```bash
npm run dev
```

Frontend runs on `http://localhost:5174`

## URLs

- **Shop**: http://localhost:5174
- **Admin Dashboard**: http://localhost:5174/admin

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | Get all products |
| GET | `/api/categories` | Get categories |
| GET | `/api/orders` | Get all orders |
| POST | `/api/orders` | Create new order |
| PUT | `/api/orders/:id` | Update order status |

## Product Categories

- 🪔 **Pooja Items**: Thalis, Diya stands, Kalash, etc.
- 🍽️ **Kitchen**: Containers, Heat pads, Serving trays
- 👜 **Bags**: Pouches, Wallets, Gift bags
- 🎁 **Gift Items**: Crystal turtles, Decorative candles

## Deployment

### Deploy to Render.com

1. Push to GitHub
2. Create new Web Service on Render
3. Build Command: `npm run build`
4. Start Command: `npm start`

## License

MIT
