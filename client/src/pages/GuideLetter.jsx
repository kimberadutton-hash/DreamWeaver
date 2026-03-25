import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { generateGuideLetter, hasApiKey } from '../lib/ai';
import AiErrorMessage from '../components/AiErrorMessage';
import { formatDate } from '../lib/constants';

// Renders a multi-paragraph letter field (AI may use \n\n between paragraphs)
function LetterSection({ text }) {
  if (!text) return null;
  const paragraphs = text.split(/\n\n+/).map(p => p.trim()).filter(Boolean);
  return (
    <>
      {paragraphs.map((para, i) => (
        <p key={i}>{para}</p>
      ))}
    </>
  );
}

export default function GuideLetter() {
  const { user, profile } = useAuth();

  const [generating, setGenerating] = useState(false);
  const [letterJson, setLetterJson] = useState(null);
  const [letterPlainText, setLetterPlainText] = useState('');
  const [aiError, setAiError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previousLetters, setPreviousLetters] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [dreamRange, setDreamRange] = useState({ start: null, end: null });
  const [keyPresent, setKeyPresent] = useState(hasApiKey);

  const guideName = profile?.analyst_name || 'Guide';

  useEffect(() => {
    fetchPreviousLetters();
    setKeyPresent(hasApiKey());
  }, []);

  async function fetchPreviousLetters() {
    const { data } = await supabase
      .from('guide_letters')
      .select('id, created_at, letter_text')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setPreviousLetters(data);
  }

  async function handleGenerate() {
    setGenerating(true);
    setAiError(null);
    setLetterJson(null);
    setSaved(false);

    try {
      // Last 7 analyzed dreams
      const { data: dreamsData } = await supabase
        .from('dreams')
        .select('dream_date, title, body, reflection, embodiment_prompt, archetypes, symbols, is_big_dream, mood')
        .eq('user_id', user.id)
        .eq('has_analysis', true)
        .order('dream_date', { ascending: false })
        .limit(7);

      // Active analyst focus
      const { data: focusData } = await supabase
        .from('analyst_focuses')
        .select('focus_text')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .single();

      // Embodiment responses from past 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: embodimentData } = await supabase
        .from('dreams')
        .select('title, embodiment_response')
        .eq('user_id', user.id)
        .not('embodiment_response', 'is', null)
        .gte('embodiment_checked_at', thirtyDaysAgo);

      if (dreamsData?.length) {
        setDreamRange({
          start: dreamsData[dreamsData.length - 1]?.dream_date,
          end: dreamsData[0]?.dream_date,
        });
      }

      const json = await generateGuideLetter({
        guideName,
        recentDreams: dreamsData || [],
        activeAnalystFocus: focusData?.focus_text || null,
        embodimentResponses: (embodimentData || []).map(d => ({
          dreamTitle: d.title || 'Untitled',
          response: d.embodiment_response,
        })),
      });

      setLetterJson(json);
      setLetterPlainText(jsonToPlainText(json));
    } catch (err) {
      setAiError(err);
    } finally {
      setGenerating(false);
    }
  }

  function jsonToPlainText(json) {
    return [
      json.greeting,
      json.opening,
      json.significantDreams,
      json.patterns,
      json.embodimentNotes,
      json.questions,
      json.closing,
    ].filter(Boolean).join('\n\n');
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(letterPlainText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSend() {
    if (!profile?.analyst_email) {
      alert(`Add ${guideName}'s email address in Settings first.`);
      return;
    }
    const monthYear = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const subject = encodeURIComponent(`Dream work — ${monthYear}`);
    const body = encodeURIComponent(letterPlainText);
    window.open(`mailto:${profile.analyst_email}?subject=${subject}&body=${body}`);
  }

  async function handleSave() {
    if (saving || saved) return;
    setSaving(true);
    await supabase.from('guide_letters').insert({
      user_id: user.id,
      letter_text: letterPlainText,
      letter_json: letterJson,
      date_range_start: dreamRange.start,
      date_range_end: dreamRange.end,
    });
    setSaving(false);
    setSaved(true);
    fetchPreviousLetters();
  }

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">

      {/* ── Header ── */}
      <div className="mb-10">
        <h1 className="font-display italic text-4xl text-ink dark:text-white mb-2">
          Session Letter
        </h1>
        <p className="text-sm font-body text-ink/50 dark:text-white/40">
          A summary of recent inner work for {guideName}
        </p>
      </div>

      {/* ── No API key banner ── */}
      {!keyPresent && (
        <div className="mb-6 flex items-start justify-between gap-4 px-5 py-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <p className="text-sm font-body text-amber-800 dark:text-amber-300 leading-relaxed">
            AI features require an Anthropic API key. Add yours in Settings to get started.{' '}
            <span className="opacity-70">Get a free key at console.anthropic.com.</span>
          </p>
          <Link to="/settings" className="shrink-0 text-sm font-body font-medium text-amber-800 dark:text-amber-300 underline hover:no-underline">
            Settings →
          </Link>
        </div>
      )}

      {/* ── Generate button ── */}
      {!letterJson && (
        <div className="mb-8">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-6 py-3 rounded-xl font-body text-sm font-medium text-white bg-plum disabled:opacity-50 transition-opacity"
          >
            {generating ? 'Reading your recent dreams…' : 'Generate letter'}
          </button>
          {generating && (
            <p className="mt-3 text-xs font-body text-ink/40 dark:text-white/30 italic">
              This takes a moment — your dreams are being read carefully.
            </p>
          )}
        </div>
      )}

      {aiError && <div className="mb-6"><AiErrorMessage error={aiError} /></div>}

      {/* ── Letter display ── */}
      {letterJson && (
        <div className="mb-10">
          <div className="max-w-[680px] mx-auto">
            <div className="font-display text-[18px] leading-[1.9] text-ink dark:text-white/90 space-y-6">
              <p>{letterJson.greeting}</p>
              <LetterSection text={letterJson.opening} />
              <LetterSection text={letterJson.significantDreams} />
              <LetterSection text={letterJson.patterns} />
              {letterJson.embodimentNotes && <LetterSection text={letterJson.embodimentNotes} />}
              <LetterSection text={letterJson.questions} />
              <p>{letterJson.closing}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-10 max-w-[680px] mx-auto border-t border-black/8 dark:border-white/8 pt-6 flex flex-wrap gap-3">
            <button
              onClick={handleSend}
              className="px-5 py-2.5 rounded-xl font-body text-sm font-medium text-white bg-plum transition-opacity hover:opacity-90"
            >
              Send to {guideName}
            </button>
            <button
              onClick={handleCopy}
              className="px-5 py-2.5 rounded-xl font-body text-sm font-medium border border-black/15 dark:border-white/15 text-ink/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              {copied ? 'Copied ✓' : 'Copy letter'}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || saved}
              className="px-5 py-2.5 rounded-xl font-body text-sm font-medium border border-black/15 dark:border-white/15 text-ink/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              {saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save this letter'}
            </button>
            <button
              onClick={() => window.print()}
              className="px-5 py-2.5 rounded-xl font-body text-sm font-medium border border-black/15 dark:border-white/15 text-ink/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              Print
            </button>
            <button
              onClick={() => { setLetterJson(null); setSaved(false); setAiError(null); }}
              className="px-5 py-2.5 rounded-xl font-body text-sm text-ink/35 dark:text-white/25 hover:text-ink/55 dark:hover:text-white/45 transition-colors"
            >
              ← Generate new
            </button>
          </div>
        </div>
      )}

      {/* ── Previous letters ── */}
      {previousLetters.length > 0 && (
        <div className="mt-12 border-t border-black/8 dark:border-white/8 pt-8">
          <h2 className="text-xs uppercase tracking-widest font-body text-ink/40 dark:text-white/30 mb-4">
            Previous Letters
          </h2>
          <div className="space-y-2">
            {previousLetters.map(letter => (
              <div key={letter.id} className="border border-black/8 dark:border-white/8 rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedId(expandedId === letter.id ? null : letter.id)}
                  className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-black/3 dark:hover:bg-white/3 transition-colors group"
                >
                  <span className="text-sm font-body text-ink/60 dark:text-white/50 shrink-0 mr-4">
                    {formatDate(letter.created_at.slice(0, 10))}
                  </span>
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="text-xs font-body text-ink/30 dark:text-white/20 truncate">
                      {letter.letter_text?.slice(0, 80)}{letter.letter_text?.length > 80 ? '…' : ''}
                    </span>
                    <span
                      className="text-ink/25 dark:text-white/20 text-lg leading-none shrink-0 transition-transform duration-200"
                      style={{ display: 'inline-block', transform: expandedId === letter.id ? 'rotate(90deg)' : 'rotate(0deg)' }}
                    >›</span>
                  </div>
                </button>
                {expandedId === letter.id && (
                  <div className="px-5 pb-6 pt-3 border-t border-black/6 dark:border-white/6">
                    <p className="font-display text-[16px] leading-[1.9] text-ink/75 dark:text-white/65 whitespace-pre-wrap">
                      {letter.letter_text}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
