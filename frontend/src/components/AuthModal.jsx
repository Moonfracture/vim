import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '../lib/icons.jsx';
import { ROLES, useAuth } from '../context/AuthContext.jsx';

export default function AuthModal({ open, onClose }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('signup');
  const [role, setRole] = useState('student');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const reset = () => { setError(''); setForm({ name: '', email: '', password: '' }); };
  const close = () => { reset(); onClose(); };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.email || loading) return;
    setError('');
    setLoading(true);
    try {
      if (mode === 'signup') await register({ name: form.name, email: form.email, password: form.password, role });
      else await login({ email: form.email, password: form.password });
      close();
    } catch (err) {
      setError(err.message || 'Нещо се обърка. Опитай отново.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" onClick={close} />
          <motion.div
            className="glass relative w-full max-w-md p-7"
            initial={{ scale: 0.95, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 10, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          >
            <button onClick={close} className="absolute right-4 top-4 text-slate-400 hover:text-white">
              <Icon.close size={20} />
            </button>

            <h2 className="font-display text-2xl font-bold text-white">
              {mode === 'signup' ? 'Създай профил' : 'Влез в профила си'}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {mode === 'signup' ? 'Започни да сравняваш университети за секунди.' : 'Радваме се да те видим отново.'}
            </p>

            {mode === 'signup' && (
              <div className="mt-5">
                <span className="label">Аз съм</span>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(ROLES).map(([key, r]) => (
                    <button
                      key={key} type="button" onClick={() => setRole(key)}
                      className={`rounded-xl border px-2 py-3 text-center transition-all ${
                        role === key
                          ? 'border-accent/60 bg-accent/15 text-white'
                          : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/25'
                      }`}
                    >
                      <span className="block text-sm font-semibold">{r.label}</span>
                      <span className="mt-0.5 block text-[11px] text-slate-500">{r.plan}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-slate-500">{ROLES[role].hint}</p>
                {role === 'university' && (
                  <p className="mt-2 flex items-center gap-1.5 rounded-lg border border-accent/20 bg-accent/[0.06] px-3 py-2 text-[11px] text-accent-soft">
                    <Icon.spark size={13} /> Платен план — демо режим, без реално плащане.
                  </p>
                )}
              </div>
            )}

            <form onSubmit={submit} className="mt-5 space-y-3">
              {mode === 'signup' && (
                <input className="input" placeholder="Име" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} />
              )}
              <input className="input" type="email" placeholder="Имейл" required value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <input className="input" type="password" placeholder="Парола (поне 6 знака)" required
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />

              {error && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full justify-center disabled:opacity-50">
                {loading ? 'Моля изчакай…' : (mode === 'signup' ? 'Регистрация' : 'Вход')}
                {!loading && <Icon.arrow size={16} />}
              </button>
            </form>

            <p className="mt-4 text-center text-sm text-slate-400">
              {mode === 'signup' ? 'Вече имаш профил?' : 'Нямаш профил?'}{' '}
              <button onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(''); }}
                className="font-semibold text-accent-soft hover:underline">
                {mode === 'signup' ? 'Влез' : 'Създай'}
              </button>
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
