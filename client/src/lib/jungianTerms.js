// Jungian Reference Library — shared between Reference.jsx and DreamDetail.jsx
// Each entry: { id, term, pronunciation?, oneLiner, body, inYourDreams, relatedTerms }

export const JUNGIAN_TERMS = [
  {
    id: 'individuation',
    term: 'Individuation',
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
    oneLiner: "The whole psyche — not just the ego, but everything you are, including what you don't yet know about yourself.",
    body: `The Self is not the ego. The ego is the part of you that thinks, decides, and identifies itself as "I." The Self is the larger organizing intelligence of the entire psyche — conscious and unconscious together — and it is far more than the ego knows about.

The ego thinks it is in charge. The Self actually is. Individuation is the long process of the ego learning to serve the Self rather than override it — learning to listen to what is trying to emerge from below rather than simply executing the programs installed in childhood.

Encounters with the Self have a numinous quality: overwhelming, significant, unlike ordinary experience. They cannot be manufactured or engineered. They arrive. And when they do, the dreamer knows — not intellectually but in the body — that something much larger than the personal self has made contact.`,
    inYourDreams: 'Mandalas and circular forms, radiant or blinding light, wise figures of great authority and warmth, a sense that this dream is completely unlike others, feelings of profound awe or peace that linger for days.',
    relatedTerms: ['ego', 'individuation', 'numinous'],
  },
  {
    id: 'ego',
    term: 'The Ego',
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
    oneLiner: 'The inner feminine in a man, the inner masculine in a woman — the bridge to the deeper Self.',
    body: `This is not about gender identity. It is about psychological contrasexuality — the qualities the conscious personality has not fully developed, which live in the unconscious carrying their own energy and intelligence.

In men, the anima is associated with feeling, relatedness, receptivity, and connection to the unconscious. In women, the animus is associated with logos, direction, initiative, and the capacity for decisive thought and action. Neither belongs exclusively to one gender in lived experience — these are descriptions of psychological dynamics, not prescriptions.

Both the anima and animus function as psychopomps: guides into the deeper interior. They appear in dreams as figures of the opposite gender who carry particular charge — attraction, fascination, wisdom, or fear. When projected outward, they generate the experience of falling in love, of feeling mysteriously and overwhelmingly drawn to another person. The work is to gradually withdraw the projection and claim the quality for oneself.`,
    inYourDreams: 'Figures of the opposite gender who carry unusual emotional weight — attraction or terror, fascination or revulsion. Often the most emotionally alive figure in the dream. May appear as a guide, a beloved, a stranger who gives you something important.',
    relatedTerms: ['projection', 'self', 'great-mother', 'wise-guide'],
  },
  {
    id: 'great-mother',
    term: 'The Great Mother',
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
    oneLiner: 'The archetype of wisdom, meaning, and orientation — appearing when the ego is lost.',
    body: `The Wise Old Man and Wise Old Woman appear at thresholds, at moments when the conscious mind has genuinely run out of answers and cannot proceed by its own resources alone. They do not appear when the ego is merely uncomfortable — they appear when it is truly lost.

They offer orientation, not solutions. They point toward something the dreamer must discover and live for themselves. The wisdom they carry cannot be given; it can only be received when the ego is humble enough to listen.

The Wise Old Woman as Sophia — divine wisdom, the feminine face of meaning — appears in dreams of particular depth and numinosity, dreams that leave the dreamer changed. These figures do not explain themselves. A word, a gesture, an object given at the right moment — that is enough.`,
    inYourDreams: 'Elderly figures of warmth and authority, teachers, healers, figures who give something crucial — a key, a map, a single sentence that changes everything. A doctor, a priest, a grandmother, a stranger on the road who seems to know where you are going.',
    relatedTerms: ['self', 'anima-animus', 'numinous'],
  },
  {
    id: 'trickster',
    term: 'The Trickster',
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
    oneLiner: 'The symbol of new beginnings and the Self\'s movement toward the future.',
    body: `Not a regressed child — an anticipatory symbol. The divine child in dreams does not point backward toward the past or toward unmet childhood needs (though those may also be present). It points forward: toward something new that is trying to be born in the psyche.

The child archetype appears at genuine turning points in the individuation journey, often when something old is dying and something unknown is beginning to emerge. It is paradoxically both the most vulnerable and the most indestructible image in the unconscious — threatened, endangered, sometimes abandoned in dreams, but never finally destroyed.

When the child appears in a dream with a luminous or uncanny quality, it is worth slowing down and staying with the image. Something is beginning.`,
    inYourDreams: 'Infants, small children who need protection, magical or glowing children, children in danger who must be rescued, the child you yourself once were, a child you do not recognize who seems to know you.',
    relatedTerms: ['self', 'individuation', 'great-mother'],
  },
  {
    id: 'complex',
    term: 'Complex',
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
    oneLiner: 'A meaningful coincidence — two events connected by meaning rather than by cause.',
    body: `Jung's most controversial concept and perhaps his most important for understanding the relationship between the inner and outer worlds. Synchronicity is not superstition — it is the recognition that meaning itself is a category of connection, not just causality. Things can be related by what they signify without being related by what caused them.

When the inner and outer worlds mirror each other in ways that exceed probability and carry unmistakable significance — when the dream and the waking event resonate like two strings tuned to the same frequency — something is communicating across the apparent boundary between psyche and world. Jung believed the unconscious was not only inside the individual.

This is not a license for magical thinking or the abandonment of critical thought. It is an invitation to pay attention to the times when the outer world seems to be speaking in the same language as the inner world. Those moments deserve to be taken seriously.`,
    inYourDreams: 'The dream that seems to prefigure a waking event. The symbol that appears in a dream and then, within days, appears in the outer world in an unexpected form. The meaningful coincidence that cannot be explained but cannot quite be dismissed.',
    relatedTerms: ['individuation', 'self', 'numinous'],
  },
];
