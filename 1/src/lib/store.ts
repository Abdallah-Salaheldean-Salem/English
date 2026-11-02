import { AppState, ErrorItem, ModelPassage, Piece, Session, ThemeMode } from '../types';
import { formatIsoDate } from './logic';

const STORAGE_KEY = 'english_writing_recovery_data_v2';

export interface StorageData {
  appState: AppState;
  sessions: Session[];
  pieces: Piece[];
  errors: ErrorItem[];
  customModels: ModelPassage[];
}

const DEFAULT_STATE: AppState = {
  startDate: formatIsoDate(),
  phase: 1,
  phaseStarted: { 1: formatIsoDate() },
  weekStart: 0, // Sunday default
  restDays: [5, 6], // Egypt weekend: Friday (5) & Saturday (6)
  anchorRoutine: 'After morning coffee, before opening browser or checking messages',
  anchorPlace: 'Quiet writing desk with phone in another room',
  noDelete: true,
  pauseLimit: 60, // 60 seconds without stopping
  reviewsPerWeek: 1,
  sound: true,
  form: 'Reflective Essay & Technical Analysis',
  publishPlace: 'Substack / Personal Publication',
  top3: ['Subject-Verb Agreement', 'Tense Shift', 'Missing / Misused Article'],
  books: {
    'strunk-white': { read: true, notes: 'Omit needless words. Keep related words together.' },
    'williams-style': { read: false, notes: 'Focus on actions in verbs and characters as subjects.' },
  },
  theme: 'monochrome',
  initialized: false, // Triggers choice between Egypt, Standard, and Custom on first load
};

// Seed sample data to illustrate error tracking and previous sessions
const SEED_ERRORS: ErrorItem[] = [
  {
    id: 'err-sva-1',
    type: 'Subject-Verb Agreement',
    wrote: 'The complexity of multiple interacting components were underestimated.',
    correct: 'The complexity of multiple interacting components was underestimated.',
    by: 'gemini',
    date: formatIsoDate(new Date(Date.now() - 3 * 86400000)),
    dates: [
      formatIsoDate(new Date(Date.now() - 3 * 86400000)),
      formatIsoDate(new Date(Date.now() - 1 * 86400000)),
    ],
  },
  {
    id: 'err-tense-1',
    type: 'Tense Shift',
    wrote: 'The author opens with a bold hypothesis and then argued the inverse.',
    correct: 'The author opens with a bold hypothesis and then argues the inverse.',
    by: 'gemini',
    date: formatIsoDate(new Date(Date.now() - 2 * 86400000)),
    dates: [formatIsoDate(new Date(Date.now() - 2 * 86400000))],
  },
  {
    id: 'err-article-1',
    type: 'Missing / Misused Article',
    wrote: 'We deployed system to production without monitoring.',
    correct: 'We deployed the system to production without monitoring.',
    by: 'self',
    date: formatIsoDate(new Date(Date.now() - 4 * 86400000)),
    dates: [
      formatIsoDate(new Date(Date.now() - 4 * 86400000)),
      formatIsoDate(new Date(Date.now() - 2 * 86400000)),
    ],
  },
  {
    id: 'err-modifier-1',
    type: 'Dangling / Misplaced Modifier',
    wrote: 'Having finished the experiment, the data appeared conclusive.',
    correct: 'Having finished the experiment, the researchers found the data conclusive.',
    by: 'plan',
    date: formatIsoDate(new Date(Date.now() - 5 * 86400000)),
    dates: [
      formatIsoDate(new Date(Date.now() - 5 * 86400000)),
      formatIsoDate(new Date(Date.now() - 1 * 86400000)),
    ],
  },
];

