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
      {encounter.shadow_figures?.length > 0 && (
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

          {encounter.projected_quality && (
            <p className="text-sm font-body text-ink/50 mb-4">
              Projected quality: <span className="text-ink/70 italic">{encounter.projected_quality}</span>
            </p>
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
              {encounter.description.split(/\n\n+/).map((p, i) => (
                <p key={i} className="text-[15px] font-body text-ink/80 leading-relaxed">
                  {p.trim()}
                </p>
              ))}
            </div>
          )}

          {encounter.shadow_figures?.length > 0 && (
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

          {encounter.reflection_prompt && (
            <div className="rounded-xl border border-black/8 bg-white/50 px-4 py-4 mb-5">
              <p style={{ fontSize: 9, letterSpacing: '0.15em' }} className="uppercase font-body text-ink/30 mb-2">
                Reflection
              </p>
              <p className="font-display italic text-base text-ink/70 leading-relaxed">
                {encounter.reflection_prompt}
              </p>
            </div>
          )}

          {encounter.linked_dream_id && (
            <div
              className="rounded-xl border border-black/8 bg-white/50 px-4 py-3 mb-5 cursor-pointer hover:border-black/15 transition-colors"
              onClick={() => navigate(`/dream/${encounter.linked_dream_id}`)}
            >
              <p style={{ fontSize: 9, letterSpacing: '0.15em' }} className="uppercase font-body text-ink/30 mb-1">
                Linked Dream
              </p>
              <p className="font-display italic text-base text-ink leading-snug">
                {encounter.linked_dream_title || 'View dream'}
              </p>
              {encounter.linked_dream_date && (
                <p className="text-xs font-body text-ink/40 mt-0.5">{formatDate(encounter.linked_dream_date)}</p>
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

// ── Encounter Form Panel ────────────────────────────────────────────────────

function EncounterFormPanel({ initialEncounter, prefillDreamId, prefillQuality, onClose, onSaved, userId }) {
  const isEdit = !!initialEncounter?.id;

  const [encounterType, setEncounterType] = useState(initialEncounter?.encounter_type || 'dream');
  const [encounterDate, setEncounterDate] = useState(initialEncounter?.encounter_date || todayString());
  const [title, setTitle] = useState(initialEncounter?.title || '');
  const [description, setDescription] = useState(initialEncounter?.description || '');
  const [projectedQuality, setProjectedQuality] = useState(initialEncounter?.projected_quality || prefillQuality || '');
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

  const dreamDropdownRef = useRef(null);

  useEffect(() => {
    async function load() {
      const { data: dreams } = await supabase
        .from('dreams')
        .select('id, title, dream_date, body, archetypes, symbols')
        .order('dream_date', { ascending: false });
      setAllDreams(dreams || []);

      // Pre-fill linked dream from URL param
      if (prefillDreamId && dreams?.length) {
        const match = dreams.find(d => d.id === prefillDreamId);
        if (match) setLinkedDream(match);
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
      // Auto-fill fields from AI result if empty
      if (!projectedQuality && result.projectedQualities?.length) {
        setProjectedQuality(result.projectedQualities[0]);
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
        description: description.trim() || null,
        projected_quality: projectedQuality.trim() || null,
        integration_status: integrationStatus,
        linked_dream_id: linkedDream?.id || null,
        shadow_figures: aiResult?.shadowFigures?.length ? aiResult.shadowFigures : null,
        reflection_prompt: aiResult?.reflectionPrompt || null,
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
              placeholder="Name this encounter…"
              className="w-full px-4 py-2.5 rounded-xl border border-black/10 bg-white/60 text-sm font-body text-ink placeholder-ink/25 focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
          </div>

          {/* Projected quality */}
          <div>
            <label className="block font-body text-ink/40 uppercase tracking-widest mb-1.5" style={{ fontSize: 9 }}>Projected Quality (optional)</label>
            <input
              type="text"
              value={projectedQuality}
              onChange={e => setProjectedQuality(e.target.value)}
              placeholder="e.g. aggression, neediness, brilliance…"
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
          <div className="rounded-xl border border-black/8 bg-white/30 px-4 py-4">
            <div className="flex items-center justify-between mb-2">
              <p style={{ fontSize: 9, letterSpacing: '0.15em' }} className="uppercase font-body text-ink/30">
                Shadow Material Analysis
              </p>
              <button
                onClick={handleRunAI}
                disabled={aiLoading}
                className="text-xs font-body text-gold/70 hover:text-gold disabled:opacity-40 transition-colors"
              >
                {aiLoading ? 'Listening…' : aiResult ? '↻ Re-run' : '✦ Identify shadow material'}
              </button>
            </div>
            <p className="text-xs font-body text-ink/35 italic mb-3">
              Uses your linked dream or notes to surface shadow figures and a reflection question.
            </p>

            {aiError && (
              <div className="mb-3"><AiErrorMessage error={aiError} /></div>
            )}

            {aiResult && (
              <div className="space-y-3">
                {aiResult.shadowFigures?.length > 0 && (
                  <div>
                    <p style={{ fontSize: 9, letterSpacing: '0.12em' }} className="uppercase font-body text-ink/25 mb-1.5">Shadow figures</p>
                    <div className="flex flex-wrap gap-1.5">
                      {aiResult.shadowFigures.map(fig => (
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
                {aiResult.projectedQualities?.length > 0 && (
                  <div>
                    <p style={{ fontSize: 9, letterSpacing: '0.12em' }} className="uppercase font-body text-ink/25 mb-1.5">Projected qualities</p>
                    <div className="flex flex-wrap gap-1.5">
                      {aiResult.projectedQualities.map(q => (
                        <button
                          key={q}
                          onClick={() => setProjectedQuality(q)}
                          className="px-2.5 py-0.5 rounded-full text-xs font-body transition-all duration-100"
                          style={{
                            backgroundColor: projectedQuality === q ? '#9a4a6a26' : 'rgba(0,0,0,0.05)',
                            color: projectedQuality === q ? '#9a4a6a' : 'rgba(42,36,32,0.55)',
                            border: projectedQuality === q ? '1px solid #9a4a6a40' : '1px solid transparent',
                          }}
                          title="Click to use this quality"
                        >
                          {q}
                        </button>
                      ))}
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
  const prefillDreamId = searchParams.get('dreamId');
  const prefillQuality = searchParams.get('quality') || '';

  const [encounters, setEncounters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('encounters');
  const [showForm, setShowForm] = useState(!!prefillDreamId);
  const [editingEncounter, setEditingEncounter] = useState(null);
  const [selectedEncounter, setSelectedEncounter] = useState(null);

  useEffect(() => { fetchEncounters(); }, []);

  async function fetchEncounters() {
    const { data } = await supabase
      .from('shadow_encounters')
      .select('*')
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
          onClose={() => { setShowForm(false); setEditingEncounter(null); }}
          onSaved={handleSaved}
          userId={user.id}
        />
      )}
    </div>
  );
}
