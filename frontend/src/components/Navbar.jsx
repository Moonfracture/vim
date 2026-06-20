import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Icon } from '../lib/icons.jsx';
import { ROLES, useAuth } from '../context/AuthContext.jsx';
import AuthModal from './AuthModal.jsx';

const links = [
  { to: '/', label: 'Начало', end: true },
  { to: '/search', label: 'Търсене' },
  { to: '/community', label: 'Общност' },
  { to: '/universities', label: 'Университети' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-ink-950/70 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold text-white">
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
                  isActive ? 'bg-white/[0.06] text-white' : 'text-slate-400 hover:text-white'
                }`}>
              {l.label}
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-2">
              <span className="hidden sm:flex flex-col items-end leading-tight">
                <span className="text-sm font-semibold text-white">{user.name}</span>
                <span className="text-[11px] text-accent-soft">{ROLES[user.role]?.label}</span>
              </span>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-accent/20 text-sm font-bold uppercase text-accent-soft ring-1 ring-accent/30">
                {user.name?.[0] || 'U'}
              </span>
              <button onClick={logout} className="btn-ghost px-3 py-2 text-xs">Изход</button>
            </div>
          ) : (
            <>
              <button onClick={() => setAuthOpen(true)} className="btn-ghost hidden sm:inline-flex">Вход</button>
              <button onClick={() => setAuthOpen(true)} className="btn-primary">Регистрация</button>
            </>
          )}
        </div>
      </nav>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </header>
  );
}
