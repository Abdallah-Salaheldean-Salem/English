export type PhaseNumber = 1 | 2 | 3 | 4;

export interface HabitAnchor {
  routine: string; // e.g. "When I finish my morning coffee"
  place: string;   // e.g. "at my desk in the study"
  durationMinutes: number; // default 25
  anchorSet: boolean;
}

export interface GateRequirement {
  id: string;
  label: string;
  targetCount: number;
  currentCount: number;
  isCompleted: boolean;
  notes?: string;
}

export interface PhaseGate {
  phase: PhaseNumber;
  title: string;
  subtitle: string;
  timeframe: string;
  goal: string;
  rules: string[];
  requirements: GateRequirement[];
}

export interface ErrorLogItem {
  id: string;
  errorType: string;
  whatIWrote: string;
  correctForm: string;
  dateAdded: string;
  frequency: number;
  isDrillTarget: boolean; // active when frequency >= 3
  notes?: string;
}

export interface WritingSession {
  id: string;
  date: string;
  phase: PhaseNumber;
  drillType: 'phase1_daily' | 'franklin_notes' | 'franklin_rebuild' | 'sentence_combining' | 'summary_100w' | 'six_step_paragraph' | 'weekend_deep' | 'phase3_essay' | 'free_write';
  title: string;
  content: string;
  wordCount: number;
  durationMinutes: number;
  wordsPerMinute?: number;
  selfFoundErrorsCount: number;
  underlinedSnippets?: string[];
  aiErrorsFound?: DetectedError[];
  repairedText?: string;
  completed: boolean;
}

export interface DetectedError {
  type: string;
  snippet: string;
  sentence: string;
  ruleExplanation: string;
  hintQuestion: string;
}

export interface FranklinSession {
  id: string;
  date: string;
  modelTitle: string;
  originalText: string;
  sourceAuthor: string;
  sentenceNotes: string[];
  shuffled: boolean;
  shuffledNotesOrder?: number[];
  rebuiltText: string;
  differencesNoted: [string, string];
  step: 'notes' | 'rebuild' | 'compare';
  completed: boolean;
}

export interface SentenceCombiningPrompt {
  id: string;
  title: string;
  sourceSentences: string[];
  exampleApproach?: string;
}

export interface ReadingItem {
  phase: PhaseNumber;
  bookTitle: string;
  author: string;
  whyThisOne: string;
  minutesLogged: number;
  sessionsLogged: number;
  notes: string;
  completed: boolean;
}

export interface WeeklyTrackerRow {
  week: number;
  sessionsDone: number; // target 5
  wordsWritten: number;
  mostCommonError: string;
  gateProgress: string;
}

export interface ExternalCritique {
  id: string;
  pieceTitle: string;
  reviewerName: string; // e.g. "Scribophile Reader" or "London Writers' Salon"
  date: string;
  keyFeedback: string;
  revisionMade: string;
}

export interface FinishedPiece {
  id: string;
  title: string;
  phase: 3 | 4;
  form: 'essay' | 'short_story';
  targetWordCount: number;
  wordCount: number;
  content: string;
  draftStatus: 'draft' | 'under_critique' | 'revised' | 'published';
  publishedPlatform?: string;
  publishedUrl?: string;
  critiques: ExternalCritique[];
  dateCreated: string;
  datePublished?: string;
}
