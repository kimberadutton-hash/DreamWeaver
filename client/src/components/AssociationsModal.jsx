import { useState } from 'react';

export default function AssociationsModal({ associations, onProceed, onSkip, isLoading }) {
  const [responses, setResponses] = useState({});

  function handleProceed() {
    const filled = (associations || [])
      .filter(a => responses[a.element]?.trim())
      .map(a => ({ element: a.element, response: responses[a.element].trim() }));
    onProceed(filled);
  }

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

        {/* Association items */}
        {!isLoading && associations?.length > 0 && (
          <div className="flex flex-col">
            {associations.map((a, i) => (
              <div key={a.element}>
                <div className="flex flex-col gap-2 py-4">
                  <span
                    className="font-body uppercase tracking-widest"
                    style={{ fontSize: 11, color: '#b8924a' }}
                  >
                    {a.element}
                  </span>
                  <p
                    className="font-display italic leading-snug"
                    style={{ fontSize: 16, color: '#2a2420' }}
                  >
                    {a.prompt}
                  </p>
                  <textarea
                    rows={3}
                    placeholder="…"
                    value={responses[a.element] || ''}
                    onChange={e => setResponses(r => ({ ...r, [a.element]: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg font-body text-sm text-ink resize-none focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: '#faf7f2',
                      border: '1px solid rgba(61,43,74,0.2)',
                      fontSize: 14,
                    }}
                    onFocus={e => { e.target.style.borderColor = '#3d2b4a'; e.target.style.boxShadow = '0 0 0 2px rgba(61,43,74,0.12)'; }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(61,43,74,0.2)'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
                {i < associations.length - 1 && (
                  <div style={{ borderBottom: '1px solid rgba(42,36,32,0.08)' }} />
                )}
              </div>
            ))}
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
