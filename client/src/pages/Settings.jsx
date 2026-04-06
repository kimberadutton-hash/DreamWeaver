import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApiKey } from '../hooks/useApiKey';
import { usePrivacySettings } from '../hooks/usePrivacySettings';
import { supabase } from '../lib/supabase';

function ChangePasswordSection() {
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (newPassword !== confirm) { setError('Passwords do not match.'); return; }
    setSaving(true);
    const { error: err } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    if (err) { setError(err.message); return; }
    setSaved(true);
    setNewPassword('');
    setConfirm('');
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <section>
      <h2 className="text-xs uppercase tracking-widest font-body text-ink/40 dark:text-white/30 mb-5">
        Change Password
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="field-label">New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="At least 6 characters"
            className="field-input"
            autoComplete="new-password"
          />
        </div>
        <div>
          <label className="field-label">Confirm Password</label>
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Repeat new password"
            className="field-input"
            autoComplete="new-password"
          />
        </div>
        {error && <p className="text-red-600 text-sm font-body">{error}</p>}
        {saved && <p className="text-green-700 dark:text-green-400 text-sm font-body">Password updated.</p>}
        <button
          type="submit"
          disabled={saving || !newPassword || !confirm}
          className="w-full py-3 rounded-xl font-body text-sm font-medium text-white disabled:opacity-50 bg-plum"
        >
          {saving ? 'Updating…' : 'Update Password'}
        </button>
      </form>
    </section>
  );
}

