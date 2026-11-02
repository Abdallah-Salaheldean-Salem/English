import { AppState, ErrorItem, Piece, Session, SessionKind } from '../types';

/**
 * Standard word count function
 */
export function countWords(text: string): number {
  if (!text) return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * Formats a Date object as 'YYYY-MM-DD'
 */
export function formatIsoDate(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Split text into individual sentences
 */
export function splitSentences(text: string): string[] {
  if (!text) return [];
  // Basic sentence tokenizer respecting common abbreviation heuristics
  return text
    .replace(/([.?!])\s*(?=[A-Z])/g, '$1|')
    .split('|')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/**
 * Checks if a given date string is a scheduled rest day for the user
 */
export function isRestDay(dateStr: string, appState: AppState): boolean {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  return appState.restDays.includes(dayOfWeek);
}

/**
 * Calculates current consecutive practice day streak
 */
export function calculateStreak(sessions: Session[], appState: AppState): { current: number; best: number } {
  const completedDates = new Set(
    sessions
      .filter(s => s.status === 'done')
      .map(s => s.date)
  );

  if (completedDates.size === 0) return { current: 0, best: 0 };

  const todayStr = formatIsoDate();
  const [y, m, d] = todayStr.split('-').map(Number);
  let checkDate = new Date(y, m - 1, d);

  let currentStreak = 0;
  let datePointer = new Date(checkDate);

  // If today isn't done yet, allow yesterday as the streak anchor
  const todayDone = completedDates.has(formatIsoDate(datePointer));
  if (!todayDone) {
    datePointer.setDate(datePointer.getDate() - 1);
  }

  while (true) {
    const formatted = formatIsoDate(datePointer);
    const dayOfWeek = datePointer.getDay();
    const isRest = appState.restDays.includes(dayOfWeek);

    if (completedDates.has(formatted)) {
      currentStreak++;
      datePointer.setDate(datePointer.getDate() - 1);
    } else if (isRest) {
      // Rest days preserve streak without counting as a miss
      datePointer.setDate(datePointer.getDate() - 1);
    } else {
      break;
    }
  }

  // Calculate best historic streak
  let best = currentStreak;
  // Compute across sorted unique dates
  const sortedDates = Array.from(completedDates).sort();
  let tempStreak = 0;
  let prevDate: Date | null = null;

  for (const dateStr of sortedDates) {
    const [cy, cm, cd] = dateStr.split('-').map(Number);
    const curr = new Date(cy, cm - 1, cd);

    if (!prevDate) {
      tempStreak = 1;
    } else {
      const diffDays = Math.round((curr.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        tempStreak++;
      } else if (diffDays > 1) {
        // Check if intervening days were all rest days
        let allRest = true;
        const testD = new Date(prevDate);
        testD.setDate(testD.getDate() + 1);
        while (testD < curr) {
          if (!appState.restDays.includes(testD.getDay())) {
            allRest = false;
            break;
          }
          testD.setDate(testD.getDate() + 1);
        }
        if (allRest) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      }
    }
    prevDate = curr;
    if (tempStreak > best) best = tempStreak;
  }

  return { current: currentStreak, best };
}

/**
 * Determine the next scheduled practice action based on Phase rules and ordered queue
 * Decision #1: Drills are an ordered queue, not fixed weekdays.
 * A Franklin rebuild waits at least one calendar day after the notes step.
 */
export function getNextAction(appState: AppState, sessions: Session[], pieces: Piece[]): {
  kind: SessionKind;
  phase: number;
  title: string;
  description: string;
  estimatedMinutes: number;
  modelId?: string;
  ready: boolean;
  blockedReason?: string;
} {
  const todayStr = formatIsoDate();
  const phase = appState.phase;

  // Phase 1: Rapid Timed Writing Fluency Sprints (10-15 minutes)
  if (phase === 1) {
    const todaySessions = sessions.filter(s => s.date === todayStr && s.phase === 1 && s.status === 'done');
    return {
      kind: 'phase1',
      phase: 1,
      title: todaySessions.length > 0 ? 'Optional Extra Fluency Sprint' : "Daily Fluency Sprint",
      description: '10–15 minutes continuous rapid writing without stopping or deleting. Focus on continuous forward cadence.',
      estimatedMinutes: 15,
      ready: true,
    };
  }

  // Phase 2: Ordered drill queue of Franklin exercises, Sentence Combining, and Short Pieces
  if (phase === 2) {
    // Check if there is an active/unreconstructed Franklin notes session waiting for rebuild
    const notesSessions = sessions.filter(s => s.kind === 'franklin1' && s.status === 'done');
    const rebuildSessions = sessions.filter(s => s.kind === 'franklin2' && s.status === 'done');

    // Find any note session that does not have a matching rebuild
    const unreconstructed = notesSessions.find(note => {
      return !rebuildSessions.some(reb => reb.data?.modelId === note.data?.modelId && reb.date >= note.date);
    });

    if (unreconstructed) {
      // Must wait at least one calendar day
      if (unreconstructed.date < todayStr) {
        return {
          kind: 'franklin2',
          phase: 2,
          title: 'Franklin Drill: Delayed Reconstruction',
          description: `Reconstruct the passage from your notes taken on ${unreconstructed.date} without looking at the original book.`,
          estimatedMinutes: 20,
          modelId: unreconstructed.data?.modelId,
          ready: true,
        };
      } else {
        // Today is note day, rebuild is locked until tomorrow
        return {
          kind: 'combining',
          phase: 2,
          title: 'Sentence Combining Drill',
          description: 'Rebuild is waiting for tomorrow. Sharpen coordination and subordination syntax.',
          estimatedMinutes: 15,
          ready: true,
        };
      }
    }

    // Determine alternating queue: Franklin Note -> Combining -> Piece Draft/Revise
    const lastDone = sessions.filter(s => s.status === 'done').pop();
    if (!lastDone || lastDone.kind === 'combining' || lastDone.kind === 'franklin2') {
      return {
        kind: 'franklin1',
        phase: 2,
        title: 'Franklin Drill: Study & Note Taking',
        description: 'Read a master passage, analyze sentence structures, and write short hints of the sentiment.',
        estimatedMinutes: 15,
        ready: true,
      };
    }

    return {
      kind: 'combining',
      phase: 2,
      title: 'Sentence Combining Drill',
      description: 'Synthesize multiple short observations into singular, balanced, and rhythmic sentences.',
      estimatedMinutes: 15,
      ready: true,
    };
  }

  // Phase 3: Franklin 1-sitting drill (8/12/5 min) or 3-day Piece workflow
  if (phase === 3) {
    const activePiece = pieces.find(p => p.phase >= 3 && p.status !== 'done');
    if (activePiece) {
      return {
        kind: 'piece',
        phase: 3,
        title: `Work on Piece: "${activePiece.title || 'Untitled'}" (${activePiece.status.toUpperCase()})`,
        description: `Execute current stage: ${activePiece.status}. Follow the 3-day deliberate revision protocol.`,
        estimatedMinutes: 25,
        ready: true,
      };
    }

    return {
      kind: 'franklin3',
      phase: 3,
      title: 'Phase 3 Franklin Sprint (One Sitting)',
      description: 'Single sitting drill: 8 min read/hints, 12 min blind reconstruction, 5 min original comparison.',
      estimatedMinutes: 25,
      ready: true,
    };
  }

  // Phase 4: Publishing & Mastery
  return {
    kind: 'piece',
    phase: 4,
    title: 'Phase 4: Publication & Reader Outreach',
    description: 'Publish your polished piece to your public outlet and log peer feedback.',
    estimatedMinutes: 30,
    ready: true,
  };
}

/**
 * Gate progression evaluator
 */
export function evaluateGates(appState: AppState, sessions: Session[], errors: ErrorItem[], pieces: Piece[]) {
  // Gate 1: 14 consecutive completed sprint days in Phase 1, minimum 4 distinct error types identified with count >= 2
  const phase1Sessions = sessions.filter(s => s.phase === 1 && s.status === 'done');
  const streak = calculateStreak(phase1Sessions, appState);
  
  // Errors with >= 2 occurrences
  const recurringErrors = errors.filter(e => e.dates.length >= 2);
  const distinctRecurringTypes = new Set(recurringErrors.map(e => e.type));

  const gate1DaysMet = streak.current >= 14 || streak.best >= 14;
  const gate1ErrorsMet = distinctRecurringTypes.size >= 4;
  const gate1Ready = gate1DaysMet && gate1ErrorsMet;

  // Gate 2: Error rate < 2% measured on most recent 900+ words marked in Phase 2, per type, against top 3
  const phase2ReviewedSessions = sessions.filter(s => s.phase === 2 && s.reviewed && s.words > 0);
  let recentWords = 0;
  let top3ErrorCount = 0;
  const top3Set = new Set(appState.top3);

  for (let i = phase2ReviewedSessions.length - 1; i >= 0; i--) {
    const s = phase2ReviewedSessions[i];
    recentWords += s.words;
    for (const m of s.marks) {
      if (top3Set.has(m.type)) {
        top3ErrorCount++;
      }
    }
    if (recentWords >= 900) break;
  }

  const gate2ErrorRate = recentWords > 0 ? (top3ErrorCount / recentWords) * 100 : 0;
  const gate2WordsMet = recentWords >= 900;
  const gate2RateMet = recentWords >= 900 && gate2ErrorRate <= 2.0;
  const gate2Ready = gate2WordsMet && gate2RateMet;

  // Gate 3: 4 completed pieces with feedback & revisions
  const phase3CompletedPieces = pieces.filter(p => p.phase >= 3 && (p.status === 'done' || p.status === 'publish'));
  const gate3Ready = phase3CompletedPieces.length >= 4;

  // Gate 4: Published pieces count
  const publishedPieces = pieces.filter(p => !!p.publishedUrl || p.status === 'done');
  const gate4Ready = publishedPieces.length >= 3;

  return {
    gate1: {
      ready: gate1Ready,
      streakMet: gate1DaysMet,
      streakCurrent: streak.current,
      streakTarget: 14,
      errorsMet: gate1ErrorsMet,
      errorsCount: distinctRecurringTypes.size,
      errorsTarget: 4,
    },
    gate2: {
      ready: gate2Ready,
      wordsCount: recentWords,
      wordsTarget: 900,
      wordsMet: gate2WordsMet,
      errorRate: gate2ErrorRate,
      errorRateTarget: 2.0,
      rateMet: gate2RateMet,
      top3: appState.top3,
    },
    gate3: {
      ready: gate3Ready,
      completedPieces: phase3CompletedPieces.length,
      targetPieces: 4,
    },
    gate4: {
      ready: gate4Ready,
      publishedCount: publishedPieces.length,
      target: 3,
    }
  };
}

/**
 * Generate copyable markdown review prompt for Guided Self-Check (or external Claude/LLM review)
 */
export function generateSelfReviewPrompt(text: string, appState: AppState): string {
  return `You are a strict, constructive English writing editor reviewing this draft according to the English Writing Recovery Plan rules.

Draft Text:
"""
${text}
"""

Target errors I am currently focused on eliminating:
${appState.top3.length > 0 ? appState.top3.map(e => `- ${e}`).join('\n') : '- General grammar, tense consistency, and subject-verb agreement'}

Instructions:
1. Identify any grammatical errors, unnatural phrasing, punctuation errors, or awkward syntax.
2. For each error:
   - Quote the EXACT substring from my text that contains the error.
   - Name the error type (e.g. Subject-Verb Agreement, Article Choice, Run-on, Tense Shift).
   - Give me a HINT or diagnostic question to guide my repair, BUT DO NOT TELL ME THE REPLACEMENT WORDS OR PROVIDE THE CORRECTED SENTENCE.
3. Conclude with 2 sentences evaluating my sentence rhythm, cadence, and clarity.`;
}
