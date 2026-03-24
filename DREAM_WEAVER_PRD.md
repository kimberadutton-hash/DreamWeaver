# Dream Weaver — Product Requirements Document

**Version:** 1.0
**Last Updated:** March 2026
**Status:** Active Development

---

## 1. Product Overview

### 1.1 Vision

Dream Weaver is a personal Jungian dream journal web application that helps individuals record, analyze, and understand the symbolic language of their unconscious mind. It combines the depth of Jungian depth psychology with modern AI to surface patterns, archetypes, and recurring themes across a lifetime of dreams.

### 1.2 Core Philosophy

- **Privacy-first.** The user's dreams are their most private inner world. Nothing is shared without explicit action. Private notes are never sent to AI. The API key never leaves the user's device.
- **Depth over volume.** This is not a dream logging app. It is a psychological practice tool. Quality of reflection matters more than quantity of entries.
- **The user is the expert.** AI assists interpretation — it does not replace the dreamer's own knowing. Every AI-generated insight is framed as an invitation, not a verdict.
- **Beautiful and unhurried.** The aesthetic should feel like a handmade journal, not a productivity dashboard.

### 1.3 Target User

A single user (or small number of close users) running their own instance of the app. The primary user is someone engaged in depth psychological work — either in Jungian analysis, Jungian-influenced therapy, or serious self-directed inner work. They may have years or decades of dream records. They are not a casual user; they are a dedicated practitioner.

---

## 2. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS with custom design tokens |
| Backend | Express.js (health endpoint only) |
| Database | Supabase (PostgreSQL + Auth) |
| AI | Anthropic Claude API (client-side, BYOK) |
| Auth | Supabase email/password auth |
| Hosting | Designed for Vercel (frontend) + local/cloud server |

### 2.1 Bring Your Own Key (BYOK) Architecture

All AI calls are made **directly from the browser** using the user's personal Anthropic API key. The key is stored in `localStorage` only and is never transmitted to any server. This means:

- No AI costs to the app operator
- Full privacy — AI requests go directly from browser to Anthropic
- User retains complete control over their AI access
- Requires `anthropic-dangerous-direct-browser-access: true` header

### 2.2 AI Models Used

| Task | Model | Reason |
|---|---|---|
| Full dream analysis | `claude-opus-4-5` | Highest quality Jungian reflection |
| Title generation | `claude-haiku-4-5-20251001` | Fast, cheap, good enough |
| Quick-tagging | `claude-haiku-4-5-20251001` | Batch operation, speed matters |
| Personal themes | `claude-opus-4-5` | Deep pattern recognition needed |
| Image transcription | `claude-opus-4-5` | Vision capability required |

---

## 3. Design System

### 3.1 Color Palette

| Token | Value | Usage |
|---|---|---|
| `parchment` | `#faf7f2` | Primary background |
| `plum` | `#3d2b4a` | Primary brand color, sidebar |
| `gold` | `#b8924a` | Accent, highlights, CTAs |
| `ink` | `#2a2420` | Primary text |
| Various category colors | See §7.2 | Archetype category cards |

### 3.2 Typography

| Role | Font | Usage |
|---|---|---|
| Display / headings | Cormorant Garamond (italic) | Page titles, dream titles, section headers |
| Body / UI | DM Sans | Labels, descriptions, navigation, buttons |
| Dream text | Cormorant Garamond (regular) | Dream body text, reflections |

### 3.3 Design Principles

- Warm, handmade aesthetic — parchment backgrounds, serif type, soft shadows
- Dark mode supported (toggled in Settings, saved to profile)
- No hard corners — rounded cards, soft transitions
- Generous whitespace — this is a reflective tool, not a dashboard

---

## 4. Database Schema

### 4.1 Tables

**`profiles`** — Extends `auth.users`
- `id` (uuid, PK, FK → auth.users)
- `display_name` (text)
- `analyst_name` (text, default: 'Analyst')
- `analyst_email` (text)
- `dark_mode` (boolean)
- `created_at` (timestamptz)

