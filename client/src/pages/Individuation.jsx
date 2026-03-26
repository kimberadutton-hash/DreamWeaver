import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { generateIndividuationNarrative, updateIndividuationNarrative, hasApiKey, AiError } from '../lib/ai';
import AiErrorMessage from '../components/AiErrorMessage';
import DreamPreviewDrawer from '../components/DreamPreviewDrawer';
import { format, parseISO } from 'date-fns';
import { formatDate } from '../lib/constants';

const MIN_DREAMS = 10;

// ── Theme configuration ──────────────────────────────────────────────────────

const THEME_CONFIG = {
  wounding:    { label: 'Wounding',    color: '#8b4a4a', bg: 'rgba(139,74,74,0.06)',   border: 'rgba(139,74,74,0.2)' },
  voice:       { label: 'Voice',       color: '#4a6b8b', bg: 'rgba(74,107,139,0.06)',  border: 'rgba(74,107,139,0.2)' },
  shadow:      { label: 'Shadow',      color: '#2a2420', bg: 'rgba(42,36,32,0.06)',    border: 'rgba(42,36,32,0.15)' },
  numinous:    { label: 'Numinous',    color: '#b8924a', bg: 'rgba(184,146,74,0.08)',  border: 'rgba(184,146,74,0.3)' },
  integration: { label: 'Integration', color: '#4a7a5a', bg: 'rgba(74,122,90,0.06)',   border: 'rgba(74,122,90,0.2)' },
  emergence:   { label: 'Emergence',   color: '#6b4a8b', bg: 'rgba(107,74,139,0.06)', border: 'rgba(107,74,139,0.2)' },
};

// ── SVG theme icons ──────────────────────────────────────────────────────────

function ThemeIcon({ theme, color }) {
  const icons = {
    wounding: (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
        <ellipse cx="20" cy="26" rx="12" ry="8" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M12 24 Q14 14 20 12 Q26 14 28 24" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        <path d="M17 18 L19 22 L21 18" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    voice: (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
        <ellipse cx="20" cy="20" rx="7" ry="9" stroke={color} strokeWidth="1.5"/>
        <path d="M10 20 Q10 30 20 30 Q30 30 30 20" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        <line x1="20" y1="30" x2="20" y2="34" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="15" y1="34" x2="25" y2="34" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M33 16 Q35 20 33 24" stroke={color} strokeWidth="1.2" strokeLinecap="round" fill="none"/>
        <path d="M36 13 Q39 20 36 27" stroke={color} strokeWidth="1.2" strokeLinecap="round" fill="none"/>
      </svg>
    ),
    shadow: (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
        <path d="M20 6 L20 10" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
        <path d="M12 10 Q20 8 28 10 L32 34 Q20 38 8 34 Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill={color} fillOpacity="0.08"/>
        <circle cx="20" cy="10" r="4" stroke={color} strokeWidth="1.5"/>
      </svg>
    ),
    numinous: (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
        <circle cx="20" cy="20" r="7" stroke={color} strokeWidth="1.5"/>
        <circle cx="20" cy="20" r="11" stroke={color} strokeWidth="0.8" strokeDasharray="2 3"/>
        {[0,45,90,135,180,225,270,315].map(deg => {
          const rad = (deg * Math.PI) / 180;
          const x1 = 20 + 13 * Math.cos(rad);
          const y1 = 20 + 13 * Math.sin(rad);
          const x2 = 20 + 17 * Math.cos(rad);
          const y2 = 20 + 17 * Math.sin(rad);
          return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="1.2" strokeLinecap="round"/>;
        })}
      </svg>
    ),
    integration: (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
        <circle cx="16" cy="20" r="9" stroke={color} strokeWidth="1.5" fill={color} fillOpacity="0.05"/>
        <circle cx="24" cy="20" r="9" stroke={color} strokeWidth="1.5" fill={color} fillOpacity="0.05"/>
      </svg>
    ),
    emergence: (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
        <path d="M20 34 L20 14" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M20 14 Q12 18 10 26" stroke={color} strokeWidth="1.3" strokeLinecap="round" fill="none"/>
        <path d="M20 14 Q28 18 30 26" stroke={color} strokeWidth="1.3" strokeLinecap="round" fill="none"/>
        <path d="M20 20 Q14 22 13 28" stroke={color} strokeWidth="1" strokeLinecap="round" fill="none"/>
        <path d="M20 20 Q26 22 27 28" stroke={color} strokeWidth="1" strokeLinecap="round" fill="none"/>
        <circle cx="20" cy="11" r="3" stroke={color} strokeWidth="1.3"/>
      </svg>
    ),
  };
  return icons[theme] || icons.emergence;
}

