import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setMessage('Password updated — you can now sign in.');
      setTimeout(() => navigate('/login'), 2000);
    }
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
                New Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoFocus
                autoComplete="new-password"
                className="w-full px-4 py-3 rounded-lg border border-black/10 bg-parchment text-ink text-sm font-body focus:outline-none focus:ring-2 focus:ring-gold/40"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest text-ink/50 mb-1.5 font-body">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
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
              disabled={loading || !!message}
              className="w-full py-3 rounded-lg font-body text-sm font-medium text-white transition-opacity disabled:opacity-60"
              style={{ backgroundColor: '#3d2b4a' }}
            >
              {loading ? 'Please wait…' : 'Set new password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
