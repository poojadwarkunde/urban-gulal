import { Routes, Route } from 'react-router-dom'
import ShopPage from './pages/ShopPage'
import AdminPage from './pages/AdminPage'
import RatePage from './pages/RatePage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<ShopPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/rate/:orderId" element={<RatePage />} />
    </Routes>
  )
}

export default App
