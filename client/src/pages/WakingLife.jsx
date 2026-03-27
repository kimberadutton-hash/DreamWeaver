import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatDate, todayString } from '../lib/constants';

// ── Constants ──────────────────────────────────────────────────────────────

const ENTRY_TYPES = [
  { id: 'art',           label: 'Art',           color: '#3d2b4a' },
  { id: 'music',         label: 'Music',         color: '#4a7c74' },
  { id: 'writing',       label: 'Writing',       color: '#7c6b5a' },
  { id: 'milestone',     label: 'Milestone',     color: '#b8924a' },
  { id: 'body',          label: 'Body',          color: '#9a4a6a' },
  { id: 'synchronicity', label: 'Synchronicity', color: '#3a5a7a' },
];

const TYPE_PLACEHOLDERS = {
  art:           'Name this piece…',
  music:         'What song or piece?',
  writing:       'Title this writing…',
  milestone:     'What was reached?',
  body:          'What did the body know?',
  synchronicity: 'What coincided?',
};

function typeInfo(id) {
  return ENTRY_TYPES.find(t => t.id === id) || ENTRY_TYPES[0];
}

// ── SVG Icons ──────────────────────────────────────────────────────────────

function TypeIcon({ type, size = 20, color = 'currentColor' }) {
  const icons = {
    art: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
        <circle cx="12" cy="12" r="10"/>
        <path d="M8 12 Q10 8 12 12 Q14 16 16 12"/>
      </svg>
    ),
    music: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
        <path d="M9 18V5l12-2v13"/>
        <circle cx="6" cy="18" r="3"/>
        <circle cx="18" cy="16" r="3"/>
      </svg>
    ),
    writing: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
        <path d="M12 20h9"/>
        <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
      </svg>
    ),
    milestone: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
      </svg>
    ),
    body: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
        <path d="M12 2a5 5 0 100 10A5 5 0 0012 2z"/>
        <path d="M12 14c-5 0-8 2.5-8 4v2h16v-2c0-1.5-3-4-8-4z"/>
      </svg>
    ),
    synchronicity: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
        <path d="M5 3l14 9-14 9V3z"/>
        <circle cx="19" cy="12" r="3"/>
      </svg>
    ),
  };
  return icons[type] || icons.art;
}

// ── Type Badge ─────────────────────────────────────────────────────────────

function TypeBadge({ type }) {
  const { label, color } = typeInfo(type);
  return (
    <span
      style={{
        fontSize: 9,
        letterSpacing: '0.18em',
        color,
        backgroundColor: color + '26',
        padding: '2px 8px',
        borderRadius: 99,
        textTransform: 'uppercase',
        fontFamily: 'monospace',
        display: 'inline-block',
      }}
    >
      {label}
    </span>
  );
}

// ── Media helpers ──────────────────────────────────────────────────────────

function getMediaType(mimeType) {
  if (!mimeType) return 'file';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'file';
}

