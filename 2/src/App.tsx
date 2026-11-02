/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HabitAnchorBanner } from './components/HabitAnchorBanner';
import { DailySprintSession } from './components/DailySprintSession';
import { Phase2Drills } from './components/Phase2Drills';
import { ErrorTrackerView } from './components/ErrorTrackerView';
import { RoadmapView } from './components/RoadmapView';
import { ReadingHabitView } from './components/ReadingHabitView';
import { EssayStudio } from './components/EssayStudio';
import { OriginalPlanModal } from './components/OriginalPlanModal';
import {
  ErrorLogItem,
  FinishedPiece,
  HabitAnchor,
  PhaseNumber,
  ReadingItem,
  WeeklyTrackerRow,
  WritingSession
} from './types';
import {
  addOrIncrementError,
  addSession,
  getCurrentPhase,
  getErrorLog,
  getFinishedPieces,
  getGateStatus,
  getHabitAnchor,
  getReadingItems,
  getSessions,
  getWeeklyTracker,
  saveCurrentPhase,
  saveErrorLog,
  saveFinishedPieces,
  saveHabitAnchor,
  saveReadingItems,
  saveWeeklyTracker,
  toggleGateStatus
} from './utils/storage';
import { Download, Upload, ShieldCheck, Heart } from 'lucide-react';

