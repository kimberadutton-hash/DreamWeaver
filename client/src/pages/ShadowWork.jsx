import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { identifyShadowMaterial } from '../lib/ai';
import { formatDate, todayString } from '../lib/constants';
import AiErrorMessage from '../components/AiErrorMessage';

// ── Constants ──────────────────────────────────────────────────────────────

const ENCOUNTER_TYPES = [
  { id: 'dream',       label: 'Dream',       color: '#3d2b4a', desc: 'Shadow appeared in a dream' },
  { id: 'projection',  label: 'Projection',  color: '#7c4a2a', desc: 'Projecting onto someone else' },
  { id: 'reaction',    label: 'Reaction',    color: '#8b2a2a', desc: 'Strong emotional charge' },
  { id: 'fascination', label: 'Fascination', color: '#2a7c74', desc: 'Attraction or obsession' },
  { id: 'integration', label: 'Integration', color: '#b8924a', desc: 'Consciously working with it' },
];

const INTEGRATION_STATUSES = [
  { id: 'active',             label: 'Active',              color: '#9a4a6a', desc: 'Still unconscious and acting through you' },
  { id: 'becoming-conscious', label: 'Becoming Conscious',  color: '#b8924a', desc: 'Beginning to recognize the pattern' },
  { id: 'metabolizing',       label: 'Metabolizing',        color: '#3a5a7a', desc: 'Working with it intentionally' },
  { id: 'integrated',         label: 'Integrated',          color: '#4a7c74', desc: 'No longer compulsive — available as energy' },
];

function typeInfo(id) {
  return ENCOUNTER_TYPES.find(t => t.id === id) || ENCOUNTER_TYPES[0];
}

function statusInfo(id) {
  return INTEGRATION_STATUSES.find(s => s.id === id) || INTEGRATION_STATUSES[0];
}

// ── SVG Icons ──────────────────────────────────────────────────────────────

function TypeIcon({ type, size = 20, color = 'currentColor' }) {
  const icons = {
    dream: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
      </svg>
    ),
    projection: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
        <circle cx="8" cy="8" r="4"/>
        <circle cx="16" cy="16" r="4"/>
        <line x1="11" y1="11" x2="13" y2="13"/>
      </svg>
    ),
    reaction: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
    ),
    fascination: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    ),
    integration: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"/>
        <path d="M8 12l3 3 5-5"/>
      </svg>
    ),
  };
  return icons[type] || icons.dream;
}

// ── Type Badge ─────────────────────────────────────────────────────────────

function TypeBadge({ type }) {
  const { label, color } = typeInfo(type);
  return (
    <span
      style={{
        fontSize: 9,
        letterSpacing: '0.18em',
        color,
        backgroundColor: color + '26',
        padding: '2px 8px',
        borderRadius: 99,
        textTransform: 'uppercase',
        fontFamily: 'monospace',
        display: 'inline-block',
      }}
    >
      {label}
    </span>
  );
}

function StatusDot({ status }) {
  const { color } = statusInfo(status);
  return (
    <span
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        backgroundColor: color,
        flexShrink: 0,
      }}
    />
  );
}

// ── Encounter Card ─────────────────────────────────────────────────────────

