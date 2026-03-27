import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { suggestComplexes, hasApiKey, AiError } from '../lib/ai';
import AiErrorMessage from '../components/AiErrorMessage';

const toSlug = (name) =>
  name.toLowerCase()
    .replace(/\//g, '-')
    .replace(/the\s/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z-]/g, '')
    .replace(/-+/g, '-')
    .trim();

// ── Integration status config ─────────────────────────────────────────────────

const STATUSES = [
  { value: 'active',             label: 'Active',             color: '#8b4a4a', bg: 'rgba(139,74,74,0.08)',  border: 'rgba(139,74,74,0.2)' },
  { value: 'becoming-conscious', label: 'Becoming conscious', color: '#b8924a', bg: 'rgba(184,146,74,0.08)', border: 'rgba(184,146,74,0.25)' },
  { value: 'metabolizing',       label: 'Metabolizing',       color: '#4a6b8b', bg: 'rgba(74,107,139,0.08)', border: 'rgba(74,107,139,0.2)' },
  { value: 'integrated',         label: 'Integrated',         color: '#4a7a5a', bg: 'rgba(74,122,90,0.08)',  border: 'rgba(74,122,90,0.2)' },
];

function statusCfg(value) {
  return STATUSES.find(s => s.value === value) || STATUSES[0];
}

function nextStatus(value) {
  const idx = STATUSES.findIndex(s => s.value === value);
  return STATUSES[(idx + 1) % STATUSES.length].value;
}

// ── Aggregate dream archive patterns for suggestComplexes ─────────────────────

function buildPatterns(dreams) {
  const archetypeCounts = {};
  const symbolCounts = {};
  const moodCounts = {};

  dreams.forEach(d => {
    (d.archetypes || []).forEach(a => { archetypeCounts[a] = (archetypeCounts[a] || 0) + 1; });
    (d.symbols || []).forEach(s => { symbolCounts[s] = (symbolCounts[s] || 0) + 1; });
    if (d.mood) moodCounts[d.mood] = (moodCounts[d.mood] || 0) + 1;
  });

  const toTuples = (obj) =>
    Object.entries(obj).sort((a, b) => b[1] - a[1]);

  return {
    allArchetypes: toTuples(archetypeCounts),
    allSymbols:    toTuples(symbolCounts),
    allMoods:      toTuples(moodCounts),
    dreamTitles:   dreams.map(d => d.title).filter(Boolean),
  };
}

// ── Inline editable field ─────────────────────────────────────────────────────

function EditableText({ value, onSave, multiline = false, placeholder = '', className = '' }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const ref = useRef(null);

  function handleBlur() {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed !== (value || '').trim()) onSave(trimmed);
  }

  useEffect(() => { if (editing && ref.current) ref.current.focus(); }, [editing]);
  useEffect(() => { setDraft(value || ''); }, [value]);

  if (!editing) {
    return (
      <span
        className={`cursor-text hover:bg-black/[0.03] dark:hover:bg-white/[0.03] rounded px-0.5 -mx-0.5 transition-colors ${className}`}
        onClick={() => setEditing(true)}
        title="Click to edit"
      >
        {value || <span className="text-ink/30 dark:text-white/20 italic">{placeholder}</span>}
      </span>
    );
  }

  if (multiline) {
    return (
      <textarea
        ref={ref}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={handleBlur}
        rows={3}
        placeholder={placeholder}
        className={`w-full resize-none bg-transparent border-b border-gold/40 focus:outline-none focus:border-gold/70 ${className}`}
      />
    );
  }

  return (
    <input
      ref={ref}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={`bg-transparent border-b border-gold/40 focus:outline-none focus:border-gold/70 w-full ${className}`}
    />
  );
}

// ── Complex card ──────────────────────────────────────────────────────────────

