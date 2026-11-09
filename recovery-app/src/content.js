/* content.js: fixed material from the English Writing Recovery Plan. No logic. */
'use strict';

const ERROR_TYPES = [
  'Missing article', 'Article with a plural', 'Wrong article', 'Missing "to" before a verb',
  'Noun used as an adjective', 'Spelling', 'Subject-verb agreement', 'Verb tense',
  'Verb form', 'Preposition', 'Word order', 'Singular or plural noun', 'Word choice',
  'Run-on or comma splice', 'Sentence fragment', 'Punctuation', 'Capitalization', "its vs it's",
  'Conditional form', 'Hyphen before a noun', 'Space before punctuation', 'Other'
];

/* The first error-log rows come from the plan itself (by: 'plan'). */
const PLAN_ERRORS = [
  { type: 'Missing article', wrote: 'AI application wrote for me', correct: 'an AI application / AI applications' },
  { type: 'Article with a plural', wrote: 'give me a examples', correct: 'give me examples' },
  { type: 'Missing "to" before a verb', wrote: 'how produce them', correct: 'how to produce them' },
  { type: 'Noun used as an adjective', wrote: 'a health mindset', correct: 'a healthy mindset' },
  { type: 'Spelling', wrote: 'project mangment', correct: 'project management' },
  { type: 'Spelling', wrote: 'this app relay on', correct: 'this app relies on' },
  { type: "its vs it's", wrote: 'its making me', correct: "it's making me" },
  { type: 'Capitalization', wrote: 'i lost', correct: 'I lost' },
  { type: 'Conditional form', wrote: 'if you take', correct: 'if you took' },
  { type: 'Hyphen before a noun', wrote: 'well written articles', correct: 'well-written articles' },
  { type: 'Space before punctuation', wrote: 'have that ?', correct: 'have that?' }
];

/* Phase 0 placement test (roadmap section 4). Part A: correct each sentence; Part B: 5 sentences about yesterday. */
const PLACEMENT = [
  'She work in a lab every day.',
  'Yesterday I go to the hub and fix the printer.',
  'I have finish my report last week.',
  'He is engineer at a university.',
  'We need more informations about the project.',
  'The machine is very use for students.',
  'Its important to test the board before you ship it.',
  'I was tired, I went home early.',
  'The students which come to the lab learns fast.',
  'i dont know why the code fail.'
];
/* The six study areas and the Part A items that test each one. */
const AREAS = [
  { id: 'core', name: 'Sentence core', covers: 'A subject and a verb in every sentence; joining two sentences correctly', items: [8] },
  { id: 'verbs', name: 'Verb forms', covers: '-s after he, she, it; past simple ("I wrote") vs present perfect ("I have written")', items: [1, 2, 3, 9, 10] },
  { id: 'articles', name: 'Articles and nouns', covers: 'a, an, the; plurals; words with no plural, such as information', items: [4, 5] },
  { id: 'forms', name: 'Word forms', covers: 'Noun, adjective, adverb: use vs useful, health vs healthy', items: [6] },
  { id: 'joining', name: 'Joining words', covers: 'and, but, so, because, who, which', items: [8, 9] },
  { id: 'punct', name: 'Punctuation', covers: "Capitals, its vs it's, short forms like don't", items: [7, 10] }
];
const IMITATION_EXAMPLE = {
  model: 'Most engineers learn to write the way they learn to debug: slowly, by repeating the same mistake until it hurts.',
  pattern: '[Group] + [verb] + the way they + [verb]: [how], by + [-ing verb] + until + [clause].',
  grammar: 'learn to + base verb; by + -ing for the method; until + subject + verb.',
  imitation: 'Most students learn to cook the way they learn to drive: \u2026'
};

const PHASES = {
  0: { name: 'Foundations', span: 'Weeks 1-6', goal: 'Rebuild sentence grammar before you write freely.',
       rules: ['Take the placement test once, without AI, a checker or a dictionary. Guess and mark unsure answers with "?".',
               'Study only the areas the test flags, one Murphy unit a day: rule, exercises, answer key.',
               'Then write 5 sentences of your own that use that unit\u2019s grammar.',
               'Twice a week, do the sentence imitation drill instead of the 5 sentences.'] },
  1: { name: 'Restart', span: 'Weeks 7-10', goal: 'Write plain, correct sentences again without freezing. Speed and volume matter more than quality.',
       rules: ['One idea per sentence.', 'Subject and verb within the first five words.', '10-20 words per sentence.',
               'When stuck, write the simplest true sentence ("The board did not boot.") and build from it.',
               'Twice a week, an article session replaces the timed writing.'] },
  2: { name: 'Control', span: 'Weeks 11-18', goal: 'Control paragraphs on purpose, not by luck. One drill a weekday, one piece at the weekend.',
       rules: ['The point is in the first sentence of each paragraph.', 'Each sentence picks up something from the one before it.',
               'No sentence runs past 25 words.', 'Once a week, an article session replaces one weekday drill.'] },
  3: { name: 'Whole pieces', span: 'Months 5-7', goal: 'Finish whole pieces that a stranger would read to the end. One form for three months.',
       rules: ['Week A: plan and draft the piece.', 'Week B: revise, post for critique, revise again.',
               'Keep 2 weekday drills: a Franklin rebuild and sentence combining.'] },
  4: { name: 'Publish', span: 'Month 8 on', goal: 'Publish one piece a month in one public place. No gate; this phase continues.',
       rules: ['Weeks 1-2: draft the piece.', 'Week 3: get critique and revise.', 'Week 4: final read-aloud pass, then publish.',
               'Every week: one Franklin rebuild on a writer you admire.'] }
};

