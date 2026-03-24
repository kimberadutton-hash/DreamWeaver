import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format, parseISO } from 'date-fns';

export default function Timeline() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [byYear, setByYear] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimeline();
  }, []);

  async function fetchTimeline() {
    const { data } = await supabase
      .from('dreams')
      .select('id, dream_date, title, body, tags, archetypes')
      .eq('user_id', user.id)
      .order('dream_date', { ascending: false });

    if (!data) { setLoading(false); return; }

    // Group by year
    const years = {};
    data.forEach(dream => {
      const year = dream.dream_date?.slice(0, 4) || 'Unknown';
      if (!years[year]) years[year] = { dreams: [], tagCounts: {} };
      years[year].dreams.push(dream);

      const allTags = [...(dream.tags || []), ...(dream.archetypes || [])];
      allTags.forEach(t => {
        years[year].tagCounts[t] = (years[year].tagCounts[t] || 0) + 1;
      });
    });

    const result = Object.entries(years)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([year, { dreams, tagCounts }]) => ({
        year,
        dreams,
        topThemes: Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t]) => t),
      }));

    setByYear(result);
    setLoading(false);
  }

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <h1 className="font-display italic text-4xl text-ink dark:text-white mb-8">
        Timeline
      </h1>

      {loading ? (
        <p className="font-display italic text-xl text-ink/40">Tracing the arc of time…</p>
      ) : byYear.length === 0 ? (
        <p className="font-display italic text-xl text-ink/40">No dreams recorded yet.</p>
      ) : (
        <div className="space-y-10">
          {byYear.map(({ year, dreams, topThemes }) => (
            <div key={year}>
              {/* Year header */}
              <div className="flex items-center gap-4 mb-4">
                <h2 className="font-display italic text-3xl text-plum dark:text-gold">{year}</h2>
                <div className="flex-1 h-px bg-black/10 dark:bg-white/10" />
                <span className="text-xs font-body text-ink/40 dark:text-white/30">
                  {dreams.length} dream{dreams.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Top themes */}
              {topThemes.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {topThemes.map(theme => (
                    <span key={theme} className="px-2.5 py-1 rounded-full text-xs font-body bg-gold/10 text-gold-dark dark:bg-gold/15 dark:text-gold">
                      {theme}
                    </span>
                  ))}
                </div>
              )}

              {/* Dreams list */}
              <div className="space-y-2">
                {dreams.map(dream => (
                  <button
                    key={dream.id}
                    onClick={() => navigate(`/dream/${dream.id}`)}
                    className="w-full text-left flex items-baseline gap-4 px-4 py-3 rounded-xl hover:bg-white/60 dark:hover:bg-white/5 transition-colors group"
                  >
                    <span className="text-xs font-body text-ink/30 dark:text-white/30 shrink-0 w-24">
                      {dream.dream_date ? format(parseISO(dream.dream_date), 'MMM d') : ''}
                    </span>
                    <span className="font-display italic text-lg text-ink dark:text-white group-hover:text-plum dark:group-hover:text-gold transition-colors">
                      {dream.title || 'Untitled Dream'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
