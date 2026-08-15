// Interpretation copy registers for AstroMatch synastry readings.
//
// Voice contract: a knowing friend who is also rigorous. Every line must be
// falsifiable for a different sign or element; if a sentence could describe
// any Moon, it does not ship. Behavioral, specific, receipts-tone. No emoji,
// no markdown, no em-dashes in user-facing strings (house rule, see insights.ts).
//
// Standalone by design: no imports, safe to type-check in isolation.

export type SignKey = "Aries" | "Taurus" | "Gemini" | "Cancer" | "Leo" | "Virgo" | "Libra" | "Scorpio" | "Sagittarius" | "Capricorn" | "Aquarius" | "Pisces";
export type Element = "fire" | "earth" | "air" | "water";
export type AspectKey = "conjunction" | "sextile" | "trine" | "square" | "opposition" | "quincunx" | "none";

// ─────────────────────────── Moon: needs + tells ───────────────────────────

export const MOON_NEEDS: Record<SignKey, { needs: string; tell: string }> = {
  Aries: {
    needs: "Feelings handled fast and out loud: an honest argument tonight beats a polite cold week. This Moon needs to know you will fight it out, forgive, and move on without keeping a ledger.",
    tell: "Watch for sudden shortness over logistics, picking a fight about the dishes when the wound is somewhere else entirely. When this Moon goes quiet, something is very wrong, because quiet is not their native language.",
  },
  Taurus: {
    needs: "Physical consistency: the same couch, a standing Sunday ritual, food appearing without a speech, touch with no agenda attached. Safety here is built from repetition, so surprise plot twists read as threats even when they are gifts.",
    tell: "The giveaway is immovability: they stop initiating touch, dig in on tiny preferences, and answer change with slow-motion stubbornness. More comfort snacks, fewer words, zero budging.",
  },
  Gemini: {
    needs: "Room to talk feelings into shape while they are still forming, with a partner who lets the first draft be wrong. Banter is not avoidance for this Moon, it is how closeness actually gets built.",
    tell: "Either monosyllables from someone who is never monosyllabic, or bright chatter about everything except the actual thing. If they change the subject every time you get close to it, you have found it.",
  },
  Cancer: {
    needs: "To be someone's home: remembered details, checked-on feelings, food made without being asked. This Moon needs you to notice the mood shift before they announce it, because announcing it already feels like losing.",
    tell: "The sideways retreat: a flat little \"I'm fine\" delivered while doing the dishes loudly, snippiness about unrelated things, tears arriving at a commercial instead of at the conversation. The shell closes before the mouth opens.",
  },
  Leo: {
    needs: "To be visibly delighted in: told specifically what is wonderful about them, celebrated where other people can see it, their bids for attention caught warmly rather than tolerated. Private love that never shows itself in public reads as half a love.",
    tell: "They get bigger before they get sadder: louder stories, fishing for the compliment they used to get for free. Then comes the wounded, theatrical quiet, a sulk with excellent posture.",
  },
  Virgo: {
    needs: "To be useful and to have the usefulness noticed, plus plans that happen exactly as stated. When this Moon spirals, it needs a concrete fix or a concrete task, never a breezy \"don't worry about it\".",
    tell: "The criticism spikes when the fear does: suddenly your driving, the crumbs on the counter, and the way you loaded the dishwasher are all urgent. Midnight list-making and re-cleaning clean things mean the anxiety has nowhere to go.",
  },
  Libra: {
    needs: "Harmony that is real, not performed: being consulted before decisions, conflict handled gently but actually handled instead of skipped. This Moon can absorb hard truths fine, it is harshness of delivery that registers as danger.",
    tell: "The agreeableness goes brittle: \"whatever you want\" arrives a half-second too late, they suddenly cannot choose a restaurant, and the politeness gets so smooth you cannot find a handhold on it.",
  },
  Scorpio: {
    needs: "Proof over promises: consistency under pressure, secrets kept airtight, their private disclosures never repeated casually to your friends. Loyalty only counts for this Moon when it visibly cost you something.",
    tell: "They go surgically polite and start watching. You will be tested without being told it is a test, and the door will not slam, it will simply turn out to have been locked for a while.",
  },
  Sagittarius: {
    needs: "Room, literally and philosophically: the future kept open, plans that are invitations rather than cages, and hard truths received without flinching. If honesty gets punished once, this Moon starts editing, and editing is the beginning of leaving.",
    tell: "Suddenly very busy, booking the trip, going abstract and philosophical the moment things get personal. Jokes deployed as exits, and the door left visibly ajar so everyone can see they could use it.",
  },
  Capricorn: {
    needs: "Reliability as romance: showing up on time, doing the thing you said by the day you said, taking their work seriously. Feelings need to be received matter-of-factly, because being fussed over embarrasses this Moon into retreat.",
    tell: "They disappear into work: efficiency up, warmth down, replies shorter and more competent by the day. When \"tired\" becomes the whole personality, the feeling underneath has been filed instead of felt.",
  },
  Aquarius: {
    needs: "Space to process at a distance without that distance being prosecuted as coldness. Feelings need to be approached with curiosity and a little notice, never ambushed with a same-day \"we need to talk right now\".",
    tell: "They get more reasonable, not less: calm, abstract, intellectualizing at you from behind a perfectly friendly interface. The warmth is on airplane mode and every answer sounds like a well-written FAQ.",
  },
  Pisces: {
    needs: "Softness handled gently, and a partner who refuses to exploit the fact that they will absorb any mood in the room. Their sensitivity needs to be treated as sense data, real information about the emotional weather, not as drama to be managed.",
    tell: "They fade rather than fight: sleepy, vague, oddly hard to pin down for plans that used to be automatic. The escape hatches open, long shows, long naps, or a sudden deep involvement in someone else's crisis.",
  },
};

