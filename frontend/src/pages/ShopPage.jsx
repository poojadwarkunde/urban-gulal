import { useState, useEffect } from 'react'

const PRODUCTS = [
  { id: 1, name: 'Decorative Namaste Pooja Thali', category: 'Pooja Items', price: 350, image: '/images/namaste-thali.jpg', emoji: '🪔' },
  { id: 2, name: 'Golden Lakshmi Diya Stand', category: 'Pooja Items', price: 280, image: '/images/lakshmi-diya.jpg', emoji: '✨' },
  { id: 3, name: 'Om Kalash Pooja Thali', category: 'Pooja Items', price: 320, image: '/images/kalash-thali.jpg', emoji: '🕉️' },
  { id: 4, name: 'Peacock Meenakari Thali', category: 'Pooja Items', price: 450, image: '/images/peacock-thali.jpg', emoji: '🦚' },
  { id: 5, name: 'Golden Ganesha Diya Set', category: 'Pooja Items', price: 220, image: '/images/ganesha-diya.jpg', emoji: '🐘' },
  { id: 6, name: 'Elephant Haldi Kumkum Holder', category: 'Pooja Items', price: 180, image: '/images/elephant-holder.jpg', emoji: '🐘' },
  { id: 7, name: 'Diamond Pattern Kite Thali', category: 'Pooja Items', price: 250, image: '/images/kite-thali.jpg', emoji: '🪁' },
  { id: 8, name: 'Swastik Golden Plate', category: 'Pooja Items', price: 180, image: '/images/swastik-plate.jpg', emoji: '☀️' },
  { id: 9, name: 'Bamboo Heat Pad', category: 'Kitchen', price: 120, image: '/images/heat-pad.jpg', emoji: '🎍' },
  { id: 10, name: 'Colorful Storage Containers (Set of 6)', category: 'Kitchen', price: 250, image: '/images/containers.jpg', emoji: '📦' },
  { id: 11, name: 'Banana Leaf Serving Plate (Set of 2)', category: 'Kitchen', price: 180, image: '/images/banana-leaf.jpg', emoji: '🍃' },
  { id: 12, name: 'Floral Design Serving Tray', category: 'Kitchen', price: 150, image: '/images/serving-tray.jpg', emoji: '🍽️' },
  { id: 13, name: 'Round Storage Boxes (Set of 6)', category: 'Kitchen', price: 200, image: '/images/round-boxes.jpg', emoji: '🥣' },
  { id: 14, name: 'Embroidered Rangoli Pouch', category: 'Bags', price: 150, image: '/images/rangoli-pouch.jpg', emoji: '👜' },
  { id: 15, name: 'Pink Floral Embroidered Wallet', category: 'Bags', price: 180, image: '/images/pink-wallet.jpg', emoji: '💗' },
  { id: 16, name: 'Cream Floral Pouch Set', category: 'Bags', price: 220, image: '/images/cream-pouch.jpg', emoji: '🌸' },
  { id: 17, name: 'Patchwork Designer Pouch', category: 'Bags', price: 200, image: '/images/patchwork-pouch.jpg', emoji: '🎨' },
  { id: 18, name: 'Namaste Thank You Bag', category: 'Bags', price: 80, image: '/images/thankyou-bag.jpg', emoji: '🙏' },
  { id: 19, name: 'Crystal Glass Turtle (Large)', category: 'Gift Items', price: 350, image: '/images/turtle-large.jpg', emoji: '🐢' },
  { id: 20, name: 'Crystal Glass Turtle (Small)', category: 'Gift Items', price: 200, image: '/images/turtle-small.jpg', emoji: '🐢' },
  { id: 21, name: 'Decorative Flower Candles (Set of 12)', category: 'Gift Items', price: 280, image: '/images/flower-candles.jpg', emoji: '🕯️' },
  { id: 22, name: 'Golden Ganesh Diya Peacock', category: 'Gift Items', price: 320, image: '/images/ganesh-peacock.jpg', emoji: '🦚' },
]

const CATEGORIES = ['All', 'Pooja Items', 'Kitchen', 'Bags', 'Gift Items']

function ShopPage() {
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
    ? PRODUCTS 
    : PRODUCTS.filter(p => p.category === selectedCategory)

  const cartItems = PRODUCTS.filter(p => cart[p.id] > 0).map(p => ({
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
      setCustomerName('')
      setPhone('')
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
          <button className="cart-btn" onClick={() => setShowCart(true)}>
            🛒 <span className="cart-badge">{totalItems}</span>
          </button>
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
                  <button className="btn btn-primary" onClick={() => { setShowCart(false); setShowCheckout(true); }}>
                    Proceed to Checkout →
                  </button>
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
