import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { API_BASE_URL } from './config';
import { canonicalRedirect } from './utils/canonicalOrigin';
import './styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

// Opened on an old http address while the API is on HTTPS: go there, or
// sign-in cookies would never stick ("session expired" right after sign-up).
const redirect = canonicalRedirect(API_BASE_URL, window.location);
if (redirect) window.location.replace(redirect);

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found in index.html');

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