**`dreams`** — Core content table
- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users)
- `dream_date` (date)
- `title` (text)
- `body` (text, required)
- `mood` (text) — comma-separated multi-mood string e.g. `"Anxious, Melancholic"`
- `notes` (text) — private notes, never sent to AI
- `analyst_session` (text) — therapy session notes
- `tags` (text[])
- `archetypes` (text[])
- `symbols` (text[])
- `reflection` (text) — AI-generated Jungian reflection
- `invitation` (text) — AI-generated closing contemplation sentence
- `has_analysis` (boolean)
- `created_at` / `updated_at` (timestamptz)

**`archive_queries`** — Saved Ask Your Archive Q&A
- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users)
- `question` (text)
- `answer` (text)
- `created_at` (timestamptz)

**`user_themes`** — AI-generated personal recurring themes
- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users, UNIQUE)
- `themes` (jsonb) — array of theme objects
- `generated_at` (timestamptz)
- `dream_count_at_generation` (int)

### 4.2 Row Level Security

All tables enforce RLS. Users can only read and write their own rows. Policies enforced at the database level, not just application level.

---

## 5. Features

### 5.1 Authentication

- Email/password auth via Supabase
- Auto-creates profile row on signup (trigger)
- Protected routes redirect to `/login`
- Session persists across browser refreshes

### 5.2 New Dream Entry (`/new`)

**Form fields:**
- Date (defaults to today)
- Title (optional — AI can generate one)
- Dream body (required, large textarea)
- Mood selection (multi-select from 10 preset moods: Peaceful, Anxious, Joyful, Melancholic, Fearful, Mysterious, Confused, Ecstatic, Unsettled, Hopeful)
- My Notes (private — clearly labeled as never shared with AI)
- Analyst Session notes

**Input aids:**
- **Voice dictation** — Web Speech API integration with punctuation normalization (spoken "period", "comma" etc. → actual punctuation; auto-capitalization after sentence endings)
- **Photo/handwriting upload** — Upload image of handwritten dream notes; Claude Vision transcribes the text into the body field
- **Daily prompt** — Rotating Jungian reflection prompt shown as placeholder text (7 prompts cycling by day of week)

**On save:**
- If no title: AI generates a poetic 3-6 word title (Haiku model)
- If API key present: Full Jungian analysis runs automatically (Opus model)
- Analysis produces: improved title, 2-4 paragraph reflection, archetypes array, symbols array, tags array, closing invitation sentence
- Shows amber warning banner if no API key configured

**Tag quality rules (enforced in AI prompts):**
- Maximum 3 words per tag
- Each tag must be one of: pure emotion, animal name, Jungian term, place/setting, or concrete symbol
- No sentences, descriptions, or clauses

### 5.3 Dream Archive (`/archive`)

- Reverse chronological list of all dreams
- Each entry shows: date, title, mood pills, excerpt, analysis indicator
- Full-text search across title, body, and tags (client-side filter)
- **Auto-title banner** — if untitled dreams exist, shows count and "Generate titles" button with live `N/total` progress counter
- Clicking any dream navigates to Dream Detail

### 5.4 Dream Detail (`/dream/:id`)

Displays full dream record:
- Date, title, mood pills
- Dream body text
- Tags, archetypes, symbols (as pill chips)
- Jungian Reflection (AI-generated, in accent style)
- Closing invitation sentence
- My Notes section
- Analyst Session section

**Actions:**
- **Analyze** — runs full AI analysis if not yet done
- **Edit** — navigates to edit form
- **Print** — `window.print()`
- **Email Analyst** — opens mailto with dream content pre-filled (uses analyst email from Settings)
- **Delete** — with confirmation

### 5.5 Edit Dream (`/dream/:id/edit`)

Editable fields:
- Date, title, dream body
- Multi-mood selector
- My Notes
- Analyst Session
- Tags (comma-separated text input)

Saves back to Supabase. Fixed bug: form state uses `moods` (array) locally but saves as `mood` (comma-joined string) to DB.

### 5.6 Symbols & Archetypes (`/symbols`)

The most complex page. Shows all symbols, archetypes, and tags from the user's archive organized into a two-level hierarchy.