const GATE_TEXT = {
  0: ['Every area the placement test flagged is done', '9 or more right on a new 10-sentence test from Claude', '20 sentence imitations written and marked'],
  1: ['15 sessions done', '150 words written in 15 minutes without stopping', 'Your most frequent errors identified (4 types seen at least twice)'],
  2: ['6 Franklin rebuilds that keep every idea of the original', '8 weekend pieces finished and revised', 'Top 3 errors from Phase 1 at most once per 300 words'],
  3: ['3 finished pieces of 800+ words', 'Each revised after feedback from at least 2 readers', '5 critiques written for other writers']
};

const RULES_TABLE = [
  ['AI drafts or rewrites any sentence', 'Never', 'This is what caused the loss'],
  ['Grammarly or autocomplete while drafting', 'Off', 'Suggestions interrupt the sentence you are building'],
  ['AI marks errors after the draft, without fixing them', 'Yes', 'You still do the repair, which is the learning'],
  ['AI explains a grammar rule you got wrong', 'Yes', 'Rules stick when tied to your own error'],
  ['Dictionary or example sentences for one word', 'Yes', 'Checks usage without writing for you']
];

const REVISION_CHECKS = [
  ['point', 'The point is in the first sentence of each paragraph.'],
  ['link', 'Each sentence picks up something from the one before it.'],
  ['len25', 'No sentence runs past 25 words.'],
  ['opening', 'The opening states a problem (with but, however or although) and what it costs, not background.'],
  ['aloud', 'It reads aloud without stumbling.']
];

const BOOKS = [
  { id: 'murphy', phase: 0, author: 'Raymond Murphy', title: 'English Grammar in Use (intermediate)', why: 'Two-page grammar units with exercises and an answer key.' },
  { id: 'klinkenborg', phase: 1, author: 'Verlyn Klinkenborg', title: 'Several Short Sentences About Writing', why: 'Teaches writing one sentence at a time, which is exactly where you are starting.' },
  { id: 'williams', phase: 2, author: 'Joseph M. Williams and Joseph Bizup', title: 'Style: Lessons in Clarity and Grace', why: 'The clearest guide to why some sentences are easy to read and others are not.' },
  { id: 'zinsser', phase: 3, form: 'essay', author: 'William Zinsser', title: 'On Writing Well', why: 'The standard guide to clear nonfiction.' },
  { id: 'leguin', phase: 3, form: 'story', author: 'Ursula K. Le Guin', title: 'Steering the Craft', why: 'Short chapters, each with exercises to do.' },
  { id: 'pinker', phase: 4, author: 'Steven Pinker', title: 'The Sense of Style', why: 'Explains why expert writers lose their readers and how to fix it.' }
];

const FORMS = {
  essay: { label: 'Essays or blog posts', min: 800, max: 1500, study: "Paul Graham's essays; Zinsser, On Writing Well" },
  story: { label: 'Short stories', min: 1500, max: 3000, study: 'Le Guin, Steering the Craft' }
};

const TOPICS = [
  'Your day so far, in the order it happened.',
  'A board you debugged recently: what failed and how you found it.',
  'How the Hub handles a booking, from the request to the pickup.',
  'The last thing you fixed with your hands.',
  'A machine in the Hub that new students misuse, and how to use it properly.',
  'What happened in your last MSc lecture or lab.',
  'A freelance job: what the client asked for and what you delivered.',
  'How an ESP32 joins a Wi-Fi network, for someone who has never used one.',
  'A decision you made this week and why you made it.',
  'Your way to work this morning.',
  'A meal you cook often and how you make it.',
  'A project that went wrong and what you would change.',
  'How you plan a workshop at the Hub.',
  'A conversation you had today.',
  'Something you learned from a datasheet.',
  'The room you are sitting in right now.',
  'How you test a PCB after assembly.',
  'A problem a student brought to you this week.',
  'A tool you use every day and why you trust it.',
  'What you want to have built by the end of this year.'
];

