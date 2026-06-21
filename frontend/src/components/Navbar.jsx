import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Icon } from '../lib/icons.jsx';
import { ROLES, useAuth } from '../context/AuthContext.jsx';
import AuthModal from './AuthModal.jsx';

const links = [
  { to: '/', label: 'Начало', end: true },
  { to: '/search', label: 'Търсене' },
  { to: '/calculator', label: 'Балообразуване' },
  { to: '/community', label: 'Общност' },
  { to: '/universities', label: 'Университети' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const openAuth = (mode) => { setMenuOpen(false); setAuthMode(mode); setAuthOpen(true); };
  const doLogout = () => { setMenuOpen(false); logout(); navigate('/'); };

  // close the mobile menu whenever the route changes
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  // let other parts of the app (e.g. the gated chatbot) ask to open the login modal
  useEffect(() => {
    const open = () => openAuth('login');
    window.addEventListener('unikompas:open-auth', open);
    return () => window.removeEventListener('unikompas:open-auth', open);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-forest/10 bg-ink-950/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold text-forest-ink">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent/15 text-accent-soft ring-1 ring-accent/30">
            <Icon.compass size={20} />
          </span>
          Уни<span className="grad-text">Компас</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}
              className={({ isActive }) =>
                `rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-forest/[0.07] text-forest-ink' : 'text-forest/60 hover:text-forest-ink'
                }`}>
              {l.label}
            </NavLink>
          ))}
        </div>

        {/* Desktop auth / profile */}
        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <div className="flex items-center gap-2">
              <Link to="/profile" className="flex items-center gap-2 rounded-full pl-1 pr-1 transition-colors hover:bg-forest/[0.06]">
                <span className="flex flex-col items-end leading-tight">
                  <span className="text-sm font-semibold text-forest-ink">{user.name}</span>
                  <span className="text-[11px] text-accent-soft">{ROLES[user.role]?.label}</span>
                </span>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-accent/20 text-sm font-bold uppercase text-accent-soft ring-1 ring-accent/30">
                  {user.name?.[0] || 'U'}
                </span>
              </Link>
              <button onClick={doLogout} className="btn-ghost px-3 py-2 text-xs">Изход</button>
            </div>
          ) : (
            <>
              <button onClick={() => openAuth('login')} className="btn-ghost">Вход</button>
              <button onClick={() => openAuth('signup')} className="btn-primary">Регистрация</button>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          aria-label="Меню"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
          className="btn-ghost px-2.5 py-2 md:hidden"
        >
          <Icon.menu size={20} />
        </button>
      </nav>

      {/* Mobile menu panel */}
      {menuOpen && (
        <div className="border-t border-forest/10 bg-ink-950/95 px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end}
                className={({ isActive }) =>
                  `rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
                    isActive ? 'bg-forest/[0.07] text-forest-ink' : 'text-forest/70 hover:bg-forest/[0.05] hover:text-forest-ink'
                  }`}>
                {l.label}
              </NavLink>
            ))}
          </div>

          <div className="mt-3 border-t border-forest/10 pt-3">
            {user ? (
              <div className="flex flex-col gap-2">
                <Link to="/profile" className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-forest/[0.05]">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-accent/20 text-sm font-bold uppercase text-accent-soft ring-1 ring-accent/30">
                    {user.name?.[0] || 'U'}
                  </span>
                  <span className="flex flex-col leading-tight">
                    <span className="text-sm font-semibold text-forest-ink">{user.name}</span>
                    <span className="text-[11px] text-accent-soft">{ROLES[user.role]?.label}</span>
                  </span>
                </Link>
                <button onClick={doLogout} className="btn-ghost w-full justify-center">Изход</button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <button onClick={() => openAuth('login')} className="btn-ghost w-full justify-center">Вход</button>
                <button onClick={() => openAuth('signup')} className="btn-primary w-full justify-center">Регистрация</button>
              </div>
            )}
          </div>
        </div>
      )}

      <AuthModal open={authOpen} initialMode={authMode} onClose={() => setAuthOpen(false)} />
    </header>
  );
}
