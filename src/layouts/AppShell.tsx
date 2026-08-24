import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  Settings, LogOut,
  ChevronDown, User,
  Sun, Moon,
} from 'lucide-react';
import { logout, getCurrentUserId } from '../services/auth.service';
import { useTheme } from '../contexts/ThemeContext';

// ─── Navigation structure ─────────────────────────────────────────────────────

interface NavItem  { label: string; to: string; }
interface NavGroup { heading: string; items: NavItem[]; }

const NAV: NavGroup[] = [
  {
    heading: 'Overview',
    items: [
      { label: 'Dashboard',       to: '/dashboard' },
      { label: 'Analytics',       to: '/analytics' },
    ],
  },
  {
    heading: 'Content',
    items: [
      { label: 'Website Setup',   to: '/website' },
      { label: 'Drafts',          to: '/drafts' },
      { label: 'Search',          to: '/search' },
    ],
  },
  {
    heading: 'Intelligence',
    items: [
      { label: 'Gap Detection',   to: '/gaps' },
      { label: 'Trends',          to: '/trends' },
      { label: 'Schema Factory',  to: '/schema-factory' },
    ],
  },
  {
    heading: 'Visibility',
    items: [
      { label: 'SEO',             to: '/seo' },
      { label: 'GEO',             to: '/geo' },
    ],
  },
  {
    heading: 'System',
    items: [
      { label: 'Sync',            to: '/sync' },
      { label: 'Telemetry',       to: '/telemetry' },
    ],
  },
  {
    heading: 'Access',
    items: [
      { label: 'API Credentials', to: '/credentials' },
      { label: 'Settings',        to: '/settings' },
    ],
  },
  {
    heading: 'Performance',
    items: [
      { label: 'My Performance',  to: '/my-performance' },
      { label: 'All Products',    to: '/admin/tenants' },
    ],
  },
];

// ─── Nav link ─────────────────────────────────────────────────────────────────

function SideLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        `block px-3 py-2 rounded-md text-[15px] font-semibold transition-colors w-full ${
          isActive
            ? 'bg-[var(--brand-10)] text-[var(--brand)]'
            : 'text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]'
        }`
      }
    >
      {item.label}
    </NavLink>
  );
}

// ─── User menu ────────────────────────────────────────────────────────────────

function UserMenu() {
  const navigate    = useNavigate();
  const [open, setOpen] = useState(false);
  const userId      = getCurrentUserId();
  const displayName = userId ?? 'Account';
  const initial     = displayName.charAt(0).toUpperCase();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2.5 w-full px-3 py-2.5 transition-colors"
        style={{ borderTop: '1px solid var(--border)' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
        onMouseLeave={e => (e.currentTarget.style.background = '')}
      >
        <div
          className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0 text-sm font-bold"
          style={{ background: 'var(--brand)', color: '#111' }}
        >
          {initial}
        </div>
        <span
          className="text-sm font-semibold truncate flex-1 text-left"
          style={{ color: 'var(--text)' }}
        >
          {displayName}
        </span>
        <ChevronDown
          size={13}
          className={`transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`}
          style={{ color: 'var(--text-3)' }}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute bottom-full left-0 right-0 z-20 mb-px overflow-hidden"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <NavLink
              to="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors"
              style={{ color: 'var(--text-2)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--text-2)'; }}
            >
              <User size={14} />
              Profile
            </NavLink>
            <NavLink
              to="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors"
              style={{ color: 'var(--text-2)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--text-2)'; }}
            >
              <Settings size={14} />
              Settings
            </NavLink>
            <div style={{ borderTop: '1px solid var(--border)' }} />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm font-medium transition-colors"
              style={{ color: 'var(--danger)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
            >
              <LogOut size={14} />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── App Shell ────────────────────────────────────────────────────────────────

export default function AppShell() {
  const { theme, toggle } = useTheme();

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: 'var(--bg)', color: 'var(--text)' }}
    >
      {/* ── Sidebar ── */}
      <aside
        className="w-60 flex-shrink-0 flex flex-col overflow-hidden"
        style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}
      >

        {/* Brand header */}
        <div
          className="flex items-center gap-3 px-4 h-14 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div
            className="w-7 h-7 flex items-center justify-center flex-shrink-0 rounded"
            style={{ background: 'var(--brand)' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M2 12L7 2l5 10" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="7" cy="8.5" r="1.6" fill="#111" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="text-[15px] font-bold leading-tight" style={{ color: 'var(--text)' }}>
              Data Engine
            </div>
            <div className="text-xs leading-tight" style={{ color: 'var(--text-3)' }}>
              by TekJuice
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          {NAV.map(group => (
            <div key={group.heading}>
              <p
                className="px-3 mb-1.5 text-xs font-bold uppercase tracking-wider"
                style={{ color: 'var(--text-3)' }}
              >
                {group.heading}
              </p>
              <div className="space-y-px">
                {group.items.map(item => (
                  <SideLink key={item.to} item={item} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>
              {theme === 'dark' ? 'Dark' : 'Light'} mode
            </span>
            <button
              onClick={toggle}
              className="flex items-center justify-center w-7 h-7 rounded transition-colors"
              style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}
              aria-label="Toggle theme"
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-3)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface-2)')}
            >
              {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
            </button>
          </div>
          <UserMenu />
        </div>

      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto" style={{ background: 'var(--bg)' }}>
        <Outlet />
      </main>

    </div>
  );
}
