import { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext(null);
const KEY = 'unikompas.user';

export const ROLES = {
  student: { label: 'Ученик', hint: 'Търси и сравнява университети' },
  parent: { label: 'Родител', hint: 'Помага в избора на детето' },
  university: { label: 'Университет', hint: 'Представя програми и постижения' },
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; }
  });

  useEffect(() => {
    if (user) localStorage.setItem(KEY, JSON.stringify(user));
    else localStorage.removeItem(KEY);
  }, [user]);

  // mock auth — no real backend; persists locally for the demo
  const login = ({ name, email, role }) =>
    setUser({ name: name || email.split('@')[0], email, role, since: Date.now() });
  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
