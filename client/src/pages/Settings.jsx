import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApiKey } from '../hooks/useApiKey';
import { supabase } from '../lib/supabase';

export default function Settings() {
  const { user, profile, updateProfile } = useAuth();
  const { apiKey, saveApiKey, hasKey } = useApiKey();

  const [form, setForm] = useState({
    display_name: profile?.display_name || '',
    analyst_name: profile?.analyst_name || 'Analyst',
    analyst_email: profile?.analyst_email || '',
    dark_mode: profile?.dark_mode || false,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profileError, setProfileError] = useState('');

  const [keyDraft, setKeyDraft] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);
  const [keySaved, setKeySaved] = useState(false);

  function setField(key, val) {
    setForm(f => ({ ...f, [key]: val }));
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setProfileError('');
    const { error } = await updateProfile(form);
    if (error) setProfileError(error.message);
    else setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 3000);
  }

  function handleSaveKey(e) {
    e.preventDefault();
    saveApiKey(keyDraft);
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 3000);
  }

  return (
    <div className="max-w-xl mx-auto px-8 py-10 space-y-12">
      <h1 className="font-display italic text-4xl text-ink dark:text-white">
        Settings
      </h1>

      {/* ── Profile ─────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs uppercase tracking-widest font-body text-ink/40 dark:text-white/30 mb-5">
          Profile
        </h2>
        <form onSubmit={handleSaveProfile} className="space-y-5">
          <div>
            <label className="field-label">Display Name</label>
            <input type="text" value={form.display_name} onChange={e => setField('display_name', e.target.value)}
              placeholder="Your name" className="field-input" />
          </div>
          <div>
            <label className="field-label">Analyst Name</label>
            <input type="text" value={form.analyst_name} onChange={e => setField('analyst_name', e.target.value)}
              placeholder="Analyst" className="field-input" />
            <p className="text-xs text-ink/40 dark:text-white/30 font-body mt-1">
              Renames the "Analyst Session" field throughout the app.
            </p>
          </div>
          <div>
            <label className="field-label">Analyst Email</label>
            <input type="email" value={form.analyst_email} onChange={e => setField('analyst_email', e.target.value)}
              placeholder="therapist@example.com" className="field-input" />
            <p className="text-xs text-ink/40 dark:text-white/30 font-body mt-1">
              Used by the "Email Analyst" button on dream detail pages.
            </p>
          </div>

          {/* Dark mode toggle */}
          <div className="flex items-center justify-between py-3 border-t border-b border-black/8 dark:border-white/8">
            <div>
              <p className="text-sm font-body text-ink dark:text-white">Dark Mode</p>
              <p className="text-xs text-ink/40 dark:text-white/30 font-body">Easier on the eyes at night</p>
            </div>
            <button type="button" onClick={() => setField('dark_mode', !form.dark_mode)}
              className={`relative w-12 h-6 rounded-full transition-colors ${form.dark_mode ? 'bg-plum' : 'bg-black/20'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.dark_mode ? 'translate-x-6' : ''}`} />
            </button>
          </div>

          <div className="py-2">
            <p className="text-xs uppercase tracking-widest text-ink/30 dark:text-white/30 font-body mb-1">Account</p>
            <p className="text-sm font-body text-ink/60 dark:text-white/50">{user?.email}</p>
          </div>

          {profileError && <p className="text-red-600 text-sm font-body">{profileError}</p>}
          {saved && <p className="text-green-700 text-sm font-body">Settings saved.</p>}

          <button type="submit" disabled={saving}
            className="w-full py-3 rounded-xl font-body text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: '#3d2b4a' }}>
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </form>
      </section>

      {/* ── Anthropic API Key ────────────────────────────────── */}
      <section>
        <h2 className="text-xs uppercase tracking-widest font-body text-ink/40 dark:text-white/30 mb-5">
          AI Access
        </h2>

        {/* Status indicator */}
        <div className={`flex items-center gap-2 mb-5 px-4 py-3 rounded-xl text-sm font-body ${
          hasKey
            ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400'
            : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'
        }`}>
          <span>{hasKey ? '●' : '○'}</span>
          {hasKey ? 'API key configured — AI features are enabled.' : 'No API key — AI features are disabled.'}
        </div>

        <form onSubmit={handleSaveKey} className="space-y-4">
          <div>
            <label className="field-label">Anthropic API Key</label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={keyDraft}
                onChange={e => setKeyDraft(e.target.value)}
                placeholder="sk-ant-..."
                className="field-input pr-16 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => setShowKey(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-body text-ink/40 hover:text-ink dark:text-white/30 dark:hover:text-white"
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="text-xs text-ink/40 dark:text-white/30 font-body mt-2 leading-relaxed">
              Required for AI features. Get a free key at{' '}
              <span className="text-plum dark:text-gold">console.anthropic.com</span>.
              Your key is stored only on your device and never sent to our servers.
            </p>
          </div>

          {keySaved && (
            <p className="text-green-700 dark:text-green-400 text-sm font-body">
              {keyDraft.trim() ? 'API key saved.' : 'API key removed.'}
            </p>
          )}

          <div className="flex gap-3">
            <button type="submit"
              className="flex-1 py-3 rounded-xl font-body text-sm font-medium text-white"
              style={{ backgroundColor: '#3d2b4a' }}>
              Save Key
            </button>
            {hasKey && (
              <button type="button"
                onClick={() => { setKeyDraft(''); saveApiKey(''); setKeySaved(true); setTimeout(() => setKeySaved(false), 3000); }}
                className="px-5 py-3 rounded-xl font-body text-sm font-medium border border-red-200 dark:border-red-900 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
                Remove
              </button>
            )}
          </div>
        </form>
      </section>

      {/* ── Data & Maintenance ───────────────────────────────── */}
      <section>
        <h2 className="text-xs uppercase tracking-widest font-body text-ink/40 dark:text-white/30 mb-5">
          Data & Maintenance
        </h2>
        <CleanupButton userId={user.id} />
      </section>
    </div>
  );
}

