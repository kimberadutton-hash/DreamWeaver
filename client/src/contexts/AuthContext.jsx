import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dreamCount, setDreamCount] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        window.location.href = '/reset-password';
        return;
      }
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else { setProfile(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId) {
    try {
      const [{ data }, { count }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('dreams').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      ]);
      setProfile(data);
      setDreamCount(count || 0);
      if (data?.dark_mode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch {
      // profile fetch failed — proceed without profile so loading never hangs
    } finally {
      setLoading(false);
    }
  }

  async function refreshDreamCount() {
    if (!user) return;
    const { count } = await supabase
      .from('dreams')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
    setDreamCount(count || 0);
  }

  async function updateProfile(updates) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();
    if (!error) {
      setProfile(data);
      if ('dark_mode' in updates) {
        if (updates.dark_mode) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
      }
    }
    return { data, error };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, updateProfile, signOut, dreamCount, refreshDreamCount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
