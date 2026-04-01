import { useState, useEffect } from 'react';

// Collapsible "About this practice" orientation panel.
// Expanded on first view (keyed per page via storageKey), collapsed thereafter.
// storageKey should be unique per page, e.g. "orient_record", "orient_archive".

export default function PracticeOrientation({ title = 'About this practice', storageKey, children }) {
  const seen = storageKey ? localStorage.getItem(storageKey) : null;
  const [open, setOpen] = useState(!seen);

  function handleToggle() {
    const next = !open;
    setOpen(next);
    if (storageKey && !next) {
      // Mark as seen when user collapses for the first time
      localStorage.setItem(storageKey, '1');
    }
  }

  return (
    <div
      className="mb-8 rounded-2xl border border-[#b8924a]/20"
      style={{ backgroundColor: '#faf7f2' }}
    >
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <span className="text-xs uppercase tracking-widest font-body text-[#b8924a]/70">
          {title}
        </span>
        <span
          className="text-[#b8924a]/50 text-lg leading-none shrink-0 ml-4 transition-transform duration-200"
          style={{ display: 'inline-block', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
        >
          ›
        </span>
      </button>

      <div
        style={{
          maxHeight: open ? '600px' : '0',
          overflow: 'hidden',
          opacity: open ? 1 : 0,
          transition: 'max-height 0.3s ease, opacity 0.2s ease',
        }}
      >
        <div className="px-5 pb-5 border-t border-[#b8924a]/12">
          <div className="pt-4 font-display italic text-[15px] leading-[1.85] text-ink/65 dark:text-white/55 space-y-3">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
