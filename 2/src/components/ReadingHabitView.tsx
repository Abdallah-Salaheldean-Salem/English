import React, { useState, useEffect } from 'react';
import { ReadingItem, WeeklyTrackerRow } from '../types';
import {
  BookOpen,
  Clock,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Plus,
  Bookmark
} from 'lucide-react';

interface ReadingHabitViewProps {
  readingItems: ReadingItem[];
  onUpdateReadingItems: (items: ReadingItem[]) => void;
  weeklyTracker: WeeklyTrackerRow[];
  onUpdateWeeklyTracker: (tracker: WeeklyTrackerRow[]) => void;
}

export const ReadingHabitView: React.FC<ReadingHabitViewProps> = ({
  readingItems,
  onUpdateReadingItems,
  weeklyTracker,
  onUpdateWeeklyTracker
}) => {
  // 15-minute timer
  const [timerSeconds, setTimerSeconds] = useState(15 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedBookIndex, setSelectedBookIndex] = useState(0);
  const [sessionNotes, setSessionNotes] = useState('');
  const [justLogged, setJustLogged] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (isRunning && timerSeconds > 0) {
      interval = setInterval(() => setTimerSeconds((s) => s - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, timerSeconds]);

  const activeBook = readingItems[selectedBookIndex] || readingItems[0];

  const handleLog15Min = () => {
    const updated = readingItems.map((item, idx) =>
      idx === selectedBookIndex
        ? {
            ...item,
            minutesLogged: item.minutesLogged + 15,
            sessionsLogged: item.sessionsLogged + 1,
            notes: sessionNotes.trim()
              ? (item.notes ? item.notes + '\n\n' : '') + sessionNotes.trim()
              : item.notes
          }
        : item
    );
    onUpdateReadingItems(updated);
    setJustLogged(true);
    setSessionNotes('');
    setTimerSeconds(15 * 60);
    setIsRunning(false);
    setTimeout(() => setJustLogged(false), 3000);
  };

  const handleToggleCompleted = (idx: number) => {
    const updated = [...readingItems];
    updated[idx].completed = !updated[idx].completed;
    onUpdateReadingItems(updated);
  };

  const handleWeeklyRowChange = (index: number, field: keyof WeeklyTrackerRow, value: any) => {
    const updated = [...weeklyTracker];
    updated[index] = { ...updated[index], [field]: value };
    onUpdateWeeklyTracker(updated);
  };

  const addWeeklyRow = () => {
    const nextWeek = weeklyTracker.length + 1;
    const newRow: WeeklyTrackerRow = {
      week: nextWeek,
      sessionsDone: 0,
      wordsWritten: 0,
      mostCommonError: '—',
      gateProgress: 'In progress'
    };
    onUpdateWeeklyTracker([...weeklyTracker, newRow]);
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* 15-Minute Reading Engine Card */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs space-y-4">
        <div className="border-b border-stone-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-stone-500 mb-1">
              <span>Daily Reading Slot</span>
              <span>·</span>
              <span>15 Minutes in English</span>
            </div>
            <h1 className="font-serif-prose text-2xl font-bold text-stone-900">
              Reading for Writing
            </h1>
            <p className="text-xs text-stone-600 mt-0.5">
              &ldquo;Read it in your 15-minute daily reading slot, in place of phone scrolling if possible. Research reviews find that reading improves writing quality.&rdquo;
            </p>
          </div>

          {/* 15m Timer */}
          <div className="flex items-center gap-3 bg-stone-50 p-2 rounded-lg border border-stone-200 shrink-0">
            <div className="font-mono-code font-bold text-base text-stone-900 px-2">
              {formatTimer(timerSeconds)}
            </div>
            <button
              onClick={() => setIsRunning(!isRunning)}
              className="flex items-center gap-1 bg-stone-900 text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-stone-800"
            >
              {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isRunning ? 'Pause' : 'Start 15m'}</span>
            </button>
            <button
              onClick={() => {
                setIsRunning(false);
                setTimerSeconds(15 * 60);
              }}
              className="p-1 text-stone-400 hover:text-stone-700"
              title="Reset timer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Quick Log Row */}
        <div className="bg-stone-50 p-3.5 rounded-lg border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-stone-700" />
            <span className="font-semibold text-stone-800">Current Book:</span>
            <select
              value={selectedBookIndex}
              onChange={(e) => setSelectedBookIndex(Number(e.target.value))}
              className="bg-white border border-stone-300 rounded px-2.5 py-1 text-xs text-stone-900 font-medium"
            >
              {readingItems.map((b, idx) => (
                <option key={idx} value={idx}>
                  Phase {b.phase}: {b.author} — {b.bookTitle}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              placeholder="Memorable sentence or pages read today..."
              className="bg-white border border-stone-300 rounded px-2.5 py-1 text-xs text-stone-900 w-64"
            />
            <button
              onClick={handleLog15Min}
              className="bg-emerald-800 hover:bg-emerald-900 text-white px-3 py-1 rounded text-xs font-semibold flex items-center gap-1 shadow-2xs"
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Log 15m</span>
            </button>
          </div>
        </div>

        {justLogged && (
          <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded text-xs font-semibold">
            15 minutes logged to {activeBook.bookTitle}! Total: {activeBook.minutesLogged} mins ({activeBook.sessionsLogged} sessions).
          </div>
        )}

        {/* The 5 Recommended Books for the 4 Phases */}
        <div className="space-y-3 pt-2">
          <div className="text-xs font-bold text-stone-800 uppercase tracking-wider">
            Curated Reading List by Phase (1 Book Per Phase Is Enough):
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {readingItems.map((item, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-xl border text-xs flex flex-col justify-between transition-colors ${
                  item.completed
                    ? 'bg-stone-50 border-stone-200 opacity-70'
                    : 'bg-white border-stone-300 hover:border-stone-400'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                      Phase {item.phase}
                    </span>
                    <button
                      onClick={() => handleToggleCompleted(idx)}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                        item.completed
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200'
                      }`}
                    >
                      {item.completed ? 'Finished' : 'Mark Done'}
                    </button>
                  </div>

                  <h3 className="font-serif-prose font-bold text-sm text-stone-900 leading-snug">
                    {item.bookTitle}
                  </h3>
                  <div className="text-stone-600 text-[11px] font-medium">
                    by {item.author}
                  </div>
                  <p className="text-stone-600 text-[11px] leading-relaxed pt-1">
                    {item.whyThisOne}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500 font-mono-code">
                  <span>{item.sessionsLogged} sessions</span>
                  <span>{item.minutesLogged} mins total</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Weekly Tracker Table (from King's plan) */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
          <div>
            <h2 className="font-serif-prose text-lg font-bold text-stone-900">
              Weekly Consistency Tracker
            </h2>
            <p className="text-xs text-stone-600">
              &ldquo;Fill in one row each week. The plan still works at 4 sessions a week; it fails at zero for two weeks.&rdquo;
            </p>
          </div>

          <button
            onClick={addWeeklyRow}
            className="flex items-center gap-1 text-xs text-stone-700 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-md border border-stone-200 font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Week Row</span>
          </button>
        </div>

        <div className="overflow-x-auto border border-stone-200 rounded-xl">
          <table className="w-full text-left text-xs text-stone-700">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[11px] font-semibold">
              <tr>
                <th className="py-2.5 px-3">Week</th>
                <th className="py-2.5 px-3">Sessions (of 5)</th>
                <th className="py-2.5 px-3">Words Written</th>
                <th className="py-2.5 px-3">Most Common Error</th>
                <th className="py-2.5 px-3">Gate Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {weeklyTracker.map((row, idx) => (
                <tr key={idx} className="hover:bg-stone-50/50">
                  <td className="py-2.5 px-3 font-mono-code font-bold text-stone-900">
                    Week {row.week}
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="number"
                      min="0"
                      max="7"
                      value={row.sessionsDone}
                      onChange={(e) =>
                        handleWeeklyRowChange(idx, 'sessionsDone', Number(e.target.value))
                      }
                      className="w-16 bg-white border border-stone-300 rounded px-2 py-1 text-xs font-mono-code text-stone-900 text-center"
                    />
                    <span className="text-stone-400 ml-1">/ 5</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="number"
                      value={row.wordsWritten}
                      onChange={(e) =>
                        handleWeeklyRowChange(idx, 'wordsWritten', Number(e.target.value))
                      }
                      className="w-24 bg-white border border-stone-300 rounded px-2 py-1 text-xs font-mono-code text-stone-900"
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="text"
                      value={row.mostCommonError}
                      onChange={(e) =>
                        handleWeeklyRowChange(idx, 'mostCommonError', e.target.value)
                      }
                      placeholder="e.g. Missing article"
                      className="w-44 bg-white border border-stone-300 rounded px-2 py-1 text-xs text-stone-900"
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="text"
                      value={row.gateProgress}
                      onChange={(e) =>
                        handleWeeklyRowChange(idx, 'gateProgress', e.target.value)
                      }
                      placeholder="Gate notes..."
                      className="w-full bg-white border border-stone-300 rounded px-2 py-1 text-xs text-stone-900"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
