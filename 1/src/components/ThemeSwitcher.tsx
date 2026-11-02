import { Sparkles, Moon, Sun, BookOpen } from 'lucide-react';
import { ThemeMode } from '../types';

interface ThemeSwitcherProps {
  currentTheme: ThemeMode;
  onSelectTheme: (theme: ThemeMode) => void;
}

export function ThemeSwitcher({ currentTheme, onSelectTheme }: ThemeSwitcherProps) {
  return (
    <div className="flex items-center gap-1 p-0.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
      <button
        type="button"
        onClick={() => onSelectTheme('monochrome')}
        title="Clean Monochrome Workspace"
        className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap flex items-center gap-1.5 ${
          currentTheme === 'monochrome'
            ? 'bg-[var(--bg-surface)] text-[var(--text-main)] shadow-sm'
            : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
        }`}
      >
        <Sun className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Monochrome</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectTheme('amber')}
        title="Deep Amber Focus (Night Mode)"
        className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap flex items-center gap-1.5 ${
          currentTheme === 'amber'
            ? 'bg-[#181d26] text-[#f59e0b] shadow-sm'
            : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
        }`}
      >
        <Moon className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Amber Focus</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectTheme('editorial')}
        title="Warm Editorial Paper"
        className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap flex items-center gap-1.5 ${
          currentTheme === 'editorial'
            ? 'bg-[#f4f0e6] text-[#8b3a2b] shadow-sm'
            : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
        }`}
      >
        <BookOpen className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Editorial</span>
      </button>
    </div>
  );
}