// ─────────────────────────── Venus: gives + craves ───────────────────────────

export const VENUS_STYLE: Record<SignKey, { gives: string; craves: string }> = {
  Aries: {
    gives: "Pursuit, openly: the first move, the same-day plan, the blunt compliment said in real time. Wanting you gets announced, never implied.",
    craves: "To be met with equal boldness: say yes fast, flirt back at full volume, and never make them guess whether the chase is welcome. Lukewarm reads as no.",
  },
  Taurus: {
    gives: "Steady, sensory devotion: the meal cooked, the playlist made, a hand resting on your back, the same warmth on a random Tuesday as on your birthday.",
    craves: "Presence and zero games: affection on a rhythm they can trust, plans that do not get moved, being touched without having to ask for it.",
  },
  Gemini: {
    gives: "Attention as banter: the running meme thread, questions that prove they actually listened last week, flirtation with a plot that keeps developing.",
    craves: "To be kept curious: verbal play, new material, a partner who answers texts with something to say. Nothing cools this Venus faster than \"lol nice\".",
  },
  Cancer: {
    gives: "Caretaking as courtship: soup when you are sick, your mother's name remembered, you quietly folded into their people and their traditions.",
    craves: "To be claimed without ambiguity: initiate the tenderness sometimes, guard what they have confided, and never leave their vulnerability hanging in the air unanswered.",
  },
  Leo: {
    gives: "Generosity with production value: real gifts, public affection, the full beam of their attention turned on you until you feel like the main event.",
    craves: "Specific admiration said out loud, and absolute safety from being teased into smallness in front of others. Dim them once at a dinner party and watch the sun go behind a cloud.",
  },
  Virgo: {
    gives: "Love as maintenance: the prescription refilled, the interview prepped, the annoying errand silently done. Devotion arrives in verbs, not speeches.",
    craves: "The small acts noticed and named: thank them for the specific thing, not love in general. And let them fix something for you, being useful is how this Venus gets close.",
  },
  Libra: {
    gives: "Attentiveness with taste: the right restaurant, your coffee order memorized, your evening smoothed before you noticed it needed smoothing.",
    craves: "Effort returned in kind and actual romance kept alive: plan something back, dress up for them on purpose, and do not let the relationship get sloppy just because it is secure.",
  },
  Scorpio: {
    gives: "Totality: undivided attention, fierce privacy about the two of you, loyalty that does not blink when things get genuinely bad.",
    craves: "Depth returned: the unedited version of you, secrets traded rather than extracted, and no recreational flirting with other people. Half-access feels worse to this Venus than no access.",
  },
  Sagittarius: {
    gives: "Adventure as affection: the spontaneous road trip, the honest opinion nobody else will give you, laughing together at the disaster while it is still on fire.",
    craves: "A co-conspirator, not a warden: say yes to the plan, keep your own life interesting, and never make honesty expensive. Guilt-trips teach this Venus to book solo.",
  },
  Capricorn: {
    gives: "Commitment as infrastructure: meeting your parents, untangling your admin chaos, building toward something that has a timeline and a date on it.",
    craves: "Respect and demonstrated seriousness: keep your word on small things, show up when you said, and treat their steady effort as the love letter it actually is.",
  },
  Aquarius: {
    gives: "Friendship, electrified: total acceptance of your weird, loyalty without possessiveness, the rare feeling of being genuinely liked as well as loved.",
    craves: "To be chosen freely rather than fenced: room to roam, honesty over reassurance rituals, no jealousy tests. Clinginess reads as a contract they never signed.",
  },
  Pisces: {
    gives: "Devotion without a ledger: your moods absorbed, your ordinary Tuesday romanticized, forgiveness arriving faster than is probably wise.",
    craves: "Tenderness with edges: return the softness, keep promises literally, and never make them guess where they stand. Vagueness from you drowns a Venus that is already half water.",
  },
};

