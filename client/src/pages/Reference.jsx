import { useState, useEffect, useRef } from 'react';
import { JUNGIAN_TERMS } from '../lib/jungianTerms';

export default function Reference() {
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [transitionDone, setTransitionDone] = useState(false);
  const entryRefs = useRef({});

  // On mount check for hash navigation (e.g. /reference#shadow)
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      const term = JUNGIAN_TERMS.find(t => t.id === hash);
      if (term) {
        setExpandedId(hash);
        setTimeout(() => scrollToEntry(hash), 150);
      }
    }
  }, []);

  function scrollToEntry(id) {
    entryRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleRelatedClick(id) {
    setTransitionDone(false);
    setExpandedId(id);
    setQuery('');
    setTimeout(() => scrollToEntry(id), 50);
  }

  function handleToggle(id) {
    setTransitionDone(false);
    setExpandedId(prev => prev === id ? null : id);
  }

  const filtered = query.trim()
    ? JUNGIAN_TERMS.filter(t =>
        t.term.toLowerCase().includes(query.toLowerCase()) ||
        t.oneLiner.toLowerCase().includes(query.toLowerCase()) ||
        t.body.toLowerCase().includes(query.toLowerCase())
      )
    : JUNGIAN_TERMS;

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">

      {/* ── Header ── */}
      <div className="mb-8">
        <p className="font-display italic text-base text-ink/45 dark:text-white/35 mb-6 leading-relaxed">
          The vocabulary of the inner life — in plain language for those doing the work.
        </p>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search terms…"
          className="w-full max-w-sm px-4 py-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 text-sm font-body text-ink dark:text-white/80 placeholder-ink/25 dark:placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-gold/40"
        />
        {query && (
          <p className="mt-2 text-xs font-body text-ink/35 dark:text-white/25">
            {filtered.length} {filtered.length === 1 ? 'term' : 'terms'} matching "{query}"
          </p>
        )}
      </div>

      {/* ── Term grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map(term => {
          const isOpen = expandedId === term.id;
          return (
            <div
              key={term.id}
              id={term.id}
              ref={el => entryRefs.current[term.id] = el}
              className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                isOpen
                  ? 'border-gold/30 bg-white/70 dark:bg-white/6 md:col-span-2'
                  : 'border-black/8 dark:border-white/8 bg-white/40 dark:bg-white/3 hover:border-black/15 dark:hover:border-white/15 hover:bg-white/60 dark:hover:bg-white/5'
              }`}
            >
              {/* Card header — always visible */}
              <button
                onClick={() => handleToggle(term.id)}
                className="w-full text-left px-5 py-4 flex items-start justify-between gap-4 group"
              >
                <div className="min-w-0">
                  <div className="flex items-baseline gap-3 flex-wrap mb-1">
                    <h2 className="font-display italic text-xl text-ink dark:text-white leading-tight">
                      {term.term}
                    </h2>
                    {term.pronunciation && (
                      <span className="text-xs font-mono text-ink/30 dark:text-white/25 tracking-wide">
                        {term.pronunciation}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-body text-ink/55 dark:text-white/45 leading-relaxed">
                    {term.oneLiner}
                  </p>
                </div>
                <span
                  className="text-ink/25 dark:text-white/20 text-xl leading-none shrink-0 mt-1 transition-transform duration-200"
                  style={{ display: 'inline-block', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
                >
                  ›
                </span>
              </button>

              {/* Expanded entry — max-height transition; overflow flips to visible after open */}
              <div
                style={{
                  maxHeight: isOpen ? '2000px' : '0',
                  overflow: (isOpen && transitionDone) ? 'visible' : 'hidden',
                  transition: 'max-height 0.3s ease',
                }}
                onTransitionEnd={() => { if (isOpen) setTransitionDone(true); }}
              >
                <div className="px-5 pb-7 border-t border-black/6 dark:border-white/6">

                  {/* Body */}
                  <div className="mt-5 space-y-4 max-w-[680px]">
                    {term.body.split(/\n\n+/).map((para, i) => (
                      <p key={i} className="text-[15px] font-body text-ink/80 dark:text-white/70 leading-relaxed">
                        {para.trim()}
                      </p>
                    ))}
                  </div>

                  {/* In your dreams */}
                  <div className="mt-6 pl-4 border-l-2 border-gold/30 max-w-[680px]">
                    <p style={{ fontSize: 9, letterSpacing: '0.18em' }} className="uppercase font-body text-gold/50 dark:text-gold/40 mb-2">
                      in your dreams
                    </p>
                    <p className="text-sm font-body text-ink/65 dark:text-white/55 leading-relaxed">
                      {term.inYourDreams}
                    </p>
                  </div>

                  {/* Related terms */}
                  {term.relatedTerms?.length > 0 && (
                    <div className="mt-5 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-body text-ink/30 dark:text-white/25 mr-1">See also</span>
                      {term.relatedTerms.map(relId => {
                        const related = JUNGIAN_TERMS.find(t => t.id === relId);
                        if (!related) return null;
                        return (
                          <button
                            key={relId}
                            onClick={() => handleRelatedClick(relId)}
                            className="px-3 py-1 rounded-full text-xs font-body bg-plum/8 dark:bg-white/8 text-plum/70 dark:text-white/50 hover:bg-plum/15 dark:hover:bg-white/12 transition-colors"
                          >
                            {related.term}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm font-body text-ink/35 dark:text-white/25 italic mt-8">
          No terms match "{query}"
        </p>
      )}

      <div className="h-12" />
    </div>
  );
}
