import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Factory, ChevronRight, ChevronLeft,
  Layers, AlertTriangle, FileText, Truck, ClipboardCheck,
  Boxes, TrendingUp, Receipt, Gauge, ShieldCheck, ShoppingCart, BarChart3, Package
} from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  children?: { label: string; path: string; icon: React.ReactNode }[];
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: <LayoutDashboard size={16} />,
  },
  {
    label: 'Yarn Management',
    path: '/yarn',
    icon: <Layers size={16} />,
    children: [
      { label: 'Yarn Receipts',      path: '/yarn/receipts', icon: <Receipt size={14} /> },
      { label: 'Raw Material Stock', path: '/yarn/stock',    icon: <Boxes size={14} /> },
      { label: 'Low Stock Alerts',   path: '/yarn/alerts',   icon: <AlertTriangle size={14} /> },
    ],
  },
  {
    label: 'Production',
    path: '/production',
    icon: <Factory size={16} />,
    children: [
      { label: 'Machines',          path: '/production/machines',   icon: <Gauge size={14} /> },
      { label: 'Production Orders', path: '/production/orders',     icon: <ClipboardCheck size={14} /> },
      { label: 'Shop Floor Board',  path: '/production/shopfloor',  icon: <LayoutDashboard size={14} /> },
    ],
  },
  {
    label: 'Quality Control',
    path: '/quality',
    icon: <ShieldCheck size={16} />,
    children: [
      { label: 'Quality Checks',     path: '/quality/checks',  icon: <ClipboardCheck size={14} /> },
      { label: 'Fabric Rolls',       path: '/quality/rolls',   icon: <Package size={14} /> },
      { label: 'Pending Inspection', path: '/quality/pending', icon: <AlertTriangle size={14} /> },
    ],
  },
  {
    label: 'Sales & Dispatch',
    path: '/sales',
    icon: <ShoppingCart size={16} />,
    children: [
      { label: 'Sales Orders',    path: '/sales/orders',     icon: <FileText size={14} /> },
      { label: 'Order Status',    path: '/sales/status',     icon: <TrendingUp size={14} /> },
      { label: 'Finished Goods',  path: '/sales/finished',   icon: <Boxes size={14} /> },
      { label: 'Dispatches',      path: '/sales/dispatches', icon: <Truck size={14} /> },
    ],
  },
  {
    label: 'Reports',
    path: '/reports',
    icon: <BarChart3 size={16} />,
    children: [
      { label: 'Order Costing',       path: '/reports/costing',  icon: <FileText size={14} /> },
      { label: 'Machine Performance', path: '/reports/machines', icon: <Gauge size={14} /> },
      { label: 'Monthly Summary',     path: '/reports/monthly',  icon: <BarChart3 size={14} /> },
    ],
  },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [openSections, setOpenSections] = useState<string[]>([
    'Yarn Management', 'Production', 'Quality Control', 'Sales & Dispatch', 'Reports'
  ]);
  const location = useLocation();

  const toggleSection = (label: string) => {
    setOpenSections(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    );
  };

  const isActive = (path: string) => location.pathname === path;
  const isParentActive = (item: NavItem) =>
    item.path === location.pathname ||
    item.children?.some(c => location.pathname.startsWith(c.path));

  return (
    <aside
      className={`flex flex-col h-screen bg-white border-r border-slate-200 transition-all duration-200 flex-shrink-0 ${
        collapsed ? 'w-[60px]' : 'w-[220px]'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-200 min-h-[60px]">
        <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">E</span>
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-slate-900 leading-tight truncate">Everest Mills</p>
            <p className="text-[10px] text-slate-400 leading-tight">Manufacturing ERP</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navItems.map((item) => (
          <div key={item.label}>
            {item.children ? (
              <>
                <button
                  onClick={() => !collapsed && toggleSection(item.label)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors duration-100
                    ${isParentActive(item)
                      ? 'text-amber-600 bg-amber-50'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left font-medium text-xs">{item.label}</span>
                      <ChevronRight
                        size={12}
                        className={`transition-transform duration-150 ${
                          openSections.includes(item.label) ? 'rotate-90' : ''
                        }`}
                      />
                    </>
                  )}
                </button>

                {!collapsed && openSections.includes(item.label) && (
                  <div className="ml-4 mt-0.5 space-y-0.5 border-l border-slate-200 pl-3">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors duration-100
                          ${isActive(child.path)
                            ? 'text-amber-600 bg-amber-50 font-semibold'
                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                          }`}
                      >
                        {child.icon}
                        <span>{child.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <NavLink
                to={item.path}
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors duration-100
                  ${isActive(item.path)
                    ? 'text-amber-600 bg-amber-50 font-semibold'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                title={collapsed ? item.label : undefined}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {!collapsed && <span className="font-medium text-xs">{item.label}</span>}
              </NavLink>
            )}
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t border-slate-200">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-2 py-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors text-xs"
        >
          {collapsed ? <ChevronRight size={14} /> : <><ChevronLeft size={14} /><span>Collapse</span></>}
        </button>
      </div>
    </aside>
  );
}
