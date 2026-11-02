import { useState } from 'react';
import { Plus, CheckSquare, Square, History, ExternalLink, Trash2, Edit3, ArrowRight, Save } from 'lucide-react';
import { AppState, Piece } from '../types';
import { countWords, formatIsoDate } from '../lib/logic';

interface PiecesViewProps {
  appState: AppState;
  pieces: Piece[];
  onSavePiece: (piece: Piece) => void;
  onDeletePiece: (id: string) => void;
}

export function PiecesView({ appState, pieces, onSavePiece, onDeletePiece }: PiecesViewProps) {
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(pieces[0]?.id || null);
  const [isCreating, setIsCreating] = useState<boolean>(false);

  // New Piece Form
  const [newTitle, setNewTitle] = useState<string>('');
  const [newForm, setNewForm] = useState<string>(appState.form || 'Reflective Essay');
  const [newPoint, setNewPoint] = useState<string>('');
  const [newReader, setNewReader] = useState<string>('');
  const [newNotes, setNewNotes] = useState<string>('');

  const selectedPiece = pieces.find(p => p.id === selectedPieceId);

  // Active Piece Edit State
  const [activeText, setActiveText] = useState<string>(selectedPiece?.text || '');
  const [activePoint, setActivePoint] = useState<string>(selectedPiece?.plan?.point || '');
  const [activeReader, setActiveReader] = useState<string>(selectedPiece?.plan?.reader || '');
  const [activeNotes, setActiveNotes] = useState<string>(selectedPiece?.plan?.notes || '');
  const [publishedUrl, setPublishedUrl] = useState<string>(selectedPiece?.publishedUrl || '');

  const handleSelectPiece = (p: Piece) => {
    setSelectedPieceId(p.id);
    setActiveText(p.text);
    setActivePoint(p.plan?.point || '');
    setActiveReader(p.plan?.reader || '');
    setActiveNotes(p.plan?.notes || '');
    setPublishedUrl(p.publishedUrl || '');
    setIsCreating(false);
  };

  const handleCreateNewPiece = () => {
    if (!newTitle.trim()) return;

    const newPiece: Piece = {
      id: `piece-${Date.now()}`,
      phase: appState.phase,
      form: newForm,
      title: newTitle.trim(),
      status: 'plan',
      createdAt: formatIsoDate(),
      plan: {
        point: newPoint,
        reader: newReader,
        notes: newNotes,
      },
      text: '',
      versions: [],
      checks: {
        pointClear: false,
        readerTargeted: false,
        top3Checked: false,
        readAloudCompleted: false,
      },
      feedback: [],
      words: 0,
      marks: [],
      reviewed: false,
    };

    onSavePiece(newPiece);
    setSelectedPieceId(newPiece.id);
    setIsCreating(false);
    setNewTitle('');
    setNewPoint('');
    setNewReader('');
    setNewNotes('');
  };

  const handleSaveCurrentPiece = (newStatus?: Piece['status']) => {
    if (!selectedPiece) return;
    const words = countWords(activeText);

    // Save a version snapshot if text changed significantly
    const versions = [...selectedPiece.versions];
    if (activeText !== selectedPiece.text && activeText.trim().length > 0) {
      versions.unshift({
        text: activeText,
        date: new Date().toISOString(),
        label: `Version ${versions.length + 1} (${words}w)`,
      });
    }

    const updated: Piece = {
      ...selectedPiece,
      status: newStatus || selectedPiece.status,
      text: activeText,
      words,
      plan: {
        point: activePoint,
        reader: activeReader,
        notes: activeNotes,
      },
      versions: versions.slice(0, 10), // keep latest 10 versions
      publishedUrl: publishedUrl || undefined,
      finishedAt: newStatus === 'done' ? formatIsoDate() : selectedPiece.finishedAt,
    };

    onSavePiece(updated);
  };

  const handleToggleCheck = (checkKey: string) => {
    if (!selectedPiece) return;
    const updatedChecks = {
      ...selectedPiece.checks,
      [checkKey]: !selectedPiece.checks[checkKey],
    };
    onSavePiece({
      ...selectedPiece,
      checks: updatedChecks,
    });
  };

  const stages: Array<{ id: Piece['status']; label: string }> = [
    { id: 'plan', label: '1. Plan' },
    { id: 'draft', label: '2. Draft' },
    { id: 'revise', label: '3. Revise' },
    { id: 'feedback', label: '4. Feedback' },
    { id: 'revise2', label: '5. Polish' },
    { id: 'publish', label: '6. Publish' },
    { id: 'done', label: 'Done' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[var(--border-subtle)]">
        <div>
          <div className="text-xs font-mono uppercase text-[var(--text-muted)] mb-1">
            Writing Recovery Plan · Phases 2 to 4
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-main)] font-editorial-sans tracking-tight">
            Pieces & Essays Workbench
          </h1>
        </div>

        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="px-4 py-2.5 rounded-lg bg-[var(--accent)] text-[var(--accent-text)] text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Piece</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
        {/* Left Column: Piece List */}
        <div className="lg:col-span-4 space-y-3">
          <div className="text-xs font-mono uppercase text-[var(--text-muted)] tracking-wider">
            Your Manuscripts ({pieces.length})
          </div>

          {pieces.length === 0 && !isCreating ? (
            <div className="p-6 rounded-lg border border-dashed border-[var(--border-subtle)] text-center text-xs text-[var(--text-muted)] space-y-2">
              <p>No pieces initiated yet.</p>
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="text-xs font-semibold text-[var(--text-main)] underline"
              >
                Create your first planned piece
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {pieces.map(p => {
                const isSelected = p.id === selectedPieceId && !isCreating;
                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelectPiece(p)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[var(--accent)] bg-[var(--bg-elevated)] ring-1 ring-[var(--accent)]'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-mono text-[var(--text-subtle)] uppercase">{p.form}</span>
                      <span className="font-mono px-2 py-0.5 rounded bg-[var(--tag-bg)] text-[var(--text-main)] font-semibold text-[10px] uppercase">
                        {p.status}
                      </span>
                    </div>
                    <div className="font-bold text-sm text-[var(--text-main)] mb-1">
                      {p.title || 'Untitled Piece'}
                    </div>
                    <div className="text-xs text-[var(--text-muted)] flex items-center gap-2">
                      <span>{p.words} words</span>
                      <span>·</span>
                      <span>{p.createdAt}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Piece Detail / Creator */}
        <div className="lg:col-span-8">
          {isCreating ? (
            <div className="p-6 sm:p-8 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] space-y-6">
              <div className="border-b border-[var(--border-subtle)] pb-4">
                <h2 className="text-xl font-bold text-[var(--text-main)] font-editorial-sans">
                  Plan a New Piece
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  In the recovery plan, a piece begins with a locked point sentence and defined reader before drafting.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-main)] mb-1 uppercase tracking-wide">
                    Title
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder="e.g. Why Deliberate Practice Beats Motivation"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-main)] mb-1 uppercase tracking-wide">
                      Form
                    </label>
                    <select
                      value={newForm}
                      onChange={e => setNewForm(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)]"
                    >
                      <option value="Analytical Essay">Analytical Essay</option>
                      <option value="Technical Memo">Technical Memo</option>
                      <option value="Personal Reflection">Personal Reflection</option>
                      <option value="Critical Argument">Critical Argument</option>
                      <option value="Book / Article Review">Book / Article Review</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-main)] mb-1 uppercase tracking-wide">
                      Target Reader
                    </label>
                    <input
                      type="text"
                      value={newReader}
                      onChange={e => setNewReader(e.target.value)}
                      placeholder="e.g. Engineering lead evaluating tool transitions"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-main)] mb-1 uppercase tracking-wide">
                    The Point (Single Controlling Idea)
                  </label>
                  <textarea
                    value={newPoint}
                    onChange={e => setNewPoint(e.target.value)}
                    rows={2}
                    placeholder="State the single central proposition that this piece proves."
                    className="w-full p-3 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] font-editorial-serif focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-main)] mb-1 uppercase tracking-wide">
                    Structural Notes / Supporting Sequence
                  </label>
                  <textarea
                    value={newNotes}
                    onChange={e => setNewNotes(e.target.value)}
                    rows={3}
                    placeholder="1. The common misconception...&#10;2. The experimental counter-evidence...&#10;3. The actionable heuristic..."
                    className="w-full p-3 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] text-xs focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-main)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateNewPiece}
                  disabled={!newTitle.trim()}
                  className="px-5 py-2 text-xs font-semibold rounded-lg bg-[var(--accent)] text-[var(--accent-text)] disabled:opacity-40"
                >
                  Create Plan
                </button>
              </div>
            </div>
          ) : selectedPiece ? (
            <div className="space-y-6">
              {/* Stage Progress Bar */}
              <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono uppercase text-[var(--text-muted)]">
                    Current Stage: <span className="font-bold text-[var(--text-main)]">{selectedPiece.status.toUpperCase()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onDeletePiece(selectedPiece.id)}
                      className="text-[var(--text-muted)] hover:text-rose-600 transition-colors p-1"
                      title="Delete Piece"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  {stages.map(s => {
                    const isCurrent = selectedPiece.status === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSaveCurrentPiece(s.id)}
                        className={`text-xs px-3 py-1.5 rounded transition-colors ${
                          isCurrent
                            ? 'bg-[var(--accent)] text-[var(--accent-text)] font-semibold'
                            : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                        }`}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Locked Point Card */}
              <div className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-2">
                <div className="text-xs font-mono uppercase text-[var(--text-muted)] flex items-center justify-between">
                  <span>Plan Specification</span>
                  <span className="font-mono">{selectedPiece.form} · Reader: {activeReader || 'General'}</span>
                </div>
                <div className="text-sm font-editorial-serif font-medium text-[var(--text-main)] leading-relaxed italic border-l-2 border-[var(--accent)] pl-3">
                  "{activePoint || 'No controlling idea defined yet.'}"
                </div>
              </div>

              {/* Manuscript Text Editor */}
              <div className="p-6 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase text-[var(--text-muted)]">
                    Manuscript Draft ({countWords(activeText)} words)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSaveCurrentPiece()}
                    className="px-3.5 py-1.5 rounded-md bg-[var(--accent)] text-[var(--accent-text)] text-xs font-semibold flex items-center gap-1.5 hover:opacity-90"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Snapshot</span>
                  </button>
                </div>

                <textarea
                  value={activeText}
                  onChange={e => setActiveText(e.target.value)}
                  rows={14}
                  className="w-full p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-app)] text-[var(--text-main)] font-editorial-serif text-base leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-y"
                  placeholder="Draft your essay or analysis here according to your plan..."
                />

                {/* Self-Check Checklist */}
                <div className="pt-4 border-t border-[var(--border-subtle)] space-y-2">
                  <div className="text-xs font-semibold text-[var(--text-main)] uppercase tracking-wide">
                    Revision Protocol Checklist:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {[
                      { k: 'pointClear', label: 'Does every paragraph serve the controlling point?' },
                      { k: 'top3Checked', label: `Audited for your Top 3 error patterns (${appState.top3.join(', ')})` },
                      { k: 'readAloudCompleted', label: 'Read aloud from beginning to end to check ear rhythm' },
                      { k: 'clutterEliminated', label: 'Pruned redundant prepositional phrases & filler' },
                    ].map(item => {
                      const checked = !!selectedPiece.checks[item.k];
                      return (
                        <div
                          key={item.k}
                          onClick={() => handleToggleCheck(item.k)}
                          className="flex items-center gap-2 p-2 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] cursor-pointer text-[var(--text-main)]"
                        >
                          {checked ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-[var(--text-subtle)] shrink-0" />
                          )}
                          <span className={checked ? 'line-through text-[var(--text-muted)]' : ''}>
                            {item.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Phase 4 Publishing link */}
                {selectedPiece.status === 'publish' || selectedPiece.status === 'done' ? (
                  <div className="pt-4 border-t border-[var(--border-subtle)] space-y-2">
                    <label className="block text-xs font-semibold text-[var(--text-main)] uppercase tracking-wide">
                      Published Live URL
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={publishedUrl}
                        onChange={e => setPublishedUrl(e.target.value)}
                        placeholder="https://substack.com/... or personal blog link"
                        className="flex-1 px-3 py-2 text-xs rounded border border-[var(--border-subtle)] bg-[var(--bg-app)] text-[var(--text-main)]"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveCurrentPiece('done')}
                        className="px-4 py-2 text-xs font-semibold rounded bg-[var(--accent)] text-[var(--accent-text)]"
                      >
                        Mark Published
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-subtle)] rounded-xl">
              Select a piece from the left or create a new one to begin writing.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
