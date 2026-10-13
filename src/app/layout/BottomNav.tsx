/**
 * ATLASYNTH — Mobile Bottom Navigation Bar
 * Ergonomic thumb-friendly navigation designed for high-density mobile usability.
 * @license Apache-2.0
 */

import React from 'react';
import {
  Activity,
  Atom,
  BookOpen,
  ListChecks,
  Terminal,
  TrendingUp,
} from 'lucide-react';
import { translations } from '../../core/i18n/translations';
import { Language, WorkspaceTab } from '../../types';

interface Props {
  activeTab: WorkspaceTab;
  setActiveTab: (tab: WorkspaceTab) => void;
  lang: Language;
  activeTasksCount: number;
}

export const BottomNav: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  lang,
  activeTasksCount,
}) => {
  const t = translations[lang];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800/80 px-2 py-1.5 safe-area-bottom">
      <div className="grid grid-cols-5 gap-1 max-w-md mx-auto">
        <button
          onClick={() => setActiveTab('scientific')}
          className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all ${
            activeTab === 'scientific'
              ? 'text-cyan-400 font-semibold bg-cyan-950/40'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Atom className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight truncate max-w-full">
            {lang === 'ar' ? 'العلمي' : 'Science'}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('binance')}
          className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all ${
            activeTab === 'binance'
              ? 'text-emerald-400 font-semibold bg-emerald-950/40'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <TrendingUp className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight truncate max-w-full">
            {lang === 'ar' ? 'بينانس' : 'Binance'}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('research')}
          className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all ${
            activeTab === 'research'
              ? 'text-cyan-400 font-semibold bg-cyan-950/40'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <BookOpen className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight truncate max-w-full">
            {lang === 'ar' ? 'الأبحاث' : 'Research'}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('experiments')}
          className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all ${
            activeTab === 'experiments'
              ? 'text-cyan-400 font-semibold bg-cyan-950/40'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Terminal className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight truncate max-w-full">
            {lang === 'ar' ? 'تجارب' : 'Scripts'}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all relative ${
            activeTab === 'tasks'
              ? 'text-cyan-400 font-semibold bg-cyan-950/40'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <ListChecks className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight truncate max-w-full">
            {lang === 'ar' ? 'المهام' : 'Tasks'}
          </span>
          {activeTasksCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-cyan-400 absolute top-1.5 right-4 animate-ping" />
          )}
        </button>
      </div>
    </nav>
  );
};
