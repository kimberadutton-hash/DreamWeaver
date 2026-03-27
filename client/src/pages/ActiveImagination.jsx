import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { prepareImagination, reflectOnSession, imaginationEmbodimentPrompt, AiError } from '../lib/ai';
import AiErrorMessage from '../components/AiErrorMessage';
import { formatDate, todayString } from '../lib/constants';

// ── Preparation Panel ──────────────────────────────────────────────────────

function PreparationPanel({ preparation, figureName }) {
  if (!preparation) return null;
  return (
    <div className="mt-4 rounded-2xl border border-black/8 dark:border-white/8 bg-white/40 dark:bg-white/3 overflow-hidden">
      <div className="px-6 pt-5 pb-1">
        <p className="font-body uppercase text-ink/30 dark:text-white/20 tracking-widest mb-5" style={{ fontSize: 9, letterSpacing: '0.18em' }}>
          before you begin
        </p>

        {/* Figure profile */}
        {preparation.figureProfile && (
          <div className="mb-6">
            <p className="font-display italic text-[17px] text-ink dark:text-white leading-[1.85]">
              {preparation.figureProfile}
            </p>
          </div>
        )}

        {/* Suggested opening */}
        {preparation.suggestedOpening && (
          <div className="mb-6">
            <p className="font-body uppercase text-ink/25 dark:text-white/20 tracking-widest mb-2" style={{ fontSize: 9, letterSpacing: '0.18em' }}>
              a possible first word
            </p>
            <p className="font-display italic text-[16px] leading-[1.8]" style={{ color: '#b8924a' }}>
              "{preparation.suggestedOpening}"
            </p>
            <p className="mt-1.5 text-xs font-body text-ink/25 dark:text-white/20">
              Use this, adapt it, or discard it. The opening is yours.
            </p>
          </div>
        )}

        {/* Questions to hold */}
        {preparation.questionsToHold?.length > 0 && (
          <div className="mb-6">
            <p className="font-body uppercase text-ink/25 dark:text-white/20 tracking-widest mb-3" style={{ fontSize: 9, letterSpacing: '0.18em' }}>
              questions worth bringing
            </p>
            <div className="space-y-2">
              {preparation.questionsToHold.map((q, i) => (
                <p key={i} className="font-display italic text-[15px] text-ink/60 dark:text-white/45 leading-relaxed">
                  {q}
                </p>
              ))}
            </div>
            <p className="mt-2 text-xs font-body text-ink/20 dark:text-white/15">
              Hold these internally — they do not need to be asked directly.
            </p>
          </div>
        )}

        {/* Caution */}
        {preparation.caution && (
          <div className="mb-6 pl-4 border-l-2 border-gold/40 bg-amber-50/50 dark:bg-amber-900/10 px-4 py-3 rounded-r-xl">
            <p className="text-sm font-body text-ink/65 dark:text-white/55 leading-relaxed">
              {preparation.caution}
            </p>
          </div>
        )}
      </div>

      {/* Note at bottom */}
      <div className="px-6 pb-5">
        <p className="text-xs font-body italic text-ink/20 dark:text-white/15 leading-relaxed">
          The figure's voice in this dialogue is yours — written by you, arising from your own depths. The preparation above draws from your dream archive to help you remember who this figure is. What they say is yours to discover.
        </p>
      </div>
    </div>
  );
}

// ── Setup Flow ─────────────────────────────────────────────────────────────

