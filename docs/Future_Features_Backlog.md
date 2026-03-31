Dream Weaver — Future Features Backlog
Last updated: March 2026
Items marked ⚡ are high priority for next build phase

Immediate — Before Sharing With Others
⚡ Duplicate dream detection
Scan archive for near-duplicate entries (same date, similar body text). Present pairs for review with merge or delete options. Especially important after bulk CSV imports. Pure JavaScript, no AI needed. Lives in Settings → Data & Maintenance.
⚡ Global animation pass
Every collapsed/expanded section currently uses conditional rendering. Replace with smooth CSS max-height transitions throughout. Files: DreamDetail, Individuation, AnalystFocus, GuideLetter, Reference, ActiveImagination, ShadowWork, ComplexesMap. Pattern established in Reference.jsx — apply everywhere.
⚡ Resonance check on AI analysis
After any AI analysis is generated, add a simple prompt: "How much does this resonate with you?" 1-5 scale, optional text. Track over time. If average resonance is low, surface a note. Discuss framing with Doug first — this is the most important analytical ethics question in the app.
⚡ "About this practice" orientation layer
Every major page needs a collapsible orientation section for new users — collapsed by default for returning users, expanded on first visit (tracked in localStorage). Contains: what this practice is, why it matters, how to begin. This is the beginner-friendliness pass.

Next Phase — Core Experience
AI-suggested Dream Series
Reimagined from the manual version. AI reads archive and identifies recurring narrative threads — not just symbols but stories. Suggests series: "These 8 dreams circle your voice being silenced or emerging. Would you like to gather them?" User accepts, adjusts, dismisses. Replaces Symbols & Archetypes in the sidebar. Requires: suggestDreamSeries() function using Opus, series suggestions UI, acceptance flow.
Daily Practice page completion
The Daily Practice page was built but the embodiment check-in was moved there from the floating banner. Verify this is working correctly and the page feels like a genuine morning practice rather than a dashboard.
Jungian term tooltips throughout app
Every Jungian term that appears in the UI (in analysis text, archetype chips, section headers) should have a subtle dotted gold underline. Hovering shows the one-liner from jungianTerms.js. Clicking navigates to the Reference entry. This makes the app self-teaching without requiring users to go looking.
Custom mood addition
Allow users to add their own mood words beyond the 10 presets. Saved to profiles.user_moods text[] column. Available on all future dream entries. Schema change needed.
Personal symbol associations
Users can annotate any symbol in their lexicon with personal associations. "Water means X to me specifically." New table: symbol_associations(user_id, symbol, association). Builds over time into a genuinely personal symbolic vocabulary.

Guide Access System
Waiting for Doug's input — show him QUESTIONS_FOR_DOUG.md first
Secure read-only guide access
Guide receives a link giving read access to client's material. Guide sees dreams, analyses, individuation narrative. Private notes stay private unless client explicitly includes them. Guide can leave annotations — visually distinct from AI analysis, clearly labeled. Guide has their own simple reading interface, not the full app.
Guide dream annotations
Guides leave notes on specific dream passages. Highlighted passages with attached notes, suggested reading, archetypal observations, questions for next session. New table: guide_annotations(dream_id, guide_id, passage_ref, annotation_text, created_at).
Session transcript summarization
Upload or paste a therapy session transcript. AI summarizes key themes, links to recent dreams, extracts focuses and intentions the analyst named. Saved to session record.

Deeper Practice Tools
Life events and psychic material timeline
Extend /timeline to show two tracks side by side: dreams and significant life events. Life events entered manually with categories (relationship, work, health, loss, transition, creative, spiritual, body). Creates the psychobiographical view — what was happening externally alongside what the psyche was saying. New table: life_events(id, user_id, event_date, title, category, description).
Active imagination grounding ritual
Brief optional preparation before entering the dialogue space. Text-based grounding prompt. "Before you begin, take a moment. Set aside what you know..." with "I am present →" button. Also add guidance on distinguishing conscious from unconscious voice — collapsed by default, expandable.
Shadow Work recurring qualities
Scan all shadow_encounters for projected_quality values sharing significant words or themes. Group under recurring quality themes. "Recurring Qualities" section on Shadow Work page. Simple text matching, no AI. Build after several months of encounter data exists.
Backdated dream ordering
When a dream is added with a past date, contextual analysis should use dream_date order not created_at. Dreams analyzed as if encountered chronologically regardless of when entered. Small fix, high correctness value.

Mythological Frameworks
Discuss framing with Doug before building
Hero's Journey and Heroine's Journey
Optional mapping of individuation journey against Campbell's Hero's Journey or Murdock's Heroine's Journey. Add to Reference Library as "Mythological Maps" category. Allow dreamer to choose which resonates. On My Journey page, optionally show where they appear to be in their chosen framework. These are maps not prescriptions — present as invitations to recognition.

Expanded Inner Work Types
Discuss with Doug before building
Multiple entry types beyond dreams
Psychic material from plant medicine journeys, hypnosis, breathwork, waking visions, deep meditation, somatic experiences. Add entry type field to recording form. Analysis prompt adapts by entry type. Consider whether these belong in Dream Weaver or Waking Life. May need its own section. Doug will have strong views on whether plant medicine and dream material should be treated the same way analytically.

The Psyche Map
Build after 6 months of personal use
A living illustrated map of the psyche drawn from the dream archive and individuation narrative. Feels like a map in a children's storybook — hand-drawn, named territories, paths between places. SVG-based, not image generation. Interactive — click a landmark to see associated dreams.
AI generates map data (generatePsycheMap() using Opus): territory names, positions, status (active/completed/emerging), associated dreams, paths between territories, a "Here" marker for current work, a horizon note for where the work is heading.
Dream Series becomes the geography of this map — series built now become named territories later. Build after: guide access system complete, individuation narrative stable, 6 months personal use.

Technical Health
Pre-presentation code cleanup
Remove temporary debug code and console.logs. Review files over 600 lines for splitting. Review package.json for unused dependencies. Run final audit for hardcoded values that should be in constants.js. Do before sharing with anyone outside personal use.
Duplicate tag cleanup
Extend the existing "scan for bad tags" in Settings to catch semantic duplicates ("locked door" and "locked doors"). Suggest merges, user confirms.
Archive search improvements
Full-text search via Supabase to_tsvector — currently client-side only. Add date range filtering.

On Build Order
Right now:

Duplicate dream detection (Settings)
Global animation pass
"About this practice" orientation layer
AI-suggested Dream Series (replacing Symbols & Archetypes in sidebar)
Jungian term tooltips

Then:
Show Doug. Collect his input on the guide access system and the analytical ethics questions. Build the guide access system based on his actual needs.
Then:
6 months of personal use before building the Psyche Map.
