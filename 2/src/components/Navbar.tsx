import React from 'react';
import { PhaseNumber } from '../types';
import { BookOpen, Flame, Compass, AlertCircle, FileText, PenTool, CheckSquare } from 'lucide-react';

interface NavbarProps {
  currentPhase: PhaseNumber;
  onPhaseChange: (phase: PhaseNumber) => void;
  activeTab: 'write' | 'drills' | 'errors' | 'roadmap' | 'reading' | 'reference';
  onTabChange: (tab: 'write' | 'drills' | 'errors' | 'roadmap' | 'reading' | 'reference') => void;
  sessionsCount: number;
  totalWords: number;
  drillTargetsCount: number;
  onOpenOriginalPlan: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPhase,
  onPhaseChange,
  activeTab,
  onTabChange,
  sessionsCount,
  totalWords,
  drillTargetsCount,
  onOpenOriginalPlan
}) => {
  return (
    <header className="border-b border-stone-200 bg-white/90 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-stone-900 text-stone-100 flex items-center justify-center font-serif-prose font-bold text-lg shadow-sm">
              U
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif-prose font-bold text-xl tracking-tight text-stone-900">
                  Unaided
                </span>
                <span className="text-stone-400 text-sm">/</span>
                <span className="text-xs text-stone-600 font-medium tracking-wide uppercase">
                  Writing Recovery
                </span>
              </div>
              <p className="text-[11px] text-stone-500">
                Deliberate practice · 4 phases · King Plan
              </p>
            </div>
          </div>

          {/* Phase Switcher (Segmented Control) */}
          <div className="hidden md:flex items-center bg-stone-100 p-1 rounded-lg border border-stone-200">
            <span className="text-xs font-medium text-stone-500 px-2">Phase:</span>
            {([1, 2, 3, 4] as PhaseNumber[]).map((p) => {
              const labels = ['1 · Restart', '2 · Control', '3 · Pieces', '4 · Publish'];
              const isActive = currentPhase === p;
              return (
                <button
                  key={p}
                  onClick={() => onPhaseChange(p)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                    isActive
                      ? 'bg-white text-stone-900 shadow-xs font-semibold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {labels[p - 1]}
                </button>
              );
            })}
          </div>

          {/* Practice Metrics & Quick Reference */}
          <div className="flex items-center gap-4 text-xs text-stone-600">
            <div className="hidden sm:flex items-center gap-3">
              <span className="flex items-center gap-1.5 font-medium text-stone-700">
                <Flame className="w-3.5 h-3.5 text-amber-600" />
                <span>{sessionsCount} sessions</span>
              </span>
              <span className="text-stone-300">·</span>
              <span className="font-mono-code text-stone-700">
                {totalWords.toLocaleString()} words
              </span>
              {drillTargetsCount > 0 && (
                <>
                  <span className="text-stone-300">·</span>
                  <span className="text-red-700 font-medium flex items-center gap-1 bg-red-50 px-2 py-0.5 rounded text-[11px]">
                    <AlertCircle className="w-3 h-3 text-red-600" />
                    {drillTargetsCount} active drill targets
                  </span>
                </>
              )}
            </div>

            <button
              onClick={onOpenOriginalPlan}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-md transition-colors border border-stone-200"
              title="View full source plan document"
            >
              <FileText className="w-3.5 h-3.5 text-stone-600" />
              <span>Full Plan</span>
            </button>
          </div>
        </div>

        {/* Primary Navigation Tabs */}
        <nav className="flex space-x-1 border-t border-stone-100 overflow-x-auto py-1.5 text-xs">
          <button
            onClick={() => onTabChange('write')}
            className={`flex items-center gap-1.5 px-3 py-2 font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'write'
                ? 'bg-stone-900 text-white'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Phase 1: Daily Sprint (25m)</span>
          </button>

          <button
            onClick={() => onTabChange('drills')}
            className={`flex items-center gap-1.5 px-3 py-2 font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'drills'
                ? 'bg-stone-900 text-white'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Phase 2: Deliberate Drills</span>
          </button>

          <button
            onClick={() => onTabChange('errors')}
            className={`flex items-center gap-1.5 px-3 py-2 font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'errors'
                ? 'bg-stone-900 text-white'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Error Log & 3-Strike Drills</span>
            {drillTargetsCount > 0 && (
              <span className="ml-1 bg-red-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {drillTargetsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onTabChange('roadmap')}
            className={`flex items-center gap-1.5 px-3 py-2 font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'roadmap'
                ? 'bg-stone-900 text-white'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Roadmap & Gate Criteria</span>
          </button>

          <button
            onClick={() => onTabChange('reading')}
            className={`flex items-center gap-1.5 px-3 py-2 font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'reading'
                ? 'bg-stone-900 text-white'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Reading Habit (15m)</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
