import React, { useState } from 'react';
import { HabitAnchor } from '../types';
import { MapPin, Clock, Edit2, Check, AlertTriangle, ShieldCheck } from 'lucide-react';

interface HabitAnchorBannerProps {
  anchor: HabitAnchor;
  onSaveAnchor: (anchor: HabitAnchor) => void;
}

export const HabitAnchorBanner: React.FC<HabitAnchorBannerProps> = ({ anchor, onSaveAnchor }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [routine, setRoutine] = useState(anchor.routine);
  const [place, setPlace] = useState(anchor.place);

  const handleSave = () => {
    onSaveAnchor({
      ...anchor,
      routine: routine.trim() || 'finish my morning coffee',
      place: place.trim() || 'at my desk',
      anchorSet: true
    });
    setIsEditing(false);
  };

  return (
    <div className="bg-stone-50 border-b border-stone-200 py-2.5 px-4 sm:px-6 lg:px-8 text-xs text-stone-700">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Habit Anchor Statement */}
        <div className="flex items-center gap-2 flex-1">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          {isEditing ? (
            <div className="flex flex-wrap items-center gap-2 w-full">
              <span className="font-medium text-stone-600">When I</span>
              <input
                type="text"
                value={routine}
                onChange={(e) => setRoutine(e.target.value)}
                placeholder="existing routine (e.g. pour morning coffee)"
                className="bg-white px-2 py-1 rounded border border-stone-300 text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-500 w-64"
              />
              <span className="font-medium text-stone-600">, I will write for 25 minutes at</span>
              <input
                type="text"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                placeholder="place (e.g. the quiet corner table)"
                className="bg-white px-2 py-1 rounded border border-stone-300 text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-500 w-56"
              />
              <button
                onClick={handleSave}
                className="flex items-center gap-1 bg-stone-900 text-white px-2.5 py-1 rounded text-xs hover:bg-stone-800 transition-colors"
              >
                <Check className="w-3 h-3" /> Save Anchor
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-stone-500">Habit Anchor:</span>
              <span className="font-serif-prose text-stone-900 font-semibold text-sm">
                &ldquo;{anchor.routine}, I will write for {anchor.durationMinutes} minutes at {anchor.place}.&rdquo;
              </span>
              <button
                onClick={() => setIsEditing(true)}
                className="text-stone-400 hover:text-stone-700 p-0.5 ml-1 transition-colors"
                title="Edit habit cue"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Time Budget & Safety Rule Reminder */}
        <div className="flex items-center gap-4 text-stone-500 shrink-0">
          <div className="flex items-center gap-1.5" title="Daily target: 25 min writing + 15 min reading">
            <Clock className="w-3.5 h-3.5 text-stone-400" />
            <span>25m write + 15m read</span>
          </div>
          <span className="text-stone-300">·</span>
          <div className="flex items-center gap-1.5" title="Rules: AI never rewrites. Autocomplete OFF while drafting.">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-stone-600 font-medium">Unaided Rule: Zero AI drafting</span>
          </div>
        </div>
      </div>
    </div>
  );
};
