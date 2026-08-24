import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { destroyActivityFeed } from './services/websocket';
import { ThemeProvider } from './contexts/ThemeContext';
import { PageErrorBoundary } from './components/common/PageErrorBoundary';

// ── Layouts ───────────────────────────────────────────────────────────────────
import AppShell   from './layouts/AppShell';
import AuthLayout from './layouts/AuthLayout';

// ── Auth pages (public) ───────────────────────────────────────────────────────
import Login         from './pages/Login/Login';
import OAuthCallback from './pages/OAuthCallback/OAuthCallback';
import ProtectedRoute from './routes/ProtectedRoute';

// ── App pages ─────────────────────────────────────────────────────────────────
import Dashboard    from './pages/Dashboard/Dashboard';
import Credentials  from './pages/Credentials/Credentials';
import WebsiteSetup from './pages/WebsiteSetup/WebsiteSetup';

// ── Placeholder for pages not yet built ──────────────────────────────────────
function Placeholder({ name }: { name: string }) {
  return (
    <div className="flex items-center justify-center h-full min-h-64">
      <div className="text-center">
        <div className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>{name}</div>
        <div className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Coming soon</div>
      </div>
    </div>
  );
}

// ── Helper: wrap element in an error boundary ─────────────────────────────────
function page(el: React.ReactElement) {
  return <PageErrorBoundary>{el}</PageErrorBoundary>;
}

function App() {
  useEffect(() => {
    const handleLogout = () => destroyActivityFeed();
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  return (
    <ThemeProvider>
    <BrowserRouter>
      <Routes>

        {/* ── Public auth pages ── */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
        </Route>

        {/* ── OAuth callback — standalone, no layout shell ── */}
        <Route path="/auth/callback" element={<OAuthCallback />} />

        {/* ── Protected — all inside AppShell sidebar ── */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/"               element={<Navigate to="/dashboard" replace />} />

            {/* Overview */}
            <Route path="/dashboard"      element={page(<Dashboard />)} />
            <Route path="/analytics"      element={page(<Placeholder name="Analytics" />)} />

            {/* Content */}
            <Route path="/website"        element={page(<WebsiteSetup />)} />
            <Route path="/drafts"         element={page(<Placeholder name="Drafts" />)} />
            <Route path="/search"         element={page(<Placeholder name="Search" />)} />

            {/* Intelligence */}
            <Route path="/gaps"           element={page(<Placeholder name="Gap Detection" />)} />
            <Route path="/trends"         element={page(<Placeholder name="Trends" />)} />
            <Route path="/schema-factory" element={page(<Placeholder name="Schema Factory" />)} />

            {/* Visibility */}
            <Route path="/seo"            element={page(<Placeholder name="SEO" />)} />
            <Route path="/geo"            element={page(<Placeholder name="GEO" />)} />

            {/* System */}
            <Route path="/sync"           element={page(<Placeholder name="Sync" />)} />
            <Route path="/telemetry"      element={page(<Placeholder name="Telemetry" />)} />

            {/* Access */}
            <Route path="/credentials"    element={page(<Credentials />)} />
            <Route path="/settings"       element={page(<Placeholder name="Settings" />)} />
            <Route path="/profile"        element={page(<Placeholder name="Profile" />)} />

            {/* Performance */}
            <Route path="/my-performance"   element={page(<Placeholder name="My Performance" />)} />
            <Route path="/admin/tenants"    element={page(<Placeholder name="All Products" />)} />
          </Route>
        </Route>

        {/* ── 404 ── */}
        <Route path="*" element={
          <div
            className="flex items-center justify-center h-screen text-sm"
            style={{ background: 'var(--bg)', color: 'var(--text-3)' }}
          >
            404 — page not found
          </div>
        } />

      </Routes>
    </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
