import {
  ErrorLogItem,
  FinishedPiece,
  FranklinSession,
  HabitAnchor,
  PhaseNumber,
  ReadingItem,
  WeeklyTrackerRow,
  WritingSession
} from '../types';
import { INITIAL_ERROR_LOG, READING_LIST_DATA } from '../data/models';

const STORAGE_KEYS = {
  HABIT_ANCHOR: 'unaided_habit_anchor_v1',
  CURRENT_PHASE: 'unaided_current_phase_v1',
  SESSIONS: 'unaided_sessions_v1',
  ERROR_LOG: 'unaided_error_log_v1',
  FRANKLIN_SESSIONS: 'unaided_franklin_v1',
  FINISHED_PIECES: 'unaided_finished_pieces_v1',
  READING_ITEMS: 'unaided_reading_items_v1',
  WEEKLY_TRACKER: 'unaided_weekly_tracker_v1',
  GATES: 'unaided_gates_v1',
};

export const DEFAULT_HABIT_ANCHOR: HabitAnchor = {
  routine: 'When I pour my morning coffee',
  place: 'at my clean desk without my phone',
  durationMinutes: 25,
  anchorSet: true
};

export const DEFAULT_WEEKLY_TRACKER: WeeklyTrackerRow[] = [
  { week: 1, sessionsDone: 4, wordsWritten: 640, mostCommonError: 'Missing article', gateProgress: 'Sprint fluency improving' },
  { week: 2, sessionsDone: 5, wordsWritten: 890, mostCommonError: 'Missing to before verb', gateProgress: '150 words in 15m reached' },
  { week: 3, sessionsDone: 3, wordsWritten: 520, mostCommonError: 'Sentence >20 words', gateProgress: 'Identifying recurrent errors' },
  { week: 4, sessionsDone: 0, wordsWritten: 0, mostCommonError: '—', gateProgress: 'In progress' }
];

export function getHabitAnchor(): HabitAnchor {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HABIT_ANCHOR);
    return raw ? JSON.parse(raw) : DEFAULT_HABIT_ANCHOR;
  } catch {
    return DEFAULT_HABIT_ANCHOR;
  }
}

export function saveHabitAnchor(anchor: HabitAnchor): void {
  try {
    localStorage.setItem(STORAGE_KEYS.HABIT_ANCHOR, JSON.stringify(anchor));
  } catch (e) {
    console.error('Failed to save habit anchor', e);
  }
}

export function getCurrentPhase(): PhaseNumber {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_PHASE);
    return raw ? (Number(raw) as PhaseNumber) : 1;
  } catch {
    return 1;
  }
}

export function saveCurrentPhase(phase: PhaseNumber): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CURRENT_PHASE, String(phase));
  } catch (e) {
    console.error('Failed to save current phase', e);
  }
}

export function getSessions(): WritingSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSessions(sessions: WritingSession[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  } catch (e) {
    console.error('Failed to save sessions', e);
  }
}

export function addSession(session: WritingSession): WritingSession[] {
  const current = getSessions();
  const updated = [session, ...current];
  saveSessions(updated);
  return updated;
}

export function getErrorLog(): ErrorLogItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ERROR_LOG);
    if (!raw) {
      saveErrorLog(INITIAL_ERROR_LOG);
      return INITIAL_ERROR_LOG;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_ERROR_LOG;
  }
}

export function saveErrorLog(items: ErrorLogItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ERROR_LOG, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save error log', e);
  }
}

export function addOrIncrementError(errorType: string, whatIWrote: string, correctForm: string, notes?: string): ErrorLogItem[] {
  const logs = getErrorLog();
  const existing = logs.find(
    (e) => e.errorType.toLowerCase() === errorType.toLowerCase() ||
           e.whatIWrote.toLowerCase() === whatIWrote.toLowerCase()
  );

  let updated: ErrorLogItem[];
  if (existing) {
    const newFreq = existing.frequency + 1;
    updated = logs.map((item) =>
      item.id === existing.id
        ? {
            ...item,
            frequency: newFreq,
            isDrillTarget: newFreq >= 3,
            notes: notes || item.notes
          }
        : item
    );
  } else {
    const newItem: ErrorLogItem = {
      id: 'err-' + Date.now(),
      errorType,
      whatIWrote,
      correctForm,
      dateAdded: new Date().toISOString().split('T')[0],
      frequency: 1,
      isDrillTarget: false,
      notes: notes || ''
    };
    updated = [newItem, ...logs];
  }

  saveErrorLog(updated);
  return updated;
}

export function getFranklinSessions(): FranklinSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FRANKLIN_SESSIONS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveFranklinSessions(sessions: FranklinSession[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.FRANKLIN_SESSIONS, JSON.stringify(sessions));
  } catch (e) {
    console.error('Failed to save Franklin sessions', e);
  }
}

export function getFinishedPieces(): FinishedPiece[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FINISHED_PIECES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveFinishedPieces(pieces: FinishedPiece[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.FINISHED_PIECES, JSON.stringify(pieces));
  } catch (e) {
    console.error('Failed to save pieces', e);
  }
}

export function getReadingItems(): ReadingItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.READING_ITEMS);
    if (!raw) {
      saveReadingItems(READING_LIST_DATA);
      return READING_LIST_DATA;
    }
    return JSON.parse(raw);
  } catch {
    return READING_LIST_DATA;
  }
}

export function saveReadingItems(items: ReadingItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.READING_ITEMS, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save reading items', e);
  }
}

export function getWeeklyTracker(): WeeklyTrackerRow[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.WEEKLY_TRACKER);
    return raw ? JSON.parse(raw) : DEFAULT_WEEKLY_TRACKER;
  } catch {
    return DEFAULT_WEEKLY_TRACKER;
  }
}

export function saveWeeklyTracker(rows: WeeklyTrackerRow[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.WEEKLY_TRACKER, JSON.stringify(rows));
  } catch (e) {
    console.error('Failed to save weekly tracker', e);
  }
}

export function getGateStatus(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.GATES);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function toggleGateStatus(gateKey: string): Record<string, boolean> {
  const current = getGateStatus();
  current[gateKey] = !current[gateKey];
  try {
    localStorage.setItem(STORAGE_KEYS.GATES, JSON.stringify(current));
  } catch (e) {
    console.error('Failed to save gate status', e);
  }
  return current;
}
