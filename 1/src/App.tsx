import { useState } from 'react';
import { useStore } from './hooks/useStore';
import { Navbar, NavView } from './components/Navbar';
import { TodayView } from './components/TodayView';
import { FocusMode } from './components/FocusMode';
import { PiecesView } from './components/PiecesView';
import { ErrorLedgerView } from './components/ErrorLedgerView';
import { LibraryView } from './components/LibraryView';
import { ProgressView } from './components/ProgressView';
import { SettingsView } from './components/SettingsView';
import { OnboardingModal } from './components/OnboardingModal';
import { calculateStreak } from './lib/logic';
import { SessionKind } from './types';

export default function App() {
  const store = useStore();
  const [activeView, setActiveView] = useState<NavView>('today');
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(!store.appState.initialized);

  // Focus mode launch state
  const [focusKind, setFocusKind] = useState<SessionKind>('phase1');
  const [focusModelId, setFocusModelId] = useState<string | undefined>(undefined);

  const streak = calculateStreak(store.sessions, store.appState);

  const handleStartSession = (kind: string, modelId?: string) => {
    setFocusKind(kind as SessionKind);
    setFocusModelId(modelId);
    setActiveView('focus');
  };

  const handleSelectPreset = (preset: 'egypt' | 'standard' | 'custom', customOptions?: any) => {
    store.initializePreset(preset, customOptions);
    setIsOnboardingOpen(false);
  };

  const handleToggleBookRead = (bookId: string) => {
    const current = store.appState.books[bookId];
    store.updateAppState({
      books: {
        ...store.appState.books,
        [bookId]: {
          read: !current?.read,
          notes: current?.notes || '',
        },
      },
    });
  };

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-main)] flex flex-col transition-colors selection:bg-[var(--selection)]">
      {/* Strict 3-Zone Top Bar */}
      <Navbar
        activeView={activeView}
        onNavigate={setActiveView}
        currentTheme={store.appState.theme}
        onSelectTheme={store.setTheme}
        streakCount={streak.current}
        currentPhase={store.appState.phase}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 w-full">
        {activeView === 'today' && (
          <TodayView
            appState={store.appState}
            sessions={store.sessions}
            pieces={store.pieces}
            errors={store.errors}
            onStartSession={handleStartSession}
            onNavigate={setActiveView}
            onOpenSetup={() => setIsOnboardingOpen(true)}
          />
        )}

        {activeView === 'focus' && (
          <FocusMode
            appState={store.appState}
            initialKind={focusKind}
            initialModelId={focusModelId}
            onSaveSession={session => {
              store.saveSession(session);
              setActiveView('today');
            }}
            onRecordError={(type, wrote, correct, by) => {
              store.recordError(type, wrote, correct, by);
            }}
            onExit={() => setActiveView('today')}
          />
        )}

        {activeView === 'pieces' && (
          <PiecesView
            appState={store.appState}
            pieces={store.pieces}
            onSavePiece={store.savePiece}
            onDeletePiece={store.deletePiece}
          />
        )}

        {activeView === 'errors' && (
          <ErrorLedgerView
            appState={store.appState}
            errors={store.errors}
            sessions={store.sessions}
            onRecordError={store.recordError}
            onUpdateError={store.updateError}
            onDeleteError={store.deleteError}
            onUpdateTop3={top3 => store.updateAppState({ top3 })}
          />
        )}

        {activeView === 'library' && (
          <LibraryView
            appState={store.appState}
            customModels={store.customModels}
            onAddCustomModel={store.addCustomModel}
            onDeleteCustomModel={store.deleteCustomModel}
            onToggleBookRead={handleToggleBookRead}
            onStartDrillWithModel={modelId => handleStartSession('franklin1', modelId)}
          />
        )}

        {activeView === 'progress' && (
          <ProgressView
            appState={store.appState}
            sessions={store.sessions}
            errors={store.errors}
            pieces={store.pieces}
            onAdvancePhase={phase => store.updateAppState({ phase })}
          />
        )}

        {activeView === 'settings' && (
          <SettingsView
            appState={store.appState}
            onUpdateAppState={store.updateAppState}
            onOpenOnboarding={() => setIsOnboardingOpen(true)}
            onExportBackup={store.exportBackup}
            onImportBackup={store.importBackup}
            onResetAll={store.resetAll}
          />
        )}
      </main>

      {/* Onboarding Schedule Initializer Modal (Choice 1 Egypt, Choice 2 Standard, Choice 3 Custom) */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onSelectPreset={handleSelectPreset}
        onClose={() => setIsOnboardingOpen(false)}
      />

      {/* Quiet Footer */}
      <footer className="border-t border-[var(--border-subtle)] py-6 text-center text-xs text-[var(--text-subtle)] font-mono">
        English Writing Recovery Plan · Deliberate Practice Environment
      </footer>
    </div>
  );
}
