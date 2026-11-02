import { useState } from 'react';
import { BookOpen, Plus, Play, CheckCircle2, Circle, ExternalLink, Trash2 } from 'lucide-react';
import { AppState, ModelPassage } from '../types';
import { COMBINING_EXERCISES, PLAN_BOOKS, PUBLIC_DOMAIN_MODELS } from '../lib/content';
import { countWords } from '../lib/logic';

interface LibraryViewProps {
  appState: AppState;
  customModels: ModelPassage[];
  onAddCustomModel: (model: ModelPassage) => void;
  onDeleteCustomModel: (id: string) => void;
  onToggleBookRead: (bookId: string) => void;
  onStartDrillWithModel: (modelId: string) => void;
}

export function LibraryView({
  appState,
  customModels,
  onAddCustomModel,
  onDeleteCustomModel,
  onToggleBookRead,
  onStartDrillWithModel,
}: LibraryViewProps) {
  const [activeTab, setActiveTab] = useState<'models' | 'combining' | 'books'>('models');
  const [isAddingCustom, setIsAddingCustom] = useState<boolean>(false);

  // Custom model form
  const [author, setAuthor] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [source, setSource] = useState<string>('');
  const [text, setText] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const allModels = [...PUBLIC_DOMAIN_MODELS, ...customModels];

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !text.trim()) return;

    const words = countWords(text);
    const newModel: ModelPassage = {
      id: `model-custom-${Date.now()}`,
      author: author.trim() || 'Unknown Mentor',
      title: title.trim(),
      source: source.trim() || 'Pasted Mentor Passage',
      text: text.trim(),
      notes: notes.trim() || 'Custom passage added for Franklin method imitation.',
      wordCount: words,
      tags: ['Custom', 'Mentor Text'],
    };

    onAddCustomModel(newModel);
    setIsAddingCustom(false);
    setAuthor('');
    setTitle('');
    setSource('');
    setText('');
    setNotes('');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--border-subtle)]">
        <div>
          <div className="text-xs font-mono uppercase text-[var(--text-muted)] mb-1">
            Curated Models & Drills
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-main)] font-editorial-sans tracking-tight">
            Mentor Library & Drills
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            Verbatim public-domain models for Franklin analysis, sentence combining sets, and foundational reading.
          </p>
        </div>

        {activeTab === 'models' && (
          <button
            type="button"
            onClick={() => setIsAddingCustom(!isAddingCustom)}
            className="px-4 py-2.5 rounded-lg bg-[var(--accent)] text-[var(--accent-text)] text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Paste Custom Mentor Passage</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border-subtle)] gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('models')}
          className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'models'
              ? 'border-[var(--accent)] text-[var(--text-main)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
          }`}
        >
          Model Passages ({allModels.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('combining')}
          className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'combining'
              ? 'border-[var(--accent)] text-[var(--text-main)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
          }`}
        >
          Sentence Combining Sets ({COMBINING_EXERCISES.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('books')}
          className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'books'
              ? 'border-[var(--accent)] text-[var(--text-main)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
          }`}
        >
          Plan Reading Curriculum ({PLAN_BOOKS.length})
        </button>
      </div>

      {/* TAB 1: MODEL PASSAGES */}
      {activeTab === 'models' && (
        <div className="space-y-6">
          {/* Custom Addition Form */}
          {isAddingCustom && (
            <form
              onSubmit={handleAddCustom}
              className="p-6 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] space-y-4 animate-in fade-in duration-150"
            >
              <div className="font-bold text-sm text-[var(--text-main)]">
                Add Any Mentor Passage (Per Spec Decision #8)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-main)] mb-1 uppercase tracking-wide">
                    Author
                  </label>
                  <input
                    type="text"
                    value={author}
                    onChange={e => setAuthor(e.target.value)}
                    placeholder="e.g. Paul Graham, George Orwell"
                    className="w-full px-3 py-2 text-xs rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-main)] mb-1 uppercase tracking-wide">
                    Title / Essay Name
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. How to Do Great Work"
                    className="w-full px-3 py-2 text-xs rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-main)] mb-1 uppercase tracking-wide">
                    Source / Link
                  </label>
                  <input
                    type="text"
                    value={source}
                    onChange={e => setSource(e.target.value)}
                    placeholder="e.g. paulgraham.com/greatwork.html"
                    className="w-full px-3 py-2 text-xs rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-main)] mb-1 uppercase tracking-wide">
                  Passage Text (80 to 200 words recommended)
                </label>
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  rows={4}
                  placeholder="Paste the verbatim passage here..."
                  className="w-full p-3 text-sm font-editorial-serif rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-main)] mb-1 uppercase tracking-wide">
                  What makes this sentence structure worth imitating?
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. Masterclass in short declarative sentences and concrete opening verbs."
                  className="w-full px-3 py-2 text-xs rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)]"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingCustom(false)}
                  className="px-3 py-1.5 text-xs text-[var(--text-muted)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded bg-[var(--accent)] text-[var(--accent-text)]"
                >
                  Save Model
                </button>
              </div>
            </form>
          )}

          {/* Models Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {allModels.map(model => (
              <div
                key={model.id}
                className="p-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col justify-between space-y-4 shadow-sm hover:border-[var(--border-strong)] transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-mono text-[var(--text-subtle)]">
                        {model.author} {model.year ? `· ${model.year}` : ''}
                      </div>
                      <h3 className="font-bold text-base text-[var(--text-main)] font-editorial-sans">
                        {model.title}
                      </h3>
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--tag-bg)] text-[var(--text-muted)]">
                      {model.wordCount} words
                    </span>
                  </div>

                  <p className="text-sm font-editorial-serif text-[var(--text-main)] leading-relaxed italic border-l-2 border-[var(--border-strong)] pl-3">
                    "{model.text}"
                  </p>

                  <div className="text-xs text-[var(--text-muted)] leading-relaxed">
                    <span className="font-semibold text-[var(--text-main)]">Craft Insight: </span>
                    {model.notes}
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
                  <span className="text-[11px] font-mono text-[var(--text-subtle)] truncate max-w-[200px]">
                    {model.source}
                  </span>

                  <div className="flex items-center gap-2">
                    {model.id.startsWith('model-custom-') && (
                      <button
                        type="button"
                        onClick={() => onDeleteCustomModel(model.id)}
                        className="text-[var(--text-subtle)] hover:text-rose-600 p-1"
                        title="Delete custom model"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onStartDrillWithModel(model.id)}
                      className="px-3 py-1.5 rounded-md bg-[var(--accent)] text-[var(--accent-text)] text-xs font-semibold hover:opacity-90 flex items-center gap-1.5"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Start Franklin Drill</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: SENTENCE COMBINING SETS */}
      {activeTab === 'combining' && (
        <div className="space-y-4">
          <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed max-w-2xl">
            Sentence combining trains syntactic flexibility. Rather than memorizing abstract grammar rules, you combine simple observations into sophisticated periodic and balanced sentences.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {COMBINING_EXERCISES.map(ex => (
              <div
                key={ex.id}
                className="p-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-4 shadow-sm"
              >
                <div>
                  <div className="text-xs font-mono uppercase text-[var(--text-muted)] mb-1">
                    {ex.category}
                  </div>
                  <h3 className="font-bold text-base text-[var(--text-main)] font-editorial-sans">
                    {ex.title}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1">{ex.instruction}</p>
                </div>

                <div className="space-y-1.5 p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs font-editorial-serif text-[var(--text-main)]">
                  {ex.sourceSentences.map((s, idx) => (
                    <div key={idx}>• {s}</div>
                  ))}
                </div>

                {ex.sampleSolution && (
                  <details className="text-xs text-[var(--text-muted)] group">
                    <summary className="cursor-pointer font-semibold text-[var(--text-main)] hover:underline">
                      Reveal Exemplar Solution
                    </summary>
                    <div className="mt-2 p-3 rounded bg-[var(--bg-elevated)] border border-[var(--border-subtle)] font-editorial-serif text-[var(--text-main)] italic">
                      "{ex.sampleSolution}"
                    </div>
                  </details>
                )}

                {ex.notes && (
                  <div className="text-[11px] text-[var(--text-subtle)]">
                    <span className="font-semibold">Principle: </span>
                    {ex.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: PLAN READING CURRICULUM */}
      {activeTab === 'books' && (
        <div className="space-y-6">
          <div className="p-4 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] leading-relaxed">
            The English Writing Recovery Plan assigns 4 foundational texts across phases. Mark these as completed as you read through them alongside your daily writing drills.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PLAN_BOOKS.map(book => {
              const bookState = appState.books[book.id];
              const isRead = !!bookState?.read;

              return (
                <div
                  key={book.id}
                  onClick={() => onToggleBookRead(book.id)}
                  className={`p-5 rounded-xl border cursor-pointer transition-all ${
                    isRead
                      ? 'border-emerald-500/40 bg-emerald-500/5'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[var(--text-main)]">
                          {book.title}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--tag-bg)] text-[var(--text-muted)]">
                          Phase {book.phaseRecommended}
                        </span>
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">{book.author}</div>
                      <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed">
                        {book.purpose}
                      </p>
                    </div>

                    <div className="shrink-0 p-1">
                      {isRead ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Circle className="w-5 h-5 text-[var(--text-subtle)]" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