// ── Serialize v2 JSON narrative → readable text for AI update context ─────────

function narrativeToText(parsed) {
  const lines = [`${parsed.title}\n\n${parsed.thesis}`];
  (parsed.chapters || []).forEach(ch => {
    lines.push(`\n\n## ${ch.title}\n${ch.body}`);
  });
  if (parsed.closingInvitation) lines.push(`\n\n${parsed.closingInvitation}`);
  return lines.join('');
}

// ── Parse narrative record → structured object ───────────────────────────────

function parseNarrative(record) {
  if (!record) return null;
  const version = record.narrative_version || 1;
  if (version === 1) return { _v1: true, raw: record.narrative };
  try {
    const parsed = typeof record.narrative === 'string'
      ? JSON.parse(record.narrative)
      : record.narrative;
    return { ...parsed, _v1: false };
  } catch {
    return { _v1: true, raw: record.narrative };
  }
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Individuation() {
  const { user } = useAuth();

  const [dreamCount, setDreamCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState(null);

  const [currentRecord, setCurrentRecord] = useState(null);
  const [pastRecords, setPastRecords] = useState([]);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showRegenWarning, setShowRegenWarning] = useState(false);
  const [showUpdateWarning, setShowUpdateWarning] = useState(false);

  // Dream preview drawer
  const [drawerDreamTitle, setDrawerDreamTitle] = useState(null);

  // Chapter scroll refs + active chapter tracking
  const chapterRefs = useRef({});
  const [activeChapterId, setActiveChapterId] = useState(null);

  // Living questions — unanswered embodiment prompts
  const [livingQuestions, setLivingQuestions] = useState([]);

  // Recent waking life entries for strip
  const [recentWakingLife, setRecentWakingLife] = useState([]);

  useEffect(() => { loadData(); loadLivingQuestions(); loadRecentWakingLife(); }, []);

  async function loadData() {
    const [{ count }, { data: narratives }] = await Promise.all([
      supabase.from('dreams').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('individuation_narratives').select('*').eq('user_id', user.id).order('generated_at', { ascending: false }),
    ]);
    setDreamCount(count || 0);
    if (narratives?.length) {
      const current = narratives.find(n => n.is_current) || narratives[0];
      setPastRecords(narratives.filter(n => n.id !== current.id));
      setCurrentRecord(current);
    }
    setLoading(false);
  }

  async function loadLivingQuestions() {
    const { data } = await supabase
      .from('dreams')
      .select('id, title, dream_date, embodiment_prompt')
      .eq('user_id', user.id)
      .not('embodiment_prompt', 'is', null)
      .is('embodiment_checked_at', null)
      .order('created_at', { ascending: false })
      .limit(5);
    setLivingQuestions(data || []);
  }

  async function loadRecentWakingLife() {
    const { data } = await supabase
      .from('waking_life_entries')
      .select('id, entry_type, entry_date, title, media_url, media_type')
      .eq('user_id', user.id)
      .order('entry_date', { ascending: false })
      .limit(3);
    setRecentWakingLife(data || []);
  }

  async function handleSatWith(dreamId) {
    setLivingQuestions(prev => prev.filter(q => q.id !== dreamId));
    await supabase.from('dreams').update({
      embodiment_checked_at: new Date().toISOString(),
    }).eq('id', dreamId);
  }

  async function saveNarrative(parsed, dreamCountNow, lastDreamId) {
    if (currentRecord) {
      await supabase.from('individuation_narratives').update({ is_current: false }).eq('id', currentRecord.id);
    }
    const { data, error } = await supabase
      .from('individuation_narratives')
      .insert({
        user_id: user.id,
        narrative: JSON.stringify(parsed),
        narrative_version: 2,
        dream_count: dreamCountNow,
        last_dream_id: lastDreamId,
        is_current: true,
      })
      .select()
      .single();
    if (error) throw error;
    if (currentRecord) setPastRecords(prev => [{ ...currentRecord, is_current: false }, ...prev]);
    setCurrentRecord(data);
  }

  async function handleUpdate() {
    setShowUpdateWarning(false);
    setGenerating(true);
    setAiError(null);
    try {
      let newDreams = [];
      if (currentRecord?.last_dream_id) {
        const { data: anchor } = await supabase.from('dreams').select('created_at').eq('id', currentRecord.last_dream_id).single();
        if (anchor) {
          const { data } = await supabase.from('dreams')
            .select('dream_date, title, summary, body, archetypes, symbols, mood, is_big_dream, id')
            .eq('user_id', user.id)
            .gt('created_at', anchor.created_at)
            .order('dream_date', { ascending: true });
          newDreams = data || [];
        }
      }
      if (!newDreams.length) { await handleGenerateFull(); return; }

      // Serialize existing narrative for AI context
      const existing = parseNarrative(currentRecord);
      const previousNarrativeText = existing?._v1
        ? existing.raw
        : narrativeToText(existing);

      const parsed = await updateIndividuationNarrative({ previousNarrative: previousNarrativeText, newDreams });
      const lastDream = newDreams[newDreams.length - 1];
      await saveNarrative(parsed, dreamCount, lastDream.id);
    } catch (err) { setAiError(err); }
    finally { setGenerating(false); }
  }

  async function handleGenerateFull() {
    setShowRegenWarning(false);
    setShowAdvanced(false);
    setGenerating(true);
    setAiError(null);
    try {
      const { data: dreams, error: dbErr } = await supabase.from('dreams')
        .select('dream_date, title, summary, body, archetypes, symbols, mood, is_big_dream, id')
        .eq('user_id', user.id)
        .order('dream_date', { ascending: true });
      if (dbErr || !dreams?.length) { setAiError(new AiError('Could not load your dreams. Please try again.', 'api_error')); return; }
      const parsed = await generateIndividuationNarrative({ dreams });
      const lastDream = dreams[dreams.length - 1];
      await saveNarrative(parsed, dreams.length, lastDream.id);
    } catch (err) { setAiError(err); }
    finally { setGenerating(false); }
  }

  const canGenerate = dreamCount !== null && dreamCount >= MIN_DREAMS;
  const newDreamCount = currentRecord ? Math.max(0, dreamCount - (currentRecord.dream_count || 0)) : 0;
  const hasNew = newDreamCount > 0;
  const current = parseNarrative(currentRecord);

  // Set first chapter active once narrative loads
  useEffect(() => {
    if (current && !current._v1 && current.chapters?.length) {
      setActiveChapterId(current.chapters[0].id);
    }
  }, [currentRecord]);

  // IntersectionObserver to track active chapter while scrolling
  useEffect(() => {
    if (!current || current._v1 || !current.chapters?.length) return;
    const observers = [];
    current.chapters.forEach(ch => {
      const el = chapterRefs.current[ch.id];
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveChapterId(ch.id); },
        { rootMargin: '-30% 0px -60% 0px', threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach(o => o.disconnect());
  }, [current]);

  function scrollToChapter(id) {
    const el = chapterRefs.current[id];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const generatedDate = currentRecord?.generated_at
    ? (() => { try { return format(parseISO(currentRecord.generated_at), 'MMMM d, yyyy'); } catch { return ''; } })()
    : '';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="font-display italic text-xl text-ink/40">Loading…</p>
      </div>
    );
  }

  return (
    <>
      <DreamPreviewDrawer
        dreamTitle={drawerDreamTitle}
        isOpen={!!drawerDreamTitle}
        onClose={() => setDrawerDreamTitle(null)}
      />

      {/* Desktop chapter progress dots — fixed right side */}
      {current && !current._v1 && current.chapters?.length > 0 && (
        <div className="hidden xl:flex fixed right-8 top-1/2 -translate-y-1/2 z-30 flex-col gap-3">
          {current.chapters.map(ch => {
            const cfg = THEME_CONFIG[ch.theme] || THEME_CONFIG.emergence;
            const isActive = activeChapterId === ch.id;
            return (
              <div key={ch.id} className="relative group flex items-center justify-end gap-2">
                {/* Tooltip */}
                <span className="hidden group-hover:block absolute right-6 bg-ink text-white text-xs font-body px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-lg pointer-events-none">
                  {ch.title}
                </span>
                <button
                  onClick={() => scrollToChapter(ch.id)}
                  aria-label={`Go to: ${ch.title}`}
                  className="rounded-full transition-all duration-200"
                  style={{
                    width: isActive ? 10 : 7,
                    height: isActive ? 10 : 7,
                    backgroundColor: isActive ? cfg.color : 'rgba(42,36,32,0.2)',
                  }}
                />
              </div>
            );
          })}
        </div>
      )}

      <div className="max-w-3xl mx-auto px-6 sm:px-8 py-10 pb-24">

        {/* ── Living Questions ── */}
        {livingQuestions.length > 0 && (
          <div className="mb-10">
            <p style={{ fontSize: 9, letterSpacing: '0.18em' }} className="uppercase font-body text-ink/35 dark:text-white/25 mb-5">
              Living Questions
            </p>
            {livingQuestions.map((q, i) => (
              <div key={q.id}>
                {i > 0 && <div className="border-t border-gold/20 my-5" />}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-display italic leading-relaxed text-ink dark:text-white/85 mb-2" style={{ fontSize: 17 }}>
                      {q.embodiment_prompt}
                    </p>
                    <p className="text-xs font-body text-ink/35 dark:text-white/25">
                      {q.title || 'Untitled'} · {formatDate(q.dream_date)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleSatWith(q.id)}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-body text-ink/40 dark:text-white/30 hover:text-ink/70 dark:hover:text-white/55 border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 transition-colors whitespace-nowrap"
                  >
                    <span className="text-sm leading-none">◎</span>
                    I sat with this
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Recent Waking Life strip ── */}
        {recentWakingLife.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-3">
              <p style={{ fontSize: 9, letterSpacing: '0.18em' }} className="uppercase font-body text-ink/35 dark:text-white/25">
                Waking Life
              </p>
              <Link to="/waking-life" className="text-xs font-body text-gold/60 hover:text-gold transition-colors">
                View all →
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {recentWakingLife.map(entry => {
                const WAKING_COLORS = {
                  art: '#3d2b4a', music: '#4a7c74', writing: '#7c6b5a',
                  milestone: '#b8924a', body: '#9a4a6a', synchronicity: '#3a5a7a',
                };
                const color = WAKING_COLORS[entry.entry_type] || '#7c6b5a';
                return (
                  <Link
                    key={entry.id}
                    to="/waking-life"
                    className="shrink-0 w-44 rounded-xl border border-black/8 dark:border-white/8 bg-white/40 dark:bg-white/3 overflow-hidden hover:border-black/15 dark:hover:border-white/15 transition-all duration-150"
                  >
                    {entry.media_url && entry.media_type === 'image' && (
                      <div className="w-full h-24 overflow-hidden">
                        <img src={entry.media_url} alt={entry.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="px-3 py-2.5">
                      <span
                        style={{
                          fontSize: 8,
                          letterSpacing: '0.15em',
                          color,
                          backgroundColor: color + '22',
                          padding: '1px 6px',
                          borderRadius: 99,
                          textTransform: 'uppercase',
                          fontFamily: 'monospace',
                          display: 'inline-block',
                          marginBottom: 4,
                        }}
                      >
                        {entry.entry_type}
                      </span>
                      <p className="text-xs font-body text-ink/75 dark:text-white/60 leading-snug line-clamp-2">{entry.title}</p>
                      <p className="text-xs font-body text-ink/30 dark:text-white/20 mt-0.5">{formatDate(entry.entry_date)}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Static page chrome (shown when no narrative yet) ── */}
        {!current && (
          <div className="mb-10">
            <h1 className="font-display italic text-4xl text-ink dark:text-white mb-2">
              Individuation Journey
            </h1>
            <p className="text-sm font-body text-ink/50 dark:text-white/40">
              A Jungian analyst's perspective on your inner work, drawn from your full dream record.
            </p>
          </div>
        )}

        {/* API key warning */}
        {!hasApiKey() && (
          <div className="mb-8 flex items-start justify-between gap-4 px-5 py-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <p className="text-sm font-body text-amber-800 dark:text-amber-300">
              An Anthropic API key is required to generate your narrative.
            </p>
            <Link to="/settings" className="shrink-0 text-sm font-body font-medium text-amber-800 dark:text-amber-300 underline">
              Settings →
            </Link>
          </div>
        )}

        {aiError && <div className="mb-6"><AiErrorMessage error={aiError} /></div>}

        {/* Not enough dreams */}
        {!canGenerate && (
          <div className="mb-8 px-6 py-5 rounded-2xl border border-black/10 dark:border-white/10 bg-white/40 dark:bg-white/5">
            <p className="font-display italic text-xl text-ink/60 dark:text-white/50 mb-2">Still gathering the threads…</p>
            <p className="text-sm font-body text-ink/50 dark:text-white/40 leading-relaxed">
              This feature comes alive with at least {MIN_DREAMS} recorded dreams.
              You have <strong>{dreamCount}</strong> so far.
            </p>
          </div>
        )}

        {/* Generating state */}
        {generating && (
          <div className="text-center py-20">
            <p className="font-display italic text-2xl text-ink/40 dark:text-white/40 mb-3">
              Reading the threads of your inner life…
            </p>
            <p className="text-xs font-body text-ink/30 dark:text-white/25">
              This may take a moment — Opus is reading your dream archive.
            </p>
          </div>
        )}

        {/* ── v1 fallback narrative ── */}
        {!generating && current?._v1 && (
          <div>
            {/* Old-format banner */}
            <div className="mb-8 flex items-start justify-between gap-4 px-5 py-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
              <p className="text-sm font-body text-amber-800 dark:text-amber-300 leading-relaxed">
                This narrative was generated in an older format. Regenerate to see the new chapter view.
              </p>
            </div>
            <div className="mb-2">
              <p className="text-xs font-body text-ink/30 dark:text-white/25 uppercase tracking-widest mb-6">
                Generated {generatedDate}
                {currentRecord?.dream_count != null && <span className="ml-2">· {currentRecord.dream_count} dreams</span>}
              </p>
            </div>
            <div className="pl-5 border-l-2 border-gold/30">
              <LegacyNarrativeText text={current.raw} />
            </div>
          </div>
        )}

        {/* ── v2 structured narrative ── */}
        {!generating && current && !current._v1 && (
          <div>
            {/* Page header — the narrative's own title + thesis */}
            <div className="mb-10">
              <h1 className="font-display italic text-4xl sm:text-5xl text-ink dark:text-white leading-tight mb-6">
                {current.title}
              </h1>

              {current.thesis && (
                <p className="font-dream text-[18px] sm:text-[20px] leading-[1.75] text-ink/80 dark:text-white/80 max-w-[600px]">
                  {current.thesis}
                </p>
              )}

              <p className="text-xs font-body text-ink/30 dark:text-white/25 uppercase tracking-widest mt-6">
                Generated {generatedDate}
                {currentRecord?.dream_count != null && <span className="ml-2">· {currentRecord.dream_count} dreams</span>}
              </p>
            </div>

            {/* New dreams banner */}
            {hasNew && canGenerate && !showUpdateWarning && (
              <div className="mb-8 flex items-center justify-between gap-4 px-5 py-3.5 rounded-xl bg-plum/5 border border-plum/20 dark:border-white/15">
                <p className="text-sm font-body text-ink/70 dark:text-white/60">
                  <strong>{newDreamCount}</strong> new dream{newDreamCount !== 1 ? 's' : ''} since last narrative
                </p>
                <button
                  onClick={() => setShowUpdateWarning(true)}
                  disabled={!hasApiKey()}
                  className="shrink-0 text-sm font-body font-medium text-plum dark:text-gold hover:opacity-70 disabled:opacity-40 transition-opacity"
                >
                  Update narrative →
                </button>
              </div>
            )}

            {showUpdateWarning && (
              <div className="mb-8 p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 space-y-3">
                <p className="text-sm font-body text-amber-800 dark:text-amber-300 leading-relaxed">
                  <strong>This uses Claude Opus</strong> and will consume API credits to process your {newDreamCount} new dream{newDreamCount !== 1 ? 's' : ''}.
                </p>
                <div className="flex gap-3">
                  <button onClick={handleUpdate} className="px-5 py-2.5 rounded-xl font-body text-sm font-medium text-white" style={{ backgroundColor: '#3d2b4a' }}>Proceed</button>
                  <button onClick={() => setShowUpdateWarning(false)} className="px-5 py-2.5 rounded-xl font-body text-sm border border-black/15 dark:border-white/15 text-ink/60 dark:text-white/50 hover:bg-black/5 transition-colors">Cancel</button>
                </div>
              </div>
            )}

            {/* Chapter navigation pills */}
            {current.chapters?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-10">
                {current.chapters.map(ch => {
                  const cfg = THEME_CONFIG[ch.theme] || THEME_CONFIG.emergence;
                  const isActive = activeChapterId === ch.id;
                  return (
                    <button
                      key={ch.id}
                      onClick={() => scrollToChapter(ch.id)}
                      className="px-3.5 py-1.5 rounded-full text-xs font-body transition-all duration-150"
                      style={{
                        backgroundColor: isActive ? cfg.bg : 'transparent',
                        color: isActive ? cfg.color : 'rgba(42,36,32,0.4)',
                        border: `1px solid ${isActive ? cfg.border : 'rgba(42,36,32,0.12)'}`,
                      }}
                    >
                      {ch.title}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Chapter cards */}
            <div className="space-y-6">
              {(current.chapters || []).map((ch, idx) => (
                <ChapterCard
                  key={ch.id}
                  chapter={ch}
                  defaultExpanded={idx === 0}
                  chapterRef={el => { chapterRefs.current[ch.id] = el; }}
                  onDreamClick={setDrawerDreamTitle}
                />
              ))}
            </div>

            {/* Closing invitation */}
            {current.closingInvitation && (
              <div className="mt-16 mb-8 text-center">
                <div className="w-24 h-px bg-gold/40 mx-auto mb-10" />
                <p className="font-display italic text-xl sm:text-2xl text-ink/70 dark:text-white/70 max-w-lg mx-auto leading-relaxed">
                  {current.closingInvitation}
                </p>
              </div>
            )}
          </div>
        )}

        {/* First generate (no existing narrative) */}
        {!generating && !current && canGenerate && (
          <div className="mb-8">
            {!showRegenWarning ? (
              <button
                onClick={() => setShowRegenWarning(true)}
                disabled={!hasApiKey()}
                className="px-6 py-3 rounded-xl font-body text-sm font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: '#3d2b4a' }}
              >
                Generate Narrative
              </button>
            ) : (
              <RegenWarning dreamCount={dreamCount} onProceed={handleGenerateFull} onCancel={() => setShowRegenWarning(false)} />
            )}
          </div>
        )}

        {/* Advanced — full regenerate */}
        {!generating && current && canGenerate && (
          <div className="mt-10">
            <button
              onClick={() => setShowAdvanced(v => !v)}
              className="text-xs font-body text-ink/30 dark:text-white/25 hover:text-ink/60 dark:hover:text-white/40 transition-colors"
            >
              {showAdvanced ? '▲ Hide advanced' : '▼ Advanced'}
            </button>
            {showAdvanced && (
              <div className="mt-4">
                {!showRegenWarning ? (
                  <button
                    onClick={() => setShowRegenWarning(true)}
                    disabled={!hasApiKey()}
                    className="text-sm font-body text-ink/50 dark:text-white/40 hover:text-ink/80 dark:hover:text-white/70 disabled:opacity-40 underline transition-colors"
                  >
                    Regenerate full narrative from all {dreamCount} dreams
                  </button>
                ) : (
                  <RegenWarning dreamCount={dreamCount} onProceed={handleGenerateFull} onCancel={() => setShowRegenWarning(false)} />
                )}
              </div>
            )}
          </div>
        )}

        {/* Previous narratives */}
        {pastRecords.length > 0 && (
          <div className="mt-16">
            <h2 className="text-xs uppercase tracking-widest font-body text-ink/40 dark:text-white/30 mb-4">
              Previous Narratives
            </h2>
            <div className="space-y-3">
              {pastRecords.map(n => (
                <PastNarrativeEntry key={n.id} record={n} onDreamClick={setDrawerDreamTitle} />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ── Chapter card ──────────────────────────────────────────────────────────────

function ChapterCard({ chapter, defaultExpanded, chapterRef, onDreamClick }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const cfg = THEME_CONFIG[chapter.theme] || THEME_CONFIG.emergence;

  return (
    <div
      ref={chapterRef}
      className="rounded-2xl border overflow-hidden transition-shadow duration-200"
      style={{ borderColor: cfg.border, backgroundColor: cfg.bg }}
    >
      {/* Card header — always visible */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-start gap-4">
          {/* Theme icon */}
          <div className="shrink-0 mt-1">
            <ThemeIcon theme={chapter.theme} color={cfg.color} />
          </div>

          <div className="flex-1 min-w-0">
            {/* Theme label */}
            <p className="text-xs uppercase tracking-widest font-body mb-1.5" style={{ color: cfg.color, opacity: 0.7 }}>
              {cfg.label}
            </p>

            {/* Chapter title */}
            <h2 className="font-display italic text-2xl sm:text-3xl text-ink dark:text-white leading-tight mb-2">
              {chapter.title}
            </h2>

            {/* Core question */}
            {chapter.coreQuestion && (
              <p className="font-body italic text-sm leading-relaxed mb-3" style={{ color: cfg.color, opacity: 0.8 }}>
                {chapter.coreQuestion}
              </p>
            )}

            {/* Summary */}
            {chapter.summary && (
              <p className="text-sm font-body text-ink/50 dark:text-white/40 leading-relaxed">
                {chapter.summary}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Dream refs footer — always visible */}
      {chapter.dreamRefs?.length > 0 && (
        <div className="px-6 pb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-body text-ink/35 dark:text-white/30 shrink-0">Dreams:</span>
          {chapter.dreamRefs.map((ref, i) => (
            <button
              key={i}
              onClick={() => onDreamClick(ref.title)}
              className="px-2.5 py-1 rounded-lg text-xs font-body border transition-colors hover:opacity-80"
              style={{
                color: cfg.color,
                borderColor: cfg.border,
                backgroundColor: 'rgba(255,255,255,0.5)',
              }}
            >
              {ref.title}
            </button>
          ))}
        </div>
      )}

      {/* Expand/collapse toggle */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full px-6 py-3 text-left text-xs font-body transition-colors border-t flex items-center justify-between"
        style={{
          borderColor: cfg.border,
          color: cfg.color,
          backgroundColor: 'rgba(255,255,255,0.3)',
        }}
      >
        <span>{expanded ? 'Collapse' : 'Read this chapter'}</span>
        <span>{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="px-6 py-6 border-t" style={{ borderColor: cfg.border }}>
          <ChapterBody body={chapter.body} dreamRefs={chapter.dreamRefs} onDreamClick={onDreamClick} />
        </div>
      )}
    </div>
  );
}

// ── Chapter body with inline dream reference links ────────────────────────────

function ChapterBody({ body, dreamRefs, onDreamClick }) {
  if (!body) return null;

  // Build a lookup: title → ref object for matching inline references
  const refTitles = (dreamRefs || []).map(r => r.title);

  const paragraphs = body.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);

  return (
    <div className="space-y-5">
      {paragraphs.map((para, i) => (
        <InlineParagraph key={i} text={para} refTitles={refTitles} onDreamClick={onDreamClick} />
      ))}
    </div>
  );
}

// Renders a paragraph, making any dream ref title that appears in the text clickable.
// Matches are case-insensitive, word-boundary aware.
function InlineParagraph({ text, refTitles, onDreamClick }) {
  if (!refTitles.length) {
    return <p className="font-dream text-ink dark:text-white/90 leading-[1.9] text-[16px]">{text}</p>;
  }

  // Build a regex that matches any ref title
  const escaped = refTitles.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts = text.split(regex);

  return (
    <p className="font-dream text-ink dark:text-white/90 leading-[1.9] text-[16px]">
      {parts.map((part, i) => {
        const isRef = refTitles.some(t => t.toLowerCase() === part.toLowerCase());
        if (isRef) {
          return (
            <button
              key={i}
              onClick={() => onDreamClick(part)}
              className="font-dream text-[16px] leading-[1.9] border-b border-gold/60 hover:border-gold transition-colors cursor-pointer bg-transparent"
              style={{ color: 'inherit', font: 'inherit' }}
            >
              {part}
            </button>
          );
        }
        return part;
      })}
    </p>
  );
}

// ── Legacy (v1) narrative renderer ──────────────────────────────────────────

function LegacyNarrativeText({ text }) {
  if (!text) return null;
  const paragraphs = text
    .split(/\n{2,}/)
    .map(p => p.replace(/^#{1,6}\s*/gm, '').replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/^---+$/gm, '').trim())
    .filter(Boolean);
  return (
    <>
      {paragraphs.map((para, i) => (
        <p key={i} className={`font-dream text-ink dark:text-white/90 leading-[1.85] text-[16px]${i < paragraphs.length - 1 ? ' mb-5' : ''}`}>
          {para}
        </p>
      ))}
    </>
  );
}

// ── Past narrative entry ──────────────────────────────────────────────────────

function PastNarrativeEntry({ record, onDreamClick }) {
  const [expanded, setExpanded] = useState(false);
  const parsed = parseNarrative(record);
  const date = (() => { try { return format(parseISO(record.generated_at), 'MMMM d, yyyy'); } catch { return ''; } })();
  const title = parsed?._v1 ? 'Narrative' : (parsed?.title || 'Narrative');

  return (
    <div className="rounded-xl border border-black/8 dark:border-white/8 bg-white/40 dark:bg-white/5">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full text-left px-5 py-4 flex items-start justify-between gap-4"
      >
        <div>
          <p className="text-xs font-body text-ink/30 dark:text-white/25 mb-1">{date}</p>
          <p className="text-sm font-body text-ink/60 dark:text-white/50 font-medium">{title}</p>
          {record.dream_count != null && (
            <p className="text-xs font-body text-ink/30 dark:text-white/20 mt-0.5">{record.dream_count} dreams</p>
          )}
        </div>
        <span className="text-ink/30 dark:text-white/20 text-xs mt-1 shrink-0">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-black/5 dark:border-white/5 pt-4">
          {parsed?._v1 ? (
            <LegacyNarrativeText text={parsed.raw} />
          ) : (
            <div className="space-y-4">
              {parsed?.thesis && (
                <p className="font-dream text-ink/70 dark:text-white/60 text-[15px] leading-relaxed italic mb-4">
                  {parsed.thesis}
                </p>
              )}
              {(parsed?.chapters || []).map(ch => (
                <div key={ch.id} className="border-l-2 border-gold/20 pl-4">
                  <p className="text-xs font-body text-ink/40 dark:text-white/30 uppercase tracking-widest mb-1">{ch.title}</p>
                  <LegacyNarrativeText text={ch.body} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Regen warning ─────────────────────────────────────────────────────────────

function RegenWarning({ dreamCount, onProceed, onCancel }) {
  return (
    <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 space-y-3">
      <p className="text-sm font-body text-amber-800 dark:text-amber-300 leading-relaxed">
        <strong>This uses Claude Opus</strong> and will consume significant API credits —
        it reads your entire dream archive ({dreamCount} dreams). Best used when significant
        new material has accumulated, not more than once a month.
      </p>
      <div className="flex gap-3">
        <button onClick={onProceed} className="px-5 py-2.5 rounded-xl font-body text-sm font-medium text-white" style={{ backgroundColor: '#3d2b4a' }}>Proceed</button>
        <button onClick={onCancel} className="px-5 py-2.5 rounded-xl font-body text-sm border border-black/15 dark:border-white/15 text-ink/60 dark:text-white/50 hover:bg-black/5 transition-colors">Cancel</button>
      </div>
    </div>
  );
}
