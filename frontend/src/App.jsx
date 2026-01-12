import { Routes, Route } from 'react-router-dom'
import ShopPage from './pages/ShopPage'
import AdminPage from './pages/AdminPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<ShopPage />} />
      <Route path="/admin" element={<AdminPage />} />
    </Routes>
  )
}

export default App
