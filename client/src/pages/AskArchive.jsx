import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApiKey } from '../hooks/useApiKey';
import { supabase } from '../lib/supabase';
import { askArchive } from '../lib/ai';
import AiErrorMessage from '../components/AiErrorMessage';
import PracticeOrientation from '../components/PracticeOrientation';

// ─── helpers ────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatScopeMonth(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function parseScopeBadgeText(queryScope) {
  if (!queryScope || queryScope === 'all') return null;
  if (queryScope === 'last_15') return 'Last 15 dreams';
  if (queryScope === 'last_30') return 'Last 30 dreams';
  if (queryScope.startsWith('custom:')) {
    const parts = queryScope.split(':');
    const from = parts[1] || '';
    const to = parts[2] || '';
    const fmtFrom = from ? formatScopeMonth(from) : null;
    const fmtTo = to ? formatScopeMonth(to) : null;
    if (fmtFrom && fmtTo) return `${fmtFrom} – ${fmtTo}`;
    if (fmtFrom) return `From ${fmtFrom}`;
    if (fmtTo) return `Through ${fmtTo}`;
  }
  return null;
}

function filterDreamsByScope(dreams, scope, customFrom, customTo) {
  let filtered;
  const desc = [...dreams].sort((a, b) => (a.dream_date < b.dream_date ? 1 : -1));

  if (scope === 'last_15') {
    filtered = desc.slice(0, 15);
  } else if (scope === 'last_30') {
    filtered = desc.slice(0, 30);
  } else if (scope === 'custom') {
    filtered = dreams.filter((d) => {
      if (customFrom && d.dream_date < customFrom) return false;
      if (customTo && d.dream_date > customTo) return false;
      return true;
    });
  } else {
    filtered = [...dreams];
  }

  return filtered.sort((a, b) => (a.dream_date < b.dream_date ? -1 : 1));
}

// ─── ScopeFilterBar ──────────────────────────────────────────────────────────

const SCOPE_OPTIONS = [
  { value: 'all', label: 'All dreams' },
  { value: 'last_15', label: 'Last 15' },
  { value: 'last_30', label: 'Last 30' },
  { value: 'custom', label: 'Date range' },
];

