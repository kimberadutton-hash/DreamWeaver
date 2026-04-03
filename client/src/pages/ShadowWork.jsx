import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useApiKey } from '../hooks/useApiKey';
import { groupShadowQualities } from '../lib/ai';
import PracticeOrientation from '../components/PracticeOrientation';
import JungianTerm from '../components/JungianTerm';
import AiErrorMessage from '../components/AiErrorMessage';

// ── Helpers ────────────────────────────────────────────────────────────────

function collectQualities(encounters, dreams) {
  const seen = new Set();
  const result = [];

  const add = (q) => {
    if (!q || typeof q !== 'string') return;
    const key = q.trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    result.push(q.trim());
  };

  encounters.forEach(enc => {
    if (enc.projected_quality) add(enc.projected_quality);
    if (Array.isArray(enc.projected_qualities)) enc.projected_qualities.forEach(add);
  });

  dreams.forEach(dream => {
    const sa = dream.shadow_analysis;
    if (!sa) return;
    const pq = sa.projectedQualities || sa.projected_qualities;
    if (Array.isArray(pq)) pq.forEach(add);
  });

  return result;
}

function filterQualitiesByDreamCount(qualities, dreams) {
  const counts = new Map();
  dreams.forEach(dream => {
    const sa = dream.shadow_analysis;
    if (!sa) return;
    const pq = sa.projectedQualities || sa.projected_qualities;
    if (!Array.isArray(pq)) return;
    const seenInDream = new Set();
    pq.forEach(q => {
      if (!q || typeof q !== 'string') return;
      const key = q.trim().toLowerCase();
      if (seenInDream.has(key)) return;
      seenInDream.add(key);
      counts.set(key, (counts.get(key) || 0) + 1);
    });
  });
  const filtered = qualities.filter(q => (counts.get(q.trim().toLowerCase()) || 0) >= 2);
  return filtered.length >= 3 ? filtered : qualities;
}

function attachShadowTypes(clusters, userId) {
  return clusters.map(c => ({
    ...c,
    shadowType: localStorage.getItem(`dw_shadow_type_${userId}_${c.clusterName}`) || null,
  }));
}

function matchDreamsToCluster(dreams, clusterQualities) {
  const clusterSet = new Set(clusterQualities.map(q => q.toLowerCase().trim()));
  return dreams.filter(dream => {
    const sa = dream.shadow_analysis;
    if (!sa) return false;
    const pq = sa.projectedQualities || sa.projected_qualities;
    if (!Array.isArray(pq)) return false;
    return pq.some(q => clusterSet.has(q.toLowerCase().trim()));
  });
}

function matchEncountersToCluster(encounters, clusterQualities) {
  const clusterSet = new Set(clusterQualities.map(q => q.toLowerCase().trim()));
  return encounters.filter(enc => {
    if (enc.projected_quality && clusterSet.has(enc.projected_quality.toLowerCase().trim())) return true;
    if (Array.isArray(enc.projected_qualities)) {
      return enc.projected_qualities.some(q => q && clusterSet.has(q.toLowerCase().trim()));
    }
    return false;
  });
}

