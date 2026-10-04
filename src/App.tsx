import { BrowserRouter, Routes, Route } from 'react-router-dom';

import { type ReactElement } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { IntelligenceRunProvider } from './contexts/IntelligenceRunContext';
import { PageErrorBoundary } from './components/common/PageErrorBoundary';

// ── Layouts ───────────────────────────────────────────────────────────────────
import AppShell   from './layouts/AppShell';
import AuthLayout from './layouts/AuthLayout';

// ── Auth pages (public) ───────────────────────────────────────────────────────
import Login         from './pages/Login/Login';
import OAuthCallback from './pages/OAuthCallback/OAuthCallback';
import ProtectedRoute from './routes/ProtectedRoute';
import EntryGate from './routes/EntryGate';
import Connect       from './pages/Connect/Connect';

// ── App pages ─────────────────────────────────────────────────────────────────
import TenantDashboard from './pages/TenantDashboard/TenantDashboard';
import ProductIntelligence from './pages/ProductIntelligence/ProductIntelligence';
import MarketIntelligence from './pages/MarketIntelligence/MarketIntelligence';
import IntelligenceRuns from './pages/IntelligenceRuns/IntelligenceRuns';
import Queries from './pages/Queries/Queries';
import Gaps from './pages/Gaps/Gaps';
import Opportunities from './pages/Opportunities/Opportunities';
import Competitors from './pages/Competitors/Competitors';
import ContentStrategies from './pages/ContentStrategies/ContentStrategies';
import Execution from './pages/Execution/Execution';
import PublishedContent from './pages/PublishedContent/PublishedContent';
import SearchPerformance from './pages/SearchPerformance/SearchPerformance';
import SerpObservations from './pages/SerpObservations/SerpObservations';
import Feedback from './pages/Feedback/Feedback';

// ── Helper: wrap element in an error boundary ─────────────────────────────────
function page(el: ReactElement) {
  return <PageErrorBoundary>{el}</PageErrorBoundary>;
}

function App() {
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

        {/* ── Protected entry + canonical application ── */}
        <Route element={<ProtectedRoute />}>
          {/* Website connection is onboarding, not part of the application shell. */}
          <Route path="/websites/connect" element={page(<Connect />)} />

          {/* Canonical application shell. */}
          <Route
              element={
                <IntelligenceRunProvider>
                  <AppShell />
                </IntelligenceRunProvider>
              }
            >
            <Route path="/" element={<EntryGate />} />
            <Route path="/visibility" element={page(<TenantDashboard />)} />
      <Route path="/product-intelligence" element={page(<ProductIntelligence />)} />
      <Route path="/market-intelligence" element={page(<MarketIntelligence />)} />
      <Route path="/intelligence-runs" element={page(<IntelligenceRuns />)} />
      <Route path="/queries" element={page(<Queries />)} />
      <Route path="/gaps" element={page(<Gaps />)} />
      <Route path="/opportunities" element={page(<Opportunities />)} />
      <Route path="/competitors" element={page(<Competitors />)} />
      <Route path="/content-strategies" element={page(<ContentStrategies />)} />
      <Route path="/execution" element={page(<Execution />)} />
      <Route path="/published-content" element={page(<PublishedContent />)} />
      <Route path="/search-performance" element={page(<SearchPerformance />)} />
      <Route path="/serp-observations" element={page(<SerpObservations />)} />
      <Route path="/feedback" element={page(<Feedback />)} />
          </Route>
        </Route>

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
