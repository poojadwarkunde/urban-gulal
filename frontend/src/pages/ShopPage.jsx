import { useState, useEffect } from 'react'

const CATEGORIES = ['All', 'Pooja Items', 'Kitchen', 'Bags', 'Gift Items']

// Emoji mapping for products
const EMOJI_MAP = {
  'Pooja Items': '🪔',
  'Kitchen': '🍳',
  'Bags': '👜',
  'Gift Items': '🎁'
}

function ShopPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState({})
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [showCart, setShowCart] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [pincode, setPincode] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(false)
  
  // User authentication state
  const [user, setUser] = useState(null)
  const [showAuth, setShowAuth] = useState(false)
  const [authMode, setAuthMode] = useState('login') // 'login' or 'register'
  const [authName, setAuthName] = useState('')
  const [authMobile, setAuthMobile] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  
  // Order history state
  const [showOrderHistory, setShowOrderHistory] = useState(false)
  const [orderHistory, setOrderHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  
  // Image zoom state
  const [zoomImage, setZoomImage] = useState(null)
  
  // Custom items state
  const [customItems, setCustomItems] = useState([])
  const [newCustomItem, setNewCustomItem] = useState({ name: '', qty: 1, price: '' })
  
  // Ratings state
  const [productRatings, setProductRatings] = useState({})
  
  // Feedback screenshots state
  const [feedbackScreenshots, setFeedbackScreenshots] = useState([])
  const [zoomFeedback, setZoomFeedback] = useState(null)
  
  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('urbanGulalUser')
    if (savedUser) {
      const userData = JSON.parse(savedUser)
      setUser(userData)
      setCustomerName(userData.name)
      setPhone(userData.mobile)
    }
  }, [])

  // Fetch product ratings
  const fetchRatings = async () => {
    try {
      const response = await fetch('/api/ratings/all')
      if (response.ok) {
        const data = await response.json()
        setProductRatings(data)
      }
    } catch (err) {
      console.error('Failed to fetch ratings:', err)
    }
  }
  
  // Fetch feedback screenshots
  const fetchFeedbackScreenshots = async () => {
    try {
      const response = await fetch('/api/feedback-screenshots')
      if (response.ok) {
        const data = await response.json()
        setFeedbackScreenshots(data)
      }
    } catch (err) {
      console.error('Failed to fetch feedback screenshots:', err)
    }
  }
  
  // Star display helper - defaults to 5 stars if no ratings
  const renderStars = (rating, count) => {
    const displayRating = rating && count > 0 ? rating : 5
    const fullStars = Math.floor(displayRating)
    const hasHalf = displayRating % 1 >= 0.5
    return (
      <div className="product-rating">
        <span className="stars">
          {'★'.repeat(fullStars)}
          {hasHalf && '½'}
          {'☆'.repeat(5 - fullStars - (hasHalf ? 1 : 0))}
        </span>
        {count > 0 && <span className="rating-count">({count})</span>}
      </div>
    )
  }

  // Fetch products from API
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/products')
        if (!response.ok) throw new Error('Failed to fetch products')
        const data = await response.json()
        // Add emoji based on category
        const productsWithEmoji = data.map(p => ({
          ...p,
          emoji: EMOJI_MAP[p.category] || '🛍️'
        }))
        setProducts(productsWithEmoji)
      } catch (err) {
        console.error('Failed to load products:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchProducts()
    fetchRatings()
    fetchFeedbackScreenshots()
  }, [])

  // Authentication handlers
  const handleAuth = async () => {
    setAuthError('')
    setAuthLoading(true)
    
    try {
      if (authMode === 'register') {
        if (!authName.trim()) {
          setAuthError('Please enter your name')
          setAuthLoading(false)
          return
        }
        if (!/^\d{10}$/.test(authMobile)) {
          setAuthError('Please enter valid 10-digit mobile number')
          setAuthLoading(false)
          return
        }
        
        const response = await fetch('/api/users/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: authName.trim(), mobile: authMobile })
        })
        
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Registration failed')
        
        setUser(data.user)
        localStorage.setItem('urbanGulalUser', JSON.stringify(data.user))
        setCustomerName(data.user.name)
        setPhone(data.user.mobile)
        setShowAuth(false)
        setAuthName('')
        setAuthMobile('')
      } else {
        if (!/^\d{10}$/.test(authMobile)) {
          setAuthError('Please enter valid 10-digit mobile number')
          setAuthLoading(false)
          return
        }
        
        const response = await fetch('/api/users/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobile: authMobile })
        })
        
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Login failed')
        
        setUser(data.user)
        localStorage.setItem('urbanGulalUser', JSON.stringify(data.user))
        setCustomerName(data.user.name)
        setPhone(data.user.mobile)
        setShowAuth(false)
        setAuthMobile('')
      }
    } catch (err) {
      setAuthError(err.message)
    } finally {
      setAuthLoading(false)
    }
  }
  
  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('urbanGulalUser')
    setCustomerName('')
    setPhone('')
  }

  // Fetch order history for logged in user
  const fetchOrderHistory = async () => {
    if (!user?.mobile) return
    
    setHistoryLoading(true)
    try {
      const response = await fetch(`/api/orders/history/${user.mobile}`)
      if (response.ok) {
        const data = await response.json()
        setOrderHistory(data)
      }
    } catch (err) {
      console.error('Failed to fetch order history:', err)
    } finally {
      setHistoryLoading(false)
    }
  }

  // Get status color and emoji
  const getStatusInfo = (status) => {
    switch (status) {
      case 'NEW': return { color: '#f59e0b', bg: '#fef3c7', emoji: '🆕', text: 'Order Placed' }
      case 'CONFIRMED': return { color: '#3b82f6', bg: '#dbeafe', emoji: '✅', text: 'Confirmed' }
      case 'SHIPPED': return { color: '#8b5cf6', bg: '#ede9fe', emoji: '📦', text: 'Shipped' }
      case 'DELIVERED': return { color: '#22c55e', bg: '#dcfce7', emoji: '🎉', text: 'Delivered' }
      case 'CANCELLED': return { color: '#ef4444', bg: '#fee2e2', emoji: '❌', text: 'Cancelled' }
      default: return { color: '#6b7280', bg: '#f3f4f6', emoji: '📋', text: status }
    }
  }

  const addToCart = (productId, askQty = false) => {
    if (askQty) {
      const qty = prompt('How many do you want to add?', '1')
      if (qty !== null) {
        const parsedQty = parseInt(qty) || 0
        if (parsedQty > 0) {
          setCart(prev => ({
            ...prev,
            [productId]: (prev[productId] || 0) + parsedQty
          }))
        }
      }
    } else {
      setCart(prev => ({
        ...prev,
        [productId]: (prev[productId] || 0) + 1
      }))
    }
  }

  const updateQuantity = (productId, delta) => {
    setCart(prev => {
      const newQty = (prev[productId] || 0) + delta
      if (newQty <= 0) {
        const { [productId]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [productId]: newQty }
    })
  }

  const setQuantity = (productId, qty) => {
    const newQty = Math.max(0, parseInt(qty) || 0)
    setCart(prev => {
      if (newQty === 0) {
        const { [productId]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [productId]: newQty }
    })
  }

  const filteredProducts = selectedCategory === 'All' 
    ? products 
    : products.filter(p => p.category === selectedCategory)

  const cartItems = products.filter(p => cart[p.id] > 0).map(p => ({
    ...p,
    qty: cart[p.id]
  }))

  const customItemsTotal = customItems.reduce((sum, item) => sum + (item.price || 0) * item.qty, 0)
  const totalAmount = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0) + customItemsTotal
  const totalItems = cartItems.reduce((sum, item) => sum + item.qty, 0) + customItems.reduce((sum, item) => sum + item.qty, 0)

  // Custom item functions
  const addCustomItem = () => {
    if (!newCustomItem.name.trim()) return
    setCustomItems(prev => [...prev, { 
      id: `custom-${Date.now()}`, 
      name: newCustomItem.name.trim(), 
      qty: newCustomItem.qty || 1, 
      price: newCustomItem.price ? parseInt(newCustomItem.price) : 0,
      isCustom: true
    }])
    setNewCustomItem({ name: '', qty: 1, price: '' })
  }

  const removeCustomItem = (id) => {
    setCustomItems(prev => prev.filter(item => item.id !== id))
  }

  const updateCustomItemQty = (id, qty) => {
    if (qty < 1) return removeCustomItem(id)
    setCustomItems(prev => prev.map(item => item.id === id ? { ...item, qty } : item))
  }

  // Format phone for WhatsApp - accepts 10 digit Indian numbers
  const formatPhoneForWhatsApp = (phoneNum) => {
    if (!phoneNum) return null
    // Remove all non-digit characters
    let cleaned = phoneNum.toString().replace(/\D/g, '')
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

  // Admin WhatsApp number for order notifications
  const ADMIN_WHATSAPP = '917722039146'

  // Send WhatsApp message to admin for new order
  const sendOrderToAdmin = (order) => {
    const itemsList = order.items.map(i => {
      const customTag = i.isCustom ? ' ⭐CUSTOM' : ''
      const priceInfo = i.price ? ` (₹${i.price})` : ' (Price TBD)'
      return `${i.name} x${i.qty}${i.isCustom ? priceInfo + customTag : ''}`
    }).join('\n• ')
    const addressFull = `${order.address}${order.city ? ', ' + order.city : ''}${order.pincode ? ' - ' + order.pincode : ''}`
    const hasCustomItems = order.items.some(i => i.isCustom)
    
    const message = `🔔 *NEW ORDER - Urban Gulal*${hasCustomItems ? ' ⭐HAS CUSTOM ITEMS' : ''}

👤 Customer: ${order.customerName}
📱 Phone: ${order.phone}
📍 Address: ${addressFull}

🛍️ *Items:*
• ${itemsList}

💰 *Total: ₹${order.totalAmount}*${hasCustomItems ? ' (may vary for custom items)' : ''}
${order.notes ? `\n📝 Notes: ${order.notes}` : ''}

⏰ ${new Date().toLocaleString('en-IN')}`

    const encodedMessage = encodeURIComponent(message)
    window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${encodedMessage}`, '_blank')
  }

  const handlePlaceOrder = async () => {
    if (!customerName.trim() || !phone.trim() || !address.trim()) {
      alert('Please fill in all required fields')
      return
    }
    
    if (cartItems.length === 0 && customItems.length === 0) {
      alert('Please add at least one item to your order')
      return
    }

    // Combine cart items and custom items
    const allItems = [
      ...cartItems.map(({ name, qty, price }) => ({ name, qty, price })),
      ...customItems.map(({ name, qty, price }) => ({ name, qty, price, isCustom: true }))
    ]

    setSubmitting(true)
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim(),
          phone: phone.trim(),
          address: address.trim(),
          city: city.trim(),
          pincode: pincode.trim(),
          items: allItems,
          totalAmount,
          notes: notes.trim()
        })
      })

      if (!response.ok) throw new Error('Failed to place order')
      
      const orderData = await response.json()
      
      // Send WhatsApp notification to admin with order details
      sendOrderToAdmin({
        ...orderData,
        customerName: customerName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        city: city.trim(),
        pincode: pincode.trim(),
        items: allItems,
        totalAmount,
        notes: notes.trim()
      })

      setOrderSuccess(true)
      setCustomItems([])
      setCart({})
      setShowCheckout(false)
      setShowCart(false)
      // Keep user info if logged in
      if (!user) {
        setCustomerName('')
        setPhone('')
      }
      setAddress('')
      setCity('')
      setPincode('')
      setNotes('')
    } catch (error) {
      alert('Failed to place order. Please try again.')
      console.error(error)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading" style={{textAlign: 'center', padding: '60px 20px'}}>
          <div style={{fontSize: '3rem', marginBottom: '16px'}}>🎨</div>
          <p>Loading Urban Gulal...</p>
        </div>
      </div>
    )
  }

  if (orderSuccess) {
    return (
      <div className="container">
        <div className="success-screen">
          <div className="success-icon">🎉</div>
          <h1>Order Placed Successfully!</h1>
          <p>Thank you for shopping with Urban Gulal</p>
          <p className="success-note">We will contact you shortly to confirm your order and delivery details.</p>
          <button className="btn btn-primary" onClick={() => setOrderSuccess(false)}>
            Continue Shopping
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="shop-container">
      <header className="shop-header">
        <div className="header-content">
          <div className="brand">
            <span className="brand-icon">🎨</span>
            <div>
              <h1>Urban Gulal</h1>
              <p className="tagline">Decorative & Gift Items</p>
            </div>
          </div>
          <div className="header-actions">
            {user ? (
              <>
                <button 
                  className="orders-btn"
                  onClick={() => { setShowOrderHistory(true); fetchOrderHistory(); }}
                >
                  📋 My Orders
                </button>
                <div className="user-info">
                  <span className="user-name">👤 {user.name}</span>
                  <button className="logout-btn" onClick={handleLogout}>Logout</button>
                </div>
              </>
            ) : (
              <button className="login-btn" onClick={() => setShowAuth(true)}>
                👤 Login
              </button>
            )}
            <button className="cart-btn" onClick={() => setShowCart(true)}>
              🛒 <span className="cart-badge">{totalItems}</span>
            </button>
          </div>
        </div>
      </header>

      <nav className="categories">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`cat-btn ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </nav>

      <main className="products-grid">
        {filteredProducts.map(product => (
          <div key={product.id} className={`product-card ${product.inStock === false ? 'out-of-stock' : ''}`}>
            <div 
              className="product-image zoomable"
              onClick={() => setZoomImage({ src: product.image, name: product.name, emoji: product.emoji })}
              title="Tap to zoom"
            >
              {product.inStock === false && (
                <div className="out-of-stock-badge">Out of Stock</div>
              )}
              <img 
                src={product.image} 
                alt={product.name}
                onError={(e) => {
                  e.target.style.display = 'none'
                  e.target.nextSibling.style.display = 'flex'
                }}
              />
              <span className="product-emoji" style={{display: 'none'}}>{product.emoji}</span>
              <span className="zoom-icon">🔍</span>
            </div>
            <div className="product-info">
              <span className="product-category">{product.category}</span>
              <h3>{product.name}</h3>
              {renderStars(productRatings[product.id]?.avgRating, productRatings[product.id]?.count || 0)}
              <div className="product-footer">
                <span className="product-price">₹{product.price}</span>
                {product.inStock === false ? (
                  <span className="stock-status-text">Currently Unavailable</span>
                ) : cart[product.id] ? (
                  <div className="qty-controls">
                    <button onClick={() => updateQuantity(product.id, -1)}>−</button>
                    <span 
                      className="qty-value clickable"
                      title="Click to enter quantity"
                      onClick={() => {
                        const qty = prompt('Enter quantity:', cart[product.id])
                        if (qty !== null) setQuantity(product.id, qty)
                      }}
                    >{cart[product.id]}</span>
                    <button onClick={() => updateQuantity(product.id, 1)}>+</button>
                  </div>
                ) : (
                  <div className="add-controls">
                    <button className="add-btn" onClick={() => addToCart(product.id)}>
                      +1
                    </button>
                    <button className="add-multi-btn" onClick={() => addToCart(product.id, true)}>
                      Add Multiple
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </main>

      {/* Customer Reviews Section */}
      <section className="reviews-section">
        <h2>⭐ Customer Reviews</h2>
        {feedbackScreenshots.length > 0 ? (
          <div className="reviews-gallery">
            {feedbackScreenshots.map(screenshot => (
              <div 
                key={screenshot._id} 
                className="review-card"
                onClick={() => setZoomFeedback(screenshot)}
              >
                <div className="review-image-container">
                  <img 
                    src={screenshot.imageUrl} 
                    alt={screenshot.caption || 'Customer feedback'}
                    onError={(e) => {
                      e.target.style.display = 'none'
                    }}
                  />
                  <span className="zoom-hint">Tap to view</span>
                </div>
                <div className="review-info">
                  {screenshot.customerName && (
                    <div className="review-customer">— {screenshot.customerName}</div>
                  )}
                  {screenshot.caption && (
                    <div className="review-caption">"{screenshot.caption}"</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-reviews">
            <p>🌟 Be the first to share your experience!</p>
          </div>
        )}
      </section>

      {/* Feedback Zoom Modal */}
      {zoomFeedback && (
        <div className="zoom-overlay" onClick={() => setZoomFeedback(null)}>
          <div className="zoom-content feedback-zoom" onClick={e => e.stopPropagation()}>
            <button className="zoom-close" onClick={() => setZoomFeedback(null)}>×</button>
            
            {/* Navigation Buttons */}
            {feedbackScreenshots.length > 1 && (
              <>
                <button 
                  className="zoom-nav zoom-prev"
                  onClick={() => {
                    const currentIndex = feedbackScreenshots.findIndex(f => f._id === zoomFeedback._id)
                    const prevIndex = currentIndex === 0 ? feedbackScreenshots.length - 1 : currentIndex - 1
                    setZoomFeedback(feedbackScreenshots[prevIndex])
                  }}
                >
                  ‹
                </button>
                <button 
                  className="zoom-nav zoom-next"
                  onClick={() => {
                    const currentIndex = feedbackScreenshots.findIndex(f => f._id === zoomFeedback._id)
                    const nextIndex = currentIndex === feedbackScreenshots.length - 1 ? 0 : currentIndex + 1
                    setZoomFeedback(feedbackScreenshots[nextIndex])
                  }}
                >
                  ›
                </button>
              </>
            )}
            
            <img src={zoomFeedback.imageUrl} alt={zoomFeedback.caption || 'Customer feedback'} />
            {zoomFeedback.caption && <p className="zoom-caption">"{zoomFeedback.caption}"</p>}
            {zoomFeedback.customerName && <p className="zoom-customer">— {zoomFeedback.customerName}</p>}
            
            {/* Counter */}
            {feedbackScreenshots.length > 1 && (
              <p className="zoom-counter">
                {feedbackScreenshots.findIndex(f => f._id === zoomFeedback._id) + 1} / {feedbackScreenshots.length}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Cart Sidebar */}
      {showCart && (
        <div className="cart-overlay" onClick={() => setShowCart(false)}>
          <div className="cart-sidebar" onClick={e => e.stopPropagation()}>
            <div className="cart-header">
              <h2>🛒 Your Cart</h2>
              <button className="close-btn" onClick={() => setShowCart(false)}>×</button>
            </div>
            
            {cartItems.length === 0 ? (
              <div className="empty-cart">
                <p>Your cart is empty</p>
                <button className="btn btn-secondary" onClick={() => setShowCart(false)}>
                  Start Shopping
                </button>
              </div>
            ) : (
              <>
                <div className="cart-items">
                  {cartItems.map(item => (
                    <div key={item.id} className="cart-item">
                      <span className="item-emoji">{item.emoji}</span>
                      <div className="item-details">
                        <h4>{item.name}</h4>
                        <p>₹{item.price} × {item.qty}</p>
                      </div>
                      <div className="item-total">
                        <span>₹{item.price * item.qty}</span>
                        <div className="item-qty">
                          <button onClick={() => updateQuantity(item.id, -1)}>−</button>
                          <span 
                            className="qty-value clickable"
                            onClick={() => {
                              const qty = prompt('Enter quantity:', item.qty)
                              if (qty !== null) setQuantity(item.id, qty)
                            }}
                          >{item.qty}</span>
                          <button onClick={() => updateQuantity(item.id, 1)}>+</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="cart-footer">
                  <div className="cart-total">
                    <span>Total</span>
                    <strong>₹{totalAmount}</strong>
                  </div>
                  {user ? (
                    <button className="btn btn-primary" onClick={() => { setShowCart(false); setShowCheckout(true); }}>
                      Proceed to Checkout →
                    </button>
                  ) : (
                    <div className="login-required">
                      <p className="login-hint">⚠️ Please login to place order</p>
                      <button className="btn btn-primary" onClick={() => { setShowCart(false); setShowAuth(true); }}>
                        Login to Continue →
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="checkout-overlay" onClick={() => setShowCheckout(false)}>
          <div className="checkout-modal" onClick={e => e.stopPropagation()}>
            <h2>📦 Delivery Details</h2>
            
            <div className="order-summary editable-summary">
              <h3>Order Summary</h3>
              <p className="edit-hint">Tap +/− to edit or 🗑️ to remove</p>
              {cartItems.map(item => (
                <div key={item.id} className="summary-item editable">
                  <div className="summary-item-info">
                    <span className="item-name">{item.emoji} {item.name}</span>
                    <span className="item-price-each">₹{item.price}</span>
                  </div>
                  <div className="summary-item-controls">
                    <button className="qty-btn-sm" onClick={() => updateQuantity(item.id, -1)}>−</button>
                    <span className="qty-display">{item.qty}</span>
                    <button className="qty-btn-sm" onClick={() => updateQuantity(item.id, 1)}>+</button>
                    <button className="remove-btn-sm" onClick={() => setCart(prev => { const updated = {...prev}; delete updated[item.id]; return updated; })}>🗑️</button>
                  </div>
                  <span className="summary-item-total">₹{item.price * item.qty}</span>
                </div>
              ))}
              {customItems.map(item => (
                <div key={item.id} className="summary-item custom-item editable">
                  <div className="summary-item-info">
                    <span className="item-name">✨ {item.name}</span>
                    <span className="item-price-each">{item.price > 0 ? `₹${item.price}` : 'TBD'}</span>
                  </div>
                  <div className="summary-item-controls">
                    <button className="qty-btn-sm" onClick={() => setCustomItems(prev => prev.map(i => i.id === item.id ? {...i, qty: Math.max(1, i.qty - 1)} : i))}>−</button>
                    <span className="qty-display">{item.qty}</span>
                    <button className="qty-btn-sm" onClick={() => setCustomItems(prev => prev.map(i => i.id === item.id ? {...i, qty: i.qty + 1} : i))}>+</button>
                    <button className="remove-btn-sm" onClick={() => removeCustomItem(item.id)}>🗑️</button>
                  </div>
                  <span className="summary-item-total">{item.price > 0 ? `₹${item.price * item.qty}` : 'TBD'}</span>
                </div>
              ))}
              {cartItems.length === 0 && customItems.length === 0 && (
                <p className="empty-cart-warning">Your cart is empty. Add some items first!</p>
              )}
              <div className="summary-total">
                <strong>Total</strong>
                <strong>₹{totalAmount}{customItems.some(i => !i.price) ? '+' : ''}</strong>
              </div>
            </div>

            {/* Add Custom Item Section */}
            <div className="custom-item-section">
              <label className="instructions-label">➕ Add Custom Item (not in catalog)</label>
              <div className="custom-item-form">
                <input
                  type="text"
                  placeholder="Item name"
                  value={newCustomItem.name}
                  onChange={e => setNewCustomItem(prev => ({ ...prev, name: e.target.value }))}
                  className="input custom-name-input"
                />
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Qty"
                  value={newCustomItem.qty}
                  onChange={e => setNewCustomItem(prev => ({ ...prev, qty: parseInt(e.target.value.replace(/\D/g, '')) || 1 }))}
                  className="input custom-qty-input"
                />
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Price (optional)"
                  value={newCustomItem.price}
                  onChange={e => setNewCustomItem(prev => ({ ...prev, price: e.target.value.replace(/\D/g, '') }))}
                  className="input custom-price-input"
                />
                <button 
                  type="button" 
                  className="btn btn-add-custom"
                  onClick={addCustomItem}
                  disabled={!newCustomItem.name.trim()}
                >
                  Add
                </button>
              </div>
              <small className="custom-item-hint">Add items not listed in the catalog. Leave price empty if unsure.</small>
            </div>

            <div className="checkout-form">
              <input
                type="text"
                placeholder="Your Name *"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="input"
              />
              <input
                type="tel"
                placeholder="Phone Number *"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="input"
              />
              <textarea
                placeholder="Delivery Address *"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="input textarea"
                rows={2}
              />
              <div className="form-row">
                <input
                  type="text"
                  placeholder="City"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  className="input"
                />
                <input
                  type="text"
                  placeholder="Pincode"
                  value={pincode}
                  onChange={e => setPincode(e.target.value)}
                  className="input"
                />
              </div>
              <textarea
                placeholder="Special notes (optional)"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="input textarea"
                rows={2}
              />
            </div>

            <div className="checkout-actions">
              <button className="btn btn-secondary" onClick={() => setShowCheckout(false)}>
                Back
              </button>
              <button 
                className="btn btn-primary"
                onClick={handlePlaceOrder}
                disabled={submitting}
              >
                {submitting ? 'Placing Order...' : 'Place Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {showAuth && (
        <div className="auth-overlay" onClick={() => setShowAuth(false)}>
          <div className="auth-modal" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowAuth(false)}>×</button>
            <h2>{authMode === 'login' ? '👤 Login' : '📝 Register'}</h2>
            
            {authError && <div className="auth-error">{authError}</div>}
            
            <div className="auth-form">
              {authMode === 'register' && (
                <input
                  type="text"
                  placeholder="Your Name"
                  value={authName}
                  onChange={e => setAuthName(e.target.value)}
                  className="input"
                />
              )}
              <input
                type="tel"
                placeholder="Mobile Number (10 digits)"
                value={authMobile}
                onChange={e => setAuthMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="input"
                maxLength={10}
              />
              
              <button 
                className="btn btn-primary auth-submit"
                onClick={handleAuth}
                disabled={authLoading}
              >
                {authLoading ? 'Please wait...' : (authMode === 'login' ? 'Login' : 'Register')}
              </button>
            </div>
            
            <div className="auth-switch">
              {authMode === 'login' ? (
                <p>New user? <button onClick={() => { setAuthMode('register'); setAuthError(''); }}>Register here</button></p>
              ) : (
                <p>Already registered? <button onClick={() => { setAuthMode('login'); setAuthError(''); }}>Login here</button></p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Order History Modal */}
      {showOrderHistory && (
        <div className="auth-overlay" onClick={() => setShowOrderHistory(false)}>
          <div className="order-history-modal" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowOrderHistory(false)}>×</button>
            <h2>📋 My Orders</h2>
            
            {historyLoading ? (
              <div className="history-loading">Loading your orders...</div>
            ) : orderHistory.length === 0 ? (
              <div className="no-orders-history">
                <span className="no-orders-icon">🛒</span>
                <p>No orders yet!</p>
                <p className="no-orders-sub">Your order history will appear here.</p>
              </div>
            ) : (
              <div className="order-history-list">
                {orderHistory.map(order => {
                  const statusInfo = getStatusInfo(order.status)
                  return (
                    <div key={order.id} className="history-order-card">
                      <div className="history-order-header">
                        <div className="history-order-date-title">📅 {order.orderDate}</div>
                        <div 
                          className="history-order-status"
                          style={{ color: statusInfo.color, background: statusInfo.bg }}
                        >
                          {statusInfo.emoji} {statusInfo.text}
                        </div>
                      </div>
                      
                      <div className="history-order-time">
                        🕐 {order.orderTime}
                      </div>
                      
                      <div className="history-order-items">
                        {order.items.map((item, idx) => (
                          <span key={idx} className="history-item-tag">
                            {item.name} × {item.qty}
                          </span>
                        ))}
                      </div>
                      
                      {order.address && (
                        <div className="history-address">
                          📍 {order.address}{order.city ? `, ${order.city}` : ''}{order.pincode ? ` - ${order.pincode}` : ''}
                        </div>
                      )}
                      
                      <div className="history-order-footer">
                        <span className="history-order-total">₹{order.totalAmount}</span>
                        <span className={`history-payment-status ${order.paymentStatus === 'PAID' ? 'paid' : 'pending'}`}>
                          {order.paymentStatus === 'PAID' ? '✓ Paid' : '○ Payment Pending'}
                        </span>
                      </div>
                      
                      {order.cancelReason && (
                        <div className="history-cancel-reason">
                          Reason: {order.cancelReason}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            
            <button 
              className="btn btn-secondary history-close-btn"
              onClick={() => setShowOrderHistory(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Image Zoom Modal */}
      {zoomImage && (
        <div className="zoom-overlay" onClick={() => setZoomImage(null)}>
          <div className="zoom-modal" onClick={e => e.stopPropagation()}>
            <button className="zoom-close-btn" onClick={() => setZoomImage(null)}>×</button>
            <img 
              src={zoomImage.src} 
              alt={zoomImage.name}
              className="zoom-image"
              onError={(e) => {
                e.target.style.display = 'none'
                e.target.nextSibling.style.display = 'flex'
              }}
            />
            <span className="zoom-emoji-fallback" style={{display: 'none'}}>{zoomImage.emoji}</span>
            <p className="zoom-title">{zoomImage.name}</p>
          </div>
        </div>
      )}

      {/* Floating Cart Button (mobile) */}
      {totalItems > 0 && !showCart && !showCheckout && (
        <div className="floating-cart" onClick={() => setShowCart(true)}>
          <span>🛒 {totalItems} items</span>
          <strong>₹{totalAmount}</strong>
        </div>
      )}
    </div>
  )
}

export default ShopPage
