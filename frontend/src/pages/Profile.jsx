import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../lib/icons.jsx';
import { ROLES, useAuth } from '../context/AuthContext.jsx';

export default function Profile() {
  const { user, logout, favorites, toggleFavorite } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="font-display text-2xl font-bold text-forest-ink">Не си влязъл в профил</h1>
        <p className="mt-3 text-forest/70">Влез или се регистрирай, за да видиш профила си.</p>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('unikompas:open-auth'))}
          className="btn-primary mt-6 px-5 py-2.5 text-sm"
        >
          <Icon.users size={16} /> Вход / Регистрация
        </button>
      </div>
    );
  }

  const role = ROLES[user.role];
  const isStudent = user.role === 'student';

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="glass p-6 sm:p-8"
      >
        <div className="flex items-center gap-4">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-accent/20 text-2xl font-bold uppercase text-accent-soft ring-1 ring-accent/30">
            {user.name?.[0] || 'U'}
          </span>
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl font-bold text-forest-ink">{user.name}</h1>
            <p className="truncate text-sm text-forest/70">{user.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="chip border-accent/30 bg-accent/10 py-0.5 text-[11px] text-accent-soft">
                {role?.label}
              </span>
              <span className="chip py-0.5 text-[11px]">
                <Icon.spark size={12} /> {role?.plan}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {user.role === 'university' && (
            <Link to="/universities" className="btn-primary px-4 py-2 text-sm">
              <Icon.plus size={15} /> Публикувай в Университети
            </Link>
          )}
          <button onClick={() => { logout(); navigate('/'); }} className="btn-ghost px-4 py-2 text-sm">
            Изход
          </button>
        </div>
      </motion.div>

      {isStudent && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6"
        >
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-forest-ink">
            <Icon.heart size={18} className="text-accent-soft" /> Запазени университети
            <span className="text-sm font-normal text-forest/50">({favorites.length})</span>
          </h2>

          {favorites.length === 0 ? (
            <div className="glass mt-3 p-6 text-center text-sm text-forest/70">
              Още нямаш запазени университети. Намери своите в{' '}
              <Link to="/search" className="font-semibold text-accent-soft hover:underline">Търсене</Link>.
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {favorites.map((f) => (
                <li key={f.key} className="glass flex items-center gap-3 p-3.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent/15 text-accent-soft ring-1 ring-accent/30">
                    <Icon.cap size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-forest-ink">{f.name}</p>
                    {f.country && <p className="truncate text-xs text-forest/50">{f.country}</p>}
                  </div>
                  <button
                    onClick={() => toggleFavorite({ key: f.key, name: f.name, country: f.country })}
                    className="btn-ghost shrink-0 px-2.5 py-2 text-forest/60 hover:text-forest-ink"
                    aria-label="Премахни от запазени"
                  >
                    <Icon.close size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </motion.div>
      )}
    </div>
  );
}