async function uploadMedia(file, userId) {
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${userId}/${timestamp}-${safeName}`;
  const { error } = await supabase.storage
    .from('embodiment-media')
    .upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) throw error;
  // Store the path only — signed URLs are generated at display time
  return { url: path, type: getMediaType(file.type), filename: file.name };
}

// Handles both old entries (stored full public URL) and new ones (stored path)
function getStoragePath(value) {
  if (!value) return null;
  if (value.startsWith('http')) {
    const marker = '/embodiment-media/';
    const idx = value.indexOf(marker);
    return idx !== -1 ? value.slice(idx + marker.length) : null;
  }
  return value; // already a path
}

async function getSignedUrl(path) {
  const storagePath = getStoragePath(path);
  if (!storagePath) return null;
  const { data, error } = await supabase.storage
    .from('embodiment-media')
    .createSignedUrl(storagePath, 3600);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

async function hydrateSignedUrls(entries) {
  return Promise.all(
    entries.map(async entry => {
      if (!entry.media_url) return entry;
      const signedUrl = await getSignedUrl(entry.media_url);
      return { ...entry, media_url_signed: signedUrl };
    })
  );
}

// ── Entry Card (Chronicle) ─────────────────────────────────────────────────

function EntryCard({ entry, onClick }) {
  const { color } = typeInfo(entry.entry_type);
  return (
    <div
      onClick={() => onClick(entry)}
      className="rounded-xl border border-black/8 dark:border-white/8 bg-white/40 dark:bg-white/3 hover:border-black/15 dark:hover:border-white/15 hover:bg-white/60 dark:hover:bg-white/5 transition-all duration-150 cursor-pointer overflow-hidden"
    >
      {entry.media_url && entry.media_type === 'image' && entry.media_url_signed && (
        <div className="w-full h-40 overflow-hidden">
          <img
            src={entry.media_url_signed}
            alt={entry.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <TypeBadge type={entry.entry_type} />
          <span className="text-xs font-body text-ink/30 dark:text-white/25 shrink-0">
            {formatDate(entry.entry_date)}
          </span>
        </div>
        <h3 className="font-display italic text-base text-ink dark:text-white leading-snug mb-1">
          {entry.title}
        </h3>
        {entry.description && (
          <p className="text-sm font-body text-ink/55 dark:text-white/45 leading-relaxed line-clamp-2">
            {entry.description}
          </p>
        )}
        {entry.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {entry.tags.map(tag => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full text-xs font-body bg-black/5 dark:bg-white/8 text-ink/40 dark:text-white/35"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Gallery Card (images only) ─────────────────────────────────────────────

function GalleryCard({ entry, onClick }) {
  return (
    <div
      onClick={() => onClick(entry)}
      className="break-inside-avoid mb-3 rounded-xl overflow-hidden border border-black/8 dark:border-white/8 cursor-pointer hover:border-black/15 dark:hover:border-white/15 transition-all duration-150"
    >
      <img src={entry.media_url_signed || entry.media_url} alt={entry.title} className="w-full block" />
      <div className="px-4 py-3 bg-white/40 dark:bg-white/3">
        <TypeBadge type={entry.entry_type} />
        <p className="font-display italic text-sm text-ink dark:text-white mt-1 leading-snug">
          {entry.title}
        </p>
        <p className="text-xs font-body text-ink/30 dark:text-white/25 mt-0.5">
          {formatDate(entry.entry_date)}
        </p>
      </div>
    </div>
  );
}

// ── Entry Detail Drawer ────────────────────────────────────────────────────

function EntryDetailDrawer({ entry, onClose, onEdit, onDelete }) {
  const { color } = typeInfo(entry.entry_type);
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm('Delete this entry?')) return;
    setDeleting(true);
    if (entry.media_url) {
      const path = getStoragePath(entry.media_url);
      if (path) await supabase.storage.from('embodiment-media').remove([path]);
    }
    await supabase.from('waking_life_entries').delete().eq('id', entry.id);
    onDelete(entry.id);
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={onClose}
      />
      <div className="fixed top-0 right-0 z-50 h-full w-full sm:w-[480px] flex flex-col shadow-2xl"
        style={{ backgroundColor: '#faf7f2' }}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/8"
          style={{ backgroundColor: color + '18' }}
        >
          <div className="flex items-center gap-3">
            <TypeIcon type={entry.entry_type} size={18} color={color} />
            <TypeBadge type={entry.entry_type} />
            <span className="text-xs font-body text-ink/40">{formatDate(entry.entry_date)}</span>
          </div>
          <button
            onClick={onClose}
            className="text-ink/30 hover:text-ink/70 transition-colors text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <h2 className="font-display italic text-2xl text-ink dark:text-ink leading-tight mb-4">
            {entry.title}
          </h2>

          {entry.media_url && entry.media_type === 'image' && entry.media_url_signed && (
            <img
              src={entry.media_url_signed}
              alt={entry.title}
              className="w-full rounded-xl mb-5 border border-black/8"
            />
          )}
          {entry.media_url && entry.media_type === 'audio' && (
            <audio controls className="w-full mb-5">
              <source src={entry.media_url_signed || entry.media_url} />
            </audio>
          )}
          {entry.media_url && entry.media_type === 'file' && (
            <a
              href={entry.media_url_signed || entry.media_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-black/10 text-sm font-body text-ink/60 hover:text-ink/90 transition-colors mb-5"
            >
              ↓ {entry.media_filename || 'Download file'}
            </a>
          )}

          {entry.description && (
            <div className="space-y-3 mb-6">
              {entry.description.split(/\n\n+/).map((p, i) => (
                <p key={i} className="text-[15px] font-body text-ink/80 leading-relaxed">
                  {p.trim()}
                </p>
              ))}
            </div>
          )}

          {entry.linked_dream_id && (
            <div
              className="rounded-xl border border-black/8 bg-white/50 px-4 py-3 mb-5 cursor-pointer hover:border-black/15 transition-colors"
              onClick={() => navigate(`/dream/${entry.linked_dream_id}`)}
            >
              <p style={{ fontSize: 9, letterSpacing: '0.15em' }} className="uppercase font-body text-ink/30 mb-1">
                Linked Dream
              </p>
              <p className="font-display italic text-base text-ink leading-snug">
                {entry.linked_dream_title || 'Untitled Dream'}
              </p>
              {entry.linked_dream_date && (
                <p className="text-xs font-body text-ink/40 mt-0.5">
                  {formatDate(entry.linked_dream_date)}
                </p>
              )}
            </div>
          )}

          {entry.linked_focus_id && entry.linked_focus_text && (
            <div className="rounded-xl border border-black/8 bg-white/50 px-4 py-3 mb-5">
              <p style={{ fontSize: 9, letterSpacing: '0.15em' }} className="uppercase font-body text-ink/30 mb-1">
                Analyst Focus
              </p>
              <p className="text-sm font-body text-ink/70 leading-relaxed">
                {entry.linked_focus_text}
              </p>
            </div>
          )}

          {entry.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-6">
              {entry.tags.map(tag => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full text-xs font-body bg-black/5 text-ink/40"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-black/8 flex items-center justify-between">
          <button
            onClick={() => onEdit(entry)}
            className="px-4 py-2 rounded-lg text-sm font-body text-ink/60 hover:text-ink/90 border border-black/10 hover:border-black/20 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-sm font-body text-red-400/60 hover:text-red-400/90 transition-colors"
          >
            {deleting ? 'Deleting…' : 'Delete entry'}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Entry Form Panel ───────────────────────────────────────────────────────

function EntryFormPanel({ initialEntry, onClose, onSaved, userId }) {
  const isEdit = !!initialEntry?.id;

  const [entryType, setEntryType] = useState(initialEntry?.entry_type || 'art');
  const [entryDate, setEntryDate] = useState(initialEntry?.entry_date || todayString());
  const [title, setTitle] = useState(initialEntry?.title || '');
  const [description, setDescription] = useState(initialEntry?.description || '');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(initialEntry?.media_url || null);
  const [dreamQuery, setDreamQuery] = useState('');
  const [dreamDropdownOpen, setDreamDropdownOpen] = useState(false);
  const [allDreams, setAllDreams] = useState([]);
  const [linkedDream, setLinkedDream] = useState(
    initialEntry?.linked_dream_id
      ? { id: initialEntry.linked_dream_id, title: initialEntry.linked_dream_title }
      : null
  );
  const [focuses, setFocuses] = useState([]);
  const [linkedFocusId, setLinkedFocusId] = useState(initialEntry?.linked_focus_id || '');
  const [tagsRaw, setTagsRaw] = useState(initialEntry?.tags?.join(', ') || '');
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef(null);
  const dreamDropdownRef = useRef(null);

  useEffect(() => {
    async function load() {
      const [{ data: dreams }, { data: focs }] = await Promise.all([
        supabase.from('dreams').select('id, title, dream_date').order('dream_date', { ascending: false }),
        supabase.from('analyst_focuses').select('id, focus_text').order('created_at', { ascending: false }),
      ]);
      setAllDreams(dreams || []);
      setFocuses(focs || []);
    }
    load();
  }, []);

  useEffect(() => {
    function handleOutside(e) {
      if (dreamDropdownRef.current && !dreamDropdownRef.current.contains(e.target)) {
        setDreamDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  function handleFileSelect(file) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError('File must be under 10MB'); return; }
    setMediaFile(file);
    setError('');
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = e => setMediaPreview(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setMediaPreview(null);
    }
  }

  const filteredDreams = dreamQuery.trim()
    ? allDreams.filter(d =>
        d.title?.toLowerCase().includes(dreamQuery.toLowerCase())
      )
    : allDreams.slice(0, 8);

  async function handleSave() {
    if (!title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    setError('');
    try {
      let mediaUrl = initialEntry?.media_url || null;
      let mediaType = initialEntry?.media_type || null;
      let mediaFilename = initialEntry?.media_filename || null;

      if (mediaFile) {
        const uploaded = await uploadMedia(mediaFile, userId);
        mediaUrl = uploaded.url;
        mediaType = uploaded.type;
        mediaFilename = uploaded.filename;
      }

      const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);

      const payload = {
        entry_type: entryType,
        entry_date: entryDate,
        title: title.trim(),
        description: description.trim() || null,
        media_url: mediaUrl,
        media_type: mediaType,
        media_filename: mediaFilename,
        linked_dream_id: linkedDream?.id || null,
        linked_focus_id: linkedFocusId || null,
        tags,
      };

      let result;
      if (isEdit) {
        const { data, error: err } = await supabase
          .from('waking_life_entries')
          .update(payload)
          .eq('id', initialEntry.id)
          .select('*, linked_dream:dreams!linked_dream_id(id, title, dream_date), linked_focus:analyst_focuses!linked_focus_id(id, focus_text)')
          .single();
        if (err) throw err;
        result = flattenEntry(data);
      } else {
        const { data, error: err } = await supabase
          .from('waking_life_entries')
          .insert({ ...payload, user_id: userId })
          .select('*, linked_dream:dreams!linked_dream_id(id, title, dream_date), linked_focus:analyst_focuses!linked_focus_id(id, focus_text)')
          .single();
        if (err) throw err;
        result = flattenEntry(data);
      }
      onSaved(result, isEdit);
    } catch (e) {
      setError(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div
        className="fixed top-0 right-0 z-50 h-full w-full sm:w-[480px] flex flex-col shadow-2xl"
        style={{ backgroundColor: '#faf7f2' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/8"
          style={{ backgroundColor: '#3d2b4a' }}
        >
          <h2 className="font-display italic text-xl text-gold">
            {isEdit ? 'Edit Entry' : 'New Entry'}
          </h2>
          <button onClick={onClose} className="text-white/40 hover:text-white/80 transition-colors text-2xl leading-none">×</button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">

          {/* Type selector */}
          <div>
            <label className="block text-xs font-body text-ink/40 uppercase tracking-widest mb-2" style={{ fontSize: 9 }}>Type</label>
            <div className="grid grid-cols-3 gap-2">
              {ENTRY_TYPES.map(t => {
                const active = entryType === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setEntryType(t.id)}
                    className="flex flex-col items-center gap-1.5 rounded-xl py-3 border transition-all duration-150"
                    style={{
                      borderColor: active ? t.color + '60' : 'rgba(0,0,0,0.08)',
                      backgroundColor: active ? t.color + '12' : 'rgba(255,255,255,0.4)',
                      color: active ? t.color : 'rgba(42,36,32,0.4)',
                    }}
                  >
                    <TypeIcon type={t.id} size={18} color={active ? t.color : 'rgba(42,36,32,0.35)'} />
                    <span className="text-xs font-body">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-body text-ink/40 uppercase tracking-widest mb-1.5" style={{ fontSize: 9 }}>Date</label>
            <input
              type="date"
              value={entryDate}
              onChange={e => setEntryDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-black/10 bg-white/60 text-sm font-body text-ink focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-body text-ink/40 uppercase tracking-widest mb-1.5" style={{ fontSize: 9 }}>Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={TYPE_PLACEHOLDERS[entryType]}
              className="w-full px-4 py-2.5 rounded-xl border border-black/10 bg-white/60 text-sm font-body text-ink placeholder-ink/25 focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-body text-ink/40 uppercase tracking-widest mb-1.5" style={{ fontSize: 9 }}>Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              placeholder="What do you want to remember about this?"
              className="w-full px-4 py-2.5 rounded-xl border border-black/10 bg-white/60 text-sm font-body text-ink placeholder-ink/25 focus:outline-none focus:ring-2 focus:ring-gold/40 resize-none"
            />
          </div>

          {/* Media upload */}
          <div>
            <label className="block text-xs font-body text-ink/40 uppercase tracking-widest mb-1.5" style={{ fontSize: 9 }}>Media (optional, max 10MB)</label>
            <div
              className={`relative rounded-xl border-2 border-dashed transition-all duration-150 ${
                dragOver ? 'border-gold/40 bg-gold/5' : 'border-black/10 bg-white/30'
              }`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault();
                setDragOver(false);
                handleFileSelect(e.dataTransfer.files[0]);
              }}
            >
              {mediaPreview ? (
                <div className="relative">
                  <img src={mediaPreview} alt="preview" className="w-full rounded-xl object-cover max-h-48" />
                  <button
                    onClick={() => { setMediaFile(null); setMediaPreview(null); }}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/40 text-white text-xs flex items-center justify-center hover:bg-black/60"
                  >
                    ×
                  </button>
                </div>
              ) : mediaFile ? (
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-sm font-body text-ink/60">{mediaFile.name}</span>
                  <button onClick={() => setMediaFile(null)} className="text-ink/30 hover:text-ink/60 text-xs">Remove</button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-4 py-5 text-sm font-body text-ink/35 hover:text-ink/60 transition-colors"
                >
                  Drop a file here or click to browse
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,audio/*,.pdf"
                className="hidden"
                onChange={e => handleFileSelect(e.target.files[0])}
              />
            </div>
          </div>

          {/* Link dream */}
          <div ref={dreamDropdownRef} className="relative">
            <label className="block text-xs font-body text-ink/40 uppercase tracking-widest mb-1.5" style={{ fontSize: 9 }}>Link to Dream (optional)</label>
            <input
              type="text"
              value={linkedDream ? linkedDream.title : dreamQuery}
              onChange={e => {
                if (linkedDream) setLinkedDream(null);
                setDreamQuery(e.target.value);
                setDreamDropdownOpen(true);
              }}
              onFocus={() => setDreamDropdownOpen(true)}
              placeholder="Search dreams…"
              className="w-full px-4 py-2.5 rounded-xl border border-black/10 bg-white/60 text-sm font-body text-ink placeholder-ink/25 focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
            {linkedDream && (
              <button
                onClick={() => { setLinkedDream(null); setDreamQuery(''); }}
                className="absolute right-3 top-1/2 translate-y-1 text-ink/25 hover:text-ink/60 text-lg"
              >
                ×
              </button>
            )}
            {dreamDropdownOpen && !linkedDream && (
              <div className="absolute z-10 top-full mt-1 w-full bg-white dark:bg-gray-900 rounded-xl border border-black/10 shadow-lg max-h-48 overflow-y-auto">
                {filteredDreams.length === 0 ? (
                  <p className="px-4 py-3 text-sm font-body text-ink/35">No dreams found</p>
                ) : (
                  filteredDreams.map(d => (
                    <button
                      key={d.id}
                      onMouseDown={() => {
                        setLinkedDream(d);
                        setDreamDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-black/5 text-sm font-body text-ink/80 flex items-center justify-between"
                    >
                      <span>{d.title || 'Untitled'}</span>
                      <span className="text-xs text-ink/30">{d.dream_date}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Analyst focus */}
          {focuses.length > 0 && (
            <div>
              <label className="block text-xs font-body text-ink/40 uppercase tracking-widest mb-1.5" style={{ fontSize: 9 }}>Analyst Focus (optional)</label>
              <select
                value={linkedFocusId}
                onChange={e => setLinkedFocusId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-black/10 bg-white/60 text-sm font-body text-ink focus:outline-none focus:ring-2 focus:ring-gold/40"
              >
                <option value="">None</option>
                {focuses.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.focus_text.length > 60 ? f.focus_text.slice(0, 60) + '…' : f.focus_text}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Tags */}
          <div>
            <label className="block text-xs font-body text-ink/40 uppercase tracking-widest mb-1.5" style={{ fontSize: 9 }}>Tags (comma-separated)</label>
            <input
              type="text"
              value={tagsRaw}
              onChange={e => setTagsRaw(e.target.value)}
              placeholder="e.g. grief, integration, body"
              className="w-full px-4 py-2.5 rounded-xl border border-black/10 bg-white/60 text-sm font-body text-ink placeholder-ink/25 focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
          </div>

          {error && (
            <p className="text-sm font-body text-red-400">{error}</p>
          )}
        </div>

        {/* Save */}
        <div className="px-6 py-4 border-t border-black/8">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-xl text-sm font-body font-medium transition-all duration-150"
            style={{ backgroundColor: '#b8924a', color: '#3d2b4a', opacity: saving ? 0.6 : 1 }}
          >
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add to Waking Life'}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Flatten Supabase join result ───────────────────────────────────────────

function flattenEntry(raw) {
  return {
    ...raw,
    linked_dream_title: raw.linked_dream?.title || null,
    linked_dream_date:  raw.linked_dream?.dream_date || null,
    linked_focus_text:  raw.linked_focus?.focus_text || null,
  };
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function WakingLife() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('chronicle'); // 'chronicle' | 'gallery'
  const [typeFilter, setTypeFilter] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [detailEntry, setDetailEntry] = useState(null);

  useEffect(() => {
    if (user) loadEntries();
  }, [user]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('waking-life-prefill');
      if (raw) {
        sessionStorage.removeItem('waking-life-prefill');
        setEditEntry(JSON.parse(raw));
        setShowForm(true);
      }
    } catch {}
  }, []);

  async function loadEntries() {
    const { data } = await supabase
      .from('waking_life_entries')
      .select('*, linked_dream:dreams!linked_dream_id(id, title, dream_date), linked_focus:analyst_focuses!linked_focus_id(id, focus_text)')
      .eq('user_id', user.id)
      .order('entry_date', { ascending: false });
    const flattened = (data || []).map(flattenEntry);
    const hydrated = await hydrateSignedUrls(flattened);
    setEntries(hydrated);
    setLoading(false);
  }

  function openNew() {
    setEditEntry(null);
    setDetailEntry(null);
    setShowForm(true);
  }

  function openEdit(entry) {
    setDetailEntry(null);
    setEditEntry(entry);
    setShowForm(true);
  }

  async function handleSaved(entry, isEdit) {
    const [hydrated] = await hydrateSignedUrls([entry]);
    setEntries(prev =>
      isEdit
        ? prev.map(e => e.id === entry.id ? hydrated : e)
        : [hydrated, ...prev]
    );
    setShowForm(false);
    setEditEntry(null);
    setDetailEntry(hydrated);
  }

  function handleDeleted(id) {
    setEntries(prev => prev.filter(e => e.id !== id));
    setDetailEntry(null);
  }

  // Types that actually have entries (for filter bar)
  const presentTypes = ENTRY_TYPES.filter(t => entries.some(e => e.entry_type === t.id));

  const filtered = typeFilter
    ? entries.filter(e => e.entry_type === typeFilter)
    : entries;

  const galleryEntries = filtered.filter(e => e.media_url && e.media_type === 'image');

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="font-display italic text-base text-ink/45 dark:text-white/35 leading-relaxed max-w-lg">
            Where the inner work leaves traces — art made, music encountered, milestones reached, synchronicities noticed.
          </p>
        </div>
        <button
          onClick={openNew}
          className="shrink-0 ml-6 px-4 py-2 rounded-xl text-sm font-body transition-all duration-150 border border-gold/30 text-gold/80 hover:bg-gold/8 hover:text-gold"
        >
          + New entry
        </button>
      </div>

      {/* Controls */}
      {entries.length > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          {/* Type filter */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setTypeFilter(null)}
              className="px-3.5 py-1.5 rounded-full text-xs font-body transition-colors"
              style={!typeFilter ? {
                color: '#b8924a',
                borderBottom: '2px solid #b8924a',
                borderTop: '2px solid transparent',
                borderLeft: '2px solid transparent',
                borderRight: '2px solid transparent',
                backgroundColor: 'rgba(184,146,74,0.06)',
              } : {
                color: 'rgba(42,36,32,0.45)',
                border: '2px solid transparent',
              }}
            >
              All
            </button>
            {presentTypes.map(t => (
              <button
                key={t.id}
                onClick={() => setTypeFilter(prev => prev === t.id ? null : t.id)}
                className="px-3.5 py-1.5 rounded-full text-xs font-body transition-colors"
                style={typeFilter === t.id ? {
                  color: t.color,
                  borderBottom: `2px solid ${t.color}`,
                  borderTop: '2px solid transparent',
                  borderLeft: '2px solid transparent',
                  borderRight: '2px solid transparent',
                  backgroundColor: t.color + '10',
                } : {
                  color: 'rgba(42,36,32,0.45)',
                  border: '2px solid transparent',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* View toggle */}
          <div className="flex gap-1 rounded-lg border border-black/10 p-0.5 bg-white/40">
            <button
              onClick={() => setView('chronicle')}
              className="px-3 py-1.5 rounded-md text-xs font-body transition-all"
              style={view === 'chronicle' ? { backgroundColor: '#3d2b4a', color: 'white' } : { color: 'rgba(42,36,32,0.5)' }}
            >
              Chronicle
            </button>
            <button
              onClick={() => setView('gallery')}
              className="px-3 py-1.5 rounded-md text-xs font-body transition-all"
              style={view === 'gallery' ? { backgroundColor: '#3d2b4a', color: 'white' } : { color: 'rgba(42,36,32,0.5)' }}
            >
              Gallery
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <p className="text-sm font-body text-ink/30 dark:text-white/25 italic mt-8">Gathering your traces…</p>
      ) : entries.length === 0 ? (
        // Empty state
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="font-display italic text-xl text-ink/35 dark:text-white/25 mb-2 leading-relaxed max-w-sm">
            The inner work leaves traces in the world.
          </p>
          <p className="text-sm font-body text-ink/25 dark:text-white/20 mb-8 max-w-xs leading-relaxed">
            Art made, music encountered, milestones reached, synchronicities noticed — record them here.
          </p>
          <button
            onClick={openNew}
            className="text-sm font-body text-gold/70 hover:text-gold transition-colors"
          >
            Record the first trace →
          </button>
        </div>
      ) : view === 'gallery' ? (
        galleryEntries.length === 0 ? (
          <p className="text-sm font-body text-ink/35 dark:text-white/25 italic mt-8">
            No image entries {typeFilter ? `for ${typeInfo(typeFilter).label}` : ''} yet.
          </p>
        ) : (
          <div className="columns-1 md:columns-2 gap-3">
            {galleryEntries.map(entry => (
              <GalleryCard key={entry.id} entry={entry} onClick={setDetailEntry} />
            ))}
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(entry => (
            <EntryCard key={entry.id} entry={entry} onClick={setDetailEntry} />
          ))}
        </div>
      )}

      {/* Detail drawer */}
      {detailEntry && !showForm && (
        <EntryDetailDrawer
          entry={detailEntry}
          onClose={() => setDetailEntry(null)}
          onEdit={openEdit}
          onDelete={handleDeleted}
        />
      )}

      {/* Form panel */}
      {showForm && (
        <EntryFormPanel
          initialEntry={editEntry}
          onClose={() => { setShowForm(false); setEditEntry(null); }}
          onSaved={handleSaved}
          userId={user.id}
        />
      )}

      <div className="h-12" />
    </div>
  );
}
