import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useApiKey } from '../hooks/useApiKey'
import { synthesizeLexiconEntry } from '../lib/ai'
import AiErrorMessage from '../components/AiErrorMessage'
import PracticeOrientation from '../components/PracticeOrientation'

export default function PersonalLexicon() {
  const { user } = useAuth()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedEntry, setSelectedEntry] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [synthesizing, setSynthesizing] = useState(false)
  const [aiError, setAiError] = useState(null)
  const [editingSynthesis, setEditingSynthesis] = useState(false)
  const [editText, setEditText] = useState('')
  const { apiKey } = useApiKey()
  const [sourcesOpen, setSourcesOpen] = useState(true)
  const [dreams, setDreams] = useState([])
  const [dreamsLoading, setDreamsLoading] = useState(false)
  const [showDreamSelector, setShowDreamSelector] = useState(false)
  const [selectedDream, setSelectedDream] = useState(null)
  const [manualAssociation, setManualAssociation] = useState('')
  const [selectedAssociationText, setSelectedAssociationText] = useState('')
  const [dreamSearch, setDreamSearch] = useState('')
  const [newSubject, setNewSubject] = useState('')
  const [newSubjectType, setNewSubjectType] = useState('')
  const [addingEntry, setAddingEntry] = useState(false)
  const [gathering, setGathering] = useState(false)

  useEffect(() => {
    if (!user) return
    async function fetchEntries() {
      setLoading(true)
      const { data, error } = await supabase
        .from('personal_associations')
        .select('*')
        .eq('user_id', user.id)
        .order('subject', { ascending: true })
      if (!error && data) setEntries(data)
      setLoading(false)
    }
    fetchEntries()
  }, [user])

  const newMaterialAvailable = (entry) =>
    entry.synthesis_generated_at &&
    entry.last_dream_added_at &&
    new Date(entry.last_dream_added_at) > new Date(entry.synthesis_generated_at)

  const figures  = entries.filter(e => e.subject_type === 'figure')
  const symbols  = entries.filter(e => e.subject_type === 'symbol')
  const dynamics = entries.filter(e => e.subject_type === 'dynamic')

  const sections = [
    { label: 'Figures',  items: figures  },
    { label: 'Symbols',  items: symbols  },
    { label: 'Dynamics', items: dynamics },
  ]

  const handleSaveSynthesis = async () => {
    if (!selectedEntry) return
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('personal_associations')
      .update({
        synthesis: editText,
        synthesis_generated_at: now,
        updated_at: now
      })
      .eq('id', selectedEntry.id)
    if (error) return
    const updated = {
      ...selectedEntry,
      synthesis: editText,
      synthesis_generated_at: now
    }
    setSelectedEntry(updated)
    setEntries(prev => prev.map(e => e.id === updated.id ? updated : e))
    setEditingSynthesis(false)
  }

  const handleSynthesize = async () => {
    if (!selectedEntry) return
    setSynthesizing(true)
    setAiError(null)
    try {
      const result = await synthesizeLexiconEntry(
        selectedEntry.subject,
        selectedEntry.subject_type,
        selectedEntry.dream_sources || [],
        apiKey
      )
      const now = new Date().toISOString()
      const { error } = await supabase
        .from('personal_associations')
        .update({
          synthesis: result,
          synthesis_generated_at: now,
          updated_at: now
        })
        .eq('id', selectedEntry.id)
      if (error) throw error
      const updated = {
        ...selectedEntry,
        synthesis: result,
        synthesis_generated_at: now
      }
      setSelectedEntry(updated)
      setEntries(prev => prev.map(e => e.id === updated.id ? updated : e))
    } catch (err) {
      setAiError(err)
    } finally {
      setSynthesizing(false)
    }
  }

  const loadDreams = async () => {
    if (dreams.length > 0) return
    setDreamsLoading(true)
    const { data } = await supabase
      .from('dreams')
      .select('id, title, dream_date, modal_associations, symbols, archetypes, tags, body')
      .eq('user_id', user.id)
      .order('dream_date', { ascending: false })
    setDreams(data || [])
    setDreamsLoading(false)
  }

  const handleAddSource = async () => {
    if (!selectedDream || !selectedEntry) return
    const associationText = selectedAssociationText || manualAssociation
    if (!associationText.trim()) return

    const newSource = {
      dream_id: selectedDream.id,
      dream_title: selectedDream.title || 'Untitled dream',
      dream_date: selectedDream.dream_date,
      association_text: associationText.trim()
    }

    const updatedSources = [
      ...(selectedEntry.dream_sources || []),
      newSource
    ]
    const now = new Date().toISOString()

    const { error } = await supabase
      .from('personal_associations')
      .update({
        dream_sources: updatedSources,
        last_dream_added_at: now,
        updated_at: now
      })
      .eq('id', selectedEntry.id)

    if (error) return

    const updated = {
      ...selectedEntry,
      dream_sources: updatedSources,
      last_dream_added_at: now
    }
    setSelectedEntry(updated)
    setEntries(prev => prev.map(e => e.id === updated.id ? updated : e))
    setShowDreamSelector(false)
    setSelectedDream(null)
    setManualAssociation('')
    setSelectedAssociationText('')
    setDreamSearch('')
  }

  const handleRemoveSource = async (dreamId) => {
    if (!selectedEntry) return
    const updatedSources = (selectedEntry.dream_sources || [])
      .filter(s => s.dream_id !== dreamId)
    const now = new Date().toISOString()

    const { error } = await supabase
      .from('personal_associations')
      .update({
        dream_sources: updatedSources,
        updated_at: now
      })
      .eq('id', selectedEntry.id)

    if (error) return

    const updated = {
      ...selectedEntry,
      dream_sources: updatedSources
    }
    setSelectedEntry(updated)
    setEntries(prev => prev.map(e => e.id === updated.id ? updated : e))
  }

  const handleCloseDrawer = () => {
    setSelectedEntry(null)
    setEditingSynthesis(false)
    setEditText('')
    setAiError(null)
  }

  const handleAddEntry = async () => {
    if (!newSubject.trim() || !newSubjectType) return
    setAddingEntry(true)

    const { data, error } = await supabase
      .from('personal_associations')
      .insert({
        user_id: user.id,
        subject: newSubject.trim(),
        subject_type: newSubjectType,
        dream_sources: []
      })
      .select()
      .single()

    if (error || !data) {
      setAddingEntry(false)
      return
    }

    setEntries(prev => [...prev, data]
      .sort((a, b) => a.subject.localeCompare(b.subject)))
    setShowAddModal(false)
    setNewSubject('')
    setNewSubjectType('')
    setAddingEntry(false)
    setSelectedEntry(data)

    // Auto-gather from archive after drawer opens
    autoGatherSources(data)
  }

  const autoGatherSources = async (entry) => {
    setGathering(true)
    try {
      const { data: allDreams } = await supabase
        .from('dreams')
        .select('id, title, dream_date, body, modal_associations, symbols, archetypes, tags')
        .eq('user_id', user.id)
        .order('dream_date', { ascending: false })

      if (!allDreams?.length) {
        setGathering(false)
        return
      }

      const subject = entry.subject.toLowerCase()
      const sources = []

      for (const dream of allDreams) {
        const inBody = (dream.body || '').toLowerCase().includes(subject)
        const inSymbols = (dream.symbols || [])
          .some(s => s.toLowerCase().includes(subject))
        const inArchetypes = (dream.archetypes || [])
          .some(a => a.toLowerCase().includes(subject))
        const inTags = (dream.tags || [])
          .some(t => t.toLowerCase().includes(subject))

        const matchingAssoc = (dream.modal_associations || [])
          .find(a =>
            a.element?.toLowerCase().includes(subject) &&
            a.response?.trim()
          )

        const appearsInDream = inBody || inSymbols ||
                               inArchetypes || inTags ||
                               !!matchingAssoc

        if (!appearsInDream) continue

        let associationText = ''

        if (matchingAssoc) {
          associationText = matchingAssoc.response.trim()
        } else if (inBody) {
          const sentences = (dream.body || '').split(/(?<=[.!?])\s+/)
          const matchingSentences = sentences
            .filter(s => s.toLowerCase().includes(subject))
            .slice(0, 2)
          associationText = matchingSentences.join(' ').trim()
          if (!associationText) {
            const idx = dream.body.toLowerCase().indexOf(subject)
            const start = Math.max(0, idx - 60)
            const end = Math.min(dream.body.length, idx + 140)
            associationText = (start > 0 ? '...' : '') +
              dream.body.slice(start, end).trim() +
              (end < dream.body.length ? '...' : '')
          }
        } else {
          associationText = `Appears as: ${
            [
              inSymbols && 'symbol',
              inArchetypes && 'archetype',
              inTags && 'tag'
            ].filter(Boolean).join(', ')
          }`
        }

        if (!associationText) continue

        sources.push({
          dream_id: dream.id,
          dream_title: dream.title || 'Untitled dream',
          dream_date: dream.dream_date,
          association_text: associationText
        })
      }

      if (!sources.length) {
        setGathering(false)
        return
      }

      const now = new Date().toISOString()
      const { error: updateError } = await supabase
        .from('personal_associations')
        .update({
          dream_sources: sources,
          last_dream_added_at: now,
          updated_at: now
        })
        .eq('id', entry.id)

      if (!updateError) {
        const updated = {
          ...entry,
          dream_sources: sources,
          last_dream_added_at: now
        }
        setSelectedEntry(updated)
        setEntries(prev => prev.map(e =>
          e.id === updated.id ? updated : e
        ))
      }
    } catch (err) {
      console.error('autoGatherSources failed:', err)
    } finally {
      setGathering(false)
    }
  }

  const handleDeleteEntry = async (entryId) => {
    if (!confirm('Remove this entry from your lexicon?')) return
    const { error } = await supabase
      .from('personal_associations')
      .delete()
      .eq('id', entryId)
    if (error) return
    setEntries(prev => prev.filter(e => e.id !== entryId))
    setSelectedEntry(null)
  }

  const handleCloseAddModal = () => {
    setShowAddModal(false)
    setNewSubject('')
    setNewSubjectType('')
  }

  const AddButton = () => (
    <button
      onClick={() => setShowAddModal(true)}
      className="border border-[#b8924a] text-[#b8924a] px-4 py-2 text-sm rounded hover:bg-[#b8924a] hover:text-white transition-colors"
    >
      + Add entry
    </button>
  )

  return (
    <div className="min-h-screen bg-[#faf7f2] p-8">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1
            className="text-3xl text-[#3d2b4a]"
            style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic' }}
          >
            Personal Lexicon
          </h1>
          <p className="text-sm text-stone-500 mt-1" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            The meanings that belong to you alone.
          </p>
        </div>

        <PracticeOrientation storageKey="lexicon-orientation">
          <p>Your lexicon holds what recurring figures, symbols, and dynamics have come to mean in your inner world — not what they mean in books, but what they mean to you. Add an entry when something keeps returning. Tend it over time.</p>
        </PracticeOrientation>

        {/* Loading */}
        {loading && (
          <div className="py-20 text-center text-stone-400 text-sm" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            ...
          </div>
        )}

        {/* Empty state */}
        {!loading && entries.length === 0 && (
          <div className="py-20 text-center">
            <p
              className="text-xl text-stone-400"
              style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic' }}
            >
              Nothing here yet. Begin when something keeps returning.
            </p>
            <div className="mt-6">
              <AddButton />
            </div>
          </div>
        )}

        {/* Populated state */}
        {!loading && entries.length > 0 && (
          <>
            {sections.map(({ label, items }) => {
              if (!items.length) return null
              return (
                <div key={label} className="mb-10">
                  <h2
                    className="text-xs uppercase tracking-widest text-stone-400 mb-4"
                    style={{ fontFamily: 'DM Sans, sans-serif' }}
                  >
                    {label}
                  </h2>
                  {items.map(entry => (
                    <div
                      key={entry.id}
                      onClick={() => setSelectedEntry(entry)}
                      className="bg-white border border-stone-200 rounded-lg p-4 mb-3 cursor-pointer hover:border-stone-300 hover:shadow-sm transition-all"
                    >
                      {/* Row 1: subject + new material badge */}
                      <div className="flex items-center">
                        <span
                          className="font-medium text-[#2a2420]"
                          style={{ fontFamily: 'DM Sans, sans-serif' }}
                        >
                          {entry.subject}
                        </span>
                        {newMaterialAvailable(entry) && (
                          <span
                            className="text-xs text-[#b8924a] ml-2"
                            style={{ fontFamily: 'DM Sans, sans-serif' }}
                          >
                            · new material
                          </span>
                        )}
                      </div>

                      {/* Row 2: synthesis excerpt or placeholder */}
                      {entry.synthesis ? (
                        <p
                          className="text-sm text-stone-500 mt-1"
                          style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic' }}
                        >
                          {entry.synthesis.length > 100
                            ? entry.synthesis.slice(0, 100) + '...'
                            : entry.synthesis}
                        </p>
                      ) : (
                        <p
                          className="text-sm text-stone-400 mt-1"
                          style={{ fontFamily: 'DM Sans, sans-serif', fontStyle: 'italic' }}
                        >
                          not yet synthesized
                        </p>
                      )}

                      {/* Row 3: dream source count */}
                      <p
                        className="text-xs text-stone-400 mt-2"
                        style={{ fontFamily: 'DM Mono, monospace' }}
                      >
                        {entry.dream_sources?.length || 0} dream sources
                      </p>
                    </div>
                  ))}
                </div>
              )
            })}

            <div className="mt-8 flex justify-end">
              <AddButton />
            </div>
          </>
        )}

      {showAddModal && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={handleCloseAddModal}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-[#faf7f2] rounded-xl shadow-xl w-full max-w-md p-6">

              {/* Modal header */}
              <h2
                className="font-serif italic text-xl text-[#3d2b4a] mb-1"
                style={{ fontFamily: 'Cormorant Garamond, serif' }}
              >
                Add to your lexicon
              </h2>
              <p className="font-sans text-xs text-stone-400 mb-6">
                Something that keeps returning and deserves a name.
              </p>

              {/* Subject name input */}
              <div className="mb-5">
                <label className="block font-sans text-xs uppercase tracking-widest text-stone-400 mb-2">
                  Name it
                </label>
                <input
                  type="text"
                  className="w-full border border-stone-200 rounded px-3 py-2 font-sans text-sm text-[#2a2420] bg-white focus:outline-none focus:border-[#b8924a] placeholder-stone-300"
                  placeholder="the red door, the old woman, being chased..."
                  value={newSubject}
                  onChange={e => setNewSubject(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddEntry() }}
                  autoFocus
                />
              </div>

              {/* Type selector */}
              <div className="mb-6">
                <label className="block font-sans text-xs uppercase tracking-widest text-stone-400 mb-2">
                  What is it?
                </label>
                <div className="flex gap-2">
                  {['figure', 'symbol', 'dynamic'].map(type => (
                    <button
                      key={type}
                      onClick={() => setNewSubjectType(type)}
                      className={`flex-1 px-3 py-2 rounded text-xs font-sans capitalize transition-colors ${
                        newSubjectType === type
                          ? 'bg-[#3d2b4a] text-white'
                          : 'border border-stone-200 text-stone-500 hover:border-stone-300'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <button
                  onClick={handleCloseAddModal}
                  className="font-sans text-xs text-stone-400 hover:text-stone-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddEntry}
                  disabled={!newSubject.trim() || !newSubjectType || addingEntry}
                  className="px-5 py-2 bg-[#b8924a] text-white text-sm font-sans rounded hover:bg-[#a07840] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {addingEntry ? 'Adding...' : 'Add to lexicon'}
                </button>
              </div>

            </div>
          </div>
        </>
      )}

      </div>

      {/* Entry detail drawer */}
      {selectedEntry && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={handleCloseDrawer}
          />

          {/* Panel */}
          <div
            className="fixed top-0 right-0 h-full w-full md:w-[420px] bg-[#faf7f2] z-50 shadow-xl overflow-y-auto transition-transform duration-300"
            style={{ transform: 'translateX(0)' }}
          >
            {/* Panel header */}
            <div className="flex items-start justify-between p-6 border-b border-stone-200">
              <div>
                {/* Editable subject name */}
                <input
                  className="font-sans font-medium text-lg text-[#2a2420] bg-transparent border-none outline-none w-full focus:border-b focus:border-[#b8924a]"
                  value={selectedEntry.subject}
                  onChange={(e) => {
                    setSelectedEntry({ ...selectedEntry, subject: e.target.value })
                  }}
                  onBlur={async (e) => {
                    await supabase
                      .from('personal_associations')
                      .update({
                        subject: e.target.value,
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', selectedEntry.id)
                    setEntries(prev => prev.map(en =>
                      en.id === selectedEntry.id
                        ? { ...en, subject: e.target.value }
                        : en
                    ))
                  }}
                />
                {/* Type pill */}
                <span className="inline-block mt-2 px-2 py-0.5 text-xs rounded-full bg-[#3d2b4a] text-[#faf7f2] font-sans capitalize">
                  {selectedEntry.subject_type}
                </span>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button
                  onClick={handleCloseDrawer}
                  className="text-stone-400 hover:text-stone-600 text-xl leading-none"
                >
                  ×
                </button>
                <button
                  onClick={() => handleDeleteEntry(selectedEntry.id)}
                  className="text-xs font-sans text-stone-300 hover:text-red-400 transition-colors"
                >
                  remove
                </button>
              </div>
            </div>

            {/* Panel body */}
            <div className="p-6 space-y-8">

              {gathering && (
                <div className="pb-2">
                  <p
                    className="font-serif italic text-stone-400 text-sm"
                    style={{ fontFamily: 'Cormorant Garamond, serif' }}
                  >
                    gathering from your archive...
                  </p>
                </div>
              )}

              {/* SYNTHESIS SECTION */}
              <div>
                <div className="text-xs font-sans uppercase tracking-widest text-stone-400 mb-3">
                  Your Synthesis
                </div>

                {/* New material notice */}
                {newMaterialAvailable(selectedEntry) && (
                  <p className="text-xs font-sans text-stone-400 mb-3">
                    New dream material has arrived since your last synthesis.
                  </p>
                )}

                {/* No synthesis yet */}
                {!selectedEntry.synthesis && !synthesizing && (
                  <div>
                    <p
                      className="font-serif italic text-stone-400 text-sm mb-4"
                      style={{ fontFamily: 'Cormorant Garamond, serif' }}
                    >
                      No synthesis yet. When you're ready, let the thread be read.
                    </p>
                    <button
                      onClick={handleSynthesize}
                      disabled={!apiKey || !selectedEntry.dream_sources?.length || gathering}
                      className="px-4 py-2 bg-[#b8924a] text-white text-sm rounded hover:bg-[#a07840] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Synthesize
                    </button>
                    {!selectedEntry.dream_sources?.length && (
                      <p className="text-xs text-stone-400 mt-2 font-sans">
                        Add at least one dream source before synthesizing.
                      </p>
                    )}
                  </div>
                )}

                {/* Loading state */}
                {synthesizing && (
                  <p
                    className="font-serif italic text-stone-400 text-sm"
                    style={{ fontFamily: 'Cormorant Garamond, serif' }}
                  >
                    reading the thread...
                  </p>
                )}

                {/* Synthesis exists — view mode */}
                {selectedEntry.synthesis && !editingSynthesis && !synthesizing && (
                  <div>
                    <p
                      className="font-serif italic text-[#2a2420] leading-relaxed text-base"
                      style={{ fontFamily: 'Cormorant Garamond, serif' }}
                    >
                      {selectedEntry.synthesis}
                    </p>
                    <div className="flex gap-3 mt-3">
                      <button
                        onClick={() => {
                          setEditingSynthesis(true)
                          setEditText(selectedEntry.synthesis)
                        }}
                        className="text-xs text-stone-400 hover:text-stone-600 font-sans"
                      >
                        edit
                      </button>
                      <span className="text-stone-300 text-xs">|</span>
                      <button
                        onClick={handleSynthesize}
                        disabled={!apiKey}
                        className="text-xs text-stone-400 hover:text-stone-600 font-sans disabled:opacity-40"
                      >
                        synthesize again
                      </button>
                    </div>
                  </div>
                )}

                {/* Edit mode */}
                {editingSynthesis && (
                  <div>
                    <textarea
                      className="w-full border border-stone-200 rounded p-3 font-serif italic text-[#2a2420] text-sm leading-relaxed bg-white focus:outline-none focus:border-[#b8924a] resize-none"
                      style={{ fontFamily: 'Cormorant Garamond, serif' }}
                      rows={5}
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                    />
                    <div className="flex gap-3 mt-2">
                      <button
                        onClick={handleSaveSynthesis}
                        className="text-xs text-[#b8924a] hover:text-[#a07840] font-sans"
                      >
                        save
                      </button>
                      <button
                        onClick={() => setEditingSynthesis(false)}
                        className="text-xs text-stone-400 hover:text-stone-600 font-sans"
                      >
                        cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* AI error */}
                {aiError && (
                  <div className="mt-3">
                    <AiErrorMessage error={aiError} />
                  </div>
                )}
              </div>

              {/* DREAM SOURCES SECTION */}
              <div>
                {/* Collapsible header */}
                <button
                  onClick={() => setSourcesOpen(prev => !prev)}
                  className="flex items-center gap-2 w-full text-left mb-3"
                >
                  <span className="text-xs font-sans uppercase tracking-widest text-stone-400">
                    Dream Sources
                  </span>
                  <span className="text-stone-300 text-xs">
                    {sourcesOpen ? '▴' : '▾'}
                  </span>
                </button>

                {sourcesOpen && (
                  <div>
                    {/* Source list */}
                    {(!selectedEntry.dream_sources ||
                      selectedEntry.dream_sources.length === 0) && (
                      <p className="text-xs font-sans italic text-stone-400 mb-3">
                        No dream sources yet.
                      </p>
                    )}

                    {(selectedEntry.dream_sources || []).map((source, i) => (
                      <div
                        key={source.dream_id || i}
                        className="mb-4 pb-4 border-b border-stone-100 last:border-0"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-sans text-xs text-[#2a2420] font-medium">
                              {source.dream_title || 'Untitled dream'}
                            </span>
                            <span className="font-mono text-xs text-stone-400 ml-2">
                              {source.dream_date}
                            </span>
                          </div>
                          <button
                            onClick={() => handleRemoveSource(source.dream_id)}
                            className="text-stone-300 hover:text-stone-500 text-xs ml-2 leading-none mt-0.5"
                          >
                            ×
                          </button>
                        </div>
                        <p
                          className="font-serif italic text-stone-500 text-sm mt-1 leading-relaxed"
                          style={{ fontFamily: 'Cormorant Garamond, serif' }}
                        >
                          {source.association_text}
                        </p>
                      </div>
                    ))}

                    {/* Add from dream link */}
                    {!showDreamSelector && (
                      <button
                        onClick={() => {
                          setShowDreamSelector(true)
                          loadDreams()
                        }}
                        className="text-xs font-sans text-stone-400 hover:text-[#b8924a] transition-colors mt-1"
                      >
                        + Add from dream
                      </button>
                    )}

                    {/* Dream selector */}
                    {showDreamSelector && (
                      <div className="mt-3 border border-stone-200 rounded-lg bg-white p-3">
                        <div className="text-xs font-sans text-stone-400 mb-2">
                          Select a dream
                        </div>

                        <input
                          type="text"
                          className="w-full border border-stone-200 rounded px-2 py-1.5 text-xs font-sans text-[#2a2420] bg-white focus:outline-none focus:border-[#b8924a] placeholder-stone-300 mb-2"
                          placeholder="search by title, symbol, figure..."
                          value={dreamSearch}
                          onChange={e => {
                            setDreamSearch(e.target.value)
                            setSelectedDream(null)
                            setSelectedAssociationText('')
                            setManualAssociation('')
                          }}
                        />

                        {dreamsLoading && (
                          <p className="text-xs text-stone-400 italic font-sans">
                            Loading dreams...
                          </p>
                        )}

                        {/* Dream list */}
                        {!dreamsLoading && (
                          <div className="max-h-40 overflow-y-auto space-y-1 mb-3">
                            {dreams
                              .filter(d => !(selectedEntry.dream_sources || [])
                                .some(s => s.dream_id === d.id))
                              .filter(d => {
                                if (!dreamSearch.trim()) return true
                                const q = dreamSearch.toLowerCase()
                                return (
                                  (d.title || '').toLowerCase().includes(q) ||
                                  (d.symbols || []).some(s => s.toLowerCase().includes(q)) ||
                                  (d.archetypes || []).some(a => a.toLowerCase().includes(q)) ||
                                  (d.tags || []).some(t => t.toLowerCase().includes(q)) ||
                                  (d.modal_associations || []).some(a =>
                                    (a.element || '').toLowerCase().includes(q) ||
                                    (a.response || '').toLowerCase().includes(q))
                                )
                              })
                              .map(dream => (
                                <button
                                  key={dream.id}
                                  onClick={() => {
                                    setSelectedDream(dream)
                                    setSelectedAssociationText('')
                                    setManualAssociation('')
                                  }}
                                  className={`w-full text-left px-2 py-1.5 rounded text-xs font-sans transition-colors ${
                                    selectedDream?.id === dream.id
                                      ? 'bg-[#3d2b4a] text-white'
                                      : 'hover:bg-stone-50 text-[#2a2420]'
                                  }`}
                                >
                                  <span className="font-medium">
                                    {dream.title || 'Untitled dream'}
                                  </span>
                                  <span className={`ml-2 font-mono ${
                                    selectedDream?.id === dream.id
                                      ? 'text-white/60'
                                      : 'text-stone-400'
                                  }`}>
                                    {dream.dream_date}
                                  </span>
                                </button>
                              ))
                            }
                          </div>
                        )}

                        {/* Association input for selected dream */}
                        {selectedDream && (() => {
                          const entities = (selectedDream.modal_associations || [])
                            .filter(a => a.type === 'entity' && a.response)
                          const dynamics = (selectedDream.modal_associations || [])
                            .filter(a => a.type === 'dynamic' && a.response)
                          const all = [...entities, ...dynamics]
                            .filter(a => a.response?.trim())

                          return (
                            <div className="mt-2 pt-2 border-t border-stone-100">
                              {selectedDream.body && (
                                <div className="mb-3 pb-3 border-b border-stone-100">
                                  <p
                                    className="font-serif italic text-stone-500 text-xs leading-relaxed line-clamp-6"
                                    style={{ fontFamily: 'Cormorant Garamond, serif' }}
                                  >
                                    {selectedDream.body}
                                  </p>
                                </div>
                              )}
                              {all.length > 0 ? (
                                <div>
                                  <div className="text-xs font-sans text-stone-400 mb-2">
                                    Select what you said about this in that dream:
                                  </div>
                                  <div className="space-y-1 mb-2">
                                    {all.map((a, i) => (
                                      <button
                                        key={i}
                                        onClick={() => {
                                          setSelectedAssociationText(a.response)
                                          setManualAssociation('')
                                        }}
                                        className={`w-full text-left px-2 py-1.5 rounded text-xs font-serif italic transition-colors border ${
                                          selectedAssociationText === a.response
                                            ? 'bg-[#b8924a]/10 border-[#b8924a]/30'
                                            : 'hover:bg-stone-50 border-transparent'
                                        }`}
                                        style={{ fontFamily: 'Cormorant Garamond, serif' }}
                                      >
                                        {a.element && (
                                          <span className="font-sans not-italic text-stone-400 mr-1">
                                            {a.element}:
                                          </span>
                                        )}
                                        {a.response}
                                      </button>
                                    ))}
                                  </div>
                                  <div className="text-xs font-sans text-stone-400 mt-3 mb-1">
                                    Or write your own:
                                  </div>
                                </div>
                              ) : (
                                <div className="text-xs font-sans text-stone-400 mb-2">
                                  What does {selectedEntry.subject} mean in this dream?
                                </div>
                              )}
                              <textarea
                                className="w-full border border-stone-200 rounded p-2 text-xs font-serif italic text-[#2a2420] bg-white focus:outline-none focus:border-[#b8924a] resize-none"
                                style={{ fontFamily: 'Cormorant Garamond, serif' }}
                                rows={2}
                                placeholder="Your association..."
                                value={manualAssociation}
                                onChange={e => {
                                  setManualAssociation(e.target.value)
                                  setSelectedAssociationText('')
                                }}
                              />
                            </div>
                          )
                        })()}

                        {/* Selector actions */}
                        <div className="flex gap-3 mt-3 pt-2 border-t border-stone-100">
                          <button
                            onClick={handleAddSource}
                            disabled={
                              !selectedDream ||
                              (!selectedAssociationText && !manualAssociation.trim())
                            }
                            className="text-xs font-sans text-white bg-[#b8924a] px-3 py-1.5 rounded hover:bg-[#a07840] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Add
                          </button>
                          <button
                            onClick={() => {
                              setShowDreamSelector(false)
                              setSelectedDream(null)
                              setManualAssociation('')
                              setSelectedAssociationText('')
                              setDreamSearch('')
                            }}
                            className="text-xs font-sans text-stone-400 hover:text-stone-600"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>
        </>
      )}
    </div>
  )
}
