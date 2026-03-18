import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, Home, User, LogOut, Beer, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import toast from 'react-hot-toast';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    toast.success('Logged out. See you next time! 🍺');
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to={user?.role === 'admin' ? '/admin' : '/'} className="flex items-center gap-2.5 group">
            <div className="text-3xl group-hover:animate-bounce">🍺</div>
            <div>
              <span className="text-xl font-black text-amber-400 tracking-tight">Beer</span>
              <span className="text-xl font-black text-white tracking-tight">Store</span>
            </div>
          </Link>

          {/* Nav Links */}
          <div className="flex items-center gap-1">
            {user?.role === 'admin' ? (
              <Link
                to="/admin"
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  isActive('/admin')
                    ? 'bg-amber-500 text-black'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <LayoutDashboard size={16} />
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/"
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    isActive('/') ? 'bg-amber-500 text-black' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  <Home size={16} />
                  <span className="hidden sm:inline">Home</span>
                </Link>

                <Link
                  to="/cart"
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    isActive('/cart') ? 'bg-amber-500 text-black' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  <ShoppingCart size={16} />
                  <span className="hidden sm:inline">Cart</span>
                  {totalItems > 0 && (
                    <span className="absolute -top-1 -right-1 bg-amber-500 text-black text-xs font-black w-5 h-5 rounded-full flex items-center justify-center animate-bounce-in">
                      {totalItems}
                    </span>
                  )}
                </Link>
              </>
            )}
          </div>

          {/* User Info + Logout */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-zinc-800 px-3 py-1.5 rounded-xl">
              <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                <User size={12} className="text-black" />
              </div>
              <span className="text-sm font-medium text-zinc-300">{user?.username}</span>
              {user?.role === 'admin' && (
                <span className="text-xs bg-amber-500 text-black px-1.5 py-0.5 rounded font-bold">ADMIN</span>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all text-sm font-semibold"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
