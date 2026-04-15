import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { analyzeDream, buildDreamContext, generateDreamSummary, gatherAssociations, transcribeImage, hasApiKey, AiError } from '../lib/ai';
import { incrementAbandonedCount, resetPauseCounts } from '../hooks/usePauseGate';
import { usePrivacySettings } from '../hooks/usePrivacySettings';
import { useNavTier } from '../hooks/useNavTier';
import AiErrorMessage from '../components/AiErrorMessage';
import AssociationsModal from '../components/AssociationsModal';
import PracticeOrientation from '../components/PracticeOrientation';
import { todayString } from '../lib/constants';

export default function NewDream() {
  const navigate = useNavigate();
  const { user, profile, refreshDreamCount } = useAuth();
  const { privacySettings } = usePrivacySettings();
  const { hasGuide } = useNavTier();

  const [form, setForm] = useState({
    dream_date: todayString(),
    title: '',
    body: '',
    dreamer_associations: '',
    moods: [],
    is_big_dream: false,
    incubation_intention: '',
    notes: '',
    analyst_session: '',
    tags: '',
  });

  const [loading, setLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [keyPresent, setKeyPresent] = useState(hasApiKey);
  const [activeFocus, setActiveFocus] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [showAssociationsModal, setShowAssociationsModal] = useState(false);
  const [pendingAssociations, setPendingAssociations] = useState({ entities: [], dynamics: [] });
  const [associationsLoading, setAssociationsLoading] = useState(false);
  const [savedDreamId, setSavedDreamId] = useState(null);
  const dreamContextRef = useRef(null);

  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);
  const photoInputRef = useRef(null);
  const [transcribing, setTranscribing] = useState(false);

  // Abandoned-session tracking (Pattern 2)
  const mountTimeRef = useRef(Date.now());
  const savedRef = useRef(false);
  const bodyRef = useRef('');

  useEffect(() => {
    fetchActiveFocus();
    // Re-check key presence each time page mounts (user may have just added it)
    setKeyPresent(hasApiKey());
  }, []);

  async function fetchActiveFocus() {
    const { data, error } = await supabase
      .from('analyst_focuses')
      .select('id, focus_text')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();
    if (data) setActiveFocus(data);
  }

  function setField(key, val) {
    setForm(f => ({ ...f, [key]: val }));
    if (key === 'body') bodyRef.current = val;
  }

  // Pattern 2: if user spent 30+ seconds on /new with content but didn't save, count it
  useEffect(() => {
    return () => {
      const elapsed = Date.now() - mountTimeRef.current;
      if (elapsed >= 30_000 && bodyRef.current.trim() && !savedRef.current) {
        incrementAbandonedCount();
      }
    };
  }, []);

  function toggleVoice() {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Voice input is not supported in this browser. Try Chrome.');
      return;
    }
    if (listening) {
      isListeningRef.current = false;
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let t = Array.from(event.results).slice(event.resultIndex).map(r => r[0].transcript).join('');

      // Replace spoken punctuation words
      t = t
        .replace(/\bcomma\b/gi, ',')
        .replace(/\b(period|full stop)\b/gi, '.')
        .replace(/\bquestion mark\b/gi, '?')
        .replace(/\bexclamation( mark)?\b/gi, '!')
        .replace(/\bnew line\b/gi, '\n')
        .replace(/\bnew paragraph\b/gi, '\n\n')
        .replace(/\bdash\b/gi, ' —')
        .replace(/\bellipsis\b/gi, '…');

      // Remove any spaces that landed before punctuation marks
      t = t.replace(/ +([.,?!…])/g, '$1');

      // Capitalize after sentence-ending punctuation within this chunk
      t = t.replace(/([.!?]\s+)([a-z])/g, (_, p, l) => p + l.toUpperCase());

      setForm(f => {
        // Capitalize the first letter of this chunk if the existing body
        // is empty or ends a sentence (so new chunk starts a fresh sentence)
        const startsNewSentence = !f.body.trim() || /[.!?]\s*$/.test(f.body);
        if (startsNewSentence) {
          t = t.charAt(0).toUpperCase() + t.slice(1);
        }
        return { ...f, body: f.body + (f.body ? ' ' : '') + t };
      });
    };
    recognition.onerror = () => {
      if (!isListeningRef.current) return;
      // On error, restart if still intentionally listening
      try { recognition.start(); } catch {}
    };
    recognition.onend = () => {
      if (isListeningRef.current) {
        // Inactivity timeout — restart automatically
        try { recognition.start(); } catch {}
      } else {
        setListening(false);
      }
    };
    isListeningRef.current = true;
    recognition.start();
    recognitionRef.current = recognition;
    setListening(true);
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      setTranscribing(true);
      setAiError(null);
      try {
        const text = await transcribeImage(ev.target.result);
        setForm(f => ({ ...f, body: f.body + (f.body ? '\n\n' : '') + text }));
      } catch (err) {
        setAiError(err);
      } finally {
        setTranscribing(false);
        e.target.value = '';
      }
    };
    reader.readAsDataURL(file);
  }

  async function saveDream(withAnalysis) {
    if (!form.body.trim()) {
      setAiError(null);
      return setAiError(new AiError('Please describe your dream before saving.', 'api_error'));
    }
    setAiError(null);
    setLoading(true);

    try {
      // Fetch dream context up front so it's ready when analyzeDream runs
      if (withAnalysis) {
        try {
          const { data: recentDreams } = await supabase
            .from('dreams')
            .select('dream_date, title, summary, archetypes, symbols, mood, is_big_dream, body')
            .eq('user_id', user.id)
            .order('dream_date', { ascending: false })
            .limit(15);
          dreamContextRef.current = recentDreams?.length ? buildDreamContext(recentDreams) : null;
        } catch {
          dreamContextRef.current = null;
        }
      }

      const tagsFromForm = form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

      // Phase 1: save the dream record immediately (analysis fields populated in phase 2)
      const { data, error: dbError } = await supabase.from('dreams').insert({
        user_id: user.id,
        dream_date: form.dream_date,
        title: form.title.trim() || null,
        body: form.body,
        dreamer_associations: form.dreamer_associations.trim() || null,
        mood: form.moods.length > 0 ? form.moods : null,
        notes: form.notes || null,
        analyst_session: form.analyst_session || null,
        incubation_intention: form.incubation_intention || null,
        is_big_dream: form.is_big_dream,
        tags: tagsFromForm,
        has_analysis: false,
      }).select().single();

      if (dbError) throw dbError;
      savedRef.current = true;
      resetPauseCounts();
      refreshDreamCount();

      if (!withAnalysis) {
        navigate(`/dream/${data.id}`);
        return;
      }

      // Phase 2: gather associations, then open modal
      setSavedDreamId(data.id);
      setAssociationsLoading(true);
      setShowAssociationsModal(true);

      const assocs = await gatherAssociations(form.body);
      setPendingAssociations(assocs);
      setAssociationsLoading(false);
      // loading stays true until runAnalysis completes

    } catch (err) {
      setAiError(err);
      setLoading(false);
    }
  }

  async function runAnalysis(associations) {
    try {
      const [analysisData, summaryText] = await Promise.all([
        analyzeDream({
          title: form.title,
          body: form.body,
          mood: form.moods,
          privacySettings,
          notes: privacySettings.share_notes_with_ai ? form.dreamer_associations : undefined,
          analyst_session: privacySettings.share_analyst_session_with_ai ? form.analyst_session : undefined,
          analystFocus: activeFocus?.focus_text,
          dreamContext: dreamContextRef.current,
          associations,
        }),
        generateDreamSummary({ title: form.title, body: form.body, mood: form.moods }),
      ]);

      const { error: dbErr } = await supabase
        .from('dreams')
        .update({
          title: form.title.trim() || analysisData.title || null,
          tags: analysisData.tags || [],
          archetypes: analysisData.archetypes || [],
          symbols: analysisData.symbols || [],
          reflection: analysisData.reflection || null,
          invitation: analysisData.invitation || null,
          structure: analysisData.structure || null,
          embodiment_prompt: analysisData.embodimentPrompt || null,
          summary: summaryText || null,
          has_analysis: !!analysisData.reflection,
        })
        .eq('id', savedDreamId);

      if (dbErr) throw dbErr;
      navigate(`/dream/${savedDreamId}`);
    } catch (err) {
      setAiError(err);
    } finally {
      setLoading(false);
    }
  }

  function handleAssociationsProceed(responses) {
    setShowAssociationsModal(false);
    if (responses.length && savedDreamId) {
      supabase.from('dreams').update({ modal_associations: responses }).eq('id', savedDreamId)
        .then(({ error }) => { if (error) console.error('modal_associations save failed:', error); });
    }
    runAnalysis(responses.length ? responses : null);
  }

  function handleAssociationsSkip() {
    setShowAssociationsModal(false);
    runAnalysis(null);
  }

  const analystLabel = profile?.analyst_name || 'Analyst';
  const analystNotesLabel = form.analyst_session.trim()
    ? 'Analyst notes ✓'
    : '+ Analyst notes';

  return (
    <div className="max-w-2xl mx-auto px-4 pt-8">
      {/* No API key banner */}
      {!keyPresent && (
        <div className="mb-6 flex items-start justify-between gap-4 px-5 py-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <p className="text-sm font-body text-amber-800 dark:text-amber-300 leading-relaxed">
            AI features require an Anthropic API key. Add yours in Settings to get started.{' '}
            <span className="opacity-70">Get a free key at console.anthropic.com.</span>
          </p>
          <Link to="/settings"
            className="shrink-0 text-sm font-body font-medium text-amber-800 dark:text-amber-300 underline hover:no-underline">
            Settings →
          </Link>
        </div>
      )}

      <h1 className="font-display italic text-4xl text-plum mb-1">Record a Dream</h1>
      <p className="text-base font-body text-ink/60 dark:text-white/45 mb-8">
        Receive what arrived in the night before the waking mind can explain it away.
      </p>

      <PracticeOrientation storageKey="orient_record">
        <p>Each dream is a letter from the unconscious — written in images, not words. This practice asks only that you receive it faithfully: record what arrived, however fragmentary, before the waking mind can explain it away.</p>
        <p>The analysis comes after. The dream comes first.</p>
      </PracticeOrientation>

      <div className="space-y-6">
        {/* Date + Title */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="field-label">Date</label>
            <input type="date" value={form.dream_date} onChange={e => setField('dream_date', e.target.value)} className="field-input" />
          </div>
          <div>
            <label className="field-label">Title <span className="text-ink/30 normal-case tracking-normal text-xs">(optional — AI will name it)</span></label>
            <input type="text" value={form.title} onChange={e => setField('title', e.target.value)} placeholder="The Red Door" className="field-input" />
          </div>
        </div>

        {/* Dream body */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="field-label mb-0">The Dream</label>
            <div className="flex gap-2">
              <button type="button" onClick={toggleVoice}
                title={listening ? 'Stop listening' : 'Dictate dream'}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-body transition-colors ${
                  listening ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-plum/10 text-plum hover:bg-plum/20 dark:bg-white/10 dark:text-white/70'
                }`}>
                <span>{listening ? '⏹' : '🎙'}</span>
                {listening ? 'Listening…' : 'Dictate'}
              </button>
              <button type="button" onClick={() => photoInputRef.current?.click()} disabled={transcribing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-body bg-plum/10 text-plum hover:bg-plum/20 dark:bg-white/10 dark:text-white/70 disabled:opacity-50 transition-colors">
                <span>📷</span>
                {transcribing ? 'Reading…' : 'Upload photo'}
              </button>
              <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </div>
          </div>
          <textarea value={form.body} onChange={e => setField('body', e.target.value)} rows={10}
            placeholder="I found myself in a house I didn't recognize, though it felt somehow like home…"
            className="w-full px-4 py-4 rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 text-ink dark:text-white/90 font-dream resize-y focus:outline-none focus:ring-2 focus:ring-gold/40" />
        </div>

        {/* Your Reflections */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <label className="field-label mb-0">Your Reflections</label>
            {privacySettings.share_notes_with_ai && (
              <span className="text-xs text-gold normal-case tracking-normal font-body">✦ shared with AI</span>
            )}
          </div>
          <textarea
            value={form.dreamer_associations}
            onChange={e => setField('dreamer_associations', e.target.value)}
            rows={4}
            placeholder="What stood out? Any feelings, images, associations, or intentions you carried into sleep..."
            className="field-input resize-y"
          />
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

        {aiError && <AiErrorMessage error={aiError} />}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button type="button" disabled={loading} onClick={() => saveDream(true)}
            className="flex-1 py-3 rounded-xl font-body text-sm font-medium text-white transition-opacity disabled:opacity-50 bg-plum">
            {loading ? 'Weaving the dream…' : 'Analyze & Save'}
          </button>
          <button type="button" disabled={loading} onClick={() => saveDream(false)}
            className="px-6 py-3 rounded-xl font-body text-sm font-medium border border-black/15 dark:border-white/15 text-ink/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-50">
            Save Only
          </button>
        </div>

        {/* Analyst notes trigger */}
        {hasGuide && (
          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="text-xs font-body text-gold/70 hover:text-gold transition-colors">
              {analystNotesLabel}
            </button>
          </div>
        )}
      </div>

      {/* Analyst Notes Drawer */}
      {hasGuide && (
        <>
          {/* Overlay */}
          <div
            onClick={() => setDrawerOpen(false)}
            className={`fixed inset-0 z-40 transition-opacity duration-300 ${drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            style={{ background: 'rgba(0,0,0,0.3)' }}
          />

          {/* Drawer panel */}
          <div
            className={`fixed top-0 right-0 h-full z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out w-full sm:w-[400px] ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
            style={{ background: '#faf7f2' }}
          >
            {/* Drawer header */}
            <div className="flex items-start justify-between px-6 pt-6 pb-4">
              <div>
                <h2 className="font-display italic text-2xl text-ink">Analyst Notes</h2>
                <p className="text-xs font-body text-ink/40 mt-1 leading-relaxed">
                  Notes from your session — included in analysis when sharing is enabled
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="text-ink/40 hover:text-ink transition-colors text-xl leading-none mt-0.5 ml-4">
                ×
              </button>
            </div>

            {/* Privacy indicator */}
            <div className="px-6 pb-2">
              {privacySettings.share_analyst_session_with_ai
                ? <span className="text-xs font-body text-gold">✦ shared with AI</span>
                : <span className="text-xs font-body text-ink/30">◎ private</span>
              }
            </div>

            {/* Textarea */}
            <div className="flex-1 px-6 pb-4 overflow-y-auto">
              <textarea
                value={form.analyst_session}
                onChange={e => setField('analyst_session', e.target.value)}
                rows={12}
                placeholder={`Notes from your session with ${analystLabel}…`}
                className="w-full px-4 py-3 rounded-xl border border-black/10 bg-white/70 text-ink font-body text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gold/40 h-full min-h-[200px]"
              />
            </div>

            {/* Done button */}
            <div className="px-6 pb-6 pt-2">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="w-full py-3 rounded-xl font-body text-sm font-medium bg-plum text-white hover:bg-plum/90 transition-colors">
                Done
              </button>
            </div>
          </div>
        </>
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
