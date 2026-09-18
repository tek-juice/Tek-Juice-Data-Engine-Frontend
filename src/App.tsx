import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, type ReactElement } from 'react';
import { destroyActivityFeed } from './services/websocket';
import { ThemeProvider } from './contexts/ThemeContext';
import { PageErrorBoundary } from './components/common/PageErrorBoundary';

// ── Layouts ───────────────────────────────────────────────────────────────────
import AppShell   from './layouts/AppShell';
import AuthLayout from './layouts/AuthLayout';

// ── Auth pages (public) ───────────────────────────────────────────────────────
import Login          from './pages/Login/Login';
import OAuthCallback  from './pages/OAuthCallback/OAuthCallback';
import ProtectedRoute from './routes/ProtectedRoute';
import Onboarding     from './pages/Onboarding/Onboarding';
import Connect        from './pages/Connect/Connect';

// ── App pages ─────────────────────────────────────────────────────────────────
import Dashboard       from './pages/Dashboard/Dashboard';
import WebsiteSetup    from './pages/WebsiteSetup/WebsiteSetup';
import Monitor         from './pages/Monitor/Monitor';
import TenantDashboard from './pages/TenantDashboard/TenantDashboard';
import SchemaFactory      from './pages/SchemaFactory/SchemaFactory';
import AdminTenants    from './pages/AdminTenants/AdminTenants';
import GapDetection    from './pages/GapDetection/GapDetection';
import Drafts          from './pages/Drafts/Drafts';
import Trends          from './pages/Trends/Trends';
import SEO             from './pages/SEO/SEO';
import GEO             from './pages/GEO/GEO';
import Sync            from './pages/Sync/Sync';
import Settings        from './pages/Settings/Settings';

// ── Helper: wrap element in an error boundary ─────────────────────────────────
function page(el: ReactElement) {
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

        {/* ── Onboarding wizard — public, no auth required ── */}
        {/* /onboard/verify-email must render Onboarding so StepVerifyEmail  */}
        {/* auto-advances with the ?token= from the verification email link. */}
        <Route path="/onboard"              element={<Onboarding />} />
        <Route path="/onboard/verify-email" element={<Onboarding />} />

        {/* ── Protected — all routes inside AppShell sidebar ── */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/"               element={<Navigate to="/dashboard" replace />} />

            {/* Overview */}
            <Route path="/dashboard"      element={page(<Dashboard />)} />
            <Route path="/analytics"      element={page(<Monitor />)} />

            {/* Content */}
            <Route path="/connect"        element={page(<Connect embedded />)} />
            <Route path="/website"        element={page(<WebsiteSetup />)} />
            <Route path="/drafts"         element={page(<Drafts />)} />
            <Route path="/search"         element={page(<Monitor />)} />

            {/* Intelligence */}
            <Route path="/gaps"           element={page(<GapDetection />)} />
            <Route path="/trends"         element={page(<Trends />)} />
            <Route path="/schema-factory" element={page(<SchemaFactory />)} />

            {/* Visibility */}
            <Route path="/seo"            element={page(<SEO />)} />
            <Route path="/geo"            element={page(<GEO />)} />

            {/* System */}
            <Route path="/sync"           element={page(<Sync />)} />

            {/* Access */}
            <Route path="/settings"       element={page(<Settings />)} />
            <Route path="/profile"        element={page(<Settings />)} />

            {/* Performance */}
            <Route path="/my-performance" element={page(<TenantDashboard />)} />
            <Route path="/admin/tenants"  element={page(<AdminTenants />)} />
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
