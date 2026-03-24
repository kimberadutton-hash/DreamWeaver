import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format, parseISO } from 'date-fns';

export default function AnalystFocus() {
  const { user } = useAuth();
  const [focuses, setFocuses] = useState([]);
  const [loading, setLoading] = useState(true);

  // New focus form
  const [showForm, setShowForm] = useState(false);
  const [newFocus, setNewFocus] = useState({ focus_text: '', given_date: today(), notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchFocuses();
  }, []);

  async function fetchFocuses() {
    const { data } = await supabase
      .from('analyst_focuses')
      .select('*')
      .eq('user_id', user.id)
      .order('given_date', { ascending: false });
    setFocuses(data || []);
    setLoading(false);
  }

  async function handleAddFocus(e) {
    e.preventDefault();
    if (!newFocus.focus_text.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('analyst_focuses')
      .insert({
        user_id: user.id,
        focus_text: newFocus.focus_text.trim(),
        given_date: newFocus.given_date || today(),
        notes: newFocus.notes.trim() || null,
        is_active: true,
      })
      .select()
      .single();

    if (!error && data) {
      setFocuses(prev => [data, ...prev]);
      setNewFocus({ focus_text: '', given_date: today(), notes: '' });
      setShowForm(false);
    }
    setSaving(false);
  }

  async function handleComplete(id) {
    const { data, error } = await supabase
      .from('analyst_focuses')
      .update({ is_active: false, end_date: today() })
      .eq('id', id)
      .select()
      .single();
    if (!error && data) {
      setFocuses(prev => prev.map(f => f.id === id ? data : f));
    }
  }

  async function handleUpdateNotes(id, notes) {
    await supabase
      .from('analyst_focuses')
      .update({ notes })
      .eq('id', id);
    setFocuses(prev => prev.map(f => f.id === id ? { ...f, notes } : f));
  }

  async function handleDelete(id) {
    if (!confirm('Delete this focus permanently?')) return;
    await supabase.from('analyst_focuses').delete().eq('id', id);
    setFocuses(prev => prev.filter(f => f.id !== id));
  }

  const activeFocus = focuses.find(f => f.is_active);
  const pastFocuses = focuses.filter(f => !f.is_active);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="font-display italic text-xl text-ink/40">Loading…</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-8 py-10">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display italic text-4xl text-ink dark:text-white mb-2">
            Analyst Focus
          </h1>
          <p className="text-sm font-body text-ink/50 dark:text-white/40">
            The question or theme your analyst has asked you to hold.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="shrink-0 px-4 py-2.5 rounded-xl text-sm font-body font-medium text-white mt-1"
            style={{ backgroundColor: '#3d2b4a' }}
          >
            + New Focus
          </button>
        )}
      </div>

      {/* Active Focus */}
      {activeFocus ? (
        <ActiveFocusCard
          focus={activeFocus}
          onComplete={() => handleComplete(activeFocus.id)}
          onUpdateNotes={(notes) => handleUpdateNotes(activeFocus.id, notes)}
          onDelete={() => handleDelete(activeFocus.id)}
        />
      ) : (
        !showForm && (
          <div className="mb-8 px-6 py-8 rounded-2xl border border-dashed border-black/15 dark:border-white/15 text-center">
            <p className="font-display italic text-xl text-ink/30 dark:text-white/25 mb-1">No active focus</p>
            <p className="text-sm font-body text-ink/30 dark:text-white/25">
              Add a focus when your analyst gives you a question or theme to hold.
            </p>
          </div>
        )
      )}

      {/* Add new focus form */}
      {showForm && (
        <div className="mb-8 p-6 rounded-2xl bg-white/60 dark:bg-white/5 border border-black/8 dark:border-white/8">
          <h2 className="text-xs uppercase tracking-widest font-body text-ink/40 dark:text-white/30 mb-5">
            New Analytical Focus
          </h2>
          <form onSubmit={handleAddFocus} className="space-y-4">
            <div>
              <label className="field-label">Focus</label>
              <textarea
                value={newFocus.focus_text}
                onChange={e => setNewFocus(f => ({ ...f, focus_text: e.target.value }))}
                placeholder="The question or theme your analyst has given you…"
                rows={3}
                className="field-input resize-none"
                autoFocus
              />
            </div>
            <div>
              <label className="field-label">Given date</label>
              <input
                type="date"
                value={newFocus.given_date}
                onChange={e => setNewFocus(f => ({ ...f, given_date: e.target.value }))}
                className="field-input"
              />
            </div>
            <div>
              <label className="field-label">Notes (optional)</label>
              <textarea
                value={newFocus.notes}
                onChange={e => setNewFocus(f => ({ ...f, notes: e.target.value }))}
                placeholder="Context from the session, your initial reactions…"
                rows={2}
                className="field-input resize-none"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={saving || !newFocus.focus_text.trim()}
                className="flex-1 py-3 rounded-xl font-body text-sm font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: '#3d2b4a' }}
              >
                {saving ? 'Saving…' : 'Set as Active Focus'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setNewFocus({ focus_text: '', given_date: today(), notes: '' }); }}
                className="px-5 py-3 rounded-xl font-body text-sm border border-black/15 dark:border-white/15 text-ink/60 dark:text-white/50 hover:bg-black/5 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Past focuses */}
      {pastFocuses.length > 0 && (
        <div className="mt-10">
          <h2 className="text-xs uppercase tracking-widest font-body text-ink/40 dark:text-white/30 mb-4">
            Past Focuses
          </h2>
          <div className="space-y-3">
            {pastFocuses.map(focus => (
              <PastFocusCard key={focus.id} focus={focus} onDelete={() => handleDelete(focus.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ActiveFocusCard({ focus, onComplete, onUpdateNotes, onDelete }) {
  const [notes, setNotes] = useState(focus.notes || '');
  const [noteSaved, setNoteSaved] = useState(false);
  const saveTimeout = useRef(null);

  function handleNotesChange(e) {
    setNotes(e.target.value);
  }

  async function handleNotesBlur() {
    if (notes === (focus.notes || '')) return;
    await onUpdateNotes(notes);
    setNoteSaved(true);
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => setNoteSaved(false), 2000);
  }

  const givenDate = focus.given_date ? format(parseISO(focus.given_date), 'MMMM d, yyyy') : '';

  return (
    <div className="mb-8 p-6 rounded-2xl border border-gold/30 bg-gold/5 dark:bg-gold/5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <p className="text-xs uppercase tracking-widest font-body text-gold/60 mb-1">
          Active Focus · since {givenDate}
        </p>
        <button
          onClick={onDelete}
          className="text-xs font-body text-red-400 hover:text-red-600 transition-colors shrink-0"
        >
          Delete
        </button>
      </div>

      <p className="font-display italic text-2xl text-ink dark:text-white leading-snug mb-6">
        {focus.focus_text}
      </p>

      <div className="mb-4">
        <label className="text-xs uppercase tracking-widest font-body text-ink/40 dark:text-white/30 block mb-2">
          Running Notes
          {noteSaved && <span className="ml-2 text-green-600 dark:text-green-400 normal-case tracking-normal text-xs font-normal">saved</span>}
        </label>
        <textarea
          value={notes}
          onChange={handleNotesChange}
          onBlur={handleNotesBlur}
          placeholder="Observations, dreams that feel connected, shifts in awareness…"
          rows={4}
          className="field-input resize-none"
        />
      </div>

      <button
        onClick={onComplete}
        className="text-sm font-body font-medium text-plum dark:text-gold hover:opacity-70 transition-opacity"
      >
        Mark complete →
      </button>
    </div>
  );
}

function PastFocusCard({ focus, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const givenDate = focus.given_date ? format(parseISO(focus.given_date), 'MMM d, yyyy') : '';
  const endDate = focus.end_date ? format(parseISO(focus.end_date), 'MMM d, yyyy') : '';

  return (
    <div className="rounded-xl border border-black/8 dark:border-white/8 bg-white/40 dark:bg-white/5">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full text-left px-5 py-4 flex items-start justify-between gap-4"
      >
        <div>
          <p className="text-xs font-body text-ink/30 dark:text-white/25 mb-1">
            {givenDate}{endDate ? ` → ${endDate}` : ''}
          </p>
          <p className="text-sm font-body text-ink/80 dark:text-white/70 leading-snug">
            {focus.focus_text}
          </p>
        </div>
        <span className="text-ink/30 dark:text-white/20 text-xs mt-1 shrink-0">
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {expanded && (
        <div className="px-5 pb-4 border-t border-black/5 dark:border-white/5 pt-3">
          {focus.notes ? (
            <p className="text-sm font-body text-ink/60 dark:text-white/50 leading-relaxed whitespace-pre-wrap">
              {focus.notes}
            </p>
          ) : (
            <p className="text-sm font-body text-ink/30 dark:text-white/25 italic">No notes recorded.</p>
          )}
          <button
            onClick={onDelete}
            className="mt-3 text-xs font-body text-red-400 hover:text-red-600 transition-colors"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
