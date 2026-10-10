import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { animateEntrance } from '../../utils/motion';

export default function AppLayout() {
  const location = useLocation();

  // Trigger smooth staggered entrance on route navigation
  useEffect(() => {
    // Small delay to let DOM render
    const t = setTimeout(() => {
      animateEntrance('.card, .kanban-card');
    }, 40);
    return () => clearTimeout(t);
  }, [location.pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6 scroll-smooth">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