export default function Settings() {
  const { user, profile, updateProfile } = useAuth();
  const { apiKey, saveApiKey, hasKey } = useApiKey();
  const { privacySettings, savePrivacySettings } = usePrivacySettings();
  const [privacySaving, setPrivacySaving] = useState(null); // key currently being saved
  const [privacySaved, setPrivacySaved] = useState(null);   // key last saved (for flash)

  // Guide status: derived from profile on mount
  const initialGuideStatus = profile?.solo_practitioner
    ? 'independent'
    : Boolean(profile?.analyst_name?.trim())
      ? 'guide'
      : 'exploring';
  const [guideStatus, setGuideStatus] = useState(initialGuideStatus);

  const [form, setForm] = useState({
    display_name: profile?.display_name || '',
    analyst_name: profile?.analyst_name || '',
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

  function handleGuideStatusChange(newStatus) {
    if (guideStatus === 'guide' && newStatus !== 'guide') {
      if (!confirm("Remove your guide? Analyst Focus and Session Letter will be hidden. Your data won't be deleted.")) return;
    }
    setGuideStatus(newStatus);
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setProfileError('');
    const guideFields = guideStatus === 'guide'
      ? { analyst_name: form.analyst_name.trim() || null, analyst_email: form.analyst_email.trim() || null }
      : { analyst_name: null, analyst_email: null };
    const { error } = await updateProfile({
      display_name: form.display_name,
      dark_mode: form.dark_mode,
      solo_practitioner: guideStatus === 'independent',
      ...guideFields,
    });
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

  async function togglePrivacy(key) {
    setPrivacySaving(key);
    await savePrivacySettings({ [key]: !privacySettings[key] });
    setPrivacySaving(null);
    setPrivacySaved(key);
    setTimeout(() => setPrivacySaved(null), 2000);
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
          {/* Guide status selector */}
          <div>
            <label className="field-label">Guide relationship</label>
            <div className="flex gap-2 mt-2">
              {[
                { key: 'guide', label: 'Works with a guide' },
                { key: 'exploring', label: 'Exploring' },
                { key: 'independent', label: 'Independent' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleGuideStatusChange(key)}
                  className="flex-1 py-2 px-2 rounded-lg text-xs font-body border transition-all"
                  style={{
                    borderColor: guideStatus === key ? '#b8924a' : 'rgba(0,0,0,0.12)',
                    backgroundColor: guideStatus === key ? 'rgba(184,146,74,0.08)' : 'transparent',
                    color: guideStatus === key ? '#b8924a' : undefined,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Guide name/email — only shown when working with a guide */}
          {guideStatus === 'guide' && (
            <>
              <div>
                <label className="field-label">Their name</label>
                <input type="text" value={form.analyst_name} onChange={e => setField('analyst_name', e.target.value)}
                  placeholder="Analyst or therapist name" className="field-input" />
              </div>
              <div>
                <label className="field-label">
                  Their email{' '}
                  <span className="normal-case tracking-normal text-xs text-ink/30 font-body font-normal">
                    (optional — for the session letter feature)
                  </span>
                </label>
                <input type="email" value={form.analyst_email} onChange={e => setField('analyst_email', e.target.value)}
                  placeholder="therapist@example.com" className="field-input" />
              </div>
            </>
          )}

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

      {/* ── AI Privacy Controls ──────────────────────────────── */}
      {/* NOTE: AI-generated reflections stored in Supabase may have been informed
          by notes, analyst_session, or analyst_focus content when sharing was
          enabled at analysis time. These fields are never stored in the reflection
          field — only the AI's interpretation of them. Disabling sharing stops
          future inclusion but does not alter past analyses. */}
      <section>
        <h2 className="text-xs uppercase tracking-widest font-body text-ink/40 dark:text-white/30 mb-5">
          AI Privacy Controls
        </h2>
        <p className="text-sm font-body text-ink/60 dark:text-white/50 leading-relaxed mb-6">
          Choose which private fields are included in your Anthropic API prompts during dream analysis. When enabled, that content is sent to Anthropic — it is not stored on our servers.
        </p>

        <div className="space-y-1">
          {/* Share My Notes */}
          <div className="flex items-center justify-between py-4 border-t border-black/8 dark:border-white/8">
            <div>
              <p className="text-sm font-body text-ink dark:text-white">Share "My Notes" with AI</p>
              <p className="text-xs text-ink/40 dark:text-white/30 font-body mt-0.5">
                Sends your personal notes to Anthropic as context for dream analysis
              </p>
            </div>
            <button
              type="button"
              disabled={privacySaving === 'share_notes_with_ai'}
              onClick={() => togglePrivacy('share_notes_with_ai')}
              className={`relative w-12 h-6 rounded-full transition-colors disabled:opacity-60 ${
                privacySettings.share_notes_with_ai ? 'bg-amber-500' : 'bg-black/20 dark:bg-white/20'
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                privacySettings.share_notes_with_ai ? 'translate-x-6' : ''
              }`} />
            </button>
          </div>

          {/* Share Analyst Session */}
          <div className="flex items-center justify-between py-4 border-t border-black/8 dark:border-white/8">
            <div>
              <p className="text-sm font-body text-ink dark:text-white">Share "Analyst Session" with AI</p>
              <p className="text-xs text-ink/40 dark:text-white/30 font-body mt-0.5">
                Sends your analyst session notes to Anthropic as context for dream analysis
              </p>
            </div>
            <button
              type="button"
              disabled={privacySaving === 'share_analyst_session_with_ai'}
              onClick={() => togglePrivacy('share_analyst_session_with_ai')}
              className={`relative w-12 h-6 rounded-full transition-colors disabled:opacity-60 ${
                privacySettings.share_analyst_session_with_ai ? 'bg-amber-500' : 'bg-black/20 dark:bg-white/20'
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                privacySettings.share_analyst_session_with_ai ? 'translate-x-6' : ''
              }`} />
            </button>
          </div>

          {/* Share Analyst Focus */}
          <div className="flex items-center justify-between py-4 border-t border-b border-black/8 dark:border-white/8">
            <div>
              <p className="text-sm font-body text-ink dark:text-white">Share "Analyst Focus" with AI</p>
              <p className="text-xs text-ink/40 dark:text-white/30 font-body mt-0.5">
                Sends your current analytical focus to Anthropic as context for dream analysis
              </p>
            </div>
            <button
              type="button"
              disabled={privacySaving === 'share_analyst_focus_with_ai'}
              onClick={() => togglePrivacy('share_analyst_focus_with_ai')}
              className={`relative w-12 h-6 rounded-full transition-colors disabled:opacity-60 ${
                privacySettings.share_analyst_focus_with_ai ? 'bg-amber-500' : 'bg-black/20 dark:bg-white/20'
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                privacySettings.share_analyst_focus_with_ai ? 'translate-x-6' : ''
              }`} />
            </button>
          </div>
        </div>

        {privacySaved && (
          <p className="text-xs font-body text-green-700 dark:text-green-400 mt-3">Privacy setting saved.</p>
        )}
      </section>

      {/* ── Change Password ──────────────────────────────────── */}
      <ChangePasswordSection />

      {/* ── Data & Maintenance ───────────────────────────────── */}
      <section>
        <h2 className="text-xs uppercase tracking-widest font-body text-ink/40 dark:text-white/30 mb-5">
          Data & Maintenance
        </h2>
        <CleanupButton userId={user.id} />
        <div className="mt-8 pt-8 border-t border-black/8 dark:border-white/8">
          <DuplicateDreamDetector userId={user.id} />
        </div>
        <div className="mt-8 pt-8 border-t border-black/8 dark:border-white/8">
          <SimilarTagScanner userId={user.id} />
        </div>
      </section>
    </div>
  );
}

// Shared by DuplicateDreamDetector and SimilarTagScanner
function jaccardSimilarity(textA, textB) {
  if (!textA || !textB) return 0;
  const wordsOf = t =>
    new Set(t.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean));
  const a = wordsOf(textA);
  const b = wordsOf(textB);
  const intersection = [...a].filter(w => b.has(w)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
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

function DuplicateDreamDetector({ userId }) {
  const [status, setStatus] = useState('idle'); // idle | scanning | results | confirming
  const [pairs, setPairs] = useState([]);        // [{ a, b, similarity }]
  const [dismissed, setDismissed] = useState(new Set());
  const [confirmDelete, setConfirmDelete] = useState(null); // { keepId, deleteId, deleteTitle }
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  async function handleScan() {
    setStatus('scanning');
    setError('');
    setPairs([]);
    setDismissed(new Set());

    try {
      const { data: dreams, error: fetchError } = await supabase
        .from('dreams')
        .select('id, title, dream_date, body')
        .eq('user_id', userId)
        .order('dream_date', { ascending: true });

      if (fetchError) throw fetchError;
      if (!dreams?.length) { setPairs([]); setStatus('results'); return; }

      // Group by dream_date
      const byDate = {};
      dreams.forEach(d => {
        const key = d.dream_date?.slice(0, 10) ?? 'unknown';
        if (!byDate[key]) byDate[key] = [];
        byDate[key].push(d);
      });

      // Compare within each date group
      const found = [];
      Object.values(byDate).forEach(group => {
        if (group.length < 2) return;
        for (let i = 0; i < group.length; i++) {
          for (let j = i + 1; j < group.length; j++) {
            const sim = jaccardSimilarity(group[i].body, group[j].body);
            if (sim >= 0.4) {
              found.push({ a: group[i], b: group[j], similarity: sim });
            }
          }
        }
      });

      setPairs(found);
      setStatus('results');
    } catch (err) {
      setError(err.message);
      setStatus('idle');
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const { error: deleteError } = await supabase
        .from('dreams')
        .delete()
        .eq('id', confirmDelete.deleteId);
      if (deleteError) throw deleteError;
      // Remove all pairs that involved the deleted dream
      setPairs(prev => prev.filter(
        p => p.a.id !== confirmDelete.deleteId && p.b.id !== confirmDelete.deleteId
      ));
      setConfirmDelete(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  function dismiss(pairKey) {
    setDismissed(prev => new Set([...prev, pairKey]));
  }

  const pairKey = (p) => [p.a.id, p.b.id].sort().join('-');
  const visiblePairs = pairs.filter(p => !dismissed.has(pairKey(p)));

  function similarityLabel(sim) {
    if (sim >= 0.85) return { text: 'Nearly identical', color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30' };
    if (sim >= 0.65) return { text: 'Very similar', color: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30' };
    return { text: 'Possibly duplicate', color: 'text-ink/50 dark:text-white/40 bg-black/5 dark:bg-white/5' };
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-body font-medium text-ink dark:text-white mb-1">
          Duplicate Dream Detection
        </p>
        <p className="text-sm font-body text-ink/60 dark:text-white/50 leading-relaxed">
          Find dreams recorded on the same date with similar content — likely accidental duplicates.
        </p>
      </div>

      {status === 'idle' && (
        <button
          onClick={handleScan}
          className="px-5 py-2.5 rounded-xl font-body text-sm border border-black/15 dark:border-white/15 text-ink/70 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          Scan for duplicates
        </button>
      )}

      {status === 'scanning' && (
        <p className="text-sm font-body text-ink/40 dark:text-white/30 italic">Scanning your archive…</p>
      )}

      {status === 'results' && (
        <div className="space-y-4">
          {visiblePairs.length === 0 ? (
            <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
              <p className="text-sm font-body text-green-800 dark:text-green-300">
                ✓ No duplicates found{pairs.length > 0 && ' — all flagged pairs dismissed'}.
              </p>
              <button
                onClick={() => { setPairs([]); setStatus('idle'); }}
                className="mt-2 text-xs font-body text-green-700 dark:text-green-400 underline"
              >
                Dismiss
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm font-body text-ink/50 dark:text-white/40">
                {visiblePairs.length} possible duplicate {visiblePairs.length === 1 ? 'pair' : 'pairs'} found.
              </p>
              {visiblePairs.map(pair => {
                const key = pairKey(pair);
                const label = similarityLabel(pair.similarity);
                return (
                  <div key={key} className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-2.5 bg-black/3 dark:bg-white/3 border-b border-black/8 dark:border-white/8">
                      <span className={`text-xs font-body px-2 py-0.5 rounded-full ${label.color}`}>
                        {label.text}
                      </span>
                      <button
                        onClick={() => dismiss(key)}
                        className="text-xs font-body text-ink/30 dark:text-white/30 hover:text-ink/60 dark:hover:text-white/60 transition-colors"
                      >
                        Not duplicates
                      </button>
                    </div>
                    {/* Two dreams side by side */}
                    <div className="grid grid-cols-2 divide-x divide-black/8 dark:divide-white/8">
                      {[pair.a, pair.b].map((dream, idx) => (
                        <div key={dream.id} className="p-4 space-y-2">
                          <p className="text-xs font-mono text-ink/30 dark:text-white/30">
                            {dream.dream_date?.slice(0, 10)}
                          </p>
                          <p className="text-sm font-display italic text-ink dark:text-white leading-snug line-clamp-2">
                            {dream.title || 'Untitled'}
                          </p>
                          <p className="text-xs font-body text-ink/50 dark:text-white/40 leading-relaxed line-clamp-4">
                            {dream.body?.slice(0, 180)}{dream.body?.length > 180 ? '…' : ''}
                          </p>
                          <button
                            onClick={() => setConfirmDelete({
                              keepId: idx === 0 ? pair.b.id : pair.a.id,
                              deleteId: dream.id,
                              deleteTitle: dream.title || 'Untitled',
                              pairKey: key,
                            })}
                            className="mt-1 text-xs font-body text-red-500 hover:text-red-700 dark:hover:text-red-300 transition-colors underline"
                          >
                            Delete this one
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              <button
                onClick={() => { setPairs([]); setStatus('idle'); }}
                className="text-xs font-body text-ink/30 dark:text-white/30 hover:text-ink/60 transition-colors underline"
              >
                Start over
              </button>
            </>
          )}
        </div>
      )}

      {/* Confirmation overlay — inline, not a browser dialog */}
      {confirmDelete && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 space-y-3">
          <p className="text-sm font-body text-red-800 dark:text-red-300">
            Permanently delete <span className="font-medium italic">"{confirmDelete.deleteTitle}"</span>?
            This cannot be undone.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 rounded-lg font-body text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {deleting ? 'Deleting…' : 'Yes, delete it'}
            </button>
            <button
              onClick={() => setConfirmDelete(null)}
              disabled={deleting}
              className="px-4 py-2 rounded-lg font-body text-sm border border-black/15 dark:border-white/15 text-ink/60 dark:text-white/50 hover:bg-black/5 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-red-500 text-sm font-body">{error}</p>}
    </div>
  );
}

function SimilarTagScanner({ userId }) {
  const [status, setStatus] = useState('idle'); // idle | scanning | results
  const [pairs, setPairs] = useState([]);        // [{ tagA, tagB, similarity }]
  const [dismissed, setDismissed] = useState(new Set());
  const [chosen, setChosen] = useState({});      // pairKey → canonical tag string
  const [mergeState, setMergeState] = useState({}); // pairKey → { state, message }
  const [error, setError] = useState('');

  const pairKey = (a, b) => [a, b].sort().join('|||');

  function similarityLabel(sim) {
    if (sim >= 0.75) return { text: 'Very similar', color: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30' };
    if (sim >= 0.50) return { text: 'Possibly similar', color: 'text-ink/50 dark:text-white/40 bg-black/5 dark:bg-white/5' };
    return { text: 'Might be related', color: 'text-ink/30 dark:text-white/20 bg-black/3 dark:bg-white/3' };
  }

  async function handleScan() {
    setStatus('scanning');
    setError('');
    setPairs([]);
    setDismissed(new Set());
    setChosen({});
    setMergeState({});

    try {
      const { data: dreams, error: fetchError } = await supabase
        .from('dreams')
        .select('id, tags')
        .eq('user_id', userId);

      if (fetchError) throw fetchError;

      // Collect all unique tags (lowercased)
      const allTags = [...new Set(
        (dreams || []).flatMap(d => d.tags || []).map(t => t.toLowerCase().trim()).filter(Boolean)
      )];

      // Compare every pair
      const rawPairs = [];
      for (let i = 0; i < allTags.length; i++) {
        for (let j = i + 1; j < allTags.length; j++) {
          const tagA = allTags[i];
          const tagB = allTags[j];
          const sim = jaccardSimilarity(tagA, tagB);
          if (sim >= 0.25) {
            rawPairs.push({ tagA, tagB, similarity: sim });
          }
        }
      }

      // Deduplicate: sort by similarity desc, greedily pick pairs where neither tag is already claimed
      const seen = new Set();
      const dedupedPairs = [];
      [...rawPairs].sort((a, b) => b.similarity - a.similarity).forEach(pair => {
        if (!seen.has(pair.tagA) && !seen.has(pair.tagB)) {
          dedupedPairs.push(pair);
          seen.add(pair.tagA);
          seen.add(pair.tagB);
        }
      });

      setPairs(dedupedPairs);
      setStatus('results');
    } catch (err) {
      setError(err.message);
      setStatus('idle');
    }
  }

  async function handleMerge(pair) {
    const key = pairKey(pair.tagA, pair.tagB);
    const canonical = chosen[key];
    const obsolete = canonical === pair.tagA ? pair.tagB : pair.tagA;

    setMergeState(prev => ({ ...prev, [key]: { state: 'merging', message: '' } }));

    try {
      // Fetch all dreams and filter client-side for reliable case-insensitive matching
      const { data: allDreams, error: fetchError } = await supabase
        .from('dreams')
        .select('id, tags')
        .eq('user_id', userId);

      if (fetchError) throw fetchError;

      const dreamsToUpdate = (allDreams || []).filter(d =>
        d.tags?.some(t => t.toLowerCase().trim() === obsolete)
      );

      const results = await Promise.all(
        dreamsToUpdate.map(dream => {
          const newTags = dream.tags.map(t =>
            t.toLowerCase().trim() === obsolete ? canonical : t
          );
          return supabase.from('dreams').update({ tags: newTags }).eq('id', dream.id);
        })
      );

      const mergeError = results.find(r => r.error);
      if (mergeError) throw mergeError.error;

      const count = dreamsToUpdate.length;
      setMergeState(prev => ({
        ...prev,
        [key]: { state: 'done', message: `Merged into "${canonical}" across ${count} dream${count !== 1 ? 's' : ''}.` },
      }));

      setTimeout(() => {
        setPairs(prev => prev.filter(p => pairKey(p.tagA, p.tagB) !== key));
      }, 2000);
    } catch (err) {
      setMergeState(prev => ({ ...prev, [key]: { state: 'error', message: err.message } }));
    }
  }

  function dismiss(key) {
    setDismissed(prev => new Set([...prev, key]));
  }

  const visiblePairs = pairs.filter(p => !dismissed.has(pairKey(p.tagA, p.tagB)));

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-body font-medium text-ink dark:text-white mb-1">
          Similar Tag Detection
        </p>
        <p className="text-sm font-body text-ink/60 dark:text-white/50 leading-relaxed">
          Find tags across your archive that may refer to the same thing and merge them.
        </p>
      </div>

      {status === 'idle' && (
        <button
          onClick={handleScan}
          className="px-5 py-2.5 rounded-xl font-body text-sm border border-black/15 dark:border-white/15 text-ink/70 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          Scan for similar tags →
        </button>
      )}

      {status === 'scanning' && (
        <p className="text-sm font-body text-ink/40 dark:text-white/30 italic">Scanning your tags…</p>
      )}

      {status === 'results' && (
        <div className="space-y-4">
          {visiblePairs.length === 0 ? (
            <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
              <p className="text-sm font-body text-green-800 dark:text-green-300">
                ✓ No similar tags found{pairs.length > 0 && ' — all suggestions dismissed'}.
              </p>
              <button
                onClick={() => { setPairs([]); setStatus('idle'); }}
                className="mt-2 text-xs font-body text-green-700 dark:text-green-400 underline"
              >
                Dismiss
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm font-body text-ink/50 dark:text-white/40">
                {visiblePairs.length} possible {visiblePairs.length === 1 ? 'match' : 'matches'} found.
              </p>
              {visiblePairs.map(pair => {
                const key = pairKey(pair.tagA, pair.tagB);
                const label = similarityLabel(pair.similarity);
                const ms = mergeState[key];
                const canonicalChosen = chosen[key];

                return (
                  <div key={key} className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-2.5 bg-black/3 dark:bg-white/3 border-b border-black/8 dark:border-white/8">
                      <span className={`text-xs font-body px-2 py-0.5 rounded-full ${label.color}`}>
                        {label.text}
                      </span>
                      <button
                        onClick={() => dismiss(key)}
                        className="text-xs font-body text-ink/30 dark:text-white/30 hover:text-ink/60 dark:hover:text-white/60 transition-colors"
                      >
                        Dismiss
                      </button>
                    </div>

                    {/* Tags side by side */}
                    <div className="grid grid-cols-2 divide-x divide-black/8 dark:divide-white/8">
                      {[pair.tagA, pair.tagB].map(tag => (
                        <div key={tag} className="p-4 space-y-3">
                          <span className="inline-block px-3 py-1 rounded-full text-sm font-body bg-gold/15 text-gold-dark dark:text-gold border border-gold/20">
                            {tag}
                          </span>
                          <div>
                            <button
                              onClick={() => setChosen(prev => ({ ...prev, [key]: tag }))}
                              className={`text-xs font-body transition-colors ${
                                canonicalChosen === tag
                                  ? 'text-plum dark:text-white font-medium'
                                  : 'text-ink/40 dark:text-white/30 hover:text-ink/60 dark:hover:text-white/50'
                              }`}
                            >
                              {canonicalChosen === tag ? '✓ Keep this one' : 'Keep this one'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Merge / status row */}
                    <div className="px-4 py-3 border-t border-black/8 dark:border-white/8 bg-black/1 dark:bg-white/1">
                      {ms?.state === 'done' ? (
                        <p className="text-xs font-body text-green-700 dark:text-green-400">{ms.message}</p>
                      ) : ms?.state === 'error' ? (
                        <p className="text-xs font-body text-red-500">{ms.message}</p>
                      ) : canonicalChosen ? (
                        <button
                          onClick={() => handleMerge(pair)}
                          disabled={ms?.state === 'merging'}
                          className="text-xs font-body text-plum dark:text-white/70 hover:text-plum/70 disabled:opacity-50 transition-colors"
                        >
                          {ms?.state === 'merging' ? 'Merging…' : `Merge → "${canonicalChosen}"`}
                        </button>
                      ) : (
                        <p className="text-xs font-body text-ink/30 dark:text-white/20 italic">
                          Select which tag to keep
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
              <button
                onClick={() => { setPairs([]); setStatus('idle'); }}
                className="text-xs font-body text-ink/30 dark:text-white/30 hover:text-ink/60 transition-colors underline"
              >
                Start over
              </button>
            </>
          )}
        </div>
      )}

      {error && <p className="text-red-500 text-sm font-body">{error}</p>}
    </div>
  );
}
