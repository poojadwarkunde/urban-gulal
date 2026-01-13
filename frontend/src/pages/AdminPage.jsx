import { useState, useEffect } from 'react'

const STATUS_OPTIONS = ['NEW', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED']
const PAYMENT_OPTIONS = ['PENDING', 'PAID', 'REFUNDED']
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'amount-high', label: 'Amount: High to Low' },
  { value: 'amount-low', label: 'Amount: Low to High' },
]

function AdminPage() {
  const [activeTab, setActiveTab] = useState('orders')
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingPrices, setEditingPrices] = useState({})
  const [savingPrices, setSavingPrices] = useState(false)
  
  // Filter & Sort state
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [paymentFilter, setPaymentFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState('newest')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  
  // Cancel modal state
  const [cancelModal, setCancelModal] = useState({ show: false, orderId: null })
  const [cancelReason, setCancelReason] = useState('')
  
  // Feedback modal state
  const [feedbackModal, setFeedbackModal] = useState({ show: false, orderId: null })
  const [feedbackText, setFeedbackText] = useState('')
  
  // Notification modal state
  const [notifyModal, setNotifyModal] = useState({ show: false, order: null })

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
      return updated
    } catch (err) {
      alert('Failed to update order')
      console.error(err)
      return null
    }
  }

  const handleCancelOrder = async () => {
    if (!cancelReason.trim()) {
      alert('Please provide a cancellation reason')
      return
    }
    const updated = await updateOrder(cancelModal.orderId, { 
      status: 'CANCELLED', 
      cancelReason: cancelReason.trim(),
      cancelledAt: new Date().toISOString()
    })
    if (updated) {
      setCancelModal({ show: false, orderId: null })
      setCancelReason('')
    }
  }

  const handleAddFeedback = async () => {
    if (!feedbackText.trim()) {
      alert('Please enter feedback')
      return
    }
    const updated = await updateOrder(feedbackModal.orderId, { 
      adminFeedback: feedbackText.trim(),
      feedbackAt: new Date().toISOString()
    })
    if (updated) {
      setFeedbackModal({ show: false, orderId: null })
      setFeedbackText('')
    }
  }

  const sendWhatsAppMessage = (order, message) => {
    const phone = order.phone.startsWith('+') ? order.phone : `+91${order.phone}`
    const encodedMessage = encodeURIComponent(message)
    window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodedMessage}`, '_blank')
  }

  const sendSMSMessage = (order, message) => {
    const phone = order.phone
    window.open(`sms:${phone}?body=${encodeURIComponent(message)}`, '_blank')
  }

  const getStatusMessage = (order) => {
    const itemsList = order.items.map(i => `${i.name} x${i.qty}`).join(', ')
    switch (order.status) {
      case 'CONFIRMED':
        return `🎨 Urban Gulal: Your order #${order.id} is confirmed!\n\nItems: ${itemsList}\nTotal: ₹${order.totalAmount}\n\nWe'll notify you when it's shipped. Thank you!`
      case 'SHIPPED':
        return `📦 Urban Gulal: Your order #${order.id} has been shipped!\n\nItems: ${itemsList}\n\nYou'll receive it soon. Thank you for shopping with us!`
      case 'DELIVERED':
        return `✅ Urban Gulal: Your order #${order.id} has been delivered!\n\nWe hope you love your items. Thank you for choosing Urban Gulal! 🎨`
      case 'CANCELLED':
        return `❌ Urban Gulal: Your order #${order.id} has been cancelled.\n\nReason: ${order.cancelReason || 'N/A'}\n\nIf you have questions, please contact us.`
      default:
        return `🎨 Urban Gulal: Update for your order #${order.id}\n\nStatus: ${order.status}\nItems: ${itemsList}\nTotal: ₹${order.totalAmount}`
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

  // Filter and sort orders
  const getFilteredOrders = () => {
    let filtered = [...orders]
    
    // Status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(o => o.status === statusFilter)
    }
    
    // Payment filter
    if (paymentFilter !== 'ALL') {
      filtered = filtered.filter(o => o.paymentStatus === paymentFilter)
    }
    
    // Date filter
    if (dateFilter) {
      filtered = filtered.filter(o => o.createdAt.startsWith(dateFilter))
    }
    
    // Search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(o => 
        o.customerName.toLowerCase().includes(query) ||
        o.phone.includes(query) ||
        o.address?.toLowerCase().includes(query) ||
        o.items.some(i => i.name.toLowerCase().includes(query))
      )
    }
    
    // Sort
    switch (sortBy) {
      case 'oldest':
        filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        break
      case 'amount-high':
        filtered.sort((a, b) => b.totalAmount - a.totalAmount)
        break
      case 'amount-low':
        filtered.sort((a, b) => a.totalAmount - b.totalAmount)
        break
      default: // newest
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    }
    
    return filtered
  }

  // Group orders by status
  const getOrdersByStatus = (status) => {
    return getFilteredOrders().filter(o => o.status === status)
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
      case 'CANCELLED': return 'status-cancelled'
      default: return ''
    }
  }

  const getStatusEmoji = (status) => {
    switch (status) {
      case 'NEW': return '🆕'
      case 'CONFIRMED': return '✅'
      case 'SHIPPED': return '📦'
      case 'DELIVERED': return '🎉'
      case 'CANCELLED': return '❌'
      default: return '📋'
    }
  }

  const productsByCategory = products.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = []
    acc[p.category].push(p)
    return acc
  }, {})

  const filteredOrders = getFilteredOrders()

  const renderOrderCard = (order) => (
    <div key={order.id} className={`order-card ${getStatusColor(order.status)}`}>
      <div className="order-header">
        <div className="order-id">#{order.id}</div>
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
      
      {order.cancelReason && (
        <div className="order-cancel-reason">❌ Cancelled: {order.cancelReason}</div>
      )}
      
      {order.adminFeedback && (
        <div className="order-feedback">💬 Feedback: {order.adminFeedback}</div>
      )}

      <div className="order-footer">
        <div className="order-amount">₹{order.totalAmount}</div>
        
        <div className="order-controls">
          {order.status !== 'CANCELLED' && (
            <>
              <select
                value={order.status}
                onChange={e => {
                  if (e.target.value === 'CANCELLED') {
                    setCancelModal({ show: true, orderId: order.id })
                  } else {
                    updateOrder(order.id, { status: e.target.value })
                  }
                }}
                className={`select-status ${getStatusColor(order.status)}`}
              >
                {STATUS_OPTIONS.filter(s => s !== 'CANCELLED').map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <button
                className={`btn-payment ${order.paymentStatus === 'PAID' ? 'paid' : 'pending'}`}
                onClick={() => updateOrder(order.id, { 
                  paymentStatus: order.paymentStatus === 'PAID' ? 'PENDING' : 'PAID' 
                })}
              >
                {order.paymentStatus === 'PAID' ? '✓ Paid' : '₹ Mark Paid'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="order-actions">
        <button 
          className="btn-action btn-notify"
          onClick={() => setNotifyModal({ show: true, order })}
          title="Send notification"
        >
          📤 Notify
        </button>
        <button 
          className="btn-action btn-feedback"
          onClick={() => {
            setFeedbackText(order.adminFeedback || '')
            setFeedbackModal({ show: true, orderId: order.id })
          }}
          title="Add feedback"
        >
          💬 Feedback
        </button>
        {order.status !== 'CANCELLED' && order.status !== 'DELIVERED' && (
          <button 
            className="btn-action btn-cancel"
            onClick={() => setCancelModal({ show: true, orderId: order.id })}
            title="Cancel order"
          >
            ❌ Cancel
          </button>
        )}
      </div>
    </div>
  )

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
          className={`tab-btn ${activeTab === 'status' ? 'active' : ''}`}
          onClick={() => setActiveTab('status')}
        >
          📊 By Status
        </button>
        <button 
          className={`tab-btn ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          🏷️ Products
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

          {/* Filters */}
          <section className="filters-section">
            <h3>🔍 Filter & Sort</h3>
            <div className="filters-grid">
              <div className="filter-group">
                <label>Search</label>
                <input
                  type="text"
                  placeholder="Name, phone, item..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="filter-input"
                />
              </div>
              <div className="filter-group">
                <label>Status</label>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="filter-select">
                  <option value="ALL">All Status</option>
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="filter-group">
                <label>Payment</label>
                <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)} className="filter-select">
                  <option value="ALL">All Payments</option>
                  {PAYMENT_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="filter-group">
                <label>Date</label>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={e => setDateFilter(e.target.value)}
                  className="filter-input"
                />
              </div>
              <div className="filter-group">
                <label>Sort By</label>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="filter-select">
                  {SORT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="filter-group">
                <label>&nbsp;</label>
                <button 
                  className="btn btn-secondary clear-filters"
                  onClick={() => {
                    setSearchQuery('')
                    setStatusFilter('ALL')
                    setPaymentFilter('ALL')
                    setDateFilter('')
                    setSortBy('newest')
                  }}
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </section>

          <section className="orders-section">
            <h2>📋 Orders ({filteredOrders.length})</h2>
            
            {filteredOrders.length === 0 ? (
              <div className="no-orders">No orders match your filters</div>
            ) : (
              <div className="orders-list">
                {filteredOrders.map(renderOrderCard)}
              </div>
            )}
          </section>
        </>
      )}

      {/* Status Tab - Orders grouped by status */}
      {activeTab === 'status' && (
        <section className="status-sections">
          {STATUS_OPTIONS.map(status => {
            const statusOrders = getOrdersByStatus(status)
            if (statusOrders.length === 0) return null
            return (
              <div key={status} className={`status-section ${getStatusColor(status)}`}>
                <h2 className="status-section-title">
                  {getStatusEmoji(status)} {status} ({statusOrders.length})
                </h2>
                <div className="orders-list">
                  {statusOrders.map(renderOrderCard)}
                </div>
              </div>
            )
          })}
        </section>
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
                        onError={(e) => { e.target.style.display = 'none' }}
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

      {/* Cancel Modal */}
      {cancelModal.show && (
        <div className="modal-overlay" onClick={() => setCancelModal({ show: false, orderId: null })}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>❌ Cancel Order</h2>
            <p>Please provide a reason for cancellation:</p>
            <textarea
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="e.g., Customer requested cancellation, Out of stock..."
              className="modal-textarea"
              rows={3}
            />
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setCancelModal({ show: false, orderId: null })}>
                Back
              </button>
              <button className="btn btn-danger" onClick={handleCancelOrder}>
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {feedbackModal.show && (
        <div className="modal-overlay" onClick={() => setFeedbackModal({ show: false, orderId: null })}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>💬 Admin Feedback</h2>
            <p>Add notes or feedback for this order:</p>
            <textarea
              value={feedbackText}
              onChange={e => setFeedbackText(e.target.value)}
              placeholder="e.g., Customer requested special packaging, Delivery attempted twice..."
              className="modal-textarea"
              rows={3}
            />
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setFeedbackModal({ show: false, orderId: null })}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleAddFeedback}>
                Save Feedback
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Modal */}
      {notifyModal.show && notifyModal.order && (
        <div className="modal-overlay" onClick={() => setNotifyModal({ show: false, order: null })}>
          <div className="modal notify-modal" onClick={e => e.stopPropagation()}>
            <h2>📤 Send Notification</h2>
            <p>Send order update to <strong>{notifyModal.order.customerName}</strong> ({notifyModal.order.phone})</p>
            
            <div className="message-preview">
              <h4>Message Preview:</h4>
              <pre>{getStatusMessage(notifyModal.order)}</pre>
            </div>
            
            <div className="notify-buttons">
              <button 
                className="btn btn-whatsapp"
                onClick={() => {
                  sendWhatsAppMessage(notifyModal.order, getStatusMessage(notifyModal.order))
                  setNotifyModal({ show: false, order: null })
                }}
              >
                📱 Send via WhatsApp
              </button>
              <button 
                className="btn btn-sms"
                onClick={() => {
                  sendSMSMessage(notifyModal.order, getStatusMessage(notifyModal.order))
                  setNotifyModal({ show: false, order: null })
                }}
              >
                💬 Send via SMS
              </button>
            </div>
            
            <button 
              className="btn btn-secondary close-notify"
              onClick={() => setNotifyModal({ show: false, order: null })}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminPage
