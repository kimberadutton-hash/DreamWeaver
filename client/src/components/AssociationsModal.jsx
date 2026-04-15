import { useState } from 'react';

const SECTION_LABEL_STYLE = {
  fontSize: 11,
  color: '#2a2420',
  opacity: 0.4,
};

function AssocItem({ item, type, responses, setResponses }) {
  return (
    <div className="flex flex-col gap-2 py-4">
      <span
        className="font-body uppercase tracking-widest"
        style={{ fontSize: 11, color: '#b8924a' }}
      >
        {item.element}
      </span>
      <p
        className="font-display italic leading-snug"
        style={{ fontSize: 16, color: '#2a2420' }}
      >
        {item.prompt}
      </p>
      <textarea
        rows={3}
        placeholder="…"
        value={responses[item.element] || ''}
        onChange={e => setResponses(r => ({ ...r, [item.element]: e.target.value }))}
        className="w-full px-3 py-2.5 rounded-lg font-body text-sm text-ink resize-none focus:outline-none"
        style={{
          backgroundColor: '#faf7f2',
          border: '1px solid rgba(61,43,74,0.2)',
          fontSize: 14,
        }}
        onFocus={e => { e.target.style.borderColor = '#3d2b4a'; e.target.style.boxShadow = '0 0 0 2px rgba(61,43,74,0.12)'; }}
        onBlur={e => { e.target.style.borderColor = 'rgba(61,43,74,0.2)'; e.target.style.boxShadow = 'none'; }}
      />
    </div>
  );
}

function EarlierNotes({ text }) {
  const [expanded, setExpanded] = useState(false);
  // Estimate overflow: 4 lines at ~20px each = 80px. We use line-clamp via CSS.
  const THRESHOLD = 280; // rough char count where 4 lines overflow
  const isLong = text.length > THRESHOLD;

  return (
    <div style={{
      background: 'rgba(184,146,74,0.08)',
      borderLeft: '2px solid rgba(184,146,74,0.4)',
      padding: '12px 16px',
      marginBottom: 24,
      borderRadius: '0 4px 4px 0',
    }}>
      <p className="font-body uppercase tracking-widest" style={{ fontSize: 11, color: 'rgba(42,36,32,0.4)', marginBottom: 6 }}>
        Your Earlier Notes
      </p>
      <div style={{ position: 'relative' }}>
        <p
          className="font-display italic"
          style={{
            fontSize: 15,
            color: 'rgba(42,36,32,0.7)',
            lineHeight: 1.55,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: expanded ? 'unset' : 4,
          }}
        >
          {text}
        </p>
        {isLong && !expanded && (
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 28,
            background: 'linear-gradient(to bottom, rgba(245,240,232,0), rgba(245,240,232,0.95))',
            pointerEvents: 'none',
          }} />
        )}
      </div>
      {isLong && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="font-body"
          style={{ fontSize: 10, color: '#b8924a', background: 'none', border: 'none', padding: '4px 0 0', cursor: 'pointer' }}
        >
          {expanded ? 'show less' : 'show more'}
        </button>
      )}
    </div>
  );
}

export default function AssociationsModal({ entities, dynamics, onProceed, onSkip, isLoading, existingAssociations = null }) {
  const [responses, setResponses] = useState({});

  function handleProceed() {
    const filled = [
      ...(entities || [])
        .filter(a => responses[a.element]?.trim())
        .map(a => ({ element: a.element, response: responses[a.element].trim(), type: 'entity' })),
      ...(dynamics || [])
        .filter(a => responses[a.element]?.trim())
        .map(a => ({ element: a.element, response: responses[a.element].trim(), type: 'dynamic' })),
    ];
    onProceed(filled);
  }

  const hasEntities = (entities || []).length > 0;
  const hasDynamics = (dynamics || []).length > 0;
  const showSectionLabels = hasEntities && hasDynamics;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center px-6 py-8"
      style={{ backgroundColor: 'rgba(42, 36, 32, 0.7)' }}
    >
      <div
        className="w-full max-w-[560px] rounded-2xl px-8 py-8 flex flex-col gap-6 overflow-y-auto"
        style={{ backgroundColor: '#faf7f2', maxHeight: 'calc(100vh - 64px)' }}
      >
        {/* Header */}
        <div className="space-y-2">
          <h2
            className="font-display italic leading-snug"
            style={{ fontSize: 26, color: '#3d2b4a' }}
          >
            Before the analysis
          </h2>
          <p className="font-body text-ink/50 leading-relaxed" style={{ fontSize: 13 }}>
            What do these bring up for you? Write as little or as much as feels true. These will shape the analysis.
          </p>
        </div>

        {/* Loading state */}
        {isLoading && (
          <p
            className="font-display italic"
            style={{ fontSize: 17, color: '#2a2420', opacity: 0.5, animation: 'assoc-pulse 1.5s ease-in-out infinite' }}
          >
            Reading the dream…
          </p>
        )}

        {/* Content */}
        {!isLoading && (
          <div className="flex flex-col">
            {/* Earlier notes reference */}
            {existingAssociations && existingAssociations.trim() && (
              <EarlierNotes text={existingAssociations.trim()} />
            )}

            {/* Entities section */}
            {hasEntities && (
              <div>
                {showSectionLabels && (
                  <p className="font-body uppercase tracking-widest mb-1" style={SECTION_LABEL_STYLE}>
                    People, Places &amp; Figures
                  </p>
                )}
                {entities.map((a, i) => (
                  <div key={a.element}>
                    <AssocItem item={a} type="entity" responses={responses} setResponses={setResponses} />
                    {i < entities.length - 1 && (
                      <div style={{ borderBottom: '1px solid rgba(42,36,32,0.08)' }} />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Section divider */}
            {hasEntities && hasDynamics && (
              <div style={{ borderTop: '1px solid rgba(42,36,32,0.1)', margin: '8px 0 16px' }} />
            )}

            {/* Dynamics section */}
            {hasDynamics && (
              <div>
                {showSectionLabels && (
                  <p className="font-body uppercase tracking-widest mb-1" style={SECTION_LABEL_STYLE}>
                    Moments &amp; Dynamics
                  </p>
                )}
                {dynamics.map((a, i) => (
                  <div key={a.element}>
                    <AssocItem item={a} type="dynamic" responses={responses} setResponses={setResponses} />
                    {i < dynamics.length - 1 && (
                      <div style={{ borderBottom: '1px solid rgba(42,36,32,0.08)' }} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {!isLoading && (
          <div className="flex flex-col items-center gap-3 pt-1">
            <button
              onClick={handleProceed}
              className="w-full py-3 rounded-xl font-body font-medium text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#b8924a', fontSize: 14 }}
            >
              Proceed to analysis
            </button>
            <button
              onClick={onSkip}
              className="font-body text-ink/40 hover:text-ink/60 transition-colors cursor-pointer"
              style={{ fontSize: 12 }}
            >
              Skip — analyze without my associations
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes assoc-pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
