import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { JUNGIAN_TERMS } from '../lib/jungianTerms';

// Lookup by term id or by display text (case-insensitive).
// Returns the matching term entry or null.
function findTerm(idOrText) {
  if (!idOrText) return null;
  const lower = idOrText.toLowerCase();
  return (
    JUNGIAN_TERMS.find(t => t.id === idOrText) ||
    JUNGIAN_TERMS.find(t => t.term.toLowerCase() === lower) ||
    // partial match for "anima", "animus" → anima-animus
    JUNGIAN_TERMS.find(t => t.id.includes(lower) || lower.includes(t.id))
  ) || null;
}

// <JungianTerm id="shadow"> or <JungianTerm id="shadow">The Shadow</JungianTerm>
// If children is omitted, the term's canonical name is displayed.
export default function JungianTerm({ id, children }) {
  const term = findTerm(id);
  const [visible, setVisible] = useState(false);
  const [above, setAbove] = useState(false);
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);

  // Position the tooltip above the trigger if it would overflow the bottom
  function handleMouseEnter() {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setAbove(spaceBelow < 180);
    }
    setVisible(true);
  }

  // Close on Escape
  useEffect(() => {
    if (!visible) return;
    const handler = (e) => { if (e.key === 'Escape') setVisible(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [visible]);

  if (!term) {
    // No matching term — render plain text so nothing breaks
    return <>{children || id}</>;
  }

  const display = children || term.term;

  return (
    <span className="relative inline-block">
      <span
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setVisible(false)}
        onFocus={handleMouseEnter}
        onBlur={() => setVisible(false)}
        tabIndex={0}
        role="button"
        aria-describedby={visible ? `jt-${term.id}` : undefined}
        className="cursor-help"
        style={{
          borderBottom: '1px dotted #b8924a',
          textDecorationSkipInk: 'none',
        }}
      >
        {display}
      </span>

      {/* Tooltip */}
      <span
        id={`jt-${term.id}`}
        ref={tooltipRef}
        role="tooltip"
        className="pointer-events-none absolute left-0 z-50 w-[280px]"
        style={{
          ...(above ? { bottom: '100%', marginBottom: 8 } : { top: '100%', marginTop: 8 }),
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.2s ease',
        }}
      >
        <span
          className="block rounded-xl shadow-lg px-4 py-3"
          style={{
            backgroundColor: '#faf7f2',
            border: '1px solid rgba(184,146,74,0.2)',
          }}
        >
          <span className="block font-display italic text-base text-[#3d2b4a] mb-1 leading-tight">
            {term.term}
          </span>
          <span className="block text-xs font-body text-ink/65 leading-relaxed">
            {term.oneLiner}
          </span>
          <Link
            to={`/reference#${term.id}`}
            className="pointer-events-auto block mt-2 text-[10px] font-body text-[#b8924a]/70 hover:text-[#b8924a] transition-colors"
            tabIndex={visible ? 0 : -1}
          >
            Read more in Reference →
          </Link>
        </span>
      </span>
    </span>
  );
}
