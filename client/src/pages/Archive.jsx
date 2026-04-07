import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { generateTitle } from '../lib/ai';
import { formatDate } from '../lib/constants';
import PracticeOrientation from '../components/PracticeOrientation';
import DreamSeries from './DreamSeries';
import Timeline from './Timeline';

const TABS = [
  { id: 'dreams', label: 'All Dreams' },
  { id: 'series', label: 'Series' },
  { id: 'timeline', label: 'Timeline' },
];

export default function Archive() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dreams, setDreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [titling, setTitling] = useState(false);
  const [titlingProgress, setTitlingProgress] = useState(null); // { done, total }
  const [tab, setTab] = useState('dreams');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    fetchDreams();
  }, []);

  async function fetchDreams() {
    setLoading(true);
    const { data, error } = await supabase
      .from('dreams')
      .select('id, dream_date, title, body, mood, tags, archetypes, symbols, has_analysis, is_big_dream, created_at, dream_series ( name )')
      .eq('user_id', user.id)
      .order('dream_date', { ascending: false });

    if (!error) setDreams(data || []);
    setLoading(false);
  }

  const untitledDreams = dreams.filter(d => !d.title?.trim());

  async function generateMissingTitles() {
    const toTitle = dreams.filter(d => !d.title?.trim());
    if (!toTitle.length) return;
    setTitling(true);
    setTitlingProgress({ done: 0, total: toTitle.length });

    // Maintain a local copy so each iteration sees the latest titles
    let currentDreams = [...dreams];

    for (let i = 0; i < toTitle.length; i++) {
      const dream = toTitle[i];
      try {
        const title = await generateTitle({ body: dream.body, mood: dream.mood });
        if (title) {
          await supabase.from('dreams').update({ title }).eq('id', dream.id);
          currentDreams = currentDreams.map(d => d.id === dream.id ? { ...d, title } : d);
          setDreams(currentDreams);
        }
      } catch (err) {
        // title generation failed — dream keeps existing title
      }
      setTitlingProgress({ done: i + 1, total: toTitle.length });
    }

    setTitling(false);
    setTitlingProgress(null);
  }

  const filtered = dreams.filter(d => {
    if (search) {
      const q = search.toLowerCase();
      const matchesSearch = (
        d.title?.toLowerCase().includes(q) ||
        d.body?.toLowerCase().includes(q) ||
        d.mood?.some(m => m.toLowerCase().includes(q)) ||
        d.tags?.some(t => t.toLowerCase().includes(q)) ||
        (d.archetypes || []).some(a => a.toLowerCase().includes(q)) ||
        d.symbols?.some(s => s.toLowerCase().includes(q))
      );
      if (!matchesSearch) return false;
    }
    if (dateFrom && d.dream_date < dateFrom) return false;
    if (dateTo && d.dream_date > dateTo) return false;
    return true;
  });

  return (
    <div>
      {/* Header + orientation + search + tabs */}
      <div className="max-w-2xl mx-auto px-4 pt-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="font-display italic text-4xl text-plum">
            Dream Archive
          </h1>
          <Link
            to="/new"
            className="px-5 py-2.5 rounded-xl text-sm font-body font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#3d2b4a' }}
          >
            + New Dream
          </Link>
        </div>
        <p className="text-base mb-8 font-sans text-ink/60">
          A living record of where the unconscious has been.
        </p>

        <PracticeOrientation storageKey="orient_archive">
          <p>The archive is not a library — it is a living record of where the unconscious has been. Over time, you will begin to see what the waking mind cannot: the threads that cross months, the figures that return, the territory your psyche keeps coming back to.</p>
          <p>The patterns emerge slowly. Trust the accumulation.</p>
        </PracticeOrientation>

        {/* Search — dreams tab only */}
        {tab === 'dreams' && (
          <div className="mb-4">
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search dreams, moods, tags…"
              className="field-input"
            />
            <div className="mt-1.5">
              <button
                onClick={() => setShowDateFilter(v => !v)}
                className="font-body text-xs text-ink/40 hover:text-ink/60 dark:text-white/30 dark:hover:text-white/50 transition-colors"
              >
                Filter by date {showDateFilter ? '↑' : '↓'}
              </button>
            </div>
            <div
              style={{
                maxHeight: showDateFilter ? '120px' : '0',
                opacity: showDateFilter ? 1 : 0,
                overflow: 'hidden',
                transition: 'max-height 250ms ease, opacity 200ms ease',
              }}
            >
              <div className="pt-3 flex flex-col sm:flex-row gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <label className="font-mono text-xs text-ink/40 dark:text-white/30 shrink-0">From</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                    className="field-input text-sm"
                  />
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <label className="font-mono text-xs text-ink/40 dark:text-white/30 shrink-0">To</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                    className="field-input text-sm"
                  />
                </div>
                {(dateFrom || dateTo) && (
                  <button
                    onClick={() => { setDateFrom(''); setDateTo(''); }}
                    className="font-body text-xs text-ink/40 hover:text-ink/60 dark:text-white/30 dark:hover:text-white/50 transition-colors self-center shrink-0"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab bar */}
        <div className="flex gap-0 mb-6">
          {TABS.map(t => (
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
      </div>

      {/* All Dreams tab content */}
      {tab === 'dreams' && (
        <div className="max-w-2xl mx-auto px-4 pb-10">
          {/* Untitled dreams banner */}
          {!loading && untitledDreams.length > 0 && !search && (
            <div className="mb-6 flex items-center justify-between px-5 py-3 rounded-xl bg-gold/8 border border-gold/20">
              <p className="text-sm font-body text-ink/70 dark:text-white/60">
                {untitledDreams.length} dream{untitledDreams.length !== 1 ? 's' : ''} without a title
                {titlingProgress && (
                  <span className="ml-2 text-gold">
                    — naming {titlingProgress.done}/{titlingProgress.total}…
                  </span>
                )}
              </p>
              <button
                onClick={generateMissingTitles}
                disabled={titling}
                className="text-sm font-body text-gold hover:text-gold-dark disabled:opacity-50 transition-colors ml-4 shrink-0"
              >
                {titling ? 'Working…' : '✦ Generate titles'}
              </button>
            </div>
          )}

          {loading ? (
            <div className="text-center py-20">
              <p className="font-display italic text-2xl text-ink/40 dark:text-white/40">
                Gathering your dreams…
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              {search ? (
                <p className="font-display italic text-xl text-ink/40">
                  No dreams match "{search}"
                </p>
              ) : (
                <div className="space-y-4">
                  <p className="font-display italic text-2xl text-ink/40">
                    Your archive is empty
                  </p>
                  <p className="text-ink/40 text-sm font-body">
                    Record your first dream to begin the journey
                  </p>
                  <Link
                    to="/new"
                    className="inline-block mt-2 px-6 py-3 rounded-xl text-sm font-body font-medium text-white"
                    style={{ backgroundColor: '#3d2b4a' }}
                  >
                    Record a Dream
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map(dream => (
                <DreamCard key={dream.id} dream={dream} onClick={() => navigate(`/dream/${dream.id}`)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Series tab content */}
      {tab === 'series' && <DreamSeries hideHeader />}

      {/* Timeline tab content */}
      {tab === 'timeline' && <Timeline hideHeader />}
    </div>
  );
}

function DreamCard({ dream, onClick }) {
  const date = dream.dream_date ? formatDate(dream.dream_date) : '';
  const excerpt = dream.body?.slice(0, 140) + (dream.body?.length > 140 ? '…' : '');

  return (
    <button
      onClick={onClick}
      className="text-left p-6 rounded-2xl border border-black/8 dark:border-white/8 bg-white/50 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 hover:shadow-sm transition-all duration-150 group"
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-body text-ink/40 dark:text-white/40">{date}</span>
        <div className="flex items-center gap-2 ml-2 shrink-0">
          {dream.is_big_dream && (
            <span className="text-xs font-body text-gold">✦ big dream</span>
          )}
          {dream.has_analysis && (
            <span className="text-xs font-body text-gold/60">analyzed</span>
          )}
        </div>
      </div>
      <h3 className="font-display italic text-xl text-ink dark:text-white group-hover:text-plum dark:group-hover:text-gold transition-colors mb-1">
        {dream.title || <span className="text-ink/30 dark:text-white/20">Untitled Dream</span>}
      </h3>
      {dream.dream_series?.name && (
        <p className="text-xs font-body text-plum/60 dark:text-white/35 mb-2">◌ {dream.dream_series.name}</p>
      )}
      <p className="text-sm text-ink/60 dark:text-white/50 font-body leading-relaxed mb-3">
        {excerpt}
      </p>
      {dream.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {dream.tags.slice(0, 4).map(tag => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-full text-xs font-body bg-plum/8 dark:bg-white/10 text-plum/70 dark:text-white/50"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
