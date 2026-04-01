DreamWeaver — Claude Project Context
Last updated: April 1, 2026 (session: JungianTerm tooltips, PracticeOrientation, animation pass)

What This App Is
DreamWeaver is a depth psychological practice tool built on Jungian principles. It helps people record and analyze dreams, track their individuation journey, and bring the inner work into embodied daily life.
Core philosophy:

Inner work in service of outer life — not self-analysis as an end in itself
The Dream Weaver is the intelligence that sends dreams — the app receives what it sends
Features unlock progressively as the practice deepens
A human guide relationship is the primary container — the app supports it, never replaces it
The goal is coming home to yourself, not understanding yourself

Target user: Someone doing serious depth psychological work, ideally with a Jungian analyst or depth-oriented guide.

Tech Stack
LayerTechnologyFrontendReact 18 + ViteStylingTailwind CSSBackendExpress.js (health check only)DatabaseSupabase (PostgreSQL + Auth + Storage)AIAnthropic Claude API (BYOK, client-side)StorageSupabase Storage (embodiment-media bucket)Version ControlGit + GitHub (private repo)
AI Models:

Analysis/narrative/reflection: claude-opus-4-5
Tagging/titles/quick tasks: claude-haiku-4-5-20251001
All model strings live in AI_MODELS constant in client/src/lib/ai.js

Key environment variables:

VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
ANTHROPIC_API_KEY (user's own key, stored in localStorage only)


Design System
Colors:

Parchment #faf7f2 — primary background
Plum #3d2b4a — sidebar, primary brand
Gold #b8924a — accents, CTAs, AI indicators
Ink #2a2420 — primary text

Typography:

Cormorant Garamond italic — all emotionally significant text, headings, dream content
DM Sans — all functional UI, labels, navigation
DM Mono — dates, metadata, small labels

Principles: Warm, unhurried, generous whitespace, progressive disclosure, one moment of beauty per page.

Current Navigation Structure
Tiered — unlocks based on dream count and guide status:
TIER 0 (0-2 dreams): Record a Dream, Daily Practice
TIER 1 (3-9 dreams): + Dream Archive, Waking Life
TIER 2 (10-19 dreams): + My Journey, Ask the Archive, Reference
  [with guide]: + Analyst Focus, Session Letter
TIER 3 (20+ dreams): + Active Imagination, Dream Series, Timeline, Import
  [with guide]: + Shadow Work
Sidebar sections (full mode):
THE INNER WORK
◐  Record a Dream
≋  Dream Archive
◎  Active Imagination
◈  Shadow Work (guide required)
◎  Complexes Map

THE EMBODIMENT
◎  Daily Practice
◉  Waking Life

THE JOURNEY
⌾  My Journey
◌  Dream Series
◌  Timeline

THE RELATIONSHIP
◦  Analyst Focus (guide required)
◎  Session Letter (guide required)
◇  Ask the Archive

────────────────
◉  Reference
⊙  Import
◦  Settings

File Structure
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
│           ├── DailyPractice.jsx
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
│           ├── Symbols.jsx
│           ├── Timeline.jsx
│           └── WakingLife.jsx
├── docs/
│   ├── BECOMING_PRD.md
│   ├── DREAM_WEAVER_PRD.md
│   ├── DREAMWEAVER_CLAUDE_CONTEXT.md (this file)
│   ├── Future_Features_Backlog.md
│   └── QUESTIONS_FOR_DOUG.md
├── server/
│   └── index.js
├── supabase-schema.sql
└── supabase-migration-archive-threads.sql

Database Schema Summary
Core tables:

profiles — extends auth.users, includes display_name, analyst_name, analyst_email, dark_mode, privacy_settings (jsonb), onboarding_complete, milestones_seen, solo_practitioner, working_together_length, meeting_frequency
dreams — core content: body, title, mood (text[]), archetypes, symbols, tags, reflection, invitation, embodiment_prompt, embodiment_response, structure (jsonb), shadow_analysis (jsonb), series_id, is_big_dream, dreamer_associations, incubation_intention, waking_resonances, has_analysis, last_analyzed_at
archive_queries — saved Ask the Archive conversations: question, answer, messages (jsonb, array of {role, content, timestamp})
user_themes — AI-generated personal recurring themes

Practice tables:

shadow_encounters — type, title, projected_quality, projected_qualities (text[]), owned_quality, ai_reflection, integration_status, linked_dream_id
complexes — name, description, origin_story, dream_manifestations, waking_manifestations, what_it_needs, integration_status, ai_suggested, related_archetypes
dream_series — name, description (dreams link via series_id FK)
imagination_sessions — figure_name, messages (jsonb), preparation_notes, closing_reflection, analyst_reflection, embodiment_prompt, closed_at
waking_life_entries — entry_type, title, description, media_url, media_type, linked_dream_id, linked_focus_id, tags
analyst_focuses — focus_text, given_date, end_date, notes, is_active
guide_letters — letter_text, letter_json, date_range_start, date_range_end, sent_at
individuation_narratives — narrative (jsonb v2 or text v1), narrative_version, dream_count, last_dream_id, is_current
imagination_sessions — as above

Storage:

Supabase Storage bucket: embodiment-media
Path pattern: [user_id]/[timestamp]-[filename]
Private bucket, signed URLs required for display

All tables have RLS — users can only read/write their own rows.

Key Architectural Decisions
BYOK (Bring Your Own Key)
All AI calls made directly from the browser using the user's personal Anthropic API key. Key stored in localStorage only, never transmitted to any server. Requires anthropic-dangerous-direct-browser-access: true header.
Privacy controls
privacy_settings jsonb on profiles controls what gets sent to AI:

share_notes_with_ai (default false)
share_analyst_session_with_ai (default false)
share_analyst_focus_with_ai (default false)

Tiered navigation
useNavTier() hook reads dreamCount from AuthContext and guide status from profile. Returns unlocked and visibleLocked objects consumed by Sidebar. No manual override — features unlock only when earned.
Contextual dream analysis
When analyzing a dream (new or re-analyzed), fetches the 15 most recent dreams where dream_date < this dream's dream_date, ordered by dream_date descending. Context prompt is explicitly framed as "prior history" — heading reads "DREAM HISTORY PRECEDING THIS DREAM (date range)" and the system prompt tells Claude it is analyzing a historical dream, not a current one. This prevents Claude from treating old dreams as if they are the most recently dreamed.
Individuation narrative versioning
v1 narratives: plain text stored in narrative column.
v2 narratives: JSON with chapters, thesis, closing invitation. narrative_version column distinguishes them. v1 shows fallback banner.
Signed URLs for media
All media in Supabase Storage requires signed URLs for display. getSignedUrl() helper in WakingLife.jsx and DailyPractice.jsx. Extracted to client/src/lib/storage.js if shared.

AI Functions in ai.js
FunctionModelPurposeanalyzeDream()OpusFull Jungian analysis with structure, archetypes, symbols, embodiment promptgenerateIndividuationNarrative()OpusFirst-time full archive narrativeupdateIndividuationNarrative()OpusProgressive update with new dreams onlygenerateGuideLetter()OpusPre-session letter from selected dreamsreflectOnSession()OpusPost active imagination analyst reflectionsuggestComplexes()OpusIdentify complexes from archive patternssuggestDreamSeries()OpusIdentify psychologically coherent series from JS-computed tag-overlap clusterssuggestSeriesAdditions()OpusEvaluate candidate dreams for addition to an existing seriesgenerateTitle()Haiku3-6 word poetic dream titlequickTagDream()HaikuBatch tagginggenerateDreamSummary()Haiku2-3 sentence dream summarysuggestAdditionalTags()HaikuMore tags for existing dreamidentifyShadowMaterial()HaikuShadow figures and projected qualitiesprepareImagination()HaikuPre-session figure profile and questionsimaginationEmbodimentPrompt()HaikuPost-session embodiment questiontranscribeImage()OpusHandwritten dream photo to textaskArchive()OpusNatural language Q&A over dream archive with conversation history; signature: (question, dreams, apiKey, priorMessages=[])generatePersonalThemes()Opus3-5 personal themes from full archivebuildDreamContext()—Pure JS helper, no API call

Features Built — Complete List

✅ Dream recording (text, voice dictation, photo upload)
✅ Contextual AI analysis reading dreams chronologically
✅ Jungian dream structure arc (exposition, development, peripeteia, lysis)
✅ Three-phase tagging (dreamer associations → guide → AI)
✅ Editable tags with AI suggestions
✅ Shadow Work module with encounter tracking
✅ Complexes Map with AI identification
✅ Dream Series — manual create/edit/delete plus AI-powered series detection: JS clustering (union-find, Jaccard ≥ 0.35, ≥ 2 shared tags, 3+ dreams) feeds Opus analysis; "◆ Find series with AI" button on list page; proposal cards with confidence badges, dream pills, Create/Dismiss; "◆ Find more dreams" on detail page with inline suggestion panel per candidate; origin indicator on cards (◆ gold = AI-created/has description, ◌ = manual)
✅ Active Imagination writing space (user writes both voices)
✅ Waking Life with media uploads (images, audio)
✅ Daily Practice page
✅ Individuation narrative with chapter view
✅ Living Questions on Daily Practice
✅ Analyst Focus with running notes
✅ Session Letter with curatorial dream selection
✅ Jungian Reference Library (30+ entries, categorized)
✅ Embodiment prompts on every dream analysis
✅ Weekly embodiment check-in
✅ Pause gate for compulsive recording patterns
✅ Onboarding with guide status selection
✅ Tiered navigation unlocking by dream count + guide status
✅ Milestone moments at 3, 10, 20 dreams + guide added
✅ Privacy controls (notes, session, focus)
✅ Dream Archive with search (including archetypes)
✅ Timeline
✅ Ask the Archive with conversation threading — follow-up questions within any saved conversation, full thread stored in messages jsonb column, QueryCard/ArchiveThread/MessageBubble component architecture, old rows backfilled via SQL migration
✅ CSV import
✅ Synchronicities (in Waking Life)
✅ Big Dream flag
✅ Incubation intention
✅ Waking resonances
✅ Dream series linking
✅ Symbols & Archetypes page (in sidebar, pending replacement by AI Dream Series)
✅ Personal themes generation
✅ Re-analyze Dream button on EditDream — triggers fresh Jungian analysis using correct chronological context (dreams before this dream's date only), replaces AI-generated fields only, leaves all user-authored content untouched
✅ 1-hour re-analysis cooldown — last_analyzed_at timestamp written on each re-analysis; button shows remaining time and goes muted until cooldown expires
✅ Duplicate dream detection — Settings → Data & Maintenance; Jaccard similarity scan within same-date dream groups, inline confirmation before delete, session-only "Not duplicates" dismissal
✅ Global animation pass — CollapsibleSection in DreamDetail, ShadowWork EncounterDetailDrawer and EncounterFormPanel; all use CSS transitions (maxHeight + opacity) instead of conditional rendering
✅ PracticeOrientation component — Collapsible "About this practice" panel on 11 pages (Record, Archive, Active Imagination, Shadow Work, Daily Practice, Waking Life, My Journey, Ask the Archive, Dream Series, Session Letter, Complexes Map); expanded on first visit via localStorage per storageKey, collapsed thereafter
✅ JungianTerm tooltip component — Gold dotted underline on Jungian terms in static UI copy; 200ms fade tooltip with definition one-liner + "Read more in Reference →" link; flips above trigger when near viewport bottom; definitions sourced from jungianTerms.js; applied to: peripeteia/lysis (DreamDetail), synchronicity (WakingLife), individuation (Individuation, Onboarding), active imagination/shadow (ActiveImagination, ShadowWork, MilestoneModal), complex/projection (ComplexesMap, ShadowWork)


What's Next (Priority Order)

1. Global animation pass — Replace conditional rendering with CSS transitions (in progress)
2. "About this practice" orientation layer — Collapsible on each page for new users (in progress)
3. Jungian term tooltips — Dotted gold underline on all Jungian terms, hover definition (in progress)
4. Repo cleanup — After current three features complete: dead code removal (getStoredApiKey export), Symbols.jsx retirement with ai.js function audit
5. Show Doug — Collect input on guide access system and analytical ethics
6. Guide access system — After Doug's input
7. Psyche Map — After 6 months personal use


Known Issues / Technical Debt

Global animation pass not yet complete — some collapsed sections still use conditional rendering instead of CSS transitions (maxHeight + opacity).
When Symbols.jsx is retired from the nav, audit these two functions in ai.js:
- generatePersonalThemes() — currently called only from Symbols.jsx. Worth keeping: move call site to Individuation.jsx or DreamSeries.jsx before deleting from Symbols. Personal theme generation belongs in the journey layer, not a reference page.
- quickTagDream() — currently called only from Symbols.jsx. Check ImportCSV.jsx first — if batch-tagging on import doesn't need it, delete it. If it does, move the call site there.
Do not delete either function until Symbols.jsx is fully retired and call sites are resolved.


Important Constraints

Never use claude-opus-4-6 — returns 500 errors on standard keys. Use claude-opus-4-5.
All AI model strings must reference AI_MODELS constant, never hardcoded
Never send notes or analyst_session to AI unless privacy toggle explicitly true
Shadow Work requires guide — never unlock without hasGuide && tier >= 3
No manual navigation unlock — tiers unlock only by earning them
Dream context fetch must use dream_date < not created_at — chronological integrity


Documents in /docs
FilePurposeBECOMING_PRD.mdPhilosophical foundation — read this to understand the soul of the appDREAM_WEAVER_PRD.mdOriginal technical PRD — database schema, feature specsDREAMWEAVER_CLAUDE_CONTEXT.mdThis file — current state for Claude sessionsFuture_Features_Backlog.mdEverything worth building, prioritizedQUESTIONS_FOR_DOUG.mdClinical ethics questions before any public launch

How to Update This Document
Update this file at the end of every Claude session or after any significant build. Things to update:
After building a feature:

Move it from "What's Next" to "Features Built"
Add any new files to the File Structure
Add any new database tables/columns to Database Schema
Add any new AI functions to the AI Functions table
Remove from Known Issues if fixed

After design decisions:

Add to Key Architectural Decisions if it's a pattern others need to know
Update navigation structure if sidebar changes
Update constraints if new rules were established

After talking to Doug:

Note any clinical guidance that affects feature design
Update backlog based on his input

Keep it honest — if something is broken or incomplete, say so in Known Issues. This document is for orienting Claude quickly, not for presenting a polished picture.