function SetupFlow({ initialDreamId, onSessionReady, onCancel, userId }) {
  const [step, setStep] = useState('form'); // 'form' | 'loading' | 'preparation'
  const [figureName, setFigureName] = useState('');
  const [figureDescription, setFigureDescription] = useState('');
  const [allDreams, setAllDreams] = useState([]);
  const [dreamQuery, setDreamQuery] = useState('');
  const [dreamDropdownOpen, setDreamDropdownOpen] = useState(false);
  const [selectedDream, setSelectedDream] = useState(null);
  const [preparation, setPreparation] = useState(null);
  const [createdSession, setCreatedSession] = useState(null);
  const [error, setError] = useState('');
  const [formExpanded, setFormExpanded] = useState(true);
  const [prepVisible, setPrepVisible] = useState(false);
  const dropdownRef = useRef(null);
  const prepRef = useRef(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('dreams')
        .select('id, title, dream_date, archetypes, symbols, body, summary')
        .eq('user_id', userId)
        .order('dream_date', { ascending: false })
        .limit(50);
      const dreams = data || [];
      setAllDreams(dreams);
      if (initialDreamId) {
        const pre = dreams.find(d => d.id === initialDreamId);
        if (pre) setSelectedDream(pre);
      }
    }
    load();
  }, [initialDreamId, userId]);

  useEffect(() => {
    function handleOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDreamDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const filteredDreams = dreamQuery.trim()
    ? allDreams.filter(d => (d.title || '').toLowerCase().includes(dreamQuery.toLowerCase()))
    : allDreams.slice(0, 8);

  // Reference chips — informational only
  const refChips = selectedDream
    ? [...(selectedDream.archetypes || []), ...(selectedDream.symbols || [])]
    : [];

  async function handlePrepare() {
    if (!figureName.trim()) { setError('Name this figure to begin.'); return; }
    setError('');
    setStep('loading');
    setPrepVisible(false);
    // Immediate scroll so user sees activity
    window.scrollBy({ top: 320, behavior: 'smooth' });
    try {
      // Find recent dreams where figure appears
      const nameLower = figureName.toLowerCase();
      const dreamArchetypes = selectedDream?.archetypes || [];
      const recent = allDreams.filter(d => {
        if (d.id === selectedDream?.id) return false;
        const inText = (d.body || '').toLowerCase().includes(nameLower) ||
          (d.title || '').toLowerCase().includes(nameLower);
        const inArchetypes = (d.archetypes || []).some(a =>
          a.toLowerCase().includes(nameLower) ||
          dreamArchetypes.some(da => da.toLowerCase() === a.toLowerCase())
        );
        return inText || inArchetypes;
      }).slice(0, 10);

      const recentDreamAppearances = recent.map(d => ({
        title: d.title || 'Untitled',
        date: d.dream_date,
        body_excerpt: (d.summary || d.body || '').slice(0, 200),
        archetypes: d.archetypes || [],
        symbols: d.symbols || [],
      }));

      const result = await prepareImagination({
        figureName: figureName.trim(),
        figureDescription: figureDescription.trim() || null,
        linkedDream: selectedDream || null,
        recentDreamAppearances,
      });

      // Create session record
      const { data: session, error: err } = await supabase
        .from('imagination_sessions')
        .insert({
          user_id: userId,
          figure_name: figureName.trim(),
          figure_description: figureDescription.trim() || null,
          linked_dream_id: selectedDream?.id || null,
          session_date: todayString(),
          messages: [],
          preparation_notes: JSON.stringify(result),
        })
        .select('*, linked_dream:dreams!linked_dream_id(id, title)')
        .single();
      if (err) throw err;

      setPreparation(result);
      setCreatedSession({ ...session, linked_dream_title: session.linked_dream?.title || null });
      setFormExpanded(false);
      setStep('preparation');
      // Scroll to panel then fade in
      setTimeout(() => {
        prepRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => setPrepVisible(true), 100);
      }, 80);
    } catch (e) {
      setError(e instanceof AiError ? e.message : (e.message || 'Something went wrong.'));
      setStep('form');
    }
  }

  return (
    <div className="mb-8">
      <div className="rounded-2xl border border-black/8 dark:border-white/8 bg-white/50 dark:bg-white/4 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display italic text-2xl text-ink dark:text-white">New session</h2>
          <button onClick={onCancel} className="text-ink/30 hover:text-ink/60 dark:text-white/30 dark:hover:text-white/60 transition-colors text-2xl leading-none">×</button>
        </div>

        {/* Collapsed summary bar */}
        {step === 'preparation' && !formExpanded ? (
          <div className="flex items-center justify-between py-1 mb-4">
            <p className="text-sm font-body text-ink/50 dark:text-white/40">
              <span className="font-display italic">{figureName}</span>
              {selectedDream && (
                <span className="text-ink/30 dark:text-white/25"> · {selectedDream.title || 'Untitled'}</span>
              )}
            </p>
            <button
              onClick={() => setFormExpanded(true)}
              className="text-xs font-body text-gold hover:text-gold/70 transition-colors ml-4 shrink-0"
            >
              Edit
            </button>
          </div>
        ) : (
          <>
            {/* Figure name */}
            <div className="mb-4">
              <label className="block font-body uppercase text-ink/40 dark:text-white/30 tracking-widest mb-1.5" style={{ fontSize: 9, letterSpacing: '0.15em' }}>
                Who do you want to address?
              </label>
              <input
                type="text"
                value={figureName}
                onChange={e => setFigureName(e.target.value)}
                placeholder="The shadow figure / The woman at the crossroads / The gatekeeper"
                className="w-full px-4 py-2.5 rounded-xl border border-black/10 bg-white/60 text-sm font-body text-ink placeholder-ink/25 focus:outline-none focus:ring-2 focus:ring-gold/40"
              />
              {/* Archetype chips from selected dream — informational */}
              {refChips.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {refChips.map(chip => (
                    <button
                      key={chip}
                      onClick={() => setFigureName(chip)}
                      className="px-2.5 py-0.5 rounded-full text-xs font-body transition-colors"
                      style={{
                        backgroundColor: 'rgba(61,43,74,0.07)',
                        color: 'rgba(61,43,74,0.6)',
                        border: '1px solid rgba(61,43,74,0.12)',
                      }}
                      title="Click to use as figure name"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Link to dream */}
            <div ref={dropdownRef} className="relative mb-4">
              <label className="block font-body uppercase text-ink/40 dark:text-white/30 tracking-widest mb-1.5" style={{ fontSize: 9, letterSpacing: '0.15em' }}>
                Link to a dream (optional)
              </label>
              <input
                type="text"
                value={selectedDream ? (selectedDream.title || 'Untitled') : dreamQuery}
                onChange={e => {
                  if (selectedDream) setSelectedDream(null);
                  setDreamQuery(e.target.value);
                  setDreamDropdownOpen(true);
                }}
                onFocus={() => setDreamDropdownOpen(true)}
                placeholder="Search your dreams…"
                className="w-full px-4 py-2.5 rounded-xl border border-black/10 bg-white/60 text-sm font-body text-ink placeholder-ink/25 focus:outline-none focus:ring-2 focus:ring-gold/40"
              />
              {selectedDream && (
                <button
                  onClick={() => { setSelectedDream(null); setDreamQuery(''); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/25 hover:text-ink/60 text-lg leading-none"
                  style={{ marginTop: 11 }}
                >×</button>
              )}
              {dreamDropdownOpen && !selectedDream && (
                <div className="absolute z-10 top-full mt-1 w-full bg-white dark:bg-gray-900 rounded-xl border border-black/10 shadow-lg max-h-48 overflow-y-auto">
                  {filteredDreams.length === 0
                    ? <p className="px-4 py-3 text-sm font-body text-ink/35">No dreams found</p>
                    : filteredDreams.map(d => (
                      <button
                        key={d.id}
                        onMouseDown={() => { setSelectedDream(d); setDreamDropdownOpen(false); setDreamQuery(''); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-black/5 text-sm font-body text-ink/80 flex items-center justify-between"
                      >
                        <span>{d.title || 'Untitled'}</span>
                        <span className="text-xs text-ink/30">{d.dream_date}</span>
                      </button>
                    ))
                  }
                </div>
              )}
            </div>

            {/* Figure description */}
            <div className="mb-5">
              <label className="block font-body uppercase text-ink/40 dark:text-white/30 tracking-widest mb-1.5" style={{ fontSize: 9, letterSpacing: '0.15em' }}>
                What do you know about this figure so far? (optional)
              </label>
              <textarea
                value={figureDescription}
                onChange={e => setFigureDescription(e.target.value)}
                rows={3}
                placeholder="How have they appeared? What feeling do they carry? What do they seem to want?"
                className="w-full px-4 py-2.5 rounded-xl border border-black/10 bg-white/60 text-sm font-body text-ink placeholder-ink/25 focus:outline-none focus:ring-2 focus:ring-gold/40 resize-none"
              />
            </div>
          </>
        )}

        {error && <p className="text-sm font-body text-red-400 mb-4">{error}</p>}

        <button
          onClick={handlePrepare}
          disabled={step === 'loading'}
          className="px-6 py-3 rounded-xl text-sm font-body transition-all duration-150"
          style={{ backgroundColor: '#3d2b4a', color: 'white', opacity: step === 'loading' ? 0.6 : 1 }}
        >
          {step === 'loading' ? 'Preparing…' : step === 'preparation' ? 'Re-prepare →' : 'Prepare for this session →'}
        </button>
      </div>

      {/* Preparation panel */}
      {step === 'preparation' && preparation && (
        <div
          ref={prepRef}
          style={{
            scrollMarginTop: 24,
            opacity: prepVisible ? 1 : 0,
            transition: 'opacity 400ms ease',
          }}
        >
          <PreparationPanel preparation={preparation} figureName={figureName} />
          <div className="mt-5">
            <button
              onClick={() => onSessionReady(createdSession)}
              className="px-6 py-3 rounded-xl text-sm font-body transition-all duration-150"
              style={{ backgroundColor: '#3d2b4a', color: 'white' }}
            >
              Enter the dialogue →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Session Card ───────────────────────────────────────────────────────────

function SessionCard({ session, onClick }) {
  const messages = session.messages || [];
  const lastMessage = messages[messages.length - 1];
  const isOpen = !session.closed_at;
  const excerpt = lastMessage?.content?.slice(0, 80) || '';

  return (
    <div
      onClick={() => onClick(session)}
      className="rounded-xl border border-black/8 dark:border-white/8 bg-white/40 dark:bg-white/3 hover:border-black/15 dark:hover:border-white/15 hover:bg-white/60 dark:hover:bg-white/5 transition-all duration-150 cursor-pointer px-5 py-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="shrink-0 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isOpen ? '#d4a460' : 'rgba(42,36,32,0.18)' }} />
            <h3 className="font-display italic text-[18px] text-ink dark:text-white leading-tight truncate">
              {session.figure_name}
            </h3>
          </div>
          {session.linked_dream_title && (
            <p className="text-xs font-body italic text-gold/70 dark:text-gold/50 ml-3.5 mb-1">
              ↳ from {session.linked_dream_title}
            </p>
          )}
          {excerpt && (
            <p className="text-sm font-body italic text-ink/40 dark:text-white/30 leading-relaxed line-clamp-1 ml-3.5">
              "{excerpt}{(lastMessage?.content?.length || 0) > 80 ? '…' : ''}"
            </p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs font-mono text-ink/25 dark:text-white/20 mb-1">{session.session_date}</p>
          {messages.length > 0 && (
            <p className="text-xs font-body text-ink/22 dark:text-white/18">
              {messages.length} exchange{messages.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Dialogue View ──────────────────────────────────────────────────────────

function DialogueView({ session: initialSession, onBack, onNewSession, onSessionUpdate, userId }) {
  const navigate = useNavigate();
  const [session, setSession] = useState(initialSession);
  const [messages, setMessages] = useState(initialSession.messages || []);
  const [inputText, setInputText] = useState('');
  const [inputVoice, setInputVoice] = useState('ego');
  const [saving, setSaving] = useState(false);
  const [showClosePanel, setShowClosePanel] = useState(false);
  const [closingReflection, setClosingReflection] = useState(initialSession.closing_reflection || '');
  const [requestReflection, setRequestReflection] = useState(true);
  const [closing, setClosing] = useState(false);
  const [showPreparation, setShowPreparation] = useState(false);
  const [isSessionClosed, setIsSessionClosed] = useState(!!initialSession.closed_at);
  const [closedAt, setClosedAt] = useState(initialSession.closed_at);
  const [analystReflection, setAnalystReflection] = useState(initialSession.analyst_reflection || null);
  const [embodimentPrompt, setEmbodimentPrompt] = useState(initialSession.embodiment_prompt || null);
  const [reflectingOnSession, setReflectingOnSession] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [linkedDream, setLinkedDream] = useState(null);
  const [hoveredMsgIndex, setHoveredMsgIndex] = useState(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const preparation = (() => {
    try { return session.preparation_notes ? JSON.parse(session.preparation_notes) : null; }
    catch { return null; }
  })();

  useEffect(() => {
    if (session.linked_dream_id) {
      supabase.from('dreams').select('id, title, dream_date, archetypes, symbols, body')
        .eq('id', session.linked_dream_id).single()
        .then(({ data }) => { if (data) setLinkedDream(data); });
    }
  }, [session.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleAddMessage() {
    const text = inputText.trim();
    if (!text || saving) return;

    const msg = { role: inputVoice, content: text, timestamp: new Date().toISOString() };
    const nextMessages = [...messages, msg];
    setMessages(nextMessages);
    setInputText('');
    setInputVoice(v => v === 'ego' ? 'figure' : 'ego');
    setSaving(true);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    try {
      const { data: updated } = await supabase
        .from('imagination_sessions')
        .update({ messages: nextMessages })
        .eq('id', session.id)
        .select()
        .single();
      if (updated) {
        const hydrated = { ...updated, linked_dream_title: session.linked_dream_title };
        setSession(hydrated);
        onSessionUpdate(hydrated);
      }
    } catch {}
    setSaving(false);
  }

  async function handleCloseSession() {
    setClosing(true);
    setAiError(null);

    try {
      const wantsReflection = requestReflection && messages.length >= 3;
      setReflectingOnSession(wantsReflection);

      const reflectionTask = wantsReflection
        ? reflectOnSession({
            figureName: session.figure_name,
            sessionMessages: messages,
            closingReflection: closingReflection.trim() || null,
            linkedDream,
          })
        : Promise.resolve(null);

      // Embodiment prompt always runs in parallel — non-fatal if it fails
      const embodimentTask = imaginationEmbodimentPrompt({
        figureName: session.figure_name,
        sessionMessages: messages,
        closingReflection: closingReflection.trim() || null,
      }).catch(() => null);

      let reflection, embodiment;
      try {
        [reflection, embodiment] = await Promise.all([reflectionTask, embodimentTask]);
      } catch (e) {
        setAiError(e);
        setReflectingOnSession(false);
        setClosing(false);
        return;
      }
      setReflectingOnSession(false);

      if (reflection) setAnalystReflection(reflection);
      const embodimentText = embodiment?.trim() || null;
      if (embodimentText) setEmbodimentPrompt(embodimentText);

      const { data: updated } = await supabase
        .from('imagination_sessions')
        .update({
          closed_at: new Date().toISOString(),
          closing_reflection: closingReflection.trim() || null,
          analyst_reflection: reflection,
          embodiment_prompt: embodimentText,
        })
        .eq('id', session.id)
        .select()
        .single();

      const hydrated = { ...updated, linked_dream_title: session.linked_dream_title };
      setSession(hydrated);
      setClosedAt(updated.closed_at);
      setIsSessionClosed(true);
      setShowClosePanel(false);
      onSessionUpdate(hydrated);
    } catch (e) {
      setAiError(e);
    } finally {
      setClosing(false);
    }
  }

  async function switchMessageSpeaker(index) {
    const updated = messages.map((msg, i) =>
      i === index ? { ...msg, role: msg.role === 'ego' ? 'figure' : 'ego' } : msg
    );
    setMessages(updated);
    try {
      await supabase.from('imagination_sessions').update({ messages: updated }).eq('id', session.id);
    } catch {}
  }

  const figureSelected = inputVoice === 'figure';
  const showInvitation = messages.length === 0 && !isSessionClosed;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: '#faf7f2' }}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-black/8 bg-white/60 shrink-0">
        <div className="flex items-center gap-6">
          <div>
            <h2 className="font-display italic text-xl text-ink leading-tight">{session.figure_name}</h2>
            {session.linked_dream_title && (
              <p className="text-xs font-body text-ink/35 mt-0.5">↳ {session.linked_dream_title}</p>
            )}
          </div>
          {preparation && (
            <button
              onClick={() => setShowPreparation(v => !v)}
              className="text-xs font-body text-ink/30 hover:text-ink/60 transition-colors"
            >
              {showPreparation ? 'Hide preparation' : 'View preparation'}
            </button>
          )}
        </div>
        {!isSessionClosed && (
          <button
            onClick={() => setShowClosePanel(true)}
            className="text-xs font-body text-ink/30 hover:text-ink/55 transition-colors border border-black/10 hover:border-black/18 px-3 py-1.5 rounded-lg"
          >
            Close this session
          </button>
        )}
        {isSessionClosed && (
          <button onClick={onBack} className="text-xs font-body text-ink/30 hover:text-ink/60 transition-colors">
            ← Back
          </button>
        )}
      </div>

      {/* Preparation toggle */}
      {showPreparation && preparation && (
        <div className="px-6 py-4 border-b border-black/5 bg-white/40 shrink-0 overflow-y-auto max-h-64">
          <div className="max-w-2xl mx-auto">
            <PreparationPanel preparation={preparation} figureName={session.figure_name} />
          </div>
        </div>
      )}

      {/* Closed banner */}
      {isSessionClosed && (
        <div className="mx-6 mt-4 px-5 py-3 rounded-xl bg-amber-50/80 border border-amber-200/50 shrink-0">
          <p className="text-xs font-body text-amber-700 mb-2">
            This session was closed on {closedAt ? formatDate(closedAt.slice(0, 10)) : 'a previous date'}.
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => setIsSessionClosed(false)}
              className="text-xs font-body font-medium text-amber-700 hover:text-amber-900 transition-colors"
            >
              Continue this dialogue →
            </button>
            <button
              onClick={() => onNewSession(session.figure_name)}
              className="text-xs font-body text-amber-500 hover:text-amber-700 transition-colors"
            >
              New session with {session.figure_name} →
            </button>
          </div>
        </div>
      )}

      {/* Message thread */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-8">
        <div className="max-w-2xl mx-auto space-y-7">

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'ego' ? 'justify-end' : 'justify-start'}`}
              onMouseEnter={() => setHoveredMsgIndex(i)}
              onMouseLeave={() => setHoveredMsgIndex(null)}
            >
              {msg.role === 'figure' ? (
                <div className="max-w-[85%]">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="font-body uppercase text-plum/50" style={{ fontSize: 9, letterSpacing: '0.18em' }}>
                      {session.figure_name}
                    </p>
                    {hoveredMsgIndex === i && (
                      <button
                        onClick={() => switchMessageSpeaker(i)}
                        title="Switch speaker"
                        className="font-body text-ink/40 hover:text-ink/70 transition-colors"
                        style={{ fontSize: 11 }}
                      >↻</button>
                    )}
                  </div>
                  <div
                    className="px-5 py-4 rounded-2xl rounded-tl-sm"
                    style={{ backgroundColor: 'rgba(61,43,74,0.07)', borderLeft: '3px solid rgba(61,43,74,0.2)' }}
                  >
                    <p className="font-display italic text-[17px] text-ink leading-[1.85]">
                      {msg.content}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="max-w-[85%]">
                  <div className="flex items-center justify-end gap-2 mb-2">
                    {hoveredMsgIndex === i && (
                      <button
                        onClick={() => switchMessageSpeaker(i)}
                        title="Switch speaker"
                        className="font-body text-ink/40 hover:text-ink/70 transition-colors"
                        style={{ fontSize: 11 }}
                      >↻</button>
                    )}
                    <p className="font-body uppercase text-ink/30" style={{ fontSize: 9, letterSpacing: '0.18em' }}>
                      You
                    </p>
                  </div>
                  <div className="px-5 py-4 rounded-2xl rounded-tr-sm bg-white/70 border border-black/8">
                    <p className="font-body text-[15px] text-ink/85 leading-[1.7]">
                      {msg.content}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Closing reflection block (closed view) */}
          {isSessionClosed && session.closing_reflection && (
            <div>
              <div className="pl-4 border-l-2 border-gold/30 bg-amber-50/40 rounded-r-xl px-4 py-4">
                <p className="font-body uppercase text-ink/25 tracking-widest mb-2" style={{ fontSize: 9, letterSpacing: '0.18em' }}>
                  Your closing reflection
                </p>
                <p className="font-display text-[15px] text-ink/75 leading-[1.8]">
                  {session.closing_reflection}
                </p>
              </div>
            </div>
          )}

          {/* Analyst reflection block (closed view) */}
          {isSessionClosed && analystReflection && (
            <div>
              <div className="pl-4 border-l-2 border-gold/40 bg-white/50 rounded-r-xl px-5 py-5">
                <p className="font-body uppercase text-ink/25 tracking-widest mb-1" style={{ fontSize: 9, letterSpacing: '0.18em' }}>
                  Analyst's reflection
                </p>
                <p className="font-body italic text-ink/30 text-xs mb-4">
                  A reflection on your writing — not an interpretation of your psyche.
                </p>
                {analystReflection.split(/\n\n+/).map((para, i) => (
                  <p key={i} className="font-display italic text-[16px] text-ink/75 leading-[1.85] mb-4 last:mb-0">
                    {para.trim()}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Embodiment prompt (closed view) */}
          {isSessionClosed && embodimentPrompt && (
            <div className="py-4">
              <hr style={{ borderColor: 'rgba(184,146,74,0.25)', marginBottom: 20 }} />
              <p className="font-body uppercase text-ink/25 tracking-widest mb-5 text-center" style={{ fontSize: 9, letterSpacing: '0.18em' }}>
                this week
              </p>
              <p className="font-display italic text-[18px] text-ink/70 leading-[1.85] text-center mx-auto" style={{ maxWidth: 600 }}>
                {embodimentPrompt}
              </p>
              <div className="text-center mt-5">
                <button
                  onClick={() => {
                    sessionStorage.setItem('waking-life-prefill', JSON.stringify({
                      entry_type: 'reflection',
                      title: `Embodying ${session.figure_name}`,
                      description: embodimentPrompt,
                      linked_dream_id: session.linked_dream_id || null,
                      linked_dream_title: session.linked_dream_title || null,
                    }));
                    navigate('/waking-life');
                  }}
                  className="text-sm font-body text-gold hover:text-gold/70 transition-colors"
                >
                  Record in Waking Life →
                </button>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* AI error */}
      {aiError && (
        <div className="px-6 pb-2 max-w-2xl mx-auto w-full shrink-0">
          <AiErrorMessage error={aiError} onDismiss={() => setAiError(null)} />
        </div>
      )}

      {/* Input area (active session only) */}
      {!isSessionClosed && (
        <>
          {showInvitation && (
            <div className="text-center px-6 pb-3 shrink-0">
              <p className="font-display italic text-base text-gold/45">
                {session.figure_name} is present. What do you want to say?
              </p>
            </div>
          )}

          <div className="border-t border-black/8 bg-white/60 px-4 sm:px-6 py-4 shrink-0">
            <div className="max-w-2xl mx-auto">
              {/* Voice toggle */}
              <div className="flex gap-2 mb-3">
                {[
                  { voice: 'ego', label: 'Writing as: You' },
                  { voice: 'figure', label: `Writing as: ${session.figure_name}` },
                ].map(({ voice, label }) => (
                  <button
                    key={voice}
                    onClick={() => setInputVoice(voice)}
                    className="flex-1 py-2 rounded-xl text-xs font-body transition-all duration-150"
                    style={inputVoice === voice ? {
                      backgroundColor: voice === 'figure' ? '#3d2b4a' : '#2a2420',
                      color: 'white',
                    } : {
                      border: '1px solid rgba(42,36,32,0.15)',
                      color: 'rgba(42,36,32,0.45)',
                      backgroundColor: 'transparent',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Textarea */}
              <div className="flex gap-3 items-end">
                <textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={e => {
                    setInputText(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 144) + 'px';
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddMessage(); }
                  }}
                  placeholder={figureSelected
                    ? `What does ${session.figure_name} say?`
                    : `What do you say to ${session.figure_name}?`
                  }
                  rows={3}
                  className="flex-1 px-4 py-3 rounded-xl border text-sm font-body text-ink placeholder-ink/25 focus:outline-none focus:ring-2 resize-none bg-white/70 transition-all duration-150"
                  style={{
                    borderColor: figureSelected ? 'rgba(61,43,74,0.3)' : 'rgba(0,0,0,0.1)',
                    minHeight: '76px',
                    maxHeight: '144px',
                    '--tw-ring-color': figureSelected ? 'rgba(61,43,74,0.25)' : 'rgba(184,146,74,0.3)',
                  }}
                />
                <button
                  onClick={handleAddMessage}
                  disabled={saving || !inputText.trim()}
                  className="shrink-0 px-5 py-3 rounded-xl text-sm font-body transition-all duration-150 mb-0.5"
                  style={{
                    backgroundColor: figureSelected ? '#3d2b4a' : '#2a2420',
                    color: 'white',
                    opacity: (saving || !inputText.trim()) ? 0.35 : 1,
                  }}
                >
                  Add
                </button>
              </div>

              {figureSelected && (
                <p className="text-center mt-1.5 text-xs font-body text-ink/18">
                  This is your voice finding theirs.
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Close panel */}
      {showClosePanel && (
        <>
          <div className="fixed inset-0 z-10 bg-black/20" onClick={() => setShowClosePanel(false)} />
          <div
            className="fixed inset-x-0 bottom-0 z-20 rounded-t-2xl border-t border-black/8 px-6 py-7"
            style={{ backgroundColor: '#faf7f2', maxWidth: '580px', margin: '0 auto' }}
          >
            <h3 className="font-display italic text-2xl text-ink mb-3">Returning</h3>
            <p className="text-sm font-body text-ink/55 leading-relaxed mb-5">
              Jung held that active imagination must end with a deliberate return to ordinary consciousness — a clear moment of closing.
            </p>
            <p className="text-sm font-body text-ink/70 mb-3">Before you close, write a few words about what happened in this exchange.</p>
            <textarea
              value={closingReflection}
              onChange={e => setClosingReflection(e.target.value)}
              rows={4}
              placeholder="What did you notice? What surprised you? What do you want to carry forward?"
              className="w-full px-4 py-3 rounded-xl border border-black/10 bg-white/60 text-sm font-body text-ink placeholder-ink/25 focus:outline-none focus:ring-2 focus:ring-gold/30 resize-none mb-4"
            />

            {messages.length >= 3 && (
              <label className="flex items-start gap-2.5 mb-5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requestReflection}
                  onChange={e => setRequestReflection(e.target.checked)}
                  className="mt-0.5 rounded"
                />
                <div>
                  <span className="text-sm font-body text-ink/70">◈ Request an analyst's reflection on this session</span>
                  <p className="text-xs font-body text-ink/35 mt-0.5">2–3 paragraphs reflecting on what emerged in your writing. Uses Claude Opus.</p>
                </div>
              </label>
            )}

            {aiError && <div className="mb-4"><AiErrorMessage error={aiError} onDismiss={() => setAiError(null)} /></div>}

            {reflectingOnSession && (
              <p className="text-sm font-body italic text-ink/45 mb-3">Reading your dialogue…</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleCloseSession}
                disabled={closing}
                className="flex-1 py-2.5 rounded-xl text-sm font-body transition-all"
                style={{ backgroundColor: '#3d2b4a', color: 'white', opacity: closing ? 0.6 : 1 }}
              >
                {closing ? (reflectingOnSession ? 'Reading your dialogue…' : 'Closing…') : 'Close the session'}
              </button>
              <button
                onClick={() => setShowClosePanel(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-body border border-black/10 hover:border-black/20 text-ink/60 hover:text-ink/90 transition-all"
              >
                Continue the dialogue
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function ActiveImagination() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const dreamId = searchParams.get('dreamId');

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list');
  const [activeSession, setActiveSession] = useState(null);
  const [newSessionFigureName, setNewSessionFigureName] = useState('');

  useEffect(() => {
    if (user) loadSessions();
  }, [user]);

  useEffect(() => {
    if (dreamId && !loading) setView('setup');
  }, [dreamId, loading]);

  async function loadSessions() {
    const { data } = await supabase
      .from('imagination_sessions')
      .select('*, linked_dream:dreams!linked_dream_id(id, title)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setSessions((data || []).map(s => ({ ...s, linked_dream_title: s.linked_dream?.title || null })));
    setLoading(false);
  }

  function handleSessionReady(session) {
    setSessions(prev => [session, ...prev.filter(s => s.id !== session.id)]);
    setActiveSession(session);
    setView('dialogue');
  }

  function handleSessionUpdate(updated) {
    setSessions(prev => prev.map(s => s.id === updated.id ? updated : s));
    if (activeSession?.id === updated.id) setActiveSession(updated);
  }

  function handleSessionClick(session) {
    setActiveSession(session);
    setView('dialogue');
  }

  function handleBackFromDialogue() {
    setActiveSession(null);
    setView('list');
    loadSessions();
  }

  function handleNewSessionFromDialogue(prefillName) {
    setNewSessionFigureName(prefillName || '');
    setActiveSession(null);
    setView('setup');
  }

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="max-w-xl">
          <h1 className="font-display italic text-5xl text-ink dark:text-white leading-tight mb-2">
            Active Imagination
          </h1>
          <p className="font-body text-sm text-ink/50 dark:text-white/40 mb-3 leading-relaxed">
            A space to dialogue with the figures that arise from the deep — in your own words, from your own depths.
          </p>
          <p className="font-display italic text-sm text-ink/30 dark:text-white/22 leading-relaxed">
            Jung conducted active imagination by writing both sides of the dialogue himself. This is that practice. The figure's voice comes from you — not from outside.
          </p>
        </div>
        <button
          onClick={() => { setNewSessionFigureName(''); setView(v => v === 'setup' ? 'list' : 'setup'); }}
          className="shrink-0 ml-6 mt-1 text-sm font-body text-gold/70 hover:text-gold transition-colors whitespace-nowrap"
        >
          Begin new session →
        </button>
      </div>

      {/* Setup flow */}
      {view === 'setup' && (
        <SetupFlow
          initialDreamId={dreamId}
          initialFigureName={newSessionFigureName}
          onSessionReady={handleSessionReady}
          onCancel={() => setView('list')}
          userId={user.id}
        />
      )}

      {/* Sessions list */}
      {loading ? (
        <p className="text-sm font-body text-ink/30 dark:text-white/25 italic mt-4">Loading…</p>
      ) : sessions.length === 0 && view !== 'setup' ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="font-display italic text-2xl text-ink/35 dark:text-white/25 mb-4 leading-relaxed">
            The figures are waiting.
          </p>
          <p className="text-sm font-body text-ink/25 dark:text-white/18 mb-2 max-w-sm leading-relaxed">
            Active imagination begins with a figure who appeared in a dream and left something unfinished. You will write both sides of the dialogue — your own words, your own voice, your own discovery.
          </p>
          <p className="text-sm font-body text-ink/20 dark:text-white/15 mb-8 max-w-sm leading-relaxed">
            The figure's wisdom comes from your depths, not from outside yourself.
          </p>
          <button
            onClick={() => setView('setup')}
            className="text-sm font-body text-gold/60 hover:text-gold transition-colors"
          >
            Begin a session →
          </button>
        </div>
      ) : (
        <div className="space-y-3 mt-2">
          {sessions.map(session => (
            <SessionCard
              key={session.id}
              session={session}
              onClick={handleSessionClick}
            />
          ))}
        </div>
      )}

      {/* Dialogue overlay */}
      {view === 'dialogue' && activeSession && (
        <DialogueView
          session={activeSession}
          onBack={handleBackFromDialogue}
          onNewSession={handleNewSessionFromDialogue}
          onSessionUpdate={handleSessionUpdate}
          userId={user.id}
        />
      )}

      <div className="h-12" />
    </div>
  );
}