// ─────────────────────────── Mars: how desire moves ───────────────────────────

export const MARS_SPARK: Record<SignKey, string> = {
  Aries: "Pursuit is the whole poem: they text first, book the date, say exactly what they want, and the heat lives in the sprint rather than the simmer. Being wanted by this Mars is never a mystery you have to solve.",
  Taurus: "Slow, unhurried, and entirely physical: this Mars wins by patience and presence, builds heat through the senses one course at a time, and once ignited does not flicker.",
  Gemini: "The flirtation is verbal first: seduction as a conversation that keeps escalating, midnight voice notes, the tease held one beat past comfortable. If the banter dies, so does the chase.",
  Cancer: "A sideways pursuit: this Mars approaches by caring, feeds you, gets you comfortable, and only then lets the want show. Heat arrives once safety does, and then it is surprisingly tidal.",
  Leo: "Courtship as an event: warm confidence, grand gestures, a performance staged for an audience of one. This Mars wants to be the best you have ever had, and wants to hear you say so.",
  Virgo: "Desire as attentiveness: this Mars studies what works on you, remembers exactly what you liked, and does it better next time. The heat is in the noticing, precise and a little devastating.",
  Libra: "Seduction by charm and mirroring: this Mars may wait for you to make the first move while making that move very, very easy. The heat is flirtation with excellent manners that suddenly is not polite at all.",
  Scorpio: "The long game: intensity over frequency, eye contact that feels like a question you are not sure you should answer. Heat here is total focus and the gravitational pull of everything not yet said.",
  Sagittarius: "The chase is a dare: flirtation delivered half as a joke and fully meant, heat that is spontaneous, outdoors, laughing, and allergic to anything resembling a routine.",
  Capricorn: "Pursuit with intent: this Mars vets first, then commits to the campaign. Desire stays controlled until it very much is not, and ambition suddenly aimed at you is the tell.",
  Aquarius: "Attraction starts in the head: oddly detached right up until they are all-in, with no visible transition. Heat is experimental and unpossessive, and the reliable turn-on is being genuinely surprised by you.",
  Pisces: "Less a chase than a dissolving of distance: this Mars pursues by atmosphere and attunement until you cannot say who moved first. The heat is imaginative and boundary-blurring, and fantasy is half the act.",
};

