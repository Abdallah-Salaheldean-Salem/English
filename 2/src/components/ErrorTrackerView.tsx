import React, { useState } from 'react';
import { ErrorLogItem } from '../types';
import {
  AlertCircle,
  Plus,
  Flame,
  CheckCircle2,
  Trash2,
  Dumbbell,
  ShieldCheck,
  Search,
  BookOpen
} from 'lucide-react';

interface ErrorTrackerViewProps {
  errorLog: ErrorLogItem[];
  onAddError: (errorType: string, whatIWrote: string, correctForm: string, notes?: string) => void;
  onUpdateError: (updatedItem: ErrorLogItem) => void;
  onDeleteError: (id: string) => void;
}

export const ErrorTrackerView: React.FC<ErrorTrackerViewProps> = ({
  errorLog,
  onAddError,
  onUpdateError,
  onDeleteError
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newType, setNewType] = useState('Missing article');
  const [newWhatIWrote, setNewWhatIWrote] = useState('');
  const [newCorrectForm, setNewCorrectForm] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Active targeted drill modal state
  const [activeDrillTarget, setActiveDrillTarget] = useState<ErrorLogItem | null>(null);
  const [drillAnswers, setDrillAnswers] = useState<string[]>(['', '', '']);
  const [drillCompleted, setDrillCompleted] = useState(false);

  // Common error types from King's plan
  const standardTypes = [
    'Missing article',
    'Article with a plural',
    'Missing to before a verb',
    'Noun used as an adjective',
    'Spelling',
    'Sentence too long (>20 words)',
    'Delayed subject/verb',
    'Run-on sentence',
    'Word choice / precision',
    'Dangling modifier'
  ];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWhatIWrote.trim() || !newCorrectForm.trim()) return;
    onAddError(newType, newWhatIWrote.trim(), newCorrectForm.trim(), newNotes.trim());
    setNewWhatIWrote('');
    setNewCorrectForm('');
    setNewNotes('');
    setShowAddModal(false);
  };

  const filtered = errorLog.filter(
    (e) =>
      e.errorType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.whatIWrote.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.correctForm.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeDrillTargets = errorLog.filter((e) => e.frequency >= 3);

  // Generate prompt sentences for active 3-strike drill
  const getDrillSentences = (errorType: string) => {
    if (errorType.includes('Missing to') || errorType.includes("'to'")) {
      return [
        { faulty: 'The engineer explained how configure the pipeline.', hint: 'Infinitive with how' },
        { faulty: 'She showed the team how deploy the service safely.', hint: 'Insert missing to' },
        { faulty: 'I forgot how reset the microcontroller clock.', hint: 'Infinitive phrase' }
      ];
    }
    if (errorType.includes('Missing article') || errorType.includes('article')) {
      return [
        { faulty: 'Client asked for new software update yesterday.', hint: 'Singular countable noun needs an article' },
        { faulty: 'We observed sudden drop in server memory.', hint: 'Needs article before sudden drop' },
        { faulty: 'He submitted bug report to repository.', hint: 'Needs article before bug report' }
      ];
    }
    return [
      { faulty: 'Write a sentence avoiding your typical mistake here.', hint: 'Self-repair drill' },
      { faulty: 'Compose a second variation demonstrating full control.', hint: 'Pattern reinforcement' },
      { faulty: 'Compose a third clean example.', hint: 'Automaticity' }
    ];
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Overview & Rule Banner */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-stone-500 mb-1">
              <span>Deliberate Practice Core</span>
              <span>·</span>
              <span>Self-Diagnostic Workbook</span>
            </div>
            <h1 className="font-serif-prose text-2xl font-bold text-stone-900">
              Error Log & 3-Strike Drills
            </h1>
            <p className="text-xs text-stone-600 mt-0.5">
              &ldquo;Every error you or I find goes here once. When the same type appears three times, it becomes a drill.&rdquo;
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 bg-stone-900 text-white px-3.5 py-2 rounded-lg text-xs font-semibold hover:bg-stone-800 transition-colors shadow-xs shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Error</span>
          </button>
        </div>

        {/* 3-Strike Alert Banner if any errors >= 3 */}
        {activeDrillTargets.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-red-900 font-bold text-xs uppercase tracking-wide">
              <Dumbbell className="w-4 h-4 text-red-700" />
              <span>Active 3-Strike Drill Targets ({activeDrillTargets.length})</span>
            </div>
            <p className="text-xs text-red-800">
              The following error patterns have appeared 3 or more times in your writing. Under King&apos;s plan, these are converted immediately into targeted drills to rewrite the neural reflex:
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {activeDrillTargets.map((target) => (
                <button
                  key={target.id}
                  onClick={() => {
                    setActiveDrillTarget(target);
                    setDrillAnswers(['', '', '']);
                    setDrillCompleted(false);
                  }}
                  className="flex items-center gap-2 bg-white text-red-900 hover:bg-red-100 border border-red-300 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                >
                  <span>{target.errorType} ({target.frequency}&times;)</span>
                  <span className="text-[10px] bg-red-200 text-red-900 px-1.5 py-0.5 rounded">
                    Launch Drill &rarr;
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs pt-1">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search error types or snippets..."
              className="w-full bg-stone-50 border border-stone-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-stone-400"
            />
          </div>

          <div className="flex items-center gap-3 text-stone-500">
            <span>{errorLog.length} error patterns logged</span>
            <span>·</span>
            <span>Phase 1 Gate: 4–5 recurring errors identified ({Math.min(5, errorLog.length)}/5)</span>
          </div>
        </div>

        {/* The Error Table */}
        <div className="overflow-x-auto border border-stone-200 rounded-xl">
          <table className="w-full text-left text-xs text-stone-700">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[11px] font-semibold">
              <tr>
                <th className="py-2.5 px-3">Error Type</th>
                <th className="py-2.5 px-3">What I Wrote (Faulty)</th>
                <th className="py-2.5 px-3">Correct Form (Repair)</th>
                <th className="py-2.5 px-3 text-center">Frequency</th>
                <th className="py-2.5 px-3 text-center">3-Strike Drill</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-stone-50/50 transition-colors">
                  <td className="py-3 px-3 font-semibold text-stone-900">
                    <div className="flex items-center gap-1.5">
                      {item.frequency >= 3 && (
                        <Flame className="w-3.5 h-3.5 text-red-600 shrink-0" />
                      )}
                      <span>{item.errorType}</span>
                    </div>
                    {item.notes && (
                      <span className="text-[11px] text-stone-500 font-normal block mt-0.5">
                        {item.notes}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 font-mono-code text-red-800 bg-red-50/30">
                    &ldquo;{item.whatIWrote}&rdquo;
                  </td>
                  <td className="py-3 px-3 font-mono-code text-emerald-800 bg-emerald-50/30 font-medium">
                    &ldquo;{item.correctForm}&rdquo;
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`inline-block font-mono-code font-bold px-2 py-0.5 rounded text-xs ${
                        item.frequency >= 3
                          ? 'bg-red-100 text-red-900'
                          : 'bg-stone-100 text-stone-700'
                      }`}
                    >
                      {item.frequency}&times;
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    {item.frequency >= 3 ? (
                      <button
                        onClick={() => {
                          setActiveDrillTarget(item);
                          setDrillAnswers(['', '', '']);
                          setDrillCompleted(false);
                        }}
                        className="text-[11px] font-semibold text-red-700 hover:text-red-900 underline"
                      >
                        Active Drill
                      </button>
                    ) : (
                      <span className="text-stone-400 text-[11px]">
                        {3 - item.frequency} more needed
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => onDeleteError(item.id)}
                      className="text-stone-400 hover:text-red-600 p-1 transition-colors"
                      title="Remove error"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Active 3-Strike Drill Exercise */}
      {activeDrillTarget && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-stone-200 max-w-xl w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-red-600" />
                <h3 className="font-serif-prose text-lg font-bold text-stone-900">
                  Targeted Drill: {activeDrillTarget.errorType}
                </h3>
              </div>
              <button
                onClick={() => setActiveDrillTarget(null)}
                className="text-stone-400 hover:text-stone-700 text-sm font-semibold"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              This error appeared 3 times. Deliberately rewrite the faulty test sentences below into clean, grammatically sound forms.
            </p>

            <div className="space-y-3">
              {getDrillSentences(activeDrillTarget.errorType).map((prompt, idx) => (
                <div key={idx} className="space-y-1.5 bg-stone-50 p-3 rounded-lg border border-stone-200 text-xs">
                  <div className="flex items-center justify-between text-stone-700">
                    <span className="font-medium text-red-900 font-mono-code">
                      Faulty: &ldquo;{prompt.faulty}&rdquo;
                    </span>
                    <span className="text-[11px] text-stone-500 italic">{prompt.hint}</span>
                  </div>
                  <input
                    type="text"
                    value={drillAnswers[idx]}
                    onChange={(e) => {
                      const updated = [...drillAnswers];
                      updated[idx] = e.target.value;
                      setDrillAnswers(updated);
                    }}
                    placeholder="Type your corrected version here unaided..."
                    className="w-full bg-white border border-stone-300 rounded px-2.5 py-1.5 text-xs text-stone-900 font-medium focus:outline-none focus:ring-1 focus:ring-stone-500"
                  />
                </div>
              ))}
            </div>

            {drillCompleted ? (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Drill completed! Rule pattern reinforced in neural memory.</span>
              </div>
            ) : (
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setActiveDrillTarget(null)}
                  className="px-3 py-1.5 text-xs text-stone-600 hover:text-stone-900"
                >
                  Close
                </button>
                <button
                  onClick={() => setDrillCompleted(true)}
                  disabled={drillAnswers.some((a) => !a.trim())}
                  className="bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-xs font-semibold shadow-xs"
                >
                  Verify & Finish Drill
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Add New Error */}
      {showAddModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-stone-200 max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-serif-prose text-lg font-bold text-stone-900">
                Log New Error Pattern
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-stone-400 hover:text-stone-700 text-sm font-semibold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-stone-700 block mb-1">
                  Error Category:
                </label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full bg-white border border-stone-300 rounded px-2.5 py-1.5 text-stone-900"
                >
                  {standardTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">
                  What I Wrote (Faulty snippet):
                </label>
                <input
                  type="text"
                  value={newWhatIWrote}
                  onChange={(e) => setNewWhatIWrote(e.target.value)}
                  placeholder="e.g. AI application wrote for me"
                  required
                  className="w-full bg-white border border-stone-300 rounded px-2.5 py-1.5 text-stone-900 font-mono-code"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">
                  Correct Form (Repaired syntax):
                </label>
                <input
                  type="text"
                  value={newCorrectForm}
                  onChange={(e) => setNewCorrectForm(e.target.value)}
                  placeholder="e.g. an AI application wrote for me"
                  required
                  className="w-full bg-white border border-stone-300 rounded px-2.5 py-1.5 text-stone-900 font-mono-code"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">
                  Rule Note / Why it occurred:
                </label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g. Singular countable noun requires article"
                  className="w-full bg-white border border-stone-300 rounded px-2.5 py-1.5 text-stone-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-stone-600 hover:text-stone-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-stone-900 hover:bg-stone-800 text-white px-4 py-1.5 rounded-lg font-semibold shadow-xs"
                >
                  Save to Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
