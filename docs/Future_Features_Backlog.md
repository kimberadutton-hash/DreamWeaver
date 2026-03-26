# Dream Weaver — Future Features Backlog

---

## Data & Content

- **Personal symbol associations** — Allow the user to 
  annotate any symbol in their lexicon with personal 
  associations, not just Jungian definitions. "Water 
  means X to me specifically." Builds over time into 
  a genuinely personal symbolic vocabulary.

- **Custom mood addition** — Allow user to add their 
  own mood words beyond the 10 presets. Saved to 
  profile, available on all future entries.

- **Duplicate dream detection** — Scan archive for 
  near-duplicate entries (same date, similar body 
  text) and present them for review. Especially 
  important after bulk CSV imports. Offer merge or 
  delete options.

- **Backdated dream ordering for analysis** — When 
  a dream is added with a past date (older than 
  existing entries), the contextual analysis should 
  use dream_date order, not created_at order. Dreams 
  should be analyzed as if encountered chronologically 
  by date, regardless of when they were entered into 
  the app.

---

## Guide Annotation & Collaborative Tagging

### Guide Dream Annotations
Guides can leave annotations directly on dream text and in a general notes section per dream. Annotations are visually distinct from AI analysis — a different color, clearly labeled with the guide's name. Can include:
- Highlighted passages with attached notes
- Suggested reading or amplification material
- Archetypal observations
- Questions to bring to the next session

### Three-Phase Tagging System
Change the tagging sequence to honor the clinical process:

Phase 1 — Dreamer associations first
After recording, prompt: "Before analysis, what words or images feel significant to you?"
Free text, saves to dreamer_associations field.
No categories, no structure imposed.

Phase 2 — Guide observations (optional)
Guide can add their own tags and observations before AI runs. Never blocks the workflow — if guide hasn't responded, Phase 3 can proceed.

Phase 3 — AI analysis runs last
AI sees dream + dreamer associations + guide observations + recent dream history.
AI tags clearly marked as AI-generated.
Framed as invitations, not verdicts.
Fully editable/dismissible as currently built.

Database additions needed:
- dreams.dreamer_associations text
- New table: guide_annotations
  (dream_id, guide_id, passage_ref, annotation_text, created_at)

---

## The Psyche Map — The Hundred Acre Wood of the Inner Life

A living illustrated map of the user's psyche, drawn from their dream archive and individuation narrative. Feels like a map in a children's storybook — hand-drawn, named territories, paths between places, a sense of story and landscape.

### What it contains:
- Named territories from recurring symbols and significant dream settings
- Paths between territories reflecting the journey
- A "Here" marker — where the current work is happening
- A "Where the work is heading" zone — sketchy, at the edges, less defined
- Completed territories — more settled, more detailed in rendering
- Active territories — recent dreams, more present and urgent
- Guide annotations on the map
- The map's own title — AI-generated, specific to this person

### Implementation approach:
SVG-based illustrated map, not image generation API. Hand-crafted landmark elements in the existing SVG illustration style. Populates dynamically from dream archive. Interactive — click a landmark to see associated dreams. Parchment background, ink-drawn paths, warm palette.

### AI role:
generatePsycheMap() function using Opus:
- Input: full archive summary, individuation narrative, significant symbols, recurring settings, big dreams
- Output: JSON map data
  {
    "mapTitle": "evocative title for this person's map",
    "territories": [
      {
        "id": "unique-slug",
        "name": "The Locked Cellar",
        "description": "what this place is",
        "status": "active|completed|emerging",
        "associatedDreams": ["dream titles"],
        "position": "rough area: north|south|east|west|center",
        "landmark": "one of the existing SVG landmark types"
      }
    ],
    "paths": [
      {
        "from": "territory-id",
        "to": "territory-id",
        "description": "what connects these"
      }
    ],
    "hereMarker": "territory-id of current work",
    "horizonNote": "what lies at the edge — where the work is heading"
  }

### Build order note:
This is a significant build. Do after:
- Guide access system is complete
- Individuation narrative redesign is stable
- At least 6 months of personal use to validate the concept

---

## Analyst & Therapeutic Integration

- **In-app analyst communication** — A simple secure 
  messaging or note-passing feature to communicate 
  with an analyst directly. Could be as lightweight 
  as a shared-link view of selected dreams with a 
  comment field.

- **Session transcript summarization** — Upload or 
  paste a therapy/analysis session transcript. AI 
  summarizes key themes, links them to recent dreams, 
  and extracts any focuses or intentions the analyst 
  named. Saved to the session record.

---

## Symbol & Archetype Tools

- **Tag highlighting in dream body** — When a tag, 
  symbol, or archetype chip is clicked on the dream 
  detail page, highlight the relevant word or passage 
  in the dream text where that element appears. 
  Answers the question: "Trickster was tagged — but 
  where exactly in the dream?"

