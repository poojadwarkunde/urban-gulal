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

  const totalAmount = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0)
  const totalItems = cartItems.reduce((sum, item) => sum + item.qty, 0)

  const handlePlaceOrder = async () => {
    if (!customerName.trim() || !phone.trim() || !address.trim()) {
      alert('Please fill in all required fields')
      return
    }

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
          items: cartItems.map(({ name, qty, price }) => ({ name, qty, price })),
          totalAmount,
          notes: notes.trim()
        })
      })

      if (!response.ok) throw new Error('Failed to place order')

      setOrderSuccess(true)
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
              <div className="user-info">
                <span className="user-name">👤 {user.name}</span>
                <button className="logout-btn" onClick={handleLogout}>Logout</button>
              </div>
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
          <div key={product.id} className="product-card">
            <div className="product-image">
              <img 
                src={product.image} 
                alt={product.name}
                onError={(e) => {
                  e.target.style.display = 'none'
                  e.target.nextSibling.style.display = 'flex'
                }}
              />
              <span className="product-emoji" style={{display: 'none'}}>{product.emoji}</span>
            </div>
            <div className="product-info">
              <span className="product-category">{product.category}</span>
              <h3>{product.name}</h3>
              <div className="product-footer">
                <span className="product-price">₹{product.price}</span>
                {cart[product.id] ? (
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
            
            <div className="order-summary">
              <h3>Order Summary</h3>
              {cartItems.map(item => (
                <div key={item.id} className="summary-item">
                  <span>{item.emoji} {item.name} × {item.qty}</span>
                  <span>₹{item.price * item.qty}</span>
                </div>
              ))}
              <div className="summary-total">
                <strong>Total</strong>
                <strong>₹{totalAmount}</strong>
              </div>
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
