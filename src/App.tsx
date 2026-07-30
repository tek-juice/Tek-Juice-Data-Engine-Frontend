import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { destroyActivityFeed } from './services/websocket';

// ── Layouts ───────────────────────────────────────────────────────────────────
import AppShell   from './layouts/AppShell';
import AuthLayout from './layouts/AuthLayout';

// ── Auth pages (public) ───────────────────────────────────────────────────────
import Login         from './pages/Login/Login';
import OAuthCallback from './pages/OAuthCallback/OAuthCallback';
import ProtectedRoute from './routes/ProtectedRoute';

// ── App pages ─────────────────────────────────────────────────────────────────
import Dashboard   from './pages/Dashboard/Dashboard';
import Credentials    from './pages/Credentials/Credentials';
import WebsiteSetup   from './pages/WebsiteSetup/WebsiteSetup';

// ── Placeholder for pages not yet built ──────────────────────────────────────
function Placeholder({ name }: { name: string }) {
  return (
    <div className="flex items-center justify-center h-full min-h-64">
      <div className="text-center">
        <div className="text-sm font-mono text-zinc-500">{name}</div>
        <div className="text-xs text-zinc-700 mt-1">Coming soon</div>
      </div>
    </div>
  );
}

function App() {
  useEffect(() => {
    const handleLogout = () => destroyActivityFeed();
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  return (
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
            <Route path="/dashboard"      element={<Dashboard />} />
            <Route path="/analytics"      element={<Placeholder name="Analytics" />} />

            {/* Content */}
            <Route path="/website"        element={<WebsiteSetup />} />
            <Route path="/drafts"         element={<Placeholder name="Drafts" />} />
            <Route path="/search"         element={<Placeholder name="Search" />} />

            {/* Intelligence */}
            <Route path="/gaps"           element={<Placeholder name="Gap Detection" />} />
            <Route path="/trends"         element={<Placeholder name="Trends" />} />
            <Route path="/schema-factory" element={<Placeholder name="Schema Factory" />} />

            {/* Visibility */}
            <Route path="/seo"            element={<Placeholder name="SEO" />} />
            <Route path="/geo"            element={<Placeholder name="GEO" />} />

            {/* System */}
            <Route path="/sync"           element={<Placeholder name="Sync" />} />
            <Route path="/telemetry"      element={<Placeholder name="Telemetry" />} />

            {/* Access */}
            <Route path="/credentials"    element={<Credentials />} />
            <Route path="/settings"       element={<Placeholder name="Settings" />} />
            <Route path="/profile"        element={<Placeholder name="Profile" />} />
          </Route>
        </Route>

        {/* ── 404 ── */}
        <Route path="*" element={
          <div className="flex items-center justify-center h-screen bg-zinc-950 text-zinc-500 font-mono text-sm">
            404 — page not found
          </div>
        } />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
