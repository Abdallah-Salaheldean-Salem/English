import { useState } from 'react';
import { Plus, Search, Filter, ShieldCheck, AlertCircle, Trash2, CheckCircle2 } from 'lucide-react';
import { AppState, ErrorItem, Session } from '../types';

interface ErrorLedgerViewProps {
  appState: AppState;
  errors: ErrorItem[];
  sessions: Session[];
  onRecordError: (type: string, wrote: string, correct: string, by: 'self' | 'claude' | 'gemini') => void;
  onUpdateError: (error: ErrorItem) => void;
  onDeleteError: (id: string) => void;
  onUpdateTop3: (top3: string[]) => void;
}

export function ErrorLedgerView({
  appState,
  errors,
  sessions,
  onRecordError,
  onUpdateError,
  onDeleteError,
  onUpdateTop3,
}: ErrorLedgerViewProps) {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [isAddingError, setIsAddingError] = useState<boolean>(false);

  // New error inputs
  const [newType, setNewType] = useState<string>('Subject-Verb Agreement');
  const [newWrote, setNewWrote] = useState<string>('');
  const [newCorrect, setNewCorrect] = useState<string>('');

  // Frequency aggregation
  const frequencyByType = errors.reduce<Record<string, number>>((acc, err) => {
    acc[err.type] = (acc[err.type] || 0) + err.dates.length;
    return acc;
  }, {});

  const distinctTypes = Object.keys(frequencyByType).sort(
    (a, b) => frequencyByType[b] - frequencyByType[a]
  );

  // Errors seen at least twice (per decision #4)
  const recurringTypes = distinctTypes.filter(t => frequencyByType[t] >= 2);

  // Filtered errors list
  const filteredErrors = errors.filter(err => {
    const matchesSearch =
      err.wrote.toLowerCase().includes(searchTerm.toLowerCase()) ||
      err.correct.toLowerCase().includes(searchTerm.toLowerCase()) ||
      err.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedTypeFilter === 'all' || err.type === selectedTypeFilter;
    return matchesSearch && matchesType;
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWrote.trim() || !newType.trim()) return;
    onRecordError(newType, newWrote.trim(), newCorrect.trim(), 'self');
    setNewWrote('');
    setNewCorrect('');
    setIsAddingError(false);
  };

  const handleToggleTop3 = (type: string) => {
    if (appState.top3.includes(type)) {
      onUpdateTop3(appState.top3.filter(t => t !== type));
    } else {
      if (appState.top3.length < 3) {
        onUpdateTop3([...appState.top3, type]);
      } else {
        onUpdateTop3([...appState.top3.slice(1), type]);
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--border-subtle)]">
        <div>
          <div className="text-xs font-mono uppercase text-[var(--text-muted)] mb-1">
            Data Contract · errors/&lt;id&gt;
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-main)] font-editorial-sans tracking-tight">
            Grammar & Structural Error Ledger
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            Track recurring slips, establish your Top 3 target error types, and measure Gate 2 qualification.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddingError(!isAddingError)}
          className="px-4 py-2.5 rounded-lg bg-[var(--accent)] text-[var(--accent-text)] text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Log New Error</span>
        </button>
      </div>

      {/* Top 3 Frozen Targets Card */}
      <div className="p-6 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-500" />
            <span className="font-bold text-sm text-[var(--text-main)]">
              Frozen Top 3 Target Errors (Gate 2 Metric)
            </span>
          </div>
          <span className="text-xs font-mono text-[var(--text-muted)]">
            Click below to adjust your 3 focus types
          </span>
        </div>

        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          As specified in Decision #5: In Phase 2, Gate 2 measures error frequency strictly against your frozen Top 3 targets over 900+ marked words.
        </p>

        <div className="flex flex-wrap gap-2 pt-1">
          {distinctTypes.slice(0, 8).map(type => {
            const isTop3 = appState.top3.includes(type);
            const count = frequencyByType[type] || 0;
            return (
              <button
                key={type}
                type="button"
                onClick={() => handleToggleTop3(type)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all flex items-center gap-2 ${
                  isTop3
                    ? 'bg-[var(--accent)] text-[var(--accent-text)] border-[var(--accent)] ring-1 ring-[var(--accent)]'
                    : 'bg-[var(--bg-elevated)] text-[var(--text-main)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
                }`}
              >
                <span>{type}</span>
                <span className="font-mono text-[10px] opacity-80">({count}x)</span>
                {isTop3 && <CheckCircle2 className="w-3.5 h-3.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Manual Entry Form */}
      {isAddingError && (
        <form
          onSubmit={handleAddSubmit}
          className="p-5 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] space-y-4 animate-in fade-in duration-150"
        >
          <div className="font-bold text-sm text-[var(--text-main)]">Log an Identified Error Pattern</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-main)] mb-1 uppercase tracking-wide">
                Error Category
              </label>
              <select
                value={newType}
                onChange={e => setNewType(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)]"
              >
                <option value="Subject-Verb Agreement">Subject-Verb Agreement</option>
                <option value="Tense Shift">Tense Shift</option>
                <option value="Missing / Misused Article">Missing / Misused Article</option>
                <option value="Dangling / Misplaced Modifier">Dangling / Misplaced Modifier</option>
                <option value="Run-on / Comma Splice">Run-on / Comma Splice</option>
                <option value="Sentence Fragment">Sentence Fragment</option>
                <option value="Preposition Choice">Preposition Choice</option>
                <option value="Word Choice / Collocation">Word Choice / Collocation</option>
                <option value="Parallel Structure">Parallel Structure</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-main)] mb-1 uppercase tracking-wide">
                Wrote (Wrong Phrase)
              </label>
              <input
                type="text"
                value={newWrote}
                onChange={e => setNewWrote(e.target.value)}
                placeholder="The data were indicating..."
                className="w-full px-3 py-2 text-xs rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-main)] mb-1 uppercase tracking-wide">
                Corrected Form
              </label>
              <input
                type="text"
                value={newCorrect}
                onChange={e => setNewCorrect(e.target.value)}
                placeholder="The data was indicating..."
                className="w-full px-3 py-2 text-xs rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddingError(false)}
              className="px-3 py-1.5 text-xs text-[var(--text-muted)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold rounded bg-[var(--accent)] text-[var(--accent-text)]"
            >
              Save to Ledger
            </button>
          </div>
        </form>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search wrong phrases or corrections..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)]"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <select
            value={selectedTypeFilter}
            onChange={e => setSelectedTypeFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)]"
          >
            <option value="all">All Categories ({errors.length})</option>
            {distinctTypes.map(t => (
              <option key={t} value={t}>
                {t} ({frequencyByType[t]})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Ledger Table */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-muted)] font-mono uppercase">
              <tr>
                <th className="py-3 px-4 font-semibold">Category</th>
                <th className="py-3 px-4 font-semibold">Original Wording (Slip)</th>
                <th className="py-3 px-4 font-semibold">Repaired Form</th>
                <th className="py-3 px-4 font-semibold text-center">Occurrences</th>
                <th className="py-3 px-4 font-semibold">Last Seen</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filteredErrors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[var(--text-muted)]">
                    No matching error records in ledger.
                  </td>
                </tr>
              ) : (
                filteredErrors.map(err => {
                  const isTop3 = appState.top3.includes(err.type);
                  return (
                    <tr key={err.id} className="hover:bg-[var(--bg-elevated)]/50 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-[var(--text-main)] whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{err.type}</span>
                          {isTop3 && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold">
                              TOP 3
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-editorial-serif text-rose-600 dark:text-rose-400 line-through max-w-xs truncate">
                        "{err.wrote}"
                      </td>
                      <td className="py-3.5 px-4 font-editorial-serif text-emerald-600 dark:text-emerald-400 font-medium max-w-xs truncate">
                        {err.correct ? `"${err.correct}"` : 'Pending repair'}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold tabular-nums text-[var(--text-main)]">
                        {err.dates.length}x
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[var(--text-muted)] whitespace-nowrap">
                        {err.dates[err.dates.length - 1] || err.date}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => onDeleteError(err.id)}
                          className="text-[var(--text-subtle)] hover:text-rose-600 transition-colors p-1"
                          title="Delete Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
