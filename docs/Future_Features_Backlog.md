# Dream Weaver — Future Features Backlog
Last updated: April 2, 2026

Items marked ⚡ are immediate priority.
Items marked 🔄 are redesigns of existing features, not new builds.
Items marked 💀 are removed features — recorded here so the decision isn't lost.

---

## 💀 Removed Features

These were built and then deliberately removed. Do not rebuild.

**Complexes Map** — Removed. Diagnostic and redundant with Ask the Archive, Shadow Work,
Dream Series, and Individuation Narrative. Creates false clinical certainty without a
clinical container. ComplexesMap.jsx and /complexes route still exist in codebase —
formal deletion is a cleanup task listed below.

---

## Phase 1 — Design Integrity Pass
*Corrections to the existing app. Not new features — realignments with core philosophy.
Complete before showing the app to anyone outside personal use.*

⚡ 🔄 **Shadow Work redesign — pattern-first, not entry-first**
The current design asks users to do analyst work: title an encounter, assign a quality,
set an integration status. This is the wrong entry point. Redesign:
- Page leads with projected qualities already surfaced from dream analysis, displayed
  as a recurring pattern constellation (grouped list or visual cluster)
- Remove "Record an encounter" form as primary entry point
- Remove manual integration status field entirely — integration status emerges from
  waking life connections, not user categorization
- Primary prompt becomes receptive: "These qualities are appearing in your dreams.
  Does any of this feel alive in your waking life this week?"
- Shadow encounter recording becomes secondary/optional, not the entry point

⚡ 🔄 **Waking Life + Shadow Work link**
Milestones currently float disconnected from the shadow material they represent
integrating. Fix:
- When recording a waking life milestone, offer active shadow qualities as selectable
  chips: "Is this connected to something from your shadow work?"
- Shadow Work page surfaces connected milestone count per quality: "3 waking life
  moments connected to this quality"
- This makes integration visible over time — the arc from projection to recognition
  to embodiment becomes traceable

⚡ 🔄 **Daily Practice redesign — threshold, not dashboard**
Current page shows everything simultaneously. Redesign to show one thing, by priority:
1. Unresponded embodiment prompt from most recent dream
2. Active analyst focus (if exists)
3. Most recent shadow quality not yet connected to any waking life moment
Everything else (full living questions library, waking life strip) moves off this
page entirely.

⚡ 🔄 **Living Questions — one at a time, not a library**
Surface only the single most recent unresponded living question. Volume of accumulated
questions from every dream becomes overwhelming and feeds analysis over embodiment.

⚡ 🔄 **Ask the Archive — add embodiment gesture to every response**
Every Ask the Archive response should close with an embodiment-oriented prompt, the
same way dream analysis does. Update askArchive() system prompt accordingly.

⚡ **Anima/animus in dream analysis**
Stage 2 of individuation is entirely unnamed in the app. Contra-gender dream figures
carry some of the most significant unconscious material and are not currently recognized
as a distinct category.
- Update analyzeDream() system prompt to recognize and name anima/animus figures
  when they appear
- Add anima/animus to jungianTerms.js
- Apply JungianTerm tooltip wherever the term appears in the UI
This does not require a new module — it belongs in dream analysis and shadow work
as a recognized pattern category.

⚡ **The Jungian Self as explicit touchstone**
The organizing center of the psyche — the destination of individuation — is never
named. The individuation narrative should face forward as well as backward.
- Add closing orientation to individuation narrative: "What is the Self asking of
  you right now?"
- The word "Self" (in the Jungian sense) should appear as a touchstone in the
  individuation narrative and My Journey page

⚡ **Complexes formal removal**
Delete ComplexesMap.jsx. Remove /complexes route from routing config. Confirm nothing
else references it before deleting.

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

**Custom mood addition**
Allow users to add their own mood words beyond the 10 presets.
- Saved to profiles.user_moods text[] column
- Available on all future dream entries
- Schema change required

**Life events and psychic material timeline**
Extend /timeline to show two tracks: dreams and significant life events.
- Life events entered manually with categories (relationship, work, health, loss,
  transition, creative, spiritual, body)
- Creates the psychobiographical view — what was happening externally alongside
  what the psyche was saying
- New table: life_events(id, user_id, event_date, title, category, description)

**Shadow Work recurring qualities view**
Scan all shadow_encounters for projected_quality values sharing significant words
or themes. Group under recurring quality themes.
- "Recurring Qualities" section on Shadow Work page
- Simple text matching, no AI
- Build after several months of encounter data exists

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

**Archive search improvements**
Full-text search via Supabase to_tsvector — currently client-side only. Add date
range filtering.

**Duplicate tag cleanup**
Extend existing "scan for bad tags" in Settings to catch semantic duplicates
("locked door" and "locked doors"). Suggest merges, user confirms.

**generateGuideLetter() dead code removal**
This function in ai.js is no longer called from GuideLetter.jsx (Session Letter was
redesigned to pure JS assembly). Safe to remove.

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

**Now:** Phase 1 (design integrity pass) — all items, in order listed.
Shadow Work redesign and Waking Life link first, since they're structurally connected.

**Then:** Technical health cleanup.

**Then:** Phase 2 and 3, based on what actually feels needed after personal use.

**Then:** Phase 4 (guide access system).

**Then:** Phase 6 (Psyche Map) after 6 months personal use. Not before.
