// Full-screen milestone modal — shown once per milestone, tracked in profiles.milestones_seen

const MILESTONE_CONTENT = {
  '3_dreams': {
    heading: 'The practice is taking root.',
    body: 'Three dreams recorded. The unconscious knows you are listening now — it will send more.',
    unlocks: 'Dream Archive and Waking Life are now open to you.',
    cta: 'Continue →',
    navigateTo: null,
  },
  '10_dreams': {
    heading: 'Ten dreams. A real practice.',
    body: 'Patterns are beginning to emerge across the boundary of sleep. The work has its own momentum now.',
    unlocks: 'My Journey is now available — the long view of where your psyche has been leading you.',
    cta: 'Show me my journey →',
    navigateTo: '/individuation',
  },
  '20_dreams_with_guide': {
    heading: 'The work has gone deep enough.',
    body: 'Twenty dreams. You have been at this long enough for the deeper material to trust you with it.',
    unlocks: <><JungianTerm id="active-imagination">Active Imagination</JungianTerm>, <JungianTerm id="shadow">Shadow Work</JungianTerm>, and Dream Series are now open.</>,
    cta: "I'm ready →",
    navigateTo: null,
  },
  '20_dreams_no_guide': {
    heading: 'The work has gone deep enough.',
    body: 'Twenty dreams. You have been at this long enough for the deeper material to trust you with it.',
    unlocks: <><JungianTerm id="active-imagination">Active Imagination</JungianTerm> and Dream Series are now open. <JungianTerm id="shadow">Shadow Work</JungianTerm> unlocks when you add a guide in Settings.</>,
    cta: 'Continue →',
    navigateTo: null,
  },
  'guide_added': {
    heading: 'A witness has been named.',
    body: 'The container is stronger now. What could only be held alone can be brought into relationship.',
    unlocks: 'Analyst Focus and Session Letter are now available.',
    cta: 'Continue →',
    navigateTo: null,
  },
};

export default function MilestoneModal({ milestone, onDismiss }) {
  const content = MILESTONE_CONTENT[milestone];
  if (!content) return null;

  function handleCta(navigate) {
    if (content.navigateTo && navigate) {
      navigate(content.navigateTo);
    }
    onDismiss();
  }

  return <MilestoneModalInner content={content} onDismiss={onDismiss} />;
}

// Separate inner component so we can use useNavigate cleanly
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import JungianTerm from './JungianTerm';

function MilestoneModalInner({ content, onDismiss }) {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Slight delay so the fade-in feels intentional
    setTimeout(() => setVisible(true), 60);
  }, []);

  function handleCta() {
    if (content.navigateTo) {
      navigate(content.navigateTo);
    }
    onDismiss();
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center px-6"
      style={{
        backgroundColor: 'rgba(26,18,32,0.88)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.4s ease',
      }}
    >
      <div
        className="w-full max-w-[520px] rounded-3xl px-10 py-12 text-center flex flex-col items-center gap-7"
        style={{ backgroundColor: '#faf7f2' }}
      >
        {/* Gold ornament */}
        <div style={{ fontSize: 28, color: '#b8924a', opacity: 0.7 }}>✦</div>

        <div className="space-y-4">
          <h2
            className="font-display italic text-ink leading-snug"
            style={{ fontSize: 34 }}
          >
            {content.heading}
          </h2>
          <p
            className="font-display text-ink/65 leading-[1.85]"
            style={{ fontSize: 17 }}
          >
            {content.body}
          </p>
        </div>

        {/* Unlocks notice */}
        <div
          className="w-full rounded-xl px-6 py-4 text-left"
          style={{ backgroundColor: 'rgba(184,146,74,0.08)', border: '1px solid rgba(184,146,74,0.2)' }}
        >
          <p className="text-xs font-body uppercase tracking-widest text-gold/70 mb-1.5" style={{ fontSize: 9 }}>
            Now unlocked
          </p>
          <p className="text-sm font-body text-ink/70 leading-relaxed">
            {content.unlocks}
          </p>
        </div>

        <button
          onClick={handleCta}
          className="text-sm font-body font-medium text-gold hover:opacity-70 transition-opacity mt-2"
        >
          {content.cta}
        </button>
      </div>
    </div>
  );
}
