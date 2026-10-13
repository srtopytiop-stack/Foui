/**
 * ATLASYNTH — Top Navigation & System Status Bar
 * @license Apache-2.0
 */

import React from 'react';
import {
  Activity,
  Atom,
  BookOpen,
  Globe,
  ListChecks,
  ShieldCheck,
  Terminal,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { translations } from '../../core/i18n/translations';
import { Language, WorkspaceTab } from '../../types';

interface Props {
  activeTab: WorkspaceTab;
  setActiveTab: (tab: WorkspaceTab) => void;
  lang: Language;
  toggleLang: () => void;
  activeTasksCount: number;
}

export const Navbar: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  lang,
  toggleLang,
  activeTasksCount,
}) => {
  const t = translations[lang];

  return (
    <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 p-0.5 flex items-center justify-center shadow-lg shadow-cyan-500/10">
            <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
              <Atom className="w-5 h-5 text-cyan-400" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base md:text-lg font-black tracking-wider text-zinc-100 font-mono">
                {t.appName}
              </h1>
              <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-1.5 py-0.2 rounded font-mono font-semibold hidden sm:inline-block">
                LAB v1.0
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 hidden sm:block truncate max-w-xs md:max-w-sm">
              {t.tagline}
            </p>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 bg-zinc-900/60 p-1 rounded-xl border border-zinc-800/80 text-xs font-medium">
          <button
            onClick={() => setActiveTab('scientific')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'scientific'
                ? 'bg-cyan-500 text-zinc-950 font-bold shadow'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <Atom className="w-3.5 h-3.5" />
            {t.tabScientific}
          </button>

          <button
            onClick={() => setActiveTab('binance')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'binance'
                ? 'bg-emerald-500 text-zinc-950 font-bold shadow'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            {t.tabBinance}
          </button>

          <button
            onClick={() => setActiveTab('research')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'research'
                ? 'bg-cyan-500 text-zinc-950 font-bold shadow'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            {t.tabResearch}
          </button>

          <button
            onClick={() => setActiveTab('experiments')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'experiments'
                ? 'bg-cyan-500 text-zinc-950 font-bold shadow'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            {t.tabExperiments}
          </button>

          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all relative ${
              activeTab === 'tasks'
                ? 'bg-cyan-500 text-zinc-950 font-bold shadow'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <ListChecks className="w-3.5 h-3.5" />
            {t.tabTasks}
            {activeTasksCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping absolute -top-0.5 -right-0.5" />
            )}
          </button>
        </nav>

        {/* Language Switcher & Task Indicator */}
        <div className="flex items-center gap-2">
          {activeTasksCount > 0 && (
            <div className="flex items-center gap-1.5 bg-cyan-950/60 text-cyan-300 border border-cyan-800 px-2.5 py-1 rounded-lg text-xs font-mono">
              <Activity className="w-3.5 h-3.5 animate-spin" />
              <span>{activeTasksCount}</span>
            </div>
          )}

          {/* Bilingual Toggle (العربية / English) */}
          <button
            onClick={toggleLang}
            className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition active:scale-95"
            title="Toggle Language / تبديل اللغة"
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>{lang === 'ar' ? 'English' : 'العربية'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