function CleanupButton({ userId }) {
  const [status, setStatus] = useState('idle'); // 'idle' | 'scanning' | 'preview' | 'running' | 'done'
  const [preview, setPreview] = useState(null); // { removedCount, mergedCount, updates }
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const CATEGORY_NAMES = new Set([
    'the shadow','shadow','the animus','animus','the anima','anima',
    'the great mother','great mother','the wise guide','wise guide',
    'the child','child','inner child','the trickster','trickster',
    'the self','self','animals & creatures','animals','the body','body',
    'thresholds & journeys','structures & spaces','natural elements',
    'transformation','core emotions','emotions','relational figures',
    'voice & expression','belonging & identity','feminine power',
    'archetypal figures','dream symbols','emotional landscape',
  ]);

  function isBadTag(tag) {
    if (!tag?.trim()) return true;
    const t = tag.trim();
    if (t.length > 40) return true;
    if (t.split(/\s+/).length > 4) return true;
    if (/^[-•*]/.test(t)) return true;
    if (/^["'""\u201c\u201d]/.test(t)) return true;
    if (/\([^)]{12,}\)/.test(t)) return true;
    if (CATEGORY_NAMES.has(t.toLowerCase())) return true;
    if (/class=|id=|placeholder=|<[a-z]/i.test(t)) return true;
    return false;
  }

  async function handleScan() {
    setStatus('scanning');
    setError('');
    try {
      const { data: dreams } = await supabase
        .from('dreams')
        .select('id, tags, archetypes, symbols')
        .eq('user_id', userId);

      if (!dreams?.length) { setPreview({ removedCount: 0, mergedCount: 0, updates: [] }); setStatus('preview'); return; }

      // Count each tag variant archive-wide (normalize by stripping "the/a/an" prefix)
      const variantCount = {}; // normalizedKey → { [lowerVariant]: count }
      dreams.forEach(dream => {
        [...(dream.tags||[]), ...(dream.archetypes||[]), ...(dream.symbols||[])].forEach(tag => {
          if (!tag?.trim()) return;
          const norm = tag.trim().toLowerCase().replace(/^(the|an?)\s+/i, '');
          const lc = tag.trim().toLowerCase();
          if (!variantCount[norm]) variantCount[norm] = {};
          variantCount[norm][lc] = (variantCount[norm][lc] || 0) + 1;
        });
      });

      // Pick preferred form (most frequent; tie → shorter; tie → alphabetical)
      const preferred = {}; // lowerVariant → preferredLowerForm
      Object.values(variantCount).forEach(variants => {
        const sorted = Object.entries(variants).sort((a, b) =>
          b[1] - a[1] || a[0].length - b[0].length || a[0].localeCompare(b[0])
        );
        const best = sorted[0][0];
        sorted.forEach(([v]) => { preferred[v] = best; });
      });

      // Clean each dream
      let removedCount = 0;
      let mergedCount = 0;
      const updates = [];

      dreams.forEach(dream => {
        function cleanArr(arr) {
          if (!arr?.length) return { out: [], removed: 0, merged: 0 };
          const seen = new Set();
          const out = [];
          let removed = 0, merged = 0;
          arr.forEach(tag => {
            if (isBadTag(tag)) { removed++; return; }
            const lc = tag.trim().toLowerCase();
            const pref = preferred[lc] || lc;
            if (seen.has(pref)) { merged++; return; }
            seen.add(pref);
            // Restore original casing of preferred form if it matches, else use preferred lowercase
            const original = arr.find(t => t?.trim().toLowerCase() === pref);
            out.push(original?.trim() || pref);
          });
          return { out, removed, merged };
        }
        const t = cleanArr(dream.tags);
        const a = cleanArr(dream.archetypes);
        const s = cleanArr(dream.symbols);
        const changed = t.removed + a.removed + s.removed + t.merged + a.merged + s.merged;
        if (changed > 0) {
          removedCount += t.removed + a.removed + s.removed;
          mergedCount += t.merged + a.merged + s.merged;
          updates.push({ id: dream.id, tags: t.out, archetypes: a.out, symbols: s.out });
        }
      });

      setPreview({ removedCount, mergedCount, updates });
      setStatus('preview');
    } catch (err) {
      setError(err.message);
      setStatus('idle');
    }
  }

  async function handleApply() {
    setStatus('running');
    try {
      for (const u of preview.updates) {
        await supabase.from('dreams').update({ tags: u.tags, archetypes: u.archetypes, symbols: u.symbols }).eq('id', u.id);
      }
      setResult({ removedCount: preview.removedCount, mergedCount: preview.mergedCount, dreamsUpdated: preview.updates.length });
      setStatus('done');
    } catch (err) {
      setError(err.message);
      setStatus('preview');
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-body text-ink/60 dark:text-white/50 leading-relaxed">
        Scan your archive for malformed tags (too long, HTML fragments, category name labels) and near-duplicate tags ("The Shadow" vs "Shadow") and clean them up.
      </p>

      {status === 'idle' && (
        <button onClick={handleScan}
          className="px-5 py-2.5 rounded-xl font-body text-sm border border-black/15 dark:border-white/15 text-ink/70 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
          Scan for bad tags
        </button>
      )}

      {status === 'scanning' && (
        <p className="text-sm font-body text-ink/40 dark:text-white/30 italic">Scanning…</p>
      )}

      {status === 'preview' && preview && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 space-y-3">
          {preview.removedCount === 0 && preview.mergedCount === 0 ? (
            <p className="text-sm font-body text-amber-800 dark:text-amber-300">✓ Your tags look clean — nothing to remove.</p>
          ) : (
            <>
              <p className="text-sm font-body text-amber-800 dark:text-amber-300">
                Found <strong>{preview.removedCount}</strong> bad tag{preview.removedCount !== 1 ? 's' : ''} to remove
                {preview.mergedCount > 0 && <> and <strong>{preview.mergedCount}</strong> duplicate{preview.mergedCount !== 1 ? 's' : ''} to merge</>}
                {' '}across <strong>{preview.updates.length}</strong> dream{preview.updates.length !== 1 ? 's' : ''}.
              </p>
              <div className="flex gap-2">
                <button onClick={handleApply}
                  className="px-4 py-2 rounded-lg font-body text-sm font-medium text-white transition-colors"
                  style={{ backgroundColor: '#3d2b4a' }}>
                  Apply cleanup
                </button>
                <button onClick={() => { setStatus('idle'); setPreview(null); }}
                  className="px-4 py-2 rounded-lg font-body text-sm border border-black/15 dark:border-white/15 text-ink/60 dark:text-white/50 hover:bg-black/5 transition-colors">
                  Cancel
                </button>
              </div>
            </>
          )}
          {preview.removedCount === 0 && preview.mergedCount === 0 && (
            <button onClick={() => { setStatus('idle'); setPreview(null); }}
              className="text-xs font-body text-amber-700 dark:text-amber-400 underline">
              Dismiss
            </button>
          )}
        </div>
      )}

      {status === 'running' && (
        <p className="text-sm font-body text-ink/40 dark:text-white/30 italic">Cleaning up {preview.updates.length} dreams…</p>
      )}

      {status === 'done' && result && (
        <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
          <p className="text-sm font-body text-green-800 dark:text-green-300">
            ✓ Done. Removed {result.removedCount} tag{result.removedCount !== 1 ? 's' : ''}
            {result.mergedCount > 0 && `, merged ${result.mergedCount} duplicate${result.mergedCount !== 1 ? 's' : ''}`}
            {' '}across {result.dreamsUpdated} dream{result.dreamsUpdated !== 1 ? 's' : ''}.
          </p>
          <button onClick={() => { setStatus('idle'); setPreview(null); setResult(null); }}
            className="mt-2 text-xs font-body text-green-700 dark:text-green-400 underline">
            Dismiss
          </button>
        </div>
      )}

      {error && <p className="text-red-500 text-sm font-body">{error}</p>}
    </div>
  );
}
