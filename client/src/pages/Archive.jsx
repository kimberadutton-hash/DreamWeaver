import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { generateTitle } from '../lib/ai';
import { format, parseISO } from 'date-fns';

export default function Archive() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dreams, setDreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [titling, setTitling] = useState(false);
  const [titlingProgress, setTitlingProgress] = useState(null); // { done, total }

  useEffect(() => {
    fetchDreams();
  }, []);

  async function fetchDreams() {
    setLoading(true);
    const { data, error } = await supabase
      .from('dreams')
      .select('id, dream_date, title, body, mood, tags, has_analysis, created_at')
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
        console.error(`Title generation failed for dream ${dream.id}:`, err);
      }
      setTitlingProgress({ done: i + 1, total: toTitle.length });
    }

    setTitling(false);
    setTitlingProgress(null);
  }

  const filtered = dreams.filter(d => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      d.title?.toLowerCase().includes(q) ||
      d.body?.toLowerCase().includes(q) ||
      d.mood?.toLowerCase().includes(q) ||
      d.tags?.some(t => t.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display italic text-4xl text-ink dark:text-white">
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

      {/* Search */}
      <div className="mb-6">
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search dreams, moods, tags…"
          className="field-input"
        />
      </div>

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
  );
}

function DreamCard({ dream, onClick }) {
  const date = dream.dream_date ? format(parseISO(dream.dream_date), 'MMMM d, yyyy') : '';
  const excerpt = dream.body?.slice(0, 140) + (dream.body?.length > 140 ? '…' : '');

  return (
    <button
      onClick={onClick}
      className="text-left p-6 rounded-2xl border border-black/8 dark:border-white/8 bg-white/50 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 hover:shadow-sm transition-all duration-150 group"
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-body text-ink/40 dark:text-white/40">{date}</span>
        {dream.has_analysis && (
          <span className="text-xs font-body text-gold/70 ml-2">✦ analyzed</span>
        )}
      </div>
      <h3 className="font-display italic text-xl text-ink dark:text-white group-hover:text-plum dark:group-hover:text-gold transition-colors mb-2">
        {dream.title || <span className="text-ink/30 dark:text-white/20">Untitled Dream</span>}
      </h3>
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
