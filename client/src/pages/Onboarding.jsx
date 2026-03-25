import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { todayString } from '../lib/constants';

// Mandala SVG — used in Step 3
function Mandala() {
  return (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gold" style={{ width: 120, height: 120 }}>
      <circle cx="40" cy="40" r="37" stroke="currentColor" strokeWidth="0.7" opacity="0.3"/>
      <circle cx="40" cy="40" r="26" stroke="currentColor" strokeWidth="0.7" opacity="0.45"/>
      <circle cx="40" cy="40" r="14" stroke="currentColor" strokeWidth="0.7" opacity="0.55"/>
      <circle cx="40" cy="40" r="5" fill="currentColor" opacity="0.7"/>
      {/* Cardinal spokes */}
      <line x1="40" y1="3" x2="40" y2="14" stroke="currentColor" strokeWidth="1.1" opacity="0.6"/>
      <line x1="40" y1="66" x2="40" y2="77" stroke="currentColor" strokeWidth="1.1" opacity="0.6"/>
      <line x1="3" y1="40" x2="14" y2="40" stroke="currentColor" strokeWidth="1.1" opacity="0.6"/>
      <line x1="66" y1="40" x2="77" y2="40" stroke="currentColor" strokeWidth="1.1" opacity="0.6"/>
      {/* Diagonal spokes */}
      <line x1="11" y1="11" x2="19" y2="19" stroke="currentColor" strokeWidth="0.9" opacity="0.4"/>
      <line x1="61" y1="61" x2="69" y2="69" stroke="currentColor" strokeWidth="0.9" opacity="0.4"/>
      <line x1="69" y1="11" x2="61" y2="19" stroke="currentColor" strokeWidth="0.9" opacity="0.4"/>
      <line x1="19" y1="61" x2="11" y2="69" stroke="currentColor" strokeWidth="0.9" opacity="0.4"/>
      {/* Petals */}
      <path d="M 40 14 C 43.5 22 43.5 31 40 35 C 36.5 31 36.5 22 40 14 Z" fill="currentColor" opacity="0.2"/>
      <path d="M 40 66 C 43.5 58 43.5 49 40 45 C 36.5 49 36.5 58 40 66 Z" fill="currentColor" opacity="0.2"/>
      <path d="M 14 40 C 22 43.5 31 43.5 35 40 C 31 36.5 22 36.5 14 40 Z" fill="currentColor" opacity="0.2"/>
      <path d="M 66 40 C 58 43.5 49 43.5 45 40 C 49 36.5 58 36.5 66 40 Z" fill="currentColor" opacity="0.2"/>
      {/* Diagonal petals (lighter) */}
      <path d="M 19 19 C 24 26 26 32 26 35 C 23 33 20 29 19 19 Z" fill="currentColor" opacity="0.12"/>
      <path d="M 61 61 C 56 54 54 48 54 45 C 57 47 60 51 61 61 Z" fill="currentColor" opacity="0.12"/>
      <path d="M 61 19 C 56 26 54 32 54 35 C 57 33 60 29 61 19 Z" fill="currentColor" opacity="0.12"/>
      <path d="M 19 61 C 24 54 26 48 26 45 C 23 47 20 51 19 61 Z" fill="currentColor" opacity="0.12"/>
    </svg>
  );
}

const WORKING_TOGETHER_OPTIONS = [
  'Just beginning',
  'Less than a year',
  '1–3 years',
  '3–5 years',
  'More than 5 years',
];

const MEETING_FREQUENCY_OPTIONS = [
  'Weekly',
  'Every two weeks',
  'Monthly',
  'Irregularly but consistently',
];

