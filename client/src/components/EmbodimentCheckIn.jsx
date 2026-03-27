import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function EmbodimentCheckIn() {
  const { user } = useAuth();
  const [dream, setDream] = useState(null);
  const [response, setResponse] = useState('');
  const [saving, setSaving] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchCheckIn();
  }, [user]);

  async function fetchCheckIn() {
    const now = new Date();
    const sixDaysAgo = new Date(now - 6 * 24 * 60 * 60 * 1000);
    const tenDaysAgo = new Date(now - 10 * 24 * 60 * 60 * 1000);

    // Show check-in for dreams from 6–10 days ago that haven't been checked in yet
    const { data } = await supabase
      .from('dreams')
      .select('id, title, embodiment_prompt')
      .eq('user_id', user.id)
      .eq('has_analysis', true)
      .not('embodiment_prompt', 'is', null)
      .is('embodiment_checked_at', null)
      .gte('created_at', tenDaysAgo.toISOString())
      .lte('created_at', sixDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (data) {
      setDream(data);
      setTimeout(() => setVisible(true), 100);
    }
  }

  async function handleSave() {
    if (!response.trim() || saving) return;
    setSaving(true);
    setVisible(false);
    await supabase.from('dreams').update({
      embodiment_response: response.trim(),
      embodiment_checked_at: new Date().toISOString(),
    }).eq('id', dream.id);
    setTimeout(() => setDream(null), 400);
  }

  async function handleDismiss() {
    setVisible(false);
    await supabase.from('dreams').update({
      embodiment_checked_at: new Date().toISOString(),
    }).eq('id', dream.id);
    setTimeout(() => setDream(null), 400);
  }

  if (!dream) return null;

  return (
    <div
      className="mx-6 mt-5 mb-1"
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.5s ease',
      }}
    >
      <div
        className="rounded-r-xl px-6 py-5 shadow-sm border border-black/6 dark:border-white/6 bg-[#faf7f2] dark:bg-gray-800"
        style={{ borderLeft: '4px solid #b8924a' }}
      >
        {/* Dream title */}
        <p className="font-display italic text-lg text-ink dark:text-white mb-1 leading-snug">
          {dream.title || 'A dream from last week'}
        </p>

        {/* Embodiment prompt in Cormorant italic */}
        <p className="font-display italic text-sm text-ink/60 leading-relaxed mb-4">
          {dream.embodiment_prompt}
        </p>

        {/* Check-in prompt */}
        <p className="text-xs font-body text-ink/50 mb-2">
          Did anything shift this week?
        </p>

        {/* Response textarea */}
        <textarea
          value={response}
          onChange={e => setResponse(e.target.value)}
          rows={3}
          placeholder="Even something small…"
          className="w-full px-3 py-2.5 rounded-lg border border-black/10 bg-white/80 text-sm font-body text-ink resize-none focus:outline-none focus:ring-2 focus:ring-gold/30 placeholder-ink/25"
        />

        {/* Actions */}
        <div className="flex items-center gap-3 mt-3">
          <button
            onClick={handleSave}
            disabled={saving || !response.trim()}
            className="px-4 py-2 rounded-lg text-sm font-body font-medium text-white bg-plum disabled:opacity-40 transition-opacity"
          >
            {saving ? 'Saving…' : 'Save reflection'}
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 py-2 rounded-lg text-sm font-body text-ink/45 hover:text-ink/70 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
