import { useState } from 'react';
import { refineAnalysis } from '../lib/ai';

export default function ResonanceSection({ dream, onRefined, apiKey, alreadyRefined = false }) {
  const [score, setScore] = useState(null);
  const [note, setNote] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit() {
    if (!note.trim() || isRefining) return;
    setIsRefining(true);
    setError(null);
    try {
      const result = await refineAnalysis(dream, dream.structure, note, apiKey || null);
      onRefined(result, score, note);
      setScore(null);
      setNote('');
    } catch (err) {
      setError(err.message || 'The refinement could not be completed. Please try again.');
    } finally {
      setIsRefining(false);
    }
  }

  const hasNote = note.trim().length > 0;
  const highScore = score !== null && score >= 4;
  const lowScore = score !== null && score >= 1 && score <= 3;

  return (
    <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid rgba(184,146,74,0.2)' }}>
      {/* Already-refined indicator */}
      {alreadyRefined && (
        <p className="font-display italic" style={{ fontSize: 13, color: 'rgba(184,146,74,0.7)', marginBottom: '0.75rem' }}>
          ✦ Refined in dialogue · respond again to continue
        </p>
      )}

      {/* Label */}
      <p className="font-body uppercase" style={{ fontSize: 11, letterSpacing: '0.1em', color: 'rgba(42,36,32,0.4)', marginBottom: '0.5rem' }}>
        Resonance
      </p>

      {/* Heading */}
      <p className="font-display italic" style={{ fontSize: 20, color: '#3d2b4a', marginBottom: '1.25rem' }}>
        How much of this lands for you?
      </p>

      {/* Score circles */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div className="flex items-center gap-3" style={{ marginBottom: '0.35rem' }}>
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              onClick={() => setScore(score === n ? null : n)}
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                border: `1.5px solid ${score === n ? '#b8924a' : 'rgba(42,36,32,0.2)'}`,
                backgroundColor: score === n ? '#b8924a' : 'transparent',
                cursor: 'pointer',
                transition: 'border-color 0.15s, background-color 0.15s',
                flexShrink: 0,
              }}
              onMouseEnter={e => {
                if (score !== n) {
                  e.currentTarget.style.borderColor = '#b8924a';
                  e.currentTarget.style.backgroundColor = 'rgba(184,146,74,0.08)';
                }
              }}
              onMouseLeave={e => {
                if (score !== n) {
                  e.currentTarget.style.borderColor = 'rgba(42,36,32,0.2)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            />
          ))}
        </div>
        <div className="flex justify-between font-body" style={{ paddingLeft: 0, fontSize: 11, color: 'rgba(42,36,32,0.35)', width: 28 * 5 + 12 * 4 }}>
          <span>not at all</span>
          <span>fully</span>
        </div>
      </div>

      {/* Note textarea */}
      <div style={{ marginBottom: '1rem' }}>
        <p className="font-body uppercase" style={{ fontSize: 11, letterSpacing: '0.1em', color: 'rgba(42,36,32,0.4)', marginBottom: '0.4rem' }}>
          What feels off, or what would you add?
        </p>
        <textarea
          rows={4}
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder={"What doesn't resonate, what feels incomplete, or what you would add from your own knowing…"}
          className="w-full font-body text-sm text-ink resize-none focus:outline-none"
          style={{
            backgroundColor: '#faf7f2',
            border: '1px solid rgba(42,36,32,0.12)',
            borderRadius: 8,
            padding: '10px 12px',
            lineHeight: 1.6,
            transition: 'border-color 0.15s',
          }}
          onFocus={e => e.currentTarget.style.borderColor = '#3d2b4a'}
          onBlur={e => e.currentTarget.style.borderColor = 'rgba(42,36,32,0.12)'}
        />
      </div>

      {/* Submit area */}
      {isRefining ? (
        <p className="font-display italic" style={{ color: 'rgba(42,36,32,0.4)', fontSize: 15, animation: 'pulse 2s ease-in-out infinite' }}>
          Receiving what you've offered…
        </p>
      ) : hasNote ? (
        <button
          onClick={handleSubmit}
          className="font-body"
          style={{ color: '#b8924a', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 14 }}
        >
          Refine this analysis →
        </button>
      ) : highScore ? (
        <p className="font-display italic" style={{ color: 'rgba(42,36,32,0.35)', fontSize: 15 }}>
          Glad this landed. ✦
        </p>
      ) : (
        <div>
          <button
            disabled
            className="font-body"
            style={{ color: 'rgba(184,146,74,0.35)', background: 'none', border: 'none', padding: 0, cursor: 'default', fontSize: 14 }}
          >
            Refine this analysis →
          </button>
          {lowScore && (
            <p className="font-body" style={{ marginTop: '0.3rem', fontSize: 12, color: 'rgba(42,36,32,0.35)' }}>
              Add a note to refine the analysis
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="font-body" style={{ marginTop: '0.5rem', fontSize: 13, color: '#b84a4a' }}>
          {error}
        </p>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
      `}</style>
    </div>
  );
}
