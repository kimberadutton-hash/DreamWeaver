# Dream Weaver — Future Features Backlog
Last updated: April 6, 2026

Items marked ⚡ are immediate priority.
Items marked 🔄 are redesigns of existing features, not new builds.
Items marked 💀 are removed features — recorded here so the decision isn't lost.

---

## 💀 Removed Features

These were built and then deliberately removed. Do not rebuild.

**Complexes Map** — Removed. Diagnostic and redundant with Ask the Archive, Shadow Work,
Dream Series, and Individuation Narrative. Creates false clinical certainty without a
clinical container. ComplexesMap.jsx, /complexes route, suggestComplexes(), and
generateGuideLetter() have all been deleted. Feature is fully retired from the codebase.

**Daily Practice page** — Removed. The /practice route, DailyPractice.jsx, and "Daily
Practice" sidebar nav item have all been deleted. Its three concerns were redistributed:
living questions surface inline on DreamDetail (with "I sat with this" button) and as a
prompt at the top of Waking Life; the active shadow quality surfaces at the top of Shadow
Work; Waking Life is now a first-class nav item in The Thread. Do not rebuild this page.

---

## Phase 1 — Design Integrity Pass
*Corrections to the existing app. Not new features — realignments with core philosophy.
Complete before showing the app to anyone outside personal use.*

✅ 🔄 **Shadow Work redesign — pattern-first, not entry-first** *(completed)*
Page now leads with AI-grouped quality clusters from dreams.shadow_analysis and
shadow_encounters. Clusters have evocative names, a descriptor sentence, and a
"Watch for:" line. Recording space per cluster for waking life observations. Waking
life moments linked via `linked_shadow_quality` exact match. Integration status
emerges from waking life connections and notes, not user categorization. Quality
frequency filtering (2+ dreams) keeps signal-to-noise high. Clusters cached in
localStorage by dream count to prevent reshuffling. Shadow type labeling
(golden/dark/not sure) per cluster, persisted to localStorage, with dynamic watchFor
text and pill indicators.

✅ 🔄 **Daily Practice redesign — threshold, not dashboard** *(completed — differently)*
Resolved by removing the Daily Practice page entirely rather than redesigning it.
Living questions now surface inline on the dream detail page (below analysis, with
"I sat with this" button) and as a soft prompt at the top of Waking Life. The active
shadow quality ("currently with you") surfaces at the top of Shadow Work. Waking Life
promoted to first-class nav item in The Thread. The page itself is gone.

✅ 🔄 **Living Questions — one at a time, not a library** *(completed)*
Single most recent unresponded living question surfaces in two places: inline on the
individual dream's detail page below the analysis section, and as a quiet italic prompt
at the top of Waking Life above the new entry button. "I sat with this" button marks
it responded and removes it from both locations.

✅ 🔄 **Ask the Archive — add embodiment gesture to every response** *(completed)*
Every response now closes with a ✦ embodiment prompt — same somatic/waking-life
orientation that ends dream analysis. askArchive() system prompt updated only.

✅ **Anima/animus in dream analysis** *(completed)*
System prompt refinement only. analyzeDream() now guides recognition of contra-sexual
and magnetically compelling figures in plain language, without clinical labeling. Terms
anima/animus deliberately avoided unless dreamer uses them first. No schema change, no
new UI section. jungianTerms.js and Reference.jsx already contained complete entries.

✅ **The Jungian Self as explicit touchstone** *(completed)*
closingInvitation field in both generateIndividuationNarrative() and
updateIndividuationNarrative() now shaped by closing instruction toward
"What is the Self asking of you right now?" orientation. self entry in
jungianTerms.js rewritten to carry the soul voice.

✅ **Complexes formal removal** *(completed)*
ComplexesMap.jsx deleted. /complexes route, imports, and nav references removed.
suggestComplexes() and generateGuideLetter() removed from ai.js. Feature fully retired.

---

## Phase 2 — Connection and Recurrence
*Features that make the existing material more connected across time.*

🔄 **Active imagination figure recurrence**
Sessions currently exist in isolation. A figure appearing across multiple sessions is
clinically significant and currently invisible.
- Track figure names across imagination_sessions
- Surface on Active Imagination page: "You have sat with [figure] 3 times"
- Link to those sessions for review

**Synchronicity context links**
A synchronicity without connection to a dream or shadow quality is just a noted
coincidence. Linking is what gives it meaning.
- When recording a synchronicity, offer recent dreams and active shadow qualities
  as optional links
- Linked synchronicities display with their connected material in both places

**Shadow integration arc view**
Make the full arc visible: from a quality first appearing projected in a dream, through
shadow recognition, to waking life moments where it was owned.
- Per shadow quality: show originating dream(s), recognition moment, linked waking
  life milestones
- This is primarily a display/linking task, not new data collection
- *The data links exist and are displayed per ThemeCard (Origins + Waking Life Moments
  in history). What remains is a standalone per-quality detail/drill-down view if
  needed — may not be, given current ThemeCard already shows this.*

