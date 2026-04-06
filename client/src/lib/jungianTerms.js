// Jungian Reference Library — shared between Reference.jsx and DreamDetail.jsx
// Each entry: { id, term, pronunciation?, oneLiner, body, inYourDreams, relatedTerms, category }
// Categories: 'core' | 'archetypes' | 'alchemical' | 'dream-structure' | 'analytical'

export const JUNGIAN_TERMS = [
  {
    id: 'individuation',
    term: 'Individuation',
    category: 'core',
    oneLiner: 'The lifelong process of becoming who you actually are.',
    body: `Not self-improvement but self-discovery. Individuation is not about becoming a better version of who you think you are — it is about encountering, and slowly integrating, the parts of yourself you have not yet lived. This requires meeting what you have rejected: the emotions you suppressed, the possibilities you set aside, the shadow you have spent years keeping in the dark.

Jung saw individuation as the central task of the second half of life, when the projects of the first half — establishing identity, building a place in the world — have been accomplished, and the soul begins to ask different questions. But it can begin at any age, whenever the outer life stops being enough.

It never ends. Wholeness is the direction, not the destination. Every dream is another step on a path that has no final arrival.`,
    inYourDreams: 'Journeys, thresholds, unknown houses you somehow know are yours, maps and compasses, guides appearing at crossroads, long roads with no clear end.',
    relatedTerms: ['shadow', 'self', 'persona', 'complex'],
  },
  {
    id: 'shadow',
    term: 'The Shadow',
    category: 'core',
    oneLiner: "Everything you've disowned about yourself — and projected onto others.",
    body: `The shadow is not simply the dark side of a person. It is everything the ego has decided it cannot be — and that includes not just darkness but unlived potential. The creativity you decided wasn't practical. The anger you learned wasn't acceptable. The desire that felt dangerous. The playfulness that got educated out of you.

Projection is the shadow's primary mechanism: what enrages or disgusts you most in other people often belongs to you. The intensity of your reaction is a clue. The shadow doesn't announce itself — it arrives as your strong opinion about someone else's failing.

Integration does not mean acting out the shadow. It means owning it, claiming its energy without being unconsciously driven by it. You cannot integrate what you refuse to acknowledge. The first step is always the same: notice what you judge most harshly in others, and ask, honestly, where you know that quality in yourself.`,
    inYourDreams: 'Threatening figures of the same gender as the dreamer, pursuits and chases, dark basements and cellars, figures you try to escape or hide from, criminals, enemies, monsters that feel strangely familiar.',
    relatedTerms: ['projection', 'individuation', 'persona'],
  },
  {
    id: 'self',
    term: 'The Self',
    category: 'core',
    oneLiner: "The organizing center of the whole psyche — not something you arrive at, but something you were never separate from.",
    body: `The Self is not the ego. The ego is the part of you that thinks, decides, and says "I." The Self is the whole — the deeper organizing intelligence of the psyche, conscious and unconscious together, that holds far more than the ego knows about.

It is not something you build or achieve. It was there before you knew its name. Individuation is not the journey toward the Self — it is the slow, often difficult recognition that you were never separate from it. What you are moving toward is also what you are returning to. Many traditions have named this differently: the soul, the atman, the ground of being. Jung called it the Self. Your dreams are one of the ways it speaks.

Encounters with the Self have a numinous quality — overwhelming, significant, unlike ordinary experience. They cannot be manufactured or engineered. They arrive. And when they do, the dreamer knows, not intellectually but in the body, that what has made contact is much larger than the personal self. Not foreign, though. Recognized.`,
    inYourDreams: 'A figure of great authority or deep peace — a wise elder, a luminous child, a sacred animal, a still center in the midst of chaos. A voice that knows more than you do, or a presence that holds what you cannot yet hold yourself. Mandalas and circular forms. When something in a dream feels numinous — charged with meaning beyond what you can name — that quality often belongs to the Self.',
    relatedTerms: ['ego', 'individuation', 'numinous', 'shadow'],
  },
  {
    id: 'ego',
    term: 'The Ego',
    category: 'core',
    oneLiner: "The part of you that thinks it's in charge.",
    body: `The ego is not the enemy — it is necessary. Without a stable ego you cannot function in the world, hold relationships, or engage the unconscious safely. Ego strength is the prerequisite for depth work, not its obstacle.

But the ego makes a mistake that costs most people most of their psychological suffering: it mistakes itself for the whole person. It identifies with a narrow band of experience — the thoughts it can think, the feelings it allows itself, the story it has agreed to tell — and it calls that band "me."

Individuation is not ego dissolution. It is ego humbling. The ego does not disappear; it becomes more permeable, more willing to receive what rises from below, less insistent that it already knows what it is. The shift is from ego as commander to ego as witness — still present, still functional, but no longer alone.`,
    inYourDreams: "The 'I' in the dream — your perspective, your reactions, the way you move through the dream landscape. Watch the dreamer-figure: what does it do when challenged? What is it afraid of? That is often more revealing than anything else in the dream.",
    relatedTerms: ['self', 'persona', 'individuation'],
  },
  {
    id: 'persona',
    term: 'The Persona',
    category: 'core',
    oneLiner: 'The mask you wear for the world — necessary, but not who you are.',
    body: `Every social role comes with a persona — the professional self, the parental self, the self you bring to a first date or a job interview. The persona is adaptive and useful. Without it, social life would be impossible: we would be in a constant state of raw exposure, unable to modulate how much of ourselves we bring to any given situation.

The problem is not having a persona. The problem is identifying with it so completely that you forget there is something behind it. When the mask becomes the face, when you cannot remember who you are outside the role, the soul begins to protest — often through dreams.

The persona is what you show. The soul is what you are. Individuation asks, again and again: what is behind the mask? Not to tear it off — that would simply be naive — but to remember that you put it on, and that you can take it off.`,
    inYourDreams: 'Clothes and costumes, uniforms, public performances, stage fright, appearing in public without the right clothing or without clothing at all, being seen by people who do not recognize you.',
    relatedTerms: ['shadow', 'ego', 'individuation'],
  },
  {
    id: 'anima-animus',
    term: 'The Anima / Animus',
    category: 'archetypes',
    subcategory: 'jung-core',
    oneLiner: 'The inner feminine in a man, the inner masculine in a woman — the bridge to the deeper Self.',
    body: `This is not about gender identity. It is about psychological contrasexuality — the qualities the conscious personality has not fully developed, which live in the unconscious carrying their own energy and intelligence.

In men, the anima is associated with feeling, relatedness, receptivity, and connection to the unconscious. In women, the animus is associated with logos, direction, initiative, and the capacity for decisive thought and action. Neither belongs exclusively to one gender in lived experience — these are descriptions of psychological dynamics, not prescriptions.

Both the anima and animus function as psychopomps: guides into the deeper interior. They appear in dreams as figures of the opposite gender who carry particular charge — attraction, fascination, wisdom, or fear. When projected outward, they generate the experience of falling in love, of feeling mysteriously and overwhelmingly drawn to another person. The work is to gradually withdraw the projection and claim the quality for oneself.

At her most developed, the anima moves beyond the personal into something transpersonal — a figure of divine wisdom rather than personal soul. This is what the Gnostic and Christian traditions called Sophia: the feminine face of the deepest knowing, no longer a bridge to the unconscious but the ground of it.`,
    inYourDreams: 'Figures of the opposite gender who carry unusual emotional weight — attraction or terror, fascination or revulsion. Often the most emotionally alive figure in the dream. May appear as a guide, a beloved, a stranger who gives you something important.',
    relatedTerms: ['projection', 'self', 'great-mother', 'wise-guide'],
  },
  {
    id: 'great-mother',
    term: 'The Great Mother',
    category: 'archetypes',
    subcategory: 'jung-core',
    oneLiner: 'The archetypal feminine — nourishing and devouring, creative and destructive.',
    body: `The Great Mother is not your personal mother, though the personal mother is inevitably colored by the archetype. She is the primordial feminine principle: the source of all life, the container, the one who gives and who takes away.

Her positive face is nourishment, unconditional belonging, the earth that sustains, the holding that allows growth. Her negative face is engulfment, the refusal to let go, the possessive love that prevents individuation, the mother who cannot allow her child to become a separate person.

Both faces are always present in the archetype — the same energy that feeds can consume. This is not a flaw in the archetype but its essential nature: the womb that brings life and the earth that receives the dead are the same ground.

The mother complex — the particular constellation of the personal mother in an individual's psyche — is distinct from the Great Mother archetype, though they inform and amplify each other.`,
    inYourDreams: 'Mother figures (personal and impersonal), earth and water, the ocean, caves, forests, containers of all kinds, houses as the body, anything that holds or threatens to devour, protective and suffocating enclosures.',
    relatedTerms: ['complex', 'anima-animus', 'wise-guide'],
  },
  {
    id: 'wise-guide',
    term: 'The Wise Guide',
    category: 'archetypes',
    subcategory: 'jung-core',
    oneLiner: 'The archetype of wisdom, meaning, and orientation — appearing when the ego is lost.',
    body: `The Wise Old Man and Wise Old Woman appear at thresholds, at moments when the conscious mind has genuinely run out of answers and cannot proceed by its own resources alone. They do not appear when the ego is merely uncomfortable — they appear when it is truly lost.

They offer orientation, not solutions. They point toward something the dreamer must discover and live for themselves. The wisdom they carry cannot be given; it can only be received when the ego is humble enough to listen.

These figures do not explain themselves. A word, a gesture, an object given at the right moment — that is enough. At the deepest level, the Wise Old Woman shades into what the tradition calls Sophia — not a personal figure but an archetypal presence of divine wisdom, the feminine face of the Self itself. These are the dreams that leave the dreamer permanently changed.`,
    inYourDreams: 'Elderly figures of warmth and authority, teachers, healers, figures who give something crucial — a key, a map, a single sentence that changes everything. A doctor, a priest, a grandmother, a stranger on the road who seems to know where you are going.',
    relatedTerms: ['self', 'anima-animus', 'numinous'],
  },
  {
    id: 'trickster',
    term: 'The Trickster',
    category: 'archetypes',
    subcategory: 'jung-core',
    oneLiner: 'The archetype of disruption, humor, and transformation through chaos.',
    body: `Not evil, but boundary-crossing. The Trickster appears when the psyche has become too rigid, too certain, too fixed in its positions — when the ego has decided it knows exactly what it is and what it wants and how things should go.

The Trickster breaks what is calcified. It does this through disruption, confusion, unexpected reversal, and dark humor. It is maddening in the moment and often liberating in retrospect. The chaos it introduces is not random — it is the psyche self-correcting, pushing things toward their opposite when one side has dominated too long.

The Trickster is the agent of enantiodromia. It mocks seriousness without being frivolous. It is simultaneously the obstacle and the door.`,
    inYourDreams: 'Figures who deceive or confuse, shapeshifters, things that are not what they seem, unexpected reversals in the dream logic, dark comedy, the situation that keeps changing just when you think you understand it.',
    relatedTerms: ['enantiodromia', 'shadow', 'complex'],
  },
  {
    id: 'child',
    term: 'The Child Archetype',
    category: 'archetypes',
    subcategory: 'jung-core',
    oneLiner: 'The symbol of new beginnings and the Self\'s movement toward the future.',
    body: `Not a regressed child — an anticipatory symbol. The divine child in dreams does not point backward toward the past or toward unmet childhood needs (though those may also be present). It points forward: toward something new that is trying to be born in the psyche.

The child archetype appears at genuine turning points in the individuation journey, often when something old is dying and something unknown is beginning to emerge. It is paradoxically both the most vulnerable and the most indestructible image in the unconscious — threatened, endangered, sometimes abandoned in dreams, but never finally destroyed.

When the child appears in a dream with a luminous or uncanny quality, it is worth slowing down and staying with the image. Something is beginning.`,
    inYourDreams: 'Infants, small children who need protection, magical or glowing children, children in danger who must be rescued, the child you yourself once were, a child you do not recognize who seems to know you.',
    relatedTerms: ['self', 'individuation', 'great-mother'],
  },
  {
    id: 'hero',
    term: 'The Hero',
    category: 'archetypes',
    subcategory: 'post-jungian',
    oneLiner: 'The archetype of conscious striving — the ego in its confrontation with darkness.',
    body: `The Hero is not a person but a pattern: the movement of consciousness into the unknown, the willingness to face what is feared, the encounter with the dragon guarding the treasure. Every culture in every era has told this story because it describes something universal about the structure of psychological development.

The Hero's journey is the ego's journey: the departure from the familiar, the ordeal in the underworld or wilderness, the return transformed. The treasure won is never gold — it is always a quality of consciousness, a capacity previously unavailable, a piece of the self that had to be earned.

The danger of the Hero archetype is inflation: the ego identifying with the Hero, believing itself to be the agent of its own transformation rather than a participant in something larger. The genuine Hero knows that the gift was given, not simply seized.`,
    inYourDreams: 'Quests and journeys, battles with monsters or dark forces, trials that must be passed, the lone figure moving through dangerous territory, victories that feel larger than personal achievement.',
    relatedTerms: ['shadow', 'self', 'individuation', 'trickster'],
  },
  {
    id: 'senex',
    term: 'The Senex',
    category: 'archetypes',
    subcategory: 'post-jungian',
    oneLiner: 'The archetype of structure, order, and authority — and its shadow: rigidity and withholding.',
    body: `The Senex (Latin: old man) is the archetypal principle of order, structure, tradition, and law. In its positive aspect it provides containment, accumulated wisdom, and continuity across time. In its negative aspect it becomes the tyrant, the obstacle, the authority that cannot release its grip.

The Senex and the Puer Aeternus (eternal youth) are natural psychological opposites that require each other. Pure Puer energy — uncontained creativity and inspiration — burns itself out without structure. Pure Senex energy — unrelenting control and convention — stifles the life force. The health of the psyche depends on their ongoing tension and dialogue.

In dreams, Senex figures test, block, or judge — and those encounters deserve careful attention. Is this the psyche asking you to develop more structure, or is it showing you where you have internalized an authority you need to challenge?`,
    inYourDreams: 'Judgmental authority figures, fathers and grandfathers who demand compliance, gatekeepers who refuse entry, ancient or stone-faced figures, institutional obstacles, courts and tribunals.',
    relatedTerms: ['wise-guide', 'trickster', 'puer-puella', 'complex'],
  },
  {
    id: 'puer-puella',
    term: 'The Puer / Puella Aeternus',
    pronunciation: 'PYOO-er ay-TER-nus / PWEL-ah',
    category: 'archetypes',
    subcategory: 'post-jungian',
    oneLiner: 'The eternal youth — creative, inspired, and perpetually ungrounded.',
    body: `The Puer Aeternus (eternal boy) and Puella Aeternus (eternal girl) are the archetypes of creative potential, spontaneity, and the refusal to be limited by the ordinary. They carry enormous energy and genuine gifts — imagination, vision, the capacity to see what others have stopped seeing.

Their shadow is the failure of incarnation: the inability to land, to commit, to allow any particular life to be the actual life. The Puer is always about to begin, always in the realm of possibility rather than actuality, always one horizon beyond the present moment. The gift is real; what is absent is weight.

Marie-Louise von Franz wrote the definitive study of this pattern. Its presence in the psyche is not a flaw but a challenge: to find a way to honor the creative spirit without using it as a perpetual escape from ordinary embodied existence. The alchemists called this the problem of the volatile — the spirit that must be fixed without being extinguished.`,
    inYourDreams: 'Young, luminous, or winged figures, flight and flying dreams, figures who are perpetually youthful or ageless, the sense that the dreamer has not yet arrived, things that are always about to begin.',
    relatedTerms: ['senex', 'individuation', 'hero', 'anima-animus'],
  },
  {
    id: 'complex',
    term: 'Complex',
    category: 'core',
    oneLiner: 'An autonomous psychological pattern running beneath awareness — a cluster of emotion, memory, and behavior with a life of its own.',
    body: `Complexes are not pathological — everyone has them, and they are how the psyche is organized. They form around a core emotional experience, usually early, and accumulate layers of memory, association, and reactivity over time. The mother complex, the father complex, the inferiority complex: each is a gravitational center with its own logic.

They become problems when they activate without our awareness and run our behavior without our consent. The giveaway is disproportionate reaction: when your response is significantly larger than the situation warrants, or when you cannot explain afterward why you reacted so strongly, a complex has been constellated. Something touched the core.

Naming a complex begins — only begins — to reduce its power. The complex does not dissolve when you identify it. But it can no longer operate in complete darkness. That is the first step toward choice.`,
    inYourDreams: 'Recurring figures and situations carrying particular emotional charge. The dream returns to the complex again and again from different angles — as if the unconscious is circling something it needs to metabolize. Watch for the dream images that feel charged beyond their apparent content.',
    relatedTerms: ['shadow', 'projection', 'individuation'],
  },
  {
    id: 'projection',
    term: 'Projection',
    category: 'core',
    oneLiner: 'Seeing in others what belongs to you — shadow, soul, or complex.',
    body: `Projection is unconscious and automatic — it happens before we have any choice about it. The psyche places something it cannot integrate within itself onto a person, group, or situation in the outer world, where it can be seen from a distance.

The intensity of your reaction to another person is often proportional to the degree of projection involved. This is true in both directions: the person who infuriates you most probably carries your shadow. The person who fascinates you most probably carries your soul.

Withdrawing a projection means owning what you have placed outside yourself. This is not comfortable — it requires admitting that what you saw in another person belongs, in some form, to you. But it is the most reliable path to knowing yourself more fully. Every strong reaction to another person is an invitation to look inward.`,
    inYourDreams: 'Figures who carry extreme qualities — idealized or despised, fascinating or terrifying, larger than life in either direction. Strangers who feel strangely significant. People from your life appearing in roles entirely unlike their waking selves.',
    relatedTerms: ['shadow', 'anima-animus', 'complex'],
  },
  {
    id: 'transcendent-function',
    term: 'The Transcendent Function',
    category: 'core',
    oneLiner: "The psyche's capacity to hold two opposites in tension until something genuinely new emerges from between them.",
    body: `Neither pole wins. The transcendent function does not produce a compromise between opposites — a watered-down middle position that satisfies neither side. It produces a genuine third thing, something that was not available from either position alone and could not have been reasoned toward from either side.

This is the actual mechanism of psychological development. Not growth by accumulation, but growth by transformation — by the tension of opposites generating something that transcends both.

You cannot think your way to it. The transcendent function requires sitting with the tension long enough, without prematurely resolving it toward either pole, for something to arise from below. It is why Jung valued dreams so highly: the unconscious naturally holds what consciousness cannot simultaneously contain. The dream speaks from the space between the opposites.`,
    inYourDreams: 'Marriages and unions, two rivers meeting, bridges between opposite shores, thresholds where apparent contradictions are somehow resolved, the moment in a dream when something impossible becomes suddenly and obviously true.',
    relatedTerms: ['individuation', 'enantiodromia', 'active-imagination'],
  },
  {
    id: 'enantiodromia',
    term: 'Enantiodromia',
    pronunciation: 'en-an-tee-oh-DROH-mee-ah',
    category: 'core',
    oneLiner: 'When a thing pushed too far swings into its opposite.',
    body: `Heraclitus named it; Jung borrowed it. The psyche self-regulates. Push control too hard and chaos erupts. Suppress feeling too long and it overwhelms. Maintain a persona too rigidly and the shadow breaks through. This is not failure — it is the psyche correcting an imbalance, the way a river finds its level.

Enantiodromia is not random. It follows from excess. The more one-sided a psychological position becomes, the more force accumulates in the opposite. At some point the tension breaks and the psyche swings — sometimes dramatically, sometimes catastrophically, sometimes with sudden and surprising relief.

The question is whether the swing happens consciously, with some awareness of what is happening and some capacity to work with it, or whether it simply happens to you without any foothold. Dreams often announce enantiodromia before it arrives — the psyche tries to prepare the ego for what is coming.`,
    inYourDreams: 'Dramatic reversals of tone or situation, the helper who suddenly becomes threatening, the familiar that becomes completely alien, dreams where the emotional register flips without warning — from safety to danger, from belonging to exile, from clarity to confusion.',
    relatedTerms: ['transcendent-function', 'trickster', 'shadow'],
  },
  {
    id: 'active-imagination',
    term: 'Active Imagination',
    category: 'analytical',
    oneLiner: 'A method of consciously engaging with unconscious figures — continuing the dream while awake.',
    body: `Developed by Jung from his own confrontation with the unconscious during what he later called his "years of inner uncertainty." Active imagination is not fantasy, not daydream, and not visualization. It requires something harder: genuine engagement between the conscious ego and the autonomous contents of the unconscious.

You enter an image — a dream figure, a remembered scene, an inner landscape — and you allow it to move and respond with its own intelligence, without directing it toward what you expect or want. The ego must be present and witnessing, not passive. You speak to the figure; the figure speaks back. What arises will surprise you if you do it genuinely. That surprise is the point.

Active imagination is where the transcendent function most often operates. It is not analysis — it is encounter. The work happens in the meeting, not afterward in interpretation.`,
    inYourDreams: 'This is not a dream symbol but a practice that begins where the dream ends. When a dream leaves you with a vivid image or an unresolved encounter, active imagination is the method of continuing that conversation — of sitting with what the dream opened and allowing it to develop.',
    relatedTerms: ['transcendent-function', 'anima-animus', 'self'],
  },
  {
    id: 'numinous',
    term: 'Numinous',
    pronunciation: 'NOO-min-us',
    category: 'analytical',
    oneLiner: 'The quality of overwhelming significance — the felt sense that something larger than the ego is present.',
    body: `Rudolf Otto's term, adopted by Jung. The numinous is not comfortable — it is awe-full in the original sense: full of awe, which is not a pleasant feeling but an overwhelming one. Neither purely pleasant nor purely terrifying, but both at once. The numinous does not ask your opinion about it. It simply arrives.

Dreams with numinous quality are what Jung called big dreams — they are not forgotten the next morning, they do not fade over weeks, they carry weight for years, sometimes for a lifetime. These are the Self making direct contact with the ego. They are rare. When they come, they deserve extended attention.

The numinous cannot be manufactured. You cannot engineer a numinous experience through technique or intention. You can only remain open to it — which means remaining open to being genuinely surprised, genuinely overwhelmed, genuinely changed.`,
    inYourDreams: 'An overwhelming sense that this dream is completely unlike others. Radiant or terrible light. Profound peace or terror that does not feel proportional to the dream content. The sense of being in the presence of something vast. A feeling that lingers in the body for days.',
    relatedTerms: ['self', 'individuation', 'wise-guide'],
  },
  {
    id: 'synchronicity',
    term: 'Synchronicity',
    category: 'core',
    oneLiner: 'A meaningful coincidence — two events connected by meaning rather than by cause.',
    body: `Jung's most controversial concept and perhaps his most important for understanding the relationship between the inner and outer worlds. Synchronicity is not superstition — it is the recognition that meaning itself is a category of connection, not just causality. Things can be related by what they signify without being related by what caused them.

When the inner and outer worlds mirror each other in ways that exceed probability and carry unmistakable significance — when the dream and the waking event resonate like two strings tuned to the same frequency — something is communicating across the apparent boundary between psyche and world. Jung believed the unconscious was not only inside the individual.

This is not a license for magical thinking or the abandonment of critical thought. It is an invitation to pay attention to the times when the outer world seems to be speaking in the same language as the inner world. Those moments deserve to be taken seriously.`,
    inYourDreams: 'The dream that seems to prefigure a waking event. The symbol that appears in a dream and then, within days, appears in the outer world in an unexpected form. The meaningful coincidence that cannot be explained but cannot quite be dismissed.',
    relatedTerms: ['individuation', 'self', 'numinous'],
  },

  // ── New terms ─────────────────────────────────────────────────────────────

  {
    id: 'temenos',
    term: 'Temenos',
    pronunciation: 'TEM-en-os',
    category: 'analytical',
    oneLiner: 'The sacred enclosure — the protected space in which inner work can take place.',
    body: `From the Greek: a piece of ground set apart and consecrated. In Jungian practice, the temenos is the container — the bounded space of the therapeutic relationship, the ritual of the analytic hour, the dedicated practice of dream work — within which the unconscious can safely emerge and be held.

Without a temenos, the eruption of unconscious contents can be destabilizing rather than transformative. The vessel must be strong enough to contain what rises. This is why Jung emphasized the relationship between analyst and analysand, not just the interpretation of symbols: the relationship itself is the container.

In a broader sense, the temenos is any reliable structure that creates the conditions for depth — a consistent journaling practice, a meditation cushion, a trusted confidant who can hold the fire without flinching. The work needs a place to happen.`,
    inYourDreams: 'Sacred or protected enclosures — walled gardens, sanctuaries, temples, dedicated rooms that feel set apart from ordinary life. The sense of being held within a bounded space that is safe precisely because it is bounded.',
    relatedTerms: ['active-imagination', 'self', 'individuation'],
  },
  {
    id: 'amplification',
    term: 'Amplification',
    category: 'analytical',
    oneLiner: 'Expanding a dream image by gathering its parallels from myth, folklore, and cultural history.',
    body: `Where free association moves away from the dream image — one thought leading to another, drifting from the original symbol — amplification moves deeper into it. The analyst asks: where else does this image appear? What has been said about it, across cultures and centuries? What does the snake mean in alchemy, in Gnostic symbolism, in the mythology of the dreamer's own tradition?

The purpose is not to replace the personal meaning of the image with a collective one, but to illuminate it — to show the dreamer that what appeared in their private dream has roots in the deep structure of human experience. This can be both humbling and clarifying.

Amplification is most valuable with images that resist personal association, that feel foreign or uncanny, that clearly come from somewhere beyond the personal life of the dreamer. These are the images most likely to carry archetypal weight.`,
    inYourDreams: 'This is a method, not a symbol — but it comes alive when the dream image feels mythic, when the figure or situation has the quality of a story older than the dreamer. Those are the dreams that most reward comparative exploration.',
    relatedTerms: ['active-imagination', 'numinous', 'self'],
  },
  {
    id: 'katabasis',
    term: 'Katabasis',
    pronunciation: 'kah-TAB-ah-sis',
    category: 'analytical',
    oneLiner: 'The descent into the underworld — the necessary going-down before renewal.',
    body: `From the Greek: a going-down. In mythology it is the journey into Hades: Orpheus descending for Eurydice, Persephone taken into the earth, Inanna stripped of her garments at the seven gates. In psychology it names the movement into depression, grief, disorientation, or the dark night of the soul — not as pathology to be overcome but as a necessary phase of transformation.

You cannot have the resurrection without the descent. The psyche periodically requires a katabasis — a withdrawal from the world of activity and achievement, a submersion in what has been avoided or unfelt. What rises again is not the same as what went down. That is the point.

Recognizing that a difficult period is a katabasis rather than a failure changes the relationship to it. It does not make the descent less dark. But it can provide the orientation that makes it possible to endure without prematurely climbing out.`,
    inYourDreams: 'Descending into basements, mines, caves, or underground places. The dream world that is dark, damp, primal. Going down stairs, ladders, tunnels. Encounters with the dead or with underworld figures. The mood of weight, slowness, submersion.',
    relatedTerms: ['individuation', 'shadow', 'numinous', 'enantiodromia'],
  },
  {
    id: 'nigredo',
    term: 'Nigredo',
    pronunciation: 'nih-GREH-doh',
    category: 'alchemical',
    oneLiner: 'The blackening — the first stage of transformation, where what is fixed must dissolve.',
    body: `In alchemy, the nigredo is the initial stage of the Great Work: the base material must first be reduced to a black, putrefied mass before it can be purified and transformed. Nothing can become gold that has not first been willing to become nothing.

Psychologically, the nigredo is the experience of dissolution — depression, loss, the collapse of a former identity or way of being. It is when the persona can no longer hold, when the foundations of the ordinary life crack and what seemed solid reveals itself as contingent. This is terrifying from inside it. It is also, potentially, the beginning of genuine transformation.

Jung saw the stages of alchemy as a precise map of the individuation process. The alchemists were not making gold — they were watching what happened when they applied intense, sustained attention to the matter in their vessels. What they described as happening to lead is what happens to the psyche: it must first be undone before it can be remade.`,
    inYourDreams: "Darkness, rot, dissolution, floods or mud, things falling apart or decomposing, the dreamer's body or house in a state of disintegration, black animals or black water, the sense that something foundational has been lost.",
    relatedTerms: ['albedo', 'rubedo', 'katabasis', 'shadow'],
  },
  {
    id: 'albedo',
    term: 'Albedo',
    pronunciation: 'al-BEE-doh',
    category: 'alchemical',
    oneLiner: 'The whitening — the stage of purification and dawning consciousness after the blackening.',
    body: `Following the nigredo, the albedo is the emergence of the first light — the whitening, the purification, the dawning of a new awareness after the dissolution. What had been black and undifferentiated begins to acquire form and clarity.

In psychological terms, the albedo is the phase when the dreamer begins to see more clearly what the darkness contained — when the material that was forced into unconsciousness begins to be known and integrated. It is the moment of relative relief and clarity that follows a genuine katabasis, though it is not yet the fullness of transformation.

The albedo is associated with the moon, with reflection, with the emergence of the reflective function — the capacity to witness one's own experience from a slight distance. It is the phase of dawning self-understanding, which is different from and more honest than the persona's former certainties.`,
    inYourDreams: 'White light after darkness, moonlight, reflective surfaces — mirrors, water, silver. The color white appearing in a context of recent darkness. Clarity following confusion. A new figure appearing who seems to carry fresh possibility.',
    relatedTerms: ['nigredo', 'rubedo', 'individuation', 'self'],
  },
  {
    id: 'rubedo',
    term: 'Rubedo',
    pronunciation: 'roo-BEH-doh',
    category: 'alchemical',
    oneLiner: 'The reddening — the final stage of integration, when transformation becomes embodied.',
    body: `The rubedo is the final stage of the alchemical process: the reddening, the return of life and warmth, the integration of what has been transformed into the living fabric of the person. If the nigredo is dissolution and the albedo is clarification, the rubedo is embodiment — the psychological gold made real in action, relationship, and lived experience.

This is the stage most easily mistaken for arrival. Individuation does not end at the rubedo; the cycle can and does begin again. But the rubedo represents a genuine integration: what was formerly split or unconscious has been consciously held and is now available to be lived.

In practice, the rubedo shows up not as dramatic revelation but as a quiet change in how one moves through the world — more presence, less reactivity, a greater capacity to be with what is without needing it to be otherwise.`,
    inYourDreams: 'Red and gold appearing in dreams, fire that warms rather than destroys, the return of vitality after a long diminishment, a sense of rightness and integration. The dream landscape becoming more vivid and inhabited.',
    relatedTerms: ['nigredo', 'albedo', 'individuation', 'self'],
  },
  {
    id: 'coniunctio',
    term: 'Coniunctio',
    pronunciation: 'kon-ee-OON-tsee-oh',
    category: 'alchemical',
    oneLiner: 'The sacred marriage — the union of opposites that produces something genuinely new.',
    body: `The culminating image of alchemy: the union of the sun and moon, of masculine and feminine, of spirit and matter. In the hieros gamos (sacred marriage) of alchemical symbolism, two previously opposed principles unite — not in a comfortable compromise but in a transformative conjunction that generates a third, entirely new thing.

Psychologically, the coniunctio is the deepest form of the transcendent function: not just the resolution of a specific tension, but the ongoing relationship between consciousness and the unconscious, between the known self and the unknown, that is individuation itself.

Jung's entire late work — particularly Mysterium Coniunctionis — explored this image. It appears in dreams at moments of significant integration and often has a numinous or erotic charge that is simultaneously personal and transpersonal. The image of the wedding, in its deepest form, is never only personal.`,
    inYourDreams: 'Weddings and unions, the meeting of sun and moon, gold and silver together, figures who are two and one simultaneously, the sacred marriage of figures who had previously been in conflict, a sense of profound rightness at a joining.',
    relatedTerms: ['transcendent-function', 'anima-animus', 'rubedo', 'self'],
  },
  {
    id: 'exposition',
    term: 'Exposition',
    category: 'dream-structure',
    oneLiner: 'The opening of the dream — setting, cast, and the world that has been established.',
    body: `Every dream begins somewhere. The exposition is the opening situation: the place you find yourself, the figures who are present, the emotional weather, the assumed history. It is rarely stated explicitly — you simply know that you are in a school you attended years ago, or that the woman beside you is your mother though she does not look like her, or that something has already happened before the dream began.

These opening conditions are not neutral. Where the dream begins is itself a statement from the unconscious: this is the territory we are entering. The familiar school, the childhood home, the unknown city each carries its own field of association and meaning.

The exposition is also where the dreamer's ego is introduced — what you are doing, who you are with, what you know and do not know. The initial relationship between the dreamer-figure and the dream world often sets the pattern that the whole dream will then complicate.`,
    inYourDreams: 'The opening moment: where are you? Who is with you? What is the emotional weather? What do you know, and what has already happened before the dream begins? These details are the first language the dream speaks.',
    relatedTerms: ['development', 'peripeteia', 'lysis'],
  },
  {
    id: 'development',
    term: 'Development',
    category: 'dream-structure',
    oneLiner: 'The complication — where the tension of the dream begins to build.',
    body: `Following the exposition, the dream introduces movement: something changes, appears, or threatens. The development is the rising action — the arrival of the unexpected figure, the discovery that the house has more rooms, the problem that must be solved, the pursuit that begins.

In a well-formed dream — which not all dreams are — the development builds toward a peak moment of intensity. The energy of the unconscious is gathering. What will be shown has not yet been shown, but the conditions for its appearance are being established.

Clinically, the development is where the analyst looks for what the dreamer has been avoiding: what intrudes, what arrives uninvited, what the dreamer-figure tries to manage or escape. The unconscious has a specific interest in what complicates things.`,
    inYourDreams: 'The arrival of a new figure, the discovery of an unexpected element, the emergence of conflict or difficulty, the sense that the situation is becoming more complex and charged — that what began simply is no longer simple.',
    relatedTerms: ['exposition', 'peripeteia', 'lysis'],
  },
  {
    id: 'peripeteia',
    term: 'Peripeteia',
    pronunciation: 'peh-rih-peh-TAY-ah',
    category: 'dream-structure',
    oneLiner: 'The pivot point — the single image or moment that changes everything.',
    body: `From Aristotle's Poetics: the reversal, the turn, the moment when the direction of the action changes. In dreams, the peripeteia is the single most charged image or encounter — the thing that cannot be undone, the moment the dream has been building toward, the image that the dreamer remembers most vividly upon waking.

It is the snake in the garden, the face of the figure at the threshold, the room you enter that you were not supposed to enter, the word spoken that cannot be unheard. It is diagnostically the most important element of the dream because it carries the most concentrated unconscious charge.

Jung instructed analysts to pay particular attention to the images that carry the most affect — the ones that produce the strongest emotional resonance in the waking retelling. Those are the images doing the real work. The peripeteia is almost always among them.`,
    inYourDreams: 'The moment you remember most clearly. The image that brought the strongest feeling — fear, awe, grief, longing, shock. The encounter that changed the direction of the dream. Quote it precisely, in the dreamer\'s own words.',
    relatedTerms: ['exposition', 'development', 'lysis', 'numinous'],
  },
  {
    id: 'lysis',
    term: 'Lysis',
    pronunciation: 'LY-sis',
    category: 'dream-structure',
    oneLiner: 'The resolution — how the dream ends, and what it leaves the dreamer with.',
    body: `The lysis is the ending of the dream: how the tension is resolved or left unresolved, what state the dreamer-figure is in at the moment of waking. It is, in Jung's view, the most diagnostically significant part of the dream — the answer the unconscious offers to the question the peripeteia has raised.

A dream that ends in flight shows one thing; a dream that ends in confrontation shows another. A dream that ends in darkness and unresolved fear shows the current situation of the psyche; a dream that ends with the figure receiving something from the unknown shows a different kind of movement. The lysis is the unconscious's prognosis.

This does not mean a dark lysis is a bad sign. The unconscious does not lie: a difficult ending may simply be showing the truth of where the dreamer is. What matters is not whether the ending is pleasant but whether the dreamer can receive what it is actually showing.`,
    inYourDreams: 'Where did the dream leave you? What were you doing, feeling, knowing at the moment of waking? Was the tension resolved or held open? Did something change — and if so, what changed? The last image and the last feeling are worth staying with.',
    relatedTerms: ['peripeteia', 'development', 'exposition'],
  },
];
