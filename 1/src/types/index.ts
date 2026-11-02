/**
 * English Writing Recovery: Data Contracts
 * Corresponds to SPEC_ef24547e.md
 */

export type ThemeMode = 'monochrome' | 'amber' | 'editorial';

export interface AppState {
  startDate: string; // ISO date 'YYYY-MM-DD'
  phase: 1 | 2 | 3 | 4;
  phaseStarted: Record<number, string>; // { 1: '2026-11-01', ... }
  weekStart: 0 | 1; // 0 = Sunday, 1 = Monday
  restDays: number[]; // e.g. [5, 6] for Fri/Sat or [6, 0] for Sat/Sun
  anchorRoutine: string; // e.g. "After morning espresso, before opening email"
  anchorPlace: string; // e.g. "Standing desk, phone in kitchen"
  noDelete: boolean; // Enforce forward momentum (warn on backspace)
  pauseLimit: number; // Max pause in seconds before warning (default 60)
  reviewsPerWeek: number; // e.g. 1
  sound: boolean; // Subtle audio chime on step completion
  form: string; // Default piece form (e.g. "Analytical Essay", "Technical Memo")
  publishPlace: string; // Target publishing outlet (Substack, Personal Blog, GitHub)
  top3: string[]; // Top 3 error types frozen for Gate 2 evaluation
  books: Record<string, { read: boolean; notes: string }>;
  theme: ThemeMode;
  initialized: boolean;
  selectedPreset?: 'egypt' | 'standard' | 'custom';
}

export type SessionKind =
  | 'phase1'
  | 'short'
  | 'franklin1' // Step 1: Read & take brief notes
  | 'franklin2' // Step 2: Delayed reconstruction from notes
  | 'franklin3' // Step 3: Comparison against original
  | 'combining' // Sentence combining sets
  | 'summary'
  | 'paragraph'
  | 'piece'
  | 'drill';

export interface SprintTelemetry {
  words: number;
  maxPause: number; // longest pause between keypresses in seconds
  paused: number; // number of times pause threshold was exceeded
  interrupted: boolean;
  seconds: number;
}

export interface Mark {
  quote: string; // Exact verbatim substring from user text
  at?: number; // Character position
  type: string; // Category (e.g. "Subject-Verb Agreement", "Tense Shift")
  hint: string; // Instructive question/prompt WITHOUT giving away the answer
  by: 'gemini' | 'self' | 'manual';
  fixed: boolean;
  fix?: string; // Writer's corrected version
  tries: number;
  note?: string; // Grammar rule context
  errId?: string;
}

export interface Session {
  id: string;
  kind: SessionKind;
  phase: number;
  date: string; // 'YYYY-MM-DD'
  status: 'active' | 'done';
  startedAt: string;
  finishedAt?: string;
  step: number; // Current step in multi-step drill
  stepElapsed: number; // Seconds spent in current step
  seconds: number; // Total seconds
  words: number;
  data: {
    sprint?: SprintTelemetry;
    notes?: string;
    modelId?: string;
    targetWords?: number;
    prompt?: string;
    draftText?: string;
    combiningSetId?: string;
  };
  marks: Mark[];
  reviewed: boolean;
  reviewedAt?: string;
  reviewMode?: 'gemini' | 'self';
}

export interface PiecePlan {
  point: string; // One single controlling idea
  reader: string; // Intended specific audience
  notes: string; // Key structural outline points
}

export interface Piece {
  id: string;
  phase: number;
  form: string;
  title: string;
  status: 'plan' | 'draft' | 'revise' | 'feedback' | 'revise2' | 'publish' | 'done';
  createdAt: string;
  finishedAt?: string;
  plan: PiecePlan;
  text: string;
  versions: Array<{ text: string; date: string; label: string }>;
  checks: Record<string, boolean>; // e.g. { clarity: true, rhythm: true, top3Checked: true }
  feedback: Array<{ by: string; notes: string; date: string }>;
  postedUrl?: string;
  publishedUrl?: string;
  words: number;
  marks: Mark[];
  reviewed: boolean;
  reviewedAt?: string;
}

export interface ErrorItem {
  id: string;
  type: string;
  wrote: string; // Exact wrong wording
  correct: string; // Corrected form once resolved by user
  by: 'self' | 'claude' | 'gemini' | 'plan' | 'manual';
  date: string;
  dates: string[]; // Dates of re-occurrence; length is occurrence count
}

export interface ModelPassage {
  id: string;
  author: string;
  title: string;
  year?: string;
  source: string;
  text: string;
  notes: string;
  wordCount: number;
  tags: string[];
}

export interface CombiningExercise {
  id: string;
  title: string;
  category: string;
  instruction: string;
  sourceSentences: string[];
  sampleSolution?: string;
  notes?: string;
}
