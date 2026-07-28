import { Outlet } from 'react-router-dom';

/**
 * AuthLayout — shell for unauthenticated pages (login, etc.).
 */
export default function AuthLayout() {
  return (
    <div className="auth-layout">
      <Outlet />
    </div>
  );
}
