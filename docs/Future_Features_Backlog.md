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

## Technical & UX

- **Duplicate tag cleanup tool** — Already partially 
  in Settings ("scan for bad tags") but extend to 
  catch true semantic duplicates across the archive 
  (e.g. "locked door" and "locked doors" as separate 
  tags). Suggest merges, user confirms.

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