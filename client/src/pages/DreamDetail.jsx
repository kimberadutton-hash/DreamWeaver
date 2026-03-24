import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { analyzeDream } from '../lib/ai';
import { usePrivacySettings } from '../hooks/usePrivacySettings';
import AiErrorMessage from '../components/AiErrorMessage';
import { format, parseISO } from 'date-fns';

export default function DreamDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { privacySettings } = usePrivacySettings();

  const [dream, setDream] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiError, setAiError] = useState(null);

  useEffect(() => {
    fetchDream();
  }, [id]);

  async function fetchDream() {
    const { data, error } = await supabase
      .from('dreams')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !data) navigate('/archive');
    else setDream(data);
    setLoading(false);
  }

  async function handleDelete() {
    if (!confirm('Delete this dream permanently?')) return;
    setDeleting(true);
    await supabase.from('dreams').delete().eq('id', id);
    navigate('/archive');
  }

  async function handleAnalyzeNow() {
    setAnalyzing(true);
    setAiError(null);
    try {
      const data = await analyzeDream({
        title: dream.title,
        body: dream.body,
        mood: dream.mood,
        privacySettings,
        notes: dream.notes,
        analyst_session: dream.analyst_session,
      });

      const { data: updated, error: dbErr } = await supabase
        .from('dreams')
        .update({
          title: data.title || dream.title,
          reflection: data.reflection,
          archetypes: data.archetypes,
          symbols: data.symbols,
          tags: data.tags,
          invitation: data.invitation,
          has_analysis: true,
        })
        .eq('id', id)
        .select()
        .single();

      if (dbErr) throw dbErr;
      setDream(updated);
    } catch (err) {
      setAiError(err);
    } finally {
      setAnalyzing(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  function handleEmailAnalyst() {
    if (!profile?.analyst_email) {
      alert('Add your analyst\'s email in Settings first.');
      return;
    }
    const subject = encodeURIComponent(`Dream: ${dream.title || 'Untitled'}`);
    const body = encodeURIComponent(
      `Date: ${dream.dream_date}\n\nDream:\n${dream.body}\n\n` +
      (dream.analyst_session ? `Session Notes:\n${dream.analyst_session}` : '')
    );
    window.open(`mailto:${profile.analyst_email}?subject=${subject}&body=${body}`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="font-display italic text-xl text-ink/40">Loading…</p>
      </div>
    );
  }

  if (!dream) return null;

  const date = dream.dream_date ? format(parseISO(dream.dream_date), 'EEEE, MMMM d, yyyy') : '';
  const analystLabel = profile?.analyst_name || 'Analyst';

  return (
    <div className="max-w-2xl mx-auto px-8 py-10">
      {/* Back + actions */}
      <div className="flex items-center justify-between mb-8">
        <Link to="/archive" className="text-sm font-body text-ink/40 hover:text-ink dark:text-white/40 dark:hover:text-white transition-colors">
          ← Archive
        </Link>
        <div className="flex gap-3">
          {!dream.has_analysis && (
            <button
              onClick={handleAnalyzeNow}
              disabled={analyzing}
              className="text-sm font-body text-gold hover:text-gold-dark transition-colors disabled:opacity-50"
            >
              {analyzing ? 'Analyzing…' : '✦ Analyze'}
            </button>
          )}
          <Link to={`/dream/${id}/edit`} className="text-sm font-body text-ink/50 hover:text-ink dark:text-white/40 dark:hover:text-white transition-colors">
            Edit
          </Link>
          <button onClick={handlePrint} className="text-sm font-body text-ink/50 hover:text-ink dark:text-white/40 dark:hover:text-white transition-colors">
            Print
          </button>
          <button onClick={handleEmailAnalyst} className="text-sm font-body text-ink/50 hover:text-ink dark:text-white/40 dark:hover:text-white transition-colors">
            Email {analystLabel}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-sm font-body text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>

      {aiError && <div className="mb-4"><AiErrorMessage error={aiError} /></div>}

      {/* Header */}
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-ink/40 dark:text-white/40 font-body mb-2">{date}</p>
        <h1 className="font-display italic text-4xl text-ink dark:text-white leading-tight">
          {dream.title || 'Untitled Dream'}
        </h1>
        {dream.mood && (
          <div className="flex flex-wrap gap-2 mt-3">
            {dream.mood.split(', ').filter(Boolean).map(m => (
              <span key={m} className="px-3 py-1 rounded-full text-xs font-body bg-plum/10 text-plum dark:bg-white/10 dark:text-white/60">
                {m}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Dream body */}
      <Section title="The Dream">
        <p className="dream-body whitespace-pre-wrap">{dream.body}</p>
      </Section>

      {/* Tags / symbols */}
      {(dream.tags?.length > 0 || dream.archetypes?.length > 0 || dream.symbols?.length > 0) && (
        <div className="mb-8 space-y-3">
          {dream.tags?.length > 0 && (
            <TagRow label="Tags" tags={dream.tags} color="bg-plum/8 text-plum/70 dark:bg-white/10 dark:text-white/50" />
          )}
          {dream.archetypes?.length > 0 && (
            <TagRow label="Archetypes" tags={dream.archetypes} color="bg-gold/10 text-gold-dark dark:bg-gold/15 dark:text-gold" />
          )}
          {dream.symbols?.length > 0 && (
            <TagRow label="Symbols" tags={dream.symbols} color="bg-ink/5 text-ink/60 dark:bg-white/5 dark:text-white/40" />
          )}
        </div>
      )}

      {/* My Notes */}
      {dream.notes && (
        <Section
          title="My Notes"
          badge={privacySettings.share_notes_with_ai
            ? <span className="text-amber-500 normal-case tracking-normal text-xs font-normal">◈ shared with AI</span>
            : <span className="text-ink/30 dark:text-white/30 normal-case tracking-normal text-xs font-normal">◎ private</span>
          }
        >
          <p className="text-sm font-body text-ink/70 dark:text-white/60 leading-relaxed whitespace-pre-wrap">
            {dream.notes}
          </p>
        </Section>
      )}

      {/* Jungian Reflection */}
      {dream.reflection && (
        <Section title="Jungian Reflection" accent>
          <p className="font-dream whitespace-pre-wrap text-ink dark:text-white/90">
            {dream.reflection}
          </p>
          {dream.invitation && (
            <p className="mt-4 font-display italic text-lg text-gold-dark dark:text-gold">
              {dream.invitation}
            </p>
          )}
        </Section>
      )}

      {/* Analyst Session */}
      {dream.analyst_session && (
        <Section
          title={`${analystLabel} Session`}
          badge={privacySettings.share_analyst_session_with_ai
            ? <span className="text-amber-500 normal-case tracking-normal text-xs font-normal">◈ shared with AI</span>
            : <span className="text-ink/30 dark:text-white/30 normal-case tracking-normal text-xs font-normal">◎ private</span>
          }
        >
          <p className="text-sm font-body text-ink/70 dark:text-white/60 leading-relaxed whitespace-pre-wrap">
            {dream.analyst_session}
          </p>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children, accent, badge }) {
  return (
    <div className={`mb-8 ${accent ? 'pl-5 border-l-2 border-gold/40' : ''}`}>
      <h2 className="text-xs uppercase tracking-widest font-body text-ink/40 dark:text-white/30 mb-3 flex items-center gap-2">
        {title}
        {badge}
      </h2>
      {children}
    </div>
  );
}

function TagRow({ label, tags, color }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-body text-ink/30 dark:text-white/20 w-20 shrink-0">{label}</span>
      {tags.map(tag => (
        <span key={tag} className={`px-2.5 py-0.5 rounded-full text-xs font-body ${color}`}>
          {tag}
        </span>
      ))}
    </div>
  );
}