// ──────────────────── Moon element x Moon element (a x b) ────────────────────
// First key = person A's Moon element, second = person B's. All 16 written
// individually; mirrors are deliberately re-angled, not copied.

export const MOON_ELEMENT_MATCH: Record<Element, Record<Element, string>> = {
  fire: {
    fire: "Two nervous systems that metabolize feelings by burning them off, loudly and fast. Fights are fireworks, repair is quick, and neither of you keeps a grudge ledger. The risk is that nobody ever slows down to check whether anything actually got resolved, just re-energized.",
    earth: "This fire Moon feels safe when feelings move; the earth Moon feels safe when nothing moves suddenly. Fire reads earth's steadiness as stonewalling, earth reads fire's flare-ups as instability. It works once fire learns the flare is optional and earth learns the flare is not dangerous.",
    air: "Air gives this fire oxygen: the outbursts get talked into perspective instead of smothered, and both of you prefer motion to marinating. The shared weakness is shallow repair, you can jointly declare a thing fine well before it is actually fine.",
    water: "This fire discharges feelings outward and forgets them by Friday; the water Moon absorbs them and files them permanently. Fire's Tuesday venting becomes water's remembered wound. Fire needs to circle back after the flare, and water needs to say ouch in the moment, not three weeks later.",
  },
  earth: {
    fire: "This earth Moon builds safety from routine; the fire Moon builds it from momentum, and keeps checking the relationship is alive by shaking it. Earth's love looks like the same reliable Tuesday, which fire can misread as boredom. Earth has to let some plans stay loose, and fire has to stop mistaking calm for decline.",
    earth: "Safety is predictability squared: shared rituals, handled logistics, deep comfort in the unglamorous. Almost nothing gets dramatized here, which is both the blessing and the bug, because resentment between two earth Moons calcifies quietly instead of erupting. Put the hard conversation on the calendar, it will not start itself.",
    air: "This earth Moon trusts what is demonstrated; the air Moon trusts what is explained. Air can feel managed by earth's routines, and earth can feel talked at instead of actually helped. The bridge is literal: air turns words into calendar entries, earth accepts that talking is how air digests, not how it stalls.",
    water: "The water Moon brings the weather and this earth Moon brings the shelter: water feels held, earth feels needed, and daily life runs smooth. The drift to watch is caretaker-and-patient, earth fixing instead of feeling while water feels instead of doing. Trade roles on purpose sometimes.",
  },
  air: {
    fire: "This air Moon is fascinated by fire's certainty, and fire loves that air actually wants to discuss the thing. Emotional processing happens out loud and at pace for both of you. The gap: air can analyze a feeling right past fire's need to have it simply validated, fast and without footnotes.",
    earth: "This air Moon regulates by naming and reframing; the earth Moon regulates by keeping the pattern steady. Air's late-night reprocessing of the relationship can read to earth as instability, while earth's \"it's handled\" can read to air as a closed door. Air should bring conclusions as well as questions, and earth should open the reasoning, not just the verdict.",
    air: "Two people who co-regulate through conversation: nothing is unspeakable, everything is discussable, and that is genuinely rare. The trap is laundering feelings into analysis, fluently narrating the relationship while nobody actually says \"I'm scared\". Ask each other what you are feeling, not only what you think.",
    water: "The water Moon feels first and cannot always cite the source; this air Moon wants the source before it can respond properly. Air's questions land on water as cross-examination, and water's moods land on air as fog with no map. It works when air validates before investigating, and water offers even a rough first draft in words.",
  },
  water: {
    fire: "This water Moon registers everything and keeps the receipts; the fire Moon vents at full volume and genuinely moves on. What fire calls clearing the air, water experiences as shrapnel. Water has to flag the hit while it is happening, and fire has to accept that a feeling can outlast the fight that caused it.",
    earth: "This water Moon needs the feelings witnessed; the earth Moon shows care by quietly solving the thing that caused them. That mismatch is small but daily: water hears silence where earth intends devotion. Earth should say the feeling part out loud sometimes, and water should count the fixed faucet as the love note it was.",
    air: "This water Moon reads the room through its skin; the air Moon reads it through the transcript. When water goes wordless, air goes looking for an explanation, and the search itself can feel invasive. Water gets to say \"I don't have words yet, stay anyway\", and air gets to believe that staying without solving counts.",
    water: "Instant attunement: moods read without words, a private emotional dialect by week two. But this is two absorbers and no ventilator, so one person's low day becomes both people's low week, and feelings compound instead of clearing. Someone has to open a window, name it plainly or take the feelings for a walk.",
  },
};

