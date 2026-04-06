import { useState, useEffect, useRef } from 'react';
import { JUNGIAN_TERMS } from '../lib/jungianTerms';

const CATEGORIES = [
  { id: 'all',             label: 'All' },
  { id: 'core',            label: 'Core Concepts' },
  { id: 'archetypes',      label: 'Archetypes' },
  { id: 'alchemical',      label: 'Alchemical' },
  { id: 'dream-structure', label: 'Dream Structure' },
  { id: 'analytical',      label: 'Analytical Method' },
];

// Derive a source note from the term's category and id — no extra field needed
function getSource(term) {
  if (term.category === 'alchemical') return 'Alchemical tradition';
  if (term.category === 'dream-structure') return 'Greek / analytical tradition';
  if (term.subcategory === 'post-jungian') return 'Post-Jungian development';
  const greek = ['enantiodromia', 'numinous', 'temenos', 'katabasis'];
  if (greek.includes(term.id)) return 'Greek / analytical tradition';
  return "Jung's core concept";
}

export default function Reference() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [transitionDone, setTransitionDone] = useState(false);
  const entryRefs = useRef({});

  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      const term = JUNGIAN_TERMS.find(t => t.id === hash);
      if (term) {
        setActiveCategory('all');
        setExpandedId(hash);
        setTimeout(() => scrollToEntry(hash), 150);
      }
    }
  }, []);

  function scrollToEntry(id) {
    entryRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleRelatedClick(id) {
    const term = JUNGIAN_TERMS.find(t => t.id === id);
    if (term) setActiveCategory('all');
    setTransitionDone(false);
    setExpandedId(id);
    setQuery('');
    setTimeout(() => scrollToEntry(id), 50);
  }

  function handleToggle(id) {
    setTransitionDone(false);
    setExpandedId(prev => prev === id ? null : id);
  }

  function handleCategoryChange(id) {
    setActiveCategory(id);
    setExpandedId(null);
    setTransitionDone(false);
  }

  const filtered = JUNGIAN_TERMS.filter(t => {
    const matchesCategory = activeCategory === 'all' || t.category === activeCategory;
    if (!matchesCategory) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      t.term.toLowerCase().includes(q) ||
      t.oneLiner.toLowerCase().includes(q) ||
      t.body.toLowerCase().includes(q)
    );
  });

  // For archetypes tab: split by subcategory
  const jungCoreTerms = filtered.filter(t => t.subcategory === 'jung-core');
  const postJungianTerms = filtered.filter(t => t.subcategory === 'post-jungian');

  function renderCard(term) {
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

            {/* Source note */}
            <p style={{ fontSize: 9, letterSpacing: '0.14em' }} className="mt-6 uppercase font-body text-ink/20 dark:text-white/15">
              {getSource(term)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-8">

      {/* ── Header ── */}
      <div className="mb-0">
        <h1 className="font-display italic text-4xl text-plum mb-1">Reference</h1>
        <p className="text-base font-body text-ink/60 dark:text-white/45 mb-8">
          The vocabulary of the inner life — concepts, archetypes, and methods for those doing the work.
        </p>

        {/* Category filter tabs */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {CATEGORIES.map(cat => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className="px-3.5 py-1.5 rounded-full text-xs font-body transition-colors"
                style={isActive ? {
                  color: '#b8924a',
                  borderBottom: '2px solid #b8924a',
                  borderTop: '2px solid transparent',
                  borderLeft: '2px solid transparent',
                  borderRight: '2px solid transparent',
                  paddingBottom: '4px',
                  backgroundColor: 'rgba(184,146,74,0.06)',
                } : {
                  color: 'rgba(42,36,32,0.45)',
                  border: '2px solid transparent',
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

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
      {activeCategory === 'archetypes' ? (
        <div className="space-y-8">
          {jungCoreTerms.length > 0 && (
            <div>
              <p style={{ fontSize: 9, letterSpacing: '0.18em' }} className="uppercase font-body text-ink/30 dark:text-white/20 mb-3">
                Jung's core archetypes
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {jungCoreTerms.map(renderCard)}
              </div>
            </div>
          )}
          {postJungianTerms.length > 0 && (
            <div>
              <p style={{ fontSize: 9, letterSpacing: '0.18em' }} className="uppercase font-body text-ink/30 dark:text-white/20 mb-3">
                Post-Jungian figures
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {postJungianTerms.map(renderCard)}
              </div>
            </div>
          )}
          {jungCoreTerms.length === 0 && postJungianTerms.length === 0 && (
            <p className="text-sm font-body text-ink/35 dark:text-white/25 italic">
              {query ? `No terms match "${query}"` : 'No terms in this category.'}
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(renderCard)}
        </div>
      )}

      {activeCategory !== 'archetypes' && filtered.length === 0 && (
        <p className="text-sm font-body text-ink/35 dark:text-white/25 italic mt-8">
          {query ? `No terms match "${query}"` : 'No terms in this category.'}
        </p>
      )}

      <div className="h-12" />
    </div>
  );
}