export default function Onboarding() {
  const { updateProfile } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [visible, setVisible] = useState(true);
  const [saving, setSaving] = useState(false);

  const [guideForm, setGuideForm] = useState({
    analyst_name: '',
    analyst_email: '',
    working_together_length: '',
    meeting_frequency: '',
  });

  function setGuideField(key, val) {
    setGuideForm(f => ({ ...f, [key]: val }));
  }

  function fadeTo(newStep) {
    setVisible(false);
    setTimeout(() => {
      setStep(newStep);
      setVisible(true);
    }, 200);
  }

  function next() { fadeTo(step + 1); }
  function back() { fadeTo(step - 1); }

  async function complete(destination) {
    setSaving(true);
    await updateProfile({
      ...guideForm,
      analyst_name: guideForm.analyst_name.trim() || 'Analyst',
      analyst_email: guideForm.analyst_email.trim() || null,
      working_together_length: guideForm.working_together_length || null,
      meeting_frequency: guideForm.meeting_frequency || null,
      onboarding_complete: true,
      onboarding_completed_at: new Date().toISOString(),
    });
    setSaving(false);
    navigate(destination, { replace: true });
  }

  const guideNameForButton = guideForm.analyst_name.trim();

  return (
    <div className="min-h-screen bg-parchment dark:bg-gray-950 flex flex-col items-center justify-center px-6 py-12">
      {/* Step content */}
      <div
        className="w-full max-w-[640px] flex flex-col items-center text-center"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 300ms ease' }}
      >

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <div className="space-y-8">
            <h1 className="font-display italic text-ink dark:text-white leading-snug"
              style={{ fontSize: 42 }}>
              Something has been trying<br />to reach you.
            </h1>
            <p className="font-display text-ink/70 dark:text-white/70 leading-[1.9] mx-auto"
              style={{ fontSize: 20, maxWidth: 520 }}>
              Every night, while you sleep, an intelligence older and wiser than your waking mind
              sends you messages. Not randomly — with intention. With persistence. With a kind of
              loving ruthlessness that will not let you stay small.
              <br /><br />
              The Jungians call this the individuation process. The process of becoming who you
              actually are.
              <br /><br />
              This is where that work lives.
            </p>
            <button onClick={next} className="mt-4 text-sm font-body font-medium text-gold hover:opacity-70 transition-opacity">
              Tell me more →
            </button>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <div className="space-y-8">
            <h1 className="font-display italic text-ink dark:text-white leading-snug"
              style={{ fontSize: 42 }}>
              This is not a wellness app.
            </h1>
            <p className="font-display text-ink/70 dark:text-white/70 leading-[1.9] mx-auto"
              style={{ fontSize: 20, maxWidth: 520 }}>
              It will not congratulate you for your streak. It will not gamify your inner life.
              It will not tell you that everything happens for a reason.
              <br /><br />
              It will help you go down.
              <br /><br />
              Down into the material your waking mind has been avoiding. Down into the figures
              that appear in your dreams because they cannot get your attention any other way.
              Down into the architecture of who you actually are beneath the performance of yourself.
              <br /><br />
              This work is not comfortable.<br />
              It is also not optional — not if you want to be fully alive.
            </p>
            <button onClick={next} className="mt-4 text-sm font-body font-medium text-gold hover:opacity-70 transition-opacity">
              I understand →
            </button>
          </div>
        )}

        {/* ── STEP 3 ── */}
        {step === 3 && (
          <div className="space-y-8 flex flex-col items-center">
            <h1 className="font-display italic text-gold leading-snug"
              style={{ fontSize: 42 }}>
              The Dream Weaver
            </h1>
            <div
              style={{
                animation: 'breathe 4s ease-in-out infinite',
              }}
            >
              <Mandala />
            </div>
            <p className="font-display text-ink/70 dark:text-white/70 leading-[1.9] mx-auto"
              style={{ fontSize: 20, maxWidth: 520 }}>
              Something sends you dreams.
              <br /><br />
              Not your brain processing the day's events — or not only that. Something that knows
              you more completely than your conscious mind does. Something that has been watching
              the whole arc of your life and knows what you need to encounter next.
              <br /><br />
              Jungians call this the Self — the larger organizing intelligence of the whole psyche.
              <br /><br />
              This app carries that name as an acknowledgment of what is actually at work here.
            </p>
            <button onClick={next} className="mt-4 text-sm font-body font-medium text-gold hover:opacity-70 transition-opacity">
              I'm listening →
            </button>
          </div>
        )}

        {/* ── STEP 4 ── */}
        {step === 4 && (
          <div className="space-y-8 w-full">
            <div>
              <h1 className="font-display italic text-ink dark:text-white leading-snug mb-6"
                style={{ fontSize: 42 }}>
                You cannot do this alone.
              </h1>
              <p className="font-display text-ink/70 dark:text-white/70 leading-[1.9] mx-auto mb-8"
                style={{ fontSize: 20, maxWidth: 520 }}>
                The unconscious material you will encounter here needs a human container. Someone
                who has walked this territory themselves. Someone who can witness what arises
                without being swept away.
                <br /><br />
                Before you begin, tell us who that person is.
              </p>
            </div>

            <div className="text-left space-y-5 max-w-[520px] mx-auto">
              <div>
                <label className="field-label">Your analyst, therapist, or guide</label>
                <input
                  type="text"
                  value={guideForm.analyst_name}
                  onChange={e => setGuideField('analyst_name', e.target.value)}
                  placeholder="Their name"
                  className="field-input"
                  autoFocus
                />
              </div>
              <div>
                <label className="field-label">Their email <span className="normal-case tracking-normal text-xs text-ink/30 font-body font-normal">(optional — for the session letter feature)</span></label>
                <input
                  type="email"
                  value={guideForm.analyst_email}
                  onChange={e => setGuideField('analyst_email', e.target.value)}
                  placeholder="therapist@example.com"
                  className="field-input"
                />
              </div>
              <div>
                <label className="field-label">How long have you been working together?</label>
                <select
                  value={guideForm.working_together_length}
                  onChange={e => setGuideField('working_together_length', e.target.value)}
                  className="field-input"
                >
                  <option value="">Select…</option>
                  {WORKING_TOGETHER_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">How often do you meet?</label>
                <select
                  value={guideForm.meeting_frequency}
                  onChange={e => setGuideField('meeting_frequency', e.target.value)}
                  className="field-input"
                >
                  <option value="">Select…</option>
                  {MEETING_FREQUENCY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <p className="text-xs font-body text-ink/30 dark:text-white/25 italic leading-relaxed pt-1">
                If you don't have a guide yet, you can still explore — but we encourage you to find
                one. This work deserves a witness.
              </p>
            </div>

            <button
              onClick={next}
              className="text-sm font-body font-medium text-gold hover:opacity-70 transition-opacity"
            >
              {guideNameForButton ? `I work with ${guideNameForButton} →` : 'Continue →'}
            </button>
          </div>
        )}

        {/* ── STEP 5 ── */}
        {step === 5 && (
          <div className="space-y-8 w-full">
            <div>
              <h1 className="font-display italic text-ink dark:text-white leading-snug mb-4"
                style={{ fontSize: 42 }}>
                What did you dream last night?
              </h1>
              <p className="font-display text-ink/50 dark:text-white/40 leading-relaxed mx-auto"
                style={{ fontSize: 16, maxWidth: 480 }}>
                Or last week. Or the dream you still remember from years ago that has never left you.
                <br /><br />
                Start wherever feels true.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-[520px] mx-auto w-full">
              <button
                onClick={() => complete('/new')}
                disabled={saving}
                className="p-7 rounded-2xl border border-plum/20 bg-plum/5 hover:bg-plum/10 dark:hover:bg-white/8 transition-colors text-left disabled:opacity-50"
              >
                <p className="font-display italic text-xl text-ink dark:text-white mb-2">
                  Record a dream now
                </p>
                <p className="text-xs font-body text-ink/40 dark:text-white/35 leading-relaxed">
                  Begin with what the Dream Weaver sent last night
                </p>
              </button>

              <button
                onClick={() => complete('/archive')}
                disabled={saving}
                className="p-7 rounded-2xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left disabled:opacity-50"
              >
                <p className="font-display italic text-xl text-ink dark:text-white mb-2">
                  I'll begin tomorrow
                </p>
                <p className="text-xs font-body text-ink/40 dark:text-white/35 leading-relaxed">
                  The archive will be waiting when you're ready
                </p>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Progress dots */}
      <div className="fixed bottom-8 left-0 right-0 flex justify-center gap-2.5">
        {[1, 2, 3, 4, 5].map(n => (
          <div
            key={n}
            className={`rounded-full transition-all duration-300 ${
              n === step
                ? 'w-4 h-2 bg-gold'
                : 'w-2 h-2 bg-black/15 dark:bg-white/15'
            }`}
          />
        ))}
      </div>

      {/* Back button */}
      {step > 1 && step < 5 && (
        <button
          onClick={back}
          className="fixed bottom-8 left-8 text-xs font-body text-ink/30 dark:text-white/25 hover:text-ink/60 dark:hover:text-white/50 transition-colors"
        >
          ← Back
        </button>
      )}

      {/* Breathing animation for mandala */}
      <style>{`
        @keyframes breathe {
          0%, 100% { transform: scale(1.0); opacity: 0.85; }
          50% { transform: scale(1.04); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