// ──────────────────── Moon-to-Moon aspect: daily emotional life ────────────────────

export const MOON_ASPECT_READ: Record<AspectKey, string> = {
  conjunction: "You share one emotional weather system: hungry, tired, overwhelmed, and giddy on roughly the same schedule. The felt understanding is immediate, but so is the stacking, when you both go under at once there is nobody left on shore duty. Build one outside pressure valve each.",
  sextile: "Attunement with a small translation step that stays small: comfort arrives when someone actually reaches, a check-in text, one real question. This is a low-maintenance link, but not an automatic one, it rewards small effort and quietly starves without it.",
  trine: "Automatic co-regulation: your moods de-escalate each other without technique, and \"home\" gets established unusually fast. The catch with easy is that it goes unexamined, you can coast on comfort for years and mistake it for depth. Keep asking real questions anyway.",
  square: "Your default ways of self-soothing actively grate on each other: the thing that calms one of you, talking it out, going quiet, being touched, taking action, is exactly what the other cannot stand in that moment. Expect recurring friction at bedtime and under stress. Named as wiring instead of as not-caring, this same aspect builds the sturdiest intimacy on the list.",
  opposition: "You sit at opposite ends of the same emotional axis, so the pull is real and so is the polarization: the feeler versus the calm one, the needy one versus the fine one. Those roles are the trap, not the truth. When neither of you accepts the casting, each holds exactly what the other cannot reach alone.",
  quincunx: "Your emotional vocabularies miss each other at an odd angle, not head-on: needs are not opposed, they are simply never inferred correctly. Neither of you is wrong, and neither of you will ever guess right. The fix is unglamorous and total: say the need in plain words, every single time.",
  none: "No major Moon-to-Moon aspect: parallel emotional lives. Nothing clashes automatically, and nothing attunes automatically either, so you will not intuit each other's inner weather, you will have to ask, out loud, more often than feels romantic. Couples run fine on this, they just cannot run on autopilot.",
};

// ──────────────── Hot-and-cold registers: heavy planet on personal planet ────────────────
// First-named (heavier) planet belongs to the person doing the pulling back;
// the personal planet belongs to the one feeling it. Hard aspects only.

