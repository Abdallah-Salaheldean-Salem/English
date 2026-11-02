import React, { useState } from 'react';
import {
  FRANKLIN_REBUILD_MODELS,
  SENTENCE_COMBINING_PROMPTS,
  SUMMARY_EXCERPTS
} from '../data/models';
import { FranklinSession, WritingSession } from '../types';
import {
  Shuffle,
  Eye,
  EyeOff,
  CheckCircle2,
  Calendar,
  BookOpen,
  ArrowRight,
  Split,
  FileCheck,
  ListOrdered,
  HelpCircle
} from 'lucide-react';

interface Phase2DrillsProps {
  onSessionComplete: (session: WritingSession) => void;
  onAddErrorToTracker: (type: string, whatIWrote: string, correctForm: string, notes?: string) => void;
}

export const Phase2Drills: React.FC<Phase2DrillsProps> = ({
  onSessionComplete,
  onAddErrorToTracker
}) => {
  // Selected drill sub-tab
  const [selectedDrill, setSelectedDrill] = useState<
    'franklin' | 'sentence_combining' | 'summary' | 'six_step' | 'weekend'
  >('franklin');

  // FRANKLIN REBUILD STATE
  const [modelIndex, setModelIndex] = useState(0);
  const [franklinStep, setFranklinStep] = useState<'notes' | 'rebuild' | 'compare'>('notes');
  const [sentenceNotes, setSentenceNotes] = useState<string[]>(['', '', '', '', '']);
  const [isShuffled, setIsShuffled] = useState(false);
  const [rebuiltText, setRebuiltText] = useState('');
  const [diff1, setDiff1] = useState('');
  const [diff2, setDiff2] = useState('');
  const [hideOriginalInRebuild, setHideOriginalInRebuild] = useState(true);

  // SENTENCE COMBINING STATE
  const [combiningIndex, setCombiningIndex] = useState(0);
  const [combination1, setCombination1] = useState('');
  const [combination2, setCombination2] = useState('');
  const [combination3, setCombination3] = useState('');

  // SUMMARY DRILL STATE
  const [summaryArticleIndex, setSummaryArticleIndex] = useState(0);
  const [summaryText, setSummaryText] = useState('');

  // 6-STEP PARAGRAPH STATE
  const [step1Point, setStep1Point] = useState('');
  const [step2Notes, setStep2Notes] = useState('');
  const [step3Order, setStep3Order] = useState('');
  const [step4Draft, setStep4Draft] = useState('');
  const [step5LinkCheck, setStep5LinkCheck] = useState(false);
  const [step6CloseCheck, setStep6CloseCheck] = useState(false);

  // WEEKEND DEEP PIECE STATE (60m)
  const [weekendTitle, setWeekendTitle] = useState('Weekend Deep Piece');
  const [weekendContent, setWeekendContent] = useState('');
  const [weekendChecklist, setWeekendChecklist] = useState({
    pointInFirstSentence: false,
    picksUpFromPrevious: false,
    noSentencePast25Words: false,
    openingStatesProblemWithCost: false,
    readsAloudWithoutStumbling: false
  });

  const currentFranklinModel = FRANKLIN_REBUILD_MODELS[modelIndex];
  const currentCombiningPrompt = SENTENCE_COMBINING_PROMPTS[combiningIndex];
  const currentSummaryExcerpt = SUMMARY_EXCERPTS[summaryArticleIndex];

  // Helper for sentence counts
  const modelSentences = currentFranklinModel.text
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  // Shuffle notes for Franklin's variation
  const handleShuffleNotes = () => {
    setIsShuffled(true);
    setSentenceNotes([...sentenceNotes].sort(() => Math.random() - 0.5));
  };

  // Word counter helper
  const countWords = (text: string) =>
    text.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs">
        <div className="border-b border-stone-100 pb-4 mb-4">
          <div className="flex items-center gap-2 text-xs text-stone-500 mb-1">
            <span>Phase 2: Control (Weeks 5–12)</span>
            <span>·</span>
            <span>Target: Paragraph Mastery by Deliberate Practice</span>
          </div>
          <h1 className="font-serif-prose text-2xl font-bold text-stone-900">
            Deliberate Daily Drills
          </h1>
          <p className="text-xs text-stone-600 mt-0.5">
            Methods ranked highest in the <em>Writing Next</em> review: studying models, sentence combining, summarizing, and structural planning.
          </p>
        </div>

        {/* Drill Weekday Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
          <button
            onClick={() => setSelectedDrill('franklin')}
            className={`p-2.5 rounded-lg border text-left transition-all ${
              selectedDrill === 'franklin'
                ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
            }`}
          >
            <span className="text-[10px] uppercase font-bold block opacity-70">Mon & Wed</span>
            <span className="font-semibold block mt-0.5">Franklin Rebuild</span>
            <span className="text-[11px] opacity-80 block truncate">Separate ideas from wording</span>
          </button>

          <button
            onClick={() => setSelectedDrill('sentence_combining')}
            className={`p-2.5 rounded-lg border text-left transition-all ${
              selectedDrill === 'sentence_combining'
                ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
            }`}
          >
            <span className="text-[10px] uppercase font-bold block opacity-70">Tuesday</span>
            <span className="font-semibold block mt-0.5">Sentence Combining</span>
            <span className="text-[11px] opacity-80 block truncate">Variety & syntactic control</span>
          </button>

          <button
            onClick={() => setSelectedDrill('summary')}
            className={`p-2.5 rounded-lg border text-left transition-all ${
              selectedDrill === 'summary'
                ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
            }`}
          >
            <span className="text-[10px] uppercase font-bold block opacity-70">Thursday</span>
            <span className="font-semibold block mt-0.5">100-Word Summary</span>
            <span className="text-[11px] opacity-80 block truncate">Finding the main point</span>
          </button>

          <button
            onClick={() => setSelectedDrill('six_step')}
            className={`p-2.5 rounded-lg border text-left transition-all ${
              selectedDrill === 'six_step'
                ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
            }`}
          >
            <span className="text-[10px] uppercase font-bold block opacity-70">Friday</span>
            <span className="font-semibold block mt-0.5">6-Step Paragraph</span>
            <span className="text-[11px] opacity-80 block truncate">Point, notes, order, draft</span>
          </button>

          <button
            onClick={() => setSelectedDrill('weekend')}
            className={`p-2.5 rounded-lg border text-left transition-all ${
              selectedDrill === 'weekend'
                ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
            }`}
          >
            <span className="text-[10px] uppercase font-bold block opacity-70">Weekend (60m)</span>
            <span className="font-semibold block mt-0.5">Deep Piece (400–600w)</span>
            <span className="text-[11px] opacity-80 block truncate">5-point revision audit</span>
          </button>
        </div>

        {/* 1. FRANKLIN REBUILD DRILL */}
        {selectedDrill === 'franklin' && (
          <div className="mt-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50 p-3 rounded-lg border border-stone-200 text-xs">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-stone-700" />
                <span className="font-bold text-stone-800">Model Passage:</span>
                <select
                  value={modelIndex}
                  onChange={(e) => {
                    setModelIndex(Number(e.target.value));
                    setFranklinStep('notes');
                    setSentenceNotes(['', '', '', '', '']);
                    setRebuiltText('');
                  }}
                  className="bg-white border border-stone-300 text-xs rounded px-2 py-1 text-stone-800 font-medium"
                >
                  {FRANKLIN_REBUILD_MODELS.map((m, idx) => (
                    <option key={m.id} value={idx}>
                      {m.author} — {m.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sub-steps */}
              <div className="flex items-center gap-1 bg-white p-1 rounded border border-stone-200">
                <button
                  onClick={() => setFranklinStep('notes')}
                  className={`px-2.5 py-1 rounded font-medium ${
                    franklinStep === 'notes' ? 'bg-stone-900 text-white' : 'text-stone-600'
                  }`}
                >
                  Part 1: Take 3-5 Word Notes
                </button>
                <button
                  onClick={() => setFranklinStep('rebuild')}
                  className={`px-2.5 py-1 rounded font-medium ${
                    franklinStep === 'rebuild' ? 'bg-stone-900 text-white' : 'text-stone-600'
                  }`}
                >
                  Part 2: Rebuild from Notes
                </button>
                <button
                  onClick={() => setFranklinStep('compare')}
                  className={`px-2.5 py-1 rounded font-medium ${
                    franklinStep === 'compare' ? 'bg-stone-900 text-white' : 'text-stone-600'
                  }`}
                >
                  Part 3: Compare & 2 Differences
                </button>
              </div>
            </div>

            {/* Step 1: Monday Notes */}
            {franklinStep === 'notes' && (
              <div className="space-y-4">
                <div className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-4">
                  <div className="text-[11px] font-bold text-amber-950 uppercase tracking-wider mb-1">
                    Original Model ({currentFranklinModel.author})
                  </div>
                  <p className="font-serif-prose text-base text-stone-900 leading-relaxed">
                    {currentFranklinModel.text}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-stone-600">
                    <span className="font-semibold text-stone-800">
                      Write a 3–5 word note capturing the idea of each sentence (put wording away):
                    </span>
                    <button
                      onClick={handleShuffleNotes}
                      className="flex items-center gap-1 text-[11px] text-stone-700 bg-stone-100 hover:bg-stone-200 px-2.5 py-1 rounded border border-stone-300"
                      title="Franklin's variation: shuffle notes to practice arranging thoughts"
                    >
                      <Shuffle className="w-3 h-3 text-stone-600" />
                      <span>Franklin&apos;s Variation: Shuffle Notes</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {modelSentences.map((sentence, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
                        <span className="font-mono-code text-stone-400 w-6 shrink-0">
                          #{idx + 1}
                        </span>
                        <div className="flex-1 text-stone-600 font-serif-prose text-xs bg-stone-50 p-2 rounded border border-stone-200">
                          &ldquo;{sentence}&rdquo;
                        </div>
                        <input
                          type="text"
                          value={sentenceNotes[idx] || ''}
                          onChange={(e) => {
                            const updated = [...sentenceNotes];
                            updated[idx] = e.target.value;
                            setSentenceNotes(updated);
                          }}
                          placeholder="3–5 word note of the core idea..."
                          className="w-full sm:w-64 bg-white border border-stone-300 rounded px-2.5 py-1.5 text-xs text-stone-900 font-medium focus:ring-1 focus:ring-stone-400 focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-3">
                  <button
                    onClick={() => setFranklinStep('rebuild')}
                    className="flex items-center gap-2 bg-stone-900 text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-stone-800 transition-colors shadow-xs"
                  >
                    <span>Proceed to Rebuild (Original Will Be Put Away)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Wednesday Rebuild */}
            {franklinStep === 'rebuild' && (
              <div className="space-y-4">
                <div className="p-4 bg-stone-100/70 border border-stone-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-stone-700">
                    <span>Your Sentence Notes (Ideas Only):</span>
                    {isShuffled && (
                      <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded text-[11px]">
                        Shuffled Notes Variation Active
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {sentenceNotes.filter(Boolean).map((n, i) => (
                      <div key={i} className="bg-white p-2 rounded border border-stone-200 flex items-center gap-2">
                        <span className="font-mono-code text-stone-400 text-[10px]">Note {i + 1}:</span>
                        <span className="font-medium text-stone-800">&ldquo;{n}&rdquo;</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-stone-600">
                    <span className="font-semibold text-stone-800">
                      Rebuild the paragraph from your notes only (Original is tucked away):
                    </span>
                    <button
                      onClick={() => setHideOriginalInRebuild(!hideOriginalInRebuild)}
                      className="flex items-center gap-1 text-[11px] text-stone-500 hover:text-stone-800"
                    >
                      {hideOriginalInRebuild ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      <span>{hideOriginalInRebuild ? 'Peek Original' : 'Hide Original'}</span>
                    </button>
                  </div>

                  {!hideOriginalInRebuild && (
                    <div className="p-3 bg-amber-50 text-stone-700 font-serif-prose text-xs rounded border border-amber-200">
                      {currentFranklinModel.text}
                    </div>
                  )}

                  <textarea
                    value={rebuiltText}
                    onChange={(e) => setRebuiltText(e.target.value)}
                    placeholder="Express each idea in full English sentences using the best words and sentence structures you can muster..."
                    className="w-full h-44 p-4 bg-white border border-stone-300 rounded-xl text-base font-serif-prose text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400 leading-relaxed"
                  />
                  <div className="text-right text-xs text-stone-500 font-mono-code">
                    {countWords(rebuiltText)} words
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setFranklinStep('compare')}
                    disabled={!rebuiltText.trim()}
                    className="flex items-center gap-2 bg-stone-900 text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-stone-800 disabled:opacity-50 transition-colors shadow-xs"
                  >
                    <span>Proceed to Side-by-Side Comparison</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Compare & Note 2 Differences */}
            {franklinStep === 'compare' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Original */}
                  <div className="bg-amber-50/40 border border-amber-200/80 rounded-xl p-4">
                    <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block mb-2">
                      Original ({currentFranklinModel.author})
                    </span>
                    <p className="font-serif-prose text-sm text-stone-900 leading-relaxed">
                      {currentFranklinModel.text}
                    </p>
                  </div>

                  {/* Student Rebuild */}
                  <div className="bg-white border border-stone-300 rounded-xl p-4">
                    <span className="text-[11px] font-bold text-stone-700 uppercase tracking-wider block mb-2">
                      Your Reconstructed Version
                    </span>
                    <p className="font-serif-prose text-sm text-stone-900 leading-relaxed">
                      {rebuiltText || 'No rebuilt text provided.'}
                    </p>
                  </div>
                </div>

                {/* Note 2 Differences */}
                <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-3 text-xs">
                  <span className="font-bold text-stone-900 block">
                    Note 2 differences in word choice and structure (Franklin Rebuild Gate):
                  </span>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={diff1}
                      onChange={(e) => setDiff1(e.target.value)}
                      placeholder="Difference 1 (e.g. Model used an active verb 'allotted' while I used a passive 'was given')..."
                      className="w-full bg-white border border-stone-300 rounded px-3 py-2 text-stone-900"
                    />
                    <input
                      type="text"
                      value={diff2}
                      onChange={(e) => setDiff2(e.target.value)}
                      placeholder="Difference 2 (e.g. Model opened with a subordinate clause; my sentence was fragmented)..."
                      className="w-full bg-white border border-stone-300 rounded px-3 py-2 text-stone-900"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      onSessionComplete({
                        id: 'franklin-' + Date.now(),
                        date: new Date().toISOString().split('T')[0],
                        phase: 2,
                        drillType: 'franklin_rebuild',
                        title: `Franklin Rebuild: ${currentFranklinModel.title}`,
                        content: rebuiltText,
                        wordCount: countWords(rebuiltText),
                        durationMinutes: 25,
                        selfFoundErrorsCount: diff1 && diff2 ? 2 : 1,
                        completed: true
                      });
                      alert('Franklin Rebuild saved! Gate progress updated (target: 6 rebuilds).');
                    }}
                    className="flex items-center gap-2 bg-emerald-800 text-white px-5 py-2.5 rounded-lg text-xs font-semibold hover:bg-emerald-900 shadow-xs"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save Franklin Drill & Update Gate</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. SENTENCE COMBINING DRILL (TUESDAY) */}
        {selectedDrill === 'sentence_combining' && (
          <div className="mt-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50 p-3 rounded-lg border border-stone-200 text-xs">
              <div className="flex items-center gap-2">
                <Split className="w-4 h-4 text-stone-700" />
                <span className="font-bold text-stone-800">Prompt Set:</span>
                <select
                  value={combiningIndex}
                  onChange={(e) => setCombiningIndex(Number(e.target.value))}
                  className="bg-white border border-stone-300 text-xs rounded px-2 py-1 text-stone-800 font-medium"
                >
                  {SENTENCE_COMBINING_PROMPTS.map((p, idx) => (
                    <option key={p.id} value={idx}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
              <span className="text-stone-500">
                Rule: Join 6 short sentences into 2–3 longer ones, 3 different ways.
              </span>
            </div>

            {/* The 6 source sentences */}
            <div className="bg-amber-50/40 border border-amber-200 rounded-xl p-4 space-y-2">
              <span className="text-[11px] font-bold text-amber-950 uppercase tracking-wider block">
                6 Source Sentences:
              </span>
              <ol className="list-decimal list-inside space-y-1 text-xs text-stone-800 font-serif-prose">
                {currentCombiningPrompt.sourceSentences.map((s, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {s}
                  </li>
                ))}
              </ol>
              {currentCombiningPrompt.exampleApproach && (
                <div className="mt-2 pt-2 border-t border-amber-200/60 text-[11px] text-stone-600 italic">
                  Tip: {currentCombiningPrompt.exampleApproach}
                </div>
              )}
            </div>

            {/* 3 Variations */}
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-700">
                  Variation A (e.g. Lead with coordinating conjunctions and time clauses):
                </label>
                <textarea
                  value={combination1}
                  onChange={(e) => setCombination1(e.target.value)}
                  placeholder="Combine into 2-3 longer sentences..."
                  className="w-full h-20 p-3 bg-white border border-stone-300 rounded-lg text-sm font-serif-prose text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-700">
                  Variation B (e.g. Lead with participle phrases or relative clauses &lsquo;which/that&rsquo;):
                </label>
                <textarea
                  value={combination2}
                  onChange={(e) => setCombination2(e.target.value)}
                  placeholder="Combine using a distinct syntactic approach..."
                  className="w-full h-20 p-3 bg-white border border-stone-300 rounded-lg text-sm font-serif-prose text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-700">
                  Variation C (e.g. Semicolon connection or inversion):
                </label>
                <textarea
                  value={combination3}
                  onChange={(e) => setCombination3(e.target.value)}
                  placeholder="Combine a third way..."
                  className="w-full h-20 p-3 bg-white border border-stone-300 rounded-lg text-sm font-serif-prose text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => {
                  onSessionComplete({
                    id: 'combining-' + Date.now(),
                    date: new Date().toISOString().split('T')[0],
                    phase: 2,
                    drillType: 'sentence_combining',
                    title: `Sentence Combining: ${currentCombiningPrompt.title}`,
                    content: `Variation A:\n${combination1}\n\nVariation B:\n${combination2}\n\nVariation C:\n${combination3}`,
                    wordCount: countWords(combination1 + ' ' + combination2 + ' ' + combination3),
                    durationMinutes: 25,
                    selfFoundErrorsCount: 0,
                    completed: true
                  });
                  alert('Tuesday drill completed and logged!');
                }}
                disabled={!combination1.trim() || !combination2.trim()}
                className="flex items-center gap-2 bg-emerald-800 text-white px-5 py-2.5 rounded-lg text-xs font-semibold hover:bg-emerald-900 disabled:opacity-50 shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Tuesday Combining Drill</span>
              </button>
            </div>
          </div>
        )}

        {/* 3. SUMMARY DRILL (THURSDAY) */}
        {selectedDrill === 'summary' && (
          <div className="mt-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50 p-3 rounded-lg border border-stone-200 text-xs">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-stone-700" />
                <span className="font-bold text-stone-800">Article to Condense:</span>
                <select
                  value={summaryArticleIndex}
                  onChange={(e) => setSummaryArticleIndex(Number(e.target.value))}
                  className="bg-white border border-stone-300 text-xs rounded px-2 py-1 text-stone-800 font-medium"
                >
                  {SUMMARY_EXCERPTS.map((e, idx) => (
                    <option key={e.id} value={idx}>
                      {e.title}
                    </option>
                  ))}
                </select>
              </div>
              <span className="text-stone-500">
                Rule: Exactly ~100 words (95–105 target range).
              </span>
            </div>

            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
              <span className="text-[11px] font-bold text-stone-600 uppercase tracking-wider block mb-1">
                Excerpt:
              </span>
              <p className="font-serif-prose text-sm text-stone-800 leading-relaxed">
                {currentSummaryExcerpt.text}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-stone-600">
                <span className="font-semibold text-stone-800">
                  Your 100-Word Summary (State the main thesis and core conclusion):
                </span>
                <div className="flex items-center gap-2 font-mono-code text-xs">
                  <span>Count:</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded ${
                      countWords(summaryText) >= 95 && countWords(summaryText) <= 105
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-stone-200 text-stone-800'
                    }`}
                  >
                    {countWords(summaryText)} / 100 words
                  </span>
                </div>
              </div>

              <textarea
                value={summaryText}
                onChange={(e) => setSummaryText(e.target.value)}
                placeholder="Condense to approximately 100 words without losing the essential point..."
                className="w-full h-36 p-4 bg-white border border-stone-300 rounded-xl text-base font-serif-prose text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400 leading-relaxed"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => {
                  onSessionComplete({
                    id: 'summary-' + Date.now(),
                    date: new Date().toISOString().split('T')[0],
                    phase: 2,
                    drillType: 'summary_100w',
                    title: `100w Summary: ${currentSummaryExcerpt.title}`,
                    content: summaryText,
                    wordCount: countWords(summaryText),
                    durationMinutes: 25,
                    selfFoundErrorsCount: 0,
                    completed: true
                  });
                  alert('Thursday 100-word summary logged!');
                }}
                disabled={countWords(summaryText) < 50}
                className="flex items-center gap-2 bg-emerald-800 text-white px-5 py-2.5 rounded-lg text-xs font-semibold hover:bg-emerald-900 disabled:opacity-50 shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Thursday Summary Drill</span>
              </button>
            </div>
          </div>
        )}

        {/* 4. SIX-STEP PARAGRAPH DRILL (FRIDAY) */}
        {selectedDrill === 'six_step' && (
          <div className="mt-6 space-y-4">
            <div className="bg-stone-50 p-3 rounded-lg border border-stone-200 text-xs text-stone-700">
              <span className="font-bold text-stone-900 block mb-1">
                Friday Drill: The 6-Step Paragraph Method
              </span>
              <span>1. Point &rarr; 2. Notes &rarr; 3. Order &rarr; 4. Draft &rarr; 5. Link &rarr; 6. Close.</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-stone-800">
                  Step 1: Point (The single governing idea of the paragraph)
                </label>
                <input
                  type="text"
                  value={step1Point}
                  onChange={(e) => setStep1Point(e.target.value)}
                  placeholder="e.g. Premature optimization hides architectural flaws..."
                  className="w-full bg-white border border-stone-300 rounded px-3 py-2 text-stone-900"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-stone-800">
                  Step 2: Notes (3–4 raw supporting facts or observations)
                </label>
                <input
                  type="text"
                  value={step2Notes}
                  onChange={(e) => setStep2Notes(e.target.value)}
                  placeholder="e.g. Dev spent 3 days on micro-benchmarks; missed root cause; queries were N+1"
                  className="w-full bg-white border border-stone-300 rounded px-3 py-2 text-stone-900"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-stone-800">
                  Step 3: Order (Logical sequence: problem &rarr; evidence &rarr; consequence)
                </label>
                <input
                  type="text"
                  value={step3Order}
                  onChange={(e) => setStep3Order(e.target.value)}
                  placeholder="e.g. Sequence: Observation of latency -> False fix -> Uncovered root cause"
                  className="w-full bg-white border border-stone-300 rounded px-3 py-2 text-stone-900"
                />
              </div>

              <div className="space-y-2 p-3 bg-stone-50 rounded border border-stone-200">
                <span className="font-semibold text-stone-800 block">Steps 5 & 6 Checks:</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={step5LinkCheck}
                    onChange={(e) => setStep5LinkCheck(e.target.checked)}
                  />
                  <span>Step 5: Link (each sentence picks up a thread from the one before it)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={step6CloseCheck}
                    onChange={(e) => setStep6CloseCheck(e.target.checked)}
                  />
                  <span>Step 6: Close (final sentence snaps the point shut without rambling)</span>
                </label>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-800">
                Step 4: Draft the Paragraph:
              </label>
              <textarea
                value={step4Draft}
                onChange={(e) => setStep4Draft(e.target.value)}
                placeholder="Draft the controlled paragraph following your steps..."
                className="w-full h-32 p-3 bg-white border border-stone-300 rounded-xl text-base font-serif-prose text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400 leading-relaxed"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => {
                  onSessionComplete({
                    id: 'sixstep-' + Date.now(),
                    date: new Date().toISOString().split('T')[0],
                    phase: 2,
                    drillType: 'six_step_paragraph',
                    title: `6-Step Paragraph: ${step1Point.slice(0, 30) || 'Controlled Paragraph'}`,
                    content: step4Draft,
                    wordCount: countWords(step4Draft),
                    durationMinutes: 25,
                    selfFoundErrorsCount: 0,
                    completed: true
                  });
                  alert('Friday 6-Step paragraph logged!');
                }}
                disabled={!step4Draft.trim()}
                className="flex items-center gap-2 bg-emerald-800 text-white px-5 py-2.5 rounded-lg text-xs font-semibold hover:bg-emerald-900 disabled:opacity-50 shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Friday 6-Step Drill</span>
              </button>
            </div>
          </div>
        )}

        {/* 5. WEEKEND DEEP PIECE (60 MIN + REVISION CHECKLIST) */}
        {selectedDrill === 'weekend' && (
          <div className="mt-6 space-y-5">
            <div className="bg-stone-50 p-3 rounded-lg border border-stone-200 text-xs text-stone-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="font-bold text-stone-900 block">
                  Weekend Session (60 min): Whole-Piece Planning & Revision
                </span>
                <span>Plan and draft on Saturday, revise on Sunday. Target: 400–600 words.</span>
              </div>
              <div className="font-mono-code text-xs bg-white px-2 py-1 rounded border border-stone-200">
                {countWords(weekendContent)}/500 words
              </div>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                value={weekendTitle}
                onChange={(e) => setWeekendTitle(e.target.value)}
                placeholder="Piece title..."
                className="font-serif-prose font-bold text-lg text-stone-900 bg-transparent border-b border-stone-200 focus:border-stone-500 focus:outline-none px-1 py-1 w-full max-w-md"
              />

              <textarea
                value={weekendContent}
                onChange={(e) => setWeekendContent(e.target.value)}
                placeholder="Compose your 400–600 word whole-piece draft here..."
                className="w-full h-72 p-5 bg-white border border-stone-300 rounded-xl text-base font-serif-prose text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400 leading-relaxed"
              />
            </div>

            {/* Weekend Revision Checklist (From King's Plan) */}
            <div className="bg-stone-50 rounded-xl border border-stone-200 p-4 space-y-3">
              <div className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                Weekend Revision Checklist (Sunday Pass)
              </div>
              <div className="space-y-2 text-xs text-stone-700">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={weekendChecklist.pointInFirstSentence}
                    onChange={(e) =>
                      setWeekendChecklist({
                        ...weekendChecklist,
                        pointInFirstSentence: e.target.checked
                      })
                    }
                  />
                  <span>The point is in the first sentence of each paragraph.</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={weekendChecklist.picksUpFromPrevious}
                    onChange={(e) =>
                      setWeekendChecklist({
                        ...weekendChecklist,
                        picksUpFromPrevious: e.target.checked
                      })
                    }
                  />
                  <span>Each sentence picks up something from the one before it.</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={weekendChecklist.noSentencePast25Words}
                    onChange={(e) =>
                      setWeekendChecklist({
                        ...weekendChecklist,
                        noSentencePast25Words: e.target.checked
                      })
                    }
                  />
                  <span>No sentence runs past 25 words.</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={weekendChecklist.openingStatesProblemWithCost}
                    onChange={(e) =>
                      setWeekendChecklist({
                        ...weekendChecklist,
                        openingStatesProblemWithCost: e.target.checked
                      })
                    }
                  />
                  <span>
                    The opening states a problem (with <em>but</em>, <em>however</em> or{' '}
                    <em>although</em>) and what it costs, not background.
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={weekendChecklist.readsAloudWithoutStumbling}
                    onChange={(e) =>
                      setWeekendChecklist({
                        ...weekendChecklist,
                        readsAloudWithoutStumbling: e.target.checked
                      })
                    }
                  />
                  <span>It reads aloud without stumbling.</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => {
                  onSessionComplete({
                    id: 'weekend-' + Date.now(),
                    date: new Date().toISOString().split('T')[0],
                    phase: 2,
                    drillType: 'weekend_deep',
                    title: weekendTitle,
                    content: weekendContent,
                    wordCount: countWords(weekendContent),
                    durationMinutes: 60,
                    selfFoundErrorsCount: 0,
                    completed: true
                  });
                  alert('Weekend piece saved! Gate requirement progress updated (target: 8 pieces).');
                }}
                disabled={countWords(weekendContent) < 100}
                className="flex items-center gap-2 bg-emerald-800 text-white px-5 py-2.5 rounded-lg text-xs font-semibold hover:bg-emerald-900 disabled:opacity-50 shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Weekend Piece & Update Gate (8 required)</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
