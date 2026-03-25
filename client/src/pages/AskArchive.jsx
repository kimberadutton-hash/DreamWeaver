import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { askArchive, hasApiKey, AiError } from '../lib/ai';
import { usePrivacySettings } from '../hooks/usePrivacySettings';
import AiErrorMessage from '../components/AiErrorMessage';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';

const EXAMPLE_QUESTIONS = [
  'What recurring symbols appear across my dreams?',
  'How has my relationship to water evolved in my dreams?',
  'Which Jungian archetypes appear most frequently?',
  'What do my dreams suggest about my current emotional state?',
  'Are there any transformation themes in my recent dreams?',
];

export default function AskArchive() {
  const { user } = useAuth();
  const { privacySettings } = usePrivacySettings();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [askedQuestion, setAskedQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState(null); // id of just-saved entry

  const [saved, setSaved] = useState([]); // previously saved Q&As
  const [loadingSaved, setLoadingSaved] = useState(true);

  useEffect(() => {
    fetchSaved();
  }, []);

  async function fetchSaved() {
    const { data } = await supabase
      .from('archive_queries')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setSaved(data || []);
    setLoadingSaved(false);
  }

  async function handleAsk(q) {
    const query = q || question;
    if (!query.trim()) return;

    setLoading(true);
    setAnswer('');
    setAskedQuestion(query);
    setAiError(null);
    setSavedId(null);

    const { data: dreams, error: dbErr } = await supabase
      .from('dreams')
      .select('dream_date, title, body, summary, tags, archetypes, symbols, mood, notes, analyst_session')
      .eq('user_id', user.id)
      .order('dream_date', { ascending: false })
      .limit(50);

    if (dbErr || !dreams?.length) {
      setAiError(new AiError('No dreams found to query. Record some dreams first.', 'api_error'));
      setLoading(false);
      return;
    }

    try {
      const text = await askArchive({ question: query, dreams, privacySettings });
      setAnswer(text);
    } catch (err) {
      setAiError(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    const { data, error } = await supabase
      .from('archive_queries')
      .insert({ user_id: user.id, question: askedQuestion, answer })
      .select()
      .single();

    if (!error && data) {
      setSavedId(data.id);
      setSaved(prev => [data, ...prev]);
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    await supabase.from('archive_queries').delete().eq('id', id);
    setSaved(prev => prev.filter(q => q.id !== id));
  }

  function handleReset() {
    setAnswer('');
    setQuestion('');
    setAskedQuestion('');
    setAiError(null);
    setSavedId(null);
  }

  return (
    <div className="max-w-2xl mx-auto px-8 py-10">
      <h1 className="font-display italic text-4xl text-ink dark:text-white mb-2">
        Ask Your Archive
      </h1>
      <p className="text-sm font-body text-ink/50 dark:text-white/40 mb-8">
        Ask anything about the patterns, symbols, and themes across all your dreams.
      </p>

      {!hasApiKey() && (
        <div className="mb-6 flex items-start justify-between gap-4 px-5 py-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <p className="text-sm font-body text-amber-800 dark:text-amber-300">
            An Anthropic API key is required to query your archive.
          </p>
          <Link to="/settings" className="shrink-0 text-sm font-body font-medium text-amber-800 dark:text-amber-300 underline">
            Settings →
          </Link>
        </div>
      )}

      {/* Input */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAsk()}
          placeholder="What patterns do you notice in my dreams?"
          className="flex-1 field-input"
        />
        <button
          onClick={() => handleAsk()}
          disabled={loading || !question.trim()}
          className="px-5 py-3 rounded-xl text-sm font-body font-medium text-white disabled:opacity-50 transition-opacity"
          style={{ backgroundColor: '#3d2b4a' }}
        >
          {loading ? '…' : 'Ask'}
        </button>
      </div>

      {/* Example questions */}
      {!answer && !loading && (
        <div className="mb-10">
          <p className="text-xs uppercase tracking-widest text-ink/30 dark:text-white/30 font-body mb-3">
            Example questions
          </p>
          <div className="space-y-2">
            {EXAMPLE_QUESTIONS.map(q => (
              <button
                key={q}
                onClick={() => { setQuestion(q); handleAsk(q); }}
                className="block w-full text-left px-4 py-3 rounded-xl text-sm font-body text-ink/60 dark:text-white/50 bg-white/40 dark:bg-white/5 border border-black/5 dark:border-white/5 hover:bg-white/70 dark:hover:bg-white/10 hover:text-plum dark:hover:text-gold transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center py-12">
          <p className="font-display italic text-xl text-ink/40 dark:text-white/40">Consulting the archive…</p>
        </div>
      )}

      {aiError && <AiErrorMessage error={aiError} />}

      {/* Answer */}
      {answer && (
        <div className="mt-2 p-6 rounded-2xl bg-white/60 dark:bg-white/5 border border-black/8 dark:border-white/8">
          <p className="text-xs uppercase tracking-widest text-ink/30 dark:text-white/30 font-body mb-1">
            {askedQuestion}
          </p>
          <p className="font-dream whitespace-pre-wrap text-ink dark:text-white/90 mt-3">
            {answer}
          </p>

          {/* Save / reset actions */}
          <div className="flex items-center justify-between mt-5 pt-4 border-t border-black/8 dark:border-white/8">
            {savedId ? (
              <span className="text-sm font-body text-green-700 dark:text-green-400">
                ✓ Saved to your archive
              </span>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving}
                className="text-sm font-body font-medium text-plum dark:text-gold hover:opacity-70 disabled:opacity-40 transition-opacity"
              >
                {saving ? 'Saving…' : '+ Save this response'}
              </button>
            )}
            <button
              onClick={handleReset}
              className="text-xs font-body text-ink/30 dark:text-white/30 hover:text-ink dark:hover:text-white transition-colors"
            >
              Ask another question
            </button>
          </div>
        </div>
      )}

      {/* Saved Q&As */}
      {!loadingSaved && saved.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xs uppercase tracking-widest font-body text-ink/40 dark:text-white/30 mb-4">
            Saved Insights
          </h2>
          <div className="space-y-4">
            {saved.map(entry => (
              <SavedEntry
                key={entry.id}
                entry={entry}
                onDelete={() => handleDelete(entry.id)}
                highlight={entry.id === savedId}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SavedEntry({ entry, onDelete, highlight }) {
  const [expanded, setExpanded] = useState(highlight);
  const date = format(parseISO(entry.created_at), 'MMMM d, yyyy');

  return (
    <div className={`rounded-xl border transition-colors ${
      highlight
        ? 'border-gold/40 bg-gold/5'
        : 'border-black/8 dark:border-white/8 bg-white/40 dark:bg-white/5'
    }`}>
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full text-left px-5 py-4 flex items-start justify-between gap-4"
      >
        <div>
          <p className="text-xs font-body text-ink/30 dark:text-white/25 mb-1">{date}</p>
          <p className="text-sm font-body text-ink/80 dark:text-white/70 leading-snug">
            {entry.question}
          </p>
        </div>
        <span className="text-ink/30 dark:text-white/20 text-xs mt-1 shrink-0">
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {expanded && (
        <div className="px-5 pb-5">
          <p className="font-dream whitespace-pre-wrap text-ink dark:text-white/85 text-[15px] leading-relaxed border-t border-black/8 dark:border-white/8 pt-4">
            {entry.answer}
          </p>
          <button
            onClick={onDelete}
            className="mt-4 text-xs font-body text-red-400 hover:text-red-600 transition-colors"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
