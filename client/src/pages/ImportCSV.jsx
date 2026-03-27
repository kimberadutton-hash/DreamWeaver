import { useRef, useState } from 'react';
import Papa from 'papaparse';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// Correct column mapping (0-indexed):
// Col 0: Dream number (ignore)
// Col 1: Title
// Col 2: Date
// Col 3: Setting
// Col 4: Key Events / Images  → dream body (main content)
// Col 5: Core Emotions        → mood
// Col 6: Notable Symbols      → symbols / tags
// Col 7: Life Context         → appended to body
// Col 8: Notes/Insights       → my_notes (NEVER sent to AI)
// Col 9: Recurring Motifs     → tags
// Col 10: Action/Reflection   → appended to body

function buildBody(row) {
  const parts = [];
  if (row[3]?.trim()) parts.push(`Setting: ${row[3].trim()}`);
  if (row[4]?.trim()) parts.push(row[4].trim());
  if (row[7]?.trim()) parts.push(`Life context: ${row[7].trim()}`);
  if (row[9]?.trim()) parts.push(`Motifs: ${row[9].trim()}`);
  if (row[10]?.trim()) parts.push(`Action/Reflection: ${row[10].trim()}`);
  return parts.join('\n\n');
}

function buildTags(row) {
  const symbols = row[6] ? row[6].split(',').map(s => s.trim()).filter(Boolean) : [];
  const motifs  = row[9] ? row[9].split(',').map(s => s.trim()).filter(Boolean) : [];
  return [...new Set([...symbols, ...motifs])];
}

function normalizeDate(raw) {
  if (!raw?.trim()) return new Date().toISOString().slice(0, 10);
  const d = new Date(raw.trim());
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

// Read File as UTF-8 text string — more reliable for multiline quoted cells
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsText(file, 'UTF-8');
  });
}