export const HOTCOLD_REGISTER: Record<string, { signature: string; what: string; reassure: string }> = {
  "saturn-venus": {
    signature: "the slow-to-trust wall",
    what: "The Saturn person rations affection because closeness feels like expenditure: a warm weekend gets followed by a cool week, not out of games but out of overexposure. From inside it does not feel like withholding, it feels like being realistic, pacing something they are afraid to want too much.",
    reassure: "Consistency beats intensity: keep plans exactly as made, skip the escalating declarations, and let warmth arrive on schedule rather than in floods. Do not perform bigger to force a thaw, that reads as pressure. The line: if affection only returns after you shrink yourself, that is leverage, not pacing.",
  },
  "saturn-moon": {
    signature: "the flinch at being needed",
    what: "The Saturn person goes practical exactly when the Moon person goes tender. Emotional need lands on them as an exam they might fail, so they armor into competence, offer solutions, or go quiet. The cold is fear of inadequacy wearing a responsible face, not absence of care.",
    reassure: "Ask for something finishable: \"sit with me for ten minutes\" works where open-ended emotional presence panics them. Thank them for the concrete support they do give, Saturn hears that. Watch that one of you does not become the only person who ever feels things out loud, that split hardens fast.",
  },
  "saturn-sun": {
    signature: "the withheld applause",
    what: "The Saturn person goes measured and corrective precisely when the Sun person shines: unedited enthusiasm reads to them as unearned, because their own worth was built brick by brick on earning. The pull-back is approval kept in escrow, graded rather than given.",
    reassure: "Offer admiration in private and in specifics, Saturn distrusts applause but trusts evidence. Sun person: do not shrink to fit the grading curve, ask plainly for one clean acknowledgment with no notes attached. If the corrections only ever run downhill and never soften over the years, that is dimming, not mentorship.",
  },
  "saturn-mars": {
    signature: "the brakes on your engine",
    what: "The Saturn person meets the Mars person's heat, plans, ambition, initiative, desire itself, with delay, critique, or a schedule. Momentum feels reckless to them, so they slow everything to a speed they can supervise. The withhold is fear of the crash, not lack of want.",
    reassure: "Agree on lanes: some moves are the Mars person's to make at full speed, some genuinely need joint pacing, and Saturn thaws once a plan has survived one honest stress-test. The caution: watch for a rhythm where desire itself gets rationed out as reward and punishment, that is not caution anymore.",
  },
  "saturn-mercury": {
    signature: "the red-pen silence",
    what: "The Saturn person goes terse and editorial in conversation: replies arrive late, your phrasing gets corrected, thinking out loud gets treated as sloppiness. From inside it is fear of saying one wrong thing that will be held against them forever, so they simply say fewer things.",
    reassure: "Lower the stakes of talking: flag some conversations as drafts, agree that first drafts never get quoted back later, and ask questions with finite answers rather than essay prompts. The line to name out loud: the day you catch yourself pre-editing every text to them, say so, that is the pattern running you.",
  },
  "uranus-venus": {
    signature: "the intimacy ejector seat",
    what: "The Uranus person runs hot and then abruptly needs air: the third date gets cancelled after a perfect second one, distance follows right on the heels of something true being said. Closeness trips their freedom alarm, and the vanish is about that alarm, not about your worth.",
    reassure: "Do not chase the vanish, it only confirms the claustrophobia. Keep your own orbit genuinely interesting, let reconnection be their idea, and make the relationship feel like an open door rather than a lease. The honest caveat: if chemistry only ever spikes on reunion and the cycles never lengthen into stability, believe the pattern over the promises.",
  },
  "uranus-moon": {
    signature: "the unforecastable weather",
    what: "The Uranus person destabilizes exactly what the Moon person builds comfort from: routines get disrupted, and they go cool, ironic, or suddenly busy the moment feelings turn domestic. To them, cozy reads as a trap door starting to close. The detachment is reflex, not verdict.",
    reassure: "Keep the rituals few but non-negotiable: one anchored night a week beats seven loose ones. Give notice before big emotional conversations, ambush guarantees the ice. And count the cost honestly: if your nervous system stays permanently braced for the next swerve, that is not spontaneity anymore, that is weather damage.",
  },
  "pluto-moon": {
    signature: "the emotional x-ray",
    what: "The Pluto person reads the Moon person's inner life like a case file: moods get mined for hidden meaning, everything is remembered, and when insecurity hits they withdraw into silent surveillance rather than open asking. Underneath the control is a fear of abandonment or betrayal they will almost never name first.",
    reassure: "Radical ordinary transparency deflates it: volunteer the small stuff before it is asked for, and keep their confidences absolutely airtight, one leak resets years. The line, stated plainly: intensity is workable, monitoring is not. If silence is being used as punishment, or your phone and friendships are getting audited, that is control, and no chart makes it okay.",
  },
  "pluto-venus": {
    signature: "the all-or-nothing undertow",
    what: "The Pluto person wants totality and pre-empts losing it by testing: jealousy probes, hot pursuit followed by strategic cooling just to measure what you do. From inside it is terror of mattering less to you than you matter to them, managed through control instead of confession.",
    reassure: "Refuse the tests without punishing the tester: say \"ask me, don't test me\" and then reward the direct ask every time. Demonstrate loyalty in boring, visible ways, those land deeper than declarations. The non-negotiable line: passion that requires your world to shrink, friends, exes, autonomy, has crossed from magnetic to coercive.",
  },
  "neptune-venus": {
    signature: "the beautiful fog",
    what: "The Neptune person idealizes, then dissolves: spellbinding in person, vague about plans, oddly unreachable in between. The retreat is not calculated, they are withdrawing into the version of you and of love they have imagined, which no real Tuesday can match. Promises get made sincerely and kept loosely.",
    reassure: "Pin things gently to reality: specific plans with dates, appreciation aimed at the real person rather than the ideal, and treat what they do as data while treating what they say as weather. The honest caution: if you are always deciphering rather than relating, and accountability slides off every conversation, you are doing fog management, not romance. You deserve findable.",
  },
};

