import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatDate } from '../lib/constants';
import DreamPreviewDrawer from '../components/DreamPreviewDrawer';

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

function SeriesList({ onNew }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [seriesList, setSeriesList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSeries();
  }, []);

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

  if (loading) {
    return (
      <div className="text-center py-20">
        <p className="font-display italic text-2xl text-ink/40 dark:text-white/40">
          Gathering your series…
        </p>
      </div>
    );
  }

  if (seriesList.length === 0) {
    return (
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
    );
  }

  return (
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
              <span className="text-xs font-body text-plum/50 dark:text-white/25 ml-2 shrink-0">◌</span>
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
  );
}

// ── SeriesDetail ───────────────────────────────────────────

function SeriesDetail({ seriesId }) {
  const { user } = useAuth();
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
    // Unlink all dreams from series
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
    // Refresh dreams list
    await fetchSeries();
    setSearchResults(prev => prev.filter(d => d.id !== dreamId));
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
  const navigate = useNavigate();
  const { user } = useAuth();

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
        <button
          onClick={() => setFormOpen(true)}
          className="px-5 py-2.5 rounded-xl text-sm font-body font-medium text-white transition-opacity hover:opacity-90 shrink-0"
          style={{ backgroundColor: '#3d2b4a' }}
        >
          + New Series
        </button>
      </div>

      <SeriesList key={refreshKey} onNew={() => setFormOpen(true)} />

      <SeriesFormPanel
        series={null}
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => { setRefreshKey(k => k + 1); setFormOpen(false); }}
      />
    </div>
  );
}
