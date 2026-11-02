import React from 'react';
import { PhaseNumber } from '../types';
import {
  CheckSquare,
  Square,
  ShieldCheck,
  ShieldAlert,
  Brain,
  Award,
  ArrowRight,
  ExternalLink,
  BookOpen
} from 'lucide-react';

interface RoadmapViewProps {
  currentPhase: PhaseNumber;
  onPhaseChange: (phase: PhaseNumber) => void;
  gateStatus: Record<string, boolean>;
  onToggleGate: (gateKey: string) => void;
  sessionsCount: number;
  totalWords: number;
}

export const RoadmapView: React.FC<RoadmapViewProps> = ({
  currentPhase,
  onPhaseChange,
  gateStatus,
  onToggleGate,
  sessionsCount,
  totalWords
}) => {
  const gates = [
    {
      phase: 1,
      name: 'Phase 1 — Restart (Weeks 1–4)',
      goal: 'Write plain, correct sentences again without freezing. Quality does not matter yet; volume and speed do.',
      timeframe: 'Weeks 1–4',
      items: [
        { key: 'p1_15_sessions', label: '15 sessions completed in tracker', autoMet: sessionsCount >= 15 },
        { key: 'p1_150_words', label: '150 words written in 15 minutes without stopping' },
        { key: 'p1_errors_identified', label: 'Your 4–5 most frequent errors identified in the tracker' }
      ]
    },
    {
      phase: 2,
      name: 'Phase 2 — Control (Weeks 5–12)',
      goal: 'Control paragraphs on purpose, not by luck. Daily drills in Franklin rebuilds, sentence combining, summarizing, and planning.',
      timeframe: 'Weeks 5–12',
      items: [
        { key: 'p2_6_franklin', label: '6 Franklin rebuilds in which your version keeps every idea of the original' },
        { key: 'p2_8_weekend', label: '8 weekend pieces finished and revised with checklist' },
        { key: 'p2_error_rate', label: 'Your top 3 errors from Phase 1 appear at most once per 300 words' }
      ]
    },
    {
      phase: 3,
      name: 'Phase 3 — Finished Pieces (Months 4–6)',
      goal: 'Finish whole pieces that a stranger would read to the end. Pick one form (Essays 800–1,500w or Stories 1,500–3,000w).',
      timeframe: 'Months 4–6',
      items: [
        { key: 'p3_3_pieces', label: '3 finished pieces of 800+ words' },
        { key: 'p3_2_readers', label: 'Each piece revised after feedback from at least 2 outside readers' },
        { key: 'p3_5_critiques', label: '5 critiques written for other writers (e.g. Scribophile / London Writers\' Salon)' }
      ]
    },
    {
      phase: 4,
      name: 'Phase 4 — Spare-Time Writer (Month 7+)',
      goal: 'Publish once a month on Substack, Medium, or Hub. Maintain weekly Franklin rebuilds. Cultivate decade-scale deliberate practice.',
      timeframe: 'Month 7 onward',
      items: [
        { key: 'p4_publish_monthly', label: 'Monthly publishing rhythm established (draft, critique, revise, publish)' },
        { key: 'p4_weekly_franklin', label: 'Weekly Franklin rebuild on an admired writer in your form' },
        { key: 'p4_long_term', label: 'Long-term practice sustained without AI dependency' }
      ]
    }
  ];

  const rulesTable = [
    {
      use: 'AI drafts or rewrites any sentence',
      allowed: 'Never',
      why: 'This is what caused the loss of sentence fluency',
      badgeClass: 'text-red-700 bg-red-50 border-red-200'
    },
    {
      use: 'Grammarly or autocomplete while drafting',
      allowed: 'Off',
      why: 'Suggestions interrupt the sentence you are actively building',
      badgeClass: 'text-red-700 bg-red-50 border-red-200'
    },
    {
      use: 'AI marks errors after the draft, without fixing them',
      allowed: 'Yes',
      why: 'You still do the repair, which is where real neural learning happens',
      badgeClass: 'text-emerald-700 bg-emerald-50 border-emerald-200'
    },
    {
      use: 'AI explains a grammar rule you got wrong',
      allowed: 'Yes',
      why: 'Rules stick when tied to your own self-identified error',
      badgeClass: 'text-emerald-700 bg-emerald-50 border-emerald-200'
    },
    {
      use: 'Dictionary or example sentences for one word',
      allowed: 'Yes',
      why: 'Checks usage without writing the sentence for you',
      badgeClass: 'text-emerald-700 bg-emerald-50 border-emerald-200'
    }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Overview Card */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs space-y-4">
        <div className="border-b border-stone-100 pb-4">
          <div className="flex items-center gap-2 text-xs text-stone-500 mb-1">
            <span>The Four Phases & Three Gates</span>
            <span>·</span>
            <span>Mastery Driven Progression</span>
          </div>
          <h1 className="font-serif-prose text-2xl font-bold text-stone-900">
            Roadmap & Gate Criteria
          </h1>
          <p className="text-xs text-stone-700 mt-1 leading-relaxed">
            &ldquo;You move to the next phase when its gate is met, not when the calendar says so. If a phase runs long, the plan is still working.&rdquo;
          </p>
        </div>

        {/* The 4 Phases Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {gates.map((g) => {
            const isCurrent = currentPhase === g.phase;
            const completedCount = g.items.filter((item) => gateStatus[item.key] || item.autoMet).length;
            const isAllCompleted = completedCount === g.items.length;

            return (
              <div
                key={g.phase}
                className={`p-4 rounded-xl border transition-all ${
                  isCurrent
                    ? 'border-stone-900 bg-stone-50/70 ring-1 ring-stone-900'
                    : 'border-stone-200 bg-white hover:border-stone-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-serif-prose font-bold text-base text-stone-900">
                    {g.name}
                  </span>
                  <div className="flex items-center gap-2">
                    {isCurrent && (
                      <span className="text-[10px] uppercase font-bold tracking-wider bg-stone-900 text-white px-2 py-0.5 rounded">
                        Active Phase
                      </span>
                    )}
                    {isAllCompleted && (
                      <span className="text-[10px] uppercase font-bold tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                        Gate Passed
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-stone-600 mb-3 leading-relaxed">
                  {g.goal}
                </p>

                {/* Gate Checklist */}
                <div className="space-y-2 border-t border-stone-200/60 pt-3">
                  <div className="text-[11px] font-bold text-stone-700 uppercase tracking-wider">
                    Gate Requirements ({completedCount}/{g.items.length}):
                  </div>
                  {g.items.map((item) => {
                    const checked = !!gateStatus[item.key] || !!item.autoMet;
                    return (
                      <div
                        key={item.key}
                        onClick={() => onToggleGate(item.key)}
                        className="flex items-start gap-2 text-xs text-stone-800 cursor-pointer select-none hover:text-stone-950"
                      >
                        <span className="mt-0.5 text-stone-900 shrink-0">
                          {checked ? (
                            <CheckSquare className="w-4 h-4 text-emerald-700" />
                          ) : (
                            <Square className="w-4 h-4 text-stone-400" />
                          )}
                        </span>
                        <span className={checked ? 'line-through text-stone-500' : ''}>
                          {item.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 pt-2 flex items-center justify-between text-xs">
                  <span className="text-stone-500">{g.timeframe}</span>
                  {!isCurrent && (
                    <button
                      onClick={() => onPhaseChange(g.phase as PhaseNumber)}
                      className="text-stone-700 hover:text-stone-900 font-semibold underline text-xs"
                    >
                      Switch to this Phase &rarr;
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* The Rules: Allowed vs Never */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs space-y-4">
        <div className="border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <h2 className="font-serif-prose text-lg font-bold text-stone-900">
              The Rules of Unaided Writing
            </h2>
          </div>
          <p className="text-xs text-stone-600 mt-0.5">
            You write every word yourself; AI only points at problems after the draft is done.
          </p>
        </div>

        <div className="overflow-x-auto border border-stone-200 rounded-xl">
          <table className="w-full text-left text-xs text-stone-700">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[11px] font-semibold">
              <tr>
                <th className="py-2.5 px-3">Practice / Tool</th>
                <th className="py-2.5 px-3">Allowed?</th>
                <th className="py-2.5 px-3">Why (The Scientific Rationale)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {rulesTable.map((rule, idx) => (
                <tr key={idx} className="hover:bg-stone-50/50">
                  <td className="py-2.5 px-3 font-medium text-stone-900">{rule.use}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border ${rule.badgeClass}`}
                    >
                      {rule.allowed}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-stone-600">{rule.why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MIT Study & Cognitive Debt Scientific Foundation */}
      <div className="bg-amber-50/40 border border-amber-200/80 rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2 text-amber-950 font-bold text-sm">
          <Brain className="w-4 h-4 text-amber-800" />
          <span>The Science: Why Unaided Practice Works</span>
        </div>
        <p className="text-xs text-stone-700 leading-relaxed">
          In a controlled MIT Media Lab study (54 students), participants who drafted essays with AI for three sessions struggled to recall and engage when they later wrote unaided. Participants who wrote unaided first retained their sentence generation advantage once introduced to digital tools.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1 text-stone-600">
          <div className="bg-white p-3 rounded-lg border border-amber-200">
            <strong className="text-stone-900 block mb-1">Kellogg (2008) — Deliberate Practice:</strong>
            Writing demands massive working memory. Daily spaced practice on familiar topics allows lower-level sentence syntax to become automatic, liberating capacity for high-level structure.
          </div>
          <div className="bg-white p-3 rounded-lg border border-amber-200">
            <strong className="text-stone-900 block mb-1">Writing Next Review (Graham & Perin):</strong>
            The methods with the largest positive effect size on writing quality are planning strategies, summarizing, sentence combining, and studying model prose.
          </div>
        </div>
      </div>
    </div>
  );
};
