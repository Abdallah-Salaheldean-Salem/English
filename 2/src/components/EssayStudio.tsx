import React, { useState } from 'react';
import { FinishedPiece, ExternalCritique } from '../types';
import {
  FileText,
  Plus,
  Users,
  Send,
  CheckCircle2,
  Calendar,
  ExternalLink,
  Edit3
} from 'lucide-react';

interface EssayStudioProps {
  pieces: FinishedPiece[];
  onUpdatePieces: (pieces: FinishedPiece[]) => void;
}

export const EssayStudio: React.FC<EssayStudioProps> = ({ pieces, onUpdatePieces }) => {
  const [selectedPieceId, setSelectedPieceId] = useState<string>(pieces[0]?.id || '');
  const [showNewPieceModal, setShowNewPieceModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newForm, setNewForm] = useState<'essay' | 'short_story'>('essay');
  const [showCritiqueModal, setShowCritiqueModal] = useState(false);
  const [reviewerName, setReviewerName] = useState('Scribophile Reader');
  const [critiqueFeedback, setCritiqueFeedback] = useState('');
  const [revisionSummary, setRevisionSummary] = useState('');

  const activePiece = pieces.find((p) => p.id === selectedPieceId) || pieces[0];

  const handleCreatePiece = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const targetWords = newForm === 'essay' ? 1000 : 2000;
    const newPiece: FinishedPiece = {
      id: 'piece-' + Date.now(),
      title: newTitle.trim(),
      phase: 3,
      form: newForm,
      targetWordCount: targetWords,
      wordCount: 0,
      content: '',
      draftStatus: 'draft',
      critiques: [],
      dateCreated: new Date().toISOString().split('T')[0]
    };
    const updated = [newPiece, ...pieces];
    onUpdatePieces(updated);
    setSelectedPieceId(newPiece.id);
    setNewTitle('');
    setShowNewPieceModal(false);
  };

  const handleSaveActiveContent = (content: string) => {
    if (!activePiece) return;
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    const updated = pieces.map((p) =>
      p.id === activePiece.id ? { ...p, content, wordCount: words } : p
    );
    onUpdatePieces(updated);
  };

  const handleAddCritique = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePiece || !critiqueFeedback.trim()) return;
    const critique: ExternalCritique = {
      id: 'crit-' + Date.now(),
      pieceTitle: activePiece.title,
      reviewerName,
      date: new Date().toISOString().split('T')[0],
      keyFeedback: critiqueFeedback.trim(),
      revisionMade: revisionSummary.trim()
    };
    const updated = pieces.map((p) =>
      p.id === activePiece.id
        ? {
            ...p,
            draftStatus: 'revised' as const,
            critiques: [critique, ...p.critiques]
          }
        : p
    );
    onUpdatePieces(updated);
    setCritiqueFeedback('');
    setRevisionSummary('');
    setShowCritiqueModal(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-stone-500 mb-1">
              <span>Phases 3 & 4</span>
              <span>·</span>
              <span>Finished Pieces & Monthly Publishing</span>
            </div>
            <h1 className="font-serif-prose text-2xl font-bold text-stone-900">
              Finished Pieces Studio
            </h1>
            <p className="text-xs text-stone-600 mt-0.5">
              Two-week cycle: Week A (Plan & Draft) &rarr; Week B (Revise & Outside Critique).
            </p>
          </div>

          <button
            onClick={() => setShowNewPieceModal(true)}
            className="flex items-center gap-1.5 bg-stone-900 text-white px-3.5 py-2 rounded-lg text-xs font-semibold hover:bg-stone-800 transition-colors shrink-0 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>New Whole Piece</span>
          </button>
        </div>

        {/* Piece Selector Tabs */}
        {pieces.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              {pieces.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPieceId(p.id)}
                  className={`px-3 py-1.5 rounded-lg border font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
                    p.id === activePiece?.id
                      ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{p.title}</span>
                  <span className="text-[10px] opacity-75">({p.wordCount}w)</span>
                </button>
              ))}
            </div>

            {/* Active Piece Workspace */}
            {activePiece && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50 p-3 rounded-lg border border-stone-200 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-stone-900 text-sm">
                      {activePiece.title}
                    </span>
                    <span className="text-stone-300">·</span>
                    <span className="capitalize text-stone-600">
                      {activePiece.form === 'essay' ? 'Essay (800–1,500w)' : 'Short Story (1,500–3,000w)'}
                    </span>
                    <span className="text-stone-300">·</span>
                    <span className="text-stone-500 font-mono-code">
                      {activePiece.wordCount} words
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowCritiqueModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-white border border-stone-300 text-stone-700 hover:bg-stone-100 font-medium"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Log Reader Critique ({activePiece.critiques.length}/2)</span>
                    </button>
                  </div>
                </div>

                <textarea
                  value={activePiece.content}
                  onChange={(e) => handleSaveActiveContent(e.target.value)}
                  placeholder="Draft your long-form piece here unaided..."
                  className="w-full h-96 p-5 bg-white border border-stone-300 rounded-xl text-base font-serif-prose text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400 leading-relaxed"
                />

                {/* Critique Log for this piece */}
                {activePiece.critiques.length > 0 && (
                  <div className="bg-stone-50 rounded-xl border border-stone-200 p-4 space-y-2 text-xs">
                    <div className="font-bold text-stone-900 uppercase tracking-wider text-[11px]">
                      Reader Critiques & Revisions:
                    </div>
                    <div className="space-y-2">
                      {activePiece.critiques.map((c) => (
                        <div
                          key={c.id}
                          className="bg-white p-3 rounded-lg border border-stone-200 space-y-1"
                        >
                          <div className="flex items-center justify-between text-stone-500 text-[11px]">
                            <span className="font-semibold text-stone-800">{c.reviewerName}</span>
                            <span>{c.date}</span>
                          </div>
                          <p className="text-stone-800">
                            <strong>Feedback:</strong> {c.keyFeedback}
                          </p>
                          {c.revisionMade && (
                            <p className="text-emerald-800">
                              <strong>Revision Made:</strong> {c.revisionMade}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-stone-500 bg-stone-50 rounded-xl border border-dashed border-stone-300">
            No long-form pieces created yet. When you reach Phase 3, click &ldquo;New Whole Piece&rdquo; to begin your first 800+ word essay or narrative.
          </div>
        )}
      </div>

      {/* Modal: New Piece */}
      {showNewPieceModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-stone-200 max-w-md w-full p-5 shadow-xl space-y-4">
            <h3 className="font-serif-prose font-bold text-lg text-stone-900">
              Start New Whole Piece
            </h3>
            <form onSubmit={handleCreatePiece} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-stone-700 block mb-1">Title:</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Why Simple Circuits Outlast Complex Code"
                  required
                  className="w-full bg-white border border-stone-300 rounded px-2.5 py-1.5 text-stone-900"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">Form:</label>
                <select
                  value={newForm}
                  onChange={(e) => setNewForm(e.target.value as any)}
                  className="w-full bg-white border border-stone-300 rounded px-2.5 py-1.5 text-stone-900"
                >
                  <option value="essay">Essay or Blog Post (800–1,500 words)</option>
                  <option value="short_story">Short Story (1,500–3,000 words)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewPieceModal(false)}
                  className="px-3 py-1.5 text-stone-600 hover:text-stone-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-stone-900 text-white px-4 py-1.5 rounded-lg font-semibold hover:bg-stone-800"
                >
                  Create Piece
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Critique */}
      {showCritiqueModal && activePiece && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-stone-200 max-w-lg w-full p-5 shadow-xl space-y-4">
            <h3 className="font-serif-prose font-bold text-lg text-stone-900">
              Log Outside Reader Critique
            </h3>
            <p className="text-xs text-stone-600">
              Phase 3 Gate requires each piece to be revised after feedback from at least 2 outside readers (e.g. Scribophile or London Writers&apos; Salon).
            </p>

            <form onSubmit={handleAddCritique} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-stone-700 block mb-1">Reader / Community:</label>
                <input
                  type="text"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  placeholder="e.g. Scribophile Member or Colleague"
                  className="w-full bg-white border border-stone-300 rounded px-2.5 py-1.5 text-stone-900"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">Key Feedback Received:</label>
                <textarea
                  value={critiqueFeedback}
                  onChange={(e) => setCritiqueFeedback(e.target.value)}
                  placeholder="What stumbled? Where did the reader lose interest or clarity?"
                  required
                  className="w-full h-20 bg-white border border-stone-300 rounded px-2.5 py-1.5 text-stone-900"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">Revision You Made:</label>
                <textarea
                  value={revisionSummary}
                  onChange={(e) => setRevisionSummary(e.target.value)}
                  placeholder="How did you modify the sentences or paragraph structure in response?"
                  className="w-full h-16 bg-white border border-stone-300 rounded px-2.5 py-1.5 text-stone-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCritiqueModal(false)}
                  className="px-3 py-1.5 text-stone-600 hover:text-stone-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-800 text-white px-4 py-1.5 rounded-lg font-semibold hover:bg-emerald-900"
                >
                  Save Critique
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
