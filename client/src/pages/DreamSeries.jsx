import { useEffect, useState, forwardRef, useImperativeHandle, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatDate } from '../lib/constants';
import DreamPreviewDrawer from '../components/DreamPreviewDrawer';
import { suggestDreamSeries, suggestSeriesAdditions } from '../lib/ai';
import AiErrorMessage from '../components/AiErrorMessage';
import { useApiKey } from '../hooks/useApiKey';

// ── Helpers ────────────────────────────────────────────────

function formatDateRange(dreams) {
  if (!dreams || dreams.length === 0) return null;
  const dates = dreams
    .map(d => d.dream_date)
    .filter(Boolean)
    .sort();
  if (dates.length === 0) return null;
  if (dates.length === 1) return formatDate(dates[0]);
  return `${formatDate(dates[0])} – ${formatDate(dates[dates.length - 1])}`;
}

function confidenceBadge(confidence) {
  if (confidence === 'high') return 'text-[#b8924a]';
  if (confidence === 'medium') return 'text-[#3d2b4a]/60 dark:text-white/50';
  return 'text-ink/40 dark:text-white/30';
}

// ── Tag clustering helpers ──────────────────────────────────

function normalizeTerm(t) {
  return t.toLowerCase().replace(/^(the|a|an)\s+/i, '').trim();
}

function getDreamTerms(dream) {
  const terms = new Set();
  (dream.tags || []).forEach(t => terms.add(normalizeTerm(t)));
  (dream.archetypes || []).forEach(t => terms.add(normalizeTerm(t)));
  (dream.symbols || []).forEach(t => terms.add(normalizeTerm(t)));
  return terms;
}

function buildClusters(dreams) {
  const eligible = dreams.filter(d => !d.series_id);
  if (eligible.length < 3) return [];

  const n = eligible.length;
  const termSets = eligible.map(d => getDreamTerms(d));

  // Union-Find with path compression + union by rank
  const parent = eligible.map((_, i) => i);
  const rankArr = new Array(n).fill(0);

  function find(i) {
    if (parent[i] !== i) parent[i] = find(parent[i]);
    return parent[i];
  }

  function union(i, j) {
    const ri = find(i), rj = find(j);
    if (ri === rj) return;
    if (rankArr[ri] < rankArr[rj]) parent[ri] = rj;
    else if (rankArr[ri] > rankArr[rj]) parent[rj] = ri;
    else { parent[rj] = ri; rankArr[ri]++; }
  }

  // Phase 1: union pairs with Jaccard >= 0.35 and >= 2 shared terms
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = termSets[i], b = termSets[j];
      if (a.size === 0 || b.size === 0) continue;
      const shared = [...a].filter(t => b.has(t));
      if (shared.length < 2) continue;
      const score = shared.length / Math.min(a.size, b.size);
      if (score >= 0.35) union(i, j);
    }
  }

  // Phase 2: greedy expansion — any unattached dream sharing >= 2 tags with any cluster member
  let changed = true;
  while (changed) {
    changed = false;
    const clusterSizes = new Map();
    for (let i = 0; i < n; i++) {
      const root = find(i);
      clusterSizes.set(root, (clusterSizes.get(root) || 0) + 1);
    }
    for (let i = 0; i < n; i++) {
      if ((clusterSizes.get(find(i)) || 0) > 1) continue;
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        if ((clusterSizes.get(find(j)) || 0) <= 1) continue;
        const shared = [...termSets[i]].filter(t => termSets[j].has(t));
        if (shared.length >= 2) {
          union(i, j);
          changed = true;
          break;
        }
      }
    }
  }

  // Group into clusters
  const clusterMap = new Map();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    if (!clusterMap.has(root)) clusterMap.set(root, []);
    clusterMap.get(root).push(eligible[i]);
  }

  const result = [];
  clusterMap.forEach(clusterDreams => {
    if (clusterDreams.length < 3) return;
    // Compute tags shared by >= 60% of dreams in the cluster
    const tSets = clusterDreams.map(d => getDreamTerms(d));
    const termFreq = {};
    tSets.forEach(s => s.forEach(t => { termFreq[t] = (termFreq[t] || 0) + 1; }));
    const threshold = Math.ceil(clusterDreams.length * 0.6);
    const sharedTags = Object.entries(termFreq)
      .filter(([, count]) => count >= threshold)
      .sort((a, b) => b[1] - a[1])
      .map(([t]) => t);
    result.push({ dreams: clusterDreams, sharedTags });
  });

  return result;
}

