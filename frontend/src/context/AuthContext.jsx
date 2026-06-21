import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { callApi, getToken, setToken } from '../lib/api.js';

const AuthContext = createContext(null);
const USER_KEY = 'unikompas.user';

export const ROLES = {
  student: { label: 'Ученик', hint: 'Търси, сравнява и пита AI асистента', plan: 'Безплатен' },
  university_student: { label: 'Студент', hint: 'Споделя опит и помага на кандидатите', plan: 'Безплатен' },
  university: { label: 'Университет', hint: 'Публикува в „Университети“', plan: 'Платен план' },
  admin: { label: 'Админ', hint: 'Пълен достъп до всички роли', plan: 'Пълен достъп' },
};

// Roles that can engage (AI chat, favorites, community, likes). Admin can do everything.
export const canEngage = (role) => role === 'student' || role === 'university_student' || role === 'admin';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY)) || null; } catch { return null; }
  });
  const [favorites, setFavorites] = useState([]); // [{ key, name, country }]

  // persist the user snapshot (token lives in lib/api.js localStorage)
  useEffect(() => {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  }, [user]);

  const loadFavorites = useCallback(async () => {
    if (!getToken()) { setFavorites([]); return; }
    try {
      const { favorites: f } = await callApi('favorites.list');
      setFavorites(f || []);
    } catch { setFavorites([]); }
  }, []);

  // on mount (and whenever a token exists), refresh the profile + favorites
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    if (!getToken()) return;
    (async () => {
      try {
        const { user: u } = await callApi('me');
        setUser(u);
        if (canEngage(u?.role)) loadFavorites();
      } catch {
        // token invalid/expired — sign out
        setToken(''); setUser(null);
      }
    })();
  }, [loadFavorites]);

  const adopt = (res) => {
    setToken(res.token);
    setUser(res.user);
    if (canEngage(res.user?.role)) loadFavorites(); else setFavorites([]);
    return res.user;
  };

  const register = async ({ name, email, password, role, grade, studyYear, university }) =>
    adopt(await callApi('register', { name, email, password, role, grade, studyYear, university }));
  const login = async ({ email, password }) =>
    adopt(await callApi('login', { email, password }));
  const logout = () => { setToken(''); setUser(null); setFavorites([]); };

  const isFavorite = useCallback((key) => favorites.some((f) => f.key === key), [favorites]);

  // optimistic toggle; reconciles with the server response
  const toggleFavorite = useCallback(async (uni) => {
    if (!canEngage(user?.role)) return;
    const key = uni.key;
    const existed = favorites.some((f) => f.key === key);
    setFavorites((prev) => existed ? prev.filter((f) => f.key !== key)
      : [{ key, name: uni.name, country: uni.country }, ...prev]);
    try {
      const { favorited } = await callApi('favorite.toggle', {
        uniKey: key, uniName: uni.name, uniCountry: uni.country,
      });
      setFavorites((prev) => {
        const without = prev.filter((f) => f.key !== key);
        return favorited ? [{ key, name: uni.name, country: uni.country }, ...without] : without;
      });
    } catch {
      loadFavorites(); // revert to server truth on error
    }
  }, [user, favorites, loadFavorites]);

  return (
    <AuthContext.Provider value={{ user, register, login, logout, favorites, isFavorite, toggleFavorite, reloadFavorites: loadFavorites }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