function EncounterCard({ encounter, onClick }) {
  const { color } = typeInfo(encounter.encounter_type);
  return (
    <div
      onClick={() => onClick(encounter)}
      className="rounded-xl border border-black/8 dark:border-white/8 bg-white/40 dark:bg-white/3 hover:border-black/15 dark:hover:border-white/15 hover:bg-white/60 dark:hover:bg-white/5 transition-all duration-150 cursor-pointer px-5 py-4"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <TypeBadge type={encounter.encounter_type} />
          {encounter.integration_status && (
            <StatusDot status={encounter.integration_status} />
          )}
        </div>
        <span className="text-xs font-body text-ink/30 dark:text-white/25 shrink-0">
          {formatDate(encounter.encounter_date)}
        </span>
      </div>
      <h3 className="font-display italic text-base text-ink dark:text-white leading-snug mb-1">
        {encounter.title}
      </h3>
      {encounter.projected_quality && (
        <p className="text-xs font-body text-ink/40 dark:text-white/35 mb-1">
          Quality: {encounter.projected_quality}
        </p>
      )}
      {encounter.description && (
        <p className="text-sm font-body text-ink/55 dark:text-white/45 leading-relaxed line-clamp-2">
          {encounter.description}
        </p>
      )}
      {Array.isArray(encounter.shadow_figures) && encounter.shadow_figures.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {encounter.shadow_figures.map(fig => (
            <span
              key={fig}
              className="px-2 py-0.5 rounded-full text-xs font-body"
              style={{ backgroundColor: '#3d2b4a26', color: '#3d2b4a', fontFamily: 'monospace', fontSize: 10 }}
            >
              {fig}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Encounter Detail Drawer ────────────────────────────────────────────────

function EncounterDetailDrawer({ encounter, onClose, onEdit, onDelete, onStatusChange }) {
  const { color } = typeInfo(encounter.encounter_type);
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  async function handleDelete() {
    if (!window.confirm('Delete this encounter?')) return;
    setDeleting(true);
    await supabase.from('shadow_encounters').delete().eq('id', encounter.id);
    onDelete(encounter.id);
  }

  async function handleStatusChange(newStatus) {
    setUpdatingStatus(true);
    const { data, error } = await supabase
      .from('shadow_encounters')
      .update({ integration_status: newStatus })
      .eq('id', encounter.id)
      .select()
      .single();
    if (!error && data) onStatusChange(data);
    setUpdatingStatus(false);
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div
        className="fixed top-0 right-0 z-50 h-full w-full sm:w-[480px] flex flex-col shadow-2xl"
        style={{ backgroundColor: '#faf7f2' }}
      >
        {/* Header bar */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b border-black/8"
          style={{ backgroundColor: color + '18' }}
        >
          <div className="flex items-center gap-3">
            <TypeIcon type={encounter.encounter_type} size={18} color={color} />
            <TypeBadge type={encounter.encounter_type} />
            <span className="text-xs font-body text-ink/40">{formatDate(encounter.encounter_date)}</span>
          </div>
          <button
            onClick={onClose}
            className="text-ink/30 hover:text-ink/70 transition-colors text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <h2 className="font-display italic text-2xl text-ink leading-tight mb-2">
            {encounter.title}
          </h2>

          {/* Projected qualities — new array column, fall back to old scalar */}
          {((Array.isArray(encounter.projected_qualities) && encounter.projected_qualities.length > 0) || encounter.projected_quality) && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {(Array.isArray(encounter.projected_qualities) && encounter.projected_qualities.length > 0
                ? encounter.projected_qualities
                : [encounter.projected_quality]
              ).map((q, i) => (
                <span
                  key={i}
                  className="px-2.5 py-0.5 rounded-full text-xs font-body"
                  style={{ backgroundColor: '#9a4a6a18', color: '#9a4a6a', border: '1px solid #9a4a6a30' }}
                >
                  {q}
                </span>
              ))}
            </div>
          )}

          {/* Integration status selector */}
          <div className="mb-5">
            <p style={{ fontSize: 9, letterSpacing: '0.15em' }} className="uppercase font-body text-ink/30 mb-2">
              Integration Status
            </p>
            <div className="flex flex-wrap gap-2">
              {INTEGRATION_STATUSES.map(s => {
                const active = encounter.integration_status === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => handleStatusChange(s.id)}
                    disabled={updatingStatus}
                    className="px-3 py-1.5 rounded-lg text-xs font-body transition-all duration-150 border"
                    style={{
                      borderColor: active ? s.color + '60' : 'rgba(0,0,0,0.08)',
                      backgroundColor: active ? s.color + '18' : 'transparent',
                      color: active ? s.color : 'rgba(42,36,32,0.45)',
                    }}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {encounter.description && (
            <div className="space-y-3 mb-6">
              <p style={{ fontSize: 9, letterSpacing: '0.15em' }} className="uppercase font-body text-ink/30 mb-2">
                Notes
              </p>
              {encounter.description.split(/\n\n+/).map((p, i) => (
                <p key={i} className="text-[15px] font-body text-ink/80 leading-relaxed">
                  {p.trim()}
                </p>
              ))}
            </div>
          )}

          {Array.isArray(encounter.shadow_figures) && encounter.shadow_figures.length > 0 && (
            <div className="mb-5">
              <p style={{ fontSize: 9, letterSpacing: '0.15em' }} className="uppercase font-body text-ink/30 mb-2">
                Shadow Figures
              </p>
              <div className="flex flex-wrap gap-1.5">
                {encounter.shadow_figures.map(fig => (
                  <span
                    key={fig}
                    className="px-3 py-1 rounded-full text-xs font-body"
                    style={{ backgroundColor: '#3d2b4a1a', color: '#3d2b4a' }}
                  >
                    {fig}
                  </span>
                ))}
              </div>
            </div>
          )}

          {encounter.ai_reflection && (() => {
            const { figures, qualities, reflection } = parseAiReflection(encounter.ai_reflection);
            return (
              <div className="mb-5">
                <p style={{ fontSize: 9, letterSpacing: '0.15em' }} className="uppercase font-body text-ink/30 mb-3">
                  Shadow Reflection
                </p>
                <div className="pl-4 border-l-2 border-gold/40 space-y-3">
                  {figures.length > 0 && (
                    <div>
                      <p style={{ fontSize: 9, letterSpacing: '0.12em' }} className="uppercase font-body text-ink/25 mb-1.5">Shadow figures</p>
                      <div className="flex flex-wrap gap-1.5">
                        {figures.map((f, i) => (
                          <span key={i} className="px-2.5 py-0.5 rounded-full text-xs font-body" style={{ backgroundColor: '#3d2b4a1a', color: '#3d2b4a', fontFamily: 'monospace' }}>
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {qualities.length > 0 && (
                    <div>
                      <p style={{ fontSize: 9, letterSpacing: '0.12em' }} className="uppercase font-body text-ink/25 mb-1.5">Projected qualities</p>
                      <div className="flex flex-wrap gap-1.5">
                        {qualities.map((q, i) => (
                          <span key={i} className="px-2.5 py-0.5 rounded-full text-xs font-body" style={{ backgroundColor: '#9a4a6a18', color: '#9a4a6a', border: '1px solid #9a4a6a30' }}>
                            {q}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {reflection && (
                    <p className="font-display italic text-base text-ink/65 leading-relaxed">
                      {reflection}
                    </p>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Linked dream — use join data (encounter.dreams) or fallback for fresh saves */}
          {encounter.linked_dream_id && (encounter.dreams || encounter.linked_dream_title) && (
            <div
              className="rounded-xl border border-black/8 bg-white/50 px-4 py-3 mb-5 cursor-pointer hover:border-black/15 transition-colors"
              onClick={() => navigate(`/dream/${encounter.linked_dream_id}`)}
            >
              <p style={{ fontSize: 9, letterSpacing: '0.15em' }} className="uppercase font-body text-ink/30 mb-1">
                Linked Dream
              </p>
              <p className="font-display italic text-base text-ink leading-snug">
                {encounter.dreams?.title || encounter.linked_dream_title}
              </p>
              {(encounter.dreams?.dream_date || encounter.linked_dream_date) && (
                <p className="text-xs font-body text-ink/40 mt-0.5">
                  {formatDate(encounter.dreams?.dream_date || encounter.linked_dream_date)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-black/8 flex items-center justify-between">
          <button
            onClick={() => onEdit(encounter)}
            className="px-4 py-2 rounded-lg text-sm font-body text-ink/60 hover:text-ink/90 border border-black/10 hover:border-black/20 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-sm font-body text-red-400/60 hover:text-red-400/90 transition-colors"
          >
            {deleting ? 'Deleting…' : 'Delete encounter'}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Parse saved ai_reflection text back into sections for rich rendering ─────

function parseAiReflection(text) {
  if (!text) return { figures: [], qualities: [], reflection: null };
  const figuresMatch = text.match(/^Shadow figures:\s*(.+)/m);
  const figures = figuresMatch
    ? figuresMatch[1].split(',').map(s => s.trim()).filter(Boolean)
    : [];
  const qualitiesMatch = text.match(/Projected qualities:\n([\s\S]*?)(?:\n\nReflection:|$)/);
  const qualities = qualitiesMatch
    ? qualitiesMatch[1].split('\n').map(s => s.replace(/^-\s*/, '').trim()).filter(Boolean)
    : [];
  const reflectionMatch = text.match(/Reflection:\n([\s\S]+)$/);
  const reflection = reflectionMatch ? reflectionMatch[1].trim() : null;
  return { figures, qualities, reflection };
}

// ── Format shadow analysis object → readable text for ai_reflection ──────────

function formatShadowAnalysis(analysis) {
  const parts = [];
  if (Array.isArray(analysis.shadowFigures) && analysis.shadowFigures.length) {
    const names = analysis.shadowFigures
      .map(f => typeof f === 'string' ? f : (f?.figure || ''))
      .filter(Boolean);
    if (names.length) parts.push(`Shadow figures: ${names.join(', ')}`);
  }
  if (Array.isArray(analysis.projectedQualities) && analysis.projectedQualities.length) {
    parts.push(`Projected qualities:\n${analysis.projectedQualities.map(q => `- ${q}`).join('\n')}`);
  }
  if (analysis.reflectionPrompt) {
    parts.push(`Reflection:\n${analysis.reflectionPrompt}`);
  }
  return parts.join('\n\n');
}

// ── Encounter Form Panel ────────────────────────────────────────────────────

function EncounterFormPanel({ initialEncounter, prefillDreamId, prefillQuality, shadowPrefill, onClose, onSaved, userId }) {
  const isEdit = !!initialEncounter?.id;

  // PATH 1: Format AI content from DreamDetail prefill → goes to ai_reflection, never description
  const prefillAiReflection = shadowPrefill ? formatShadowAnalysis(shadowPrefill) : '';

  // Build initial projected qualities array from prefill or existing encounter
  const prefillQualities = shadowPrefill?.projectedQualities?.length
    ? shadowPrefill.projectedQualities
    : (prefillQuality ? [prefillQuality] : []);

  const [encounterType, setEncounterType] = useState(initialEncounter?.encounter_type || 'dream');
  const [encounterDate, setEncounterDate] = useState(initialEncounter?.encounter_date || shadowPrefill?.dreamDate || todayString());
  const [title, setTitle] = useState(initialEncounter?.title || '');
  const [description, setDescription] = useState(initialEncounter?.description || '');
  // Multi-value projected qualities (new column); falls back to old scalar for edit
  const [projectedQualities, setProjectedQualities] = useState(
    initialEncounter?.projected_qualities?.length
      ? initialEncounter.projected_qualities
      : (initialEncounter?.projected_quality ? [initialEncounter.projected_quality] : prefillQualities)
  );
  const [qualityInput, setQualityInput] = useState('');
  const [integrationStatus, setIntegrationStatus] = useState(initialEncounter?.integration_status || 'active');
  const [linkedDream, setLinkedDream] = useState(null);
  const [dreamQuery, setDreamQuery] = useState('');
  const [dreamDropdownOpen, setDreamDropdownOpen] = useState(false);
  const [allDreams, setAllDreams] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // AI shadow material
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState(null);
  // PATH 1: pre-filled from DreamDetail; PATH 2: set after handleRunAI; saved to ai_reflection column
  const [pendingAiReflection, setPendingAiReflection] = useState(
    prefillAiReflection || initialEncounter?.ai_reflection || ''
  );

  const dreamDropdownRef = useRef(null);

  useEffect(() => {
    async function load() {
      const { data: dreams } = await supabase
        .from('dreams')
        .select('id, title, dream_date, body, archetypes, symbols')
        .order('dream_date', { ascending: false });
      setAllDreams(dreams || []);

      // Pre-fill linked dream from sessionStorage prefill or URL param
      const targetId = shadowPrefill?.dreamId || prefillDreamId;
      if (targetId && dreams?.length) {
        const match = dreams.find(d => d.id === targetId);
        if (match) setLinkedDream(match);
        else if (shadowPrefill?.dreamId) {
          // Dream exists but may not be in fetched list — set minimal object
          setLinkedDream({ id: shadowPrefill.dreamId, title: shadowPrefill.dreamTitle, dream_date: shadowPrefill.dreamDate });
        }
      }
    }
    load();
  }, [prefillDreamId]);

  useEffect(() => {
    function handleOutside(e) {
      if (dreamDropdownRef.current && !dreamDropdownRef.current.contains(e.target)) {
        setDreamDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const filteredDreams = dreamQuery.trim()
    ? allDreams.filter(d => d.title?.toLowerCase().includes(dreamQuery.toLowerCase()))
    : allDreams.slice(0, 8);

  async function handleRunAI() {
    if (!linkedDream && !title.trim()) {
      setError('Link a dream or add a title first');
      return;
    }
    setAiLoading(true);
    setAiError(null);
    setAiResult(null);
    try {
      const dream = linkedDream
        ? allDreams.find(d => d.id === linkedDream.id)
        : null;

      // Get recent shadow encounters for context
      const { data: recentEncounters } = await supabase
        .from('shadow_encounters')
        .select('title, projected_quality')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      const result = await identifyShadowMaterial({
        dreamBody: dream?.body || description,
        dreamArchetypes: dream?.archetypes || [],
        dreamSymbols: dream?.symbols || [],
        existingShadowEncounters: recentEncounters || [],
      });
      setAiResult(result);
      // PATH 2: store formatted analysis for ai_reflection column — never written into description
      setPendingAiReflection(formatShadowAnalysis(result));
      // Auto-fill projected qualities if none yet entered
      if (!projectedQualities.length && result.projectedQualities?.length) {
        setProjectedQualities(result.projectedQualities);
      }
    } catch (err) {
      setAiError(err);
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSave() {
    if (!title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = {
        encounter_type: encounterType,
        encounter_date: encounterDate,
        title: title.trim(),
        description: description.trim() || null,        // user-written only
        projected_quality: projectedQualities[0] || null,   // keep old column populated for compat
        projected_qualities: projectedQualities,             // new array column
        integration_status: integrationStatus,
        linked_dream_id: linkedDream?.id || null,
        ai_reflection: pendingAiReflection.trim() || null,  // AI-generated only
      };

      let result;
      if (isEdit) {
        const { data, error: err } = await supabase
          .from('shadow_encounters')
          .update(payload)
          .eq('id', initialEncounter.id)
          .select()
          .single();
        if (err) throw err;
        result = data;
      } else {
        const { data, error: err } = await supabase
          .from('shadow_encounters')
          .insert({ ...payload, user_id: userId })
          .select()
          .single();
        if (err) throw err;
        result = data;
      }

      // Attach dream title for display
      if (linkedDream) {
        result = {
          ...result,
          linked_dream_title: linkedDream.title,
          linked_dream_date: linkedDream.dream_date,
        };
      }

      onSaved(result, isEdit);
    } catch (e) {
      setError(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const selectedType = typeInfo(encounterType);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div
        className="fixed top-0 right-0 z-50 h-full w-full sm:w-[480px] flex flex-col shadow-2xl"
        style={{ backgroundColor: '#faf7f2' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b border-black/8"
          style={{ backgroundColor: '#3d2b4a' }}
        >
          <h2 className="font-display italic text-xl text-gold">
            {isEdit ? 'Edit Encounter' : 'Record an Encounter'}
          </h2>
          <button onClick={onClose} className="text-white/40 hover:text-white/80 transition-colors text-2xl leading-none">×</button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">

          {/* Encounter type */}
          <div>
            <label className="block font-body text-ink/40 uppercase tracking-widest mb-2" style={{ fontSize: 9 }}>Type of Encounter</label>
            <div className="grid grid-cols-3 gap-2">
              {ENCOUNTER_TYPES.map(t => {
                const active = encounterType === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setEncounterType(t.id)}
                    className="flex flex-col items-center gap-1.5 rounded-xl py-3 border transition-all duration-150"
                    style={{
                      borderColor: active ? t.color + '60' : 'rgba(0,0,0,0.08)',
                      backgroundColor: active ? t.color + '12' : 'rgba(255,255,255,0.4)',
                      color: active ? t.color : 'rgba(42,36,32,0.4)',
                    }}
                  >
                    <TypeIcon type={t.id} size={18} color={active ? t.color : 'rgba(42,36,32,0.35)'} />
                    <span className="text-xs font-body">{t.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-xs font-body text-ink/35 italic">{selectedType.desc}</p>
          </div>

          {/* Date */}
          <div>
            <label className="block font-body text-ink/40 uppercase tracking-widest mb-1.5" style={{ fontSize: 9 }}>Date</label>
            <input
              type="date"
              value={encounterDate}
              onChange={e => setEncounterDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-black/10 bg-white/60 text-sm font-body text-ink focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
          </div>

          {/* Title */}
          <div>
            <label className="block font-body text-ink/40 uppercase tracking-widest mb-1.5" style={{ fontSize: 9 }}>Title / What happened</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Name what you met — the quality or figure encountered… e.g. 'The capacity to be ruthless' or 'Permission I never gave myself'"
              className="w-full px-4 py-2.5 rounded-xl border border-black/10 bg-white/60 text-sm font-body text-ink placeholder-ink/25 focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
          </div>

          {/* Projected qualities — tag input */}
          <div>
            <label className="block font-body text-ink/40 uppercase tracking-widest mb-1.5" style={{ fontSize: 9 }}>Projected Qualities (optional)</label>
            {projectedQualities.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {projectedQualities.map((q, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-body"
                    style={{ backgroundColor: '#9a4a6a18', color: '#9a4a6a', border: '1px solid #9a4a6a30' }}
                  >
                    {q}
                    <button
                      type="button"
                      onClick={() => setProjectedQualities(prev => prev.filter((_, j) => j !== i))}
                      className="ml-0.5 opacity-50 hover:opacity-90 leading-none"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <input
              type="text"
              value={qualityInput}
              onChange={e => setQualityInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  const val = qualityInput.trim().replace(/,$/, '');
                  if (val && !projectedQualities.includes(val)) {
                    setProjectedQualities(prev => [...prev, val]);
                  }
                  setQualityInput('');
                }
              }}
              placeholder="Type a quality, press Enter to add…"
              className="w-full px-4 py-2.5 rounded-xl border border-black/10 bg-white/60 text-sm font-body text-ink placeholder-ink/25 focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block font-body text-ink/40 uppercase tracking-widest mb-1.5" style={{ fontSize: 9 }}>Notes</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              placeholder="Describe what happened, what you noticed, what the charge felt like…"
              className="w-full px-4 py-2.5 rounded-xl border border-black/10 bg-white/60 text-sm font-body text-ink placeholder-ink/25 focus:outline-none focus:ring-2 focus:ring-gold/40 resize-none"
            />
          </div>

          {/* Link dream */}
          <div ref={dreamDropdownRef} className="relative">
            <label className="block font-body text-ink/40 uppercase tracking-widest mb-1.5" style={{ fontSize: 9 }}>Link to Dream (optional)</label>
            <input
              type="text"
              value={linkedDream ? linkedDream.title : dreamQuery}
              onChange={e => {
                if (linkedDream) setLinkedDream(null);
                setDreamQuery(e.target.value);
                setDreamDropdownOpen(true);
              }}
              onFocus={() => setDreamDropdownOpen(true)}
              placeholder="Search dreams…"
              className="w-full px-4 py-2.5 rounded-xl border border-black/10 bg-white/60 text-sm font-body text-ink placeholder-ink/25 focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
            {linkedDream && (
              <button
                onClick={() => { setLinkedDream(null); setDreamQuery(''); }}
                className="absolute right-3 top-1/2 translate-y-1 text-ink/25 hover:text-ink/60 text-lg"
              >
                ×
              </button>
            )}
            {dreamDropdownOpen && !linkedDream && (
              <div className="absolute z-10 w-full mt-1 rounded-xl border border-black/10 bg-white shadow-lg overflow-hidden">
                {filteredDreams.length === 0 ? (
                  <p className="px-4 py-3 text-sm font-body text-ink/40">No dreams found</p>
                ) : (
                  filteredDreams.map(d => (
                    <button
                      key={d.id}
                      onMouseDown={() => {
                        setLinkedDream(d);
                        setDreamQuery('');
                        setDreamDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm font-body text-ink/70 hover:bg-black/3 transition-colors border-b border-black/5 last:border-0"
                    >
                      <span className="font-display italic">{d.title || 'Untitled'}</span>
                      <span className="text-xs text-ink/35 ml-2">{formatDate(d.dream_date)}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Integration status */}
          <div>
            <label className="block font-body text-ink/40 uppercase tracking-widest mb-2" style={{ fontSize: 9 }}>Integration Status</label>
            <div className="space-y-1.5">
              {INTEGRATION_STATUSES.map(s => {
                const active = integrationStatus === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setIntegrationStatus(s.id)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left transition-all duration-150"
                    style={{
                      borderColor: active ? s.color + '50' : 'rgba(0,0,0,0.08)',
                      backgroundColor: active ? s.color + '10' : 'rgba(255,255,255,0.4)',
                    }}
                  >
                    <span
                      style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: s.color, flexShrink: 0, display: 'inline-block' }}
                    />
                    <div>
                      <span className="text-sm font-body" style={{ color: active ? s.color : 'rgba(42,36,32,0.7)' }}>
                        {s.label}
                      </span>
                      <p className="text-xs font-body text-ink/35 leading-tight">{s.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* AI shadow material */}
          <div className="rounded-xl border bg-white/30 px-4 py-4"
            style={{ borderColor: (aiResult || pendingAiReflection) ? 'rgba(0,0,0,0.08)' : '#3d2b4a30' }}
          >
            <div className="flex items-center justify-between mb-2">
              <p style={{ fontSize: 9, letterSpacing: '0.15em' }} className="uppercase font-body text-ink/30">
                Shadow Reflection
              </p>
              {(aiResult || pendingAiReflection) && (
                <button
                  onClick={handleRunAI}
                  disabled={aiLoading}
                  className="text-xs font-body text-ink/25 hover:text-ink/50 disabled:opacity-40 transition-colors"
                >
                  {aiLoading ? 'Listening…' : '↺ Re-run analysis'}
                </button>
              )}
            </div>

            {/* PATH 1: prefill from DreamDetail — rich rendering matching DreamDetail shadow panel */}
            {pendingAiReflection && !aiResult && !aiLoading && (() => {
              const { figures, qualities, reflection } = parseAiReflection(pendingAiReflection);
              return (
                <div className="space-y-3">
                  {figures.length > 0 && (
                    <div>
                      <p style={{ fontSize: 9, letterSpacing: '0.12em' }} className="uppercase font-body text-ink/25 mb-1.5">Shadow figures</p>
                      <div className="flex flex-wrap gap-1.5">
                        {figures.map((f, i) => (
                          <span key={i} className="px-2.5 py-0.5 rounded-full text-xs font-body" style={{ backgroundColor: '#3d2b4a1a', color: '#3d2b4a', fontFamily: 'monospace' }}>
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {qualities.length > 0 && (
                    <div>
                      <p style={{ fontSize: 9, letterSpacing: '0.12em' }} className="uppercase font-body text-ink/25 mb-1.5">Projected qualities</p>
                      <div className="flex flex-wrap gap-1.5">
                        {qualities.map((q, i) => (
                          <span key={i} className="px-2.5 py-0.5 rounded-full text-xs font-body" style={{ backgroundColor: '#9a4a6a18', color: '#9a4a6a', border: '1px solid #9a4a6a30' }}>
                            {q}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {reflection && (
                    <p className="font-display italic text-sm text-ink/65 leading-relaxed">
                      {reflection}
                    </p>
                  )}
                </div>
              );
            })()}

            {!pendingAiReflection && !aiResult && !aiLoading && (
              <>
                <p className="text-xs font-body text-ink/40 italic mb-3 leading-relaxed">
                  Before recording, let the analyst listen to what this encounter may be carrying.
                </p>
                <button
                  onClick={handleRunAI}
                  className="w-full py-2.5 rounded-lg text-sm font-body transition-all duration-150 border"
                  style={{
                    borderColor: '#3d2b4a40',
                    backgroundColor: '#3d2b4a08',
                    color: '#3d2b4a',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#3d2b4a14'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#3d2b4a08'; }}
                >
                  ◈ Identify shadow material
                </button>
              </>
            )}

            {aiLoading && (
              <p className="text-sm font-body text-ink/40 italic text-center py-2">Listening…</p>
            )}

            {aiError && !aiLoading && (
              <div className="mt-3"><AiErrorMessage error={aiError} /></div>
            )}

            {aiResult && (
              <div className="space-y-3">
                {Array.isArray(aiResult.shadowFigures) && aiResult.shadowFigures.length > 0 && (
                  <div>
                    <p style={{ fontSize: 9, letterSpacing: '0.12em' }} className="uppercase font-body text-ink/25 mb-1.5">Shadow figures</p>
                    <div className="flex flex-wrap gap-1.5">
                      {aiResult.shadowFigures.map((fig, i) => {
                        const label = typeof fig === 'string' ? fig : (fig?.figure || fig?.quality || '');
                        return label ? (
                        <span
                          key={label + i}
                          className="px-2.5 py-0.5 rounded-full text-xs font-body"
                          style={{ backgroundColor: '#3d2b4a1a', color: '#3d2b4a', fontFamily: 'monospace' }}
                        >
                          {label}
                        </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
                {Array.isArray(aiResult.projectedQualities) && aiResult.projectedQualities.length > 0 && (
                  <div>
                    <p style={{ fontSize: 9, letterSpacing: '0.12em' }} className="uppercase font-body text-ink/25 mb-1.5">Projected qualities</p>
                    <div className="flex flex-wrap gap-1.5">
                      {aiResult.projectedQualities.map(q => {
                        const already = projectedQualities.includes(q);
                        return (
                          <button
                            key={q}
                            onClick={() => {
                              if (!already) setProjectedQualities(prev => [...prev, q]);
                            }}
                            className="px-2.5 py-0.5 rounded-full text-xs font-body transition-all duration-100"
                            style={{
                              backgroundColor: already ? '#9a4a6a26' : 'rgba(0,0,0,0.05)',
                              color: already ? '#9a4a6a' : 'rgba(42,36,32,0.55)',
                              border: already ? '1px solid #9a4a6a40' : '1px solid transparent',
                              cursor: already ? 'default' : 'pointer',
                            }}
                            title={already ? 'Already added' : 'Click to add'}
                          >
                            {q}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {aiResult.reflectionPrompt && (
                  <div className="rounded-lg border border-black/8 bg-white/50 px-3 py-2.5">
                    <p className="font-display italic text-sm text-ink/70 leading-relaxed">
                      {aiResult.reflectionPrompt}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {error && <p className="text-sm font-body text-red-500">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-black/8 flex items-center justify-between">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-lg text-sm font-body font-medium text-white bg-plum hover:bg-plum/90 disabled:opacity-50 transition-all"
          >
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Record encounter'}
          </button>
          <button onClick={onClose} className="text-sm font-body text-ink/40 hover:text-ink/70 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}

// ── Integration Status Tab ──────────────────────────────────────────────────

function IntegrationStatusTab({ encounters, onEncounterClick }) {
  const groups = INTEGRATION_STATUSES.map(s => ({
    ...s,
    items: encounters.filter(e => e.integration_status === s.id),
  })).filter(g => g.items.length > 0);

  if (groups.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="font-display italic text-xl text-ink/30 dark:text-white/25">No encounters recorded yet.</p>
        <p className="text-sm font-body text-ink/25 dark:text-white/20 mt-2">Record your first encounter to begin mapping your shadow.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {groups.map(group => (
        <div key={group.id}>
          <div className="flex items-center gap-2 mb-3">
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: group.color }} />
            <h3 className="text-xs uppercase tracking-widest font-body" style={{ color: group.color }}>{group.label}</h3>
            <span className="text-xs font-body text-ink/25 dark:text-white/20">{group.items.length}</span>
          </div>
          <div className="space-y-2 pl-4">
            {group.items.map(enc => (
              <div
                key={enc.id}
                onClick={() => onEncounterClick(enc)}
                className="flex items-start gap-3 rounded-xl border border-black/8 dark:border-white/8 bg-white/40 dark:bg-white/3 hover:border-black/15 dark:hover:border-white/15 hover:bg-white/60 dark:hover:bg-white/5 transition-all duration-150 cursor-pointer px-4 py-3"
              >
                <TypeIcon type={enc.encounter_type} size={14} color={typeInfo(enc.encounter_type).color} />
                <div className="flex-1 min-w-0">
                  <p className="font-display italic text-sm text-ink dark:text-white leading-snug">{enc.title}</p>
                  {enc.projected_quality && (
                    <p className="text-xs font-body text-ink/40 dark:text-white/30 mt-0.5">{enc.projected_quality}</p>
                  )}
                </div>
                <span className="text-xs font-body text-ink/25 dark:text-white/20 shrink-0">{formatDate(enc.encounter_date)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function ShadowWork() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [shadowPrefill, setShadowPrefill] = useState(null);
  const prefillDreamId = shadowPrefill?.dreamId || searchParams.get('dreamId');
  const prefillQuality = shadowPrefill?.projectedQualities?.[0] || searchParams.get('quality') || '';

  const [encounters, setEncounters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('encounters');
  const [showForm, setShowForm] = useState(!!searchParams.get('dreamId'));
  const [editingEncounter, setEditingEncounter] = useState(null);
  const [selectedEncounter, setSelectedEncounter] = useState(null);

  // Read sessionStorage whenever fromDream=true appears in the URL
  // (works whether component was just mounted or was already mounted)
  useEffect(() => {
    if (searchParams.get('fromDream') !== 'true') return;
    try {
      const raw = sessionStorage.getItem('shadow-encounter-prefill');
      if (raw) {
        sessionStorage.removeItem('shadow-encounter-prefill');
        setShadowPrefill(JSON.parse(raw));
        setShowForm(true);
      }
    } catch {}
  }, [searchParams.get('fromDream')]);

  useEffect(() => { fetchEncounters(); }, []);

  async function fetchEncounters() {
    const { data } = await supabase
      .from('shadow_encounters')
      .select(`
        *,
        dreams ( id, title, dream_date )
      `)
      .eq('user_id', user.id)
      .order('encounter_date', { ascending: false });
    setEncounters(data || []);
    setLoading(false);
  }

  function handleSaved(encounter, isEdit) {
    setEncounters(prev =>
      isEdit
        ? prev.map(e => e.id === encounter.id ? encounter : e)
        : [encounter, ...prev]
    );
    setShowForm(false);
    setEditingEncounter(null);
  }

  function handleDelete(id) {
    setEncounters(prev => prev.filter(e => e.id !== id));
    setSelectedEncounter(null);
  }

  function handleStatusChange(updated) {
    setEncounters(prev => prev.map(e => e.id === updated.id ? { ...e, ...updated } : e));
    setSelectedEncounter(prev => prev?.id === updated.id ? { ...prev, ...updated } : prev);
  }

  function handleEdit(encounter) {
    setSelectedEncounter(null);
    setEditingEncounter(encounter);
    setShowForm(true);
  }

  return (
    <div className="max-w-2xl mx-auto px-8 py-10">

      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display italic text-4xl text-ink dark:text-white mb-1">Shadow Work</h1>
        <p className="text-sm font-body text-ink/45 dark:text-white/35 mb-4">
          The qualities disowned — and waiting to be reclaimed.
        </p>
        <p className="font-display italic text-base leading-relaxed max-w-lg" style={{ color: '#b8924a', opacity: 0.7 }}>
          "The shadow is not only darkness. It contains everything you decided was unacceptable —
          including gifts you have not yet claimed."
        </p>
      </div>

      {/* Tabs + action */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-0">
          {[{ id: 'encounters', label: 'Encounters' }, { id: 'status', label: 'Integration Status' }].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="px-4 py-2 text-sm font-body transition-colors border-b-2"
              style={{
                color: tab === t.id ? '#3d2b4a' : 'rgba(42,36,32,0.4)',
                borderBottomColor: tab === t.id ? '#3d2b4a' : 'transparent',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => { setEditingEncounter(null); setShowForm(true); }}
          className="text-sm font-body text-plum dark:text-gold hover:opacity-70 transition-opacity"
        >
          Record an encounter →
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <p className="font-display italic text-xl text-ink/30 dark:text-white/25">Loading…</p>
        </div>
      ) : tab === 'encounters' ? (
        encounters.length === 0 ? (
          <div className="text-center py-16">
            <p className="font-display italic text-xl text-ink/30 dark:text-white/25">No encounters recorded yet.</p>
            <p className="text-sm font-body text-ink/25 dark:text-white/20 mt-2">
              The shadow reveals itself through strong reactions, projections, and dream figures.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-6 px-5 py-2.5 rounded-xl text-sm font-body font-medium text-white bg-plum hover:bg-plum/90 transition-all"
            >
              Record your first encounter →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {encounters.map(enc => (
              <EncounterCard key={enc.id} encounter={enc} onClick={setSelectedEncounter} />
            ))}
          </div>
        )
      ) : (
        <IntegrationStatusTab encounters={encounters} onEncounterClick={setSelectedEncounter} />
      )}

      {/* Encounter Detail Drawer */}
      {selectedEncounter && (
        <EncounterDetailDrawer
          encounter={selectedEncounter}
          onClose={() => setSelectedEncounter(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* Encounter Form Panel */}
      {showForm && (
        <EncounterFormPanel
          initialEncounter={editingEncounter}
          prefillDreamId={prefillDreamId}
          prefillQuality={prefillQuality}
          shadowPrefill={editingEncounter ? null : shadowPrefill}
          onClose={() => { setShowForm(false); setEditingEncounter(null); }}
          onSaved={handleSaved}
          userId={user.id}
        />
      )}
    </div>
  );
}
