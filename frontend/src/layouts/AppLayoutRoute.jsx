import { Outlet, useLocation } from 'react-router-dom';
import AppLayout from './AppLayout';

// Cấu hình hide theo từng path — thêm path mới vào đây khi cần
const LAYOUT_CONFIG = {
  '/profile':       { hideSidebar: true },
  '/groups':        { hideSidebar: true },
  '/schedule':      { hideSidebar: true },
  '/friends':       { hideRightSidebar: true },
  '/my-documents':  { hideRightSidebar: true },
  '/chat':          { hideSidebar: true },
  // '/' và '/friends/:id' dùng mặc định (không hide gì) -> không cần khai báo
};

function matchConfig(pathname) {
  // Match /groups/:id
  if (pathname.startsWith('/groups/')) {
    return { hideSidebar: true };
  }
  // Match /friends/:id
  if (pathname.startsWith('/friends/')) {
    return { hideSidebar: true, hideRightSidebar: true };
  }
  return LAYOUT_CONFIG[pathname] || {};
}

export default function AppLayoutRoute() {
  const location = useLocation();
  const config = matchConfig(location.pathname);

  return (
    <AppLayout {...config}>
      <Outlet />
    </AppLayout>
  );
}
