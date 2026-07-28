import { Navigate, Outlet } from 'react-router-dom';
import { isAuthenticated } from '../services/auth.service';

/**
 * ProtectedRoute — redirects to /login if the user is not authenticated.
 * Wraps all app routes that require auth.
 */
export default function ProtectedRoute() {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
