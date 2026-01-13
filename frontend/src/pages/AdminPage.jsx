import { useState, useEffect } from 'react'

const STATUS_OPTIONS = ['NEW', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED']
const PAYMENT_OPTIONS = ['PENDING', 'PAID', 'REFUNDED']
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'amount-high', label: 'Amount: High to Low' },
  { value: 'amount-low', label: 'Amount: Low to High' },
]
const CATEGORY_OPTIONS = ['Pooja Items', 'Kitchen', 'Bags', 'Gift Items']

function AdminPage() {
  const [activeTab, setActiveTab] = useState('orders')
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
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
  
  // Product edit modal state
  const [productModal, setProductModal] = useState({ show: false, product: null, isNew: false })
  const [productForm, setProductForm] = useState({
    name: '', description: '', image: '', category: '', price: 0, available: true
  })
  const [savingProduct, setSavingProduct] = useState(false)
  
  // Product filter
  const [productCategoryFilter, setProductCategoryFilter] = useState('All')
  const [productSearch, setProductSearch] = useState('')
  const [showUnavailable, setShowUnavailable] = useState(true)
  
  // Section collapse state
  const [collapsedSections, setCollapsedSections] = useState({
    completed: true // Auto-collapse completed orders
  })

  const toggleSection = (section) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

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
      const response = await fetch('/api/products?includeHidden=true')
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

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (err) {
      console.error('Failed to load categories:', err)
    }
  }

  useEffect(() => {
    fetchOrders()
    fetchProducts()
    fetchCategories()
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

  // Product management functions
  const openProductEdit = (product) => {
    setProductForm({
      name: product.name,
      description: product.description || '',
      image: product.image || '',
      category: product.category,
      price: product.price || 0,
      available: product.available !== false
    })
    setProductModal({ show: true, product, isNew: false })
  }

  const openAddProduct = () => {
    setProductForm({
      name: '',
      description: '',
      image: '',
      category: CATEGORY_OPTIONS[0],
      price: 0,
      available: true
    })
    setProductModal({ show: true, product: null, isNew: true })
  }

  const handleSaveProduct = async () => {
    if (!productForm.name.trim()) {
      alert('Product name is required')
      return
    }
    
    setSavingProduct(true)
    try {
      if (productModal.isNew) {
        // Add new product
        const response = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productForm)
        })
        if (!response.ok) throw new Error('Failed to add product')
        alert('Product added successfully!')
      } else {
        // Update existing product
        const response = await fetch(`/api/products/${productModal.product.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productForm)
        })
        if (!response.ok) throw new Error('Failed to update product')
        alert('Product updated successfully!')
      }
      
      await fetchProducts()
      setProductModal({ show: false, product: null, isNew: false })
    } catch (err) {
      alert('Failed to save product: ' + err.message)
      console.error(err)
    } finally {
      setSavingProduct(false)
    }
  }

  const toggleProductAvailability = async (product) => {
    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ available: !product.available })
      })
      if (!response.ok) throw new Error('Failed to update')
      await fetchProducts()
    } catch (err) {
      alert('Failed to toggle availability')
      console.error(err)
    }
  }

  const toggleProductStock = async (product) => {
    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inStock: !product.inStock })
      })
      if (!response.ok) throw new Error('Failed to update')
      await fetchProducts()
    } catch (err) {
      alert('Failed to toggle stock status')
      console.error(err)
    }
  }

  // Format phone for WhatsApp - accepts 10 digit Indian numbers
  const formatPhoneForWhatsApp = (phone) => {
    if (!phone) return null
    // Remove all non-digit characters
    let cleaned = phone.toString().replace(/\D/g, '')
    // Remove leading 0 if present
    if (cleaned.startsWith('0')) cleaned = cleaned.substring(1)
    // Remove +91 or 91 prefix if already present
    if (cleaned.startsWith('91') && cleaned.length > 10) {
      cleaned = cleaned.substring(2)
    }
    // If we have 10 digits, add 91 prefix
    if (cleaned.length === 10) {
      return '91' + cleaned
    }
    // If already 12 digits with 91, return as is
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return cleaned
    }
    // For any valid-looking number, just add 91 if needed
    if (cleaned.length >= 10) {
      return cleaned.length === 10 ? '91' + cleaned : cleaned
    }
    return null
  }

  const sendWhatsAppMessage = (order, message) => {
    const phone = formatPhoneForWhatsApp(order.phone)
    if (!phone) {
      console.log('Phone validation failed for:', order.phone)
      return false
    }
    const encodedMessage = encodeURIComponent(message)
    window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank')
    return true
  }

  const sendSMSMessage = (order, message) => {
    const phone = order.phone
    window.open(`sms:${phone}?body=${encodeURIComponent(message)}`, '_blank')
  }

  // Auto-send notification when status changes
  const sendStatusNotification = (order, newStatus) => {
    const updatedOrder = { ...order, status: newStatus }
    const message = getStatusMessage(updatedOrder)
    sendWhatsAppMessage(updatedOrder, message)
  }

  const getStatusMessage = (order) => {
    const itemsList = order.items.map(i => `${i.name} x${i.qty}`).join('\n• ')
    const address = `${order.address}${order.city ? ', ' + order.city : ''}${order.pincode ? ' - ' + order.pincode : ''}`
    switch (order.status) {
      case 'NEW':
        return `🎨 *Urban Gulal - Order Received!*\n\n📋 Order #${order.id || order.orderId}\n👤 ${order.customerName}\n📍 ${address}\n\n🛍️ *Items:*\n• ${itemsList}\n\n💰 *Total: ₹${order.totalAmount}*\n\n✅ We've received your order and will process it soon!\n\nThank you for shopping with Urban Gulal! 🙏`
      case 'CONFIRMED':
        return `🎨 *Urban Gulal - Order Confirmed!*\n\n📋 Order #${order.id || order.orderId}\n\n🛍️ *Items:*\n• ${itemsList}\n\n💰 *Total: ₹${order.totalAmount}*\n\n✅ Your order is confirmed and being prepared!\n\nWe'll notify you when it's shipped. Thank you! 🙏`
      case 'SHIPPED':
        return `📦 *Urban Gulal - Order Shipped!*\n\n📋 Order #${order.id || order.orderId}\n\n🛍️ *Items:*\n• ${itemsList}\n\n🚚 Your order is on the way!\n\nYou'll receive it soon. Thank you for shopping with us! 🙏`
      case 'DELIVERED':
        return `✅ *Urban Gulal - Order Delivered!*\n\n📋 Order #${order.id || order.orderId}\n\n🎉 Your order has been delivered!\n\nWe hope you love your items. Thank you for choosing Urban Gulal! 🎨🙏`
      case 'CANCELLED':
        return `❌ *Urban Gulal - Order Cancelled*\n\n📋 Order #${order.id || order.orderId}\n\n⚠️ Reason: ${order.cancelReason || 'N/A'}\n\nIf you have questions, please contact us.`
      default:
        return `🎨 *Urban Gulal - Order Update*\n\n📋 Order #${order.id || order.orderId}\n📊 Status: ${order.status}\n\n🛍️ *Items:*\n• ${itemsList}\n\n💰 *Total: ₹${order.totalAmount}*`
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
    
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(o => o.status === statusFilter)
    }
    if (paymentFilter !== 'ALL') {
      filtered = filtered.filter(o => o.paymentStatus === paymentFilter)
    }
    if (dateFilter) {
      filtered = filtered.filter(o => o.createdAt.startsWith(dateFilter))
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(o => 
        o.customerName.toLowerCase().includes(query) ||
        o.phone.includes(query) ||
        o.address?.toLowerCase().includes(query) ||
        o.items.some(i => i.name.toLowerCase().includes(query))
      )
    }
    
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
      default:
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    }
    
    return filtered
  }

  const getOrdersByStatus = (status) => {
    return getFilteredOrders().filter(o => o.status === status)
  }

  // Filter products
  const getFilteredProducts = () => {
    let filtered = [...products]
    
    if (!showUnavailable) {
      filtered = filtered.filter(p => p.available !== false)
    }
    if (productCategoryFilter !== 'All') {
      filtered = filtered.filter(p => p.category === productCategoryFilter)
    }
    if (productSearch.trim()) {
      const query = productSearch.toLowerCase()
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      )
    }
    
    return filtered
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

  const productsByCategory = getFilteredProducts().reduce((acc, p) => {
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
                onChange={async e => {
                  const newStatus = e.target.value
                  if (newStatus === 'CANCELLED') {
                    setCancelModal({ show: true, orderId: order.id })
                  } else {
                    const updated = await updateOrder(order.id, { status: newStatus })
                    if (updated) {
                      // Auto-send WhatsApp notification
                      sendStatusNotification(updated, newStatus)
                    }
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
          🏷️ Products ({products.length})
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <>
          <section className="summary-section">
            <div className="summary-header">
              <h2>📊 Today's Summary</h2>
              <div className="export-buttons">
                <a href="/api/export/daily" className="btn btn-export" download>
                  📥 Daily Report
                </a>
                <a href="/api/export/consolidated" className="btn btn-export" download>
                  📊 All Orders
                </a>
              </div>
            </div>
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

      {/* Status Tab - Organized Sections */}
      {activeTab === 'status' && (
        <section className="status-sections">
          {/* New Orders */}
          {(() => {
            const newOrders = orders.filter(o => o.status === 'NEW').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            return newOrders.length > 0 && (
              <div className="status-section status-new">
                <div className="section-header" onClick={() => toggleSection('new')}>
                  <h2 className="status-section-title">
                    🆕 New Orders ({newOrders.length})
                  </h2>
                  <span className="collapse-icon">{collapsedSections.new ? '▶' : '▼'}</span>
                </div>
                {!collapsedSections.new && (
                  <div className="orders-list">
                    {newOrders.map(renderOrderCard)}
                  </div>
                )}
              </div>
            )
          })()}

          {/* In Progress (Confirmed + Shipped) */}
          {(() => {
            const inProgressOrders = orders.filter(o => o.status === 'CONFIRMED' || o.status === 'SHIPPED').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            return inProgressOrders.length > 0 && (
              <div className="status-section status-confirmed">
                <div className="section-header" onClick={() => toggleSection('inProgress')}>
                  <h2 className="status-section-title">
                    🔄 In Progress ({inProgressOrders.length})
                  </h2>
                  <span className="collapse-icon">{collapsedSections.inProgress ? '▶' : '▼'}</span>
                </div>
                {!collapsedSections.inProgress && (
                  <div className="orders-list">
                    {inProgressOrders.map(renderOrderCard)}
                  </div>
                )}
              </div>
            )
          })()}

          {/* Delivered (Pending Payment) */}
          {(() => {
            const deliveredPending = orders.filter(o => o.status === 'DELIVERED' && o.paymentStatus !== 'PAID').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            return deliveredPending.length > 0 && (
              <div className="status-section status-delivered">
                <div className="section-header" onClick={() => toggleSection('delivered')}>
                  <h2 className="status-section-title">
                    📦 Delivered - Payment Pending ({deliveredPending.length})
                  </h2>
                  <span className="collapse-icon">{collapsedSections.delivered ? '▶' : '▼'}</span>
                </div>
                {!collapsedSections.delivered && (
                  <div className="orders-list">
                    {deliveredPending.map(renderOrderCard)}
                  </div>
                )}
              </div>
            )
          })()}

          {/* Completed (Delivered + Paid) */}
          {(() => {
            const completedOrders = orders.filter(o => o.status === 'DELIVERED' && o.paymentStatus === 'PAID').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            return completedOrders.length > 0 && (
              <div className="status-section status-completed">
                <div className="section-header clickable" onClick={() => toggleSection('completed')}>
                  <h2 className="status-section-title">
                    ✅ Completed ({completedOrders.length})
                  </h2>
                  <span className="collapse-icon">{collapsedSections.completed ? '▶' : '▼'}</span>
                </div>
                {!collapsedSections.completed && (
                  <div className="orders-list">
                    {completedOrders.map(renderOrderCard)}
                  </div>
                )}
                {collapsedSections.completed && (
                  <p className="collapsed-hint">Click to view {completedOrders.length} completed orders</p>
                )}
              </div>
            )
          })()}

          {/* Cancelled */}
          {(() => {
            const cancelledOrders = orders.filter(o => o.status === 'CANCELLED').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            return cancelledOrders.length > 0 && (
              <div className="status-section status-cancelled">
                <div className="section-header clickable" onClick={() => toggleSection('cancelled')}>
                  <h2 className="status-section-title">
                    ❌ Cancelled ({cancelledOrders.length})
                  </h2>
                  <span className="collapse-icon">{collapsedSections.cancelled ? '▶' : '▼'}</span>
                </div>
                {!collapsedSections.cancelled && (
                  <div className="orders-list">
                    {cancelledOrders.map(renderOrderCard)}
                  </div>
                )}
              </div>
            )
          })()}
        </section>
      )}

      {/* Products Tab */}
      {activeTab === 'products' && (
        <section className="products-section">
          <div className="products-header">
            <h2>🏷️ Product Management ({products.length} items)</h2>
            <div className="products-actions">
              <button 
                className="btn btn-primary"
                onClick={openAddProduct}
              >
                ➕ Add Product
              </button>
              <button 
                className="btn btn-success save-all-btn"
                onClick={saveAllPrices}
                disabled={savingPrices}
              >
                {savingPrices ? 'Saving...' : '💾 Save All Prices'}
              </button>
            </div>
          </div>

          {/* Product Filters */}
          <div className="product-filters">
            <input
              type="text"
              placeholder="Search products..."
              value={productSearch}
              onChange={e => setProductSearch(e.target.value)}
              className="filter-input"
            />
            <select 
              value={productCategoryFilter} 
              onChange={e => setProductCategoryFilter(e.target.value)}
              className="filter-select"
            >
              <option value="All">All Categories</option>
              {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={showUnavailable}
                onChange={e => setShowUnavailable(e.target.checked)}
              />
              Show Unavailable
            </label>
          </div>

          {Object.entries(productsByCategory).map(([category, categoryProducts]) => (
            <div key={category} className="category-section">
              <h3 className="category-title">{category} ({categoryProducts.length})</h3>
              <div className="price-grid">
                {categoryProducts.map(product => (
                  <div key={product.id} className={`price-card ${!product.available ? 'unavailable' : ''}`}>
                    <div className="price-card-image">
                      <img 
                        src={product.image} 
                        alt={product.name}
                        onError={(e) => { e.target.style.display = 'none' }}
                      />
                      {!product.available && <span className="unavailable-badge">Hidden</span>}
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
                      <div className="product-card-actions">
                        <button 
                          className="btn-sm btn-edit"
                          onClick={() => openProductEdit(product)}
                        >
                          ✏️ Edit
                        </button>
                        <button 
                          className={`btn-sm ${product.inStock !== false ? 'btn-out-stock' : 'btn-in-stock'}`}
                          onClick={() => toggleProductStock(product)}
                          title={product.inStock !== false ? 'Mark as Out of Stock' : 'Mark as In Stock'}
                        >
                          {product.inStock !== false ? '📦 In Stock' : '🚫 Out of Stock'}
                        </button>
                        <button 
                          className={`btn-sm ${product.available ? 'btn-hide' : 'btn-show'}`}
                          onClick={() => toggleProductAvailability(product)}
                        >
                          {product.available ? '👁️ Hide' : '👁️ Show'}
                        </button>
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

      {/* Product Edit Modal */}
      {productModal.show && (
        <div className="modal-overlay" onClick={() => setProductModal({ show: false, product: null, isNew: false })}>
          <div className="modal product-modal" onClick={e => e.stopPropagation()}>
            <h2>{productModal.isNew ? '➕ Add New Product' : '✏️ Edit Product'}</h2>
            
            <div className="form-group">
              <label>Product Name *</label>
              <input
                type="text"
                value={productForm.name}
                onChange={e => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter product name"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={productForm.description}
                onChange={e => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Product description..."
                className="form-textarea"
                rows={2}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Category *</label>
                <select
                  value={productForm.category}
                  onChange={e => setProductForm(prev => ({ ...prev, category: e.target.value }))}
                  className="form-select"
                >
                  {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              
              <div className="form-group">
                <label>Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={productForm.price}
                  onChange={e => setProductForm(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Image Path</label>
              <input
                type="text"
                value={productForm.image}
                onChange={e => setProductForm(prev => ({ ...prev, image: e.target.value }))}
                placeholder="/image.jpg or https://..."
                className="form-input"
              />
              {productForm.image && (
                <div className="image-preview">
                  <img 
                    src={productForm.image} 
                    alt="Preview" 
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={productForm.available}
                  onChange={e => setProductForm(prev => ({ ...prev, available: e.target.checked }))}
                />
                Available for purchase
              </label>
            </div>

            <div className="modal-actions">
              <button 
                className="btn btn-secondary" 
                onClick={() => setProductModal({ show: false, product: null, isNew: false })}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleSaveProduct}
                disabled={savingProduct}
              >
                {savingProduct ? 'Saving...' : 'Save Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminPage
