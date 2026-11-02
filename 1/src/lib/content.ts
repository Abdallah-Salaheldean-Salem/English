import { CombiningExercise, ModelPassage } from '../types';

export const PUBLIC_DOMAIN_MODELS: ModelPassage[] = [
  {
    id: 'franklin-spectator',
    author: 'Benjamin Franklin',
    title: 'On Learning to Write (Autobiography)',
    year: '1791',
    source: 'The Autobiography of Benjamin Franklin',
    text: `About this time I met with an odd volume of the Spectator. It was the third. I had never before seen any of them. I bought it, read it over and over, and was much delighted with it. I thought the writing excellent, and wished, if possible, to imitate it. With this view I took some of the papers, and, making short hints of the sentiment in each sentence, laid them by a few days, and then, without looking at the book, try'd to compleat the papers again, by expressing each hinted sentiment at length, and as fully as it had been expressed before, in any suitable words that should come to hand. Then I compared my Spectator with the original, discovered some of my faults, and corrected them.`,
    notes: 'Franklin\'s foundational description of the deliberate practice drill that forms the core of Phase 2 and 3.',
    wordCount: 132,
    tags: ['Franklin Method', 'Narrative', 'Deliberate Practice']
  },
  {
    id: 'lincoln-gettysburg',
    author: 'Abraham Lincoln',
    title: 'The Gettysburg Address',
    year: '1863',
    source: 'Address delivered at the dedication of the Cemetery at Gettysburg',
    text: `Four score and seven years ago our fathers brought forth on this continent, a new nation, conceived in Liberty, and dedicated to the proposition that all men are created equal. Now we are engaged in a great civil war, testing whether that nation, or any nation so conceived and so dedicated, can long endure. We are met on a great battle-field of that war. We have come to dedicate a portion of that field, as a final resting place for those who here gave their lives that that nation might live. It is altogether fitting and proper that we should do this.`,
    notes: 'Masterclass in parallel construction, cadence, and Anglo-Saxon brevity.',
    wordCount: 104,
    tags: ['Rhetoric', 'Cadence', 'Brevity']
  },
  {
    id: 'huxley-chalk',
    author: 'Thomas Henry Huxley',
    title: 'On a Piece of Chalk',
    year: '1868',
    source: 'Lectures to Working Men',
    text: `If a well were sunk at our feet in the midst of the city of Norwich, the diggers would very soon find themselves at work by that white substance, which is so well known in the shape of common chalk. If the passage of the bore-hole were carefully examined, it would be found to cut through beds of clay, of gravel, and of sand, and then to enter upon this very substance; and after having pierced it to a thickness of some five hundred feet, they would come out upon another bed of clay. But whatever its thickness, this same bed of chalk extends over a large area of the surface of the earth.`,
    notes: 'Exceptional visual exposition moving smoothly from the local and concrete to the geological and vast.',
    wordCount: 116,
    tags: ['Exposition', 'Clarity', 'Science']
  },
  {
    id: 'russell-three-passions',
    author: 'Bertrand Russell',
    title: 'What I Have Lived For',
    year: '1967',
    source: 'Prologue to The Autobiography of Bertrand Russell',
    text: `Three passions, simple but overwhelmingly strong, have governed my life: the longing for love, the search for knowledge, and unbearable pity for the suffering of mankind. These passions, like great winds, have blown me hither and thither, in a wayward course, over a deep ocean of anguish, reaching to the very verge of despair. Love and knowledge, so far as they were possible, led upward toward the heavens. But always pity brought me back to earth. Echoes of cries of pain reverberate in my heart.`,
    notes: 'Tripartite balance, transparent syntax, and dramatic emotional arc.',
    wordCount: 88,
    tags: ['Philosophy', 'Cadence', 'Sentence Rhythm']
  },
  {
    id: 'woolf-moth',
    author: 'Virginia Woolf',
    title: 'The Death of the Moth (Excerpt)',
    year: '1942',
    source: 'The Death of the Moth and Other Essays',
    text: `Moths that fly by day are not properly to be called moths; they do not excite that pleasant sense of dark autumn nights and ivy-blossom which the commonest yellow-underwing waking in the shadow of the curtain never fails to stir in us. They are hybrid creatures, neither gay like butterflies nor sombre like their own species. Nevertheless the present specimen, with his narrow hay-coloured wings, seemed to be content with life. It was a pleasant morning, mid-September, mild, benignant, yet with a keener breath than that of the summer months.`,
    notes: 'Sensory precision, varied clause lengths, and subtle rhythmic acceleration.',
    wordCount: 94,
    tags: ['Observation', 'Sensory', 'Atmosphere']
  },
  {
    id: 'swift-gulliver',
    author: 'Jonathan Swift',
    title: 'A Voyage to Lilliput (Opening)',
    year: '1726',
    source: 'Gulliver\'s Travels',
    text: `My father had a small estate in Nottinghamshire; I was the third of five sons. He sent me to Emanuel College in Cambridge at fourteen years old, where I resided three years, and applied myself close to my studies; but the charge of maintaining me, although I had a very scanty allowance, being too great for a narrow fortune, I was bound apprentice to Mr. James Bates, an eminent surgeon in London, with whom I continued four years; and my small remembrance of what money my father sent me, I laid out in learning navigation, and other parts of the mathematics, useful to those who intend to travel.`,
    notes: 'Clean periodic structure with semicolon chaining typical of early plain style.',
    wordCount: 108,
    tags: ['Periodic Syntax', 'Narrative', 'Plain Style']
  }
];