function ComplexCard({ complex, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const cfg = statusCfg(complex.integration_status);

  function handleField(field) {
    return (value) => onUpdate(complex.id, { [field]: value });
  }

  function handleStatusCycle() {
    onUpdate(complex.id, { integration_status: nextStatus(complex.integration_status) });
  }

  return (
    <div
      className="rounded-2xl border transition-all duration-200"
      style={{
        borderColor: expanded ? cfg.border : 'rgba(42,36,32,0.08)',
        backgroundColor: expanded ? cfg.bg : 'transparent',
      }}
    >
      {/* Card header — always visible */}
      <div
        className="flex items-start gap-3 px-5 py-4 cursor-pointer"
        onClick={() => { setExpanded(e => !e); setConfirmDelete(false); }}
      >
        {/* Status dot */}
        <div className="mt-1.5 shrink-0 w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />

        <div className="flex-1 min-w-0">
          <p className="font-display italic text-[17px] text-ink dark:text-white leading-snug">
            {complex.name || 'Unnamed complex'}
          </p>
          {!expanded && complex.description && (
            <p className="text-xs font-body text-ink/45 dark:text-white/35 mt-0.5 line-clamp-1">
              {complex.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={e => { e.stopPropagation(); handleStatusCycle(); }}
            className="text-[10px] font-body px-2 py-0.5 rounded-full border transition-colors"
            style={{ color: cfg.color, backgroundColor: cfg.bg, borderColor: cfg.border }}
            title="Click to advance integration status"
          >
            {cfg.label}
          </button>
          <svg
            viewBox="0 0 12 12"
            fill="none"
            className="w-3 h-3 text-ink/25 dark:text-white/20 transition-transform duration-200"
            style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-5 pb-5 space-y-4" onClick={e => e.stopPropagation()}>
          <div className="border-t border-black/5 dark:border-white/5 pt-4">
            {/* Name editing */}
            <div className="mb-4">
              <p style={{ fontSize: 9, letterSpacing: '0.16em' }} className="uppercase font-body text-ink/30 dark:text-white/20 mb-1">
                Name
              </p>
              <EditableText
                value={complex.name}
                onSave={handleField('name')}
                placeholder="Name this complex"
                className="font-display italic text-[17px] text-ink dark:text-white"
              />
            </div>

            {/* Description */}
            <div className="mb-4">
              <p style={{ fontSize: 9, letterSpacing: '0.16em' }} className="uppercase font-body text-ink/30 dark:text-white/20 mb-1">
                Description
              </p>
              <EditableText
                value={complex.description}
                onSave={handleField('description')}
                multiline
                placeholder="What is this complex about?"
                className="text-sm font-body text-ink/75 dark:text-white/60 leading-relaxed"
              />
            </div>

            {/* Dream manifestations */}
            <div className="mb-4">
              <p style={{ fontSize: 9, letterSpacing: '0.16em' }} className="uppercase font-body text-ink/30 dark:text-white/20 mb-1">
                How it appears in dreams
              </p>
              <EditableText
                value={complex.dream_manifestations}
                onSave={handleField('dream_manifestations')}
                multiline
                placeholder="Recurring figures, settings, moods…"
                className="text-sm font-body text-ink/75 dark:text-white/60 leading-relaxed"
              />
            </div>

            {/* Waking manifestations */}
            <div className="mb-4">
              <p style={{ fontSize: 9, letterSpacing: '0.16em' }} className="uppercase font-body text-ink/30 dark:text-white/20 mb-1">
                How it appears in waking life
              </p>
              <EditableText
                value={complex.waking_manifestations}
                onSave={handleField('waking_manifestations')}
                multiline
                placeholder="Reactions, patterns, compulsions…"
                className="text-sm font-body text-ink/75 dark:text-white/60 leading-relaxed"
              />
            </div>

            {/* What it needs */}
            <div className="mb-4">
              <p style={{ fontSize: 9, letterSpacing: '0.16em' }} className="uppercase font-body text-ink/30 dark:text-white/20 mb-1">
                What it needs
              </p>
              <EditableText
                value={complex.what_it_needs}
                onSave={handleField('what_it_needs')}
                multiline
                placeholder="What is this complex asking for?"
                className="text-sm font-body text-ink/75 dark:text-white/60 leading-relaxed"
              />
            </div>

            {/* Related archetypes (read-only display if present) */}
            {Array.isArray(complex.related_archetypes) && complex.related_archetypes.length > 0 && (
              <div className="mb-4">
                <p style={{ fontSize: 9, letterSpacing: '0.16em' }} className="uppercase font-body text-ink/30 dark:text-white/20 mb-2">
                  Related archetypes
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {complex.related_archetypes.map((a, i) => (
                    <Link
                      key={i}
                      to={`/reference#${toSlug(a)}`}
                      className="text-[10px] font-body px-2 py-0.5 rounded-full border border-black/10 dark:border-white/10 text-ink/50 dark:text-white/40 hover:border-gold/40 hover:text-gold transition-colors"
                    >
                      {a}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* AI evidence note */}
            {complex.ai_suggested && complex.origin_story && (
              <div className="mb-4 px-3 py-2.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30">
                <p style={{ fontSize: 9, letterSpacing: '0.14em' }} className="uppercase font-body text-amber-600/70 dark:text-amber-400/50 mb-1">
                  Dream evidence
                </p>
                <p className="text-xs font-body text-amber-800/70 dark:text-amber-300/60 leading-relaxed">
                  {complex.origin_story}
                </p>
              </div>
            )}

            {/* Delete */}
            <div className="flex justify-end pt-2">
              {confirmDelete ? (
                <div className="flex items-center gap-3">
                  <span className="text-xs font-body text-ink/50 dark:text-white/40">Remove this complex?</span>
                  <button
                    onClick={() => onDelete(complex.id)}
                    className="text-xs font-body text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                  >
                    Yes, remove
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-xs font-body text-ink/40 dark:text-white/30 hover:text-ink/60 dark:hover:text-white/50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="text-xs font-body text-ink/25 dark:text-white/20 hover:text-ink/45 dark:hover:text-white/35 transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Suggestion card ───────────────────────────────────────────────────────────

function SuggestionCard({ suggestion, onAdd, onDismiss }) {
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    setAdding(true);
    await onAdd(suggestion);
  }

  return (
    <div className="rounded-2xl border border-amber-300/40 dark:border-amber-700/30 bg-amber-50/40 dark:bg-amber-950/15 px-5 py-4">
      <p className="font-display italic text-[16px] text-ink dark:text-white mb-1.5">
        {suggestion.name}
      </p>
      <p className="text-sm font-body text-ink/60 dark:text-white/50 leading-relaxed mb-2">
        {suggestion.description}
      </p>
      {suggestion.dreamEvidence && (
        <p className="text-xs font-body text-ink/40 dark:text-white/30 leading-relaxed mb-3 italic">
          "{suggestion.dreamEvidence}"
        </p>
      )}
      {Array.isArray(suggestion.relatedArchetypes) && suggestion.relatedArchetypes.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {suggestion.relatedArchetypes.map((a, i) => (
            <span key={i} className="text-[10px] font-body px-2 py-0.5 rounded-full bg-amber-100/60 dark:bg-amber-900/30 border border-amber-200/50 dark:border-amber-700/30 text-amber-700/70 dark:text-amber-300/50">
              {a}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-3">
        <button
          onClick={handleAdd}
          disabled={adding}
          className="text-xs font-body px-3 py-1.5 rounded-lg bg-ink/90 dark:bg-white/15 text-white dark:text-white/85 hover:bg-ink dark:hover:bg-white/20 disabled:opacity-50 transition-colors"
        >
          {adding ? 'Adding…' : 'Add to my map'}
        </button>
        <button
          onClick={() => onDismiss(suggestion.name)}
          className="text-xs font-body text-ink/35 dark:text-white/25 hover:text-ink/55 dark:hover:text-white/45 transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

// ── New complex form ──────────────────────────────────────────────────────────

function NewComplexForm({ onSave, onCancel }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await onSave({ name: name.trim(), description: description.trim() });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/40 dark:bg-white/3 px-5 py-5 space-y-4">
      <div>
        <label className="block text-[10px] font-body uppercase tracking-widest text-ink/40 dark:text-white/30 mb-1.5">Name</label>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Name this complex"
          className="w-full bg-transparent border-b border-black/15 dark:border-white/15 focus:border-gold/60 focus:outline-none font-display italic text-[17px] text-ink dark:text-white pb-1 transition-colors"
        />
      </div>
      <div>
        <label className="block text-[10px] font-body uppercase tracking-widest text-ink/40 dark:text-white/30 mb-1.5">Description (optional)</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="What is this complex about?"
          rows={2}
          className="w-full bg-transparent border-b border-black/15 dark:border-white/15 focus:border-gold/60 focus:outline-none resize-none text-sm font-body text-ink/75 dark:text-white/60 leading-relaxed pb-1 transition-colors"
        />
      </div>
      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={!name.trim() || saving}
          className="text-sm font-body px-4 py-1.5 rounded-lg bg-ink/90 dark:bg-white/15 text-white dark:text-white/85 hover:bg-ink dark:hover:bg-white/20 disabled:opacity-40 transition-colors"
        >
          {saving ? 'Saving…' : 'Add complex'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm font-body text-ink/40 dark:text-white/30 hover:text-ink/60 dark:hover:text-white/50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ComplexesMap() {
  const { user } = useAuth();
  const [complexes, setComplexes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dreamCount, setDreamCount] = useState(0);

  // Suggestion flow
  const [suggestions, setSuggestions] = useState([]);
  const [dismissed, setDismissed] = useState([]);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState(null);
  const [suggestDone, setSuggestDone] = useState(false);

  // Add complex form
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [{ data: complexData }, { count }] = await Promise.all([
      supabase.from('complexes').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
      supabase.from('dreams').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ]);
    setComplexes(complexData || []);
    setDreamCount(count || 0);
    setLoading(false);
  }

  async function handleSuggest() {
    setSuggesting(true);
    setSuggestError(null);
    try {
      const { data: dreams } = await supabase
        .from('dreams')
        .select('title, archetypes, symbols, mood')
        .eq('user_id', user.id)
        .order('dream_date', { ascending: false });

      const patterns = buildPatterns(dreams || []);
      const existingNames = complexes.map(c => c.name);

      const result = await suggestComplexes({
        ...patterns,
        existingComplexes: existingNames,
      });

      const newSuggestions = (result?.complexes || []).filter(
        s => !dismissed.includes(s.name) && !existingNames.includes(s.name)
      );
      setSuggestions(newSuggestions);
      setSuggestDone(true);
    } catch (err) {
      setSuggestError(err);
    } finally {
      setSuggesting(false);
    }
  }

  async function handleAddSuggestion(suggestion) {
    const row = {
      user_id: user.id,
      name: suggestion.name,
      description: suggestion.description || null,
      origin_story: suggestion.dreamEvidence || null,
      related_archetypes: suggestion.relatedArchetypes || [],
      integration_status: suggestion.integrationStatus || 'active',
      ai_suggested: true,
    };
    const { data, error } = await supabase.from('complexes').insert(row).select().single();
    if (!error && data) {
      setComplexes(prev => [...prev, data]);
      setSuggestions(prev => prev.filter(s => s.name !== suggestion.name));
    }
  }

  function handleDismissSuggestion(name) {
    setDismissed(prev => [...prev, name]);
    setSuggestions(prev => prev.filter(s => s.name !== name));
  }

  async function handleAddManual({ name, description }) {
    const row = {
      user_id: user.id,
      name,
      description: description || null,
      integration_status: 'active',
      ai_suggested: false,
    };
    const { data, error } = await supabase.from('complexes').insert(row).select().single();
    if (!error && data) {
      setComplexes(prev => [...prev, data]);
      setShowAddForm(false);
    }
  }

  async function handleUpdate(id, fields) {
    setComplexes(prev => prev.map(c => c.id === id ? { ...c, ...fields } : c));
    await supabase.from('complexes').update(fields).eq('id', id);
  }

  async function handleDelete(id) {
    setComplexes(prev => prev.filter(c => c.id !== id));
    await supabase.from('complexes').delete().eq('id', id);
  }

  const canSuggest = dreamCount >= 10;
  const visibleSuggestions = suggestions.filter(s => !dismissed.includes(s.name));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="font-display italic text-xl text-ink/40">A moment…</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 sm:px-8 py-10 pb-24">

      {/* ── Header ── */}
      <div className="mb-10">
        <h1 className="font-display italic text-4xl text-ink dark:text-white mb-2">
          Complexes Map
        </h1>
        <p className="text-sm font-body text-ink/50 dark:text-white/40 mb-6">
          The autonomous patterns running beneath awareness.
        </p>
        <p className="font-display italic text-[15px] leading-relaxed text-gold/70 dark:text-gold/50">
          "Everyone knows nowadays that people 'have complexes.' What is not so well known, though far more important theoretically, is that complexes can have us."
        </p>
        <p style={{ fontSize: 10, letterSpacing: '0.12em' }} className="uppercase font-body text-ink/25 dark:text-white/20 mt-2">
          C. G. Jung
        </p>
      </div>

      {/* ── API key warning ── */}
      {!hasApiKey() && (
        <div className="mb-8 flex items-start justify-between gap-4 px-5 py-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <p className="text-sm font-body text-amber-800 dark:text-amber-300">
            An Anthropic API key is required to discover complexes.
          </p>
          <Link to="/settings" className="shrink-0 text-sm font-body font-medium text-amber-800 dark:text-amber-300 underline">
            Settings →
          </Link>
        </div>
      )}

      {/* ── Not enough dreams ── */}
      {!canSuggest && complexes.length === 0 && (
        <div className="mb-10 px-6 py-5 rounded-2xl border border-black/10 dark:border-white/10 bg-white/40 dark:bg-white/5">
          <p className="font-display italic text-xl text-ink/60 dark:text-white/50 mb-2">
            Still gathering the patterns…
          </p>
          <p className="text-sm font-body text-ink/50 dark:text-white/40 leading-relaxed">
            Complexes reveal themselves through repetition. Record at least 10 dreams to discover what is running beneath.
            You have <strong>{dreamCount}</strong> so far.
          </p>
        </div>
      )}

      {/* ── AI suggestion area ── */}
      {canSuggest && !suggestDone && (
        <div className="mb-10">
          <div className="px-6 py-5 rounded-2xl border border-black/8 dark:border-white/8 bg-white/30 dark:bg-white/3">
            <p className="font-display italic text-[17px] text-ink dark:text-white mb-1.5">
              Discover what is running beneath
            </p>
            <p className="text-sm font-body text-ink/50 dark:text-white/40 leading-relaxed mb-4">
              Opus will read the patterns across your dream archive — recurring figures, moods, symbols, themes —
              and identify the autonomous complexes they point toward.
            </p>
            {suggestError && (
              <div className="mb-4"><AiErrorMessage error={suggestError} /></div>
            )}
            <button
              onClick={handleSuggest}
              disabled={suggesting || !hasApiKey()}
              className="w-full py-3 rounded-xl font-body text-sm text-white/90 disabled:opacity-50 transition-all duration-200"
              style={{ backgroundColor: suggesting ? 'rgba(42,36,32,0.4)' : 'rgba(42,36,32,0.85)' }}
            >
              {suggesting ? 'Reading your archive…' : 'Identify complexes from my dreams'}
            </button>
          </div>
        </div>
      )}

      {/* ── Suggestions ── */}
      {visibleSuggestions.length > 0 && (
        <div className="mb-10">
          <p style={{ fontSize: 9, letterSpacing: '0.18em' }} className="uppercase font-body text-ink/35 dark:text-white/25 mb-4">
            Suggested complexes
          </p>
          <div className="space-y-3">
            {visibleSuggestions.map((s, i) => (
              <SuggestionCard
                key={i}
                suggestion={s}
                onAdd={handleAddSuggestion}
                onDismiss={handleDismissSuggestion}
              />
            ))}
          </div>
          <button
            onClick={handleSuggest}
            disabled={suggesting}
            className="mt-4 text-xs font-body text-ink/35 dark:text-white/25 hover:text-ink/55 dark:hover:text-white/40 transition-colors"
          >
            {suggesting ? 'Looking again…' : 'Run again for more suggestions'}
          </button>
        </div>
      )}

      {/* ── Complexes list ── */}
      {complexes.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <p style={{ fontSize: 9, letterSpacing: '0.18em' }} className="uppercase font-body text-ink/35 dark:text-white/25">
              Your complexes
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="text-xs font-body text-ink/35 dark:text-white/25 hover:text-ink/55 dark:hover:text-white/40 transition-colors"
            >
              + Add
            </button>
          </div>

          {/* Status legend */}
          <div className="flex flex-wrap gap-2 mb-5">
            {STATUSES.map(s => (
              <span
                key={s.value}
                className="text-[10px] font-body px-2 py-0.5 rounded-full border"
                style={{ color: s.color, backgroundColor: s.bg, borderColor: s.border }}
              >
                {s.label}
              </span>
            ))}
            <span className="text-[10px] font-body text-ink/30 dark:text-white/20 self-center">
              · click status to advance
            </span>
          </div>

          <div className="space-y-2">
            {complexes.map(c => (
              <ComplexCard
                key={c.id}
                complex={c}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Add form ── */}
      {showAddForm && (
        <div className="mb-10">
          <NewComplexForm
            onSave={handleAddManual}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}

      {/* ── Empty state (has enough dreams, no complexes yet, has run suggest) ── */}
      {complexes.length === 0 && canSuggest && suggestDone && visibleSuggestions.length === 0 && (
        <div className="mb-10 text-center py-10">
          <p className="font-display italic text-xl text-ink/40 dark:text-white/30 mb-3">
            No suggestions surfaced
          </p>
          <p className="text-sm font-body text-ink/40 dark:text-white/30 leading-relaxed max-w-sm mx-auto">
            The archive may not yet show strong enough repetition to name a complex clearly.
            Add more dreams, or add one manually.
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="mt-5 text-sm font-body text-ink/50 dark:text-white/35 hover:text-ink/70 dark:hover:text-white/55 underline underline-offset-2 transition-colors"
          >
            Add a complex manually
          </button>
        </div>
      )}

      {/* ── Add button (when list is present and form is closed) ── */}
      {complexes.length > 0 && !showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full py-3 rounded-xl border border-dashed border-black/15 dark:border-white/12 text-sm font-body text-ink/35 dark:text-white/25 hover:border-black/25 dark:hover:border-white/20 hover:text-ink/50 dark:hover:text-white/35 transition-colors"
        >
          + Add complex
        </button>
      )}

    </div>
  );
}
