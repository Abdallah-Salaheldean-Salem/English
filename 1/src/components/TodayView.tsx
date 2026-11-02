import { Flame, Play, Clock, CheckCircle2, Coffee, ShieldAlert, ArrowRight, RefreshCw, Calendar } from 'lucide-react';
import { AppState, Session, Piece, ErrorItem } from '../types';
import { calculateStreak, evaluateGates, formatIsoDate, getNextAction, isRestDay } from '../lib/logic';

interface TodayViewProps {
  appState: AppState;
  sessions: Session[];
  pieces: Piece[];
  errors: ErrorItem[];
  onStartSession: (actionKind: string, modelId?: string) => void;
  onNavigate: (view: any) => void;
  onOpenSetup: () => void;
}

export function TodayView({
  appState,
  sessions,
  pieces,
  errors,
  onStartSession,
  onNavigate,
  onOpenSetup,
}: TodayViewProps) {
  const todayStr = formatIsoDate();
  const todayRest = isRestDay(todayStr, appState);
  const streak = calculateStreak(sessions, appState);
  const nextAction = getNextAction(appState, sessions, pieces);
  const gates = evaluateGates(appState, sessions, errors, pieces);

  const todaySessions = sessions.filter(s => s.date === todayStr);
  const totalTodayWords = todaySessions.reduce((acc, s) => acc + (s.words || 0), 0);
  const isTodayComplete = todaySessions.some(s => s.status === 'done');

  // Days in current phase
  const phaseStartDate = appState.phaseStarted[appState.phase] || appState.startDate;
  const daysInPhase = Math.max(
    1,
    Math.round((new Date(todayStr).getTime() - new Date(phaseStartDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
  );

  const phaseTitles: Record<number, { title: string; subtitle: string }> = {
    1: { title: 'Phase 1: Writing Fluency', subtitle: 'Rapid daily timed sprints without stopping or editing.' },
    2: { title: 'Phase 2: Sentence Control', subtitle: 'Franklin method reconstructions and sentence combining drills.' },
    3: { title: 'Phase 3: Rhythm & Expansion', subtitle: 'One-sitting Franklin sprints and 3-day essay drafting protocols.' },
    4: { title: 'Phase 4: Publication & Mastery', subtitle: 'Polished public releases and rigorous reader critiques.' },
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Top Welcome & Streak Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--border-subtle)]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-muted)] uppercase tracking-wider mb-1">
            <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</span>
            <span>·</span>
            <span>{todayRest ? 'Scheduled Rest Day' : 'Practice Day'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-main)] font-editorial-sans tracking-tight">
            Today's Practice Session
          </h1>
        </div>

        {/* Practice Streak Card */}
        <div className="flex items-center gap-4 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-4 py-2.5 rounded-lg">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-500 fill-amber-500/20" />
            <div>
              <div className="text-xs text-[var(--text-muted)] font-medium">Daily Streak</div>
              <div className="text-lg font-bold text-[var(--text-main)] font-mono tabular-nums leading-none">
                {streak.current} <span className="text-xs font-normal text-[var(--text-subtle)]">days</span>
              </div>
            </div>
          </div>
          <div className="h-7 w-[1px] bg-[var(--border-subtle)]" />
          <div>
            <div className="text-xs text-[var(--text-muted)] font-medium">Best</div>
            <div className="text-sm font-semibold text-[var(--text-main)] font-mono tabular-nums leading-none">
              {streak.best} d
            </div>
          </div>
        </div>
      </div>

      {/* Routine Anchor Alert */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
        <Coffee className="w-5 h-5 text-[var(--text-muted)] shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm text-[var(--text-main)] leading-relaxed">
          <span className="font-semibold">Anchor Routine: </span>
          <span>{appState.anchorRoutine}</span>
          <span className="text-[var(--text-muted)]"> ({appState.anchorPlace})</span>
        </div>
        <button
          type="button"
          onClick={onOpenSetup}
          className="ml-auto text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] underline shrink-0"
        >
          Adjust
        </button>
      </div>

      {/* Primary Action Card */}
      <div className="p-6 sm:p-8 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase px-2.5 py-0.5 rounded bg-[var(--tag-bg)] text-[var(--text-muted)]">
              Phase {nextAction.phase} Queue
            </span>
            <span className="text-xs text-[var(--text-muted)] flex items-center gap-1 font-mono">
              <Clock className="w-3.5 h-3.5" /> {nextAction.estimatedMinutes} mins
            </span>
          </div>

          {todayRest && (
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
              Today is a rest day, but you can still run an optional sprint.
            </span>
          )}
        </div>

        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-main)] font-editorial-sans mb-2">
            {nextAction.title}
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-muted)] leading-relaxed font-editorial-serif max-w-2xl">
            {nextAction.description}
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <button
            type="button"
            onClick={() => onStartSession(nextAction.kind, nextAction.modelId)}
            className="px-6 py-3.5 rounded-lg bg-[var(--accent)] text-[var(--accent-text)] font-semibold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{isTodayComplete ? 'Start Another Session' : 'Begin Focus Drill Now'}</span>
          </button>

          {isTodayComplete && (
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Today's primary goal already completed ({totalTodayWords} words written)</span>
            </div>
          )}
        </div>
      </div>

      {/* Grid: Current Phase Status & Gate Progression */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Phase Details */}
        <div className="p-5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-mono uppercase text-[var(--text-muted)]">Current Phase</div>
            <div className="text-xs font-mono text-[var(--text-subtle)]">Day {daysInPhase}</div>
          </div>
          <div className="font-bold text-base text-[var(--text-main)]">
            {phaseTitles[appState.phase]?.title}
          </div>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            {phaseTitles[appState.phase]?.subtitle}
          </p>
          <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>Pause limit: {appState.pauseLimit}s</span>
            <span>No-delete: {appState.noDelete ? 'Active' : 'Off'}</span>
          </div>
        </div>

        {/* Gate Status Card */}
        <div className="p-5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-mono uppercase text-[var(--text-muted)]">Next Gate Readiness</div>
            <button
              type="button"
              onClick={() => onNavigate('progress')}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center gap-1"
            >
              <span>Full Details</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {appState.phase === 1 ? (
            <div className="space-y-2 text-xs">
              <div className="font-semibold text-[var(--text-main)]">Gate 1 Requirements:</div>
              <div className="flex items-center justify-between text-[var(--text-muted)]">
                <span>14 Consecutive Sprint Days</span>
                <span className="font-mono font-medium text-[var(--text-main)]">
                  {gates.gate1.streakCurrent} / 14 d {gates.gate1.streakMet ? '✓' : ''}
                </span>
              </div>
              <div className="flex items-center justify-between text-[var(--text-muted)]">
                <span>4 Distinct Errors (count ≥ 2)</span>
                <span className="font-mono font-medium text-[var(--text-main)]">
                  {gates.gate1.errorsCount} / 4 types {gates.gate1.errorsMet ? '✓' : ''}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-xs">
              <div className="font-semibold text-[var(--text-main)]">Gate 2 Requirements:</div>
              <div className="flex items-center justify-between text-[var(--text-muted)]">
                <span>900+ Reviewed Words in Phase 2</span>
                <span className="font-mono font-medium text-[var(--text-main)]">
                  {gates.gate2.wordsCount} / 900 w
                </span>
              </div>
              <div className="flex items-center justify-between text-[var(--text-muted)]">
                <span>Top-3 Error Rate &lt; 2.0%</span>
                <span className="font-mono font-medium text-[var(--text-main)]">
                  {gates.gate2.errorRate.toFixed(1)}% {gates.gate2.rateMet ? '✓' : ''}
                </span>
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-[var(--border-subtle)]">
            <div className="text-[11px] text-[var(--text-subtle)] font-mono">
              Target errors: {appState.top3.join(', ')}
            </div>
          </div>
        </div>
      </div>

      {/* Today's Completed Sessions list */}
      {todaySessions.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs font-mono uppercase text-[var(--text-muted)] tracking-wider">
            Completed Today ({todaySessions.length})
          </div>
          <div className="space-y-2">
            {todaySessions.map(sess => (
              <div
                key={sess.id}
                className="p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-between gap-4 text-xs"
              >
                <div>
                  <div className="font-semibold text-[var(--text-main)] capitalize">
                    {sess.kind} Drill · {sess.words} words
                  </div>
                  <div className="text-[var(--text-muted)] mt-0.5">
                    Duration: {Math.round(sess.seconds / 60)} min · Pauses: {sess.data.sprint?.paused || 0}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {sess.reviewed ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">Reviewed ({sess.marks.length} marks)</span>
                  ) : (
                    <span className="text-[var(--text-muted)]">Unreviewed</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