function matchMilestonesToCluster(milestones, clusterName) {
  return milestones.filter(entry =>
    entry.linked_shadow_quality &&
    entry.linked_shadow_quality.toLowerCase().trim() === clusterName.toLowerCase().trim()
  );
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

// ── ThemeCard ──────────────────────────────────────────────────────────────

function ThemeCard({ clusterName, descriptor, watchFor, shadowType, onShadowTypeChange, originDreams, wakingLifeMatches, existingNotes, userId }) {
  const navigate = useNavigate();

  const [notes, setNotes] = useState(existingNotes);
  const [textValue, setTextValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [earlierOpen, setEarlierOpen] = useState(false);
  const [typePromptVisible, setTypePromptVisible] = useState(false);

  // Fade-in the type prompt after mount
  useEffect(() => {
    if (shadowType === null) {
      const t = setTimeout(() => setTypePromptVisible(true), 30);
      return () => clearTimeout(t);
    }
  }, [shadowType]);

  // Notes newest-first
  const sortedNotes = [...notes].reverse();
  const mostRecent = sortedNotes[0] || null;
  const earlier = sortedNotes.slice(1);

  // Status: both → "integrating", one → "in motion", neither → null
  const hasWaking = wakingLifeMatches.length > 0;
  const hasNotes = notes.length > 0;
  const statusLabel = hasWaking && hasNotes ? 'integrating' : (hasWaking || hasNotes) ? 'in motion' : null;

  // History count drives the toggle visibility
  const historyCount = originDreams.length + wakingLifeMatches.length + notes.length;

  // Computed watchFor based on shadowType
  const displayedWatchFor =
    shadowType === 'dark'
      ? 'Watch for: where this pattern acts before you\'ve chosen it.'
      : shadowType === 'not_sure'
      ? 'Watch for: where this quality appears — in dreams, in others, in yourself.'
      : watchFor; // null or 'golden' → original AI text

  // Shadow type pill config
  const shadowPill =
    shadowType === 'golden'
      ? { label: 'Golden shadow', bg: '#f5e6c8', color: '#b8924a' }
      : shadowType === 'dark'
      ? { label: 'Dark shadow', bg: '#e8e0ed', color: '#3d2b4a' }
      : null;

  async function handleSave() {
    const content = textValue.trim();
    if (!content) return;
    setSaving(true);
    const newEntry = { content, created_at: new Date().toISOString() };
    const updatedNotes = [...notes, newEntry];
    setNotes(updatedNotes);
    setTextValue('');
    await supabase
      .from('shadow_theme_notes')
      .upsert(
        { user_id: userId, theme_name: clusterName, notes: updatedNotes, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,theme_name' }
      );
    setSaving(false);
  }

  function formatNoteDate(isoString) {
    try {
      const d = new Date(isoString);
      return `— ${d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
    } catch {
      return '';
    }
  }

  return (
    <div
      className="rounded-lg bg-white"
      style={{ padding: '24px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <p className="font-display italic text-ink leading-tight" style={{ fontSize: 22 }}>
            {clusterName}
          </p>
          {shadowPill && (
            <span
              className="font-body shrink-0"
              style={{
                fontSize: 10,
                padding: '2px 7px',
                borderRadius: 10,
                backgroundColor: shadowPill.bg,
                color: shadowPill.color,
              }}
            >
              {shadowPill.label}
            </span>
          )}
        </div>
        {originDreams.length > 0 && (
          <span
            className="shrink-0 mt-1"
            style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(42,36,32,0.35)' }}
          >
            ×{originDreams.length} {originDreams.length === 1 ? 'dream' : 'dreams'}
          </span>
        )}
      </div>

      {/* Status label */}
      {statusLabel && (
        <p className="font-display italic mb-3" style={{ fontSize: 13, color: '#b8924a' }}>
          {statusLabel}
        </p>
      )}

      {/* Descriptor */}
      {descriptor && (
        <p className="font-display italic" style={{ fontSize: 15, color: 'rgba(42,36,32,0.70)', marginTop: 0, marginBottom: 2 }}>
          {descriptor}
        </p>
      )}

      {/* Watch for */}
      {displayedWatchFor && (
        <p className="font-body" style={{ fontSize: 12, color: 'rgba(42,36,32,0.55)', marginBottom: 12 }}>
          {displayedWatchFor}
        </p>
      )}

      {/* Shadow type prompt — only when unset */}
      {shadowType === null && (
        <div
          style={{
            opacity: typePromptVisible ? 1 : 0,
            transition: 'opacity 0.3s ease',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'baseline',
            flexWrap: 'wrap',
            gap: '0 10px',
          }}
        >
          <span className="font-body" style={{ fontSize: 11, color: 'rgba(42,36,32,0.45)' }}>
            Does this feel like —
          </span>
          {[
            { value: 'golden', label: 'Golden shadow' },
            { value: 'dark', label: 'Dark shadow' },
            { value: 'not_sure', label: 'Not sure yet' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => onShadowTypeChange(opt.value)}
              className="font-body"
              style={{
                fontSize: 12,
                color: 'rgba(42,36,32,0.55)',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
              }}
            >
              ◯ {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Recording space */}
      <div className="mt-3">
        <textarea
          rows={2}
          value={textValue}
          onChange={e => setTextValue(e.target.value)}
          placeholder="A moment, a noticing, a shift..."
          className="w-full font-body text-ink rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-gold/40 px-4 py-3"
          style={{
            backgroundColor: '#faf7f2',
            border: '1px solid rgba(0,0,0,0.06)',
            fontSize: 14,
            lineHeight: 1.6,
          }}
        />
        <div className="flex justify-end mt-1">
          <button
            onClick={handleSave}
            disabled={saving || !textValue.trim()}
            className="font-body text-ink/35 hover:text-gold disabled:opacity-30 transition-colors"
            style={{ fontSize: 13 }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* History toggle */}
      {historyCount > 0 && (
        <button
          onClick={() => setHistoryOpen(o => !o)}
          className="mt-3 font-body text-ink/35 hover:text-ink/55 transition-colors"
          style={{ fontSize: 12 }}
        >
          {historyOpen ? 'Hide history' : `View history (${historyCount}) ›`}
        </button>
      )}

      {/* History collapsible — CSS transition, not conditional rendering */}
      <div
        style={{
          maxHeight: historyOpen ? '3000px' : '0',
          opacity: historyOpen ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.35s ease, opacity 0.2s ease',
        }}
      >
        <div className="mt-4 space-y-5">

          {/* ORIGINS */}
          {originDreams.length > 0 && (
            <div>
              <p
                className="uppercase font-body mb-2"
                style={{ fontSize: 10, letterSpacing: '0.14em', color: 'rgba(42,36,32,0.35)' }}
              >
                Origins
              </p>
              <div className="flex flex-wrap gap-2">
                {originDreams.map(dream => (
                  <button
                    key={dream.id}
                    onClick={() => navigate(`/dream/${dream.id}`)}
                    className="flex items-center gap-1.5 rounded-full border border-black/10 bg-black/3 hover:bg-black/6 transition-colors px-3 py-1"
                  >
                    <span className="font-body text-ink/70" style={{ fontSize: 12 }}>
                      {truncate(dream.title || 'Untitled', 24)}
                    </span>
                    {dream.dream_date && (
                      <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(42,36,32,0.35)' }}>
                        {dream.dream_date}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* WAKING LIFE MOMENTS */}
          {wakingLifeMatches.length > 0 && (
            <div>
              <p
                className="uppercase font-body mb-2"
                style={{ fontSize: 10, letterSpacing: '0.14em', color: 'rgba(42,36,32,0.35)' }}
              >
                Waking Life Moments
              </p>
              <div className="space-y-1">
                {wakingLifeMatches.map(m => (
                  <div key={m.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span style={{ color: '#b8924a', fontSize: 12 }}>●</span>
                      <span className="font-body text-ink/70 truncate" style={{ fontSize: 13 }}>
                        {m.title}
                      </span>
                    </div>
                    {m.entry_date && (
                      <span
                        className="shrink-0"
                        style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(42,36,32,0.30)' }}
                      >
                        {m.entry_date}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* YOUR ENTRIES */}
          {notes.length > 0 && (
            <div>
              <p
                className="uppercase font-body mb-3"
                style={{ fontSize: 10, letterSpacing: '0.14em', color: 'rgba(42,36,32,0.35)' }}
              >
                Your Entries
              </p>

              {/* Most recent */}
              {mostRecent && (
                <div>
                  <p
                    className="font-display italic text-ink pl-3"
                    style={{ fontSize: 16, lineHeight: 1.7, borderLeft: '2px solid rgba(0,0,0,0.07)' }}
                  >
                    {mostRecent.content}
                  </p>
                  <p
                    className="text-right mt-1"
                    style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(42,36,32,0.30)' }}
                  >
                    {formatNoteDate(mostRecent.created_at)}
                  </p>
                </div>
              )}

              {/* Earlier entries — CSS transition, not conditional rendering */}
              {earlier.length > 0 && (
                <div className="mt-3">
                  <button
                    onClick={() => setEarlierOpen(o => !o)}
                    className="font-body text-ink/35 hover:text-ink/55 transition-colors"
                    style={{ fontSize: 12 }}
                  >
                    {earlierOpen ? 'Hide earlier' : `Show earlier (${earlier.length}) ›`}
                  </button>
                  <div
                    style={{
                      maxHeight: earlierOpen ? `${earlier.length * 140}px` : '0',
                      opacity: earlierOpen ? 1 : 0,
                      overflow: 'hidden',
                      transition: 'max-height 0.3s ease, opacity 0.2s ease',
                    }}
                  >
                    <div className="space-y-3 mt-3">
                      {earlier.map((note, i) => (
                        <div key={i}>
                          {i > 0 && <hr style={{ borderColor: 'rgba(0,0,0,0.06)', margin: '12px 0' }} />}
                          <p
                            className="font-display italic text-ink/65 pl-3"
                            style={{ fontSize: 14, lineHeight: 1.7, borderLeft: '2px solid rgba(0,0,0,0.06)' }}
                          >
                            {note.content}
                          </p>
                          <p
                            className="text-right mt-1"
                            style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(42,36,32,0.25)' }}
                          >
                            {formatNoteDate(note.created_at)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function ShadowWork() {
  const { user } = useAuth();
  const { apiKey } = useApiKey();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [clusters, setClusters] = useState([]);
  const [dreams, setDreams] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [themeNotes, setThemeNotes] = useState({});

  useEffect(() => {
    if (!user) return;
    migrateShadowEncounters();
    load();
  }, [user]);

  async function migrateShadowEncounters() {
    const migKey = `dw_enc_migrated_${user.id}`;
    if (localStorage.getItem(migKey)) return;

    const { data: encounters } = await supabase
      .from('shadow_encounters')
      .select('id, title, projected_quality, projected_qualities, linked_dream_id, created_at')
      .eq('user_id', user.id);

    if (!encounters?.length) {
      localStorage.setItem(migKey, '1');
      return;
    }

    // Find already-migrated entries to avoid duplicates
    const { data: existing } = await supabase
      .from('waking_life_entries')
      .select('linked_dream_id')
      .eq('user_id', user.id)
      .eq('entry_type', 'shadow_encounter');

    const migratedDreamIds = new Set(
      (existing || []).map(e => e.linked_dream_id).filter(Boolean)
    );

    const toInsert = encounters
      .filter(enc => enc.title && (!enc.linked_dream_id || !migratedDreamIds.has(enc.linked_dream_id)))
      .map(enc => ({
        user_id: user.id,
        entry_type: 'shadow_encounter',
        entry_date: enc.created_at ? enc.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
        title: enc.title,
        linked_dream_id: enc.linked_dream_id || null,
        linked_shadow_quality: enc.projected_quality || null,
        tags: enc.projected_qualities || [],
      }));

    if (toInsert.length > 0) {
      await supabase.from('waking_life_entries').insert(toInsert);
    }

    localStorage.setItem(migKey, '1');
  }

  async function load({ isRefresh = false } = {}) {
    if (!isRefresh) setLoading(true);
    setAiError(null);

    const [
      { data: encounters },
      { data: dreamData },
      { data: milestoneRows },
      { data: noteRows },
    ] = await Promise.all([
      supabase
        .from('shadow_encounters')
        .select('id, projected_quality, projected_qualities, linked_dream_id, title')
        .eq('user_id', user.id),
      supabase
        .from('dreams')
        .select('id, title, dream_date, shadow_analysis')
        .eq('user_id', user.id)
        .not('shadow_analysis', 'is', null),
      supabase
        .from('waking_life_entries')
        .select('id, title, description, tags, entry_date, entry_type, linked_shadow_quality')
        .eq('user_id', user.id),
      supabase
        .from('shadow_theme_notes')
        .select('theme_name, notes')
        .eq('user_id', user.id),
    ]);

    const resolvedDreams = dreamData || [];
    const resolvedMilestones = milestoneRows || [];
    setDreams(resolvedDreams);
    setMilestones(resolvedMilestones);

    const notesMap = {};
    (noteRows || []).forEach(row => { notesMap[row.theme_name] = row.notes; });
    setThemeNotes(notesMap);

    const allQualities = collectQualities(encounters || [], resolvedDreams);
    const dreamCount = resolvedDreams.length;

    if (allQualities.length === 0) {
      setClusters([]);
      setLoading(false);
      return;
    }

    // Cache keys
    const cacheKey = `dw_shadow_clusters_${user.id}`;
    const countKey = `dw_shadow_clusters_dream_count_${user.id}`;

    // Use cache if dream count matches and not a forced refresh
    if (!isRefresh) {
      const cached = localStorage.getItem(cacheKey);
      const cachedCount = parseInt(localStorage.getItem(countKey) || '-1', 10);
      if (cached && cachedCount === dreamCount) {
        try {
          const parsed = JSON.parse(cached);
          setClusters(attachShadowTypes(parsed, user.id));
          setLoading(false);
          return;
        } catch {
          // cache corrupt — fall through to API
        }
      }
    }

    // Filter to qualities appearing in 2+ dreams, then cluster
    const qualities = filterQualitiesByDreamCount(allQualities, resolvedDreams);

    try {
      const grouped = await groupShadowQualities(qualities, apiKey);
      const result = grouped || [];
      localStorage.setItem(cacheKey, JSON.stringify(result));
      localStorage.setItem(countKey, String(dreamCount));
      setClusters(attachShadowTypes(result, user.id));
    } catch (err) {
      setAiError(err);
      setClusters(attachShadowTypes([{ clusterName: 'Shadow Patterns', qualities, descriptor: '', watchFor: '' }], user.id));
    }

    setLoading(false);
  }

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    await load({ isRefresh: true });
    setRefreshing(false);
  }

  function handleShadowTypeChange(clusterName, value) {
    localStorage.setItem(`dw_shadow_type_${user.id}_${clusterName}`, value);
    setClusters(prev => prev.map(c =>
      c.clusterName === clusterName ? { ...c, shadowType: value } : c
    ));
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
        <PracticeOrientation storageKey="orient_shadow">
          <p>The <JungianTerm id="shadow">shadow</JungianTerm> shows up in the people you can't stand, the reactions that embarrass you, the qualities you admire too intensely in others. Recording these encounters is the beginning of owning what belongs to you.</p>
          <p>The qualities that disturb you most are often the ones you most need. The shadow is not your enemy — it is the part of you that has been waiting to be included.</p>
        </PracticeOrientation>
      </div>

      {/* Active shadow quality — most recent cluster with no waking life connection */}
      {!loading && clusters.length > 0 && (() => {
        const candidates = clusters
          .map(c => {
            const originDreams = matchDreamsToCluster(dreams, c.qualities || []);
            const wakingMatches = matchMilestonesToCluster(milestones, c.clusterName);
            const mostRecentDate = originDreams.reduce(
              (best, d) => (!best || d.dream_date > best ? d.dream_date : best),
              null
            );
            return { c, wakingMatches, mostRecentDate };
          })
          .filter(({ wakingMatches }) => wakingMatches.length === 0)
          .sort((a, b) => (b.mostRecentDate || '').localeCompare(a.mostRecentDate || ''));
        const active = candidates[0]?.c;
        if (!active) return null;
        return (
          <div className="mb-8 pl-4 border-l-2 border-gold/30">
            <p
              className="uppercase font-body text-ink/30 dark:text-white/25 mb-1"
              style={{ fontSize: 9, letterSpacing: '0.16em' }}
            >
              currently with you
            </p>
            <p className="font-display italic leading-snug" style={{ fontSize: 17, color: 'rgba(42,36,32,0.75)' }}>
              {active.clusterName}
              {active.descriptor && (
                <span className="not-italic" style={{ fontSize: 14, color: 'rgba(42,36,32,0.42)' }}>
                  {' '}— {active.descriptor}
                </span>
              )}
            </p>
          </div>
        );
      })()}

      {/* Orienting question + refresh */}
      <div className="mb-10">
        <p
          className="font-display italic text-ink/70 dark:text-white/60 leading-relaxed"
          style={{ fontSize: 18 }}
        >
          These qualities are moving through your dreams. Which ones feel alive in your waking life right now?
        </p>
        {!loading && clusters.length > 0 && (
          <div className="flex justify-end mt-1">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="font-body text-ink/30 hover:text-ink/50 transition-colors disabled:opacity-40"
              style={{ fontSize: 11 }}
            >
              {refreshing ? 'Refreshing…' : 'Refresh ↺'}
            </button>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-40">
          <p className="font-display italic text-xl text-ink/30 dark:text-white/25">
            Reading the patterns…
          </p>
        </div>
      )}

      {/* AI error (non-fatal — clusters still render from fallback) */}
      {!loading && aiError && (
        <div className="mb-6">
          <AiErrorMessage error={aiError} />
        </div>
      )}

      {/* Empty state */}
      {!loading && clusters.length === 0 && (
        <div className="text-center py-16">
          <p className="font-display italic text-ink/40 dark:text-white/30 leading-relaxed max-w-sm mx-auto" style={{ fontSize: 17 }}>
            Shadow material begins to emerge as your dream practice deepens.
            Record more dreams and run analysis to see patterns here.
          </p>
        </div>
      )}

      {/* Theme cluster cards */}
      {!loading && clusters.length > 0 && (
        <div className="space-y-6">
          {clusters.map(cluster => {
            const originDreams = matchDreamsToCluster(dreams, cluster.qualities || []);
            const wakingLifeMatches = matchMilestonesToCluster(milestones, cluster.clusterName);
            const clusterQualitySet = new Set((cluster.qualities || []).map(q => q.toLowerCase().trim()));
            const encounterCount = milestones.filter(m =>
              m.entry_type === 'shadow_encounter' &&
              m.linked_shadow_quality &&
              clusterQualitySet.has(m.linked_shadow_quality.toLowerCase().trim())
            ).length;
            const qualityParam = (cluster.qualities || [])[0] || cluster.clusterName;
            return (
              <div key={cluster.clusterName}>
                <ThemeCard
                  clusterName={cluster.clusterName}
                  descriptor={cluster.descriptor || ''}
                  watchFor={cluster.watchFor || ''}
                  shadowType={cluster.shadowType ?? null}
                  onShadowTypeChange={(value) => handleShadowTypeChange(cluster.clusterName, value)}
                  originDreams={originDreams}
                  wakingLifeMatches={wakingLifeMatches}
                  existingNotes={themeNotes[cluster.clusterName] || []}
                  userId={user.id}
                />
                {encounterCount > 0 && (
                  <a
                    href={`/waking-life?quality=${encodeURIComponent(qualityParam)}`}
                    className="block mt-1 font-body transition-colors"
                    style={{ fontSize: 12, color: 'rgba(92,74,124,0.55)', paddingLeft: 4 }}
                    onMouseEnter={e => e.currentTarget.style.color = '#5c4a7c'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(92,74,124,0.55)'}
                  >
                    {encounterCount} waking {encounterCount === 1 ? 'encounter' : 'encounters'} →
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
