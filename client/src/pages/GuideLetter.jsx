import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import PracticeOrientation from '../components/PracticeOrientation';
import { formatDate } from '../lib/constants';

export default function GuideLetter() {
  const { user, profile } = useAuth();

  const analystName = profile?.analyst_name || 'your analyst';
  const signerName = profile?.display_name || user?.email || '';

  // ── Dreams ────────────────────────────────────────────────────────────────
  const [availableDreams, setAvailableDreams] = useState([]);
  const [selectedDreamIds, setSelectedDreamIds] = useState(new Set());
  const [loadingDreams, setLoadingDreams] = useState(true);
  const [dreamsOpen, setDreamsOpen] = useState(true);

  // ── Waking life ───────────────────────────────────────────────────────────
  const [wakingEntries, setWakingEntries] = useState([]);
  const [selectedWakingIds, setSelectedWakingIds] = useState(new Set());
  const [wakingOpen, setWakingOpen] = useState(false);
  const [loadingWaking, setLoadingWaking] = useState(false);

  // ── FIX 2: user-written opening and closing (replaces AI opening + hardcoded signature) ──
  const [userOpening, setUserOpening] = useState('');
  const [userWords, setUserWords] = useState('');
  const [userClosing, setUserClosing] = useState('');
  // Auto-fill closing once with "Warmly, [name]" when profile loads; user can edit freely after
  const closingAutoFilled = useRef(false);
  useEffect(() => {
    if (!closingAutoFilled.current && signerName) {
      setUserClosing(`Warmly,\n${signerName}`);
      closingAutoFilled.current = true;
    }
  }, [signerName]);

  // ── UI ────────────────────────────────────────────────────────────────────
  const [copied, setCopied] = useState(false);
  const [previousLetters, setPreviousLetters] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  // ── Initial fetch ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetchDreams();
    fetchPreviousLetters();
  }, []);

  async function fetchDreams() {
    const { data } = await supabase
      .from('dreams')
      .select('id, dream_date, body, dreamer_associations, title, is_big_dream')
      .eq('user_id', user.id)
      .eq('has_analysis', true)
      .order('dream_date', { ascending: false })
      .limit(14);
    const dreams = data || [];
    setAvailableDreams(dreams);
    setSelectedDreamIds(new Set());
    setLoadingDreams(false);
  }

  async function fetchPreviousLetters() {
    const { data } = await supabase
      .from('guide_letters')
      .select('id, created_at, letter_text')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setPreviousLetters(data);
  }

  // ── FIX 1: Fetch waking life with fully inclusive date range ──────────────
  // entry_date may be a date or timestamptz column; appending T23:59:59 to the
  // end bound ensures entries on the final day are never excluded regardless of
  // column type or timezone handling.
  const fetchWakingEntries = useCallback(async (startDate, endDate) => {
    setLoadingWaking(true);
    const { data } = await supabase
      .from('waking_life_entries')
      .select('id, title, description, entry_type, entry_date')
      .eq('user_id', user.id)
      .gte('entry_date', startDate)
      .lte('entry_date', `${endDate}T23:59:59`)
      .order('entry_date', { ascending: true });
    setWakingEntries(data || []);
    setSelectedWakingIds(new Set());
    setLoadingWaking(false);
  }, [user.id]);

  useEffect(() => {
    const selected = availableDreams.filter(d => selectedDreamIds.has(d.id));
    if (selected.length === 0) {
      setWakingEntries([]);
      setSelectedWakingIds(new Set());
      return;
    }
    const dates = selected.map(d => d.dream_date).sort();
    // dates[0] is earliest, dates[last] is latest — same value when one dream selected,
    // which is fine: the inclusive T23:59:59 bound covers the full single day.
    fetchWakingEntries(dates[0], dates[dates.length - 1]);
  }, [selectedDreamIds, availableDreams, fetchWakingEntries]);

  // ── Toggle helpers ────────────────────────────────────────────────────────
  function toggleDream(id) {
    setSelectedDreamIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleWaking(id) {
    setSelectedWakingIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // ── Letter assembly ───────────────────────────────────────────────────────
  function assembleLetterText() {
    const selectedDreams = availableDreams
      .filter(d => selectedDreamIds.has(d.id))
      .sort((a, b) => a.dream_date.localeCompare(b.dream_date));

    const selectedWaking = wakingEntries
      .filter(e => selectedWakingIds.has(e.id))
      .sort((a, b) => a.entry_date.localeCompare(b.entry_date));

    const hasContent =
      selectedDreams.length > 0 ||
      selectedWaking.length > 0 ||
      userOpening.trim() ||
      userWords.trim() ||
      userClosing.trim();

    if (!hasContent) return '';

    const lines = [];

    lines.push(`Dear ${analystName},`);

    if (userOpening.trim()) {
      lines.push('');
      lines.push(userOpening.trim());
    }

    if (selectedDreams.length > 0) {
      lines.push('');
      lines.push('────────────────────');
      lines.push('DREAMS');
      lines.push('────────────────────');
      lines.push('');
      selectedDreams.forEach((dream, i) => {
        if (i > 0) lines.push('');
        lines.push(formatDate(dream.dream_date));
        lines.push('');
        lines.push(dream.body || '');
        if (dream.dreamer_associations?.trim()) {
          lines.push('');
          lines.push(`What I noticed: ${dream.dreamer_associations.trim()}`);
        }
      });
    }

    if (selectedWaking.length > 0) {
      lines.push('');
      lines.push('────────────────────');
      lines.push('WAKING LIFE');
      lines.push('────────────────────');
      lines.push('');
      selectedWaking.forEach((entry, i) => {
        if (i > 0) lines.push('');
        lines.push(`${formatDate(entry.entry_date)}  ${entry.entry_type}`);
        lines.push(entry.title || '');
        if (entry.description?.trim()) {
          lines.push(entry.description.trim());
        }
      });
    }

    if (userWords.trim()) {
      lines.push('');
      lines.push('────────────────────');
      lines.push('');
      lines.push(userWords.trim());
    }

    if (userClosing.trim()) {
      lines.push('');
      lines.push(userClosing.trim());
    }

    return lines.join('\n');
  }

  const letterText = assembleLetterText();
  const hasLetterContent = !!letterText;

  async function handleCopy() {
    await navigator.clipboard.writeText(letterText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleEmail() {
    const selectedDreams = availableDreams
      .filter(d => selectedDreamIds.has(d.id))
      .sort((a, b) => a.dream_date.localeCompare(b.dream_date));
    const dates = selectedDreams.map(d => d.dream_date).sort();
    let subject = 'Dreams';
    if (dates.length === 1) subject = `Dreams — ${formatDate(dates[0])}`;
    else if (dates.length > 1) subject = `Dreams — ${formatDate(dates[0])} – ${formatDate(dates[dates.length - 1])}`;
    const gmailUrl = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(profile.analyst_email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(letterText)}`;
    window.open(gmailUrl, '_blank');
  }

  // ── Shared textarea style ─────────────────────────────────────────────────
  const textareaClass = 'w-full px-4 py-3 rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 text-sm font-body text-ink dark:text-white/80 placeholder-ink/25 dark:placeholder-white/20 resize-none focus:outline-none focus:ring-2 focus:ring-gold/30';

  // ── Shared checkbox row ───────────────────────────────────────────────────
  function CheckRow({ selected, onClick, children }) {
    return (
      <button
        onClick={onClick}
        className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-150 ${
          selected
            ? 'border-gold/40 bg-white/70 dark:bg-white/8'
            : 'border-black/8 dark:border-white/8 bg-white/30 dark:bg-white/3 opacity-50 hover:opacity-75'
        }`}
        style={selected ? { borderLeft: '3px solid #b8924a' } : {}}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">{children}</div>
          <div
            className={`shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
              selected ? 'border-gold bg-gold/20' : 'border-black/20 dark:border-white/20'
            }`}
          >
            {selected && <span className="text-gold text-xs leading-none">✓</span>}
          </div>
        </div>
      </button>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto px-6 py-10">

      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display italic text-4xl text-ink dark:text-white mb-2">
          Session Letter
        </h1>
        <p className="text-sm font-body text-ink/50 dark:text-white/40">
          A transmission from the psyche, assembled for {analystName}
        </p>
      </div>

      <PracticeOrientation storageKey="orient_letter">
        <p>The session letter is a bridge between the inner work you do alone and the work you do with your guide. It gathers the dreams, the symbols, the questions — and holds them in a form that another person can receive.</p>
        <p>Write it for your guide, but also for yourself. Sometimes the act of composing it reveals what you most need to bring.</p>
      </PracticeOrientation>

      {/* Two-column layout */}
      <div className="mt-8 lg:grid lg:grid-cols-[1fr_1fr] lg:gap-10 xl:grid-cols-[5fr_6fr]">

        {/* ── Left: Selection ── */}
        <div className="space-y-8">

          {/* FIX 2: Opening field — above dreams, in the user's own voice */}
          <div>
            <p className="text-xs uppercase tracking-widest font-body text-ink/40 dark:text-white/30 mb-2">
              How you want to open
            </p>
            <textarea
              value={userOpening}
              onChange={e => setUserOpening(e.target.value)}
              rows={3}
              placeholder="What's been alive lately, what you're bringing, how you've been…"
              className={textareaClass}
            />
          </div>

          {/* Section 1 — Dreams (collapsible with maxHeight transition) */}
          <div>
            <button
              onClick={() => setDreamsOpen(v => !v)}
              className="w-full flex items-center justify-between py-1 group"
            >
              <span className="text-xs uppercase tracking-widest font-body text-ink/40 dark:text-white/30 group-hover:text-ink/60 dark:group-hover:text-white/50 transition-colors">
                Dreams
              </span>
              <div className="flex items-center gap-3 ml-4">
                <span
                  className={`text-xs font-body normal-case text-gold/70 transition-opacity duration-200 ${
                    dreamsOpen ? 'opacity-0' : 'opacity-100'
                  }`}
                >
                  {selectedDreamIds.size > 0 ? `${selectedDreamIds.size} selected` : ''}
                </span>
                <span
                  className="text-ink/25 dark:text-white/20 text-lg leading-none shrink-0 transition-transform duration-200"
                  style={{ display: 'inline-block', transform: dreamsOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
                >›</span>
              </div>
            </button>

            <div
              style={{
                maxHeight: dreamsOpen ? '4000px' : '0',
                overflow: 'hidden',
                opacity: dreamsOpen ? 1 : 0,
                transition: 'max-height 0.3s ease, opacity 0.2s ease',
              }}
            >
              <div className="pt-3">
                {loadingDreams ? (
                  <p className="text-sm font-body text-ink/40 dark:text-white/30 italic">Loading…</p>
                ) : availableDreams.length === 0 ? (
                  <p className="text-sm font-body text-ink/40 dark:text-white/30 italic">
                    No analyzed dreams yet. Record and analyze a dream to get started.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {availableDreams.map(dream => (
                      <CheckRow
                        key={dream.id}
                        selected={selectedDreamIds.has(dream.id)}
                        onClick={() => toggleDream(dream.id)}
                      >
                        <p className="text-sm font-body font-medium text-ink dark:text-white truncate">
                          {dream.title || 'Untitled'}
                          {dream.is_big_dream && <span className="ml-1.5 text-gold/70 text-xs">✦</span>}
                        </p>
                        <p className="text-xs font-body text-ink/40 dark:text-white/30 mt-0.5">
                          {formatDate(dream.dream_date)}
                        </p>
                      </CheckRow>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 2 — Waking Life (collapsible) */}
          <div>
            <button
              onClick={() => setWakingOpen(v => !v)}
              className="flex items-center gap-2 mb-3 group"
            >
              <span className="text-xs uppercase tracking-widest font-body text-ink/40 dark:text-white/30">
                Waking Life
              </span>
              {selectedWakingIds.size > 0 && (
                <span className="text-xs font-body normal-case text-gold/70">{selectedWakingIds.size} selected</span>
              )}
              <span
                className="text-ink/25 dark:text-white/20 text-base leading-none transition-transform duration-200"
                style={{ display: 'inline-block', transform: wakingOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
              >›</span>
            </button>

            {wakingOpen && (
              <div>
                {selectedDreamIds.size === 0 ? (
                  <p className="text-sm font-body text-ink/40 dark:text-white/30 italic">
                    Select dreams above to load waking life entries from that period.
                  </p>
                ) : loadingWaking ? (
                  <p className="text-sm font-body text-ink/40 dark:text-white/30 italic">Loading…</p>
                ) : wakingEntries.length === 0 ? (
                  <p className="text-sm font-body text-ink/40 dark:text-white/30 italic">
                    No waking life entries found in this period.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {wakingEntries.map(entry => (
                      <CheckRow
                        key={entry.id}
                        selected={selectedWakingIds.has(entry.id)}
                        onClick={() => toggleWaking(entry.id)}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            style={{
                              fontSize: 9,
                              letterSpacing: '0.14em',
                              textTransform: 'uppercase',
                              fontFamily: 'monospace',
                              opacity: 0.6,
                            }}
                            className="text-ink dark:text-white"
                          >
                            {entry.entry_type}
                          </span>
                          <span className="text-xs font-body text-ink/35 dark:text-white/25">
                            {formatDate(entry.entry_date)}
                          </span>
                        </div>
                        <p className="text-sm font-body font-medium text-ink dark:text-white truncate mt-0.5">
                          {entry.title || 'Untitled'}
                        </p>
                      </CheckRow>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 3 — Anything you want to say */}
          <div>
            <p className="text-xs uppercase tracking-widest font-body text-ink/40 dark:text-white/30 mb-2">
              Anything you want to say to {analystName}
            </p>
            <textarea
              value={userWords}
              onChange={e => setUserWords(e.target.value)}
              rows={4}
              placeholder="Questions, what's been alive, what you're noticing…"
              className={textareaClass}
            />
          </div>

          {/* FIX 2: Closing field */}
          <div>
            <p className="text-xs uppercase tracking-widest font-body text-ink/40 dark:text-white/30 mb-2">
              How you want to close
            </p>
            <textarea
              value={userClosing}
              onChange={e => setUserClosing(e.target.value)}
              rows={2}
              placeholder={signerName ? `Warmly,\n${signerName}` : 'Warmly,'}
              className={textareaClass}
            />
          </div>
        </div>

        {/* ── Right: Letter preview ── */}
        <div className="mt-10 lg:mt-0">
          <div className="lg:sticky lg:top-8">
            <p className="text-xs uppercase tracking-widest font-body text-ink/40 dark:text-white/30 mb-3">
              Letter
            </p>

            {hasLetterContent ? (
              <>
                <div className="rounded-2xl border border-black/8 dark:border-white/8 bg-white/50 dark:bg-white/3 px-7 py-7 mb-5 max-h-[65vh] overflow-y-auto">
                  <pre
                    className="font-display italic text-[17px] leading-[1.85] text-ink dark:text-white/85 whitespace-pre-wrap break-words"
                    style={{ fontFamily: '"Cormorant Garamond", serif' }}
                  >
                    {letterText}
                  </pre>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleCopy}
                    className="px-5 py-2.5 rounded-xl font-body text-sm font-medium text-white bg-plum transition-opacity hover:opacity-90"
                  >
                    {copied ? 'Copied ✓' : 'Copy letter'}
                  </button>
                  {profile?.analyst_email && (
                    <button
                      onClick={handleEmail}
                      className="px-5 py-2.5 rounded-xl font-body text-sm font-medium border border-black/15 dark:border-white/15 text-ink/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      Email to {profile?.analyst_name || 'analyst'}
                    </button>
                  )}
                  <button
                    onClick={() => window.print()}
                    className="px-5 py-2.5 rounded-xl font-body text-sm font-medium border border-black/15 dark:border-white/15 text-ink/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    Print / Save as PDF
                  </button>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-black/8 dark:border-white/8 bg-white/30 dark:bg-white/2 px-7 py-10 text-center">
                <p className="text-sm font-body text-ink/30 dark:text-white/20 italic">
                  Write an opening or select dreams to begin composing the letter.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Previous letters ── */}
      {previousLetters.length > 0 && (
        <div className="mt-16 border-t border-black/8 dark:border-white/8 pt-8">
          <h2 className="text-xs uppercase tracking-widest font-body text-ink/40 dark:text-white/30 mb-4">
            Previous Letters
          </h2>
          <div className="space-y-2">
            {previousLetters.map(letter => (
              <div key={letter.id} className="border border-black/8 dark:border-white/8 rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedId(expandedId === letter.id ? null : letter.id)}
                  className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-black/3 dark:hover:bg-white/3 transition-colors"
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
                    <p
                      className="font-display italic text-[16px] leading-[1.9] text-ink/75 dark:text-white/65 whitespace-pre-wrap"
                      style={{ fontFamily: '"Cormorant Garamond", serif' }}
                    >
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