// ──────────────── Node contacts: planet conjunct North / South Node ────────────────
// Keys are the planet of person A landing on person B's node.

export const NODE_CONTACT_READ: { north: Record<string, string>; south: Record<string, string> } = {
  north: {
    Sun: "Their core self sits on the road you are supposed to be walking: being around them makes you more ambitious about your own becoming, and slightly exposed, because they seem to see a version of you that does not fully exist yet. Expect inspiration with a faint edge of \"am I keeping up\".",
    Moon: "Their emotional style is the one your chart says you are here to learn, so caring about them stretches your feelings in directions that are new rather than native. This attachment tends to feel important before it feels comfortable. That order is the point, not a flaw.",
    Venus: "Love that pulls you forward: they find beautiful in you exactly the traits you have not fully claimed yet, so being adored by them can feel like wearing clothes one size ahead. Aspirational, slightly unfamiliar, worth growing into. Say yes slowly and mean it.",
    Mars: "Their drive is pointed straight up your growth axis: they push, initiate, and walk you into rooms you had only been circling. Energizing and occasionally exhausting. The one check worth running: make sure it is your direction at their pace, not their direction wearing your name.",
    Jupiter: "The door-opener contact: their beliefs, their people, and their luck keep expanding exactly the territory you are meant to grow into, almost suspiciously on-theme. This is the gentlest North Node contact on the list. The only risk is outsourcing the whole journey to their optimism instead of building your own.",
    Saturn: "Weight, placed deliberately in the direction of your becoming: they take your future seriously, ask for structure around it, and will not flatter your detours. It reads as commitment and sometimes as pressure, and it is usually both. Slow, binding, and best when they are building it with you rather than supervising the build.",
  },
  south: {
    Sun: "Instantly recognizable, like a character from a story you already know by heart: you understand who they are with almost no onboarding. The catch is direction, they magnetize you toward the self you have already mastered, which is comfortable, flattering, and pointed backward. Enjoy the ease, and keep checking the compass.",
    Moon: "Emotional deja vu: their moods feel like family within weeks and you soothe each other without instruction. That instant homeness can be a rerun of your oldest emotional patterns, including the ones you deliberately moved out of. Worth asking, honestly, whether this is peace or just familiarity.",
    Venus: "The past-life-lovers cliche exists because of contacts like this: affection is immediate, physical ease is uncanny, and courtship skips steps it usually cannot skip. Delicious, and slightly regressive, because this love knows your old self best. Keep introducing it to your new one and see if it stays.",
    Mars: "Instant physical familiarity, and a conflict style that arrives pre-choreographed: you fight like you have fought before, same moves, same exits, first month in. The chemistry is real and so is the script. Rewrite the fight on purpose, or you will perform the old one indefinitely.",
    Jupiter: "Generous and easy, with a distinct feeling of having celebrated together before: they indulge your comfort zone lavishly and ask nothing hard of you. Benevolent, and a little slack, growth is nobody's job inside this contact. Lovely as a harbor, insufficient as the whole voyage.",
    Saturn: "Old debt or old duty: the bond feels obligated from day one, weighty without an obvious cause, often showing up as instinctive deference or unexplained guilt toward them. Some of these are finish-the-lesson bonds and genuinely worth finishing. But if it feels like serving a sentence rather than sharing one, the lesson may be leaving cleanly.",
  },
};

