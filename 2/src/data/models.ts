import { ReadingItem, SentenceCombiningPrompt } from '../types';

export const COPYWORK_MODELS = [
  {
    id: 'pg-makers-schedule',
    author: 'Paul Graham',
    title: 'Maker\'s Schedule, Manager\'s Schedule',
    text: `When you're operating on the maker's schedule, disruptions are catastrophic. To someone on the manager's schedule, having a meeting at 2:00 pm is merely a half-hour inconvenience. But to someone writing code or essays, a meeting ruins the whole afternoon. You cannot write a serious piece of prose in twenty-minute fragments. You need two or three uninterrupted hours to construct the mental model of the whole argument in your mind before a single word lands on the screen.`,
    sentenceCount: 5,
    wordCount: 78
  },
  {
    id: 'pg-writing-briefly',
    author: 'Paul Graham',
    title: 'Writing, Briefly',
    text: `The best writing is concise. Most people write too many words. They think more words make their ideas sound heavier. In fact, superfluous words only dilute meaning. If you want your reader to understand an idea, cut everything that does not support it. Write your first draft as quickly as possible. Then go through it and delete half the sentences. You will be astonished at how much stronger the remaining ideas become.`,
    sentenceCount: 7,
    wordCount: 71
  },
  {
    id: 'klinkenborg-sentences',
    author: 'Verlyn Klinkenborg',
    title: 'Several Short Sentences About Writing',
    text: `Most of the sentences you make will be too long. They will carry more luggage than they need. You think you are being sophisticated, but you are only being polite or timid. Learn to see where the sentence actually ends. Put a period there. Then begin the next sentence with courage and clear intent. A sentence is not a container you stuff to bursting. It is a single stride across the ground.`,
    sentenceCount: 8,
    wordCount: 74
  },
  {
    id: 'orwell-clear-prose',
    author: 'George Orwell',
    title: 'Politics and the English Language',
    text: `A scrupulous writer, in every sentence that he writes, will ask himself at least four questions: What am I trying to say? What words will express it? What image or idiom will make it clearer? Is this image fresh enough to have an effect? And he will probably ask himself two more: Could I put it more shortly? Have I said anything that is avoidably ugly?`,
    sentenceCount: 3,
    wordCount: 68
  },
  {
    id: 'zinsser-clutter',
    author: 'William Zinsser',
    title: 'On Writing Well',
    text: `Clutter is the disease of American writing. We are a society strangling in unnecessary words, circular constructions, and pompous nouns. Most first drafts can be cut by fifty percent without losing any information or any of the author's voice. Look at every word you have written. Can you do without it? Does it pull its weight? If not, cross it out.`,
    sentenceCount: 6,
    wordCount: 62
  }
];

export const FRANKLIN_REBUILD_MODELS = [
  {
    id: 'franklin-1',
    author: 'Benjamin Franklin',
    title: 'On Habit and Self-Correction',
    text: `I made a little book, in which I allotted a page for each of the virtues. I ruled each page with red ink, so as to have seven columns, one for each day of the week. In these columns I marked with a little black spot every fault I found upon examination to have been committed respecting that virtue upon that day. I determined to give a week's strict attention to each of the virtues successively. Thus, in the first week, my great guard was to avoid the least offence against temperance. Proceeding thus to the last, I could go through a course complete in thirteen weeks.`
  },
  {
    id: 'pg-ideas',
    author: 'Paul Graham',
    title: 'How to Get Startup Ideas',
    text: `The way to get ideas is not to try to think of ideas. It is to look for problems, preferably problems you have yourself. The very best ideas tend to have three things in common: they are something the founders themselves want, that they themselves can build, and that few others realize are worth doing. When you build something you personally need, you know immediately whether what you made actually works or fails.`
  },
  {
    id: 'williams-clarity',
    author: 'Joseph M. Williams',
    title: 'Style: Toward Clarity and Grace',
    text: `Readers want stories about flesh-and-blood characters doing real actions. When you turn active verbs into abstract nouns, your prose becomes sluggish and bureaucratic. A sentence comes alive when its grammatical subject names the true agent of the action and its verb names the crucial deed. Clear writers do not bury their actors in prepositional phrases. They place them proudly at the start of the clause.`
  }
];

export const SENTENCE_COMBINING_PROMPTS: SentenceCombiningPrompt[] = [
  {
    id: 'sc-1',
    title: 'The Overheated Microcontroller',
    sourceSentences: [
      'The microcontroller temperature surged past eighty degrees.',
      'The onboard sensors detected excessive thermal output.',
      'The watchdog timer triggered an emergency shutdown.',
      'The cooling fan had ceased spinning twenty minutes earlier.',
      'Dust had accumulated inside the heat sink fins.',
      'The engineering team inspected the circuit board immediately.'
    ],
    exampleApproach: 'Notice the cause-and-effect chain: dust in the fan led to thermal buildup, which triggered the watchdog.'
  },
  {
    id: 'sc-2',
    title: 'Database Query Latency',
    sourceSentences: [
      'The booking endpoint began timing out under peak load.',
      'Hundreds of concurrent users flooded the reservation system.',
      'The database lacked an index on the user timestamp column.',
      'The server executed a full table scan on every incoming request.',
      'Memory utilization spiked to ninety-nine percent within seconds.',
      'The backend engineer deployed a composite index to resolve the bottleneck.'
    ],
    exampleApproach: 'Try leading with a participle clause or dependent clause showing the bottleneck before stating the fix.'
  },
  {
    id: 'sc-3',
    title: 'The Unaided Writing Session',
    sourceSentences: [
      'The student closed all browser tabs with artificial intelligence tools.',
      'He set a physical countdown timer for twenty-five minutes.',
      'His initial sentences felt rigid and hesitant.',
      'He refused to backspace or second-guess his vocabulary.',
      'By the tenth minute his typing speed doubled in rhythm.',
      'He filled the blank page with one hundred and eighty clean words.'
    ],
    exampleApproach: 'Contrast the early hesitation with the rhythm achieved by the tenth minute using a coordinating conjunction.'
  }
];

export const SUMMARY_EXCERPTS = [
  {
    id: 'sum-1',
    title: 'Cognitive Debt and AI Assistance in Writing (MIT Media Lab)',
    text: `In a controlled study conducted at MIT by Kosmyna and colleagues, 54 students participated in multi-session essay writing tasks. One cohort drafted their arguments using conversational AI assistants, while the second cohort composed their drafts completely unaided before accessing external tools. Neuroimaging and post-session recall tests revealed that students who drafted with AI experienced lower cognitive load during generation but exhibited significantly impaired recall of their own arguments. When subsequently tested on unaided writing tasks, the AI-first group struggled to construct sustained paragraph arcs and exhibited heightened hesitation. Conversely, students who developed their drafting habits independently maintained sentence fluency even when later introduced to digital editing tools.`
  },
  {
    id: 'sum-2',
    title: 'Deliberate Practice and Writing Fluency (Kellogg, 2008)',
    text: `Cognitive psychologist Ronald Kellogg analyzed the developmental trajectory of writing expertise over decades. Kellogg demonstrated that writing is among the most demanding cognitive activities humans perform, requiring concurrent coordination of planning, linguistic translation, and critical reviewing in working memory. Because working memory is strictly limited, novice writers frequently freeze when attempting to manage grammar, vocabulary, and overarching argument simultaneously. Kellogg established that only daily spaced practice on familiar subject matter allows sentence generation to achieve automaticity. Once lower-level sentence construction becomes fluent and unaided, working memory capacity is liberated to focus on higher-order argument architecture.`
  }
];

export const PHASE1_WRITING_PROMPTS = [
  'A stubborn bug or hardware fault you debugged recently.',
  'How your team\'s hub or queue processes an incoming booking or request.',
  'A mistake you caught right before shipping or submitting work.',
  'How a mechanical or software system you know well actually functions.',
  'What went wrong during a recent technical experiment and what you learned.',
  'A routine task you perform every week, explained step by step.'
];

export const READING_LIST_DATA: ReadingItem[] = [
  {
    phase: 1,
    bookTitle: 'Several Short Sentences About Writing',
    author: 'Verlyn Klinkenborg',
    whyThisOne: 'Teaches writing one sentence at a time, which is exactly where you are starting.',
    minutesLogged: 0,
    sessionsLogged: 0,
    notes: '',
    completed: false
  },
  {
    phase: 2,
    bookTitle: 'Style: Lessons in Clarity and Grace',
    author: 'Joseph M. Williams and Joseph Bizup',
    whyThisOne: 'The clearest guide to why some sentences are easy to read and others are not.',
    minutesLogged: 0,
    sessionsLogged: 0,
    notes: '',
    completed: false
  },
  {
    phase: 3,
    bookTitle: 'On Writing Well',
    author: 'William Zinsser',
    whyThisOne: 'The standard guide to clear, vigorous nonfiction prose and eliminating clutter.',
    minutesLogged: 0,
    sessionsLogged: 0,
    notes: '',
    completed: false
  },
  {
    phase: 3,
    bookTitle: 'Steering the Craft',
    author: 'Ursula K. Le Guin',
    whyThisOne: 'Short chapters built around deliberate exercises for narrative, sentence rhythm, and voice.',
    minutesLogged: 0,
    sessionsLogged: 0,
    notes: '',
    completed: false
  },
  {
    phase: 4,
    bookTitle: 'The Sense of Style',
    author: 'Steven Pinker',
    whyThisOne: 'Explains why expert writers lose their readers ("the curse of knowledge") and how to diagnose it.',
    minutesLogged: 0,
    sessionsLogged: 0,
    notes: '',
    completed: false
  }
];

export const INITIAL_ERROR_LOG = [
  {
    id: 'err-1',
    errorType: 'Missing article',
    whatIWrote: 'AI application wrote for me',
    correctForm: 'an AI application / AI applications',
    dateAdded: '2026-11-02',
    frequency: 2,
    isDrillTarget: false,
    notes: 'Singular countable nouns require an article (a/an/the) or pluralization.'
  },
  {
    id: 'err-2',
    errorType: 'Article with a plural',
    whatIWrote: 'give me a examples',
    correctForm: 'give me examples',
    dateAdded: '2026-11-02',
    frequency: 2,
    isDrillTarget: false,
    notes: 'Indefinite article "a/an" must not precede plural countable nouns.'
  },
  {
    id: 'err-3',
    errorType: 'Missing to before a verb',
    whatIWrote: 'how produce them',
    correctForm: 'how to produce them',
    dateAdded: '2026-11-02',
    frequency: 3,
    isDrillTarget: true,
    notes: 'Infinitive phrase with "how": needs "to" before the bare infinitive.'
  },
  {
    id: 'err-4',
    errorType: 'Noun used as an adjective',
    whatIWrote: 'a health mindset',
    correctForm: 'a healthy mindset',
    dateAdded: '2026-11-02',
    frequency: 1,
    isDrillTarget: false,
    notes: 'Use the adjective "healthy" instead of the noun "health".'
  },
  {
    id: 'err-5',
    errorType: 'Spelling',
    whatIWrote: 'project mangment',
    correctForm: 'project management',
    dateAdded: '2026-11-02',
    frequency: 1,
    isDrillTarget: false,
    notes: 'Missing syllable "a" in management.'
  }
];
