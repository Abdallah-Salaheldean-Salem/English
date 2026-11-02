import React, { useState, useEffect, useRef } from 'react';
import { COPYWORK_MODELS, PHASE1_WRITING_PROMPTS } from '../data/models';
import { DetectedError, WritingSession } from '../types';
import { analyzeProse, WritingAnalysis } from '../utils/grammarAnalysis';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Plus,
  BookOpen,
  ArrowRight,
  ShieldAlert,
  ChevronDown,
  Sparkles,
  Info
} from 'lucide-react';

interface DailySprintSessionProps {
  onSessionComplete: (session: WritingSession) => void;
  onAddErrorToTracker: (type: string, whatIWrote: string, correctForm: string, notes?: string) => void;
}

export const DailySprintSession: React.FC<DailySprintSessionProps> = ({
  onSessionComplete,
  onAddErrorToTracker
}) => {
  // Steps: 'copy' (5 min) -> 'write' (15 min) -> 'check' (5 min)
  const [currentStep, setCurrentStep] = useState<'copy' | 'write' | 'check'>('copy');

  // Copywork state
  const [selectedModelIndex, setSelectedModelIndex] = useState(0);
  const [copyworkMode, setCopyworkMode] = useState<'by_hand' | 'type_in_app'>('type_in_app');
  const [typedCopywork, setTypedCopywork] = useState('');
  const [copyTimeSeconds, setCopyTimeSeconds] = useState(5 * 60);
  const [isCopyTimerRunning, setIsCopyTimerRunning] = useState(false);

  // Write sprint state (15 min)
  const [draftText, setDraftText] = useState('');
  const [draftTitle, setDraftTitle] = useState('Daily Unaided Sprint');
  const [selectedPrompt, setSelectedPrompt] = useState(PHASE1_WRITING_PROMPTS[0]);
  const [writeTimeSeconds, setWriteTimeSeconds] = useState(15 * 60);
  const [isWriteTimerRunning, setIsWriteTimerRunning] = useState(false);
  const [showSentenceRulesDrawer, setShowSentenceRulesDrawer] = useState(true);

  // Check state (5 min)
  const [checkTimeSeconds, setCheckTimeSeconds] = useState(5 * 60);
  const [isCheckTimerRunning, setIsCheckTimerRunning] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [selfUnderlines, setSelfUnderlines] = useState<{ snippet: string; note: string }[]>([]);
  const [newUnderlineNote, setNewUnderlineNote] = useState('');
  const [selectedSnippet, setSelectedSnippet] = useState('');

  // Diagnostic AI / Strict mentor state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<{
    summary?: string;
    errors?: DetectedError[];
  } | null>(null);
  const [localAnalysis, setLocalAnalysis] = useState<WritingAnalysis | null>(null);
  const [sessionSaved, setSessionSaved] = useState(false);

  const selectedModel = COPYWORK_MODELS[selectedModelIndex];

  // Timer intervals
  useEffect(() => {
    let interval: any = null;
    if (currentStep === 'copy' && isCopyTimerRunning && copyTimeSeconds > 0) {
      interval = setInterval(() => setCopyTimeSeconds((s) => s - 1), 1000);
    } else if (currentStep === 'write' && isWriteTimerRunning && writeTimeSeconds > 0) {
      interval = setInterval(() => setWriteTimeSeconds((s) => s - 1), 1000);
    } else if (currentStep === 'check' && isCheckTimerRunning && checkTimeSeconds > 0) {
      interval = setInterval(() => setCheckTimeSeconds((s) => s - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [currentStep, isCopyTimerRunning, isWriteTimerRunning, isCheckTimerRunning, copyTimeSeconds, writeTimeSeconds, checkTimeSeconds]);

  // Real-time word calculation
  const words = draftText.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const elapsedMinutes = Math.max(0.1, (15 * 60 - writeTimeSeconds) / 60);
  const wordsPerMinute = Math.round(wordCount / elapsedMinutes);

  // Read aloud handler using Web Speech API
  const handleReadAloud = () => {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported in this browser. Please read your draft aloud to yourself!');
      return;
    }
    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }
    if (!draftText.trim()) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(draftText);
    utterance.rate = 0.95;
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);
    setIsPlayingAudio(true);
    window.speechSynthesis.speak(utterance);
  };

  // Text selection for self-underlining
  const handleTextSelect = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      setSelectedSnippet(selection.toString().trim());
    }
  };

  const addSelfUnderline = () => {
    if (!selectedSnippet) return;
    setSelfUnderlines([
      ...selfUnderlines,
      { snippet: selectedSnippet, note: newUnderlineNote.trim() || 'Identified during read-aloud' }
    ]);
    setSelectedSnippet('');
    setNewUnderlineNote('');
  };

  // Run Strict Mentor Diagnostic
  const handleRunDiagnostic = async () => {
    if (!draftText.trim()) return;
    setIsAnalyzing(true);
    // Run instant local heuristic analysis
    const local = analyzeProse(draftText, 1);
    setLocalAnalysis(local);

    try {
      const res = await fetch('/api/analyze-errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: draftText,
          phase: 1,
          drillType: 'Phase 1 Daily Sprint'
        })
      });

      if (res.ok) {
        const data = await res.json();
        setAiAnalysisResult(data);
      } else {
        // Fallback to local heuristic
        setAiAnalysisResult({
          summary: `Your draft contains ${local.wordCount} words across ${local.sentenceCount} sentences (avg ${local.avgSentenceLength} words/sentence).`,
          errors: local.detectedErrors
        });
      }
    } catch {
      setAiAnalysisResult({
        summary: `Your draft contains ${local.wordCount} words across ${local.sentenceCount} sentences.`,
        errors: local.detectedErrors
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFinishSession = () => {
    const session: WritingSession = {
      id: 'session-' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      phase: 1,
      drillType: 'phase1_daily',
      title: draftTitle,
      content: draftText,
      wordCount,
      durationMinutes: 25,
      wordsPerMinute,
      selfFoundErrorsCount: selfUnderlines.length,
      underlinedSnippets: selfUnderlines.map((u) => u.snippet + ': ' + u.note),
      aiErrorsFound: aiAnalysisResult?.errors || localAnalysis?.detectedErrors || [],
      completed: true
    };
    onSessionComplete(session);
    setSessionSaved(true);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Session Flow Header */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-stone-500 mb-1">
              <span>Phase 1: Restart</span>
              <span>·</span>
              <span>Daily 25-Minute Structured Routine</span>
            </div>
            <h1 className="font-serif-prose text-2xl font-bold text-stone-900">
              The Daily Unaided Sprint
            </h1>
            <p className="text-xs text-stone-600 mt-0.5">
              Copy (5m) &rarr; Write unaided without stopping (15m) &rarr; Read aloud & self-check (5m).
            </p>
          </div>

          {/* Stepper Tabs */}
          <div className="flex items-center bg-stone-100 p-1 rounded-lg border border-stone-200 text-xs">
            <button
              onClick={() => setCurrentStep('copy')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                currentStep === 'copy'
                  ? 'bg-white text-stone-900 shadow-xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              1. Copy (5m)
            </button>
            <button
              onClick={() => setCurrentStep('write')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                currentStep === 'write'
                  ? 'bg-white text-stone-900 shadow-xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              2. Write (15m)
            </button>
            <button
              onClick={() => {
                setCurrentStep('check');
                if (!localAnalysis && draftText.trim()) {
                  setLocalAnalysis(analyzeProse(draftText, 1));
                }
              }}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                currentStep === 'check'
                  ? 'bg-white text-stone-900 shadow-xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              3. Check (5m)
            </button>
          </div>
        </div>

        {/* STEP 1: COPYWORK */}
        {currentStep === 'copy' && (
          <div className="mt-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50 p-3 rounded-lg border border-stone-200">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-stone-700" />
                <span className="text-xs font-semibold text-stone-800">
                  Select Clear Writer Model:
                </span>
                <select
                  value={selectedModelIndex}
                  onChange={(e) => setSelectedModelIndex(Number(e.target.value))}
                  className="bg-white border border-stone-300 text-xs rounded px-2 py-1 text-stone-800 font-medium focus:outline-none"
                >
                  {COPYWORK_MODELS.map((m, idx) => (
                    <option key={m.id} value={idx}>
                      {m.author} — {m.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* 5 min timer */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 font-mono-code font-bold text-stone-800 text-sm bg-white px-2.5 py-1 rounded border border-stone-200">
                  <span>{formatTimer(copyTimeSeconds)}</span>
                </div>
                <button
                  onClick={() => setIsCopyTimerRunning(!isCopyTimerRunning)}
                  className="px-2.5 py-1 rounded bg-stone-900 text-white text-xs font-medium hover:bg-stone-800 flex items-center gap-1"
                >
                  {isCopyTimerRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  <span>{isCopyTimerRunning ? 'Pause' : 'Start 5m'}</span>
                </button>
                <button
                  onClick={() => {
                    setIsCopyTimerRunning(false);
                    setCopyTimeSeconds(5 * 60);
                  }}
                  className="p-1 text-stone-400 hover:text-stone-700"
                  title="Reset timer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Model Text Display */}
            <div className="bg-amber-50/40 border border-amber-200/80 rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-amber-900">
                  Model Passage · {selectedModel.author}
                </div>
                <div className="text-[11px] text-stone-500">
                  {selectedModel.wordCount} words · {selectedModel.sentenceCount} sentences
                </div>
              </div>
              <p className="font-serif-prose text-lg text-stone-900 leading-relaxed italic">
                &ldquo;{selectedModel.text}&rdquo;
              </p>
              <div className="mt-3 pt-3 border-t border-amber-200/50 flex flex-wrap items-center justify-between text-xs text-stone-600">
                <span className="font-medium text-amber-950">
                  Notice: Subject and verb appear early. Sentences average 12–16 words. Zero clutter.
                </span>
                <span className="text-stone-500 italic">
                  Copy by hand in your notebook, or type below.
                </span>
              </div>
            </div>

            {/* Optional typing area or hand-written confirmation */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-stone-600">
                <label className="font-medium">Copywork Practice:</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="copyMode"
                      checked={copyworkMode === 'type_in_app'}
                      onChange={() => setCopyworkMode('type_in_app')}
                    />
                    <span>Type into app</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="copyMode"
                      checked={copyworkMode === 'by_hand'}
                      onChange={() => setCopyworkMode('by_hand')}
                    />
                    <span>Copied by hand in notebook</span>
                  </label>
                </div>
              </div>

              {copyworkMode === 'type_in_app' ? (
                <textarea
                  value={typedCopywork}
                  onChange={(e) => setTypedCopywork(e.target.value)}
                  placeholder="Type the model paragraph here sentence by sentence. Feel the natural punctuation and cadence..."
                  className="w-full h-28 p-3 bg-white border border-stone-200 rounded-lg text-sm font-serif-prose text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400 leading-relaxed"
                />
              ) : (
                <div className="p-4 bg-stone-50 rounded-lg border border-dashed border-stone-300 text-center text-xs text-stone-600">
                  Pencil or fountain pen in a notebook puts sentence rhythms back into your hand without digital distractions. Once finished with your notebook copy, proceed to Step 2!
                </div>
              )}
            </div>

            {/* Move to Step 2 */}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  setCurrentStep('write');
                  setIsWriteTimerRunning(true);
                }}
                className="flex items-center gap-2 bg-stone-900 text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-stone-800 transition-colors shadow-xs"
              >
                <span>Done Copying &rarr; Begin 15m Writing Sprint</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: WRITE SPRINT (15 MIN) */}
        {currentStep === 'write' && (
          <div className="mt-5 space-y-4">
            {/* Prompt Selector & Rules Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50 p-3 rounded-lg border border-stone-200 text-xs">
              <div className="flex items-center gap-2 flex-1">
                <span className="font-semibold text-stone-700 shrink-0">Topic:</span>
                <select
                  value={selectedPrompt}
                  onChange={(e) => setSelectedPrompt(e.target.value)}
                  className="bg-white border border-stone-300 text-xs rounded px-2 py-1 text-stone-800 font-medium focus:outline-none w-full max-w-md truncate"
                >
                  {PHASE1_WRITING_PROMPTS.map((p, idx) => (
                    <option key={idx} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* 15m timer & controls */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-1.5 font-mono-code font-bold text-stone-900 text-sm bg-white px-3 py-1 rounded border border-stone-200">
                  <span>{formatTimer(writeTimeSeconds)}</span>
                </div>
                <button
                  onClick={() => setIsWriteTimerRunning(!isWriteTimerRunning)}
                  className="px-3 py-1 rounded bg-stone-900 text-white text-xs font-medium hover:bg-stone-800 flex items-center gap-1"
                >
                  {isWriteTimerRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  <span>{isWriteTimerRunning ? 'Pause' : 'Resume'}</span>
                </button>
                <button
                  onClick={() => {
                    setIsWriteTimerRunning(false);
                    setWriteTimeSeconds(15 * 60);
                  }}
                  className="p-1 text-stone-400 hover:text-stone-700"
                  title="Reset timer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Sentence Rules reminder drawer */}
            <div className="border border-stone-200 rounded-lg overflow-hidden bg-white">
              <button
                onClick={() => setShowSentenceRulesDrawer(!showSentenceRulesDrawer)}
                className="w-full flex items-center justify-between p-2.5 bg-stone-100/70 hover:bg-stone-100 text-xs text-stone-700 font-medium transition-colors"
              >
                <span className="flex items-center gap-1.5 font-semibold text-stone-800">
                  <Info className="w-3.5 h-3.5 text-stone-600" />
                  Phase 1 Sentence Rules (Keep in mind as you draft):
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${
                    showSentenceRulesDrawer ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {showSentenceRulesDrawer && (
                <div className="p-3 text-xs text-stone-600 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-stone-50/50">
                  <div className="border-l-2 border-stone-400 pl-2">
                    <span className="font-semibold text-stone-900 block">1. One idea</span>
                    <span>One thought per sentence. Do not combine yet.</span>
                  </div>
                  <div className="border-l-2 border-stone-400 pl-2">
                    <span className="font-semibold text-stone-900 block">2. Early Subject/Verb</span>
                    <span>Subject & verb in the first five words.</span>
                  </div>
                  <div className="border-l-2 border-stone-400 pl-2">
                    <span className="font-semibold text-stone-900 block">3. 10–20 words</span>
                    <span>No sentence runs over 20 words in Phase 1.</span>
                  </div>
                  <div className="border-l-2 border-stone-400 pl-2">
                    <span className="font-semibold text-stone-900 block">4. Simplest true sentence</span>
                    <span>When stuck: &ldquo;The board did not boot.&rdquo;</span>
                  </div>
                </div>
              )}
            </div>

            {/* PURE UNAIDED WRITING CANVAS */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-stone-500">
                <input
                  type="text"
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  placeholder="Piece title..."
                  className="font-serif-prose font-bold text-base text-stone-900 bg-transparent border-b border-transparent hover:border-stone-200 focus:border-stone-400 focus:outline-none px-1 py-0.5 w-72"
                />

                {/* Word & Pace Tracker */}
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 font-mono-code">
                    <span className="font-bold text-stone-900">{wordCount}</span>
                    <span className="text-stone-500">words</span>
                  </span>
                  <span className="text-stone-300">·</span>
                  <span className="text-stone-500">
                    Target: <strong className="text-stone-800">150 words</strong> (Phase 1 Gate)
                  </span>
                  <span className="text-stone-300">·</span>
                  <span className="font-mono-code text-stone-600">
                    {wordsPerMinute} wpm
                  </span>
                </div>
              </div>

              {/* The Distraction-Free Unaided Editor */}
              {/* Autocomplete is OFF, spellcheck is OFF during drafting to prevent hesitation */}
              <div className="relative">
                <textarea
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="sentences"
                  spellCheck="false"
                  placeholder="Write without stopping about familiar topics. Do not delete, do not hesitate, do not search for fancy words. Write plain, true sentences..."
                  className="w-full h-80 p-5 bg-[#fefefe] border border-stone-300 rounded-xl text-base font-serif-prose text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400/40 leading-relaxed shadow-inner resize-y placeholder:text-stone-400"
                />

                {/* Gate Progress Bar on bottom of editor */}
                <div className="absolute bottom-2 left-4 right-4 flex items-center justify-between pointer-events-none text-[11px] text-stone-400 bg-white/90 backdrop-blur-xs py-1 px-3 rounded border border-stone-200">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-stone-600">Phase 1 Gate Pace:</span>
                    <div className="w-36 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          wordCount >= 150 ? 'bg-emerald-500' : 'bg-stone-600'
                        }`}
                        style={{ width: `${Math.min(100, (wordCount / 150) * 100)}%` }}
                      />
                    </div>
                    <span className="font-mono-code text-stone-700">
                      {wordCount}/150 words
                    </span>
                  </div>
                  <span>Rule: Do not backspace or edit while writing. Keep moving.</span>
                </div>
              </div>
            </div>

            {/* Move to Step 3 */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-stone-500">
                {wordCount >= 150 ? (
                  <span className="text-emerald-700 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Sprint Goal Achieved (150+ words in 15 min)!
                  </span>
                ) : (
                  <span>Write continuously until the 15m timer rings. Quality comes later.</span>
                )}
              </span>

              <button
                onClick={() => {
                  setCurrentStep('check');
                  setIsCheckTimerRunning(true);
                  setLocalAnalysis(analyzeProse(draftText, 1));
                }}
                disabled={wordCount === 0}
                className="flex items-center gap-2 bg-stone-900 text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-stone-800 disabled:opacity-50 transition-colors shadow-xs"
              >
                <span>Draft Done &rarr; Step 3: Check & Read Aloud (5m)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: CHECK & SELF-UNDERLINE (5 MIN) */}
        {currentStep === 'check' && (
          <div className="mt-5 space-y-5">
            {/* Check Step Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50 p-3 rounded-lg border border-stone-200 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-stone-800">
                  Read Aloud & Self-Correction (5 min)
                </span>
                <span className="text-stone-300">·</span>
                <span className="text-stone-600">
                  &ldquo;Read it aloud. Underline 3 problems yourself.&rdquo;
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="font-mono-code font-bold text-stone-800 text-sm bg-white px-2.5 py-1 rounded border border-stone-200">
                  {formatTimer(checkTimeSeconds)}
                </div>
                <button
                  onClick={handleReadAloud}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium border transition-colors ${
                    isPlayingAudio
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                  }`}
                  title="Uses browser speech synthesis to read your draft aloud"
                >
                  <Volume2 className="w-3.5 h-3.5 text-stone-600" />
                  <span>{isPlayingAudio ? 'Stop Reading' : 'Listen Aloud'}</span>
                </button>
              </div>
            </div>

            {/* Read & Underline Interaction */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Left 2 Cols: The Draft with Selection listener */}
              <div className="md:col-span-2 space-y-3">
                <div className="flex items-center justify-between text-xs text-stone-500">
                  <span className="font-medium text-stone-700">Your Draft for Self-Check:</span>
                  <span className="italic">Highlight words or sentences to underline a problem</span>
                </div>

                <div
                  onMouseUp={handleTextSelect}
                  className="p-5 bg-white border border-stone-300 rounded-xl font-serif-prose text-base text-stone-900 leading-relaxed min-h-60 select-text cursor-text"
                >
                  {draftText ? (
                    draftText.split('\n\n').map((paragraph, pIdx) => (
                      <p key={pIdx} className="mb-4">
                        {paragraph}
                      </p>
                    ))
                  ) : (
                    <span className="text-stone-400 italic">No text drafted yet.</span>
                  )}
                </div>

                {/* Underline Action Drawer when text is selected */}
                {selectedSnippet && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-2 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-amber-900">
                        Selected: &ldquo;{selectedSnippet}&rdquo;
                      </span>
                      <button
                        onClick={() => setSelectedSnippet('')}
                        className="text-stone-400 hover:text-stone-600"
                      >
                        Cancel
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newUnderlineNote}
                        onChange={(e) => setNewUnderlineNote(e.target.value)}
                        placeholder="What's the issue? (e.g. Missing article, >20 words, delayed verb)"
                        className="flex-1 bg-white border border-amber-300 rounded px-2.5 py-1 text-xs text-stone-800 focus:outline-none"
                      />
                      <button
                        onClick={addSelfUnderline}
                        className="bg-stone-900 text-white px-3 py-1 rounded text-xs font-medium hover:bg-stone-800"
                      >
                        Add Underline
                      </button>
                    </div>
                  </div>
                )}

                {/* Self Underlined List */}
                <div className="bg-stone-50 rounded-lg border border-stone-200 p-3 text-xs space-y-2">
                  <div className="flex items-center justify-between font-semibold text-stone-700">
                    <span>Problems Underlined by You ({selfUnderlines.length}/3 target):</span>
                    {selfUnderlines.length >= 3 && (
                      <span className="text-emerald-700 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Gate Requirement Met
                      </span>
                    )}
                  </div>
                  {selfUnderlines.length === 0 ? (
                    <p className="text-stone-400 italic">
                      No problems underlined yet. Read aloud and look for awkward phrasing, missing &lsquo;a/the&rsquo;, or long sentences.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {selfUnderlines.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded border border-stone-200"
                        >
                          <div>
                            <span className="font-medium text-stone-900 underline decoration-amber-500 decoration-2">
                              {item.snippet}
                            </span>
                            <span className="text-stone-500 ml-2">({item.note})</span>
                          </div>
                          <button
                            onClick={() => {
                              onAddErrorToTracker(
                                item.note || 'Self-identified',
                                item.snippet,
                                '[Self-Repair in progress]',
                                'Logged from Phase 1 check'
                              );
                            }}
                            className="text-[11px] text-stone-700 bg-stone-100 hover:bg-stone-200 px-2 py-0.5 rounded border border-stone-200 flex items-center gap-1"
                          >
                            <Plus className="w-2.5 h-2.5" />
                            <span>Log to Error Tracker</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Col: Strict Mentor AI Diagnostic Assistant */}
              <div className="space-y-4">
                <div className="bg-white border border-stone-200 rounded-xl p-4 text-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                    <span className="font-semibold text-stone-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-stone-700" />
                      Strict Rule AI Coach
                    </span>
                    <span className="text-[10px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded font-medium">
                      Zero Rewrites
                    </span>
                  </div>

                  <p className="text-[11px] text-stone-500 leading-relaxed">
                    Following King&apos;s rule: AI marks errors and explains grammar rules, but{' '}
                    <strong className="text-stone-800">never rewrites or drafts for you</strong>.
                    You do the repair.
                  </p>

                  <button
                    onClick={handleRunDiagnostic}
                    disabled={isAnalyzing || !draftText.trim()}
                    className="w-full flex items-center justify-center gap-2 bg-stone-900 text-white py-2 px-3 rounded-lg font-medium hover:bg-stone-800 disabled:opacity-50 transition-colors shadow-xs"
                  >
                    {isAnalyzing ? (
                      <span>Diagnosing Draft...</span>
                    ) : (
                      <>
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Run Mentor Diagnostic</span>
                      </>
                    )}
                  </button>

                  {/* AI Results */}
                  {aiAnalysisResult && (
                    <div className="space-y-3 pt-2">
                      {aiAnalysisResult.summary && (
                        <div className="p-2.5 bg-stone-50 rounded border border-stone-200 text-stone-700 text-[11px] italic">
                          &ldquo;{aiAnalysisResult.summary}&rdquo;
                        </div>
                      )}

                      <div className="space-y-2">
                        <span className="font-semibold text-stone-800 block">
                          Identified Error Categories:
                        </span>
                        {(!aiAnalysisResult.errors || aiAnalysisResult.errors.length === 0) ? (
                          <p className="text-stone-500 italic text-[11px]">
                            No major structural violations detected in this sprint!
                          </p>
                        ) : (
                          aiAnalysisResult.errors.map((err, idx) => (
                            <div
                              key={idx}
                              className="p-2.5 bg-red-50/60 border border-red-200/80 rounded-lg text-[11px] space-y-1.5"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-red-900">{err.type}</span>
                                <button
                                  onClick={() =>
                                    onAddErrorToTracker(
                                      err.type,
                                      err.snippet,
                                      '[Repair pending]',
                                      err.ruleExplanation
                                    )
                                  }
                                  className="text-[10px] text-stone-700 bg-white hover:bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200"
                                >
                                  + Add to Tracker
                                </button>
                              </div>
                              <p className="text-stone-800 font-mono-code bg-white/80 p-1 rounded border border-red-100 text-[10px]">
                                &ldquo;{err.snippet}&rdquo;
                              </p>
                              <p className="text-stone-700 leading-tight">
                                {err.ruleExplanation}
                              </p>
                              {err.hintQuestion && (
                                <p className="text-stone-600 font-medium italic">
                                  Hint: {err.hintQuestion}
                                </p>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Complete Session Action Bar */}
            <div className="border-t border-stone-200 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-stone-600">
                <span className="font-medium text-stone-900">Sprint Summary:</span>{' '}
                {wordCount} words written · {wordsPerMinute} wpm · {selfUnderlines.length} self-identified errors
              </div>

              <div className="flex items-center gap-3">
                {sessionSaved ? (
                  <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Session Saved to Permanent Log!
                  </span>
                ) : (
                  <button
                    onClick={handleFinishSession}
                    className="flex items-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-white px-5 py-2.5 rounded-lg text-xs font-semibold shadow-xs transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Complete Session & Update Gate Progress</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
