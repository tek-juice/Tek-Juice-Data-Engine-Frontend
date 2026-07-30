import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard, Search,
  TrendingUp, AlertTriangle, FileEdit, Code2,
  Gauge, Globe, BarChart2, RefreshCw,
  Activity, Settings, Key, LogOut, Zap,
  ChevronDown, User, Building2, LineChart,
} from 'lucide-react';
import { logout, getCurrentUserId } from '../services/auth.service';

// ─── Nav structure ────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
}

interface NavGroup {
  heading: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    heading: 'Overview',
    items: [
      { label: 'Dashboard',      to: '/dashboard',       icon: <LayoutDashboard size={14} /> },
      { label: 'Analytics',      to: '/analytics',       icon: <BarChart2 size={14} /> },
    ],
  },
  {
    heading: 'Content',
    items: [
      { label: 'Website Setup',  to: '/website',         icon: <Globe size={14} /> },
      { label: 'Drafts',         to: '/drafts',          icon: <FileEdit size={14} /> },
      { label: 'Search',         to: '/search',          icon: <Search size={14} /> },
    ],
  },
  {
    heading: 'Intelligence',
    items: [
      { label: 'Gap Detection',  to: '/gaps',            icon: <AlertTriangle size={14} /> },
      { label: 'Trends',         to: '/trends',          icon: <TrendingUp size={14} /> },
      { label: 'Schema Factory', to: '/schema-factory',  icon: <Code2 size={14} /> },
    ],
  },
  {
    heading: 'Visibility',
    items: [
      { label: 'SEO',            to: '/seo',             icon: <Gauge size={14} /> },
      { label: 'GEO',            to: '/geo',             icon: <Globe size={14} /> },
    ],
  },
  {
    heading: 'System',
    items: [
      { label: 'Sync',           to: '/sync',            icon: <RefreshCw size={14} /> },
      { label: 'Telemetry',      to: '/telemetry',       icon: <Activity size={14} /> },
    ],
  },
  {
    heading: 'Access',
    items: [
      { label: 'API Credentials', to: '/credentials',   icon: <Key size={14} /> },
      { label: 'Settings',        to: '/settings',      icon: <Settings size={14} /> },
    ],
  },
  {
    heading: 'Performance',
    items: [
      { label: 'My Performance',      to: '/my-performance', icon: <LineChart size={14} /> },
      { label: 'All Products',        to: '/admin/tenants',  icon: <Building2 size={14} /> },
    ],
  },
];

// ─── Nav link style ───────────────────────────────────────────────────────────

function SideLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-3 py-1.5 text-xs rounded-sm transition-colors w-full ${
          isActive
            ? 'bg-zinc-800 text-zinc-100'
            : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900'
        }`
      }
    >
      <span className="flex-shrink-0">{item.icon}</span>
      <span>{item.label}</span>
    </NavLink>
  );
}

// ─── User menu ────────────────────────────────────────────────────────────────

function UserMenu() {
  const navigate   = useNavigate();
  const [open, setOpen] = useState(false);
  const userId     = getCurrentUserId();
  const displayName = userId ?? 'Account';

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 w-full px-3 py-2 hover:bg-zinc-800 transition-colors"
      >
        <div className="w-6 h-6 bg-zinc-700 flex items-center justify-center flex-shrink-0">
          <User size={12} className="text-zinc-300" />
        </div>
        <span className="text-xs text-zinc-300 font-medium truncate flex-1 text-left">{displayName}</span>
        <ChevronDown size={11} className={`text-zinc-600 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          {/* backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 right-0 z-20 bg-zinc-900 border border-zinc-700 shadow-xl mb-1">
            <NavLink
              to="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            >
              <User size={12} /> Profile
            </NavLink>
            <NavLink
              to="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            >
              <Settings size={12} /> Settings
            </NavLink>
            <div className="border-t border-zinc-800 my-0.5" />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-zinc-800 transition-colors"
            >
              <LogOut size={12} /> Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── App Shell ────────────────────────────────────────────────────────────────

export default function AppShell() {
  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-200 overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className="w-52 flex-shrink-0 flex flex-col border-r border-zinc-800 bg-zinc-950 overflow-hidden">

        {/* Wordmark */}
        <div className="flex items-center gap-2 px-4 h-12 border-b border-zinc-800 flex-shrink-0">
          <div className="w-6 h-6 bg-zinc-100 flex items-center justify-center flex-shrink-0">
            <Zap size={12} className="text-zinc-900" />
          </div>
          <div>
            <div className="text-xs font-semibold text-zinc-100 leading-tight">Data Engine</div>
            <div className="text-xs text-zinc-600 leading-tight">Analytics</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {NAV.map(group => (
            <div key={group.heading}>
              <div className="px-3 mb-1 text-xs font-mono font-medium text-zinc-700 uppercase tracking-wider">
                {group.heading}
              </div>
              <div className="space-y-0.5">
                {group.items.map(item => (
                  <SideLink key={item.to} item={item} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User menu pinned to bottom */}
        <div className="border-t border-zinc-800 flex-shrink-0">
          <UserMenu />
        </div>

      </aside>

      {/* ── Page content ── */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

    </div>
  );
}
