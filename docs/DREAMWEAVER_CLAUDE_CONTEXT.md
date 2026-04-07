# DreamWeaver — Claude Project Context
### *Built on the spirit of Lantern*
Last updated: April 7, 2026

---

## The Soul — What This Is

*This section is the foundation. Read it before the technical details. It is what the app is for.*

DreamWeaver is a depth practice tool built on the understanding that the psyche speaks — in dreams, in symbols, in what repels and compels us, in the figures who appear in the night — and that most of us have never been taught to listen.

> *The lantern does not choose your path. It illuminates what is already there.*

**A note on voice:** The soul of this app was written for women in transformation — specifically for the kind of descent that the feminine wisdom traditions encode: Inanna, Persephone, Psyche. The heroine's journey, not the hero's. The app as built is open to anyone doing serious depth work. But it was made from a particular place, and that place is feminine. The technical implementation is gender-neutral. The animating spirit is not. That tension is held consciously, not resolved.

### Who she is — the primary person this was made for

She is in the middle of a transformation she doesn't have words for yet. She knows something is trying to emerge in her and doesn't know how to meet it. She had a dream that shook her and can't stop thinking about it. She feels lost in her own life and doesn't know why.

She is not broken. She is in descent. And she needs a lantern.

### How she wants to feel when she sets it down

Seen — like something witnessed her. Grounded — like she knows where she is. Accompanied — like she is not alone in the dark. Oriented — like she knows which way to walk.

Not fixed. Not analyzed. Not improved. Simply: held, and pointed toward herself.

### The journey it holds

The app is built around the movement that every feminine descent myth encodes: you go down, you surrender what you thought you were, you encounter what lives in the dark, and you return transformed — not with a prize, but as a different person.

| Movement | What lives here |
|----------|----------------|
| **Receive** | Record the dream. Cross the threshold. Let what arrived in the night be held. |
| **Descend** | Go beneath the surface. Meet the shadow, the pattern, the figure who keeps appearing. See the thread. |
| **Encounter** | Enter into relationship with what you find. Active imagination. The dialogue. The figure you've been avoiding. |
| **Return** | Carry what you found back into waking life. Let it change how you move. Let it touch the people you love. |

This cycle does not complete. It deepens. Each dream begins it again.

### What it draws from

Jungian depth psychology — shadow, individuation, active imagination, the Self. The descent myths: Inanna, Persephone, Psyche. The heroine's journey and the feminine wisdom traditions. *Women Who Run With Wolves* and the wildish nature. The understanding that turning toward what is difficult is the practice. The body as the site of integration, not the mind.

These traditions are different lanterns pointing at the same cave. DreamWeaver holds them without marrying any of them.

### What it will never do

- Make anyone feel like something is wrong with them
- Replace the human relationships that hold the work
- Turn the sacred into a self-improvement project
- Diagnose, prescribe, or pathologize
- Reward engagement for its own sake
- Ask someone to analyze themselves instead of live
- Voice the figures that belong to the dreamer alone
- Feed compulsive self-analysis over embodied action

**On interpretation:** DreamWeaver illuminates — it does not label. When it reflects what the psyche is showing, it speaks as a mirror, not a diagnosis. Not *"this symbol means X"* but *"your psyche keeps returning to this… what do you notice?"* The meaning belongs to the dreamer. The app only holds the light.

### The spirit it was built in

This app was built by a woman in the middle of her own descent. Her dreams kept pointing toward a calling: guide, midwife, sacred witness — someone who helps others descend to where the lost things live, and stays with them until they become something new.

DreamWeaver is part of that work. It is the container she wished she'd had. It is made as an act of devotion, not a product. The people who need it will find it because it was made from that place.

*The lantern does not walk the path for you. It lights the next step. That is enough.*

---

## Core Philosophy — Translated Into Design

These principles translate the soul into every technical decision. When a feature proposal conflicts with any of these, the philosophy wins.

