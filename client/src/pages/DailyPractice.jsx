import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatDate } from '../lib/constants';
import { hydrateSignedUrls } from '../lib/storage';
import EmbodimentCheckIn from '../components/EmbodimentCheckIn';

const WAKING_COLORS = {
  art: '#3d2b4a', music: '#4a7c74', writing: '#7c6b5a',
  milestone: '#b8924a', body: '#9a4a6a', synchronicity: '#3a5a7a',
};

const STATUS_COLORS = {
  active:             { dot: '#8b4a4a', text: '#8b4a4a' },
  'becoming-conscious': { dot: '#b8924a', text: '#b8924a' },
};

// ── Section label ──────────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <p
      className="uppercase font-body text-ink/35 dark:text-white/25 mb-4"
      style={{ fontSize: 9, letterSpacing: '0.18em' }}
    >
      {children}
    </p>
  );
}

// ── Section divider ────────────────────────────────────────────────────────────

function Divider() {
  return <div className="border-t border-black/8 dark:border-white/8 my-10" />;
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function DailyPractice() {
  const { user } = useAuth();

  const [activeFocus, setActiveFocus] = useState(null);
  const [livingQuestions, setLivingQuestions] = useState([]);
  const [activeComplexes, setActiveComplexes] = useState([]);
  const [activeShadows, setActiveShadows] = useState([]);
  const [recentWakingLife, setRecentWakingLife] = useState([]);

  useEffect(() => {
    if (!user) return;
    loadActiveFocus();
    loadLivingQuestions();
    loadActiveComplexes();
    loadActiveShadows();
    loadRecentWakingLife();
  }, [user]);

  async function loadActiveFocus() {
    const { data } = await supabase
      .from('analyst_focuses')
      .select('id, focus_text, given_date')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('given_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) setActiveFocus(data);
  }

  async function loadLivingQuestions() {
    const { data } = await supabase
      .from('dreams')
      .select('id, title, dream_date, embodiment_prompt')
      .eq('user_id', user.id)
      .not('embodiment_prompt', 'is', null)
      .is('embodiment_checked_at', null)
      .order('created_at', { ascending: false })
      .limit(5);
    setLivingQuestions(data || []);
  }

  async function loadActiveComplexes() {
    const { data } = await supabase
      .from('complexes')
      .select('id, name, description, integration_status')
      .eq('user_id', user.id)
      .in('integration_status', ['active', 'becoming-conscious'])
      .order('created_at', { ascending: true })
      .limit(8);
    setActiveComplexes(data || []);
  }

  async function loadActiveShadows() {
    const { data } = await supabase
      .from('shadow_encounters')
      .select('id, title, projected_quality, integration_status')
      .eq('user_id', user.id)
      .eq('integration_status', 'active')
      .order('encounter_date', { ascending: false })
      .limit(5);
    setActiveShadows(data || []);
  }

  async function loadRecentWakingLife() {
    const { data } = await supabase
      .from('waking_life_entries')
      .select('id, entry_type, entry_date, title, media_url, media_type')
      .eq('user_id', user.id)
      .order('entry_date', { ascending: false })
      .limit(6);
    const hydrated = await hydrateSignedUrls(data || []);
    setRecentWakingLife(hydrated);
  }

  async function handleSatWith(dreamId) {
    setLivingQuestions(prev => prev.filter(q => q.id !== dreamId));
    await supabase.from('dreams').update({
      embodiment_checked_at: new Date().toISOString(),
    }).eq('id', dreamId);
  }

  return (
    <div className="max-w-2xl mx-auto px-8 py-10">

      {/* Page header */}
      <div className="mb-10">
        <h1 className="font-display italic text-4xl text-ink dark:text-white mb-2">
          Daily Practice
        </h1>
        <p className="text-sm font-body text-ink/50 dark:text-white/40">
          What the psyche is asking of you right now.
        </p>
      </div>

      {/* ── Section F: Embodiment check-in (first if pending) ── */}
      <EmbodimentCheckIn />

      {/* ── Section A: Current focus ── */}
      {activeFocus && (
        <>
          <div
            className="mb-10 rounded-r-xl px-6 py-5 bg-gold/5 dark:bg-gold/8 border border-gold/15 dark:border-gold/20"
            style={{ borderLeft: '3px solid #b8924a' }}
          >
            <SectionLabel>current focus</SectionLabel>
            <p className="font-display italic leading-relaxed text-ink dark:text-white mb-2" style={{ fontSize: 22 }}>
              {activeFocus.focus_text}
            </p>
            {activeFocus.given_date && (
              <p className="font-mono text-xs text-ink/30 dark:text-white/25 mb-3">
                {formatDate(activeFocus.given_date)}
              </p>
            )}
            <Link
              to="/focus"
              className="text-xs font-body text-gold/70 hover:text-gold transition-colors"
            >
              View in Analyst Focus →
            </Link>
          </div>
        </>
      )}

      {/* ── Section B: Living questions ── */}
      <div className="mb-10">
        <SectionLabel>living questions</SectionLabel>
        {livingQuestions.length === 0 ? (
          <p className="font-display italic text-sm text-ink/35 dark:text-white/25">
            No open questions right now. Record a dream to receive one.
          </p>
        ) : (
          livingQuestions.map((q, i) => (
            <div key={q.id}>
              {i > 0 && <div className="border-t border-gold/20 my-5" />}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-display italic leading-relaxed text-ink dark:text-white/85 mb-2" style={{ fontSize: 17 }}>
                    {q.embodiment_prompt}
                  </p>
                  <p className="text-xs font-body text-ink/35 dark:text-white/25">
                    <Link
                      to={`/dream/${q.id}`}
                      className="italic hover:underline transition-colors"
                      style={{ color: '#b8924a' }}
                    >
                      from {q.title || 'Untitled'} · {formatDate(q.dream_date)}
                    </Link>
                  </p>
                </div>
                <button
                  onClick={() => handleSatWith(q.id)}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-body text-ink/40 dark:text-white/30 hover:text-ink/70 dark:hover:text-white/55 border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 transition-colors whitespace-nowrap"
                >
                  <span className="text-sm leading-none">◎</span>
                  I sat with this
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Section C: Active complexes ── */}
      {activeComplexes.length > 0 && (
        <>
          <Divider />
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <SectionLabel>active complexes</SectionLabel>
              <Link to="/complexes" className="text-xs font-body text-gold/60 hover:text-gold transition-colors -mt-4">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeComplexes.map(c => {
                const cfg = STATUS_COLORS[c.integration_status] || STATUS_COLORS.active;
                return (
                  <Link
                    key={c.id}
                    to="/complexes"
                    className="rounded-xl border border-black/8 dark:border-white/8 bg-white/40 dark:bg-white/3 hover:border-black/15 dark:hover:border-white/15 hover:bg-white/60 dark:hover:bg-white/5 transition-all duration-150 px-4 py-3.5"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: cfg.dot }}
                      />
                      <p className="font-display italic text-ink dark:text-white leading-tight" style={{ fontSize: 16 }}>
                        {c.name}
                      </p>
                    </div>
                    {c.description && (
                      <p className="text-xs font-body text-ink/45 dark:text-white/35 leading-relaxed">
                        {c.description.slice(0, 80)}{c.description.length > 80 ? '…' : ''}
                      </p>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ── Section D: Shadows to watch ── */}
      {activeShadows.length > 0 && (
        <>
          <Divider />
          <div className="mb-10">
            <div className="flex items-center justify-between mb-1">
              <SectionLabel>shadows to watch</SectionLabel>
              <Link to="/shadow" className="text-xs font-body text-gold/60 hover:text-gold transition-colors -mt-4">
                View all →
              </Link>
            </div>
            <p className="text-xs font-body italic text-ink/30 dark:text-white/25 mb-4 leading-relaxed">
              Qualities currently running beneath awareness — worth noticing in daily interactions.
            </p>
            <div className="space-y-2">
              {activeShadows.map(enc => (
                <div key={enc.id} className="flex items-center gap-3">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: '#8b4a4a' }}
                  />
                  {enc.projected_quality && (
                    <span
                      className="text-[10px] font-body px-2 py-0.5 rounded-full shrink-0"
                      style={{
                        color: '#7c4a2a',
                        backgroundColor: 'rgba(124,74,42,0.12)',
                        fontFamily: 'monospace',
                        letterSpacing: '0.06em',
                      }}
                    >
                      {enc.projected_quality}
                    </span>
                  )}
                  <p className="text-sm font-body italic text-ink/50 dark:text-white/40 truncate">
                    {enc.title}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Section E: Recent waking life ── */}
      <Divider />
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <SectionLabel>recent waking life</SectionLabel>
          <Link to="/waking-life" className="text-xs font-body text-gold/60 hover:text-gold transition-colors -mt-4">
            View all →
          </Link>
        </div>
        {recentWakingLife.length === 0 ? (
          <p className="text-sm font-body text-ink/35 dark:text-white/25 leading-relaxed">
            Nothing recorded yet.{' '}
            <Link to="/waking-life" className="hover:underline" style={{ color: '#b8924a' }}>
              Waking Life
            </Link>{' '}
            is where the inner work lands in the outer world.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {recentWakingLife.map(entry => {
              const color = WAKING_COLORS[entry.entry_type] || '#7c6b5a';
              return (
                <Link
                  key={entry.id}
                  to="/waking-life"
                  className="rounded-xl border border-black/8 dark:border-white/8 bg-white/40 dark:bg-white/3 overflow-hidden hover:border-black/15 dark:hover:border-white/15 transition-all duration-150"
                >
                  {entry.media_url && entry.media_type === 'image' && (
                    <div className="w-full h-24 overflow-hidden">
                      <img
                        src={entry.media_url_signed || entry.media_url}
                        alt={entry.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="px-3 py-2.5">
                    <span
                      style={{
                        fontSize: 8,
                        letterSpacing: '0.15em',
                        color,
                        backgroundColor: color + '22',
                        padding: '1px 6px',
                        borderRadius: 99,
                        textTransform: 'uppercase',
                        fontFamily: 'monospace',
                        display: 'inline-block',
                        marginBottom: 4,
                      }}
                    >
                      {entry.entry_type}
                    </span>
                    <p className="font-display italic text-sm text-ink dark:text-white leading-snug line-clamp-2">
                      {entry.title}
                    </p>
                    <p className="font-mono text-xs text-ink/30 dark:text-white/20 mt-0.5">
                      {formatDate(entry.entry_date)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