**Architecture:**
- All tags/archetypes/symbols/moods collected from archive
- Each item counted by number of dreams it appears in
- Items categorized using strict word-boundary matching (see §7)
- Only categories with at least one matching item are shown

**Category cards (collapsed):**
- Unique hand-drawn SVG illustration
- Category name (Cormorant italic, category color)
- "appears in X dreams"
- Top 3 most frequent symbols as preview chips
- Expand chevron

**Category cards (expanded):**
- All symbol chips with `×count`
- Click a chip → shows related dreams inline within the card
- Click again to deselect

**Other Symbols:**
- Tags that match no category shown as a simple collapsible list at the bottom
- Labeled "Other Symbols (N)"
- Same chip + related dreams behavior

**Quick-tag banner:**
- If dreams exist with no tags/archetypes/symbols: shows count and "◈ Quick-tag all" button
- Runs batch AI tagging (Haiku model) with live progress counter
- Requires API key

**My Recurring Themes (bottom section):**
- Visually separated with "Personally Yours" label
- Requires minimum 10 dreams
- AI generates 3-5 unique personal themes from entire archive (tags, titles, moods)
- Each theme: evocative name, description, keywords, AI-chosen color
- Saved to `user_themes` table — not regenerated on every visit
- "↺ Regenerate" option with confirmation
- Themes shown as warm cards with ✦ AI badge

### 5.7 Timeline (`/timeline`)

- All dreams grouped by year
- Within each year: listed chronologically with date, title, mood
- Click any dream to view detail

### 5.8 Ask Your Archive (`/ask`)

- Natural language question input
- Sends question + archive summary (all dream titles, dates, bodies truncated to 300 chars, tags) to Claude Opus
- AI responds as a Jungian analyst with 2-4 warm, specific paragraphs citing actual dreams
- "Save this response" button → saves Q&A to `archive_queries` table
- Saved insights list below — collapsible, deletable entries
- Requires API key (shows amber banner if absent)

### 5.9 CSV Import (`/import`)

Imports dreams from a Google Sheets CSV export with this column format:

| Col | Field |
|---|---|
| 0 | Dream number (ignored) |
| 1 | Title |
| 2 | Date |
| 3 | Setting |
| 4 | Key Events (becomes dream body) |
| 5 | Mood |
| 6 | Symbols |
| 7 | Life Context |
| 8 | Notes (private) |
| 9 | Motifs |
| 10 | Action |

- Reads file as text string before PapaParse to handle multiline quoted cells
- `skipEmptyLines: false` to prevent breaking quoted cells
- Skips header row
- Shows import count on completion
- "Delete all dreams" danger zone for clearing bad imports

### 5.10 Settings (`/settings`)

**Profile section:**
- Display name
- Analyst name (renames "Analyst Session" label throughout app)
- Analyst email (used by Email Analyst button)
- Dark mode toggle
- Account email (read-only)

**AI Access section:**
- Anthropic API key input (password field with show/hide)
- Status indicator: green "configured" / amber "not configured"
- Note: key stored only on device, never sent to servers
- Save / Remove buttons

**Data & Maintenance section:**
- "Scan for bad tags" button
- Analyzes archive for: tags >40 chars, >4 words, HTML fragments, starts with `-•*`, starts with quote, is a category label name
- Near-duplicate merging: "The Shadow" + "Shadow" → whichever is more common
- Preview: "Found X bad tags and Y duplicates across Z dreams"
- Confirm → apply; Cancel → dismiss

---

## 6. Navigation

Sidebar navigation (always visible, left panel, plum background):

```
◎  Archive
✦  New Dream
◈  Symbols & Archetypes
◌  Timeline
◇  Ask Your Archive
⊕  Import CSV
◦  Settings
```

Bottom of sidebar: Sign out button.

---

## 7. Symbols & Archetypes Category System

### 7.1 Matching Rules

Tags are matched to categories using **strict word-boundary matching** (`\b` regex), not substring matching. This prevents false positives like "fearful" matching "fear" or "shadow" matching "foreshadow".

Matching order matters — first match wins. Categories are checked in this order:
Shadow → Animus → Anima → Great Mother → Wise Guide → Child → Trickster → Self → Animals → Body → Thresholds → Structures → Nature → Transformation → Emotions → Relational → Voice → Belonging → Feminine Power → Uncategorized

Special rules:
- **Emotions**: tag must be ≤3 words AND be a pure emotion word (no descriptive phrases)
- **Animals**: tag must literally BE an animal name (not just relate to animals)
- **Body**: tag must reference actual body parts or physical experiences

Tags that are themselves category labels (e.g., "The Shadow", "Trickster") are filtered out entirely — not shown as chips inside their own category.

### 7.2 Category Definitions

| Key | Label | Color | Icon |
|---|---|---|---|
| `shadow` | The Shadow | `#3d2b4a` | Dark swirling cloaked figure |
| `animus` | The Animus | `#4a5c7c` | Tower with rays above |
| `anima` | The Anima | `#c9748a` | Two intertwined crescent forms |
| `great-mother` | The Great Mother | `#4a7c74` | Vessel with moon and roots |
| `wise-guide` | The Wise Guide | `#7c5c3a` | Robed figure with staff and orb |
| `child` | The Child | `#c9974a` | Small figure with light rays |
| `trickster` | The Trickster | `#c96a4a` | Spiraling chaotic lines |
| `self` | The Self | `#b8924a` | Radiant mandala |
| `animals` | Animals & Creatures | `#5a7c4a` | Paw print |
| `body` | The Body | `#9a4a4a` | Heart with radiating lines |
| `journeys` | Thresholds & Journeys | `#6b4d80` | Winding path to horizon |
| `structures` | Structures & Spaces | `#5c6b7c` | House with lit window |
| `nature` | Natural Elements | `#4a7c5c` | Four elements in quadrants |
| `transformation` | Transformation | `#c97a3a` | Phoenix flame |
| `emotions` | Core Emotions | `#9a6a7a` | Wave with spiral |
| `relational` | Relational Figures | `#6b7c4a` | Two overlapping circles |
| `voice` | Voice & Expression | `#7a6b9a` | Open mouth with sound waves |
| `belonging` | Belonging & Identity | `#7a8c6b` | Figure with circle of others |
| `feminine` | Feminine Power | `#9a7a4a` | Rising figure with outstretched arms |

Icons are hand-drawn SVG (no external images). All use the category color with opacity/gradient layering.

---

## 8. AI Features Summary

### 8.1 Full Dream Analysis (`analyzeDream`)

**Model:** claude-opus-4-5
**Input:** title, body, mood
**Output (JSON):**
```json
{
  "title": "evocative title",
  "reflection": "2-4 paragraph Jungian reflection",
  "archetypes": ["Shadow", "Anima", ...],
  "symbols": ["snake", "locked door", ...],
  "tags": ["grief", "forest", "transformation", ...],
  "invitation": "A gentle closing question for the dreamer"
}
```

### 8.2 Title Generation (`generateTitle`)

**Model:** claude-haiku-4-5-20251001
**Input:** body (first 600 chars), mood
**Output:** 3-6 word poetic title, no punctuation

### 8.3 Quick Tag (`quickTagDream`)

**Model:** claude-haiku-4-5-20251001
**Input:** body (first 800 chars), mood
**Output (JSON):**
```json
{
  "tags": ["5-8 short tags"],
  "symbols": ["3-6 symbolic objects/places"],
  "archetypes": ["canonical Jungian archetype names only"]
}
```

### 8.4 Ask Your Archive (`askArchive`)

**Model:** claude-opus-4-5
**Input:** question, array of dream summaries (date, title, body excerpt, tags)
**Output:** 2-4 paragraph conversational response citing specific dreams

### 8.5 Image Transcription (`transcribeImage`)

**Model:** claude-opus-4-5 (vision)
**Input:** base64 image
**Output:** plain text transcription of handwritten content

### 8.6 Personal Themes (`generatePersonalThemes`)

