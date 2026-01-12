import { useState, useEffect } from 'react'

const STATUS_OPTIONS = ['NEW', 'CONFIRMED', 'SHIPPED', 'DELIVERED']
const PAYMENT_OPTIONS = ['PENDING', 'PAID']

function AdminPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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

  useEffect(() => {
    fetchOrders()
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

  if (loading) {
    return <div className="admin-container"><div className="loading">Loading orders...</div></div>
  }

  return (
    <div className="admin-container">
      <header className="admin-header">
        <div>
          <h1>🎨 Urban Gulal Admin</h1>
          <p>Order Management</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchOrders}>↻ Refresh</button>
      </header>

      {error && <div className="error-banner">{error}</div>}

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
    </div>
  )
}

export default AdminPage
