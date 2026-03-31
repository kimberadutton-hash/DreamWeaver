import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import MilestoneModal from './MilestoneModal';
import { usePauseGate } from '../hooks/usePauseGate';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

export default function Layout({ children }) {
  const { showPauseGate, dismissPauseGate } = usePauseGate();
  const { user, profile, dreamCount } = useAuth();
  const [activeMilestone, setActiveMilestone] = useState(null);
  const prevDreamCountRef = useRef(null);
  const prevAnalystNameRef = useRef(null);

  // ── Milestone trigger ──────────────────────────────────────────────────────
  // On first load (prev === null) we skip — existing users shouldn't see old modals.
  // On subsequent changes we check if a threshold was just crossed.

  useEffect(() => {
    if (!profile || !user) return;

    const prevCount = prevDreamCountRef.current;
    const prevName = prevAnalystNameRef.current;
    prevDreamCountRef.current = dreamCount;
    prevAnalystNameRef.current = profile.analyst_name || null;

    if (prevCount === null) return; // First load — skip

    const seen = profile.milestones_seen || [];
    const hasGuide = Boolean(profile.analyst_name?.trim());

    async function maybeShowMilestone(key) {
      if (seen.includes(key)) return;
      await supabase
        .from('profiles')
        .update({ milestones_seen: [...seen, key] })
        .eq('id', user.id);
      setActiveMilestone(key);
    }

    // Dream count milestones
    if (prevCount < 3 && dreamCount >= 3) {
      maybeShowMilestone('3_dreams');
    } else if (prevCount < 10 && dreamCount >= 10) {
      maybeShowMilestone('10_dreams');
    } else if (prevCount < 20 && dreamCount >= 20) {
      maybeShowMilestone(hasGuide ? '20_dreams_with_guide' : '20_dreams_no_guide');
    }

    // Guide added milestone — analyst_name transitions from falsy to truthy
    const wasGuide = Boolean(prevName?.trim());
    if (!wasGuide && hasGuide) {
      maybeShowMilestone('guide_added');
    }
  }, [dreamCount, profile, user]);

  return (
    <div className="flex h-screen overflow-hidden bg-parchment dark:bg-gray-950">
      <Sidebar />
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        {showPauseGate && <PauseGate onDismiss={dismissPauseGate} />}
        {children}
      </main>
      {activeMilestone && (
        <MilestoneModal
          milestone={activeMilestone}
          onDismiss={() => setActiveMilestone(null)}
        />
      )}
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
