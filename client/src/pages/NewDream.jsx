import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { analyzeDream, buildDreamContext, generateDreamSummary, transcribeImage, hasApiKey, AiError } from '../lib/ai';
import { usePrivacySettings } from '../hooks/usePrivacySettings';
import AiErrorMessage from '../components/AiErrorMessage';
import { MOODS, todayString } from '../lib/constants';

const DAILY_PROMPTS = [
  "What figure appeared that you didn't expect?",
  "Was there a threshold you were afraid to cross?",
  "What element of nature spoke to you last night?",
  "Did a shadow self appear — a part of you you'd rather not know?",
  "What were you searching for, and did you find it?",
  "Who came to guide you, and did you follow?",
  "What was the quality of light in the dream?",
  "What did the water — or its absence — mean?",
];

function getDailyPrompt() {
  return DAILY_PROMPTS[new Date().getDay() % DAILY_PROMPTS.length];
}

export default function NewDream() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { privacySettings } = usePrivacySettings();

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
  const [hasTodayDream, setHasTodayDream] = useState(true);
  const [keyPresent, setKeyPresent] = useState(hasApiKey);
  const [activeFocus, setActiveFocus] = useState(null);

  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const photoInputRef = useRef(null);
  const [transcribing, setTranscribing] = useState(false);

  useEffect(() => {
    checkTodayDream();
    fetchActiveFocus();
    // Re-check key presence each time page mounts (user may have just added it)
    setKeyPresent(hasApiKey());
  }, []);

  async function fetchActiveFocus() {
    const { data } = await supabase
      .from('analyst_focuses')
      .select('id, focus_text')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .single();
    if (data) setActiveFocus(data);
  }

  async function checkTodayDream() {
    const today = todayString();
    const { data } = await supabase
      .from('dreams').select('id').eq('user_id', user.id).eq('dream_date', today).limit(1);
    setHasTodayDream(data?.length > 0);
  }

  function setField(key, val) {
    setForm(f => ({ ...f, [key]: val }));
  }

  function toggleVoice() {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Voice input is not supported in this browser. Try Chrome.');
      return;
    }
    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }

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
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
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
      let analysisData = {};
      let summaryText = null;
      if (withAnalysis) {
        // Fetch recent dream history for contextual analysis — fail silently if unavailable
        let dreamContext = null;
        try {
          const { data: recentDreams } = await supabase
            .from('dreams')
            .select('dream_date, title, summary, archetypes, symbols, mood, is_big_dream, body')
            .eq('user_id', user.id)
            .order('dream_date', { ascending: false })
            .limit(15);
          if (recentDreams?.length) {
            dreamContext = buildDreamContext(recentDreams);
          }
        } catch (ctxErr) {
          console.warn('Dream context fetch failed — proceeding without context:', ctxErr);
        }

        [analysisData, summaryText] = await Promise.all([
          analyzeDream({
            title: form.title,
            body: form.body,
            mood: form.moods,
            privacySettings,
            notes: form.notes,
            analyst_session: form.analyst_session,
            analystFocus: activeFocus?.focus_text,
            dreamContext,
          }),
          generateDreamSummary({ title: form.title, body: form.body, mood: form.moods }),
        ]);
      }

      const tagsFromForm = form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

      const { data, error: dbError } = await supabase.from('dreams').insert({
        user_id: user.id,
        dream_date: form.dream_date,
        title: analysisData.title || form.title || null,
        body: form.body,
        dreamer_associations: form.dreamer_associations.trim() || null,
        mood: form.moods.length > 0 ? form.moods : null,
        notes: form.notes || null,
        analyst_session: form.analyst_session || null,
        incubation_intention: form.incubation_intention || null,
        is_big_dream: form.is_big_dream,
        tags: withAnalysis ? (analysisData.tags || []) : tagsFromForm,
        archetypes: analysisData.archetypes || [],
        symbols: analysisData.symbols || [],
        reflection: analysisData.reflection || null,
        invitation: analysisData.invitation || null,
        structure: analysisData.structure || null,
        summary: summaryText || null,
        has_analysis: withAnalysis && !!analysisData.reflection,
      }).select().single();

      if (dbError) throw dbError;
      navigate(`/dream/${data.id}`);
    } catch (err) {
      setAiError(err);
    } finally {
      setLoading(false);
    }
  }

  const analystLabel = profile?.analyst_name || 'Analyst';

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
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

      {/* Daily prompt */}
      {!hasTodayDream && (
        <div className="mb-8 px-6 py-4 rounded-xl border border-gold/30 bg-gold/5">
          <p className="text-xs uppercase tracking-widest text-gold/70 font-body mb-1">Today's Reflection</p>
          <p className="font-display italic text-lg text-ink/70 dark:text-white/70">{getDailyPrompt()}</p>
        </div>
      )}

      <h1 className="font-display italic text-4xl text-ink dark:text-white mb-8">Record a Dream</h1>

      <div className="space-y-6">
        {/* Incubation intention */}
        <div>
          <p className="font-display italic text-base text-ink/50 dark:text-white/40 mb-2">
            Was there an intention you set before sleeping?
          </p>
          <input
            type="text"
            value={form.incubation_intention}
            onChange={e => setField('incubation_intention', e.target.value)}
            placeholder="e.g. I asked to understand my fear of change…"
            className="field-input"
          />
        </div>

        {/* Active analyst focus — read-only banner */}
        {activeFocus && (
          <div className="px-5 py-4 rounded-xl border border-plum/20 bg-plum/5 dark:bg-plum/10">
            <p className="text-xs uppercase tracking-widest text-plum/50 dark:text-white/30 font-body mb-1">
              Current Analytical Focus
            </p>
            <p className="text-sm font-body text-ink/70 dark:text-white/60 leading-relaxed italic">
              {activeFocus.focus_text}
            </p>
          </div>
        )}

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

        {/* Dreamer associations */}
        <div>
          <label className="field-label">Before analysis — what words, images, or feelings stand out to you from this dream?</label>
          <textarea
            value={form.dreamer_associations}
            onChange={e => setField('dreamer_associations', e.target.value)}
            rows={3}
            placeholder="Free associations, first impressions, anything that catches your attention…"
            className="field-input resize-y"
          />
        </div>

        {/* Mood */}
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

        {/* My Notes */}
        <div>
          <label className="field-label">
            My Notes{' '}
            {privacySettings.share_notes_with_ai
              ? <span className="text-xs text-amber-500 normal-case tracking-normal font-body font-normal">◈ shared with AI</span>
              : <span className="text-xs text-ink/30 dark:text-white/30 normal-case tracking-normal font-body font-normal">◎ private</span>
            }
          </label>
          <textarea value={form.notes} onChange={e => setField('notes', e.target.value)} rows={3}
            placeholder="Personal associations, life context, what was happening that day…" className="field-input resize-y" />
        </div>

        {/* Analyst session */}
        <div>
          <label className="field-label">
            {analystLabel} Session{' '}
            {privacySettings.share_analyst_session_with_ai
              ? <span className="text-xs text-amber-500 normal-case tracking-normal font-body font-normal">◈ shared with AI</span>
              : <span className="text-xs text-ink/30 dark:text-white/30 normal-case tracking-normal font-body font-normal">◎ private</span>
            }
          </label>
          <textarea value={form.analyst_session} onChange={e => setField('analyst_session', e.target.value)} rows={3}
            placeholder={`Notes from your session with ${analystLabel}…`} className="field-input resize-y" />
        </div>

        {/* Tags */}
        <div>
          <label className="field-label">Tags <span className="text-xs text-ink/30 normal-case tracking-normal">Comma-separated (AI will generate these if you analyze)</span></label>
          <input type="text" value={form.tags} onChange={e => setField('tags', e.target.value)}
            placeholder="water, shadow, mother, labyrinth" className="field-input" />
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
      </div>
    </div>
  );
}
