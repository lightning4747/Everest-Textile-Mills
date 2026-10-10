import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Factory, ChevronRight, ChevronLeft,
  Layers, AlertTriangle, FileText, Truck, ClipboardCheck,
  Boxes, TrendingUp, Receipt, Gauge, ShieldCheck, ShoppingCart, BarChart3, Package, FlaskConical
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
      { label: 'Yarn Receipts',      path: '/yarn/receipts',    icon: <Receipt size={14} /> },
      { label: 'Raw Material Stock', path: '/yarn/stock',       icon: <Boxes size={14} /> },
      { label: 'Yarn Inspection',    path: '/yarn/inspection',  icon: <FlaskConical size={14} /> },
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
      className={`flex flex-col h-screen bg-[#004643] text-[#FAFAFA] border-r border-[var(--border)] transition-all duration-200 flex-shrink-0 z-20 select-none ${
        collapsed ? 'w-[64px]' : 'w-[236px]'
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-[rgba(250,250,250,0.15)] min-h-[64px]">
        <div className="w-8 h-8 rounded-lg bg-[#FFFFFF] text-[#004643] flex items-center justify-center flex-shrink-0 font-display font-bold text-base shadow-sm">
          E
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h2 className="text-sm font-display font-semibold text-[#FAFAFA] leading-tight truncate tracking-wide">Everest Mills</h2>
            <p className="text-[10px] text-[#E0EFEA] opacity-80 leading-tight tracking-wider uppercase font-mono font-medium">Textile ERP · 1954</p>
          </div>
        )}
      </div>

      {/* Nav List */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {navItems.map((item) => (
          <div key={item.label}>
            {item.children ? (
              <>
                <button
                  onClick={() => !collapsed && toggleSection(item.label)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors duration-150
                    ${isParentActive(item)
                      ? 'text-[#FAFAFA] bg-[rgba(255,255,255,0.15)] font-bold'
                      : 'text-[#FAFAFA] opacity-85 hover:opacity-100 hover:bg-[rgba(250,250,250,0.1)]'
                    }`}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="flex-shrink-0 text-[#E0EFEA]">{item.icon}</span>
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left truncate">{item.label}</span>
                      <ChevronRight
                        size={12}
                        className={`transition-transform duration-150 text-[#E0EFEA] ${
                          openSections.includes(item.label) ? 'rotate-90' : ''
                        }`}
                      />
                    </>
                  )}
                </button>

                {!collapsed && openSections.includes(item.label) && (
                  <div className="ml-3 mt-1 space-y-1 border-l border-[rgba(250,250,250,0.2)] pl-2.5">
                    {item.children.map((child) => {
                      const active = isActive(child.path);
                      return (
                        <NavLink
                          key={child.path}
                          to={child.path}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors duration-150
                            ${active
                              ? 'bg-[#FFFFFF] text-[#004643] font-bold shadow-sm'
                              : 'text-[#FAFAFA] opacity-75 hover:opacity-100 hover:bg-[rgba(250,250,250,0.1)]'
                            }`}
                        >
                          <span className={active ? 'text-[#004643]' : 'text-[#E0EFEA]'}>{child.icon}</span>
                          <span className="truncate">{child.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <NavLink
                to={item.path}
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-colors duration-150
                  ${isActive(item.path)
                    ? 'bg-[#FFFFFF] text-[#004643] font-bold shadow-sm'
                    : 'text-[#FAFAFA] opacity-85 hover:opacity-100 hover:bg-[rgba(250,250,250,0.1)]'
                  }`}
                title={collapsed ? item.label : undefined}
              >
                <span className={`flex-shrink-0 ${isActive(item.path) ? 'text-[#004643]' : 'text-[#E0EFEA]'}`}>{item.icon}</span>
                {!collapsed && <span className="font-medium truncate">{item.label}</span>}
              </NavLink>
            )}
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t border-[rgba(250,250,250,0.15)]">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-2 py-2 rounded-lg text-[#FAFAFA] opacity-75 hover:opacity-100 hover:bg-[rgba(250,250,250,0.1)] transition-colors text-xs font-medium"
        >
          {collapsed ? <ChevronRight size={14} /> : <><ChevronLeft size={14} /><span>Collapse</span></>}
        </button>
      </div>
    </aside>
  );
}