**Resonance check on AI analysis**
After any AI analysis is generated, add: "How much does this resonate with you?" 1-5
scale, optional text. Track over time. If average resonance is low, surface a note.

---

## Phase 3 — Depth and Self-Teaching
*Features that deepen the practice for users who have been using the app for months.*

**Active imagination grounding ritual**
Brief optional preparation before entering the dialogue space.
- Text-based grounding prompt before session begins
- Guidance on distinguishing conscious from unconscious voice (collapsed, expandable)
- "I am present →" entry button

**Personal symbol associations**
Users annotate symbols in their lexicon with personal meaning.
- "Water means X to me specifically"
- New table: symbol_associations(user_id, symbol, association)
- Builds over time into a genuinely personal symbolic vocabulary
- Schema change required



**Life events and psychic material timeline**
Extend /timeline to show two tracks: dreams and significant life events.
- Life events entered manually with categories (relationship, work, health, loss,
  transition, creative, spiritual, body)
- Creates the psychobiographical view — what was happening externally alongside
  what the psyche was saying
- New table: life_events(id, user_id, event_date, title, category, description)

**Shadow Work recurring qualities view**
*Largely superseded by the AI clustering redesign.* The current ThemeCard architecture
groups qualities into named psychological clusters with descriptors, which serves the
same purpose more meaningfully than text-matching. Revisit only if users need a
lower-level quality-frequency view that clustering doesn't provide.

---

## Phase 4 — Guide Access System

**Secure read-only guide access**
Guide receives a link giving read access to client's material. Guide sees dreams,
analyses, individuation narrative. Private notes stay private unless client explicitly
includes them. Guide can leave annotations — visually distinct from AI analysis,
clearly labeled.

**Guide dream annotations**
Guides leave notes on specific dream passages. Highlighted passages with attached
notes, suggested reading, archetypal observations, questions for next session.
New table: guide_annotations(dream_id, guide_id, passage_ref, annotation_text,
created_at).

**Session transcript summarization**
Upload or paste a therapy session transcript. AI summarizes key themes, links to
recent dreams, extracts focuses and intentions the analyst named.

---

## Phase 5 — Mythological Frameworks

**Hero's Journey and Heroine's Journey mapping**
Optional mapping of individuation journey against Campbell's Hero's Journey or
Murdock's Heroine's Journey. Add to Reference Library as "Mythological Maps."
Allow dreamer to choose which resonates. On My Journey page, optionally show where
they appear to be in their chosen framework. Maps not prescriptions — presented as
invitations to recognition.

**Multiple entry types beyond dreams**
Psychic material from plant medicine journeys, hypnosis, breathwork, waking visions,
deep meditation, somatic experiences. Consider whether these belong in Dream Weaver
or Waking Life. May need its own section.

---

## Phase 6 — The Psyche Map
*Build after 6 months of personal use. Not before.*

A living illustrated map of the psyche drawn from the dream archive and individuation
narrative. SVG-based, not image generation. Interactive — click a landmark to see
associated dreams. Dream Series become the named territories of this map.

AI generates map data (generatePsycheMap() using Opus): territory names, positions,
status (active/completed/emerging), associated dreams, paths between territories,
a "Here" marker for current work, a horizon note for where the work is heading.

Prerequisites: individuation narrative stable, 6 months personal use.

---

## Technical Health
*Do before sharing with anyone outside personal use.*

**Pre-presentation code cleanup**
Remove debug code and console.logs. Review files over 600 lines for splitting. Review
package.json for unused dependencies. Audit for hardcoded values that should be in
constants.js.

**✅ Archive search improvements (completed)**
Search is client-side, covering title, body, mood, tags, archetypes, and symbols. Date range filtering added — collapsible toggle, combines additively with text search.

**✅ Duplicate tag cleanup (completed)**
Similar tag scanner in Settings → Data & Maintenance. Jaccard similarity across all unique tags, greedy deduplication, canonical selection, batch merge across all affected dreams.

✅ **generateGuideLetter() dead code removal** *(completed)*
Removed from ai.js along with suggestComplexes() and their AI_MODELS entries.

---

## Known Algorithmic Limitations

**Dream Series clustering is tag-overlap only**
Current clustering uses Jaccard similarity on tags — a content similarity measure,
not a psychological one. Dreams working on the same underlying dynamic may look very
different on the surface. Ask the Archive can identify psychologically related series
better than the clustering algorithm. This is a known limitation of the automated
approach.

---

## On Build Order

**Now:** Phase 1 (design integrity pass) — remaining items.
Shadow Work redesign ✅ complete. Daily Practice redesign ✅ complete (removed).
Living Questions ✅ complete. Ask the Archive embodiment gesture ✅ complete.
Complexes formal removal ✅ complete. Anima/animus in analysis ✅ complete.
Remaining: Jungian Self touchstone.

**Then:** Technical health cleanup.

**Then:** Phase 2 and 3, based on what actually feels needed after personal use.

**Then:** Phase 4 (guide access system).

**Then:** Phase 6 (Psyche Map) after 6 months personal use. Not before.
