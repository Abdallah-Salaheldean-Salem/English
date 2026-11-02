import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  AlertTriangle,
  Sparkles,
  Check,
  RotateCcw,
  BookOpen,
  Send,
  Copy,
  ChevronRight,
  HelpCircle,
  X,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { AppState, Mark, ModelPassage, Session, SessionKind, SprintTelemetry } from '../types';
import { countWords, formatIsoDate, generateSelfReviewPrompt } from '../lib/logic';
import { COMBINING_EXERCISES, PUBLIC_DOMAIN_MODELS, WRITING_PROMPTS } from '../lib/content';

interface FocusModeProps {
  appState: AppState;
  initialKind?: SessionKind;
  initialModelId?: string;
  onSaveSession: (session: Session) => void;
  onRecordError: (type: string, wrote: string, correct: string, by: 'self' | 'gemini' | 'claude' | 'plan' | 'manual') => void;
  onExit: () => void;
}

export function FocusMode({
  appState,
  initialKind = 'phase1',
  initialModelId,
  onSaveSession,
  onRecordError,
  onExit,
}: FocusModeProps) {
  // Drill Configuration
  const [kind, setKind] = useState<SessionKind>(initialKind);
  const [step, setStep] = useState<number>(1); // 1 = Setup/Notes, 2 = Write/Sprint, 3 = Review, 4 = Repair

  // Text inputs
  const [draftText, setDraftText] = useState<string>('');
  const [notesText, setNotesText] = useState<string>('');
  const [selectedPrompt, setSelectedPrompt] = useState<string>(WRITING_PROMPTS[0].prompts[0]);
  const [selectedModel, setSelectedModel] = useState<ModelPassage>(() => {
    return PUBLIC_DOMAIN_MODELS.find(m => m.id === initialModelId) || PUBLIC_DOMAIN_MODELS[0];
  });
  const [selectedCombining, setSelectedCombining] = useState(COMBINING_EXERCISES[0]);

  // Timer & Telemetry
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [lastKeystrokeTime, setLastKeystrokeTime] = useState<number>(Date.now());
  const [currentPauseSeconds, setCurrentPauseSeconds] = useState<number>(0);
  const [maxPauseSeconds, setMaxPauseSeconds] = useState<number>(0);
  const [pauseCount, setPauseCount] = useState<number>(0);
  const [showNoDeleteNotice, setShowNoDeleteNotice] = useState<boolean>(false);

  // Review & Marks
  const [reviewMode, setReviewMode] = useState<'gemini' | 'self'>('gemini');
  const [isReviewLoading, setIsReviewLoading] = useState<boolean>(false);
  const [reviewFeedback, setReviewFeedback] = useState<string>('');
  const [marks, setMarks] = useState<Mark[]>([]);
  const [selectedMarkIndex, setSelectedMarkIndex] = useState<number | null>(null);
  const [repairInput, setRepairInput] = useState<string>('');
  const [repairFeedback, setRepairFeedback] = useState<string>('');
  const [isCheckingRepair, setIsCheckingRepair] = useState<boolean>(false);

  // Manual mark entry for self-check
  const [manualQuote, setManualQuote] = useState<string>('');
  const [manualType, setManualType] = useState<string>('Subject-Verb Agreement');
  const [manualHint, setManualHint] = useState<string>('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timerIntervalRef = useRef<any>(null);

  // Sound chime helper
  const playChime = () => {
    if (!appState.sound) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      // AudioContext unavailable or restricted by browser policy
    }
  };

  // Timer Tick & Pause detector
  useEffect(() => {
    if (isTimerRunning && step === 2) {
      timerIntervalRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);

        // Pause check
        const now = Date.now();
        const pauseSecs = Math.floor((now - lastKeystrokeTime) / 1000);
        setCurrentPauseSeconds(pauseSecs);

        if (pauseSecs > maxPauseSeconds) {
          setMaxPauseSeconds(pauseSecs);
        }

        if (pauseSecs >= appState.pauseLimit && pauseSecs === appState.pauseLimit) {
          setPauseCount(c => c + 1);
        }
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isTimerRunning, step, lastKeystrokeTime, maxPauseSeconds, appState.pauseLimit]);

  // Handle Keystroke & No-Delete Guard
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    setLastKeystrokeTime(Date.now());
    setCurrentPauseSeconds(0);

    // No-delete friction enforcement in Phase 1
    if (appState.noDelete && (e.key === 'Backspace' || e.key === 'Delete')) {
      setShowNoDeleteNotice(true);
      setTimeout(() => setShowNoDeleteNotice(false), 2000);
    }
  };

  const handleStartSprint = () => {
    setStep(2);
    setIsTimerRunning(true);
    setLastKeystrokeTime(Date.now());
    playChime();
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 100);
  };

  const handleFinishWriting = () => {
    setIsTimerRunning(false);
    setStep(3);
    playChime();
  };

  // Automated Gemini Review Call
  const handleRunGeminiReview = async () => {
    setIsReviewLoading(true);
    setReviewFeedback('');
    try {
      const response = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: draftText,
          phase: appState.phase,
          kind,
          top3: appState.top3,
        }),
      });

      if (!response.ok) {
        throw new Error('Review request returned status ' + response.status);
      }

      const data = await response.json();
      setReviewFeedback(data.generalFeedback || 'Review completed.');

      const newMarks: Mark[] = (data.marks || []).map((m: any) => ({
        quote: m.quote,
        type: m.type,
        hint: m.hint,
        note: m.note,
        by: 'gemini',
        fixed: false,
        tries: 0,
      }));

      setMarks(newMarks);
      setStep(4);
      if (newMarks.length > 0) {
        setSelectedMarkIndex(0);
        setRepairInput('');
        setRepairFeedback('');
      }
      playChime();
    } catch (err: any) {
      console.error('Gemini review error:', err);
      setReviewFeedback('Automated diagnosis unavailable. You can use Guided Self-Check to review manually.');
      setReviewMode('self');
      setStep(4);
    } finally {
      setIsReviewLoading(false);
    }
  };

  // Add manual self-mark
  const handleAddManualMark = () => {
    if (!manualQuote.trim()) return;
    const newMark: Mark = {
      quote: manualQuote.trim(),
      type: manualType,
      hint: manualHint || 'Check this phrasing against grammar rules.',
      by: 'self',
      fixed: false,
      tries: 0,
    };
    setMarks([...marks, newMark]);
    setManualQuote('');
    setManualHint('');
    setSelectedMarkIndex(marks.length);
  };

  // Test repair against API or self verification
  const handleCheckRepair = async (markIndex: number) => {
    const mark = marks[markIndex];
    if (!repairInput.trim() || !mark) return;

    setIsCheckingRepair(true);
    setRepairFeedback('');

    try {
      const response = await fetch('/api/check-repair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalQuote: mark.quote,
          userFix: repairInput,
          errorType: mark.type,
          hint: mark.hint,
          contextSentence: draftText,
        }),
      });

      const resData = await response.json();
      if (resData.passed) {
        // Mark resolved
        const updatedMarks = [...marks];
        updatedMarks[markIndex] = {
          ...mark,
          fixed: true,
          fix: repairInput,
          tries: mark.tries + 1,
        };
        setMarks(updatedMarks);
        setRepairFeedback('Repaired successfully: ' + (resData.feedback || 'Good correction.'));
        playChime();

        // Automatically log into Error Ledger!
        onRecordError(mark.type, mark.quote, repairInput, mark.by);
      } else {
        const updatedMarks = [...marks];
        updatedMarks[markIndex] = {
          ...mark,
          tries: mark.tries + 1,
        };
        setMarks(updatedMarks);
        setRepairFeedback(resData.feedback || 'Not quite. Check the hint again and adjust.');
      }
    } catch (err) {
      // Offline fallback: accept writer's judgment
      const updatedMarks = [...marks];
      updatedMarks[markIndex] = {
        ...mark,
        fixed: true,
        fix: repairInput,
        tries: mark.tries + 1,
      };
      setMarks(updatedMarks);
      setRepairFeedback('Self-verified. Saved to your Error Ledger.');
      onRecordError(mark.type, mark.quote, repairInput, mark.by);
    } finally {
      setIsCheckingRepair(false);
    }
  };

  // Save full session to history
  const handleCompleteSession = () => {
    const wordCount = countWords(draftText);
    const sprintTelemetry: SprintTelemetry = {
      words: wordCount,
      maxPause: maxPauseSeconds,
      paused: pauseCount,
      interrupted: pauseCount > 0,
      seconds: elapsedSeconds,
    };

    const session: Session = {
      id: `sess-${Date.now()}`,
      kind,
      phase: appState.phase,
      date: formatIsoDate(),
      status: 'done',
      startedAt: new Date(Date.now() - elapsedSeconds * 1000).toISOString(),
      finishedAt: new Date().toISOString(),
      step: 4,
      stepElapsed: elapsedSeconds,
      seconds: elapsedSeconds,
      words: wordCount,
      data: {
        sprint: sprintTelemetry,
        notes: notesText,
        modelId: selectedModel?.id,
        prompt: selectedPrompt,
        draftText,
      },
      marks,
      reviewed: marks.length > 0 || reviewMode === 'gemini',
      reviewedAt: new Date().toISOString(),
      reviewMode,
    };

    onSaveSession(session);
    playChime();
    onExit();
  };

  const words = countWords(draftText);
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col bg-[var(--bg-app)]">
      {/* Top Session Status Bar */}
      <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-[var(--text-main)] uppercase tracking-wider">
            {kind.toUpperCase()} · STEP {step}/4
          </span>
          <span className="text-[var(--text-subtle)]">|</span>
          <div className="flex items-center gap-1.5 text-[var(--text-main)] font-bold tabular-nums">
            <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <span>{timeFormatted}</span>
          </div>
          <span className="text-[var(--text-subtle)]">|</span>
          <span className="text-[var(--text-muted)] tabular-nums">{words} words</span>
          {pauseCount > 0 && (
            <span className="text-amber-600 dark:text-amber-400 font-medium tabular-nums">
              ({pauseCount} pauses &gt; {appState.pauseLimit}s)
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {showNoDeleteNotice && (
            <span className="text-amber-600 dark:text-amber-400 font-medium animate-pulse">
              No-delete active: Keep forward momentum!
            </span>
          )}
          <button
            type="button"
            onClick={onExit}
            className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors p-1"
            title="Exit Session"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Focus Area */}
      <div className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 md:p-8 flex flex-col justify-between">
        {/* STEP 1: PRE-WRITING SETUP / STUDY / NOTES */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <div className="text-xs font-mono uppercase text-[var(--text-muted)] mb-1">
                Session Preparation · Step 1
              </div>
              <h2 className="text-2xl font-bold text-[var(--text-main)] font-editorial-sans">
                {kind === 'phase1' && 'Phase 1: Rapid Fluency Sprint'}
                {kind === 'franklin1' && 'Franklin Drill: Study Passage & Record Hints'}
                {kind === 'franklin2' && 'Franklin Drill: Delayed Reconstruction'}
                {kind === 'combining' && 'Sentence Combining Drill'}
                {kind === 'piece' && 'Piece Drafting Session'}
              </h2>
            </div>

            {/* Content for Phase 1 Sprint */}
            {kind === 'phase1' && (
              <div className="space-y-4">
                <div className="p-5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Writing Prompt (or write on your own topic)
                  </div>
                  <div className="text-base text-[var(--text-main)] font-editorial-serif leading-relaxed italic">
                    "{selectedPrompt}"
                  </div>
                  <div className="pt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const allPrompts = WRITING_PROMPTS.flatMap(g => g.prompts);
                        const nextP = allPrompts[Math.floor(Math.random() * allPrompts.length)];
                        setSelectedPrompt(nextP);
                      }}
                      className="text-xs px-3 py-1.5 rounded border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Shuffle Prompt</span>
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] space-y-1.5">
                  <div className="font-semibold text-[var(--text-main)]">Sprint Ground Rules:</div>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Write continuously for 10–15 minutes without stopping.</li>
                    <li>Do not pause longer than {appState.pauseLimit} seconds.</li>
                    <li>{appState.noDelete ? 'Do not backspace or edit while sprinting (No-delete mode enabled).' : 'Prioritize speed and natural flow over perfection.'}</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Content for Franklin Step 1 */}
            {kind === 'franklin1' && (
              <div className="space-y-4">
                <div className="p-5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-mono text-[var(--text-muted)]">
                      {selectedModel.author} · {selectedModel.title} ({selectedModel.wordCount} words)
                    </div>
                  </div>
                  <div className="text-base text-[var(--text-main)] font-editorial-serif leading-relaxed p-4 rounded bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                    {selectedModel.text}
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">
                    <span className="font-semibold">Analysis Note: </span>
                    {selectedModel.notes}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-main)] mb-1 uppercase tracking-wider">
                    Write Short Hints of the Sentiment in Each Sentence
                  </label>
                  <p className="text-xs text-[var(--text-muted)] mb-2">
                    As Franklin wrote: "making short hints of the sentiment in each sentence, laid them by a few days..."
                  </p>
                  <textarea
                    value={notesText}
                    onChange={e => setNotesText(e.target.value)}
                    rows={4}
                    className="w-full p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] text-sm focus:outline-none focus:border-[var(--accent)]"
                    placeholder="1. Author discovered Spectator volume 3...&#10;2. Delighted with excellent writing, wished to imitate...&#10;3. Took papers, made brief sentiment hints..."
                  />
                </div>
              </div>
            )}

            {/* Content for Sentence Combining */}
            {kind === 'combining' && (
              <div className="space-y-4">
                <div className="p-5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-3">
                  <div className="text-xs font-mono uppercase text-[var(--text-muted)]">
                    {selectedCombining.category} · {selectedCombining.title}
                  </div>
                  <div className="text-sm font-semibold text-[var(--text-main)]">
                    {selectedCombining.instruction}
                  </div>
                  <div className="space-y-1.5 p-3 rounded bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-sm font-editorial-serif text-[var(--text-main)]">
                    {selectedCombining.sourceSentences.map((s, idx) => (
                      <div key={idx}>• {s}</div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={handleStartSprint}
                className="px-6 py-3 rounded-lg bg-[var(--accent)] text-[var(--accent-text)] font-semibold text-sm hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                <span>Enter Distraction-Free Sprint</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: DISTRACTION-FREE WRITING PANE */}
        {step === 2 && (
          <div className="flex-1 flex flex-col space-y-4 animate-in fade-in duration-200">
            {/* Pause alert pill */}
            {currentPauseSeconds >= appState.pauseLimit && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  Paused for {currentPauseSeconds}s (limit: {appState.pauseLimit}s). Keep typing without stopping!
                </span>
              </div>
            )}

            {/* Reference notes if in Franklin drill */}
            {kind === 'franklin1' && notesText && (
              <div className="text-xs p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-muted)] font-mono">
                <span className="font-semibold text-[var(--text-main)]">Your Notes: </span>
                {notesText}
              </div>
            )}

            {/* Editorial Writing Canvas */}
            <div className="flex-1 flex flex-col">
              <textarea
                ref={textareaRef}
                value={draftText}
                onChange={e => setDraftText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={14}
                className="w-full flex-1 p-6 sm:p-8 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] text-base sm:text-lg font-editorial-serif leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-none transition-colors shadow-sm"
                placeholder="Begin writing continuously here. Let your words flow forward without second-guessing..."
                autoFocus
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="text-xs font-mono text-[var(--text-muted)]">
                <span>{words} words written</span>
                {currentPauseSeconds > 5 && (
                  <span className="ml-2 text-[var(--text-subtle)]">· idle for {currentPauseSeconds}s</span>
                )}
              </div>

              <button
                type="button"
                onClick={handleFinishWriting}
                disabled={draftText.trim().length === 0}
                className="px-5 py-2.5 rounded-lg bg-[var(--accent)] text-[var(--accent-text)] text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                Finish Writing & Review →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: DUAL-MODE REVIEW SELECTOR */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <div className="text-xs font-mono uppercase text-[var(--text-muted)] mb-1">
                Step 3: Choose Review Mode
              </div>
              <h2 className="text-2xl font-bold text-[var(--text-main)] font-editorial-sans">
                Evaluate Your Writing
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
                The recovery plan relies on strict diagnosis where mistakes are tagged with hints, but you repair them yourself.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option A: Gemini Automated Review */}
              <div
                onClick={() => setReviewMode('gemini')}
                className={`p-5 rounded-xl border cursor-pointer transition-all ${
                  reviewMode === 'gemini'
                    ? 'border-[var(--accent)] bg-[var(--bg-elevated)] ring-1 ring-[var(--accent)]'
                    : 'border-[var(--border-subtle)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)]'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <span className="font-bold text-sm text-[var(--text-main)]">
                    Automated Gemini Diagnosis
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  Scans your draft for grammatical slips, syntax errors, and your frozen top 3 targets. Highlights quotes with instructive hints without revealing the answer.
                </p>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={handleRunGeminiReview}
                    disabled={isReviewLoading}
                    className="w-full py-2.5 rounded-lg bg-[var(--accent)] text-[var(--accent-text)] text-xs font-semibold hover:opacity-90 flex items-center justify-center gap-2"
                  >
                    {isReviewLoading ? (
                      <span>Analyzing grammar & syntax...</span>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Run Automated Review</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Option B: Guided Self-Check */}
              <div
                onClick={() => setReviewMode('self')}
                className={`p-5 rounded-xl border cursor-pointer transition-all ${
                  reviewMode === 'self'
                    ? 'border-[var(--accent)] bg-[var(--bg-elevated)] ring-1 ring-[var(--accent)]'
                    : 'border-[var(--border-subtle)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)]'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-5 h-5 text-[var(--text-muted)]" />
                  <span className="font-bold text-sm text-[var(--text-main)]">
                    Guided Self-Check & External Prompt
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  Review against the recovery plan checklist, or copy a tailor-made prompt into Claude/external model and manually mark areas needing repair.
                </p>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setReviewMode('self');
                      setStep(4);
                    }}
                    className="w-full py-2.5 rounded-lg border border-[var(--border-strong)] text-[var(--text-main)] text-xs font-semibold hover:bg-[var(--bg-elevated)] flex items-center justify-center gap-2"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Open Guided Self-Check</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Preview of Written Text */}
            <div className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
              <div className="text-xs font-mono uppercase text-[var(--text-muted)] mb-2">
                Your Draft ({words} words)
              </div>
              <div className="text-sm font-editorial-serif text-[var(--text-main)] leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                {draftText}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: REPAIR WORKBENCH & ERROR LEDGER */}
        {step === 4 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-mono uppercase text-[var(--text-muted)] mb-1">
                  Step 4: Repair Workbench
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-main)] font-editorial-sans">
                  Execute Corrections & Log Errors
                </h2>
              </div>

              <button
                type="button"
                onClick={handleCompleteSession}
                className="px-5 py-2.5 rounded-lg bg-[var(--accent)] text-[var(--accent-text)] text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                Complete & Save Session ✓
              </button>
            </div>

            {reviewFeedback && (
              <div className="p-4 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)] leading-relaxed">
                <span className="font-semibold">Reviewer Notes: </span>
                {reviewFeedback}
              </div>
            )}

            {/* Split Workbench: Draft with Marks on Left, Repair Editor on Right */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Draft with Marks list */}
              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--text-main)] uppercase tracking-wider">
                      Identified Marks ({marks.length})
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {marks.filter(m => m.fixed).length} resolved
                    </span>
                  </div>

                  {marks.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[var(--text-muted)]">
                      No errors flagged! Your writing flowed cleanly. You can add a manual observation below if you caught something yourself.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {marks.map((m, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            setSelectedMarkIndex(idx);
                            setRepairInput(m.fix || '');
                            setRepairFeedback('');
                          }}
                          className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                            selectedMarkIndex === idx
                              ? 'border-[var(--accent)] bg-[var(--bg-elevated)] ring-1 ring-[var(--accent)]'
                              : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)]'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-[var(--text-main)]">{m.type}</span>
                            {m.fixed ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                <Check className="w-3 h-3" /> Repaired
                              </span>
                            ) : (
                              <span className="text-amber-600 dark:text-amber-400 font-medium">Needs repair</span>
                            )}
                          </div>
                          <div className="text-[var(--text-muted)] italic mb-1 font-editorial-serif">
                            "{m.quote}"
                          </div>
                          <div className="text-[11px] text-[var(--text-subtle)]">
                            Hint: {m.hint}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Manual Mark Add Section (for Guided Self-Check) */}
                  <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2">
                    <div className="text-xs font-semibold text-[var(--text-main)]">Add Self-Identified Mark:</div>
                    <input
                      type="text"
                      value={manualQuote}
                      onChange={e => setManualQuote(e.target.value)}
                      placeholder="Quote exact problematic phrase..."
                      className="w-full px-2.5 py-1.5 text-xs rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)]"
                    />
                    <div className="flex gap-2">
                      <select
                        value={manualType}
                        onChange={e => setManualType(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 text-xs rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)]"
                      >
                        {appState.top3.map(t => (
                          <option key={t} value={t}>{t} (Top 3)</option>
                        ))}
                        <option value="Subject-Verb Agreement">Subject-Verb Agreement</option>
                        <option value="Tense Shift">Tense Shift</option>
                        <option value="Missing / Misused Article">Missing / Misused Article</option>
                        <option value="Dangling / Misplaced Modifier">Dangling / Misplaced Modifier</option>
                        <option value="Run-on / Comma Splice">Run-on / Comma Splice</option>
                        <option value="Preposition Choice">Preposition Choice</option>
                        <option value="Word Choice / Collocation">Word Choice / Collocation</option>
                      </select>
                      <button
                        type="button"
                        onClick={handleAddManualMark}
                        disabled={!manualQuote.trim()}
                        className="px-3 py-1.5 text-xs font-semibold rounded bg-[var(--accent)] text-[var(--accent-text)] disabled:opacity-40"
                      >
                        Add Mark
                      </button>
                    </div>

                    {/* Copy Prompt for Claude button */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          const p = generateSelfReviewPrompt(draftText, appState);
                          navigator.clipboard.writeText(p);
                          alert('Review prompt copied to clipboard! Paste it into Claude or any external model.');
                        }}
                        className="w-full py-1.5 text-xs font-medium rounded border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center justify-center gap-1.5"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy External Review Prompt</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Repair Editor for Selected Mark */}
              <div className="space-y-4">
                {selectedMarkIndex !== null && marks[selectedMarkIndex] ? (
                  <div className="p-5 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] space-y-4">
                    <div className="border-b border-[var(--border-subtle)] pb-3">
                      <div className="text-xs font-mono uppercase text-[var(--text-muted)] mb-1">
                        Repairing Error #{selectedMarkIndex + 1}
                      </div>
                      <div className="text-base font-bold text-[var(--text-main)]">
                        {marks[selectedMarkIndex].type}
                      </div>
                    </div>

                    <div className="p-3 rounded bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs space-y-1 font-editorial-serif">
                      <div className="text-[var(--text-muted)] font-mono text-[11px] uppercase">Original Text:</div>
                      <div className="text-rose-600 dark:text-rose-400 font-semibold line-through">
                        "{marks[selectedMarkIndex].quote}"
                      </div>
                    </div>

                    <div className="text-xs text-[var(--text-main)] bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg leading-relaxed">
                      <span className="font-semibold text-amber-700 dark:text-amber-400">Guiding Hint: </span>
                      <span>{marks[selectedMarkIndex].hint}</span>
                    </div>

                    {marks[selectedMarkIndex].note && (
                      <div className="text-xs text-[var(--text-muted)]">
                        <span className="font-semibold">Rule Context: </span>
                        {marks[selectedMarkIndex].note}
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-[var(--text-main)] uppercase tracking-wider">
                        Your Proposed Correction:
                      </label>
                      <textarea
                        value={repairInput}
                        onChange={e => setRepairInput(e.target.value)}
                        rows={3}
                        className="w-full p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] text-sm font-editorial-serif focus:outline-none focus:border-[var(--accent)]"
                        placeholder="Type the corrected phrase or sentence here..."
                      />
                    </div>

                    {repairFeedback && (
                      <div className={`p-3 rounded-lg text-xs leading-relaxed ${
                        marks[selectedMarkIndex].fixed
                          ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-medium'
                          : 'bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400'
                      }`}>
                        {repairFeedback}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleCheckRepair(selectedMarkIndex)}
                        disabled={isCheckingRepair || !repairInput.trim()}
                        className="flex-1 py-2.5 rounded-lg bg-[var(--accent)] text-[var(--accent-text)] text-xs font-semibold hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
                      >
                        {isCheckingRepair ? (
                          <span>Verifying repair...</span>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Verify Repair & Save to Ledger</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 rounded-xl border border-dashed border-[var(--border-subtle)] text-center text-xs text-[var(--text-muted)]">
                    Select a mark from the left column to inspect its diagnostic hint and execute your repair.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
