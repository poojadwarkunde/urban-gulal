import { useState, useEffect } from 'react'

const STATUS_OPTIONS = ['NEW', 'CONFIRMED', 'SHIPPED', 'DELIVERED']
const PAYMENT_OPTIONS = ['PENDING', 'PAID']

function AdminPage() {
  const [activeTab, setActiveTab] = useState('orders')
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingPrices, setEditingPrices] = useState({})
  const [savingPrices, setSavingPrices] = useState(false)

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders')
      if (!response.ok) throw new Error('Failed to fetch orders')
      const data = await response.json()
      setOrders(data)
      setError(null)
    } catch (err) {
      setError('Failed to load orders')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products')
      if (!response.ok) throw new Error('Failed to fetch products')
      const data = await response.json()
      setProducts(data)
      // Initialize editing prices
      const prices = {}
      data.forEach(p => { prices[p.id] = p.price })
      setEditingPrices(prices)
    } catch (err) {
      console.error('Failed to load products:', err)
    }
  }

  useEffect(() => {
    fetchOrders()
    fetchProducts()
    const interval = setInterval(fetchOrders, 30000)
    return () => clearInterval(interval)
  }, [])

  const updateOrder = async (id, updates) => {
    try {
      const response = await fetch(`/api/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      if (!response.ok) throw new Error('Failed to update order')
      const updated = await response.json()
      setOrders(prev => prev.map(o => o.id === id ? updated : o))
    } catch (err) {
      alert('Failed to update order')
      console.error(err)
    }
  }

  const updatePrice = async (productId, price) => {
    try {
      const response = await fetch(`/api/products/${productId}/price`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: parseInt(price) })
      })
      if (!response.ok) throw new Error('Failed to update price')
      // Update local state
      setProducts(prev => prev.map(p => 
        p.id === productId ? { ...p, price: parseInt(price) } : p
      ))
    } catch (err) {
      alert('Failed to update price')
      console.error(err)
    }
  }

  const saveAllPrices = async () => {
    setSavingPrices(true)
    try {
      const response = await fetch('/api/products/prices/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prices: editingPrices })
      })
      if (!response.ok) throw new Error('Failed to save prices')
      await fetchProducts()
      alert('All prices saved successfully!')
    } catch (err) {
      alert('Failed to save prices')
      console.error(err)
    } finally {
      setSavingPrices(false)
    }
  }

  const handlePriceChange = (productId, value) => {
    setEditingPrices(prev => ({
      ...prev,
      [productId]: value === '' ? 0 : parseInt(value) || 0
    }))
  }

  const today = new Date().toISOString().split('T')[0]
  const todayOrders = orders.filter(o => o.createdAt.startsWith(today))
  const todayRevenue = todayOrders.reduce((sum, o) => sum + o.totalAmount, 0)
  const paidAmount = todayOrders.filter(o => o.paymentStatus === 'PAID').reduce((sum, o) => sum + o.totalAmount, 0)

  const formatDateTime = (isoString) => {
    const date = new Date(isoString)
    const today = new Date()
    const isToday = date.toDateString() === today.toDateString()
    const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
    if (isToday) return `Today, ${timeStr}`
    return `${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${timeStr}`
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'NEW': return 'status-new'
      case 'CONFIRMED': return 'status-confirmed'
      case 'SHIPPED': return 'status-shipped'
      case 'DELIVERED': return 'status-delivered'
      default: return ''
    }
  }

  // Group products by category
  const productsByCategory = products.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = []
    acc[p.category].push(p)
    return acc
  }, {})

  if (loading) {
    return <div className="admin-container"><div className="loading">Loading...</div></div>
  }

  return (
    <div className="admin-container">
      <header className="admin-header">
        <div>
          <h1>🎨 Urban Gulal Admin</h1>
          <p>Manage Orders & Products</p>
        </div>
        <button className="btn btn-secondary" onClick={() => { fetchOrders(); fetchProducts(); }}>↻ Refresh</button>
      </header>

      {/* Tabs */}
      <div className="admin-tabs">
        <button 
          className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          📋 Orders ({orders.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          🏷️ Products & Prices
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <>
          <section className="summary-section">
            <h2>📊 Today's Summary</h2>
            <div className="summary-grid">
              <div className="summary-card">
                <div className="summary-value">{todayOrders.length}</div>
                <div className="summary-label">Orders</div>
              </div>
              <div className="summary-card">
                <div className="summary-value">₹{todayRevenue}</div>
                <div className="summary-label">Total</div>
              </div>
              <div className="summary-card">
                <div className="summary-value">₹{paidAmount}</div>
                <div className="summary-label">Collected</div>
              </div>
            </div>
          </section>

          <section className="orders-section">
            <h2>📋 All Orders ({orders.length})</h2>
            
            {orders.length === 0 ? (
              <div className="no-orders">No orders yet!</div>
            ) : (
              <div className="orders-list">
                {orders.map(order => (
                  <div key={order.id} className={`order-card ${getStatusColor(order.status)}`}>
                    <div className="order-header">
                      <div className="order-customer">
                        <strong>{order.customerName}</strong>
                        <span className="order-phone">📱 {order.phone}</span>
                      </div>
                      <div className="order-time">{formatDateTime(order.createdAt)}</div>
                    </div>

                    <div className="order-address">
                      📍 {order.address}{order.city && `, ${order.city}`}{order.pincode && ` - ${order.pincode}`}
                    </div>

                    <div className="order-items">
                      {order.items.map((item, idx) => (
                        <span key={idx} className="order-item-tag">
                          {item.name} × {item.qty}
                        </span>
                      ))}
                    </div>

                    {order.notes && <div className="order-notes">📝 {order.notes}</div>}

                    <div className="order-footer">
                      <div className="order-amount">₹{order.totalAmount}</div>
                      
                      <div className="order-controls">
                        <select
                          value={order.status}
                          onChange={e => updateOrder(order.id, { status: e.target.value })}
                          className={`select-status ${getStatusColor(order.status)}`}
                        >
                          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>

                        <button
                          className={`btn-payment ${order.paymentStatus === 'PAID' ? 'paid' : 'pending'}`}
                          onClick={() => updateOrder(order.id, { 
                            paymentStatus: order.paymentStatus === 'PAID' ? 'PENDING' : 'PAID' 
                          })}
                        >
                          {order.paymentStatus === 'PAID' ? '✓ Paid' : '₹ Mark Paid'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* Products Tab */}
      {activeTab === 'products' && (
        <section className="products-section">
          <div className="products-header">
            <h2>🏷️ Product Prices ({products.length} items)</h2>
            <button 
              className="btn btn-primary save-all-btn"
              onClick={saveAllPrices}
              disabled={savingPrices}
            >
              {savingPrices ? 'Saving...' : '💾 Save All Prices'}
            </button>
          </div>

          {Object.entries(productsByCategory).map(([category, categoryProducts]) => (
            <div key={category} className="category-section">
              <h3 className="category-title">{category} ({categoryProducts.length})</h3>
              <div className="price-grid">
                {categoryProducts.map(product => (
                  <div key={product.id} className="price-card">
                    <div className="price-card-image">
                      <img 
                        src={product.image} 
                        alt={product.name}
                        onError={(e) => {
                          e.target.style.display = 'none'
                        }}
                      />
                    </div>
                    <div className="price-card-info">
                      <span className="price-card-name">{product.name}</span>
                      <div className="price-input-group">
                        <span className="rupee-symbol">₹</span>
                        <input
                          type="number"
                          min="0"
                          value={editingPrices[product.id] || 0}
                          onChange={(e) => handlePriceChange(product.id, e.target.value)}
                          className="price-input"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}

export default AdminPage