export const COMBINING_EXERCISES: CombiningExercise[] = [
  {
    id: 'comb-1-coord',
    title: 'Coordinating Conjunctions & Balance',
    category: 'Coordination',
    instruction: 'Combine the three short sentences into a single balanced sentence using a compound verb or coordinating conjunction.',
    sourceSentences: [
      'The engineer inspected the faulty sensor at dawn.',
      'She noted the erratic voltage fluctuations in the log.',
      'She ordered an immediate shutdown of the cooling pumps.'
    ],
    sampleSolution: 'At dawn the engineer inspected the faulty sensor, noted the erratic voltage fluctuations in the log, and ordered an immediate shutdown of the cooling pumps.',
    notes: 'Avoid repeating the subject pronoun when sharing compound predicates.'
  },
  {
    id: 'comb-2-subord',
    title: 'Subordination for Logical Focus',
    category: 'Subordination',
    instruction: 'Subordinate the background circumstances to highlight the decisive outcome in the main independent clause.',
    sourceSentences: [
      'The storm intensified throughout the afternoon.',
      'The telephone wires along the coast snapped one by one.',
      'The lighthouse keeper maintained the beacon by hand without pausing.'
    ],
    sampleSolution: 'Although the storm intensified throughout the afternoon and snapped the coastal telephone wires one by one, the lighthouse keeper maintained the beacon by hand without pausing.',
    notes: 'The most important psychological point belongs in the main independent clause.'
  },
  {
    id: 'comb-3-appositive',
    title: 'Appositive Phrasing for Compression',
    category: 'Appositives',
    instruction: 'Combine using an appositive noun phrase instead of a separate relative "who was" clause.',
    sourceSentences: [
      'Dr. Elena Vance arrived at the summit at midnight.',
      'She was the chief glaciologist for the Antarctic expedition.',
      'She carried ice core samples that had taken three seasons to extract.'
    ],
    sampleSolution: 'Dr. Elena Vance, chief glaciologist for the Antarctic expedition, arrived at the summit at midnight carrying ice core samples that had taken three seasons to extract.',
    notes: 'Appositives trim dead syntactic weight.'
  },
  {
    id: 'comb-4-participle',
    title: 'Participial Phrases for Flow',
    category: 'Participles',
    instruction: 'Convert the initial actions into present or past participial phrases to create forward kinetic momentum.',
    sourceSentences: [
      'The artisan smoothed the walnut timber with fine sandpaper.',
      'He inspected every grain under angled lamp light.',
      'He applied the first coat of warm beeswax with a linen rag.'
    ],
    sampleSolution: 'Smoothing the walnut timber with fine sandpaper and inspecting every grain under angled lamp light, the artisan applied the first coat of warm beeswax with a linen rag.',
    notes: 'Make sure the participle clearly attaches to the subject of the main clause to avoid dangling modifiers.'
  },
  {
    id: 'comb-5-contrast',
    title: 'Semicolon & Antithetical Contrast',
    category: 'Semicolon & Antithesis',
    instruction: 'Form a sharp two-part antithesis linked with a semicolon or conjunctive adverb.',
    sourceSentences: [
      'Novices measure productivity by the number of words produced.',
      'Experienced writers measure quality by the number of redundant sentences discarded.'
    ],
    sampleSolution: 'Novices measure productivity by the number of words produced; experienced writers measure quality by the number of redundant sentences discarded.',
    notes: 'Semicolons shine when contrasting two closely paired thoughts of equal weight.'
  }
];

