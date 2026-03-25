import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatDate } from '../lib/constants';

export default function DreamPreviewDrawer({ dreamTitle, isOpen, onClose }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dream, setDream] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const closeButtonRef = useRef(null);
  const drawerRef = useRef(null);

  // Fetch dream when opening
  useEffect(() => {
    if (!isOpen || !dreamTitle) return;
    setDream(null);
    setNotFound(false);
    setLoading(true);

    supabase
      .from('dreams')
      .select('id, title, dream_date, body, mood, archetypes, symbols, tags')
      .eq('user_id', user.id)
      .ilike('title', dreamTitle.trim())
      .order('dream_date', { ascending: false })
      .limit(1)
      .single()
      .then(({ data, error }) => {
        if (error || !data) setNotFound(true);
        else setDream(data);
        setLoading(false);
      });
  }, [isOpen, dreamTitle, user.id]);

  // Focus close button on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => closeButtonRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Escape key closes
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Trap focus inside drawer
  useEffect(() => {
    if (!isOpen || !drawerRef.current) return;
    const focusable = drawerRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const trap = (e) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', trap);
    return () => document.removeEventListener('keydown', trap);
  }, [isOpen, dream]);

  const moodArr = Array.isArray(dream?.mood)
    ? dream.mood
    : (dream?.mood ? [dream.mood] : []);

  const formattedDate = dream?.dream_date
    ? (() => { try { return formatDate(dream.dream_date); } catch { return dream.dream_date; } })()
    : '';

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={dreamTitle ? `Dream: ${dreamTitle}` : 'Dream preview'}
        className={`fixed top-0 right-0 z-50 h-full w-full sm:w-[480px] flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ backgroundColor: '#faf7f2' }}
      >
        {/* Header bar */}
        <div
          className="flex items-start justify-between gap-4 px-6 py-5 shrink-0 bg-plum"
        >
          <div className="min-w-0">
            <p className="text-xs font-body text-white/50 uppercase tracking-widest mb-1">
              {formattedDate || dreamTitle}
            </p>
            <h2 className="font-display italic text-xl text-white leading-snug">
              {dream?.title || dreamTitle}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="shrink-0 mt-0.5 text-white/60 hover:text-white transition-colors text-xl leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {loading && (
            <p className="font-display italic text-ink/40 text-lg mt-8 text-center">
              Finding this dream…
            </p>
          )}

          {notFound && !loading && (
            <p className="text-sm font-body text-ink/50 mt-8 text-center italic">
              Could not find a dream titled "{dreamTitle}" in your archive.
            </p>
          )}

          {dream && !loading && (
            <div className="space-y-6">
              {/* Mood pills */}
              {moodArr.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {moodArr.map(m => (
                    <span
                      key={m}
                      className="px-3 py-1 rounded-full text-xs font-body border border-black/12 text-ink/60"
                      style={{ backgroundColor: 'rgba(184,146,74,0.08)' }}
                    >
                      {m}
                    </span>
                  ))}
                </div>
              )}

              {/* Dream body */}
              <div>
                <p className="font-dream text-ink leading-[1.85] text-[15px] whitespace-pre-wrap">
                  {dream.body}
                </p>
              </div>

              {/* Archetypes */}
              {dream.archetypes?.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-widest font-body text-ink/40 mb-2">
                    Archetypes
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {dream.archetypes.map(a => (
                      <span
                        key={a}
                        className="px-3 py-1 rounded-full text-xs font-body text-plum border border-plum/25"
                        style={{ backgroundColor: 'rgba(61,43,74,0.06)' }}
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Symbols */}
              {dream.symbols?.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-widest font-body text-ink/40 mb-2">
                    Symbols
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {dream.symbols.map(s => (
                      <span
                        key={s}
                        className="px-3 py-1 rounded-full text-xs font-body text-gold border border-gold/30"
                        style={{ backgroundColor: 'rgba(184,146,74,0.06)' }}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {dream.tags?.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-widest font-body text-ink/40 mb-2">
                    Tags
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {dream.tags.map(t => (
                      <span
                        key={t}
                        className="px-2.5 py-1 rounded-lg text-xs font-body text-ink/50 border border-black/10"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {dream && (
          <div
            className="shrink-0 px-6 py-4 border-t border-black/8"
            style={{ backgroundColor: '#faf7f2' }}
          >
            <button
              onClick={() => { onClose(); navigate(`/dream/${dream.id}`); }}
              className="w-full py-3 rounded-xl font-body text-sm font-medium text-white bg-plum"
            >
              Open full dream →
            </button>
          </div>
        )}
      </div>
    </>
  );
}
