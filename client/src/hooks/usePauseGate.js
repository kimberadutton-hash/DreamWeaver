// Tracks two compulsive-use patterns and surfaces a gentle intervention.
//
// Pattern 1 — Analysis loop:
//   Same dream analyzed 3+ times in one calendar day.
//   sessionStorage key: analysis-count-[dreamId]-[YYYY-MM-DD]
//
// Pattern 2 — Repeated abandonment:
//   User opened /new, stayed 30+ seconds, left without saving. 3+ times per session.
//   sessionStorage key: abandoned-new-count
//
// Gate dismissed state:
//   sessionStorage key: pause-gate-dismissed-[YYYY-MM-DD]  →  resets each new day
//
// Callers:
//   DreamDetail.jsx  →  incrementAnalysisCount(dreamId)  before each analysis
//   NewDream.jsx     →  incrementAbandonedCount()         on unmount (body non-empty, unsaved)
//   NewDream.jsx     →  resetPauseCounts()                after successful save
//   Layout.jsx       →  usePauseGate()                    to read state and dismiss

const dateStr = () => new Date().toISOString().slice(0, 10);

// ── Exported helpers (called from DreamDetail / NewDream) ────────────────────

export function incrementAnalysisCount(dreamId) {
  const key = `analysis-count-${dreamId}-${dateStr()}`;
  const current = parseInt(sessionStorage.getItem(key) || '0', 10);
  sessionStorage.setItem(key, String(current + 1));
  window.dispatchEvent(new CustomEvent('pause-gate-check'));
}

export function incrementAbandonedCount() {
  const key = 'abandoned-new-count';
  const current = parseInt(sessionStorage.getItem(key) || '0', 10);
  sessionStorage.setItem(key, String(current + 1));
  window.dispatchEvent(new CustomEvent('pause-gate-check'));
}

export function resetPauseCounts() {
  sessionStorage.removeItem('abandoned-new-count');
  // Clear all analysis-count keys for today
  const prefix = 'analysis-count-';
  const today = dateStr();
  for (const key of Object.keys(sessionStorage)) {
    if (key.startsWith(prefix) && key.endsWith(today)) {
      sessionStorage.removeItem(key);
    }
  }
}

// ── Internal threshold check ─────────────────────────────────────────────────

function checkThreshold() {
  const today = dateStr();

  // Already dismissed today — stay quiet
  if (sessionStorage.getItem(`pause-gate-dismissed-${today}`) === 'true') {
    return false;
  }

  // Pattern 1: any dream analyzed 3+ times today
  const analysisPrefix = 'analysis-count-';
  for (const key of Object.keys(sessionStorage)) {
    if (key.startsWith(analysisPrefix) && key.endsWith(today)) {
      if (parseInt(sessionStorage.getItem(key) || '0', 10) >= 3) return true;
    }
  }

  // Pattern 2: abandoned /new 3+ times this session
  if (parseInt(sessionStorage.getItem('abandoned-new-count') || '0', 10) >= 3) {
    return true;
  }

  return false;
}

// ── Hook (used in Layout.jsx) ────────────────────────────────────────────────

import { useEffect, useState } from 'react';

export function usePauseGate() {
  const [showPauseGate, setShowPauseGate] = useState(() => checkThreshold());

  useEffect(() => {
    function handleCheck() {
      setShowPauseGate(checkThreshold());
    }
    window.addEventListener('pause-gate-check', handleCheck);
    return () => window.removeEventListener('pause-gate-check', handleCheck);
  }, []);

  function dismissPauseGate() {
    sessionStorage.setItem(`pause-gate-dismissed-${dateStr()}`, 'true');
    setShowPauseGate(false);
  }

  return { showPauseGate, dismissPauseGate };
}
