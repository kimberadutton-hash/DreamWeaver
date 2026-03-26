import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { analyzeDream, buildDreamContext, generateDreamSummary, suggestAdditionalTags, identifyShadowMaterial } from '../lib/ai';
import { incrementAnalysisCount } from '../hooks/usePauseGate';
import { usePrivacySettings } from '../hooks/usePrivacySettings';
import AiErrorMessage from '../components/AiErrorMessage';
import { formatDateLong } from '../lib/constants';
import { JUNGIAN_TERMS } from '../lib/jungianTerms';

export default function DreamDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { privacySettings } = usePrivacySettings();

  const [dream, setDream] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [suggestions, setSuggestions] = useState(null);
  const [suggesting, setSuggesting] = useState(false);

  // Shadow material panel state
  const [shadowAnalysis, setShadowAnalysis] = useState(null); // loaded from dream.shadow_analysis
  const [shadowLoading, setShadowLoading] = useState(false);
  const [shadowError, setShadowError] = useState(null);

  // A. Scroll to reflection ref after analysis completes
  const reflectionRef = useRef(null);

  // C. Per-dream collapsible section state (persisted in localStorage)
  const sectionKey = `dream-sections-${id}`;
  const [sections, setSections] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`dream-sections-${id}`) || '{}'); }
    catch { return {}; }
  });

  function isSectionOpen(name) {
    return !!sections[name];
  }

  function toggleSection(name) {
    setSections(prev => {
      const next = { ...prev, [name]: !prev[name] };
      try { localStorage.setItem(sectionKey, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  useEffect(() => { fetchDream(); }, [id]);

  async function fetchDream() {
    const { data, error } = await supabase
      .from('dreams').select('*').eq('id', id).eq('user_id', user.id).single();
    if (error || !data) navigate('/archive');
    else {
      setDream(data);
      if (data.shadow_analysis) setShadowAnalysis(data.shadow_analysis);
    }
    setLoading(false);
  }

  async function handleDelete() {
    if (!confirm('Delete this dream permanently?')) return;
    setDeleting(true);
    await supabase.from('dreams').delete().eq('id', id);
    navigate('/archive');
  }

  async function handleAnalyzeNow() {
    incrementAnalysisCount(id); // Pattern 1: track repeated analysis of same dream
    setAnalyzing(true);
    setAiError(null);
    try {
      let dreamContext = null;
      try {
        const { data: recentDreams } = await supabase
          .from('dreams')
          .select('dream_date, title, summary, archetypes, symbols, mood, is_big_dream, body')
          .eq('user_id', user.id).neq('id', id)
          .order('dream_date', { ascending: false }).limit(15);
        if (recentDreams?.length) dreamContext = buildDreamContext(recentDreams);
      } catch (ctxErr) {
        console.warn('Dream context fetch failed — proceeding without context:', ctxErr);
      }

      const [data, summaryText] = await Promise.all([
        analyzeDream({
          title: dream.title, body: dream.body, mood: dream.mood,
          privacySettings, notes: dream.notes, analyst_session: dream.analyst_session, dreamContext,
        }),
        generateDreamSummary({ title: dream.title, body: dream.body, mood: dream.mood }),
      ]);

      const { data: updated, error: dbErr } = await supabase
        .from('dreams')
        .update({
          title: data.title || dream.title,
          reflection: data.reflection,
          archetypes: data.archetypes,
          symbols: data.symbols,
          tags: data.tags,
          invitation: data.invitation,
          structure: data.structure || null,
          embodiment_prompt: data.embodimentPrompt || null,
          summary: summaryText || null,
          has_analysis: true,
        })
        .eq('id', id).select().single();

      if (dbErr) throw dbErr;
      setDream(updated);
      // A. Scroll to reflection after React re-renders
      setTimeout(() => reflectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (err) {
      setAiError(err);
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSuggestTags() {
    setSuggesting(true);
    setAiError(null);
    try {
      const result = await suggestAdditionalTags({
        body: dream.body, mood: dream.mood,
        tags: dream.tags || [], symbols: dream.symbols || [], archetypes: dream.archetypes || [],
      });
      const existingTags = (dream.tags || []).map(t => t.toLowerCase());
      const existingSymbols = (dream.symbols || []).map(t => t.toLowerCase());
      const existingArchetypes = (dream.archetypes || []).map(t => t.toLowerCase());
      setSuggestions({
        tags: (result.tags || []).filter(t => !existingTags.includes(t.toLowerCase())),
        symbols: (result.symbols || []).filter(t => !existingSymbols.includes(t.toLowerCase())),
        archetypes: (result.archetypes || []).filter(t => !existingArchetypes.includes(t.toLowerCase())),
      });
    } catch (err) {
      setAiError(err);
    } finally {
      setSuggesting(false);
    }
  }

  async function handleRunShadowAnalysis() {
    setShadowLoading(true);
    setShadowError(null);
    try {
      const { data: recentEncounters } = await supabase
        .from('shadow_encounters')
        .select('title, projected_quality')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      const result = await identifyShadowMaterial({
        dreamBody: dream.body,
        dreamArchetypes: dream.archetypes || [],
        dreamSymbols: dream.symbols || [],
        existingShadowEncounters: recentEncounters || [],
      });

      setShadowAnalysis(result);

      // Cache result on the dream record
      await supabase
        .from('dreams')
        .update({ shadow_analysis: result })
        .eq('id', id);
    } catch (err) {
      setShadowError(err);
    } finally {
      setShadowLoading(false);
    }
  }

  function handlePrint() { window.print(); }

  function handleEmailAnalyst() {
    if (!profile?.analyst_email) { alert("Add your analyst's email in Settings first."); return; }
    const subject = encodeURIComponent(`Dream: ${dream.title || 'Untitled'}`);
    const body = encodeURIComponent(
      `Date: ${dream.dream_date}\n\nDream:\n${dream.body}\n\n` +
      (dream.analyst_session ? `Session Notes:\n${dream.analyst_session}` : '')
    );
    window.open(`mailto:${profile.analyst_email}?subject=${subject}&body=${body}`);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="font-display italic text-xl text-ink/40">Loading…</p>
    </div>
  );
  if (!dream) return null;

  const date = dream.dream_date ? formatDateLong(dream.dream_date) : '';
  const analystLabel = profile?.analyst_name || 'Analyst';
  const hasSuggestions = suggestions && (
    suggestions.tags?.length > 0 || suggestions.symbols?.length > 0 || suggestions.archetypes?.length > 0
  );

  // D. Tag count summary for collapsed preview
  const tagCount = (dream.tags || []).length;
  const archetypeCount = (dream.archetypes || []).length;
  const symbolCount = (dream.symbols || []).length;
  const symbolsPreview = (tagCount + archetypeCount + symbolCount) > 0
    ? [
        tagCount > 0 && `${tagCount} tag${tagCount !== 1 ? 's' : ''}`,
        archetypeCount > 0 && `${archetypeCount} archetype${archetypeCount !== 1 ? 's' : ''}`,
        symbolCount > 0 && `${symbolCount} symbol${symbolCount !== 1 ? 's' : ''}`,
      ].filter(Boolean).join(' · ')
    : 'None yet';

  const clip = (s, n = 60) => s ? s.slice(0, n) + (s.length > n ? '…' : '') : null;

  return (
    <div className="max-w-2xl mx-auto px-8 py-10">

      {/* Back */}
      <Link to="/archive" className="text-sm font-body text-ink/40 hover:text-ink dark:text-white/40 dark:hover:text-white transition-colors">
        ← Dream Archive
      </Link>

      {/* ── 1. Page header ── */}
      <div className="mt-6 mb-8">
        <p className="text-xs uppercase tracking-widest text-ink/40 dark:text-white/40 font-body mb-2">{date}</p>
        <div className="flex items-start gap-3 flex-wrap mb-3">
          <h1 className="font-display italic text-4xl text-ink dark:text-white leading-tight">
            {dream.title || 'Untitled Dream'}
          </h1>
          {dream.is_big_dream && (
            <span className="mt-2 px-2.5 py-1 rounded-full text-xs font-body bg-gold/15 text-gold-dark dark:text-gold border border-gold/30 shrink-0">
              ✦ Big Dream
            </span>
          )}
        </div>
        {dream.mood?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {dream.mood.map(m => (
              <span key={m} className="px-3 py-1 rounded-full text-xs font-body bg-plum/10 text-plum dark:bg-white/10 dark:text-white/60">{m}</span>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-x-5 gap-y-2 items-center">
          {!dream.has_analysis && (
            <button onClick={handleAnalyzeNow} disabled={analyzing}
              className="px-4 py-2 rounded-lg text-sm font-body font-medium text-white bg-plum disabled:opacity-50 transition-opacity">
              {analyzing ? 'Hearing the dream…' : '✦ Hear this dream'}
            </button>
          )}
          <Link to={`/dream/${id}/edit`} className="text-sm font-body text-ink/50 hover:text-ink dark:text-white/40 dark:hover:text-white transition-colors">
            Edit
          </Link>
          <button onClick={handlePrint} className="text-sm font-body text-ink/50 hover:text-ink dark:text-white/40 dark:hover:text-white transition-colors">
            Print
          </button>
          <button onClick={handleDelete} disabled={deleting} className="text-sm font-body text-red-400 hover:text-red-600 transition-colors disabled:opacity-50">
            Delete
          </button>
        </div>
      </div>

      {aiError && <div className="mb-6"><AiErrorMessage error={aiError} /></div>}

      {/* ── 2. Incubation intention ── */}
      {dream.incubation_intention && (
        <div className="mb-8 pl-4 border-l-2 border-gold/40">
          <p className="font-display italic text-lg text-ink/60 dark:text-white/50 leading-relaxed">
            {dream.incubation_intention}
          </p>
        </div>
      )}

      {/* ── 3. The Dream ── */}
      <div className="mb-10">
        <h2 className="text-xs uppercase tracking-widest font-body text-ink/40 dark:text-white/30 mb-4">The Dream</h2>
        <p className="dream-body whitespace-pre-wrap leading-relaxed">{dream.body}</p>
      </div>

      {/* ── 4. Dream Structure arc (B: with affordance signals) ── */}
      <DreamStructure structure={dream.structure} />

      {/* ── 5. Jungian Reflection (A: scroll target) ── */}
      {dream.reflection && (
        <div ref={reflectionRef} style={{ scrollMarginTop: 24 }} className="mb-8 pl-5 border-l-2 border-gold/40">
          <h2 className="text-xs uppercase tracking-widest font-body text-ink/40 dark:text-white/30 mb-3">
            Jungian Reflection
          </h2>
          <p className="font-dream whitespace-pre-wrap text-ink dark:text-white/90">{dream.reflection}</p>
          {dream.invitation && (
            <p className="mt-4 font-dream italic text-[15px] text-ink/60 dark:text-white/50 leading-relaxed">{dream.invitation}</p>
          )}
        </div>
      )}

      {/* ── F. Shadow Material ── */}
      {dream.has_analysis && (
        <div className="mb-8">
          {!shadowAnalysis && !shadowLoading && (
            <button
              onClick={handleRunShadowAnalysis}
              className="flex items-center gap-2 text-sm font-body transition-colors"
              style={{ color: 'rgba(61,43,74,0.5)' }}
              onMouseEnter={e => e.currentTarget.style.color = '#3d2b4a'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(61,43,74,0.5)'}
            >
              <span>◈</span>
              <span>Explore shadow material →</span>
            </button>
          )}
          {shadowLoading && (
            <p className="text-sm font-body text-ink/30 dark:text-white/25 italic">Listening for shadow…</p>
          )}
          {shadowError && (
            <div className="mt-2"><AiErrorMessage error={shadowError} /></div>
          )}
          {shadowAnalysis && (
            <div className="rounded-xl border border-black/8 dark:border-white/8 bg-white/30 dark:bg-white/3 px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs uppercase tracking-widest font-body text-ink/35 dark:text-white/30">Shadow Material</h3>
                <button
                  onClick={handleRunShadowAnalysis}
                  disabled={shadowLoading}
                  className="text-xs font-body text-ink/25 hover:text-ink/50 dark:text-white/20 dark:hover:text-white/40 transition-colors disabled:opacity-30"
                >
                  ↻ refresh
                </button>
              </div>

              {shadowAnalysis.shadowFigures?.length > 0 && (
                <div className="mb-3">
                  <p style={{ fontSize: 9, letterSpacing: '0.12em' }} className="uppercase font-body text-ink/25 dark:text-white/20 mb-1.5">Shadow figures</p>
                  <div className="flex flex-wrap gap-1.5">
                    {shadowAnalysis.shadowFigures.map(fig => (
                      <span
                        key={fig}
                        className="px-2.5 py-0.5 rounded-full text-xs font-body"
                        style={{ backgroundColor: '#3d2b4a1a', color: '#3d2b4a', fontFamily: 'monospace' }}
                      >
                        {fig}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {shadowAnalysis.projectedQualities?.length > 0 && (
                <div className="mb-3">
                  <p style={{ fontSize: 9, letterSpacing: '0.12em' }} className="uppercase font-body text-ink/25 dark:text-white/20 mb-1.5">Projected qualities</p>
                  <div className="flex flex-wrap gap-1.5">
                    {shadowAnalysis.projectedQualities.map(q => (
                      <span
                        key={q}
                        className="px-2.5 py-0.5 rounded-full text-xs font-body"
                        style={{ backgroundColor: '#9a4a6a1a', color: '#9a4a6a', fontFamily: 'monospace' }}
                      >
                        {q}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {shadowAnalysis.reflectionPrompt && (
                <p className="font-display italic text-base text-ink/65 dark:text-white/55 leading-relaxed mb-3">
                  {shadowAnalysis.reflectionPrompt}
                </p>
              )}

              <Link
                to={`/shadow?dreamId=${id}${shadowAnalysis.projectedQualities?.[0] ? `&quality=${encodeURIComponent(shadowAnalysis.projectedQualities[0])}` : ''}`}
                className="text-xs font-body transition-colors"
                style={{ color: 'rgba(61,43,74,0.4)' }}
                onMouseEnter={e => e.currentTarget.style.color = '#3d2b4a'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(61,43,74,0.4)'}
              >
                Record as shadow encounter →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── 6. This Week — embodiment prompt ── */}
      {dream.embodiment_prompt && (
        <div className="mb-10">
          <div className="border-t border-gold/25 mt-2 mb-8" />
          <div className="text-center px-4">
            <p style={{ fontSize: 9, letterSpacing: '0.2em' }} className="uppercase font-body text-ink/30 dark:text-white/25 mb-5">
              this week
            </p>
            <p className="font-display italic text-xl text-ink/70 dark:text-white/60 leading-relaxed max-w-[600px] mx-auto">
              {dream.embodiment_prompt}
            </p>
          </div>
          {dream.embodiment_response && (
            <div className="mt-8 mx-auto max-w-[600px] px-4">
              <div className="pl-4 border-l-2 border-gold/30 py-3">
                <p style={{ fontSize: 9, letterSpacing: '0.2em' }} className="uppercase font-body text-ink/30 dark:text-white/25 mb-2">
                  what shifted
                </p>
                <p className="text-sm font-body text-ink/55 dark:text-white/45 leading-relaxed">
                  {dream.embodiment_response}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── C+D. Collapsible sections ── */}
      <div className="mt-4">

        {/* 7. Symbols & Archetypes — collapsed by default, count preview */}
        <CollapsibleSection
          title="Symbols & Archetypes"
          preview={symbolsPreview}
          isOpen={isSectionOpen('symbols')}
          onToggle={() => toggleSection('symbols')}
        >
          <div className="space-y-3 mt-2">
            <EditableTagRow label="Tags" tags={dream.tags || []} color="bg-plum/8 text-plum/70 dark:bg-white/10 dark:text-white/50" field="tags" dreamId={id} onUpdate={setDream} />
            <EditableTagRow label="Archetypes" tags={dream.archetypes || []} color="bg-gold/10 text-gold-dark dark:bg-gold/15 dark:text-gold" field="archetypes" dreamId={id} onUpdate={setDream} isArchetypes />
            <EditableTagRow label="Symbols" tags={dream.symbols || []} color="bg-ink/5 text-ink/60 dark:bg-white/5 dark:text-white/40" field="symbols" dreamId={id} onUpdate={setDream} />
            {!suggestions && (
              <div className="pt-1">
                <button onClick={handleSuggestTags} disabled={suggesting} className="text-xs font-body text-gold/70 hover:text-gold disabled:opacity-40 transition-colors">
                  {suggesting ? 'Thinking…' : '✦ Suggest more tags'}
                </button>
              </div>
            )}
            {suggestions && (
              <div className="mt-2 pt-3 border-t border-black/5 dark:border-white/5">
                {hasSuggestions ? (
                  <>
                    <p className="text-xs uppercase tracking-widest font-body text-ink/30 dark:text-white/25 mb-3">
                      Suggestions — accept or dismiss each
                    </p>
                    {['tags', 'archetypes', 'symbols'].map(field =>
                      suggestions[field]?.length > 0 ? (
                        <div key={field} className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="text-xs font-body text-ink/30 dark:text-white/20 w-20 shrink-0 capitalize">{field}</span>
                          {suggestions[field].map(tag => (
                            <SuggestionChip key={tag} tag={tag} field={field} dreamId={id} dream={dream}
                              onAccept={updated => { setDream(updated); setSuggestions(prev => ({ ...prev, [field]: prev[field].filter(t => t !== tag) })); }}
                              onDismiss={() => setSuggestions(prev => ({ ...prev, [field]: prev[field].filter(t => t !== tag) }))}
                            />
                          ))}
                        </div>
                      ) : null
                    )}
                  </>
                ) : (
                  <p className="text-xs font-body text-ink/30 dark:text-white/25">No additional suggestions.</p>
                )}
                <button onClick={() => setSuggestions(null)} className="mt-2 text-xs font-body text-ink/25 hover:text-ink/50 dark:text-white/20 dark:hover:text-white/40 transition-colors">
                  Dismiss all
                </button>
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* 8. Your Associations */}
        {dream.dreamer_associations && (
          <CollapsibleSection
            title="Your Associations"
            preview={clip(dream.dreamer_associations)}
            isOpen={isSectionOpen('associations')}
            onToggle={() => toggleSection('associations')}
          >
            <p className="text-sm font-body text-ink/70 dark:text-white/60 leading-relaxed whitespace-pre-wrap mt-2">
              {dream.dreamer_associations}
            </p>
          </CollapsibleSection>
        )}

        {/* 9. In the Days After */}
        <CollapsibleSection
          title="In the Days After"
          preview={clip(dream.waking_resonances?.[0]) || clip(dream.notes)}
          isOpen={isSectionOpen('after')}
          onToggle={() => toggleSection('after')}
        >
          <div className="mt-2 space-y-6">
            <WakingResonances dream={dream} onUpdate={setDream} dreamId={id} />
            {dream.notes && (
              <div>
                <h3 className="text-xs uppercase tracking-widest font-body text-ink/30 dark:text-white/25 mb-2 flex items-center gap-2">
                  My Notes
                  {privacySettings.share_notes_with_ai
                    ? <span className="text-amber-500 normal-case tracking-normal text-xs font-normal">◈ shared with AI</span>
                    : <span className="text-ink/30 dark:text-white/30 normal-case tracking-normal text-xs font-normal">◎ private</span>
                  }
                </h3>
                <p className="text-sm font-body text-ink/70 dark:text-white/60 leading-relaxed whitespace-pre-wrap">{dream.notes}</p>
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* 10. With the Analyst */}
        <CollapsibleSection
          title={`With ${analystLabel}`}
          preview={clip(dream.analyst_session)}
          isOpen={isSectionOpen('analyst')}
          onToggle={() => toggleSection('analyst')}
        >
          <div className="mt-2 space-y-4">
            {dream.analyst_session ? (
              <div>
                <h3 className="text-xs uppercase tracking-widest font-body text-ink/30 dark:text-white/25 mb-2 flex items-center gap-2">
                  Session Notes
                  {privacySettings.share_analyst_session_with_ai
                    ? <span className="text-amber-500 normal-case tracking-normal text-xs font-normal">◈ shared with AI</span>
                    : <span className="text-ink/30 dark:text-white/30 normal-case tracking-normal text-xs font-normal">◎ private</span>
                  }
                </h3>
                <p className="text-sm font-body text-ink/70 dark:text-white/60 leading-relaxed whitespace-pre-wrap">{dream.analyst_session}</p>
              </div>
            ) : (
              <p className="text-xs font-body text-ink/30 dark:text-white/25 italic">No session notes for this dream.</p>
            )}
            <div className="pt-2 border-t border-black/5 dark:border-white/5 flex flex-wrap gap-x-6 gap-y-1">
              <button onClick={handleEmailAnalyst} className="text-xs font-body text-ink/40 dark:text-white/30 hover:text-plum dark:hover:text-gold transition-colors">
                Email {analystLabel} about this dream
              </button>
              <Link to="/letter" className="text-xs font-body text-ink/30 dark:text-white/25 hover:text-plum dark:hover:text-gold transition-colors">
                ◎ Prepare session letter →
              </Link>
              <Link to={`/imagination?dreamId=${dream.id}`} className="text-xs font-body text-ink/30 dark:text-white/25 hover:text-plum dark:hover:text-gold transition-colors">
                ◎ Begin active imagination with a figure from this dream →
              </Link>
            </div>
          </div>
        </CollapsibleSection>
      </div>

      <div className="h-8" />
    </div>
  );
}

// ── Collapsible section wrapper ──────────────────────────────────────────────

function CollapsibleSection({ title, preview, isOpen, onToggle, children }) {
  return (
    <div className="border-t border-black/8 dark:border-white/8">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-3.5 text-left group"
      >
        <span className="text-xs uppercase tracking-widest font-body text-ink/40 dark:text-white/30 group-hover:text-ink/60 dark:group-hover:text-white/50 transition-colors">
          {title}
        </span>
        <div className="flex items-center gap-3 min-w-0 ml-4">
          {!isOpen && preview && (
            <span className="text-xs font-body text-ink/30 dark:text-white/20 truncate max-w-[180px]">
              {preview}
            </span>
          )}
          <span
            className="text-ink/25 dark:text-white/20 text-lg leading-none shrink-0 transition-transform duration-200"
            style={{ display: 'inline-block', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
          >
            ›
          </span>
        </div>
      </button>
      {isOpen && <div className="pb-6">{children}</div>}
    </div>
  );
}

// ── Waking Resonances ────────────────────────────────────────────────────────

function WakingResonances({ dream, dreamId, onUpdate }) {
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);
  const resonances = dream.waking_resonances || [];

  async function handleAdd() {
    const text = input.trim();
    if (!text) return;
    setSaving(true);
    const updated = [...resonances, text];
    const { data, error } = await supabase
      .from('dreams').update({ waking_resonances: updated }).eq('id', dreamId).select().single();
    if (!error && data) { onUpdate(data); setInput(''); }
    setSaving(false);
  }

  async function handleDelete(index) {
    const updated = resonances.filter((_, i) => i !== index);
    const { data, error } = await supabase
      .from('dreams').update({ waking_resonances: updated }).eq('id', dreamId).select().single();
    if (!error && data) onUpdate(data);
  }

  return (
    <div>
      <h3 className="text-xs uppercase tracking-widest font-body text-ink/30 dark:text-white/25 mb-1">
        Waking Resonances
      </h3>
      <p className="text-xs font-body text-ink/30 dark:text-white/25 mb-4">
        Moments where this dream's symbols appeared in waking life
      </p>
      {resonances.length > 0 && (
        <div className="space-y-2 mb-4">
          {resonances.map((r, i) => (
            <div key={i} className="flex items-start justify-between gap-3 px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-black/8 dark:border-white/8">
              <p className="text-sm font-body text-ink/80 dark:text-white/70 leading-relaxed flex-1">{r}</p>
              <button onClick={() => handleDelete(i)} className="text-xs font-body text-red-400 hover:text-red-600 transition-colors shrink-0 mt-0.5">
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input type="text" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !saving && handleAdd()}
          placeholder="Add a resonance…" className="flex-1 field-input" />
        <button onClick={handleAdd} disabled={saving || !input.trim()}
          className="px-4 py-2.5 rounded-xl font-body text-sm font-medium text-white disabled:opacity-50 transition-opacity shrink-0 bg-plum">
          {saving ? '…' : 'Add'}
        </button>
      </div>
    </div>
  );
}

// ── Dream Structure arc (B: affordance signals) ──────────────────────────────

const STRUCTURE_META = {
  exposition:   { label: 'Exposition',   desc: 'The opening situation' },
  development:  { label: 'Development',  desc: 'Rising action and tension' },
  peripeteia:   { label: 'Peripeteia',   desc: 'The pivotal moment' },
  lysis:        { label: 'Lysis',        desc: 'How the dream resolves' },
  catastrophe:  { label: 'Catastrophe',  desc: 'Collapse or destruction' },
};

function DreamStructure({ structure }) {
  const [active, setActive] = useState(null);
  const [pulseActive, setPulseActive] = useState(true); // peripeteia pulses once on mount
  const [hintSeen, setHintSeen] = useState(
    () => localStorage.getItem('dream-structure-hint-seen') === 'true'
  );

  if (!structure) return null;

  const hasCatastrophe = !!structure.catastrophe;
  const showHint = !active && !hintSeen;

  const points = [
    { key: 'exposition',  x: 65,  y: 108, r: 5 },
    { key: 'development', x: 215, y: 68,  r: 5 },
    { key: 'peripeteia',  x: 375, y: 33,  r: 8 },
    { key: 'lysis',       x: 525, y: 78,  r: 5 },
  ];
  if (hasCatastrophe) points.push({ key: 'catastrophe', x: 555, y: 125, r: 5 });

  const labelY = { exposition: 126, development: 52, peripeteia: 18, lysis: 96, catastrophe: 143 };
  const viewH = hasCatastrophe ? 158 : 150;

  function handleToggle(key) {
    if (!hintSeen) {
      setHintSeen(true);
      localStorage.setItem('dream-structure-hint-seen', 'true');
    }
    setActive(prev => prev === key ? null : key);
  }

  return (
    <div className="mb-8">
      <h2 className="text-xs uppercase tracking-widest font-body text-ink/40 dark:text-white/30 mb-3">
        Dream Structure
      </h2>

      {/* B: CSS for hover scale, glow, and peripeteia pulse */}
      <style>{`
        .arc-point { cursor: pointer; }
        .arc-dot {
          transition: transform 0.2s ease, filter 0.2s ease;
          transform-box: fill-box;
          transform-origin: center;
        }
        .arc-point:hover .arc-dot {
          transform: scale(1.2);
          filter: drop-shadow(0 0 5px rgba(184,146,74,0.65));
        }
        @keyframes peripeteia-pulse {
          0%   { transform: scale(1);   }
          50%  { transform: scale(1.3); }
          100% { transform: scale(1);   }
        }
        .peripeteia-pulse-anim {
          animation: peripeteia-pulse 0.8s ease-out 1;
          transform-box: fill-box;
          transform-origin: center;
        }
      `}</style>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 595 ${viewH}`} className="w-full" style={{ maxHeight: `${viewH}px` }}>
          <defs>
            <filter id="ds-wobble" x="-5%" y="-5%" width="110%" height="110%">
              <feTurbulence type="fractalNoise" baseFrequency="0.025" numOctaves="3" seed="4" result="noise"/>
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.2" xChannelSelector="R" yChannelSelector="G"/>
            </filter>
          </defs>

          <path d="M 65,108 C 135,102 175,75 215,68 C 280,60 325,38 375,33 C 422,28 482,52 525,78"
            fill="none" stroke="#b8924a" strokeWidth="1.5" strokeLinecap="round" opacity="0.55"
            filter="url(#ds-wobble)" />

          {hasCatastrophe && (
            <path d="M 525,78 C 531,91 545,110 555,125"
              fill="none" stroke="#b8924a" strokeWidth="1.5" strokeLinecap="round"
              strokeDasharray="4 3" opacity="0.45" filter="url(#ds-wobble)" />
          )}

          {points.map(({ key, x, y, r }) => {
            const isApex = key === 'peripeteia';
            const isActive = active === key;
            return (
              <g key={key} className="arc-point" onClick={() => handleToggle(key)}>
                <circle cx={x} cy={y} r={r + 10} fill="transparent" />
                <circle
                  cx={x} cy={y} r={r}
                  fill={isApex || isActive ? '#b8924a' : 'none'}
                  stroke="#b8924a"
                  strokeWidth={isApex ? 0 : 1.5}
                  opacity={isActive ? 1 : (isApex ? 0.75 : 0.55)}
                  className={`arc-dot${isApex && pulseActive ? ' peripeteia-pulse-anim' : ''}`}
                  onAnimationEnd={() => { if (isApex) setPulseActive(false); }}
                />
                <text x={x} y={labelY[key]} textAnchor="middle" fill="#b8924a" fontSize="9.5"
                  fontFamily="DM Sans, sans-serif" opacity={isActive ? 1 : 0.45}
                  style={{ userSelect: 'none' }}>
                  {STRUCTURE_META[key].label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* B: Helper text — hides after first click */}
      {showHint && (
        <p className="text-center text-xs font-body text-ink/25 dark:text-white/20 mt-1">
          Click any point to explore the dream's structure
        </p>
      )}

      {/* Active panel */}
      {active && structure[active] && (
        <div className="mt-2 px-5 py-4 rounded-xl bg-gold/5 border border-gold/20">
          <p className="text-xs uppercase tracking-widest font-body text-gold/50 mb-2">
            {STRUCTURE_META[active].label} — {STRUCTURE_META[active].desc}
          </p>
          <p className="text-sm font-body text-ink/70 dark:text-white/60 leading-relaxed">
            {structure[active]}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Editable tag row ─────────────────────────────────────────────────────────

function EditableTagRow({ label, tags, color, field, dreamId, onUpdate, isArchetypes }) {
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  async function handleRemove(tag) {
    const updated = tags.filter(t => t !== tag);
    const { data, error } = await supabase
      .from('dreams').update({ [field]: updated }).eq('id', dreamId).select().single();
    if (!error && data) onUpdate(data);
  }

  async function handleAdd() {
    const tag = input.trim();
    if (!tag || tags.map(t => t.toLowerCase()).includes(tag.toLowerCase())) { setInput(''); return; }
    setSaving(true);
    const updated = [...tags, tag];
    const { data, error } = await supabase
      .from('dreams').update({ [field]: updated }).eq('id', dreamId).select().single();
    if (!error && data) { onUpdate(data); setInput(''); }
    setSaving(false);
  }

  function getArchetypeEntry(tag) {
    if (!isArchetypes) return null;
    const tagLower = tag.toLowerCase();
    // 1. Exact match
    let entry = JUNGIAN_TERMS.find(t => t.term.toLowerCase() === tagLower);
    if (entry) return entry;
    // 2. Strip leading "The " and try substring match (handles "Shadow" → "The Shadow",
    //    "Anima" → "The Anima / Animus", "Child" → "The Child Archetype")
    entry = JUNGIAN_TERMS.find(t => {
      const core = t.term.toLowerCase().replace(/^the\s+/, '');
      return core === tagLower || core.includes(tagLower) || tagLower.includes(core);
    });
    if (entry) return entry;
    // 3. Significant-word overlap (handles "Wise Old Man" → "The Wise Guide",
    //    "Wise Woman" → "The Wise Guide", "Inner Child" → "The Child Archetype")
    const stop = new Set(['the', 'a', 'an', 'of', 'and', 'or', 'in', 'old']);
    const tagWords = tagLower.split(/\s+/).filter(w => !stop.has(w));
    entry = JUNGIAN_TERMS.find(t => {
      const termWords = t.term.toLowerCase().split(/\s+/).filter(w => !stop.has(w));
      return tagWords.some(w => termWords.includes(w));
    });
    return entry || null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-body text-ink/30 dark:text-white/20 w-20 shrink-0">{label}</span>
      {tags.map(tag => {
        const entry = getArchetypeEntry(tag);
        return (
          <span
            key={tag}
            className={`flex items-center gap-1 pl-2.5 pr-1.5 py-0.5 rounded-full text-xs font-body ${color} ${entry ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
            title={entry?.oneLiner}
            onClick={entry ? () => navigate(`/reference#${entry.id}`) : undefined}
          >
            {tag}
            <button
              onClick={e => { e.stopPropagation(); handleRemove(tag); }}
              className="opacity-40 hover:opacity-90 transition-opacity leading-none ml-0.5"
              aria-label={`Remove ${tag}`}
            >✕</button>
          </span>
        );
      })}
      <div className="flex items-center gap-1">
        <input type="text" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
          placeholder="+ add"
          className="text-xs font-body bg-transparent border-b border-black/15 dark:border-white/15 px-1 py-0.5 w-16 focus:outline-none focus:border-plum dark:focus:border-gold placeholder-ink/25 dark:placeholder-white/20 text-ink/60 dark:text-white/50"
        />
        {input.trim() && (
          <button onClick={handleAdd} disabled={saving} className="text-xs font-body text-plum dark:text-gold opacity-60 hover:opacity-100 transition-opacity">
            {saving ? '…' : '↵'}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Suggestion chip ──────────────────────────────────────────────────────────

function SuggestionChip({ tag, field, dreamId, dream, onAccept, onDismiss }) {
  const [accepting, setAccepting] = useState(false);

  async function handleAccept() {
    setAccepting(true);
    const existing = dream[field] || [];
    const updated = [...existing, tag];
    const { data, error } = await supabase
      .from('dreams').update({ [field]: updated }).eq('id', dreamId).select().single();
    if (!error && data) onAccept(data);
    setAccepting(false);
  }

  return (
    <span className="flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-full text-xs font-body border border-gold/40 text-gold/70 dark:text-gold/60 bg-gold/5">
      {tag}
      <button onClick={handleAccept} disabled={accepting} className="opacity-60 hover:opacity-100 transition-opacity leading-none px-0.5" aria-label={`Accept ${tag}`} title="Accept">
        {accepting ? '…' : '✓'}
      </button>
      <button onClick={onDismiss} className="opacity-40 hover:opacity-80 transition-opacity leading-none px-0.5" aria-label={`Dismiss ${tag}`} title="Dismiss">
        ✕
      </button>
    </span>
  );
}