- **Jungian reference library** — A built-in 
  glossary page explaining Jungian archetypes, 
  psychological concepts, and common dream symbols 
  (enantiodromia, individuation, anima/animus, 
  the Self, etc.). Accessible from the sidebar and 
  linkable from any tag chip. Written in plain, 
  non-academic language.

---

## Creative & Expressive Record

- **Related resources log** — A place to record 
  books, films, music, artwork, poetry, or other 
  cultural material that feels connected to what 
  the psyche is expressing. Each entry can be 
  linked to specific dreams or themes. Could 
  include:
  - Books currently reading / recently read
  - Tarot pulls and their context
  - Art made in response to dreams
  - Synchronistic media encounters

- **Dream art / image attachment** — Attach or 
  upload images (drawings, paintings, collages) 
  made in response to a dream. Stored with the 
  dream record. AI could optionally describe or 
  reflect on the image in context.

---

## Shadow Work — Recurring Projected Qualities

Scan all `shadow_encounters` for `projected_quality` values that share
significant words or themes. Group encounters under recurring quality
themes. Display as a "Recurring Qualities" section on the Shadow Work
page — below the encounters list.

Shows: quality theme, count, list of encounters that reflect it.
Simple text matching, no AI needed.

Build after several months of encounter data exists.

---

## Technical & UX

- **Duplicate tag cleanup tool** — Already partially 
  in Settings ("scan for bad tags") but extend to 
  catch true semantic duplicates across the archive 
  (e.g. "locked door" and "locked doors" as separate 
  tags). Suggest merges, user confirms.

---

## Code & Repository Health

### Pre-presentation repo cleanup
Before sharing codebase with others:
- Remove all temporary debug code
  and console.logs added during development
- Review component file sizes —
  any file over 600 lines should be
  considered for splitting
- Ensure all environment variables
  are documented in a .env.example file
- Review package.json for unused dependencies
- Ensure README.md accurately describes
  the project, setup steps, and architecture
- Run a final audit for hardcoded values
  that should be in constants.js

Priority: Do before sharing with anyone
outside personal use.

---

## Analytical Ethics & AI Integrity

### Ethical review of AI analysis quality
A formal review of whether AI-generated
analyses stay true to Jungian depth
psychology or impose interpretations
without checking for resonance with
the dreamer.

Questions to investigate:
- Does the analysis reflect back what
  is in the dream, or does it project
  meaning onto it?
- Does it amplify (circle the symbol
  from many directions) or does it
  interpret prematurely?
- Does it honor the dreamer as the
  ultimate authority on their own material?
- Is it doing Jungian amplification
  or is it doing something closer to
  Freudian reductionism?

Possible implementation:
After any AI analysis is generated,
add a simple resonance check —
a single question to the dreamer:
"How much does this analysis resonate
with you?" with a 1-5 scale and
optional free text.
Track resonance scores over time.
If average resonance is low, surface
a note that the analysis may need
to be taken lightly.

Consider adding a "Check for resonance"
prompt directly in the Jungian
Reflection section — before the
dreamer reads the analysis, not after.

Deeper consideration: should the
analysis be more dialogical —
asking the dreamer questions rather
than delivering conclusions?
Jung never analyzed a dream without
the patient's associations.
The app currently skips the
association step entirely.

Priority: Important before opening
to other users. Discuss with Doug first.

---

## Timeline & Life Context

### Life events and psychic material timeline
A unified timeline that shows both
dreams AND significant life events
side by side — so the dreamer can
see what their psyche was processing
during major life periods.

Integration with existing Timeline page:
- Extend /timeline to show two tracks:
  Track 1: Dreams (already exists)
  Track 2: Life events (new)
- Life events entered manually:
  Date, title, category, description
  Categories: relationship, work,
  health, loss, transition, creative,
  spiritual, body, other
- When viewing a life period, see
  both what was happening externally
  and what the dreams were saying

This creates the psychobiographical
view — the full picture of a life
and its inner commentary running
alongside it.

Database: New table life_events
  (id, user_id, event_date, title,
  category, description, created_at)

The individuation narrative could
optionally draw from life events
when generating — gated behind
privacy toggle.

---

## Active Imagination Deepening

### Pre-session grounding practices
Add a preparation ritual before
entering the Active Imagination
dialogue space.

Jung's own approach involved:
- Relaxing the conscious mind without
  falling asleep (the hypnagogic state)
- Fixing attention on a dream image
  or mood
- Allowing the image to move and
  develop without directing it
- Staying present as a witness

Possible implementation:
A brief optional step before the
dialogue space opens — a guided
text-based grounding prompt:

"Before you begin, take a moment.
Set aside what you know. Set aside
what you expect [figure name] to say.
You are not writing a story.
You are listening for something
that already exists.