export const WRITING_PROMPTS = [
  {
    category: 'Observation & Concrete Detail',
    prompts: [
      'Describe a physical object on your desk as if explaining its exact material, wear, and function to someone who cannot see it.',
      'Recall a specific room you inhabited five years ago. Detail the sound, lighting, and smell of that room without using abstractions.',
      'Describe an ordinary daily task (making coffee, sharpening a pencil, tying a knot) with photographic mechanical precision.'
    ]
  },
  {
    category: 'Explanation & Mechanics',
    prompts: [
      'Explain how a thermostat or feedback loop operates to a bright ten-year-old without talking down to them.',
      'Explain the difference between a tool and a machine using one concrete example of each.',
      'Describe what happens in the first three seconds when you hit Enter on a web browser address bar.'
    ]
  },
  {
    category: 'Arguments & Conviction',
    prompts: [
      'Make the strongest possible case for an opinion you hold that fewer than one in ten of your colleagues agrees with.',
      'Defend the proposition that handwriting notes on paper yields deeper comprehension than typing on a laptop.',
      'Argue why simplicity in software design is harder to achieve than added complexity.'
    ]
  },
  {
    category: 'Reflection & Deliberate Practice',
    prompts: [
      'What is the single most common grammatical mistake you catch yourself making, and why does your brain default to it?',
      'Reflect on a piece of writing you read this past week that made you stop and admire its sentence structure.',
      'What friction do you experience in the first three minutes of sitting down to write, and how do you push past it?'
    ]
  }
];

export const PLAN_BOOKS = [
  {
    id: 'strunk-white',
    title: 'The Elements of Style',
    author: 'William Strunk Jr. & E.B. White',
    purpose: 'Core rules of usage, elementary principles of composition, and vigorous brevity ("Omit needless words").',
    phaseRecommended: 1
  },
  {
    id: 'williams-style',
    title: 'Style: Lessons in Clarity and Grace',
    author: 'Joseph M. Williams',
    purpose: 'Actions in verbs, characters as subjects, cohesion between sentence openings and closings, managing emphasis.',
    phaseRecommended: 2
  },
  {
    id: 'thomas-turner',
    title: 'Clear and Simple as the Truth',
    author: 'Francis-Noël Thomas & Mark Turner',
    purpose: 'Mastering the classic style: truth as presentation, author as guide, reader as alert equal.',
    phaseRecommended: 3
  },
  {
    id: 'zinsser',
    title: 'On Writing Well',
    author: 'William Zinsser',
    purpose: 'Clutter elimination, unity of voice, non-fiction craft, and developing personal rhythm.',
    phaseRecommended: 2
  }
];
