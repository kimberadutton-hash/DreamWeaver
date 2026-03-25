import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { MOODS } from '../lib/constants';

export default function EditDream() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDream();
  }, [id]);

  async function fetchDream() {
    const { data } = await supabase.from('dreams').select('*').eq('id', id).eq('user_id', user.id).single();
    if (!data) { navigate('/archive'); return; }
    setForm({
      dream_date: data.dream_date,
      title: data.title || '',
      body: data.body || '',
      dreamer_associations: data.dreamer_associations || '',
      moods: data.mood || [],
      is_big_dream: data.is_big_dream || false,
      notes: data.notes || '',
      analyst_session: data.analyst_session || '',
      tags: (data.tags || []).join(', '),
    });
  }

  function setField(key, val) {
    setForm(f => ({ ...f, [key]: val }));
  }

  async function handleSave() {
    if (!form.body.trim()) { setError('Dream body cannot be empty.'); return; }
    setSaving(true);
    setError('');
    const { moods, tags: rawTags, ...rest } = form;
    const tags = rawTags ? rawTags.split(',').map(t => t.trim()).filter(Boolean) : [];
    const mood = moods.length > 0 ? moods : null;
    const { error: dbErr } = await supabase
      .from('dreams')
      .update({ ...rest, mood, tags })
      .eq('id', id);
    if (dbErr) { setError(dbErr.message); setSaving(false); return; }
    navigate(`/dream/${id}`);
  }

  if (!form) {
    return <div className="flex items-center justify-center h-64"><p className="font-display italic text-xl text-ink/40">Loading…</p></div>;
  }

  const analystLabel = profile?.analyst_name || 'Analyst';

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <div className="flex items-center gap-4 mb-8">
        <Link to={`/dream/${id}`} className="text-sm font-body text-ink/40 hover:text-ink dark:text-white/40 dark:hover:text-white">← Back</Link>
        <h1 className="font-display italic text-3xl text-ink dark:text-white">Edit Dream</h1>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="field-label">Date</label>
            <input type="date" value={form.dream_date} onChange={e => setField('dream_date', e.target.value)} className="field-input" />
          </div>
          <div>
            <label className="field-label">Title</label>
            <input type="text" value={form.title} onChange={e => setField('title', e.target.value)} className="field-input" />
          </div>
        </div>

        <div>
          <label className="field-label">The Dream</label>
          <textarea value={form.body} onChange={e => setField('body', e.target.value)} rows={10} className="w-full px-4 py-4 rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 text-ink dark:text-white/90 font-dream resize-y focus:outline-none focus:ring-2 focus:ring-gold/40" />
        </div>

        <div>
          <label className="field-label">Before analysis — what words, images, or feelings stand out to you from this dream?</label>
          <textarea value={form.dreamer_associations} onChange={e => setField('dreamer_associations', e.target.value)} rows={3} className="field-input resize-y"
            placeholder="Free associations, first impressions, anything that catches your attention…" />
        </div>

        <div>
          <label className="field-label">Mood <span className="normal-case tracking-normal text-xs text-ink/30">Select all that apply</span></label>
          <div className="flex flex-wrap gap-2">
            {MOODS.map(m => {
              const active = form.moods.includes(m);
              return (
                <button key={m} type="button"
                  onClick={() => setField('moods', active ? form.moods.filter(x => x !== m) : [...form.moods, m])}
                  className={`px-3 py-1.5 rounded-full text-sm font-body transition-all ${active ? 'bg-plum text-white' : 'bg-black/5 dark:bg-white/10 text-ink/70 dark:text-white/60 hover:bg-black/10'}`}>
                  {m}
                </button>
              );
            })}
          </div>
        </div>

        {/* Big Dream toggle */}
        <div className="flex items-center justify-between py-3 border-t border-b border-black/8 dark:border-white/8">
          <div>
            <p className="text-sm font-body text-ink dark:text-white flex items-center gap-1.5">
              <span className="text-gold">✦</span> Big Dream
            </p>
            <p className="text-xs text-ink/40 dark:text-white/30 font-body mt-0.5">
              A numinous or archetypal dream of unusual significance
            </p>
          </div>
          <button
            type="button"
            onClick={() => setField('is_big_dream', !form.is_big_dream)}
            className={`relative w-12 h-6 rounded-full transition-colors ${form.is_big_dream ? 'bg-gold' : 'bg-black/20 dark:bg-white/20'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.is_big_dream ? 'translate-x-6' : ''}`} />
          </button>
        </div>

        <div>
          <label className="field-label">My Notes <span className="text-xs text-ink/30 normal-case tracking-normal">Private — never shared with AI</span></label>
          <textarea value={form.notes} onChange={e => setField('notes', e.target.value)} rows={3} className="field-input resize-y" />
        </div>

        <div>
          <label className="field-label">{analystLabel} Session</label>
          <textarea value={form.analyst_session} onChange={e => setField('analyst_session', e.target.value)} rows={3} className="field-input resize-y" />
        </div>

        <div>
          <label className="field-label">Tags <span className="text-xs text-ink/30 normal-case tracking-normal">Comma-separated</span></label>
          <input type="text" value={form.tags} onChange={e => setField('tags', e.target.value)} className="field-input" />
        </div>

        {error && <p className="text-red-600 text-sm font-body">{error}</p>}

        <div className="flex gap-3">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-3 rounded-xl font-body text-sm font-medium text-white disabled:opacity-50 bg-plum">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <Link to={`/dream/${id}`} className="px-6 py-3 rounded-xl font-body text-sm font-medium border border-black/15 dark:border-white/15 text-ink/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-center">
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}
