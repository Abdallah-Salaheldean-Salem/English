import { ThemeMode } from '../types';
import { ThemeSwitcher } from './ThemeSwitcher';

export type NavView = 'today' | 'focus' | 'pieces' | 'errors' | 'library' | 'progress' | 'settings';

interface NavbarProps {
  activeView: NavView;
  onNavigate: (view: NavView) => void;
  currentTheme: ThemeMode;
  onSelectTheme: (theme: ThemeMode) => void;
  streakCount: number;
  currentPhase: number;
}

export function Navbar({
  activeView,
  onNavigate,
  currentTheme,
  onSelectTheme,
  streakCount,
  currentPhase,
}: NavbarProps) {
  const navItems: Array<{ id: NavView; label: string }> = [
    { id: 'today', label: 'Today' },
    { id: 'focus', label: 'Focus Drill' },
    { id: 'pieces', label: 'Pieces' },
    { id: 'errors', label: 'Error Ledger' },
    { id: 'library', label: 'Library' },
    { id: 'progress', label: 'Progress' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--border-subtle)] bg-[var(--bg-app)]/90 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4 md:gap-8">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => onNavigate('today')}
          className="text-left whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]"
        >
          <span className="text-base sm:text-lg font-semibold tracking-tight text-[var(--text-main)] font-editorial-sans">
            English Writing Recovery
          </span>
        </button>

        {/* Zone 2: Single-line clean navigation links */}
        <nav className="flex items-center gap-1 sm:gap-2 md:gap-4 overflow-x-auto no-scrollbar py-1">
          {navItems.map(item => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 px-2 sm:px-2.5 py-1.5 rounded-md ${
                  isActive
                    ? 'text-[var(--text-main)] bg-[var(--bg-elevated)] font-semibold'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action zone with Theme Switcher */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <ThemeSwitcher currentTheme={currentTheme} onSelectTheme={onSelectTheme} />
        </div>
      </div>
    </header>
  );
}
