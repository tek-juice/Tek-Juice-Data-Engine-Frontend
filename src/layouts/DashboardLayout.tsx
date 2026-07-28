import { Outlet } from 'react-router-dom';

/**
 * DashboardLayout — transparent pass-through shell.
 * Each page manages its own full-height layout.
 */
export default function DashboardLayout() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Outlet />
    </div>
  );
}