function ScopeFilterBar({ scope, setScope, customFrom, setCustomFrom, customTo, setCustomTo, showCustomRange }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1 bg-parchment/80 border border-gold/20 rounded-full p-1 w-fit">
        {SCOPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setScope(opt.value)}
            className={`px-3 py-1 rounded-full text-xs font-sans transition-all ${
              scope === opt.value
                ? 'bg-plum text-parchment shadow-sm'
                : 'text-ink/50 hover:text-plum'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {showCustomRange && (
        <div className="flex items-center gap-3 pl-1">
          <label className="text-xs font-sans text-ink/50 w-8">From</label>
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="rounded-lg border border-gold/20 bg-white/60 px-3 py-1.5
                       text-sm text-ink font-sans
                       focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20
                       transition-colors"
          />
          <label className="text-xs font-sans text-ink/50 w-4">To</label>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="rounded-lg border border-gold/20 bg-white/60 px-3 py-1.5
                       text-sm text-ink font-sans
                       focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20
                       transition-colors"
          />
        </div>
      )}
    </div>
  );
}

// ─── MarkdownText ─────────────────────────────────────────────────────────────

function MarkdownText({ content, className = '' }) {
  const paragraphs = content.split(/\n\n+/);
  return (
    <div className={className}>
      {paragraphs.map((para, i) => {
        const parts = para.split(/\*\*(.*?)\*\*/g);
        const rendered = parts.map((part, j) =>
          j % 2 === 1 ? <strong key={j}>{part}</strong> : part
        );
        return (
          <p key={i} className={i > 0 ? 'mt-3' : ''}>
            {rendered}
          </p>
        );
      })}
    </div>
  );
}

// ─── MessageBubble ───────────────────────────────────────────────────────────

function MessageBubble({ role, content, timestamp }) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[85%] rounded-2xl px-5 py-4 ${
          isUser
            ? 'bg-plum text-parchment rounded-tr-sm'
            : 'bg-parchment border border-gold/20 text-ink rounded-tl-sm'
        }`}
      >
        {!isUser && (
          <p className="text-[10px] uppercase tracking-widest text-gold mb-2 font-mono">
            The Archive
          </p>
        )}
        {isUser ? (
          <p className="text-sm leading-relaxed font-sans">{content}</p>
        ) : (
          <MarkdownText
            content={content}
            className="text-sm leading-relaxed font-serif italic"
          />
        )}
        {timestamp && (
          <p
            className={`text-[10px] mt-2 font-mono ${
              isUser ? 'text-parchment/50 text-right' : 'text-ink/40'
            }`}
          >
            {formatDate(timestamp)}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── ArchiveThread ───────────────────────────────────────────────────────────

function ArchiveThread({ queryRecord, dreams, apiKey, onThreadUpdated, userId }) {
  const messages = queryRecord.messages || [];
  const [followUp, setFollowUp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  async function handleFollowUp(e) {
    e.preventDefault();
    const q = followUp.trim();
    if (!q || loading) return;

    setError(null);
    setLoading(true);
    setFollowUp('');

    const userMsg = { role: 'user', content: q, timestamp: new Date().toISOString() };
    const optimisticMessages = [...messages, userMsg];

    const { error: optimisticError } = await supabase
      .from('archive_queries')
      .update({ messages: optimisticMessages })
      .eq('id', queryRecord.id)
      .eq('user_id', userId);

    if (optimisticError) {
      setError(optimisticError);
      onThreadUpdated(queryRecord.id, messages);
      setLoading(false);
      return;
    }
    onThreadUpdated(queryRecord.id, optimisticMessages);

    const qs = queryRecord.query_scope || 'all';
    let threadScope = qs, threadFrom = '', threadTo = '';
    if (qs.startsWith('custom:')) {
      const parts = qs.split(':');
      threadScope = 'custom';
      threadFrom = parts[1] || '';
      threadTo = parts[2] || '';
    }
    const scopedDreams = filterDreamsByScope(dreams, threadScope, threadFrom, threadTo);

    let answer;
    try {
      answer = await askArchive(q, scopedDreams, apiKey, optimisticMessages.slice(0, -1));
    } catch (err) {
      setError(err);
      await supabase
        .from('archive_queries')
        .update({ messages })
        .eq('id', queryRecord.id)
        .eq('user_id', userId);
      onThreadUpdated(queryRecord.id, messages);
      setLoading(false);
      return;
    }

    const assistantMsg = {
      role: 'assistant',
      content: answer,
      timestamp: new Date().toISOString(),
    };
    const finalMessages = [...optimisticMessages, assistantMsg];
    onThreadUpdated(queryRecord.id, finalMessages);

    const { error: dbError } = await supabase
      .from('archive_queries')
      .update({ messages: finalMessages })
      .eq('id', queryRecord.id)
      .eq('user_id', userId);

    if (dbError) {
      setError(dbError);
      // UI already shows the response — don't roll back
    }

    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  return (
    <div className="mt-2">
      {/* Message thread */}
      <div className="mb-4 max-h-[600px] overflow-y-auto pr-1">
        {messages.length === 0 && (
          <p className="text-sm font-serif italic text-ink/40 mb-4 py-2">
            Ask a follow-up below to continue this conversation.
          </p>
        )}
        {messages.map((msg, i) => (
          <MessageBubble key={i} {...msg} />
        ))}
        {loading && (
          <div className="flex justify-start mb-4">
            <div className="bg-parchment border border-gold/20 rounded-2xl rounded-tl-sm px-5 py-4">
              <p className="text-[10px] uppercase tracking-widest text-gold mb-2 font-mono">
                The Archive
              </p>
              <div className="flex gap-1 items-center h-5">
                <span className="w-1.5 h-1.5 bg-gold/60 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-gold/60 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-gold/60 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="mb-4">
          <AiErrorMessage error={error} />
        </div>
      )}

      {/* Follow-up input — always visible */}
      <form onSubmit={handleFollowUp} className="flex gap-2 items-end">
        <textarea
          ref={inputRef}
          value={followUp}
          onChange={(e) => setFollowUp(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleFollowUp(e);
            }
          }}
          placeholder="Continue the conversation…"
          rows={2}
          disabled={loading}
          className="flex-1 resize-none rounded-xl border border-gold/20 bg-white/60 px-4 py-3
                     text-sm text-ink font-sans placeholder:text-ink/30
                     focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20
                     disabled:opacity-50 transition-colors"
        />
        <button
          type="submit"
          disabled={!followUp.trim() || loading}
          className="self-end px-5 py-3 rounded-xl bg-gold text-white text-sm font-sans
                     hover:bg-gold/90 active:scale-95 transition-all
                     disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {loading ? 'Asking…' : 'Ask'}
        </button>
      </form>
      <p className="text-[11px] text-ink/30 font-mono mt-2 ml-1">
        ↵ to send · shift+↵ for new line
      </p>
    </div>
  );
}

// ─── QueryCard ───────────────────────────────────────────────────────────────

function QueryCard({ queryRecord, dreams, apiKey, onThreadUpdated, defaultOpen, userId }) {
  const [open, setOpen] = useState(defaultOpen || false);
  const messages = queryRecord.messages || [];
  const exchangeCount = Math.floor(messages.length / 2);
  const scopeBadgeText = parseScopeBadgeText(queryRecord.query_scope);

  return (
    <div className="bg-white/70 rounded-2xl border border-gold/15 overflow-hidden">
      {/* Collapsed header — always visible, click to expand */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-6 py-5 flex items-start justify-between gap-4 group"
      >
        <div className="flex-1 min-w-0">
          <p className="font-serif italic text-ink text-base leading-snug line-clamp-2 group-hover:text-plum transition-colors">
            {queryRecord.question}
          </p>
          {scopeBadgeText && (
            <p className="text-[11px] font-sans italic text-gold/70 mt-1">
              {scopeBadgeText}
            </p>
          )}
          <div className="flex items-center gap-3 mt-2">
            <span className="text-[11px] font-mono text-ink/40">
              {formatDate(queryRecord.created_at)}
            </span>
            {exchangeCount > 1 && (
              <span className="text-[11px] font-mono text-gold/70">
                {exchangeCount} exchanges
              </span>
            )}
          </div>
        </div>
        <span
          className={`text-gold/50 mt-1 transition-transform duration-200 select-none text-lg ${
            open ? 'rotate-180' : ''
          }`}
        >
          ▾
        </span>
      </button>

      {/* Expanded: full thread + follow-up input */}
      {open && (
        <div className="px-6 pb-6 border-t border-gold/10">
          <ArchiveThread
            queryRecord={queryRecord}
            dreams={dreams}
            apiKey={apiKey}
            onThreadUpdated={onThreadUpdated}
            userId={userId}
          />
        </div>
      )}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function AskArchive() {
  const { user } = useAuth();
  const { apiKey } = useApiKey();

  const [dreams, setDreams] = useState([]);
  const [queries, setQueries] = useState([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingQueries, setLoadingQueries] = useState(true);
  const [error, setError] = useState(null);
  const [newestId, setNewestId] = useState(null);

  const [scope, setScope] = useState('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showCustomRange, setShowCustomRange] = useState(false);

  function handleScopeChange(value) {
    setScope(value);
    setShowCustomRange(value === 'custom');
  }

  useEffect(() => {
    if (!user) return;
    supabase
      .from('dreams')
      .select('id, title, body, dream_date, archetypes, symbols, tags, reflection')
      .eq('user_id', user.id)
      .order('dream_date', { ascending: true })
      .then(({ data }) => setDreams(data || []));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setLoadingQueries(true);
    supabase
      .from('archive_queries')
      .select('id, question, answer, messages, query_scope, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const normalized = (data || []).map((q) => ({
          ...q,
          messages: q.messages || [],
        }));
        setQueries(normalized);
        setLoadingQueries(false);
      });
  }, [user]);

  function handleThreadUpdated(queryId, newMessages) {
    setQueries((prev) =>
      prev.map((q) => (q.id === queryId ? { ...q, messages: newMessages } : q))
    );
  }

  async function handleAsk(e) {
    e.preventDefault();
    const q = question.trim();
    if (!q || loading || !apiKey) return;

    setError(null);
    setLoading(true);
    setQuestion('');

    const filteredDreams = filterDreamsByScope(dreams, scope, customFrom, customTo);

    let queryScopeStr = scope;
    if (scope === 'custom') {
      queryScopeStr = `custom:${customFrom || ''}:${customTo || ''}`;
    }

    try {
      const answer = await askArchive(q, filteredDreams, apiKey, []);
      const now = new Date().toISOString();
      const initialMessages = [
        { role: 'user', content: q, timestamp: now },
        { role: 'assistant', content: answer, timestamp: now },
      ];

      const { data, error: dbError } = await supabase
        .from('archive_queries')
        .insert({
          user_id: user.id,
          question: q,
          answer,
          messages: initialMessages,
          query_scope: queryScopeStr,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setQueries((prev) => [{ ...data, messages: initialMessages }, ...prev]);
      setNewestId(data.id);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  const hasDreams = dreams.length > 0;
  const hasApiKey = !!apiKey;

  const filteredDreams = filterDreamsByScope(dreams, scope, customFrom, customTo);

  function dreamCountLabel() {
    const count = filteredDreams.length;
    if (scope === 'last_15') return 'Last 15 dreams';
    if (scope === 'last_30') return 'Last 30 dreams';
    if (scope === 'custom' && (customFrom || customTo)) {
      const fmtFrom = customFrom ? formatScopeMonth(customFrom) : null;
      const fmtTo = customTo ? formatScopeMonth(customTo) : null;
      if (fmtFrom && fmtTo) return `${fmtFrom} – ${fmtTo}`;
      if (fmtFrom) return `From ${fmtFrom}`;
      if (fmtTo) return `Through ${fmtTo}`;
    }
    return `${count} dream${count !== 1 ? 's' : ''} in archive`;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-10">
      <header>
        <h1 className="font-serif italic text-3xl text-plum">Ask the Archive</h1>
        <p className="text-ink/50 text-sm font-sans mt-2 leading-relaxed">
          Ask anything about the patterns, figures, and threads across all your dreams.
          Each conversation is saved — click any past question to continue it.
        </p>
      </header>

      <PracticeOrientation storageKey="orient_ask">
        <p>The archive is a record of your unconscious across time. Asking it questions is a way of looking at your own depth from a different angle — ask about a recurring figure, what a symbol has meant across different dreams, where a particular feeling goes.</p>
        <p>The answers draw on everything you have recorded, and sometimes reveal patterns you had not noticed yourself.</p>
      </PracticeOrientation>

      {hasDreams && hasApiKey && (
        <ScopeFilterBar
          scope={scope}
          setScope={handleScopeChange}
          customFrom={customFrom}
          setCustomFrom={setCustomFrom}
          customTo={customTo}
          setCustomTo={setCustomTo}
          showCustomRange={showCustomRange}
        />
      )}

      {!hasApiKey && (
        <div className="bg-gold/10 border border-gold/30 rounded-xl px-5 py-4 text-sm text-ink/70 font-sans">
          Add your Anthropic API key in{' '}
          <a href="/settings" className="text-gold underline">Settings</a>{' '}
          to ask the archive.
        </div>
      )}

      {!hasDreams && hasApiKey && (
        <div className="bg-parchment border border-gold/20 rounded-xl px-5 py-4 text-sm text-ink/60 font-serif italic">
          Record some dreams first — the archive needs material to reflect back to you.
        </div>
      )}

      {hasDreams && hasApiKey && (
        <form onSubmit={handleAsk} className="space-y-3">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAsk(e);
              }
            }}
            placeholder="What keeps appearing in my dreams? What is the recurring figure trying to tell me?"
            rows={3}
            disabled={loading}
            className="w-full resize-none rounded-xl border border-gold/20 bg-white/80 px-5 py-4
                       text-base text-ink font-serif italic placeholder:text-ink/25 placeholder:not-italic
                       focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20
                       disabled:opacity-50 transition-colors leading-relaxed"
          />
          <div className="flex items-center justify-end">
            <button
              type="submit"
              disabled={!question.trim() || loading}
              className="px-6 py-2.5 rounded-xl bg-plum text-parchment text-sm font-sans
                         hover:bg-plum/90 active:scale-95 transition-all
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'Consulting the archive…' : 'Ask'}
            </button>
          </div>
          <p className="text-xs font-sans italic text-ink/40 -mt-1">
            {dreamCountLabel()}
          </p>
          {error && <AiErrorMessage error={error} />}
        </form>
      )}

      <section className="space-y-3">
        {loadingQueries ? (
          <p className="text-sm font-mono text-ink/30 text-center py-8">Loading conversations…</p>
        ) : queries.length === 0 ? (
          <p className="text-sm font-serif italic text-ink/40 text-center py-8">
            No conversations yet. Ask your first question above.
          </p>
        ) : (
          <>
            <h2 className="text-xs uppercase tracking-widest font-mono text-ink/40 mb-4">
              Conversations
            </h2>
            {queries.map((q) => (
              <QueryCard
                key={q.id}
                queryRecord={q}
                dreams={dreams}
                apiKey={apiKey}
                onThreadUpdated={handleThreadUpdated}
                defaultOpen={q.id === newestId}
                userId={user.id}
              />
            ))}
          </>
        )}
      </section>
    </div>
  );
}
