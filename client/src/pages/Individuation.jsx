import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { generateIndividuationNarrative, updateIndividuationNarrative, hasApiKey } from '../lib/ai';
import AiErrorMessage from '../components/AiErrorMessage';
import { format, parseISO } from 'date-fns';

const MIN_DREAMS = 10;

export default function Individuation() {
  const { user } = useAuth();

  const [dreamCount, setDreamCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState(null);

  // DB-backed narratives
  const [currentNarrative, setCurrentNarrative] = useState(null);
  const [pastNarratives, setPastNarratives] = useState([]);

  // UI state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showRegenWarning, setShowRegenWarning] = useState(false);
  const [showUpdateWarning, setShowUpdateWarning] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [{ count }, { data: narratives }] = await Promise.all([
      supabase
        .from('dreams')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),
      supabase
        .from('individuation_narratives')
        .select('*')
        .eq('user_id', user.id)
        .order('generated_at', { ascending: false }),
    ]);

    setDreamCount(count || 0);
    if (narratives?.length) {
      const current = narratives.find(n => n.is_current) || narratives[0];
      const past = narratives.filter(n => n.id !== current.id);
      setCurrentNarrative(current);
      setPastNarratives(past);
    }
    setLoading(false);
  }

  // Save a new narrative as current, archiving the old one
  async function saveNarrative(text, dreamCountNow, lastDreamId) {
    // Archive current
    if (currentNarrative) {
      await supabase
        .from('individuation_narratives')
        .update({ is_current: false })
        .eq('id', currentNarrative.id);
    }

    const { data, error } = await supabase
      .from('individuation_narratives')
      .insert({
        user_id: user.id,
        narrative: text,
        dream_count: dreamCountNow,
        last_dream_id: lastDreamId,
        is_current: true,
      })
      .select()
      .single();

    if (error) throw error;

    if (currentNarrative) {
      setPastNarratives(prev => [{ ...currentNarrative, is_current: false }, ...prev]);
    }
    setCurrentNarrative(data);
  }

  async function handleUpdate() {
    setShowUpdateWarning(false);
    setGenerating(true);
    setAiError(null);

    try {
      // Fetch new dreams since last_dream_id
      let newDreams = [];
      if (currentNarrative?.last_dream_id) {
        const { data: anchor } = await supabase
          .from('dreams')
          .select('created_at')
          .eq('id', currentNarrative.last_dream_id)
          .single();

        if (anchor) {
          const { data } = await supabase
            .from('dreams')
            .select('dream_date, title, summary, body, archetypes, symbols, mood, is_big_dream, id')
            .eq('user_id', user.id)
            .gt('created_at', anchor.created_at)
            .order('dream_date', { ascending: true });
          newDreams = data || [];
        }
      }

      if (!newDreams.length) {
        // No truly new dreams — fall back to full regen
        await handleGenerateFull();
        return;
      }

      const text = await updateIndividuationNarrative({
        previousNarrative: currentNarrative.narrative,
        newDreams,
      });

      const lastDream = newDreams[newDreams.length - 1];
      await saveNarrative(text, dreamCount, lastDream.id);
    } catch (err) {
      setAiError(err);
    } finally {
      setGenerating(false);
    }
  }

  async function handleGenerateFull() {
    setShowRegenWarning(false);
    setShowAdvanced(false);
    setGenerating(true);
    setAiError(null);

    try {
      const { data: dreams, error: dbErr } = await supabase
        .from('dreams')
        .select('dream_date, title, summary, body, archetypes, symbols, mood, is_big_dream, id')
        .eq('user_id', user.id)
        .order('dream_date', { ascending: true });

      if (dbErr || !dreams?.length) {
        setAiError({ message: 'Could not load your dreams. Please try again.' });
        return;
      }

      const text = await generateIndividuationNarrative({ dreams });
      const lastDream = dreams[dreams.length - 1];
      await saveNarrative(text, dreams.length, lastDream.id);
    } catch (err) {
      setAiError(err);
    } finally {
      setGenerating(false);
    }
  }

  const canGenerate = dreamCount !== null && dreamCount >= MIN_DREAMS;
  const newDreamCount = currentNarrative
    ? Math.max(0, dreamCount - (currentNarrative.dream_count || 0))
    : 0;
  const hasNew = newDreamCount > 0;

  return (
    <div className="max-w-2xl mx-auto px-8 py-10">
      <h1 className="font-display italic text-4xl text-ink dark:text-white mb-2">
        Individuation Journey
      </h1>
      <p className="text-sm font-body text-ink/50 dark:text-white/40 mb-10">
        A Jungian analyst's perspective on your inner work, drawn from your full dream record.
      </p>

      {!hasApiKey() && (
        <div className="mb-8 flex items-start justify-between gap-4 px-5 py-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <p className="text-sm font-body text-amber-800 dark:text-amber-300">
            An Anthropic API key is required to generate your narrative.
          </p>
          <Link to="/settings" className="shrink-0 text-sm font-body font-medium text-amber-800 dark:text-amber-300 underline">
            Settings →
          </Link>
        </div>
      )}

      {aiError && <div className="mb-6"><AiErrorMessage error={aiError} /></div>}

      {/* Not enough dreams */}
      {!loading && !canGenerate && (
        <div className="mb-8 px-6 py-5 rounded-2xl border border-black/10 dark:border-white/10 bg-white/40 dark:bg-white/5">
          <p className="font-display italic text-xl text-ink/60 dark:text-white/50 mb-2">
            Still gathering the threads…
          </p>
          <p className="text-sm font-body text-ink/50 dark:text-white/40 leading-relaxed">
            This feature comes alive with at least {MIN_DREAMS} recorded dreams.
            You have <strong>{dreamCount}</strong> so far — keep recording, and your individuation
            narrative will emerge.
          </p>
        </div>
      )}

      {/* Generating state */}
      {generating && (
        <div className="text-center py-16">
          <p className="font-display italic text-xl text-ink/40 dark:text-white/40 mb-2">
            Reading the threads of your inner life…
          </p>
          <p className="text-xs font-body text-ink/30 dark:text-white/25">
            This may take a moment — Opus is reading your dream archive.
          </p>
        </div>
      )}

      {/* Current narrative */}
      {!generating && currentNarrative && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-body text-ink/30 dark:text-white/25 uppercase tracking-widest">
              Generated {format(parseISO(currentNarrative.generated_at), "MMMM d, yyyy")}
              {currentNarrative.dream_count != null && (
                <span className="ml-2">· {currentNarrative.dream_count} dreams</span>
              )}
            </p>
          </div>

          {/* New dreams banner */}
          {hasNew && canGenerate && !showUpdateWarning && (
            <div className="mb-6 flex items-center justify-between gap-4 px-5 py-3.5 rounded-xl bg-plum/5 border border-plum/20 dark:border-white/15">
              <p className="text-sm font-body text-ink/70 dark:text-white/60">
                <strong>{newDreamCount}</strong> new dream{newDreamCount !== 1 ? 's' : ''} since last narrative
              </p>
              <button
                onClick={() => setShowUpdateWarning(true)}
                disabled={!hasApiKey()}
                className="shrink-0 text-sm font-body font-medium text-plum dark:text-gold hover:opacity-70 disabled:opacity-40 transition-opacity"
              >
                Update narrative →
              </button>
            </div>
          )}

          {/* Update cost warning */}
          {showUpdateWarning && (
            <div className="mb-6 p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 space-y-3">
              <p className="text-sm font-body text-amber-800 dark:text-amber-300 leading-relaxed">
                <strong>This uses Claude Opus</strong> and will consume API credits to process
                your {newDreamCount} new dream{newDreamCount !== 1 ? 's' : ''}.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleUpdate}
                  className="px-5 py-2.5 rounded-xl font-body text-sm font-medium text-white"
                  style={{ backgroundColor: '#3d2b4a' }}
                >
                  Proceed
                </button>
                <button
                  onClick={() => setShowUpdateWarning(false)}
                  className="px-5 py-2.5 rounded-xl font-body text-sm border border-black/15 dark:border-white/15 text-ink/60 dark:text-white/50 hover:bg-black/5 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="pl-5 border-l-2 border-gold/30">
            <p className="font-dream whitespace-pre-wrap text-ink dark:text-white/90 leading-[1.85] text-[16px]">
              {currentNarrative.narrative}
            </p>
          </div>
        </div>
      )}

      {/* First generate (no existing narrative) */}
      {!generating && !currentNarrative && canGenerate && (
        <div className="mb-8">
          {!showRegenWarning ? (
            <button
              onClick={() => setShowRegenWarning(true)}
              disabled={!hasApiKey()}
              className="px-6 py-3 rounded-xl font-body text-sm font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: '#3d2b4a' }}
            >
              Generate Narrative
            </button>
          ) : (
            <RegenWarning dreamCount={dreamCount} onProceed={handleGenerateFull} onCancel={() => setShowRegenWarning(false)} />
          )}
        </div>
      )}

      {/* Advanced — full regenerate */}
      {!generating && currentNarrative && canGenerate && (
        <div className="mt-6">
          <button
            onClick={() => setShowAdvanced(v => !v)}
            className="text-xs font-body text-ink/30 dark:text-white/25 hover:text-ink/60 dark:hover:text-white/40 transition-colors"
          >
            {showAdvanced ? '▲ Hide advanced' : '▼ Advanced'}
          </button>
          {showAdvanced && (
            <div className="mt-4">
              {!showRegenWarning ? (
                <button
                  onClick={() => setShowRegenWarning(true)}
                  disabled={!hasApiKey()}
                  className="text-sm font-body text-ink/50 dark:text-white/40 hover:text-ink/80 dark:hover:text-white/70 disabled:opacity-40 underline transition-colors"
                >
                  Regenerate full narrative from all {dreamCount} dreams
                </button>
              ) : (
                <RegenWarning dreamCount={dreamCount} onProceed={handleGenerateFull} onCancel={() => setShowRegenWarning(false)} />
              )}
            </div>
          )}
        </div>
      )}

      {/* Previous narratives history */}
      {pastNarratives.length > 0 && (
        <div className="mt-14">
          <h2 className="text-xs uppercase tracking-widest font-body text-ink/40 dark:text-white/30 mb-4">
            Previous Narratives
          </h2>
          <div className="space-y-3">
            {pastNarratives.map(n => (
              <PastNarrativeEntry key={n.id} narrative={n} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RegenWarning({ dreamCount, onProceed, onCancel }) {
  return (
    <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 space-y-3">
      <p className="text-sm font-body text-amber-800 dark:text-amber-300 leading-relaxed">
        <strong>This uses Claude Opus</strong> and will consume significant API credits —
        it reads your entire dream archive ({dreamCount} dreams). Best used when significant
        new material has accumulated, not more than once a month.
      </p>
      <div className="flex gap-3">
        <button
          onClick={onProceed}
          className="px-5 py-2.5 rounded-xl font-body text-sm font-medium text-white"
          style={{ backgroundColor: '#3d2b4a' }}
        >
          Proceed
        </button>
        <button
          onClick={onCancel}
          className="px-5 py-2.5 rounded-xl font-body text-sm border border-black/15 dark:border-white/15 text-ink/60 dark:text-white/50 hover:bg-black/5 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function PastNarrativeEntry({ narrative }) {
  const [expanded, setExpanded] = useState(false);
  const date = format(parseISO(narrative.generated_at), 'MMMM d, yyyy');

  return (
    <div className="rounded-xl border border-black/8 dark:border-white/8 bg-white/40 dark:bg-white/5">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full text-left px-5 py-4 flex items-start justify-between gap-4"
      >
        <div>
          <p className="text-xs font-body text-ink/30 dark:text-white/25 mb-1">{date}</p>
          {narrative.dream_count != null && (
            <p className="text-xs font-body text-ink/30 dark:text-white/20">{narrative.dream_count} dreams</p>
          )}
        </div>
        <span className="text-ink/30 dark:text-white/20 text-xs mt-1 shrink-0">
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-black/5 dark:border-white/5 pt-4">
          <p className="font-dream whitespace-pre-wrap text-ink/80 dark:text-white/70 text-[15px] leading-relaxed">
            {narrative.narrative}
          </p>
        </div>
      )}
    </div>
  );
}
