import { useState } from 'react';
import { Download, Upload, RotateCcw, Sliders, Check, Volume2, VolumeX, Shield, AlertTriangle } from 'lucide-react';
import { AppState } from '../types';

interface SettingsViewProps {
  appState: AppState;
  onUpdateAppState: (updates: Partial<AppState>) => void;
  onOpenOnboarding: () => void;
  onExportBackup: () => string;
  onImportBackup: (json: string) => boolean;
  onResetAll: () => void;
}

const ERROR_CHOICES = [
  'Subject-Verb Agreement',
  'Tense Shift',
  'Missing / Misused Article',
  'Dangling / Misplaced Modifier',
  'Run-on / Comma Splice',
  'Sentence Fragment',
  'Preposition Choice',
  'Parallel Structure',
  'Word Choice / Collocation',
  'Pronoun Reference',
];

export function SettingsView({
  appState,
  onUpdateAppState,
  onOpenOnboarding,
  onExportBackup,
  onImportBackup,
  onResetAll,
}: SettingsViewProps) {
  const [importStatus, setImportStatus] = useState<string>('');
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  const daysLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const toggleRestDay = (day: number) => {
    if (appState.restDays.includes(day)) {
      onUpdateAppState({ restDays: appState.restDays.filter(d => d !== day) });
    } else {
      onUpdateAppState({ restDays: [...appState.restDays, day].sort() });
    }
  };

  const toggleTop3 = (type: string) => {
    if (appState.top3.includes(type)) {
      onUpdateAppState({ top3: appState.top3.filter(t => t !== type) });
    } else {
      if (appState.top3.length < 3) {
        onUpdateAppState({ top3: [...appState.top3, type] });
      } else {
        onUpdateAppState({ top3: [...appState.top3.slice(1), type] });
      }
    }
  };

  const handleDownloadBackup = () => {
    const jsonStr = onExportBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `english-writing-recovery-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
      const content = evt.target?.result as string;
      if (content) {
        const success = onImportBackup(content);
        if (success) {
          setImportStatus('Backup restored successfully!');
          setTimeout(() => setImportStatus(''), 3000);
        } else {
          setImportStatus('Invalid backup JSON format.');
          setTimeout(() => setImportStatus(''), 3000);
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="pb-6 border-b border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono uppercase text-[var(--text-muted)] mb-1">
            System Configuration · state/app
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-main)] font-editorial-sans tracking-tight">
            Settings & Plan Parameters
          </h1>
        </div>

        <button
          type="button"
          onClick={onOpenOnboarding}
          className="px-4 py-2 rounded-lg border border-[var(--border-strong)] text-[var(--text-main)] text-xs font-semibold hover:bg-[var(--bg-elevated)] flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Switch Schedule Preset</span>
        </button>
      </div>

      {/* Routine & Schedule Settings */}
      <div className="p-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-6">
        <h2 className="font-bold text-base text-[var(--text-main)] font-editorial-sans">
          Schedule & Habit Anchoring
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Phase */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-main)] mb-1.5 uppercase tracking-wide">
              Active Phase
            </label>
            <select
              value={appState.phase}
              onChange={e => onUpdateAppState({ phase: Number(e.target.value) as 1 | 2 | 3 | 4 })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)]"
            >
              <option value={1}>Phase 1: Writing Fluency (Timed sprints without stopping)</option>
              <option value={2}>Phase 2: Sentence Control (Franklin & combining drills)</option>
              <option value={3}>Phase 3: Rhythm & Expansion (1-sitting Franklin & 3-day pieces)</option>
              <option value={4}>Phase 4: Publication & Mastery (Reader critiques)</option>
            </select>
          </div>

          {/* Week Start */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-main)] mb-1.5 uppercase tracking-wide">
              First Day of Week
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onUpdateAppState({ weekStart: 0 })}
                className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-colors ${
                  appState.weekStart === 0
                    ? 'border-[var(--accent)] bg-[var(--bg-elevated)] text-[var(--text-main)] font-semibold'
                    : 'border-[var(--border-subtle)] text-[var(--text-muted)]'
                }`}
              >
                Sunday (Egypt / ME)
              </button>
              <button
                type="button"
                onClick={() => onUpdateAppState({ weekStart: 1 })}
                className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-colors ${
                  appState.weekStart === 1
                    ? 'border-[var(--accent)] bg-[var(--bg-elevated)] text-[var(--text-main)] font-semibold'
                    : 'border-[var(--border-subtle)] text-[var(--text-muted)]'
                }`}
              >
                Monday (Standard)
              </button>
            </div>
          </div>

          {/* Rest Days */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[var(--text-main)] mb-1.5 uppercase tracking-wide">
              Scheduled Rest Days (Click to toggle)
            </label>
            <div className="flex gap-1.5">
              {daysLabels.map((lbl, idx) => {
                const isRest = appState.restDays.includes(idx);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleRestDay(idx)}
                    className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-colors ${
                      isRest
                        ? 'bg-[var(--accent)] text-[var(--accent-text)] border-[var(--accent)]'
                        : 'border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    {lbl}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Anchor Routine */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-main)] mb-1.5 uppercase tracking-wide">
              Anchor Routine (Trigger)
            </label>
            <input
              type="text"
              value={appState.anchorRoutine}
              onChange={e => onUpdateAppState({ anchorRoutine: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          {/* Anchor Place */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-main)] mb-1.5 uppercase tracking-wide">
              Anchor Place
            </label>
            <input
              type="text"
              value={appState.anchorPlace}
              onChange={e => onUpdateAppState({ anchorPlace: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
        </div>
      </div>

      {/* Focus Mode & Guard Friction */}
      <div className="p-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-6">
        <h2 className="font-bold text-base text-[var(--text-main)] font-editorial-sans">
          Sprint Friction & Focus Rules
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-main)] mb-1.5 uppercase tracking-wide">
              Pause Limit (Max idle seconds without stopping)
            </label>
            <select
              value={appState.pauseLimit}
              onChange={e => onUpdateAppState({ pauseLimit: Number(e.target.value) })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)]"
            >
              <option value={30}>30 seconds (Strict pacing)</option>
              <option value={60}>60 seconds (Recovery plan default)</option>
              <option value={90}>90 seconds (Moderate contemplation)</option>
              <option value={120}>120 seconds (Relaxed)</option>
            </select>
          </div>

          {/* Publishing outlet */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-main)] mb-1.5 uppercase tracking-wide">
              Target Publication Outlet (Phase 4)
            </label>
            <input
              type="text"
              value={appState.publishPlace}
              onChange={e => onUpdateAppState({ publishPlace: e.target.value })}
              placeholder="e.g. Substack, Medium, Personal Blog"
              className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          {/* No-delete toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
            <div>
              <div className="text-xs font-semibold text-[var(--text-main)]">No-Delete Mode</div>
              <div className="text-[11px] text-[var(--text-muted)]">Warns on backspace during Phase 1 sprints to prevent editing</div>
            </div>
            <button
              type="button"
              onClick={() => onUpdateAppState({ noDelete: !appState.noDelete })}
              className={`px-3 py-1 text-xs font-semibold rounded ${
                appState.noDelete
                  ? 'bg-[var(--accent)] text-[var(--accent-text)]'
                  : 'bg-[var(--border-subtle)] text-[var(--text-muted)]'
              }`}
            >
              {appState.noDelete ? 'Active' : 'Off'}
            </button>
          </div>

          {/* Sound toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
            <div>
              <div className="text-xs font-semibold text-[var(--text-main)]">Session Chimes</div>
              <div className="text-[11px] text-[var(--text-muted)]">Subtle harmonic tone on sprint start and completion</div>
            </div>
            <button
              type="button"
              onClick={() => onUpdateAppState({ sound: !appState.sound })}
              className={`px-3 py-1 text-xs font-semibold rounded flex items-center gap-1 ${
                appState.sound
                  ? 'bg-[var(--accent)] text-[var(--accent-text)]'
                  : 'bg-[var(--border-subtle)] text-[var(--text-muted)]'
              }`}
            >
              {appState.sound ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span>{appState.sound ? 'Enabled' : 'Muted'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top 3 Target Errors */}
      <div className="p-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-4">
        <div>
          <h2 className="font-bold text-base text-[var(--text-main)] font-editorial-sans">
            Top 3 Frozen Target Errors (Gate 2)
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Current selection: {appState.top3.join(', ')} ({appState.top3.length}/3)
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {ERROR_CHOICES.map(type => {
            const isSelected = appState.top3.includes(type);
            return (
              <button
                key={type}
                type="button"
                onClick={() => toggleTop3(type)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[var(--accent)] text-[var(--accent-text)] border-[var(--accent)]'
                    : 'border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--border-strong)]'
                }`}
              >
                {isSelected && <Check className="w-3.5 h-3.5" />}
                <span>{type}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Backup, Restore, and Reset */}
      <div className="p-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-4">
        <h2 className="font-bold text-base text-[var(--text-main)] font-editorial-sans">
          Data Management & Local Persistence
        </h2>
        <p className="text-xs text-[var(--text-muted)]">
          All writing sessions, pieces, and error records are saved locally in browser storage. Download an offline JSON backup or restore from a previous file.
        </p>

        {importStatus && (
          <div className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)] font-medium">
            {importStatus}
          </div>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            onClick={handleDownloadBackup}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-[var(--border-subtle)] text-[var(--text-main)] hover:bg-[var(--bg-elevated)] flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Backup (JSON)</span>
          </button>

          <label className="px-4 py-2 text-xs font-semibold rounded-lg border border-[var(--border-subtle)] text-[var(--text-main)] hover:bg-[var(--bg-elevated)] cursor-pointer flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5" />
            <span>Restore Backup</span>
            <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
          </label>

          <div className="ml-auto">
            {showResetConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-rose-600 dark:text-rose-400 font-semibold">Are you sure?</span>
                <button
                  type="button"
                  onClick={() => {
                    onResetAll();
                    setShowResetConfirm(false);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded bg-rose-600 text-white"
                >
                  Yes, Reset All
                </button>
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="px-2 py-1.5 text-xs text-[var(--text-muted)]"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="px-4 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset All Data</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
