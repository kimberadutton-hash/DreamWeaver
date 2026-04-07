import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else navigate('/archive');
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setMessage('Check your email to confirm your account.');
    }

    setLoading(false);
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#faf7f2' }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="font-display italic text-5xl text-plum tracking-wide">
            Dream Weaver
          </h1>
          <p className="text-ink/50 text-sm mt-3 font-body">
            tend the thread of what you're becoming
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/70 rounded-2xl shadow-sm border border-black/5 px-8 py-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-widest text-ink/50 mb-1.5 font-body">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-black/10 bg-parchment text-ink text-sm font-body focus:outline-none focus:ring-2 focus:ring-gold/40"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest text-ink/50 mb-1.5 font-body">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-black/10 bg-parchment text-ink text-sm font-body focus:outline-none focus:ring-2 focus:ring-gold/40"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-red-600 text-sm font-body">{error}</p>
            )}
            {message && (
              <p className="text-green-700 text-sm font-body">{message}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg font-body text-sm font-medium text-white transition-opacity disabled:opacity-60"
              style={{ backgroundColor: '#3d2b4a' }}
            >
              {loading ? 'Please wait…' : mode === 'login' ? 'Cross the Threshold' : 'Create Account'}
            </button>
          </form>

          <div className="mt-5 text-center">
            <button
              onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError(''); setMessage(''); }}
              className="text-plum/70 hover:text-plum text-sm font-body transition-colors"
            >
              {mode === 'login' ? 'Beginning? Come in →' : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
