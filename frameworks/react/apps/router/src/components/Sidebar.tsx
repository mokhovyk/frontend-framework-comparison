import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/', label: 'Home' },
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/table', label: 'Table' },
  { path: '/form', label: 'Form' },
  { path: '/profile', label: 'Profile', auth: true },
  { path: '/settings', label: 'Settings', auth: true },
  { path: '/notifications', label: 'Notifications', auth: true },
  { path: '/search', label: 'Search' },
  { path: '/about', label: 'About' },
];

interface SidebarProps {
  isAuthenticated: boolean;
  onLogout: () => void;
}

export default function Sidebar({ isAuthenticated, onLogout }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">React Benchmark</div>
      <nav>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            {item.label}
            {item.auth && !isAuthenticated ? ' \uD83D\uDD12' : ''}
          </NavLink>
        ))}
      </nav>
      <div style={{ padding: '16px', marginTop: 'auto' }}>
        {isAuthenticated ? (
          <button className="secondary" onClick={onLogout} style={{ width: '100%' }}>
            Logout
          </button>
        ) : (
          <NavLink to="/login" className={({ isActive }) => (isActive ? 'active' : '')}>
            Login
          </NavLink>
        )}
      </div>
    </aside>
  );
}