When you feel present — enter."

With a simple "I am present" button
that opens the dialogue.

### Distinguishing conscious from unconscious voice
Add guidance on how to know whether
the figure's voice is genuine or
whether the ego is doing the writing.

Signs it is genuine:
- It surprises you
- It says something you didn't want
  to hear
- It refuses to cooperate
- It has a different emotional quality
  than your usual inner voice

Signs the ego may be running things:
- Every response confirms what you
  already believe
- The figure is always wise and helpful
- Nothing disturbs you
- You feel in control of the dialogue

This could appear as a brief
educational note in the preparation
panel — collapsed by default,
expandable for those who want it.

---

## Mythological Frameworks

### Hero's Journey and Heroine's Journey
Allow dreamers to optionally map
their individuation journey against
mythological frameworks.

Hero's Journey (Joseph Campbell):
The Ordinary World → Call to Adventure →
Refusal → Meeting the Mentor →
Crossing the Threshold → Tests/Allies/Enemies →
Ordeal → Reward → The Road Back →
Resurrection → Return with Elixir

Heroine's Journey (Maureen Murdock,
developed as a feminine alternative
to Campbell):
Separation from the Feminine →
Identification with the Masculine →
Road of Trials → Finding the Boon →
Awakening to Feelings of Spiritual Aridity →
Initiation and Descent →
Urgent Yearning to Reconnect with the Feminine →
Healing the Mother/Daughter Split →
Healing the Wounded Masculine →
Integration of Masculine and Feminine

Implementation:
Add to the Reference Library as
a new category: "Mythological Maps"
Allow the dreamer to choose which
framework resonates with them
(or both, or neither).
On the My Journey page, optionally
show where they appear to be in
their chosen framework —
informed by the individuation narrative.

Note: These are maps, not prescriptions.
The app should present them as
invitations to recognition, not
diagnostic categories.
Discuss framing with Doug.

---

## Expanded Inner Work Types

### Multiple entry types beyond dreams
Psychic material surfaces in many
contexts beyond nighttime dreams.
Allow the dreamer to record and
analyze material from:

- Plant medicine journeys /
  ceremonial experiences
- Hypnosis sessions
- Breathwork experiences
- Waking visions or spontaneous imagery
- Deep meditation experiences
- Somatic experiences with
  significant psychic content

Implementation:
Add an "Entry type" field to the
dream recording form (or create
a separate but parallel entry flow).
The analysis prompt adapts based
on entry type — a plant medicine
journey is analyzed differently
than a nighttime dream
(different symbolic weight,
different relationship to the ego).

This is a significant expansion —
design carefully. The core dream
journal should remain primary.
Consider whether these belong in
Dream Weaver (the dream section)
or in Waking Life (the embodiment section).
May need its own section entirely.
Discuss with Doug — he will have
views on whether plant medicine
and dream material should be
treated the same way analytically.

---

## Accessibility & Education

### Onboarding for Jungian newcomers
Ensure the app is fully usable by
people with no prior knowledge of
Jung, dreamwork, or shadow work.

Every section needs:
- A brief "What is this?" explanation
  accessible from the section header
- A "Why does this matter?" note
  that connects the practice to
  real life and embodiment
- Plain language throughout —
  no jargon without explanation
- The Reference Library should be
  linked from everywhere a Jungian
  term appears

The embodiment principle must be
visible everywhere:
Every section should make clear
that the goal is not understanding
but integration — not to know more
about yourself but to live differently.

Consider a "New to this?" mode that
shows educational overlays for
first-time visitors to each section.
Could be toggled off once the
user feels oriented.

Add to each section's empty state
a brief orientation:
Not just "Nothing here yet" but
"Here is what this practice is for
and how to begin."

Priority: Important before opening
to other users who don't have
the context you have.

---

## On Build Order Going Forward

Right now, finish and commit the cleanup. Then run the big redesign prompt we wrote — onboarding, dream structure, language pass, navigation restructure. Get that stable and committed.

Then build the three-phase tagging system — it's a relatively contained change to the existing analysis flow and it's philosophically important enough to do before you open this to other users.

Then the guide access and annotation system — this is the most technically complex remaining feature and deserves its own careful planning session.

Then the Psyche Map — save it for when you have six months of your own use to draw on, because the map will be richer and the concept will be clearer once you've lived with the app longer.

The map is worth waiting for. Some things need to be earned.

---

## Notes on Priority

Items marked with * are schema-level changes that 
are easier to add before the archive grows large:

- Backdated dream ordering * — change analysis 
  to use dream_date not created_at (low effort, 
  high correctness value)
- Custom moods * — add user_moods text[] to 
  profiles table
- Personal symbol associations * — new table: 
  symbol_associations(user_id, symbol, association)