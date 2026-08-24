import { Outlet } from 'react-router-dom';

/**
 * BlankLayout — no chrome, full-page content area.
 */
export default function BlankLayout() {
  return (
    <div className="blank-layout">
      <Outlet />
    </div>
  );
}
