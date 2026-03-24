import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { analyzeDream, generateDreamSummary, suggestAdditionalTags } from '../lib/ai';
import { usePrivacySettings } from '../hooks/usePrivacySettings';
import AiErrorMessage from '../components/AiErrorMessage';
import { format, parseISO } from 'date-fns';

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

  const [suggestions, setSuggestions] = useState(null); // { tags, symbols, archetypes }
  const [suggesting, setSuggesting] = useState(false);

  useEffect(() => {
    fetchDream();
  }, [id]);

  async function fetchDream() {
    const { data, error } = await supabase
      .from('dreams')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !data) navigate('/archive');
    else setDream(data);
    setLoading(false);
  }

  async function handleDelete() {
    if (!confirm('Delete this dream permanently?')) return;
    setDeleting(true);
    await supabase.from('dreams').delete().eq('id', id);
    navigate('/archive');
  }

  async function handleAnalyzeNow() {
    setAnalyzing(true);
    setAiError(null);
    try {
      const [data, summaryText] = await Promise.all([
        analyzeDream({
          title: dream.title,
          body: dream.body,
          mood: dream.mood,
          privacySettings,
          notes: dream.notes,
          analyst_session: dream.analyst_session,
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
          summary: summaryText || null,
          has_analysis: true,
        })
        .eq('id', id)
        .select()
        .single();

      if (dbErr) throw dbErr;
      setDream(updated);
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
        body: dream.body,
        mood: dream.mood,
        tags: dream.tags || [],
        symbols: dream.symbols || [],
        archetypes: dream.archetypes || [],
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

  function handlePrint() {
    window.print();
  }

  function handleEmailAnalyst() {
    if (!profile?.analyst_email) {
      alert('Add your analyst\'s email in Settings first.');
      return;
    }
    const subject = encodeURIComponent(`Dream: ${dream.title || 'Untitled'}`);
    const body = encodeURIComponent(
      `Date: ${dream.dream_date}\n\nDream:\n${dream.body}\n\n` +
      (dream.analyst_session ? `Session Notes:\n${dream.analyst_session}` : '')
    );
    window.open(`mailto:${profile.analyst_email}?subject=${subject}&body=${body}`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="font-display italic text-xl text-ink/40">Loading…</p>
      </div>
    );
  }

  if (!dream) return null;

  const date = dream.dream_date ? format(parseISO(dream.dream_date), 'EEEE, MMMM d, yyyy') : '';
  const analystLabel = profile?.analyst_name || 'Analyst';

  const hasSuggestions = suggestions && (
    suggestions.tags?.length > 0 ||
    suggestions.symbols?.length > 0 ||
    suggestions.archetypes?.length > 0
  );

  return (
    <div className="max-w-2xl mx-auto px-8 py-10">
      {/* Back + actions */}
      <div className="flex items-center justify-between mb-8">
        <Link to="/archive" className="text-sm font-body text-ink/40 hover:text-ink dark:text-white/40 dark:hover:text-white transition-colors">
          ← Archive
        </Link>
        <div className="flex gap-3">
          {!dream.has_analysis && (
            <button
              onClick={handleAnalyzeNow}
              disabled={analyzing}
              className="text-sm font-body text-gold hover:text-gold-dark transition-colors disabled:opacity-50"
            >
              {analyzing ? 'Analyzing…' : '✦ Analyze'}
            </button>
          )}
          <Link to={`/dream/${id}/edit`} className="text-sm font-body text-ink/50 hover:text-ink dark:text-white/40 dark:hover:text-white transition-colors">
            Edit
          </Link>
          <button onClick={handlePrint} className="text-sm font-body text-ink/50 hover:text-ink dark:text-white/40 dark:hover:text-white transition-colors">
            Print
          </button>
          <button onClick={handleEmailAnalyst} className="text-sm font-body text-ink/50 hover:text-ink dark:text-white/40 dark:hover:text-white transition-colors">
            Email {analystLabel}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-sm font-body text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>

      {aiError && <div className="mb-4"><AiErrorMessage error={aiError} /></div>}

      {/* Header */}
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-ink/40 dark:text-white/40 font-body mb-2">{date}</p>
        <div className="flex items-start gap-3 flex-wrap">
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
          <div className="flex flex-wrap gap-2 mt-3">
            {dream.mood.map(m => (
              <span key={m} className="px-3 py-1 rounded-full text-xs font-body bg-plum/10 text-plum dark:bg-white/10 dark:text-white/60">
                {m}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Incubation intention */}
      {dream.incubation_intention && (
        <div className="mb-8 px-5 py-4 rounded-xl border border-gold/20 bg-gold/5">
          <p className="text-xs uppercase tracking-widest text-gold/60 font-body mb-1">Intention set before sleep</p>
          <p className="font-display italic text-lg text-ink/70 dark:text-white/60 leading-relaxed">
            {dream.incubation_intention}
          </p>
        </div>
      )}

      {/* Dream body */}
      <Section title="The Dream">
        <p className="dream-body whitespace-pre-wrap">{dream.body}</p>
      </Section>

      {/* Tags / symbols — always visible so you can add even if empty */}
      <div className="mb-8 space-y-3">
        <EditableTagRow
          label="Tags"
          tags={dream.tags || []}
          color="bg-plum/8 text-plum/70 dark:bg-white/10 dark:text-white/50"
          field="tags"
          dreamId={id}
          onUpdate={setDream}
        />
        <EditableTagRow
          label="Archetypes"
          tags={dream.archetypes || []}
          color="bg-gold/10 text-gold-dark dark:bg-gold/15 dark:text-gold"
          field="archetypes"
          dreamId={id}
          onUpdate={setDream}
        />
        <EditableTagRow
          label="Symbols"
          tags={dream.symbols || []}
          color="bg-ink/5 text-ink/60 dark:bg-white/5 dark:text-white/40"
          field="symbols"
          dreamId={id}
          onUpdate={setDream}
        />

        {/* Suggest more tags button */}
        {!suggestions && (
          <div className="pt-1">
            <button
              onClick={handleSuggestTags}
              disabled={suggesting}
              className="text-xs font-body text-gold/70 hover:text-gold disabled:opacity-40 transition-colors"
            >
              {suggesting ? 'Thinking…' : '✦ Suggest more tags'}
            </button>
          </div>
        )}

        {/* Pending suggestions */}
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
                        <SuggestionChip
                          key={tag}
                          tag={tag}
                          field={field}
                          dreamId={id}
                          dream={dream}
                          onAccept={updated => {
                            setDream(updated);
                            setSuggestions(prev => ({ ...prev, [field]: prev[field].filter(t => t !== tag) }));
                          }}
                          onDismiss={() =>
                            setSuggestions(prev => ({ ...prev, [field]: prev[field].filter(t => t !== tag) }))
                          }
                        />
                      ))}
                    </div>
                  ) : null
                )}
              </>
            ) : (
              <p className="text-xs font-body text-ink/30 dark:text-white/25">No additional suggestions.</p>
            )}
            <button
              onClick={() => setSuggestions(null)}
              className="mt-2 text-xs font-body text-ink/25 hover:text-ink/50 dark:text-white/20 dark:hover:text-white/40 transition-colors"
            >
              Dismiss all
            </button>
          </div>
        )}
      </div>

      {/* My Notes */}
      {dream.notes && (
        <Section
          title="My Notes"
          badge={privacySettings.share_notes_with_ai
            ? <span className="text-amber-500 normal-case tracking-normal text-xs font-normal">◈ shared with AI</span>
            : <span className="text-ink/30 dark:text-white/30 normal-case tracking-normal text-xs font-normal">◎ private</span>
          }
        >
          <p className="text-sm font-body text-ink/70 dark:text-white/60 leading-relaxed whitespace-pre-wrap">
            {dream.notes}
          </p>
        </Section>
      )}

      {/* Jungian Reflection */}
      {dream.reflection && (
        <Section title="Jungian Reflection" accent>
          <p className="font-dream whitespace-pre-wrap text-ink dark:text-white/90">
            {dream.reflection}
          </p>
          {dream.invitation && (
            <p className="mt-4 font-display italic text-lg text-gold-dark dark:text-gold">
              {dream.invitation}
            </p>
          )}
        </Section>
      )}

      {/* Analyst Session */}
      {dream.analyst_session && (
        <Section
          title={`${analystLabel} Session`}
          badge={privacySettings.share_analyst_session_with_ai
            ? <span className="text-amber-500 normal-case tracking-normal text-xs font-normal">◈ shared with AI</span>
            : <span className="text-ink/30 dark:text-white/30 normal-case tracking-normal text-xs font-normal">◎ private</span>
          }
        >
          <p className="text-sm font-body text-ink/70 dark:text-white/60 leading-relaxed whitespace-pre-wrap">
            {dream.analyst_session}
          </p>
        </Section>
      )}

      {/* Waking Resonances */}
      <WakingResonances dream={dream} onUpdate={updated => setDream(updated)} dreamId={id} />
    </div>
  );
}

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
      .from('dreams')
      .update({ waking_resonances: updated })
      .eq('id', dreamId)
      .select()
      .single();
    if (!error && data) { onUpdate(data); setInput(''); }
    setSaving(false);
  }

  async function handleDelete(index) {
    const updated = resonances.filter((_, i) => i !== index);
    const { data, error } = await supabase
      .from('dreams')
      .update({ waking_resonances: updated })
      .eq('id', dreamId)
      .select()
      .single();
    if (!error && data) onUpdate(data);
  }

  return (
    <div className="mb-8">
      <h2 className="text-xs uppercase tracking-widest font-body text-ink/40 dark:text-white/30 mb-1">
        Waking Resonances
      </h2>
      <p className="text-xs font-body text-ink/30 dark:text-white/25 mb-4">
        Moments where this dream's symbols appeared in waking life
      </p>

      {resonances.length > 0 && (
        <div className="space-y-2 mb-4">
          {resonances.map((r, i) => (
            <div key={i} className="flex items-start justify-between gap-3 px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-black/8 dark:border-white/8">
              <p className="text-sm font-body text-ink/80 dark:text-white/70 leading-relaxed flex-1">{r}</p>
              <button
                onClick={() => handleDelete(i)}
                className="text-xs font-body text-red-400 hover:text-red-600 transition-colors shrink-0 mt-0.5"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !saving && handleAdd()}
          placeholder="Add a resonance…"
          className="flex-1 field-input"
        />
        <button
          onClick={handleAdd}
          disabled={saving || !input.trim()}
          className="px-4 py-2.5 rounded-xl font-body text-sm font-medium text-white disabled:opacity-50 transition-opacity shrink-0"
          style={{ backgroundColor: '#3d2b4a' }}
        >
          {saving ? '…' : 'Add'}
        </button>
      </div>
    </div>
  );
}

function Section({ title, children, accent, badge }) {
  return (
    <div className={`mb-8 ${accent ? 'pl-5 border-l-2 border-gold/40' : ''}`}>
      <h2 className="text-xs uppercase tracking-widest font-body text-ink/40 dark:text-white/30 mb-3 flex items-center gap-2">
        {title}
        {badge}
      </h2>
      {children}
    </div>
  );
}

function EditableTagRow({ label, tags, color, field, dreamId, onUpdate }) {
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleRemove(tag) {
    const updated = tags.filter(t => t !== tag);
    const { data, error } = await supabase
      .from('dreams')
      .update({ [field]: updated })
      .eq('id', dreamId)
      .select()
      .single();
    if (!error && data) onUpdate(data);
  }

  async function handleAdd() {
    const tag = input.trim();
    if (!tag || tags.map(t => t.toLowerCase()).includes(tag.toLowerCase())) {
      setInput('');
      return;
    }
    setSaving(true);
    const updated = [...tags, tag];
    const { data, error } = await supabase
      .from('dreams')
      .update({ [field]: updated })
      .eq('id', dreamId)
      .select()
      .single();
    if (!error && data) { onUpdate(data); setInput(''); }
    setSaving(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-body text-ink/30 dark:text-white/20 w-20 shrink-0">{label}</span>
      {tags.map(tag => (
        <span key={tag} className={`flex items-center gap-1 pl-2.5 pr-1.5 py-0.5 rounded-full text-xs font-body ${color}`}>
          {tag}
          <button
            onClick={() => handleRemove(tag)}
            className="opacity-40 hover:opacity-90 transition-opacity leading-none ml-0.5"
            aria-label={`Remove ${tag}`}
          >
            ✕
          </button>
        </span>
      ))}
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
          placeholder="+ add"
          className="text-xs font-body bg-transparent border-b border-black/15 dark:border-white/15 px-1 py-0.5 w-16 focus:outline-none focus:border-plum dark:focus:border-gold placeholder-ink/25 dark:placeholder-white/20 text-ink/60 dark:text-white/50"
        />
        {input.trim() && (
          <button
            onClick={handleAdd}
            disabled={saving}
            className="text-xs font-body text-plum dark:text-gold opacity-60 hover:opacity-100 transition-opacity"
          >
            {saving ? '…' : '↵'}
          </button>
        )}
      </div>
    </div>
  );
}

function SuggestionChip({ tag, field, dreamId, dream, onAccept, onDismiss }) {
  const [accepting, setAccepting] = useState(false);

  async function handleAccept() {
    setAccepting(true);
    const existing = dream[field] || [];
    const updated = [...existing, tag];
    const { data, error } = await supabase
      .from('dreams')
      .update({ [field]: updated })
      .eq('id', dreamId)
      .select()
      .single();
    if (!error && data) onAccept(data);
    setAccepting(false);
  }

  return (
    <span className="flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-full text-xs font-body border border-gold/40 text-gold/70 dark:text-gold/60 bg-gold/5">
      {tag}
      <button
        onClick={handleAccept}
        disabled={accepting}
        className="opacity-60 hover:opacity-100 transition-opacity leading-none px-0.5"
        aria-label={`Accept ${tag}`}
        title="Accept"
      >
        {accepting ? '…' : '✓'}
      </button>
      <button
        onClick={onDismiss}
        className="opacity-40 hover:opacity-80 transition-opacity leading-none px-0.5"
        aria-label={`Dismiss ${tag}`}
        title="Dismiss"
      >
        ✕
      </button>
    </span>
  );
}