class AppStore {
  private data: StorageData;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.data = this.loadFromStorage();
    this.applyTheme(this.data.appState.theme);
  }

  private loadFromStorage(): StorageData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          appState: { ...DEFAULT_STATE, ...(parsed.appState || {}) },
          sessions: parsed.sessions || [],
          pieces: parsed.pieces || [],
          errors: parsed.errors || SEED_ERRORS,
          customModels: parsed.customModels || [],
        };
      }
    } catch (e) {
      console.error('Failed to load storage data:', e);
    }
    return {
      appState: { ...DEFAULT_STATE },
      sessions: [],
      pieces: [],
      errors: SEED_ERRORS,
      customModels: [],
    };
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('Failed to persist storage data:', e);
    }
    this.notify();
  }

  private notify() {
    this.listeners.forEach(fn => fn());
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getSnapshot(): StorageData {
    return this.data;
  }

  public applyTheme(theme: ThemeMode) {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'amber') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'monochrome') {
      // Keep in clean light monochrome or respect dark class
      document.documentElement.classList.remove('dark');
    } else if (theme === 'editorial') {
      document.documentElement.classList.remove('dark');
    }
  }

  public setTheme(theme: ThemeMode) {
    this.data.appState.theme = theme;
    this.applyTheme(theme);
    this.persist();
  }

  public toggleTheme() {
    // Cycles smoothly between monochrome, amber, and editorial
    const current = this.data.appState.theme;
    const next: ThemeMode = current === 'monochrome' ? 'amber' : current === 'amber' ? 'editorial' : 'monochrome';
    this.setTheme(next);
  }

  public initializePreset(preset: 'egypt' | 'standard' | 'custom', customOptions?: Partial<AppState>) {
    const today = formatIsoDate();
    let updates: Partial<AppState> = {
      initialized: true,
      selectedPreset: preset,
      startDate: today,
      phaseStarted: { 1: today },
    };

    if (preset === 'egypt') {
      updates = {
        ...updates,
        phase: 1,
        weekStart: 0, // Sunday
        restDays: [5, 6], // Friday & Saturday
      };
    } else if (preset === 'standard') {
      updates = {
        ...updates,
        phase: 1,
        weekStart: 1, // Monday
        restDays: [6, 0], // Saturday & Sunday
      };
    } else if (preset === 'custom' && customOptions) {
      updates = {
        ...updates,
        ...customOptions,
      };
    }

    this.data.appState = {
      ...this.data.appState,
      ...updates,
    };
    this.persist();
  }

  public updateAppState(updates: Partial<AppState>) {
    this.data.appState = {
      ...this.data.appState,
      ...updates,
    };
    if (updates.theme) {
      this.applyTheme(updates.theme);
    }
    this.persist();
  }

  public saveSession(session: Session) {
    const index = this.data.sessions.findIndex(s => s.id === session.id);
    if (index >= 0) {
      this.data.sessions[index] = session;
    } else {
      this.data.sessions.push(session);
    }
    this.persist();
  }

  public deleteSession(id: string) {
    this.data.sessions = this.data.sessions.filter(s => s.id !== id);
    this.persist();
  }

  public savePiece(piece: Piece) {
    const index = this.data.pieces.findIndex(p => p.id === piece.id);
    if (index >= 0) {
      this.data.pieces[index] = piece;
    } else {
      this.data.pieces.unshift(piece);
    }
    this.persist();
  }

  public deletePiece(id: string) {
    this.data.pieces = this.data.pieces.filter(p => p.id !== id);
    this.persist();
  }

  public recordError(type: string, wrote: string, correct: string, by: 'self' | 'claude' | 'gemini' | 'plan' | 'manual') {
    const today = formatIsoDate();
    const existing = this.data.errors.find(
      e => e.type.toLowerCase() === type.toLowerCase() && e.wrote.trim().toLowerCase() === wrote.trim().toLowerCase()
    );

    if (existing) {
      if (!existing.dates.includes(today)) {
        existing.dates.push(today);
      }
      if (correct) existing.correct = correct;
    } else {
      const newErr: ErrorItem = {
        id: `err-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type,
        wrote,
        correct: correct || '',
        by,
        date: today,
        dates: [today],
      };
      this.data.errors.unshift(newErr);
    }
    this.persist();
  }

  public updateError(err: ErrorItem) {
    const idx = this.data.errors.findIndex(e => e.id === err.id);
    if (idx >= 0) {
      this.data.errors[idx] = err;
      this.persist();
    }
  }

  public deleteError(id: string) {
    this.data.errors = this.data.errors.filter(e => e.id !== id);
    this.persist();
  }

  public addCustomModel(model: ModelPassage) {
    this.data.customModels.unshift(model);
    this.persist();
  }

  public deleteCustomModel(id: string) {
    this.data.customModels = this.data.customModels.filter(m => m.id !== id);
    this.persist();
  }

  public exportBackup(): string {
    return JSON.stringify(this.data, null, 2);
  }

  public importBackup(jsonStr: string): boolean {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.appState && Array.isArray(parsed.sessions)) {
        this.data = {
          appState: { ...DEFAULT_STATE, ...parsed.appState, initialized: true },
          sessions: parsed.sessions,
          pieces: parsed.pieces || [],
          errors: parsed.errors || [],
          customModels: parsed.customModels || [],
        };
        this.applyTheme(this.data.appState.theme);
        this.persist();
        return true;
      }
    } catch (e) {
      console.error('Import failed:', e);
    }
    return false;
  }

  public resetAll() {
    this.data = {
      appState: { ...DEFAULT_STATE, initialized: false },
      sessions: [],
      pieces: [],
      errors: SEED_ERRORS,
      customModels: [],
    };
    this.applyTheme('monochrome');
    this.persist();
  }
}

export const store = new AppStore();