export default function ImportCSV() {
  const { user, refreshDreamCount } = useAuth();
  const fileRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    setError('');
    setResults(null);

    let text;
    try {
      text = await readFileAsText(file);
    } catch (err) {
      setError(`Could not read file: ${err.message}`);
      return;
    }

    // Parse the full text string — PapaParse handles RFC 4180 multiline
    // quoted cells correctly when given a string (not a streaming File object)
    const { data, errors } = Papa.parse(text, {
      header: false,
      skipEmptyLines: false, // keep all rows so quoted newlines aren't broken
      quoteChar: '"',
      delimiter: ',',
    });

    if (errors.length && !data.length) {
      setError(`CSV parse error: ${errors[0].message}`);
      return;
    }

    // Detect and skip header row — first cell is typically "Dream #", "#", or a number
    const firstCell = String(data[0]?.[0] ?? '').toLowerCase().trim();
    const isHeader = /^(#|dream\s*#|number|id|col|title)/.test(firstCell) || isNaN(firstCell.replace(/[^\d]/g, '') || 'x');
    const rows = isHeader ? data.slice(1) : data;

    // Filter out completely empty rows
    const validRows = rows.filter(row => row.some(cell => cell?.trim()));

    doImport(validRows);
  }

  async function doImport(rows) {
    setImporting(true);

    // Fetch existing dreams for duplicate detection
    const { data: existing } = await supabase
      .from('dreams')
      .select('dream_date, title')
      .eq('user_id', user.id);

    const existingSet = new Set(
      (existing || []).map(d => `${d.dream_date}|${(d.title || '').toLowerCase().trim()}`)
    );

    let imported = 0;
    let skipped = 0;
    let failed = 0;

    for (const row of rows) {
      const title = row[1]?.trim() || '';
      const date  = normalizeDate(row[2]);
      const body  = buildBody(row);
      const mood  = row[5] ? row[5].split(',').map(m => m.trim()).filter(Boolean) : [];
      const notes = row[8]?.trim() || '';
      const tags  = buildTags(row);

      // Skip rows with no meaningful dream content
      if (!body.trim() && !title.trim()) { skipped++; continue; }

      // Duplicate detection: same date + title
      const dedupKey = `${date}|${title.toLowerCase().trim()}`;
      if (existingSet.has(dedupKey)) { skipped++; continue; }

      const { error: dbErr } = await supabase.from('dreams').insert({
        user_id: user.id,
        dream_date: date,
        title: title || null,
        body: body || title, // fall back to title if body is somehow empty
        mood: mood.length ? mood : null,
        notes: notes || null,
        tags,
        symbols: row[6] ? row[6].split(',').map(s => s.trim()).filter(Boolean) : [],
        has_analysis: false,
      });

      if (dbErr) {
        console.error('Insert failed:', dbErr, row);
        failed++;
      } else {
        imported++;
        existingSet.add(dedupKey);
      }
    }

    setResults({ total: rows.length, imported, skipped, failed });
    refreshDreamCount();
    setImporting(false);
  }

  async function handleClearAll() {
    if (!confirm('Delete ALL dreams in your archive? This cannot be undone.')) return;
    setClearing(true);
    setError('');
    const { error: dbErr } = await supabase
      .from('dreams')
      .delete()
      .eq('user_id', user.id);
    setClearing(false);
    if (dbErr) setError(`Clear failed: ${dbErr.message}`);
    else setResults({ cleared: true });
  }

  return (
    <div className="max-w-2xl mx-auto px-8 py-10">
      <h1 className="font-display italic text-4xl text-ink dark:text-white mb-2">
        Import CSV
      </h1>
      <p className="text-sm font-body text-ink/50 dark:text-white/40 mb-8">
        Import dreams from a Google Sheets CSV export. Duplicate entries are automatically skipped.
      </p>

      {/* Column guide */}
      <div className="mb-8 p-5 rounded-xl bg-white/40 dark:bg-white/5 border border-black/8 dark:border-white/8">
        <p className="text-xs uppercase tracking-widest text-ink/40 dark:text-white/30 font-body mb-3">
          Expected columns (in order)
        </p>
        <div className="grid grid-cols-2 gap-1 text-sm font-body text-ink/70 dark:text-white/60">
          {[
            ['0', 'Dream # (ignored)'],
            ['1', 'Title'],
            ['2', 'Date'],
            ['3', 'Setting'],
            ['4', 'Key Events / Images → body'],
            ['5', 'Core Emotions → mood'],
            ['6', 'Notable Symbols → tags'],
            ['7', 'Life Context → body'],
            ['8', 'Notes/Insights → private notes'],
            ['9', 'Recurring Motifs → tags'],
            ['10', 'Action/Reflection → body'],
          ].map(([num, label]) => (
            <div key={num} className="flex gap-2">
              <span className="text-ink/30 w-6 shrink-0">{num}.</span>
              <span>{label}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-ink/30 dark:text-white/25 font-body mt-3">
          Notes/Insights (col 8) is kept private and never sent to AI.
        </p>
      </div>

      {/* Upload */}
      <div>
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={importing || clearing}
          className="w-full py-4 rounded-xl border-2 border-dashed border-black/15 dark:border-white/15 text-sm font-body text-ink/50 dark:text-white/40 hover:border-plum/40 hover:text-plum dark:hover:text-gold transition-colors disabled:opacity-50"
        >
          {importing ? 'Importing…' : 'Click to select a CSV file'}
        </button>
      </div>

      {error && <p className="mt-4 text-red-600 text-sm font-body">{error}</p>}

      {/* Results */}
      {results && !importing && (
        <div className="mt-6 p-5 rounded-xl bg-white/50 dark:bg-white/5 border border-black/8 dark:border-white/8">
          {results.cleared ? (
            <p className="font-display italic text-xl text-ink dark:text-white">
              Archive cleared. Ready for a fresh import.
            </p>
          ) : (
            <>
              <p className="font-display italic text-2xl text-ink dark:text-white mb-3">Import complete</p>
              <div className="space-y-1 text-sm font-body">
                <p><span className="text-green-600 font-medium">{results.imported}</span> dreams imported</p>
                <p><span className="text-ink/40">{results.skipped}</span> skipped (duplicates or empty rows)</p>
                {results.failed > 0 && (
                  <p><span className="text-red-500">{results.failed}</span> failed — check browser console for details</p>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Danger zone */}
      <div className="mt-12 pt-6 border-t border-black/8 dark:border-white/8">
        <p className="text-xs uppercase tracking-widest text-ink/30 dark:text-white/25 font-body mb-3">
          Danger zone
        </p>
        <button
          onClick={handleClearAll}
          disabled={importing || clearing}
          className="px-4 py-2 rounded-lg text-sm font-body text-red-500 border border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
        >
          {clearing ? 'Deleting…' : 'Delete all dreams'}
        </button>
        <p className="text-xs text-ink/30 dark:text-white/20 font-body mt-1">
          Use this to clear bad imports before re-importing.
        </p>
      </div>
    </div>
  );
}
