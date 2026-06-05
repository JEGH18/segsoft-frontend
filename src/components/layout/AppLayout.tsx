import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/store/authStore';
import { logout as apiLogout } from '@/api/auth';

function ShieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/analyses', label: 'Análisis', end: false },
  { to: '/policies', label: 'Policies', end: false },
  { to: '/reports', label: 'History', end: false },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await apiLogout();
    } finally {
      logout();
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-8">
              <NavLink to="/" className="flex items-center gap-2 text-neutral-900 font-bold text-base tracking-tight">
                <span className="text-neutral-900"><ShieldIcon /></span>
                <span>SecPolicy<span className="font-normal"> Analyzer</span></span>
              </NavLink>

              <nav className="flex items-end gap-6 h-14" aria-label="Navegación principal">
                {navItems.map(({ to, label, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      isActive ? 'nav-link-active' : 'nav-link'
                    }
                  >
                    {label}
                  </NavLink>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-3">
              {user && (
                <span className="text-sm text-neutral-500">
                  {user.username}
                  <span className="ml-2 text-xs bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded font-mono">
                    {user.roles[0]}
                  </span>
                </span>
              )}
              <button
                onClick={handleLogout}
                title="Cerrar sesión"
                className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
              >
                <LogoutIcon />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