// ──────────────────────────────── Lilith ────────────────────────────────

export const LILITH_LINE: string = "Mean Lilith is a calculated point, the average far point of the Moon's orbit, and in a chart row it marks raw, unbargained magnetism: the appetite you refuse to domesticate, which a partner gets to meet on its own terms or not at all.";

// ─────────────────── house overlays: the dialect (HANDOFF B5) ───────────────────
// "His Moon in your 8th": what a guest planet does in each house of the host's
// chart. Written host/guest-neutral so any of Sun/Moon/Venus/Mars reads true;
// the card headline carries the specific planet and names.

export const HOUSE_DIALECT: Record<number, { arena: string; read: string }> = {
  1: {
    arena: "the front door",
    read: "Lands before words do: the host reacts to this planet's owner on sight, and the owner feels unusually seen, sometimes more seen than they signed up for. Identity and image entangle fast here, and the two of you read as a couple to strangers almost immediately.",
  },
  2: {
    arena: "the ledger",
    read: "The host's zone of security, money and what counts as solid. The owner becomes part of how safe the host feels: steadying when this planet gives, rattling when it withdraws. Care here talks in practical dialect, gifts, fixing, providing, and gets underread as unromantic.",
  },
  3: {
    arena: "the group chat",
    read: "Daily talk, errands, sibling-level banter. The owner becomes the host's favorite person to narrate the day to, which is real intimacy wearing casual clothes. The trap is staying in the shallows: endless logistics and jokes standing in for the one conversation that matters.",
  },
  4: {
    arena: "the kitchen table",
    read: "Straight into the host's private interior: family, home, the unguarded self. The owner gets shown the version of the host that guests never meet, and starts to feel like family fast, with everything the word implies, including the host's oldest reflexes.",
  },
  5: {
    arena: "the dance floor",
    read: "The host's romance and play circuit lights up around this planet: flirtation stays alive long past the point most couples archive it. The owner is cast as the fun one, the muse, the crush. Watch what happens when life demands boring competence, this house resents the unsexy chapters.",
  },
  6: {
    arena: "the daily grind",
    read: "Routines, health, who does what by when. Unglamorous and quietly decisive: the owner either becomes the person who makes the host's ordinary life run better, or the one whose habits grind. Love here looks like refilled prescriptions and remembered appointments, notice it or lose it.",
  },
  7: {
    arena: "the contract",
    read: "The host's partnership seat: this planet's owner simply fits the role of significant other, and the relationship pulls toward definition, labels, terms, futures. The pull is real but impersonal, the house wants a partner; make sure it is also about this one.",
  },
  8: {
    arena: "the vault",
    read: "Trust, merging, the things the host tells no one. The owner gets a key without asking for it, so the connection runs deep and slightly out of daylight: transformative on trust, obsessive on doubt. Casual is not on the menu in this house, and both of you can feel it.",
  },
  9: {
    arena: "the open road",
    read: "Beliefs, travel, the bigger map. The owner arrives as a horizon-widener: new places, new frameworks, the sense that life got larger on contact. The friction shows up at customs, when belief systems differ and neither of you wants to convert.",
  },
  10: {
    arena: "the podium",
    read: "The host's public life and ambitions. The owner gets woven into how the host is seen professionally, power-couple energy when aligned, image management when not. Feelings here get audited for optics, so keep one channel between you that answers to no audience.",
  },
  11: {
    arena: "the found family",
    read: "Friends, futures, the chosen tribe. The owner is folded into the host's long game and circle, loved as ally and co-conspirator. The warmth is durable and low-drama; the watch item is the romance getting parked in the friend zone's comfortable weather.",
  },
  12: {
    arena: "the back room",
    read: "The host's blind spot and inner sea. The owner touches what the host has not fully met in themselves: dreams, leaks, the unnamed. Tenderness here is enormous and boundaries are not, so say the quiet parts out loud on a schedule, before the fog writes its own story.",
  },
};
