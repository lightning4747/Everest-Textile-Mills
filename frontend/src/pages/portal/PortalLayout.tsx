import { Outlet, Link, useNavigate } from 'react-router-dom';
import { LogOut, LayoutDashboard, FilePlus, Package } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function PortalLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[var(--surface)] text-[var(--text)] flex flex-col">
      <header className="border-b border-[var(--border)] bg-[var(--surface-2)]">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="font-display font-bold text-xl tracking-tight text-[var(--olive-dark)]">
              Everest <span className="text-[var(--text-soft)]">Client Portal</span>
            </h1>
            <nav className="hidden md:flex items-center gap-1">
              <Link to="/portal/orders" className="px-3 py-1.5 rounded-md text-sm font-medium hover:bg-[var(--surface)] text-[var(--text)] transition-colors flex items-center gap-2">
                <Package size={16} /> My Orders
              </Link>
              <Link to="/portal/new-order" className="px-3 py-1.5 rounded-md text-sm font-medium hover:bg-[var(--surface)] text-[var(--text)] transition-colors flex items-center gap-2">
                <FilePlus size={16} /> Place Order
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-[var(--text-soft)]">
              {user?.name || 'Client User'}
            </span>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-[var(--surface)] rounded-md text-[var(--text-soft)] transition-colors"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-[var(--border)] mt-auto py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-[var(--text-soft)]">
          &copy; {new Date().getFullYear()} Everest Textile Mills. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
