/**
 * ATLASYNTH — Master Platform Shell & Workspace Orchestrator
 * Multidisciplinary Scientific, Financial, and Computational Laboratory.
 * @license Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { BottomNav } from './app/layout/BottomNav';
import { Navbar } from './app/layout/Navbar';
import { taskManager } from './core/orchestrator/taskManager';
import { BinanceSpotView } from './modules/binance-spot/components/BinanceSpotView';
import { ExperimentRunnerView } from './modules/experiment-runner/components/ExperimentRunnerView';
import { ResearchKnowledgeView } from './modules/research-knowledge/components/ResearchKnowledgeView';
import { ScientificLabView } from './modules/scientific-lab/components/ScientificLabView';
import { TaskAuditView } from './modules/tasks-audit/components/TaskAuditView';
import { Language, WorkspaceTab } from './types';

export default function App() {
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('atlasynth_lang') as Language) || 'ar';
  });

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('scientific');
  const [activeTasksCount, setActiveTasksCount] = useState<number>(0);

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    localStorage.setItem('atlasynth_lang', lang);
  }, [lang]);

  useEffect(() => {
    const updateTaskCount = () => {
      const active = taskManager
        .getTasks()
        .filter((t) => t.status === 'running' || t.status === 'queued').length;
      setActiveTasksCount(active);
    };

    updateTaskCount();
    const unsubscribe = taskManager.subscribe(updateTaskCount);
    return unsubscribe;
  }, []);

  const toggleLang = () => {
    setLang((prev) => (prev === 'ar' ? 'en' : 'ar'));
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        lang={lang}
        toggleLang={toggleLang}
        activeTasksCount={activeTasksCount}
      />

      {/* Main Workspace Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 pb-24 md:pb-10">
        {activeTab === 'scientific' && <ScientificLabView lang={lang} />}
        {activeTab === 'binance' && <BinanceSpotView lang={lang} />}
        {activeTab === 'research' && <ResearchKnowledgeView lang={lang} />}
        {activeTab === 'experiments' && <ExperimentRunnerView lang={lang} />}
        {activeTab === 'tasks' && <TaskAuditView lang={lang} />}
      </main>

      {/* Mobile Ergonomic Bottom Nav */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        lang={lang}
        activeTasksCount={activeTasksCount}
      />
    </div>
  );
}