- **Inner work in service of outer life** — not self-analysis as an end in itself. Every analysis ends in an embodiment prompt pointing toward waking-life action.
- **The Dream Weaver is the intelligence that sends dreams** — the app receives what it sends. (This is the name Kimber's analyst Doug Graves uses for that intelligence.)
- **Features unlock progressively as the practice deepens** — no manual override, so unlocking feels genuinely earned.
- **A human guide relationship is the primary container** — the app supports it, never replaces it.
- **The goal is coming home to yourself, not understanding yourself.**
- **Gamification, streaks, and anything feeding analysis over embodiment were explicitly rejected.**
- **Shadow work without a human container carries real risk** — Shadow Work requires both 20 dreams and a named guide. Doug's clinical judgment, not a product decision.

---

## The App — Current Technical State

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS |
| Backend | Express.js (health check only) |
| Database | Supabase (PostgreSQL + Auth + Storage) |
| AI | Anthropic Claude API (BYOK, client-side) |
| Storage | Supabase Storage (embodiment-media bucket) |
| Version Control | Git + GitHub (private repo) |

**AI Models:**
- Analysis/narrative/reflection: `claude-opus-4-5`
- Tagging/titles/quick tasks: `claude-haiku-4-5-20251001`
- All model strings live in `AI_MODELS` constant in `client/src/lib/ai.js`

**Key environment variables:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `ANTHROPIC_API_KEY` (user's own key, stored in localStorage only — never transmitted to any server)

---

### Design System

**Colors:**
- Parchment `#faf7f2` — primary background
- Plum `#3d2b4a` — sidebar, primary brand
- Gold `#b8924a` — accents, CTAs, AI indicators
- Ink `#2a2420` — primary text

**Typography:**
- Cormorant Garamond italic — all emotionally significant text, headings, dream content
- DM Sans — all functional UI, labels, navigation
- DM Mono — dates, metadata, small labels

**Principles:** Warm, unhurried, generous whitespace, progressive disclosure, one moment of beauty per page.

---

### Navigation Structure

Tiered — unlocks based on dream count. Guide status controls The Witness section.

```
ALWAYS:          Record a Dream (standalone button, above all sections)
THE THREAD:      Dream Archive, Waking Life (always unlocked)
THE LOOM (3+):   Shadow Work, Active Imagination
THE WEB (10+):   Ask the Archive, My Journey
THE WITNESS:     Analyst Focus, Session Letter  [guide only — hidden entirely when no guide]
```

**Sidebar sections (full unlocked state):**
```
✦  Record a Dream

The Thread
●  Dream Archive
●  Waking Life

The Loom
●  Shadow Work
●  Active Imagination

The Web
●  Ask the Archive
●  My Journey

The Witness  [only visible when hasGuide = true]
●  Analyst Focus
●  Session Letter

────────────────
●  Reference
●  Settings

Sign out
```

**Note:** Daily Practice (/practice, DailyPractice.jsx) has been removed entirely. Its concerns were redistributed: living questions surface on DreamDetail and Waking Life; active shadow quality surfaces on Shadow Work; Waking Life is now a first-class nav item.

**Lock behavior:** Locked sections (The Loom before 3 dreams, The Web before 10 dreams) remain visible in the sidebar but rendered dimmed with a small "locked" label and hover tooltip showing the unlock requirement. The Witness section is absent entirely when `hasGuide` is false — no dimmed state.

**Onboarding flow:** 6 steps. Steps 1–5 cover guide status selection and practice orientation. Step 5 (formerly the final step) now sets `pendingDestination` and advances to Step 6 instead of calling `complete()` directly. Step 6 is API key setup — input field, "Save and enter →" button, and "I'll do this later in Settings" skip link. Both paths call `complete(pendingDestination)`. Progress dots show 6 steps. Back button from Step 6 returns to Step 5.

**Section label styling:** Cormorant Garamond italic, 13px, rgba(255,255,255,0.55) — matching the app name typography.

**Dot indicators:** Active nav item shows a gold filled dot. Inactive shows an unfilled dot with muted border. Record a Dream retains its ✦ icon treatment.

---

### File Structure

```
/
├── client/
│   └── src/
│       ├── components/
│       │   ├── AiErrorMessage.jsx
│       │   ├── DreamPreviewDrawer.jsx
│       │   ├── EmbodimentCheckIn.jsx
│       │   ├── JungianTerm.jsx
│       │   ├── Layout.jsx
│       │   ├── MilestoneModal.jsx
│       │   ├── PracticeOrientation.jsx
│       │   └── Sidebar.jsx
│       ├── contexts/
│       │   └── AuthContext.jsx
│       ├── hooks/
│       │   ├── useApiKey.js
│       │   ├── useNavTier.js
│       │   ├── usePauseGate.js
│       │   └── usePrivacySettings.js
│       ├── lib/
│       │   ├── ai.js
│       │   ├── constants.js
│       │   ├── jungianTerms.js
│       │   ├── storage.js
│       │   └── supabase.js
│       └── pages/
│           ├── ActiveImagination.jsx
│           ├── AnalystFocus.jsx
│           ├── Archive.jsx
│           ├── AskArchive.jsx
│           ├── ComplexesMap.jsx
│           ├── DreamDetail.jsx
│           ├── DreamSeries.jsx
│           ├── EditDream.jsx
│           ├── GuideLetter.jsx
│           ├── ImportCSV.jsx
│           ├── Individuation.jsx
│           ├── Login.jsx
│           ├── NewDream.jsx
│           ├── Onboarding.jsx
│           ├── Reference.jsx
│           ├── Settings.jsx
│           ├── ShadowWork.jsx
│           ├── Timeline.jsx
│           └── WakingLife.jsx
├── docs/
│   ├── BECOMING_PRD.md
│   ├── DREAM_WEAVER_PRD.md
│   ├── DREAMWEAVER_CLAUDE_CONTEXT.md
│   ├── Future_Features_Backlog.md
│   ├── LANTERN_SOUL.md
│   └── QUESTIONS_FOR_DOUG.md
├── server/
│   └── index.js
├── migration_001.sql
├── migration_002.sql
├── migration_003.sql
├── migration_004.sql          ← shadow_theme_notes table + RLS
├── supabase-schema.sql
└── supabase-migration-archive-threads.sql
```

---

### Database Schema Summary

**Core tables:**
- `profiles` — extends auth.users; includes `display_name`, `analyst_name`, `analyst_email`, `dark_mode`, `privacy_settings` (jsonb), `onboarding_complete`, `milestones_seen`, `solo_practitioner`, `working_together_length`, `meeting_frequency`
- `dreams` — core content: `body`, `title`, `mood` (text[]), `archetypes`, `symbols`, `tags`, `reflection`, `invitation`, `embodiment_prompt`, `embodiment_response`, `structure` (jsonb), `shadow_analysis` (jsonb), `series_id`, `is_big_dream`, `dreamer_associations`, `incubation_intention`, `waking_resonances`, `has_analysis`, `last_analyzed_at`
- `archive_queries` — saved Ask the Archive conversations: `question`, `answer`, `messages` (jsonb, array of `{role, content, timestamp}`)
- `user_themes` — AI-generated personal recurring themes

**Practice tables:**
- `shadow_theme_notes` — `user_id`, `theme_name`, `notes` (jsonb array of `{content, created_at}`), `updated_at`; unique on `(user_id, theme_name)`; RLS enabled
- `complexes` — `name`, `description`, `origin_story`, `dream_manifestations`, `waking_manifestations`, `what_it_needs`, `integration_status`, `ai_suggested`, `related_archetypes`
- `dream_series` — `name`, `description` (dreams link via `series_id` FK)
- `imagination_sessions` — `figure_name`, `messages` (jsonb), `preparation_notes`, `closing_reflection`, `analyst_reflection`, `embodiment_prompt`, `closed_at`
- `waking_life_entries` — `entry_type`, `title`, `description`, `entry_date` (date), `media_url`, `media_type`, `linked_dream_id`, `linked_focus_id`, `linked_shadow_quality` (text), `tags`; `entry_type` values: `art`, `music`, `writing`, `milestone`, `body`, `synchronicity`, `shadow_encounter`
- `analyst_focuses` — `focus_text`, `given_date`, `end_date`, `notes`, `is_active`
- `guide_letters` — `letter_text`, `letter_json`, `date_range_start`, `date_range_end`, `sent_at`
- `individuation_narratives` — `narrative` (jsonb v2 or text v1), `narrative_version`, `dream_count`, `last_dream_id`, `is_current`

**Storage:**
- Supabase Storage bucket: `embodiment-media`
- Path pattern: `[user_id]/[timestamp]-[filename]`
- Private bucket, signed URLs required for display

All tables have RLS — users can only read/write their own rows.

---

### Key Architectural Decisions

**BYOK (Bring Your Own Key)**
All AI calls made directly from the browser using the user's personal Anthropic API key. Key stored in localStorage only, never transmitted to any server. Requires `anthropic-dangerous-direct-browser-access: true` header.

**Privacy controls**
`privacy_settings` jsonb on profiles controls what gets sent to AI:
- `share_notes_with_ai` (default false)
- `share_analyst_session_with_ai` (default false)
- `share_analyst_focus_with_ai` (default false)

**Tiered navigation**
`useNavTier()` hook reads `dreamCount` and `profile` from AuthContext. Returns `hasGuide`, `unlocked`, and `unlockRequirement` consumed by Sidebar. Locked items render dimmed with tooltip; The Witness section is hidden entirely when `hasGuide` is false. No manual override — features unlock only when earned.

**Contextual dream analysis**
When analyzing a dream (new or re-analyzed), fetches the 15 most recent dreams where `dream_date < this dream's dream_date`, ordered by `dream_date` descending. Context prompt is explicitly framed as "prior history" — heading reads `DREAM HISTORY PRECEDING THIS DREAM (date range)` and the system prompt tells Claude it is analyzing a historical archive entry. This prevents Claude from treating older dreams as if they are the most recently dreamed.

**Individuation narrative versioning**
v1 narratives: plain text stored in `narrative` column. v2 narratives: JSON with chapters, thesis, closing invitation. `narrative_version` column distinguishes them. v1 shows fallback banner.

**Signed URLs for media**
All media in Supabase Storage requires signed URLs for display. `getSignedUrl()` helper in `WakingLife.jsx`. Extracted to `client/src/lib/storage.js` if shared.

---

### AI Functions in ai.js

| Function | Model | Purpose |
|----------|-------|---------|
| `analyzeDream()` | Opus | Full Jungian analysis with structure, archetypes, symbols, embodiment prompt |
| `generateIndividuationNarrative()` | Opus | First-time full archive narrative |
| `updateIndividuationNarrative()` | Opus | Progressive update with new dreams only |
| `reflectOnSession()` | Opus | Post active imagination analyst reflection |
| `suggestDreamSeries()` | Opus | Identify psychologically coherent series from JS-computed tag-overlap clusters |
| `suggestSeriesAdditions()` | Opus | Evaluate candidate dreams for addition to an existing series |
| `generateTitle()` | Haiku | 3-6 word poetic dream title |
| `generateDreamSummary()` | Haiku | 2-3 sentence dream summary |
| `suggestAdditionalTags()` | Haiku | More tags for existing dream |
| `identifyShadowMaterial()` | Haiku | Shadow figures and projected qualities |
| `prepareImagination()` | Haiku | Pre-session figure profile and questions |
| `imaginationEmbodimentPrompt()` | Haiku | Post-session embodiment question |
| `transcribeImage()` | Opus | Handwritten dream photo to text |
| `askArchive()` | Opus | Natural language Q&A over dream archive with conversation history; every response closes with a ✦ embodiment prompt; signature: `(question, dreams, apiKey, priorMessages=[])` |
| `groupShadowQualities()` | Haiku | Shadow Work page: organize qualities into psychological theme clusters; returns `clusterName`, `qualities`, `descriptor` (one sentence naming the psyche quality), `watchFor` (one sentence beginning "Watch for:") |
| `buildDreamContext()` | — | Pure JS helper, no API call |

---

### Features Built — Complete List

- ✅ Dream recording (text, voice dictation, photo upload)
- ✅ Contextual AI analysis reading dreams chronologically
- ✅ Jungian dream structure arc (exposition, development, peripeteia, lysis)
- ✅ Three-phase tagging (dreamer associations → guide → AI); manual tag input removed from NewDream form — AI-generated tags on analysis unaffected
- ✅ Editable tags with AI suggestions
- ✅ Shadow Work module — redesigned as pattern-first: quality constellation surfaced from both dreams.shadow_analysis and shadow_encounters.projected_qualities, sorted by frequency; receptive prompt; recorded encounters below as secondary entry point; IntegrationStatusTab removed
- ✅ Shadow Work — "currently with you" — most recent quality cluster with no waking life connection surfaces as a single quiet line at the top of the page (quality name + descriptor), above the orienting question
- ✅ Shadow Work — waking encounter count — each ThemeCard shows "X waking encounters →" count link below the card, linking to Waking Life filtered by that quality; count drawn from waking_life_entries of type shadow_encounter
- ✅ Dream Series — manual create/edit/delete plus AI-powered series detection: JS clustering (union-find, Jaccard ≥ 0.35, ≥ 2 shared tags, 3+ dreams) feeds Opus analysis; proposal cards with confidence badges, dream pills, Create/Dismiss; "◆ Find more dreams" on detail page with inline suggestion panel per candidate; origin indicator on cards
- ✅ Active Imagination writing space (user writes both voices — AI does not voice dream figures)
- ✅ Waking Life with media uploads (images, audio); now a first-class nav item in The Thread; supports `?quality=` URL param for filtering by linked_shadow_quality; `shadow_encounter` entry type added (color `#5c4a7c`) for encounters logged from dream detail
- ✅ Individuation narrative with chapter view
- ✅ Living Questions — surface inline on DreamDetail (below analysis, with "I sat with this" button; hidden once responded); surface as a quiet italic prompt at the top of Waking Life; Daily Practice page removed
- ✅ Analyst Focus with running notes
- ✅ Session Letter — fully redesigned as a user-assembled transmission (no AI generation). Three-section builder: dream selector (collapsible, CSS transitions, no pre-selection), waking life selector (collapsible, loads entries from selected dream date range with inclusive end bound), and "anything you want to say." User-written opening and closing fields flank the selections. Live letter preview assembles as pure JS string. Copy / Email (uses `profile.analyst_email`) / Print-to-PDF buttons. Two-column desktop layout.
- ✅ Jungian Reference Library (30+ entries, categorized)
- ✅ Embodiment prompts on every dream analysis
- ✅ Weekly embodiment check-in
- ✅ Pause gate for compulsive recording patterns
- ✅ Onboarding with guide status selection
- ✅ BYOK onboarding — API key setup added as Step 6 of onboarding (final step before entering app); Settings API key section expanded with plain-language explanation, direct link to console.anthropic.com, $5 credit note, and saved-key indicator; ai.js error handling confirmed solid for no_key, invalid_key, no_credits; explicit 429 handling added with type 'rate_limit' and human-readable message
- ✅ Tiered navigation unlocking by dream count + guide status
- ✅ Milestone moments at 3, 10, 20 dreams + guide added
- ✅ Privacy controls (notes, session, focus)
- ✅ Dream Archive with search (including archetypes and symbols) and collapsible date range filtering; search and date range combine additively; embedded Series/Timeline tabs (All Dreams · Series · Timeline tab bar in Archive.jsx; DreamSeries and Timeline rendered inline via `hideHeader` prop)
- ✅ Timeline
- ✅ Ask the Archive with conversation threading — follow-up questions within any saved conversation, full thread stored in `messages` jsonb column, QueryCard/ArchiveThread/MessageBubble component architecture, old rows backfilled via SQL migration
- ✅ Ask the Archive — embodiment gesture — every response closes with a ✦ embodiment prompt pointing toward body or waking life (system prompt update to `askArchive()` only — no changes to AskArchive.jsx or function signature)
- ✅ CSV import
- ✅ Synchronicities (in Waking Life)
- ✅ Big Dream flag
- ✅ Incubation intention — DB column (`incubation_intention`) preserved and still written on save (as empty string); UI input removed from NewDream form; value now implicitly captured via "Your Reflections" field
- ✅ Waking resonances
- ✅ Dream series linking
- ✅ Symbols & Archetypes page — formally retired. `Symbols.jsx`, `/symbols` route, `quickTagDream()`, `generatePersonalThemes()`, and `AI_MODELS.tagging` all removed from codebase.
- ✅ Re-analyze Dream button on EditDream — triggers fresh Jungian analysis using correct chronological context, replaces AI-generated fields only, leaves all user-authored content untouched
- ✅ Anima/animus recognition in dream analysis — system prompt addition to analyzeDream() guides recognition of contra-sexual and magnetically compelling figures in plain language, without clinical labeling. Terms anima/animus deliberately avoided unless dreamer uses them first. jungianTerms.js and Reference.jsx already contained complete entries.
- ✅ 1-hour re-analysis cooldown — `last_analyzed_at` timestamp written on each re-analysis; button shows remaining time and goes muted until cooldown expires
- ✅ Duplicate dream detection — Settings → Data & Maintenance; Jaccard similarity scan within same-date dream groups, inline confirmation before delete, session-only "Not duplicates" dismissal
- ✅ Similar tag detection and merge — Settings → Data & Maintenance; Jaccard similarity scan across all unique tags (threshold 0.25), greedy deduplication by confidence, canonical tag selection, batch merge updates all affected dreams via Supabase, session-only dismissal; jaccardSimilarity() extracted to module scope and shared between both scanners
- ✅ Global animation pass — CollapsibleSection in DreamDetail, ShadowWork EncounterDetailDrawer and EncounterFormPanel; all use CSS transitions (maxHeight + opacity) instead of conditional rendering
- ✅ PracticeOrientation component — Collapsible "About this practice" panel on 11 pages; expanded on first visit via localStorage per storageKey, collapsed thereafter
- ✅ JungianTerm tooltip component — Gold dotted underline on Jungian terms in static UI copy; 200ms fade tooltip with definition one-liner + "Read more in Reference →" link; flips above trigger when near viewport bottom; applied to: peripeteia/lysis (DreamDetail), synchronicity (WakingLife), individuation (Individuation, Onboarding), active imagination/shadow (ActiveImagination, ShadowWork, MilestoneModal), complex/projection (ComplexesMap, ShadowWork)
- ✅ Sidebar redesign — navigation restructured into The Thread / The Loom / The Web / The Witness; section labels in Cormorant Garamond italic; dot indicators (filled gold = active, unfilled = inactive); locked sections dimmed with tooltip; The Witness hidden entirely when no guide
- ✅ Waking Life + Shadow Work integration — when recording/editing a waking life entry, recurring shadow qualities (appearing ≥2× across shadow_encounters and dreams.shadow_analysis) appear as selectable chips; selected quality stored in `linked_shadow_quality` column and displayed in EntryDetailDrawer; shadow constellation on ShadowWork.jsx now counts waking life moments per quality; closes the integration arc: quality appears in dreams → recognized in shadow work → claimed in waking life
- ✅ Shadow encounter inline modal on DreamDetail — "Record as shadow encounter →" opens an inline form on the dream page (no navigation); pre-populates shadow figures and projected qualities as read-only chips; description textarea + date field; saves to `waking_life_entries` as type `shadow_encounter` with `linked_dream_id`, `linked_shadow_quality`, and `tags` (qualities); "Encounter recorded: [name]" confirmation links to Waking Life filtered by quality
- ✅ Shadow encounters migrated from shadow_encounters table — on first ShadowWork load per user, existing shadow_encounters rows are migrated to waking_life_entries (type shadow_encounter); idempotent via localStorage gate; shadow_encounters table preserved but no longer written to
- ✅ Shadow Work — cluster descriptors and watchFor — `groupShadowQualities()` now returns `descriptor` (one sentence naming the quality) and `watchFor` (one sentence beginning "Watch for:") per cluster; displayed on ThemeCard in Cormorant Garamond italic and DM Sans respectively; waking life matching fixed to exact match on `linked_shadow_quality` column (no tag scanning)
- ✅ Shadow Work — quality frequency filtering — before clustering, qualities filtered to those appearing in 2+ dreams (deduped per dream); fallback to all qualities if fewer than 3 pass, so page never renders empty
- ✅ Shadow Work — cluster caching — clusters cached in localStorage (`dw_shadow_clusters_${userId}`) alongside dream count at cache time; cache reused on page load when dream count matches; "Refresh ↺" link reruns clustering and updates cache; prevents reshuffling on every load
- ✅ Shadow Work — shadow type labeling — each ThemeCard shows a soft one-time prompt to classify the cluster as Golden shadow, Dark shadow, or Not sure yet; selection persisted to `dw_shadow_type_${userId}_${clusterName}` in localStorage; golden/dark render as small pills on the card header; watchFor text dynamically adjusts by type: dark → "Watch for: where this pattern acts before you've chosen it," not_sure → "Watch for: where this quality appears — in dreams, in others, in yourself," golden/null → original AI text unchanged
- ✅ NewDream form cleanup — removed Today's Reflection daily prompt card, Current Analytical Focus banner, mood chips, manual tag input, and the separate "Before Analysis" / "My Notes" / incubation intention textareas; merged into a single **"Your Reflections"** textarea (saves to `dreamer_associations`, shows gold ✦ shared with AI indicator when `share_notes_with_ai` is on); analyst session moved into a slide-in right drawer (400px desktop / full-width mobile, parchment bg, 300ms CSS transition) triggered by quiet "+ Analyst notes" link below action buttons — drawer only renders when `hasGuide` is true; `share_analyst_session_with_ai` privacy logic unchanged; `activeFocus` still fetched and passed to `analyzeDream()`
- ✅ `jungianTerms.js` — `self` entry updated: new oneLiner ("The organizing center of the whole psyche — not something you arrive at, but something you were never separate from."); body and `inYourDreams` rewritten to carry the "coming home / never separate / always already there" voice; `inYourDreams` uses wise elder, luminous child, still center in chaos, numinous quality imagery; `relatedTerms` adds `shadow`
- ✅ `generateIndividuationNarrative()` and `updateIndividuationNarrative()` in `ai.js` — closing instruction added before JSON spec in both functions shaping the existing `closingInvitation` field toward "What is the Self asking of you right now?" orientation; no JSON structure changed, no other functions touched

---

### What's Next — Priority Order

1. **Show Doug** — Review `QUESTIONS_FOR_DOUG.md`; collect input on guide access system and analytical ethics before any public launch
2. **Guide access system** — After Doug's input
3. **Psyche Map** — After 6 months personal use

---

### Known Issues / Technical Debt

- Old `archive_queries` rows with null/empty messages require SQL backfill (`supabase-migration-archive-threads.sql`) to display as threads

---

### Immutable Constraints

These are not preferences. They are load-bearing walls.

- **Never use `claude-opus-4-6`** — returns 500 errors on standard keys. Use `claude-opus-4-5`.
- **All AI model strings must reference `AI_MODELS` constant**, never hardcoded
- **Never send notes or analyst_session to AI** unless privacy toggle explicitly true
- **Shadow Work requires guide** — never unlock without `hasGuide && tier >= 3`
- **No manual navigation unlock** — tiers unlock only by earning them
- **Dream context fetch must use `dream_date <` not `created_at`** — chronological integrity
- **AI must never voice dream figures** — the active imagination space is for the user to write both sides

---

### Working Principles — How This Gets Built

- Every Claude Code prompt touching the database or privacy-sensitive features gets reviewed here in Claude.ai first
- Complete file contents inlined directly (not referenced) produce more reliable Claude Code results
- Large batches cause context limit failures — one focused feature per prompt
- Explicit "Do NOT change" guardrails in prompts prevent unintended merging of old and new layouts
- Doug's clinical judgment is authoritative on all ethically sensitive design decisions

---

## Documents in /docs

| File | Purpose |
|------|---------|
| `BECOMING_PRD.md` | Philosophical foundation — read to understand the soul of the app |
| `DREAM_WEAVER_PRD.md` | Original technical PRD — database schema, feature specs |
| `DREAMWEAVER_CLAUDE_CONTEXT.md` | This file — current state for Claude sessions |
| `LANTERN_SOUL.md` | The original soul document — the animating spirit beneath the technical reality |
| `Future_Features_Backlog.md` | Everything worth building, prioritized |
| `QUESTIONS_FOR_DOUG.md` | Clinical ethics questions before any public launch |

---

## How to Update This Document

Update at the end of every Claude session or after any significant build.

**After building a feature:** Move it from "What's Next" to "Features Built." Add any new files to File Structure. Add new database tables/columns to the schema. Add new AI functions to the table. Remove from Known Issues if fixed.

**After design decisions:** Add to Key Architectural Decisions if it's a pattern others need to know. Update navigation structure if sidebar changes. Update constraints if new rules were established.

**After talking to Doug:** Note any clinical guidance that affects feature design. Update backlog based on his input.

**Keep it honest** — if something is broken or incomplete, say so in Known Issues. This document is for orienting Claude quickly, not for presenting a polished picture.
