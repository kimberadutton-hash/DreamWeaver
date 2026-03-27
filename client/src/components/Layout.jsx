import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { usePauseGate } from '../hooks/usePauseGate';

export default function Layout({ children }) {
  const { showPauseGate, dismissPauseGate } = usePauseGate();

  return (
    <div className="flex h-screen overflow-hidden bg-parchment dark:bg-gray-950">
      <Sidebar />
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        {showPauseGate && <PauseGate onDismiss={dismissPauseGate} />}
        {children}
      </main>
    </div>
  );
}

// ── Pause Gate banner ─────────────────────────────────────────────────────────

function PauseGate({ onDismiss }) {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 50);
  }, []);

  function handleDismiss() {
    onDismiss();
  }

  function handleReturnToArchive() {
    onDismiss();
    navigate('/archive');
  }

  return (
    <div
      className="mx-6 mt-5"
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.5s ease',
      }}
    >
      <div
        className="rounded-r-xl px-6 py-5 bg-gold/8 dark:bg-gold/10 border border-gold/15 dark:border-gold/20"
        style={{ borderLeft: '4px solid #b8924a' }}
      >
        <p className="font-display italic text-base text-ink dark:text-white mb-3">
          A moment to pause
        </p>
        <p className="text-sm font-body text-ink/70 dark:text-white/60 leading-relaxed mb-2">
          You've been spending a lot of time with this material. The psyche needs space to integrate what it surfaces — analysis alone doesn't complete the work.
        </p>
        <p className="text-sm font-body text-ink/70 dark:text-white/60 leading-relaxed mb-5">
          Is there something in your body right now? Something in the room around you? Someone you could be with today?
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDismiss}
            className="px-4 py-2 rounded-lg text-sm font-body font-medium text-white bg-plum transition-opacity hover:opacity-90"
          >
            I hear that
          </button>
          <button
            onClick={handleReturnToArchive}
            className="px-4 py-2 rounded-lg text-sm font-body text-ink/50 dark:text-white/40 hover:text-ink dark:hover:text-white transition-colors"
          >
            Return to archive
          </button>
        </div>
      </div>
    </div>
  );
}