// ── SeriesFormPanel ────────────────────────────────────────

function SeriesFormPanel({ series, isOpen, onClose, onSaved }) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setName(series?.name || '');
      setDescription(series?.description || '');
      setError(null);
    }
  }, [isOpen, series]);

  async function handleSave(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      updated_at: new Date().toISOString(),
    };

    let err;
    if (series?.id) {
      ({ error: err } = await supabase
        .from('dream_series')
        .update(payload)
        .eq('id', series.id)
        .eq('user_id', user.id));
    } else {
      ({ error: err } = await supabase
        .from('dream_series')
        .insert({ ...payload, user_id: user.id }));
    }

    setSaving(false);
    if (err) { setError(err.message); return; }
    onSaved();
    onClose();
  }

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed top-0 right-0 z-50 h-full w-full sm:w-[480px] bg-[#faf7f2] dark:bg-[#1a1614] shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-7 pt-7 pb-5 border-b border-black/8 dark:border-white/8">
          <h2 className="font-display italic text-2xl text-ink dark:text-white">
            {series?.id ? 'Edit Series' : 'New Dream Series'}
          </h2>
          <button
            onClick={onClose}
            className="text-ink/40 hover:text-ink dark:text-white/40 dark:hover:text-white transition-colors text-xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-7 py-6 space-y-5">
          <div>
            <label className="block text-xs uppercase tracking-widest text-ink/40 dark:text-white/40 font-body mb-2">
              Series Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. The Tower Dreams, Anima Encounters…"
              className="field-input"
              required
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-ink/40 dark:text-white/40 font-body mb-2">
              Description <span className="normal-case not-italic opacity-60">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What connects these dreams? What pattern or theme are you tracking?"
              rows={4}
              className="field-input resize-none"
            />
          </div>

          {error && (
            <p className="text-sm font-body text-red-500">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex-1 py-3 rounded-xl text-sm font-body font-medium text-white disabled:opacity-50 transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#3d2b4a' }}
            >
              {saving ? 'Saving…' : series?.id ? 'Save Changes' : 'Create Series'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-xl text-sm font-body text-ink/50 dark:text-white/40 hover:text-ink dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ── SeriesList ─────────────────────────────────────────────

const SeriesList = forwardRef(function SeriesList({ onNew }, ref) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [seriesList, setSeriesList] = useState([]);
  const [loading, setLoading] = useState(true);

  // AI proposal state
  const [aiProposals, setAiProposals] = useState([]);
  const [aiStatus, setAiStatus] = useState('idle'); // 'idle' | 'scanning' | 'done' | 'error'
  const [aiError, setAiError] = useState(null);
  const [dreamMap, setDreamMap] = useState({});

  useEffect(() => {
    fetchSeries();
  }, []);

  useImperativeHandle(ref, () => ({ findSeries: handleFindSeries }));

  async function fetchSeries() {
    setLoading(true);
    const { data } = await supabase
      .from('dream_series')
      .select('*, dreams ( id, title, dream_date )')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });
    setSeriesList(data || []);
    setLoading(false);
  }

  async function handleFindSeries() {
    if (aiStatus === 'scanning') return;
    setAiStatus('scanning');
    setAiError(null);
    try {
      const { data: allDreams } = await supabase
        .from('dreams')
        .select('id, title, dream_date, tags, archetypes, symbols, series_id')
        .eq('user_id', user.id);

      const map = Object.fromEntries((allDreams || []).map(d => [d.id, d]));
      setDreamMap(map);

      const clusters = buildClusters(allDreams || []);
      if (clusters.length === 0) {
        setAiProposals([]);
        setAiStatus('done');
        return;
      }

      const proposals = await suggestDreamSeries({ clusters });
      setAiProposals(proposals || []);
      setAiStatus('done');
    } catch (err) {
      setAiError(err);
      setAiStatus('error');
    }
  }

  async function handleCreateProposal(proposal, idx) {
    const { data: newSeries, error: seriesErr } = await supabase
      .from('dream_series')
      .insert({
        name: proposal.name,
        description: proposal.narrativeThread,
        user_id: user.id,
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (seriesErr || !newSeries) return;

    await supabase
      .from('dreams')
      .update({ series_id: newSeries.id, updated_at: new Date().toISOString() })
      .in('id', proposal.dreamIds)
      .eq('user_id', user.id);

    setAiProposals(prev => prev.filter((_, i) => i !== idx));
    await fetchSeries();
  }

  function handleDismissProposal(idx) {
    setAiProposals(prev => prev.filter((_, i) => i !== idx));
  }

  if (loading) {
    return (
      <div className="text-center py-20">
        <p className="font-display italic text-2xl text-ink/40 dark:text-white/40">
          Gathering your series…
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* AI scanning indicator */}
      {aiStatus === 'scanning' && (
        <div className="text-center py-10 mb-6">
          <p className="font-display italic text-xl text-ink/50 dark:text-white/40">
            Reading the threads in your archive…
          </p>
        </div>
      )}

      {/* AI error */}
      {aiStatus === 'error' && aiError && (
        <div className="mb-6">
          <AiErrorMessage error={aiError} />
        </div>
      )}

      {/* AI proposals */}
      {aiProposals.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
            <span className="text-xs font-body text-ink/40 dark:text-white/35 whitespace-nowrap">
              AI found {aiProposals.length} possible {aiProposals.length === 1 ? 'series' : 'series'}
            </span>
            <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
          </div>

          <div className="space-y-4">
            {aiProposals.map((proposal, idx) => {
              const dreamTitles = (proposal.dreamIds || []).map(id => dreamMap[id]?.title || 'Untitled Dream');
              const visibleTitles = dreamTitles.slice(0, 4);
              const extra = dreamTitles.length - 4;
              return (
                <div
                  key={idx}
                  className="p-5 rounded-2xl border border-[#b8924a]/20 bg-[#b8924a]/[0.04] dark:bg-[#b8924a]/[0.06]"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[#b8924a] text-sm shrink-0">◆</span>
                      <h3 className="font-display italic text-xl text-ink dark:text-white">
                        {proposal.name}
                      </h3>
                    </div>
                    <span className={`text-xs font-body shrink-0 mt-0.5 ${confidenceBadge(proposal.confidence)}`}>
                      [{proposal.confidence} confidence]
                    </span>
                  </div>
                  <p className="text-sm font-body text-ink/60 dark:text-white/50 leading-relaxed mb-3 ml-5">
                    "{proposal.narrativeThread}"
                  </p>
                  <div className="flex flex-wrap gap-1.5 mb-4 ml-5">
                    {visibleTitles.map((title, ti) => (
                      <span
                        key={ti}
                        className="text-xs font-body text-ink/50 dark:text-white/40 bg-black/5 dark:bg-white/8 rounded-lg px-2.5 py-1 max-w-[160px] truncate"
                      >
                        {title}
                      </span>
                    ))}
                    {extra > 0 && (
                      <span className="text-xs font-body text-ink/35 dark:text-white/25 px-1.5 py-1">
                        +{extra} more
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 ml-5">
                    <button
                      onClick={() => handleCreateProposal(proposal, idx)}
                      className="px-4 py-2 rounded-xl text-xs font-body font-medium text-white hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: '#3d2b4a' }}
                    >
                      Create this series
                    </button>
                    <button
                      onClick={() => handleDismissProposal(idx)}
                      className="text-xs font-body text-ink/40 hover:text-ink dark:text-white/35 dark:hover:text-white transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {seriesList.length === 0 && aiProposals.length === 0 && aiStatus !== 'scanning' ? (
        <div className="text-center py-24">
          <p className="font-display italic text-2xl text-ink/40 dark:text-white/40 mb-3">
            No series yet
          </p>
          <p className="text-sm font-body text-ink/40 dark:text-white/30 mb-8">
            Group recurring dreams into a series to track themes across time.
          </p>
          <button
            onClick={onNew}
            className="px-6 py-3 rounded-xl text-sm font-body font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#3d2b4a' }}
          >
            Create your first series
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {seriesList.map(s => {
            const dreams = s.dreams || [];
            const dreamCount = dreams.length;
            const dateRange = formatDateRange(dreams);
            const recentDreams = [...dreams]
              .sort((a, b) => (b.dream_date || '').localeCompare(a.dream_date || ''))
              .slice(0, 3);

            return (
              <button
                key={s.id}
                onClick={() => navigate(`/series/${s.id}`)}
                className="text-left p-6 rounded-2xl border border-black/8 dark:border-white/8 bg-white/50 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 hover:shadow-sm transition-all duration-150 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-xs font-body text-ink/40 dark:text-white/30">
                    {dreamCount} dream{dreamCount !== 1 ? 's' : ''}
                    {dateRange ? ` · ${dateRange}` : ''}
                  </span>
                  <span className={`text-xs font-body ml-2 shrink-0 ${
                    s.description ? 'text-[#b8924a]/40' : 'text-ink/25 dark:text-white/20'
                  }`}>
                    {s.description ? '◆' : '◌'}
                  </span>
                </div>
                <h3 className="font-display italic text-xl text-ink dark:text-white group-hover:text-plum dark:group-hover:text-gold transition-colors mb-2">
                  {s.name}
                </h3>
                {s.description && (
                  <p className="text-sm font-body text-ink/50 dark:text-white/40 leading-relaxed mb-4 line-clamp-2">
                    {s.description}
                  </p>
                )}
                {recentDreams.length > 0 && (
                  <div className="space-y-1 mt-3">
                    {recentDreams.map(d => (
                      <div key={d.id} className="flex items-center gap-2 text-xs font-body text-ink/40 dark:text-white/30">
                        <span className="shrink-0">{d.dream_date ? formatDate(d.dream_date) : '—'}</span>
                        <span className="truncate">{d.title || 'Untitled Dream'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
});

// ── SeriesDetail ───────────────────────────────────────────

function SeriesDetail({ seriesId }) {
  const { user } = useAuth();
  const { hasKey } = useApiKey();
  const navigate = useNavigate();

  const [series, setSeries] = useState(null);
  const [dreams, setDreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Dream preview drawer
  const [previewTitle, setPreviewTitle] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Add dreams panel
  const [addPanelOpen, setAddPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  // AI suggestions
  const [suggestions, setSuggestions] = useState([]);
  const [suggestStatus, setSuggestStatus] = useState('idle'); // 'idle' | 'loading' | 'done' | 'error'
  const [suggestError, setSuggestError] = useState(null);

  useEffect(() => {
    fetchSeries();
  }, [seriesId]);

  async function fetchSeries() {
    setLoading(true);
    const { data: s } = await supabase
      .from('dream_series')
      .select('*')
      .eq('id', seriesId)
      .eq('user_id', user.id)
      .single();

    if (!s) { navigate('/series'); return; }
    setSeries(s);

    const { data: d } = await supabase
      .from('dreams')
      .select('id, title, dream_date, mood, tags')
      .eq('series_id', seriesId)
      .eq('user_id', user.id)
      .order('dream_date', { ascending: true });

    setDreams(d || []);
    setLoading(false);
  }

  async function handleDeleteSeries() {
    if (!confirm(`Delete series "${series.name}"? The dreams themselves will not be deleted.`)) return;
    setDeleting(true);
    await supabase
      .from('dreams')
      .update({ series_id: null })
      .eq('series_id', seriesId)
      .eq('user_id', user.id);
    await supabase
      .from('dream_series')
      .delete()
      .eq('id', seriesId)
      .eq('user_id', user.id);
    navigate('/series');
  }

  async function handleRemoveDream(dreamId) {
    if (!confirm('Remove this dream from the series?')) return;
    setRemovingId(dreamId);
    await supabase
      .from('dreams')
      .update({ series_id: null })
      .eq('id', dreamId)
      .eq('user_id', user.id);
    setDreams(prev => prev.filter(d => d.id !== dreamId));
    setRemovingId(null);
  }

  async function handleSearch(q) {
    setSearchQuery(q);
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    const { data } = await supabase
      .from('dreams')
      .select('id, title, dream_date')
      .eq('user_id', user.id)
      .is('series_id', null)
      .ilike('title', `%${q}%`)
      .order('dream_date', { ascending: false })
      .limit(10);
    setSearchResults(data || []);
    setSearching(false);
  }

  async function handleAddDream(dreamId) {
    await supabase
      .from('dreams')
      .update({ series_id: seriesId, updated_at: new Date().toISOString() })
      .eq('id', dreamId)
      .eq('user_id', user.id);
    await fetchSeries();
    setSearchResults(prev => prev.filter(d => d.id !== dreamId));
  }

  async function handleFindMoreDreams() {
    if (suggestStatus === 'loading') return;
    setSuggestStatus('loading');
    setSuggestError(null);
    try {
      const [{ data: seriesDreamsData }, { data: candidateData }] = await Promise.all([
        supabase
          .from('dreams')
          .select('id, title, dream_date, tags, archetypes, symbols')
          .eq('series_id', seriesId)
          .eq('user_id', user.id),
        supabase
          .from('dreams')
          .select('id, title, dream_date, tags, archetypes, symbols')
          .eq('user_id', user.id)
          .is('series_id', null),
      ]);

      if (!seriesDreamsData?.length || !candidateData?.length) {
        setSuggestions([]);
        setSuggestStatus('done');
        return;
      }

      const raw = await suggestSeriesAdditions({
        seriesDreams: seriesDreamsData,
        candidateDreams: candidateData,
      });

      const candidateMap = Object.fromEntries(candidateData.map(d => [d.id, d]));
      const enriched = (raw || [])
        .filter(s => candidateMap[s.dreamId])
        .map(s => ({
          ...s,
          title: candidateMap[s.dreamId]?.title || 'Untitled Dream',
          dream_date: candidateMap[s.dreamId]?.dream_date || null,
        }));

      setSuggestions(enriched);
      setSuggestStatus('done');
    } catch (err) {
      setSuggestError(err);
      setSuggestStatus('error');
    }
  }

  async function handleAddSuggestion(suggestion, idx) {
    await supabase
      .from('dreams')
      .update({ series_id: seriesId, updated_at: new Date().toISOString() })
      .eq('id', suggestion.dreamId)
      .eq('user_id', user.id);
    setSuggestions(prev => prev.filter((_, i) => i !== idx));
    await fetchSeries();
  }

  function handleDismissSuggestion(idx) {
    setSuggestions(prev => prev.filter((_, i) => i !== idx));
  }

  function openPreview(title) {
    setPreviewTitle(title);
    setPreviewOpen(true);
  }

  if (loading) {
    return (
      <div className="text-center py-20">
        <p className="font-display italic text-2xl text-ink/40 dark:text-white/40">A moment…</p>
      </div>
    );
  }

  if (!series) return null;

  const dateRange = formatDateRange(dreams);

  return (
    <>
      <div className="max-w-2xl mx-auto px-8 py-10">
        {/* Back */}
        <Link
          to="/series"
          className="text-sm font-body text-ink/40 hover:text-ink dark:text-white/40 dark:hover:text-white transition-colors"
        >
          ← Dream Series
        </Link>

        {/* Header */}
        <div className="mt-6 mb-8">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-plum/40 dark:text-white/25 text-lg">◌</span>
              <h1 className="font-display italic text-4xl text-ink dark:text-white">
                {series.name}
              </h1>
            </div>
            <div className="flex items-center gap-3 shrink-0 mt-1">
              {hasKey && (
                <button
                  onClick={handleFindMoreDreams}
                  disabled={suggestStatus === 'loading'}
                  className="text-sm font-body text-[#b8924a] border border-[#b8924a]/30 px-3 py-1.5 rounded-lg hover:bg-[#b8924a]/10 transition-colors disabled:opacity-50"
                >
                  ◆ Find more dreams
                </button>
              )}
              <button
                onClick={() => setEditOpen(true)}
                className="text-sm font-body text-ink/40 hover:text-ink dark:text-white/40 dark:hover:text-white transition-colors"
              >
                Edit
              </button>
              <button
                onClick={handleDeleteSeries}
                disabled={deleting}
                className="text-sm font-body text-red-400/60 hover:text-red-500 transition-colors disabled:opacity-40"
              >
                Delete
              </button>
            </div>
          </div>

          <p className="text-xs font-body text-ink/40 dark:text-white/30 mb-2">
            {dreams.length} dream{dreams.length !== 1 ? 's' : ''}
            {dateRange ? ` · ${dateRange}` : ''}
          </p>

          {series.description && (
            <p className="text-sm font-body text-ink/60 dark:text-white/50 leading-relaxed">
              {series.description}
            </p>
          )}
        </div>

        {/* Dream list */}
        {dreams.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-black/10 dark:border-white/10 rounded-2xl">
            <p className="font-display italic text-xl text-ink/30 dark:text-white/25 mb-4">
              No dreams in this series yet
            </p>
            <button
              onClick={() => setAddPanelOpen(true)}
              className="text-sm font-body text-plum dark:text-gold hover:opacity-80 transition-opacity"
            >
              + Add dreams
            </button>
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            {dreams.map((d, i) => (
              <div
                key={d.id}
                className="flex items-center gap-4 p-4 rounded-xl border border-black/8 dark:border-white/8 bg-white/40 dark:bg-white/4 group"
              >
                <span className="text-xs font-body text-ink/25 dark:text-white/20 w-5 text-right shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => d.title && openPreview(d.title)}
                    className="text-left w-full"
                  >
                    <p className="font-display italic text-base text-ink dark:text-white group-hover:text-plum dark:group-hover:text-gold transition-colors truncate">
                      {d.title || 'Untitled Dream'}
                    </p>
                    <p className="text-xs font-body text-ink/40 dark:text-white/30 mt-0.5">
                      {d.dream_date ? formatDate(d.dream_date) : '—'}
                    </p>
                  </button>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to={`/dream/${d.id}`}
                    className="text-xs font-body text-ink/30 hover:text-ink dark:text-white/30 dark:hover:text-white transition-colors"
                  >
                    Open →
                  </Link>
                  <button
                    onClick={() => handleRemoveDream(d.id)}
                    disabled={removingId === d.id}
                    className="text-xs font-body text-ink/25 hover:text-red-400 dark:text-white/20 dark:hover:text-red-400 transition-colors disabled:opacity-40 ml-1"
                    title="Remove from series"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add dreams button */}
        {dreams.length > 0 && (
          <button
            onClick={() => setAddPanelOpen(true)}
            className="w-full py-3 rounded-xl border border-dashed border-black/15 dark:border-white/15 text-sm font-body text-ink/40 dark:text-white/35 hover:border-plum/40 hover:text-plum dark:hover:border-gold/30 dark:hover:text-gold transition-all"
          >
            + Add dreams to this series
          </button>
        )}

        {/* AI suggestions panel */}
        {suggestStatus !== 'idle' && (
          <div className="mt-6 rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden">
            <div className="px-5 py-3 border-b border-black/8 dark:border-white/8 bg-black/[0.03] dark:bg-white/[0.04]">
              <span className="text-xs font-body uppercase tracking-widest text-ink/40 dark:text-white/35">
                Suggested additions
              </span>
            </div>

            {suggestStatus === 'loading' && (
              <div className="px-5 py-8 text-center">
                <p className="font-display italic text-lg text-ink/40 dark:text-white/35">
                  Finding connections…
                </p>
              </div>
            )}

            {suggestStatus === 'error' && suggestError && (
              <div className="px-5 py-4">
                <AiErrorMessage error={suggestError} />
              </div>
            )}

            {suggestStatus === 'done' && suggestions.length === 0 && (
              <div className="px-5 py-5 flex items-center justify-between">
                <span className="text-sm font-body text-ink/40 dark:text-white/35">
                  No more suggestions
                </span>
                <button
                  onClick={() => { setSuggestions([]); setSuggestStatus('idle'); }}
                  className="text-sm font-body text-ink/40 hover:text-ink dark:text-white/35 dark:hover:text-white transition-colors underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {suggestStatus === 'done' && suggestions.length > 0 && (
              <div>
                {suggestions.map((s, idx) => (
                  <div
                    key={s.dreamId}
                    className="px-5 py-4 border-b border-black/6 dark:border-white/6 last:border-0"
                  >
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <div className="min-w-0">
                        <span className="font-display italic text-base text-ink dark:text-white">
                          {s.title}
                        </span>
                        {s.dream_date && (
                          <span className="text-xs font-body text-ink/40 dark:text-white/30 ml-2 shrink-0">
                            · {formatDate(s.dream_date)}
                          </span>
                        )}
                      </div>
                      <span className={`text-xs font-body shrink-0 ${confidenceBadge(s.confidence)}`}>
                        [{s.confidence}]
                      </span>
                    </div>
                    <p className="text-sm font-body text-ink/55 dark:text-white/45 leading-relaxed mb-3">
                      "{s.reason}"
                    </p>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleAddSuggestion(s, idx)}
                        className="text-xs font-body font-medium text-white px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: '#3d2b4a' }}
                      >
                        Add to series
                      </button>
                      <button
                        onClick={() => handleDismissSuggestion(idx)}
                        className="text-xs font-body text-ink/40 hover:text-ink dark:text-white/35 dark:hover:text-white transition-colors"
                      >
                        Not a match
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add dreams search panel */}
      {addPanelOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
            onClick={() => { setAddPanelOpen(false); setSearchQuery(''); setSearchResults([]); }}
          />
          <div className="fixed top-0 right-0 z-50 h-full w-full sm:w-[480px] bg-[#faf7f2] dark:bg-[#1a1614] shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-7 pt-7 pb-5 border-b border-black/8 dark:border-white/8">
              <h2 className="font-display italic text-2xl text-ink dark:text-white">Add Dreams</h2>
              <button
                onClick={() => { setAddPanelOpen(false); setSearchQuery(''); setSearchResults([]); }}
                className="text-ink/40 hover:text-ink dark:text-white/40 dark:hover:text-white transition-colors text-xl"
              >
                ×
              </button>
            </div>

            <div className="px-7 py-5 flex-1 overflow-y-auto">
              <input
                type="search"
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Search dreams by title…"
                className="field-input mb-4"
                autoFocus
              />

              {searching && (
                <p className="text-sm font-body text-ink/40 dark:text-white/30 text-center py-4">Searching…</p>
              )}

              {!searching && searchQuery && searchResults.length === 0 && (
                <p className="text-sm font-body text-ink/40 dark:text-white/30 text-center py-4">
                  No unassigned dreams match "{searchQuery}"
                </p>
              )}

              {!searching && !searchQuery && (
                <p className="text-sm font-body text-ink/35 dark:text-white/25 text-center py-8">
                  Search for a dream title to add it to this series.<br />
                  Only dreams not already in a series are shown.
                </p>
              )}

              <div className="space-y-2">
                {searchResults.map(d => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between gap-4 p-4 rounded-xl border border-black/8 dark:border-white/8 bg-white/40 dark:bg-white/4"
                  >
                    <div className="min-w-0">
                      <p className="font-display italic text-base text-ink dark:text-white truncate">
                        {d.title || 'Untitled Dream'}
                      </p>
                      <p className="text-xs font-body text-ink/40 dark:text-white/30 mt-0.5">
                        {d.dream_date ? formatDate(d.dream_date) : '—'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleAddDream(d.id)}
                      className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-body font-medium text-white transition-opacity hover:opacity-90"
                      style={{ backgroundColor: '#3d2b4a' }}
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit series panel */}
      <SeriesFormPanel
        series={series}
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={fetchSeries}
      />

      {/* Dream preview drawer */}
      <DreamPreviewDrawer
        dreamTitle={previewTitle}
        isOpen={previewOpen}
        onClose={() => { setPreviewOpen(false); setPreviewTitle(null); }}
      />
    </>
  );
}

// ── Default export ─────────────────────────────────────────

export default function DreamSeries() {
  const { id } = useParams();
  const { hasKey } = useApiKey();

  const seriesListRef = useRef(null);
  const [formOpen, setFormOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // If we have an id, render the detail view
  if (id) {
    return <SeriesDetail seriesId={id} />;
  }

  // Otherwise render the list
  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display italic text-4xl text-ink dark:text-white mb-1">Dream Series</h1>
          <p className="text-sm font-body text-ink/40 dark:text-white/35">
            Group recurring dreams to track patterns across time.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {hasKey ? (
            <button
              onClick={() => seriesListRef.current?.findSeries()}
              className="px-4 py-2.5 rounded-xl text-sm font-body border border-[#b8924a]/50 text-[#b8924a] hover:bg-[#b8924a]/10 transition-colors"
            >
              ◆ Find series with AI
            </button>
          ) : (
            <p className="text-xs font-body text-ink/35 dark:text-white/25">
              Add an API key in{' '}
              <Link to="/settings" className="underline hover:text-ink/60 dark:hover:text-white/50 transition-colors">
                Settings
              </Link>
              {' '}to use AI features.
            </p>
          )}
          <button
            onClick={() => setFormOpen(true)}
            className="px-5 py-2.5 rounded-xl text-sm font-body font-medium text-white transition-opacity hover:opacity-90 shrink-0"
            style={{ backgroundColor: '#3d2b4a' }}
          >
            + New Series
          </button>
        </div>
      </div>

      <SeriesList ref={seriesListRef} key={refreshKey} onNew={() => setFormOpen(true)} />

      <SeriesFormPanel
        series={null}
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => { setRefreshKey(k => k + 1); setFormOpen(false); }}
      />
    </div>
  );
}