export default function App() {
  const [currentPhase, setCurrentPhase] = useState<PhaseNumber>(getCurrentPhase());
  const [activeTab, setActiveTab] = useState<
    'write' | 'drills' | 'errors' | 'roadmap' | 'reading' | 'reference'
  >('write');
  const [habitAnchor, setHabitAnchor] = useState<HabitAnchor>(getHabitAnchor());
  const [sessions, setSessions] = useState<WritingSession[]>(getSessions());
  const [errorLog, setErrorLog] = useState<ErrorLogItem[]>(getErrorLog());
  const [finishedPieces, setFinishedPieces] = useState<FinishedPiece[]>(getFinishedPieces());
  const [readingItems, setReadingItems] = useState<ReadingItem[]>(getReadingItems());
  const [weeklyTracker, setWeeklyTracker] = useState<WeeklyTrackerRow[]>(getWeeklyTracker());
  const [gateStatus, setGateStatus] = useState<Record<string, boolean>>(getGateStatus());
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);

  // Sync phase change
  const handlePhaseChange = (phase: PhaseNumber) => {
    setCurrentPhase(phase);
    saveCurrentPhase(phase);
    if (phase === 1) setActiveTab('write');
    else if (phase === 2) setActiveTab('drills');
    else if (phase >= 3) setActiveTab('drills');
  };

  // Sync habit anchor
  const handleSaveAnchor = (newAnchor: HabitAnchor) => {
    setHabitAnchor(newAnchor);
    saveHabitAnchor(newAnchor);
  };

  // Record completed writing session
  const handleSessionComplete = (session: WritingSession) => {
    const updatedSessions = addSession(session);
    setSessions(updatedSessions);

    // Update weekly tracker automatically
    if (weeklyTracker.length > 0) {
      const latestWeekIdx = weeklyTracker.length - 1;
      const updatedTracker = [...weeklyTracker];
      updatedTracker[latestWeekIdx] = {
        ...updatedTracker[latestWeekIdx],
        sessionsDone: updatedTracker[latestWeekIdx].sessionsDone + 1,
        wordsWritten: updatedTracker[latestWeekIdx].wordsWritten + session.wordCount
      };
      setWeeklyTracker(updatedTracker);
      saveWeeklyTracker(updatedTracker);
    }
  };

  // Add error to tracker
  const handleAddError = (
    type: string,
    whatIWrote: string,
    correctForm: string,
    notes?: string
  ) => {
    const updated = addOrIncrementError(type, whatIWrote, correctForm, notes);
    setErrorLog(updated);
  };

  const handleUpdateError = (item: ErrorLogItem) => {
    const updated = errorLog.map((e) => (e.id === item.id ? item : e));
    setErrorLog(updated);
    saveErrorLog(updated);
  };

  const handleDeleteError = (id: string) => {
    const updated = errorLog.filter((e) => e.id !== id);
    setErrorLog(updated);
    saveErrorLog(updated);
  };

  const handleToggleGate = (key: string) => {
    const updated = toggleGateStatus(key);
    setGateStatus({ ...updated });
  };

  // Metrics
  const totalWords = sessions.reduce((acc, s) => acc + (s.wordCount || 0), 0);
  const activeDrillTargetsCount = errorLog.filter((e) => e.frequency >= 3).length;

  // Export data
  const handleExportData = () => {
    const data = {
      habitAnchor,
      currentPhase,
      sessions,
      errorLog,
      finishedPieces,
      readingItems,
      weeklyTracker,
      gateStatus,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `unaided-writing-recovery-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] text-stone-900 flex flex-col font-sans selection:bg-stone-200">
      {/* Top Header Navbar */}
      <Navbar
        currentPhase={currentPhase}
        onPhaseChange={handlePhaseChange}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        sessionsCount={sessions.length}
        totalWords={totalWords}
        drillTargetsCount={activeDrillTargetsCount}
        onOpenOriginalPlan={() => setIsPlanModalOpen(true)}
      />

      {/* Habit Anchor Prompt Banner */}
      <HabitAnchorBanner
        anchor={habitAnchor}
        onSaveAnchor={handleSaveAnchor}
      />

      {/* Main View Area */}
      <main className="flex-1 py-6 px-4 sm:px-6 lg:px-8">
        {activeTab === 'write' && (
          <DailySprintSession
            onSessionComplete={handleSessionComplete}
            onAddErrorToTracker={handleAddError}
          />
        )}

        {activeTab === 'drills' && (
          <div className="space-y-8">
            <Phase2Drills
              onSessionComplete={handleSessionComplete}
              onAddErrorToTracker={handleAddError}
            />

            {/* If Phase 3 or 4, also show the Finished Pieces Studio */}
            {currentPhase >= 3 && (
              <EssayStudio
                pieces={finishedPieces}
                onUpdatePieces={(p) => {
                  setFinishedPieces(p);
                  saveFinishedPieces(p);
                }}
              />
            )}
          </div>
        )}

        {activeTab === 'errors' && (
          <ErrorTrackerView
            errorLog={errorLog}
            onAddError={handleAddError}
            onUpdateError={handleUpdateError}
            onDeleteError={handleDeleteError}
          />
        )}

        {activeTab === 'roadmap' && (
          <RoadmapView
            currentPhase={currentPhase}
            onPhaseChange={handlePhaseChange}
            gateStatus={gateStatus}
            onToggleGate={handleToggleGate}
            sessionsCount={sessions.length}
            totalWords={totalWords}
          />
        )}

        {activeTab === 'reading' && (
          <ReadingHabitView
            readingItems={readingItems}
            onUpdateReadingItems={(items) => {
              setReadingItems(items);
              saveReadingItems(items);
            }}
            weeklyTracker={weeklyTracker}
            onUpdateWeeklyTracker={(tracker) => {
              setWeeklyTracker(tracker);
              saveWeeklyTracker(tracker);
            }}
          />
        )}
      </main>

      {/* Persistent Original Plan Modal */}
      <OriginalPlanModal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
      />

      {/* Subtle Footer with Philosophy & Export */}
      <footer className="border-t border-stone-200 bg-white py-6 px-4 sm:px-6 lg:px-8 text-xs text-stone-500 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span className="font-serif-prose text-stone-800 font-semibold">
              Unaided Writing Recovery Studio
            </span>
            <span>·</span>
            <span>Based on the 6-month plan by @King (Nov 2, 2026)</span>
          </div>

          <div className="flex items-center gap-4 text-stone-500">
            <span>&ldquo;Only unaided writing brings it back.&rdquo;</span>
            <span>·</span>
            <button
              onClick={handleExportData}
              className="flex items-center gap-1 text-stone-700 hover:text-stone-900 underline font-medium"
              title="Download your full writing history, error log, and sessions as JSON"
            >
              <Download className="w-3 h-3" />
              <span>Export Recovery Journal</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
