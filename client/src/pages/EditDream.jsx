import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { usePrivacySettings } from '../hooks/usePrivacySettings';
import { analyzeDream, buildDreamContext, gatherAssociations, AiError } from '../lib/ai';
import AiErrorMessage from '../components/AiErrorMessage';
import AssociationsModal from '../components/AssociationsModal';

export default function EditDream() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const { privacySettings } = usePrivacySettings();

  const [form, setForm] = useState(null);
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [reanalyzed, setReanalyzed] = useState(false);
  const [showAssociationsModal, setShowAssociationsModal] = useState(false);
  const [pendingAssociations, setPendingAssociations] = useState({ entities: [], dynamics: [] });
  const [associationsLoading, setAssociationsLoading] = useState(false);

  useEffect(() => {
    fetchDream();
  }, [id]);

  async function fetchDream() {
    const { data } = await supabase.from('dreams').select('*').eq('id', id).eq('user_id', user.id).single();
    if (!data) { navigate('/archive'); return; }
    setLastAnalyzedAt(data.last_analyzed_at || null);
    setForm({
      dream_date: data.dream_date,
      title: data.title || '',
      body: data.body || '',
      dreamer_associations: data.dreamer_associations || '',
      is_big_dream: data.is_big_dream || false,
    });
  }

  function setField(key, val) {
    setForm(f => ({ ...f, [key]: val }));
  }

  async function handleSave() {
    if (!form.body.trim()) { setError('Dream body cannot be empty.'); return; }
    setSaving(true);
    setError('');
    const { error: dbErr } = await supabase
      .from('dreams')
      .update({
        dream_date: form.dream_date,
        title: form.title,
        body: form.body,
        dreamer_associations: form.dreamer_associations,
        is_big_dream: form.is_big_dream,
      })
      .eq('id', id);
    if (dbErr) { setError(dbErr.message); setSaving(false); return; }
    navigate(`/dream/${id}`);
  }

  async function handleReanalyzeClick() {
    if (isOnCooldown) return;
    setShowConfirm(false);
    setAssociationsLoading(true);
    setShowAssociationsModal(true);
    const assocs = await gatherAssociations(form.body);
    setPendingAssociations(assocs);
    setAssociationsLoading(false);
  }

  function handleAssociationsProceed(responses) {
    setShowAssociationsModal(false);
    if (responses.length) {
      supabase.from('dreams').update({ modal_associations: responses }).eq('id', id)
        .then(({ error }) => { if (error) console.error('modal_associations save failed:', error); });
    }
    runReanalyze(responses.length ? responses : null);
  }

  function handleAssociationsSkip() {
    setShowAssociationsModal(false);
    runReanalyze(null);
  }

  async function runReanalyze(associations) {
    setAiError(null);
    setReanalyzed(false);
    setReanalyzing(true);
    try {
      let dreamContext = null;
      try {
        const { data: priorDreams } = await supabase
          .from('dreams')
          .select('dream_date, title, summary, archetypes, symbols, mood, is_big_dream, body')
          .eq('user_id', user.id)
          .lt('dream_date', form.dream_date)
          .order('dream_date', { ascending: false })
          .limit(15);
        if (priorDreams?.length) {
          dreamContext = buildDreamContext(priorDreams);
        }
      } catch {
        // context fetch failed — proceeding without it
      }

      const analysisData = await analyzeDream({
        title: form.title,
        body: form.body,
        dreamDate: form.dream_date,
        privacySettings,
        notes: privacySettings.share_notes_with_ai ? form.dreamer_associations : undefined,
        dreamContext,
        associations,
      });

      const now = new Date().toISOString();
      const { error: dbErr } = await supabase
        .from('dreams')
        .update({
          reflection: analysisData.reflection || null,
          archetypes: analysisData.archetypes || [],
          symbols: analysisData.symbols || [],
          tags: analysisData.tags || [],
          structure: analysisData.structure || null,
          invitation: analysisData.invitation || null,
          embodiment_prompt: analysisData.embodimentPrompt || null,
          has_analysis: !!analysisData.reflection,
          last_analyzed_at: now,
        })
        .eq('id', id);

      if (dbErr) throw dbErr;
      setLastAnalyzedAt(now);
      setReanalyzed(true);
    } catch (err) {
      setAiError(err instanceof AiError ? err : new AiError(err.message || 'Analysis failed.', 'api_error'));
    } finally {
      setReanalyzing(false);
    }
  }

  if (!form) {
    return <div className="flex items-center justify-center h-64"><p className="font-display italic text-xl text-ink/40">Calling up the dream…</p></div>;
  }

  const cooldownMinutesLeft = (() => {
    if (!lastAnalyzedAt) return 0;
    const elapsed = (Date.now() - new Date(lastAnalyzedAt).getTime()) / 60000;
    return Math.max(0, Math.ceil(60 - elapsed));
  })();
  const isOnCooldown = cooldownMinutesLeft > 0;

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
          <label className="field-label">Your Notes</label>
          <textarea value={form.dreamer_associations} onChange={e => setField('dreamer_associations', e.target.value)} rows={3} className="field-input resize-y"
            placeholder="Free associations, first impressions, anything that catches your attention…" />
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

        {error && <p className="text-red-600 text-sm font-body">{error}</p>}
        {aiError && <AiErrorMessage error={aiError} />}
        {reanalyzed && !aiError && (
          <p className="text-sm font-body text-gold">✦ Analysis updated</p>
        )}

        <div className="flex gap-3">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-3 rounded-xl font-body text-sm font-medium text-white disabled:opacity-50 bg-plum">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <Link to={`/dream/${id}`} className="px-6 py-3 rounded-xl font-body text-sm font-medium border border-black/15 dark:border-white/15 text-ink/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-center">
            Cancel
          </Link>
        </div>

        <button
          type="button"
          onClick={() => { if (!isOnCooldown) setShowConfirm(true); }}
          disabled={reanalyzing || saving || isOnCooldown}
          className={`w-full py-3 rounded-xl font-body text-sm font-medium border transition-colors disabled:opacity-50 ${
            isOnCooldown
              ? 'border-black/15 dark:border-white/15 text-ink/40 dark:text-white/30 cursor-not-allowed'
              : 'border-gold/40 text-gold hover:bg-gold/5'
          }`}>
          {reanalyzing
            ? '◐ Analyzing…'
            : isOnCooldown
              ? `Re-analyze available in ${cooldownMinutesLeft}m`
              : '◐ Re-analyze Dream'}
        </button>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-ink p-8 shadow-xl">
            <h2 className="font-display italic text-xl text-ink dark:text-white mb-3">Replace existing analysis?</h2>
            <p className="text-sm font-body text-ink/70 dark:text-white/60 leading-relaxed mb-6">
              This will replace the existing analysis — reflection, archetypes, symbols, tags, structure, invitation, and embodiment prompt. Your own notes and associations will not be changed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleReanalyzeClick}
                className="flex-1 py-2.5 rounded-xl font-body text-sm font-medium bg-gold text-white hover:bg-gold/90 transition-colors">
                Continue
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 rounded-xl font-body text-sm font-medium border border-black/15 dark:border-white/15 text-ink/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showAssociationsModal && (
        <AssociationsModal
          entities={pendingAssociations.entities || []}
          dynamics={pendingAssociations.dynamics || []}
          existingAssociations={form.dreamer_associations || null}
          isLoading={associationsLoading}
          onProceed={handleAssociationsProceed}
          onSkip={handleAssociationsSkip}
        />
      )}
    </div>
  );
}
