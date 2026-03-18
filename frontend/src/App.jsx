import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Cart from './pages/Cart';
import Payment from './pages/Payment';
import OrderTracking from './pages/OrderTracking';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-zinc-950">
      {user && <Navbar />}
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/'} replace /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />

        {/* Customer routes */}
        <Route path="/" element={<ProtectedRoute role="customer"><Home /></ProtectedRoute>} />
        <Route path="/cart" element={<ProtectedRoute role="customer"><Cart /></ProtectedRoute>} />
        <Route path="/payment" element={<ProtectedRoute role="customer"><Payment /></ProtectedRoute>} />
        <Route path="/order/:id" element={<ProtectedRoute role="customer"><OrderTracking /></ProtectedRoute>} />

        {/* Admin routes */}
        <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to={user ? (user.role === 'admin' ? '/admin' : '/') : '/login'} replace />} />
      </Routes>

      <footer className="border-t border-white/5 py-3 text-center text-xs text-zinc-600">
        © {new Date().getFullYear()} Copyrights by BhuthamPrashanth
      </footer>
    </div>
  );
}
