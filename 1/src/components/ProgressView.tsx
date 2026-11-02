import { CheckCircle2, Circle, Trophy, Award, TrendingUp, Clock, FileText, AlertCircle } from 'lucide-react';
import { AppState, ErrorItem, Piece, Session } from '../types';
import { calculateStreak, evaluateGates } from '../lib/logic';

interface ProgressViewProps {
  appState: AppState;
  sessions: Session[];
  errors: ErrorItem[];
  pieces: Piece[];
  onAdvancePhase: (nextPhase: 1 | 2 | 3 | 4) => void;
}

export function ProgressView({ appState, sessions, errors, pieces, onAdvancePhase }: ProgressViewProps) {
  const gates = evaluateGates(appState, sessions, errors, pieces);
  const streak = calculateStreak(sessions, appState);

  // Cumulative metrics
  const totalWords = sessions.reduce((acc, s) => acc + (s.words || 0), 0);
  const totalSeconds = sessions.reduce((acc, s) => acc + (s.seconds || 0), 0);
  const totalMinutes = Math.round(totalSeconds / 60);
  const totalPauses = sessions.reduce((acc, s) => acc + (s.data.sprint?.paused || 0), 0);

  // Completed sessions sorted descending
  const recentSessions = [...sessions].reverse().slice(0, 15);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="pb-6 border-b border-[var(--border-subtle)]">
        <div className="text-xs font-mono uppercase text-[var(--text-muted)] mb-1">
          Deliberate Practice Metrics
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-main)] font-editorial-sans tracking-tight">
          Recovery Progress & Gate Progression
        </h1>
        <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
          Objective evaluation gates prevent rushing into complex writing before foundational fluency and sentence control are solidified.
        </p>
      </div>

      {/* Aggregate KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-1">
            <FileText className="w-4 h-4" />
            <span>Total Words Written</span>
          </div>
          <div className="text-2xl font-bold text-[var(--text-main)] font-mono tabular-nums">
            {totalWords.toLocaleString()}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-1">
            <Clock className="w-4 h-4" />
            <span>Practice Time</span>
          </div>
          <div className="text-2xl font-bold text-[var(--text-main)] font-mono tabular-nums">
            {totalMinutes} <span className="text-xs font-normal text-[var(--text-muted)]">mins</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-1">
            <TrendingUp className="w-4 h-4" />
            <span>Active Streak</span>
          </div>
          <div className="text-2xl font-bold text-[var(--text-main)] font-mono tabular-nums">
            {streak.current} <span className="text-xs font-normal text-[var(--text-muted)]">days</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-1">
            <AlertCircle className="w-4 h-4" />
            <span>Errors Logged</span>
          </div>
          <div className="text-2xl font-bold text-[var(--text-main)] font-mono tabular-nums">
            {errors.length}
          </div>
        </div>
      </div>

      {/* Gates Progression Checklist */}
      <div className="space-y-4">
        <div className="text-xs font-mono uppercase text-[var(--text-muted)] tracking-wider">
          Plan Gates & Progression Status
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Gate 1 Card */}
          <div className={`p-6 rounded-xl border transition-all ${
            gates.gate1.ready
              ? 'border-emerald-500/40 bg-emerald-500/5'
              : 'border-[var(--border-subtle)] bg-[var(--bg-surface)]'
          }`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <span className="text-xs font-mono uppercase text-[var(--text-muted)]">Phase 1 Exit</span>
                <h3 className="font-bold text-base text-[var(--text-main)]">
                  Gate 1: Fluency & Error Identification
                </h3>
              </div>
              {gates.gate1.ready ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Circle className="w-5 h-5 text-[var(--text-subtle)]" />
              )}
            </div>

            <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-4">
              Requires 14 consecutive completed sprint days and at least 4 distinct recurring error types identified.
            </p>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-[var(--text-main)]">
                <span>14 Consecutive Sprint Days:</span>
                <span className="font-mono tabular-nums font-semibold">
                  {gates.gate1.streakCurrent} / 14 {gates.gate1.streakMet ? '✓' : ''}
                </span>
              </div>
              <div className="w-full bg-[var(--bg-elevated)] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, (gates.gate1.streakCurrent / 14) * 100)}%` }}
                />
              </div>

              <div className="flex justify-between text-[var(--text-main)] pt-2">
                <span>4 Distinct Errors (count ≥ 2):</span>
                <span className="font-mono tabular-nums font-semibold">
                  {gates.gate1.errorsCount} / 4 {gates.gate1.errorsMet ? '✓' : ''}
                </span>
              </div>
              <div className="w-full bg-[var(--bg-elevated)] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, (gates.gate1.errorsCount / 4) * 100)}%` }}
                />
              </div>
            </div>

            {appState.phase === 1 && gates.gate1.ready && (
              <div className="mt-4 pt-3 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => onAdvancePhase(2)}
                  className="w-full py-2 rounded-lg bg-[var(--accent)] text-[var(--accent-text)] text-xs font-semibold hover:opacity-90 flex items-center justify-center gap-1.5"
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>Advance to Phase 2 (Sentence Control)</span>
                </button>
              </div>
            )}
          </div>

          {/* Gate 2 Card */}
          <div className={`p-6 rounded-xl border transition-all ${
            gates.gate2.ready
              ? 'border-emerald-500/40 bg-emerald-500/5'
              : 'border-[var(--border-subtle)] bg-[var(--bg-surface)]'
          }`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <span className="text-xs font-mono uppercase text-[var(--text-muted)]">Phase 2 Exit</span>
                <h3 className="font-bold text-base text-[var(--text-main)]">
                  Gate 2: Top-3 Error Suppression &lt; 2%
                </h3>
              </div>
              {gates.gate2.ready ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Circle className="w-5 h-5 text-[var(--text-subtle)]" />
              )}
            </div>

            <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-4">
              Error rate measured on most recent 900+ words marked in Phase 2, per type, against your frozen Top 3 targets: {appState.top3.join(', ')}.
            </p>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-[var(--text-main)]">
                <span>900+ Reviewed Words in Phase 2:</span>
                <span className="font-mono tabular-nums font-semibold">
                  {gates.gate2.wordsCount} / 900 {gates.gate2.wordsMet ? '✓' : ''}
                </span>
              </div>
              <div className="w-full bg-[var(--bg-elevated)] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, (gates.gate2.wordsCount / 900) * 100)}%` }}
                />
              </div>

              <div className="flex justify-between text-[var(--text-main)] pt-2">
                <span>Top-3 Error Rate (Target &lt; 2.0%):</span>
                <span className="font-mono tabular-nums font-semibold">
                  {gates.gate2.errorRate.toFixed(1)}% {gates.gate2.rateMet ? '✓' : ''}
                </span>
              </div>
            </div>

            {appState.phase === 2 && gates.gate2.ready && (
              <div className="mt-4 pt-3 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => onAdvancePhase(3)}
                  className="w-full py-2 rounded-lg bg-[var(--accent)] text-[var(--accent-text)] text-xs font-semibold hover:opacity-90 flex items-center justify-center gap-1.5"
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>Advance to Phase 3 (Rhythm & Expansion)</span>
                </button>
              </div>
            )}
          </div>

          {/* Gate 3 Card */}
          <div className={`p-6 rounded-xl border transition-all ${
            gates.gate3.ready
              ? 'border-emerald-500/40 bg-emerald-500/5'
              : 'border-[var(--border-subtle)] bg-[var(--bg-surface)]'
          }`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <span className="text-xs font-mono uppercase text-[var(--text-muted)]">Phase 3 Exit</span>
                <h3 className="font-bold text-base text-[var(--text-main)]">
                  Gate 3: Completed 3-Day Pieces
                </h3>
              </div>
              {gates.gate3.ready ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Circle className="w-5 h-5 text-[var(--text-subtle)]" />
              )}
            </div>

            <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-4">
              Requires 4 full analytical pieces drafted, reviewed, and revised through the 3-day essay protocol.
            </p>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-[var(--text-main)]">
                <span>Completed Pieces:</span>
                <span className="font-mono tabular-nums font-semibold">
                  {gates.gate3.completedPieces} / 4
                </span>
              </div>
              <div className="w-full bg-[var(--bg-elevated)] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, (gates.gate3.completedPieces / 4) * 100)}%` }}
                />
              </div>
            </div>

            {appState.phase === 3 && gates.gate3.ready && (
              <div className="mt-4 pt-3 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => onAdvancePhase(4)}
                  className="w-full py-2 rounded-lg bg-[var(--accent)] text-[var(--accent-text)] text-xs font-semibold hover:opacity-90 flex items-center justify-center gap-1.5"
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>Advance to Phase 4 (Publishing)</span>
                </button>
              </div>
            )}
          </div>

          {/* Gate 4 Card */}
          <div className={`p-6 rounded-xl border transition-all ${
            gates.gate4.ready
              ? 'border-emerald-500/40 bg-emerald-500/5'
              : 'border-[var(--border-subtle)] bg-[var(--bg-surface)]'
          }`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <span className="text-xs font-mono uppercase text-[var(--text-muted)]">Phase 4 Goal</span>
                <h3 className="font-bold text-base text-[var(--text-main)]">
                  Gate 4: Public Mastery & Published Body
                </h3>
              </div>
              {gates.gate4.ready ? (
                <Award className="w-5 h-5 text-amber-500" />
              ) : (
                <Circle className="w-5 h-5 text-[var(--text-subtle)]" />
              )}
            </div>

            <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-4">
              Requires 3 publicly released pieces with live URLs on your target platform ({appState.publishPlace || 'Substack'}).
            </p>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-[var(--text-main)]">
                <span>Published Pieces:</span>
                <span className="font-mono tabular-nums font-semibold">
                  {gates.gate4.publishedCount} / 3
                </span>
              </div>
              <div className="w-full bg-[var(--bg-elevated)] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, (gates.gate4.publishedCount / 3) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Practice Log Table */}
      <div className="space-y-3">
        <div className="text-xs font-mono uppercase text-[var(--text-muted)] tracking-wider">
          Recent Practice History ({sessions.length} sessions total)
        </div>

        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-muted)] font-mono uppercase">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Kind</th>
                <th className="py-3 px-4">Phase</th>
                <th className="py-3 px-4 text-center">Words</th>
                <th className="py-3 px-4 text-center">Duration</th>
                <th className="py-3 px-4 text-center">Pauses &gt; {appState.pauseLimit}s</th>
                <th className="py-3 px-4 text-right">Reviewed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {recentSessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[var(--text-muted)]">
                    No sessions recorded yet. Start today's drill from the Today view!
                  </td>
                </tr>
              ) : (
                recentSessions.map(sess => (
                  <tr key={sess.id} className="hover:bg-[var(--bg-elevated)]/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-[var(--text-main)]">
                      {sess.date}
                    </td>
                    <td className="py-3.5 px-4 capitalize text-[var(--text-main)] font-semibold">
                      {sess.kind}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[var(--text-muted)]">
                      Phase {sess.phase}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono tabular-nums font-bold text-[var(--text-main)]">
                      {sess.words}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono tabular-nums text-[var(--text-muted)]">
                      {Math.round(sess.seconds / 60)}m
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono tabular-nums">
                      {sess.data.sprint?.paused ? (
                        <span className="text-amber-600 dark:text-amber-400 font-bold">
                          {sess.data.sprint.paused}
                        </span>
                      ) : (
                        <span className="text-[var(--text-subtle)]">0</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {sess.reviewed ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          Yes ({sess.marks.length} marks)
                        </span>
                      ) : (
                        <span className="text-[var(--text-subtle)]">No</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