**Model:** claude-opus-4-5
**Input:** all tags (up to 200), all titles (up to 100), all moods, total dream count
**Output (JSON array):**
```json
[
  {
    "name": "The Burning House",
    "description": "A sentence describing what this theme means for this dreamer",
    "keywords": ["fire", "home", "escape", "childhood"],
    "color": "#c97a3a"
  }
]
```
Minimum 10 dreams required to unlock. Result saved to `user_themes` and cached.

---

## 9. Error Handling

### 9.1 AI Errors (`AiError` class)

Custom error class with `type` field:

| Type | Meaning | User Message |
|---|---|---|
| `no_key` | No API key in localStorage | "No API key — add your Anthropic key in Settings." |
| `invalid_key` | 401 from Anthropic | "Invalid API key — check your key in Settings." |
| `no_credits` | Insufficient credits | "Your API key has insufficient credits. Visit console.anthropic.com/billing." |
| `api_error` | Other API failure | The raw error message or "API error {status}" |

### 9.2 `AiErrorMessage` Component

Renders friendly, contextual error UI for any `AiError`. Shown inline near the action that triggered the error. Includes a link to Settings where relevant.

---

## 10. Data Privacy

| Data | Where Stored | Shared With AI? |
|---|---|---|
| Dream body | Supabase | Yes (for analysis) |
| Dream title | Supabase | Yes |
| Mood | Supabase | Yes |
| My Notes | Supabase | **Never** |
| Analyst Session | Supabase | **Never** (only emailed) |
| API key | localStorage only | Never (used as auth header only) |
| Profile info | Supabase | Never |

---

## 11. Known Limitations & Constraints

- **Single-tenant design.** The app is built for one user (or a small household). There is no multi-tenancy, team features, or sharing.
- **BYOK required for AI.** Without an Anthropic API key, all AI features are disabled. The app remains functional as a plain journal.
- **claude-opus-4-5 only.** `claude-opus-4-6` returns 500 errors on standard API keys; stay on `claude-opus-4-5` for analysis and `claude-haiku-4-5-20251001` for lightweight tasks.
- **Mood stored as string.** Multiple moods are stored as a comma-separated string (`"Anxious, Melancholic"`) in a single `text` column. This avoids a schema migration but means mood filtering is string-based.
- **No offline support.** Requires active internet for Supabase and Anthropic API calls.
- **CSV import is format-specific.** Import only works with the exact Google Sheets column layout documented in §5.9.

---

## 12. Future Considerations

These are not committed features — they are possibilities worth tracking:

- **Search improvements** — Full-text search via Supabase `to_tsvector`, currently client-side only
- **Dream series / recurring dreams** — Ability to link dreams that share a thread
- **Date range filtering** — Filter archive by year, month, or custom range
- **Export** — Download full archive as PDF, Markdown, or JSON
- **Analyst sharing** — Secure, read-only link to share a single dream with a therapist
- **Mood analytics** — Timeline view of mood patterns over time (not just dreams by date)
- **Dream incubation** — Set an intention before sleep; app surfaces it the next morning
- **Multiple users** — Shared instance for couples or small groups with full data isolation
- **Mobile app** — React Native port or PWA with offline drafts

---

## 13. File Structure

```
/
├── client/                     # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── AiErrorMessage.jsx
│   │   │   ├── Layout.jsx
│   │   │   └── Sidebar.jsx
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx
│   │   ├── hooks/
│   │   │   └── useApiKey.js
│   │   ├── lib/
│   │   │   ├── ai.js           # All Anthropic API calls
│   │   │   └── supabase.js     # Supabase client
│   │   └── pages/
│   │       ├── Archive.jsx
│   │       ├── AskArchive.jsx
│   │       ├── DreamDetail.jsx
│   │       ├── EditDream.jsx
│   │       ├── ImportCSV.jsx
│   │       ├── Login.jsx
│   │       ├── NewDream.jsx
│   │       ├── Settings.jsx
│   │       ├── Symbols.jsx     # Largest/most complex page
│   │       └── Timeline.jsx
│   └── .env                    # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
├── server/
│   └── index.js                # Express (health check only)
├── supabase-schema.sql          # Full DB schema with RLS
└── DREAM_WEAVER_PRD.md         # This document
```

---

*Dream Weaver is built to last as long as the dreamer keeps dreaming.*
