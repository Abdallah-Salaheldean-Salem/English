import { useState } from 'react';
import { ArrowRight, Check, Compass, Sliders, Calendar } from 'lucide-react';
import { AppState } from '../types';

interface OnboardingModalProps {
  isOpen: boolean;
  onSelectPreset: (preset: 'egypt' | 'standard' | 'custom', customOptions?: Partial<AppState>) => void;
  onClose?: () => void;
}

const COMMON_ERROR_TYPES = [
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

export function OnboardingModal({ isOpen, onSelectPreset, onClose }: OnboardingModalProps) {
  const [activeTab, setActiveTab] = useState<'preset' | 'custom'>('preset');

  // Custom wizard form state
  const [customPhase, setCustomPhase] = useState<1 | 2 | 3 | 4>(1);
  const [customWeekStart, setCustomWeekStart] = useState<0 | 1>(0);
  const [customRestDays, setCustomRestDays] = useState<number[]>([5, 6]);
  const [customPauseLimit, setCustomPauseLimit] = useState<number>(60);
  const [customAnchorRoutine, setCustomAnchorRoutine] = useState<string>(
    'After morning espresso, before opening browser or email'
  );
  const [customAnchorPlace, setCustomAnchorPlace] = useState<string>('Standing desk with phone in another room');
  const [customTop3, setCustomTop3] = useState<string[]>([
    'Subject-Verb Agreement',
    'Tense Shift',
    'Missing / Misused Article',
  ]);

  if (!isOpen) return null;

  const toggleRestDay = (day: number) => {
    if (customRestDays.includes(day)) {
      setCustomRestDays(customRestDays.filter(d => d !== day));
    } else {
      setCustomRestDays([...customRestDays, day].sort());
    }
  };

  const toggleTop3 = (type: string) => {
    if (customTop3.includes(type)) {
      setCustomTop3(customTop3.filter(t => t !== type));
    } else {
      if (customTop3.length < 3) {
        setCustomTop3([...customTop3, type]);
      } else {
        // Replace oldest
        setCustomTop3([...customTop3.slice(1), type]);
      }
    }
  };

  const daysLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handleCustomSubmit = () => {
    onSelectPreset('custom', {
      phase: customPhase,
      weekStart: customWeekStart,
      restDays: customRestDays,
      pauseLimit: customPauseLimit,
      anchorRoutine: customAnchorRoutine,
      anchorPlace: customAnchorPlace,
      top3: customTop3,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-2xl bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-6 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
          <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-muted)] uppercase tracking-wider mb-1">
            <span>Deliberate Practice Setup</span>
            <span>·</span>
            <span>Recovery Plan</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-main)] font-editorial-sans">
            Initialize Your Writing Recovery Schedule
          </h2>
          <p className="text-sm text-[var(--text-muted)] mt-1.5 leading-relaxed">
            Choose your starting routine, weekly rhythm, and target grammatical focus. You can reconfigure these settings at any time.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-[var(--border-subtle)] px-6 bg-[var(--bg-surface)]">
          <button
            type="button"
            onClick={() => setActiveTab('preset')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'preset'
                ? 'border-[var(--accent)] text-[var(--text-main)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Preset Schedules (Choice 1 & 2)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('custom')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'custom'
                ? 'border-[var(--accent)] text-[var(--text-main)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Custom Onboarding Wizard (Choice 3)</span>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {activeTab === 'preset' ? (
            <div className="space-y-4">
              {/* Option 1: Egypt Default */}
              <div
                onClick={() => onSelectPreset('egypt')}
                className="group relative p-5 rounded-lg border border-[var(--border-subtle)] hover:border-[var(--accent)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] cursor-pointer transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-base text-[var(--text-main)]">
                        Option 1: Sunday Start · Egypt Weekend
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-[var(--tag-bg)] text-[var(--text-muted)] font-mono">
                        Spec Default
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
                      Starts in Phase 1 (Fluency sprints). Practice Sunday through Thursday with rest days on Friday and Saturday.
                    </p>
                    <div className="flex items-center gap-3 text-xs text-[var(--text-subtle)] pt-2 font-mono">
                      <span>Phase: 1 (Fluency)</span>
                      <span>·</span>
                      <span>Rest: Fri & Sat</span>
                      <span>·</span>
                      <span>Pause limit: 60s</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="p-2 rounded-full border border-[var(--border-subtle)] group-hover:border-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-[var(--accent-text)] transition-colors"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Option 2: Standard Western Weekend */}
              <div
                onClick={() => onSelectPreset('standard')}
                className="group relative p-5 rounded-lg border border-[var(--border-subtle)] hover:border-[var(--accent)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] cursor-pointer transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-base text-[var(--text-main)]">
                        Option 2: Monday Start · Standard Weekend
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-[var(--tag-bg)] text-[var(--text-muted)] font-mono">
                        Global Standard
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
                      Starts in Phase 1 (Fluency sprints). Practice Monday through Friday with rest days on Saturday and Sunday.
                    </p>
                    <div className="flex items-center gap-3 text-xs text-[var(--text-subtle)] pt-2 font-mono">
                      <span>Phase: 1 (Fluency)</span>
                      <span>·</span>
                      <span>Rest: Sat & Sun</span>
                      <span>·</span>
                      <span>Pause limit: 60s</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="p-2 rounded-full border border-[var(--border-subtle)] group-hover:border-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-[var(--accent-text)] transition-colors"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('custom')}
                  className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] underline underline-offset-4"
                >
                  Need a different starting phase or custom schedule? Switch to Option 3 (Custom Wizard)
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Custom Phase Picker */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-main)] mb-1.5 uppercase tracking-wide">
                  Starting Phase
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { p: 1, label: 'Phase 1: Fluency', desc: 'Timed continuous sprints' },
                    { p: 2, label: 'Phase 2: Control', desc: 'Franklin & combining drills' },
                    { p: 3, label: 'Phase 3: Expansion', desc: 'One-sitting & 3-day pieces' },
                    { p: 4, label: 'Phase 4: Mastery', desc: 'Publishing & peer critique' },
                  ].map(item => (
                    <button
                      key={item.p}
                      type="button"
                      onClick={() => setCustomPhase(item.p as 1 | 2 | 3 | 4)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        customPhase === item.p
                          ? 'border-[var(--accent)] bg-[var(--bg-elevated)] ring-1 ring-[var(--accent)]'
                          : 'border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <div className="font-semibold text-xs text-[var(--text-main)]">{item.label}</div>
                      <div className="text-[11px] text-[var(--text-muted)] mt-0.5">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Week Start & Rest Days */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-main)] mb-1.5 uppercase tracking-wide">
                    First Day of Week
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCustomWeekStart(0)}
                      className={`flex-1 py-2 text-xs font-medium rounded-md border text-center ${
                        customWeekStart === 0
                          ? 'border-[var(--accent)] bg-[var(--bg-elevated)] text-[var(--text-main)] font-semibold'
                          : 'border-[var(--border-subtle)] text-[var(--text-muted)]'
                      }`}
                    >
                      Sunday
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomWeekStart(1)}
                      className={`flex-1 py-2 text-xs font-medium rounded-md border text-center ${
                        customWeekStart === 1
                          ? 'border-[var(--accent)] bg-[var(--bg-elevated)] text-[var(--text-main)] font-semibold'
                          : 'border-[var(--border-subtle)] text-[var(--text-muted)]'
                      }`}
                    >
                      Monday
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-main)] mb-1.5 uppercase tracking-wide">
                    Rest Days (Select to rest)
                  </label>
                  <div className="flex gap-1">
                    {daysLabels.map((lbl, idx) => {
                      const isRest = customRestDays.includes(idx);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => toggleRestDay(idx)}
                          className={`flex-1 py-2 text-xs font-medium rounded border transition-colors ${
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
              </div>

              {/* Pause Limit & Anchor Routine */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-main)] mb-1.5 uppercase tracking-wide">
                    Pause Limit (Seconds before warning)
                  </label>
                  <select
                    value={customPauseLimit}
                    onChange={e => setCustomPauseLimit(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)]"
                  >
                    <option value={30}>30 seconds (Aggressive momentum)</option>
                    <option value={60}>60 seconds (Standard recovery plan)</option>
                    <option value={90}>90 seconds (Moderate contemplation)</option>
                    <option value={120}>120 seconds (Relaxed pacing)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-main)] mb-1.5 uppercase tracking-wide">
                    Anchor Routine & Habit Trigger
                  </label>
                  <input
                    type="text"
                    value={customAnchorRoutine}
                    onChange={e => setCustomAnchorRoutine(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)]"
                    placeholder="e.g. After morning coffee, before Slack"
                  />
                </div>
              </div>

              {/* Top 3 Errors for Gate 2 */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-main)] mb-1 uppercase tracking-wide">
                  Top 3 Target Errors for Gate 2 (Select 3)
                </label>
                <div className="text-[11px] text-[var(--text-muted)] mb-2">
                  Selected: {customTop3.length}/3: {customTop3.join(', ')}
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 border border-[var(--border-subtle)] rounded-md">
                  {COMMON_ERROR_TYPES.map(type => {
                    const isSelected = customTop3.includes(type);
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => toggleTop3(type)}
                        className={`text-xs px-2.5 py-1 rounded border transition-colors flex items-center gap-1 ${
                          isSelected
                            ? 'bg-[var(--accent)] text-[var(--accent-text)] border-[var(--accent)]'
                            : 'border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--border-strong)]'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                        <span>{type}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('preset')}
                  className="px-4 py-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-main)]"
                >
                  Back to Presets
                </button>
                <button
                  type="button"
                  onClick={handleCustomSubmit}
                  className="px-5 py-2 text-xs font-semibold rounded-lg bg-[var(--accent)] text-[var(--accent-text)] hover:opacity-90 transition-opacity flex items-center gap-2"
                >
                  <span>Initialize Custom Plan</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