/* Six short sentences each, to join into two or three longer ones, three different ways. */
const COMBINING = [
  { id: 'c01', title: 'The board that would not boot', s: ['The board arrived on Monday.', 'It would not boot.', 'I checked the power rail first.', 'The rail read 3.3 volts.', 'The crystal was not oscillating.', 'A cold solder joint had cracked.'] },
  { id: 'c02', title: 'A booking at the Hub', s: ['A student booked the laser cutter.', 'She booked it for Tuesday morning.', 'She had never used it before.', 'The induction takes twenty minutes.', 'She missed the induction.', 'We moved her booking to Thursday.'] },
  { id: 'c03', title: 'The late sensor reading', s: ['The CO2 sensor reports every two seconds.', 'The display updated every ten seconds.', 'The readings looked stale.', 'The buffer was too small.', 'Old values stayed in it.', 'I doubled the buffer size.'] },
  { id: 'c04', title: 'The workshop plan', s: ['The workshop is on soldering.', 'Twelve students signed up.', 'We have eight irons.', 'Some irons need new tips.', 'I ordered tips last week.', 'They have not arrived.'] },
  { id: 'c05', title: 'A client message', s: ['The client sent a message at midnight.', 'The firmware crashed on startup.', 'He had changed the Wi-Fi password.', 'The new password had a space in it.', 'My parser stopped at the space.', 'I fixed the parser in the morning.'] },
  { id: 'c06', title: 'The thesis meeting', s: ['My supervisor read the draft.', 'He liked the method section.', 'The results section was too short.', 'It had only two figures.', 'He asked for a comparison table.', 'The meeting lasted forty minutes.'] },
  { id: 'c07', title: 'Morning in the lab', s: ['I arrived at eight.', 'The 3D printer was still running.', 'Someone had started a long print overnight.', 'The print had failed after two hours.', 'Filament was tangled around the nozzle.', 'I cleaned the nozzle before the first class.'] },
  { id: 'c08', title: 'The wiper motor test', s: ['The wiper motor draws high current.', 'The current spikes at startup.', 'The spike lasts about forty milliseconds.', 'My fuse was rated too low.', 'It blew on the first test.', 'I replaced it with a slow-blow fuse.'] },
  { id: 'c09', title: 'Reading on the bus', s: ['The bus ride takes forty minutes.', 'I used to scroll my phone.', 'Now I read a book.', 'The book is about writing.', 'I read about ten pages a day.', 'I finished the first chapter yesterday.'] },
  { id: 'c10', title: 'A failed upload', s: ['The upload failed at 60 percent.', 'The cable was loose.', 'I tried a different port.', 'The upload failed again.', 'The board was in the wrong boot mode.', 'I held the boot button and tried once more.'] }
];

const SITES = [
  ['Paul Graham essays (read, copy by hand, or rebuild from your notes)', 'https://paulgraham.com/articles.html'],
  ['Scribophile critique community', 'https://www.scribophile.com'],
  ["London Writers' Salon writing sprints (paid)", 'https://londonwriterssalon.com']
];

const KIND_LABEL = {
  phase1: 'Daily session', short: 'Short session', franklin1: 'Franklin rebuild, part 1', franklin2: 'Franklin rebuild, part 2',
  franklin3: 'Franklin rebuild (one sitting)', combining: 'Sentence combining', summary: '100-word summary',
  paragraph: 'Six-step paragraph', piece: 'Piece session', drill: 'Error drill',
  placement: 'Placement test', gatetest: 'Phase 0 gate test', grammar: 'Grammar session', imitation: 'Article session'
};

const CONFIDENCE = [
  ['Daily, spaced practice with feedback', 'High', 'Kellogg (2008), research on writing expertise'],
  ['Planning, revising, summarizing and sentence combining', 'High', 'Writing Next review (Graham and Perin, 2007)'],
  ['Reading improves writing', 'High', 'Graham et al. (2018) meta-analysis'],
  ["Franklin's rebuild method", 'Medium', "Franklin's own account; a strong historical example, not a controlled study"],
  ['AI drafting weakens unaided writing', 'Low to medium', 'One small, short study (54 students)'],
  ['"Fluency returns in 2-3 weeks" and the phase timings', 'Low', "Claude's estimates, not research findings"]
];
const TROUBLE = [
  ['You missed a few days', "Carry on from where you stopped. Don't try to catch up."],
  ['You missed two weeks', "Restart at the beginning of your current phase's daily session, not at Phase 0."],
  ['A gate feels impossible', 'Send Claude your last three pieces. The problem is usually one error type, and that becomes a drill.'],
  ['You want to use AI to "just fix it"', 'Write the sentence badly first, then ask Claude what is wrong, not for a corrected version.'],
  ['A phase takes much longer than its timing', 'That is fine. The gates decide when you move on, not the calendar.']
];

if (typeof module !== 'undefined') module.exports = { ERROR_TYPES, PLAN_ERRORS, PLACEMENT, AREAS, IMITATION_EXAMPLE, CONFIDENCE, TROUBLE, PHASES, GATE_TEXT, RULES_TABLE, REVISION_CHECKS, BOOKS, FORMS, TOPICS, COMBINING, SITES, KIND_LABEL };
