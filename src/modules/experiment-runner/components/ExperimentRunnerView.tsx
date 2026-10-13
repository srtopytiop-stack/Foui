/**
 * ATLASYNTH 2.0 — Experiment Runner & Multi-Agent Council Interactive View
 * Sandboxed code evaluation and collaborative multi-agent adversarial research.
 * @license Apache-2.0
 */

import React, { useState } from 'react';
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Clock,
  Code,
  Copy,
  Cpu,
  Layers,
  MessageSquare,
  Play,
  RotateCcw,
  Shield,
  ShieldAlert,
  Sparkles,
  Terminal,
  Users,
} from 'lucide-react';
import { taskManager } from '../../../core/orchestrator/taskManager';
import { translations } from '../../../core/i18n/translations';
import { AgentCouncilSession, AgentMessage, Language } from '../../../types';
import { AgentCouncilEngine } from '../../agent-orchestrator/engine/agentCouncil';
import { ScriptExecutionResult, ScriptRunner } from '../sandbox/scriptRunner';

interface Props {
  lang: Language;
}

export const ExperimentRunnerView: React.FC<Props> = ({ lang }) => {
  const t = translations[lang];
  const presets = ScriptRunner.getPresetScripts();

  const [activeTab, setActiveTab] = useState<'sandbox' | 'council'>('council');

  // Script Runner State
  const [activePreset, setActivePreset] = useState<string>('monte_carlo_pi');
  const [code, setCode] = useState<string>(presets.monte_carlo_pi.code);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<ScriptExecutionResult | null>(null);

  // Agent Council State
  const [hypothesisQuery, setHypothesisQuery] = useState<string>(
    'Does persistent Hurst momentum (H > 0.54) produce genuine alpha after DSR and fee adjustments?'
  );
  const [isDebating, setIsDebating] = useState<boolean>(false);
  const [councilSession, setCouncilSession] = useState<AgentCouncilSession | null>(null);
  const [liveMessages, setLiveMessages] = useState<AgentMessage[]>([]);

  const handleSelectPreset = (key: string) => {
    setActivePreset(key);
    setCode(presets[key].code);
    setExecutionResult(null);
  };

  const handleRunScript = async () => {
    setIsExecuting(true);
    const idempotency = taskManager.generateIdempotencyKey('experiment', 'run_script', { code });
    const { task } = taskManager.registerTask('experiment', `Script: ${activePreset}`, idempotency);

    taskManager.updateTaskProgress(task.id, 50);
    const result = await ScriptRunner.executeScript(code, 4000);
    setExecutionResult(result);

    if (result.success) {
      taskManager.completeTask(task.id, {
        durationMs: result.durationMs,
        logLines: result.logs.length,
      });
    } else {
      taskManager.failTask(task.id, result.error || 'Execution failed');
    }

    setIsExecuting(false);
  };

  const handleStartCouncilDebate = async () => {
    setIsDebating(true);
    setLiveMessages([]);
    setCouncilSession(null);

    const idempotency = taskManager.generateIdempotencyKey('agent', 'council_debate', {
      query: hypothesisQuery,
    });
    const { task } = taskManager.registerTask('agent', 'Multi-Agent Council Debate', idempotency);

    taskManager.updateTaskProgress(task.id, 25);

    const session = await AgentCouncilEngine.deliberate(hypothesisQuery, (newMsg) => {
      setLiveMessages((prev) => [...prev, newMsg]);
    });

    setCouncilSession(session);
    taskManager.completeTask(task.id, { messages: session.messages.length });
    setIsDebating(false);
  };

  return (
    <div className="space-y-6">
      {/* Subtab Toggle (Multi-Agent Council vs Sandboxed Scripting) */}
      <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-none border-b border-zinc-800">
        <button
          onClick={() => setActiveTab('council')}
          className={`flex items-center gap-2 px-3 py-2 text-xs md:text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
            activeTab === 'council'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <Users className="w-4 h-4 text-cyan-400" />
          {t.agentCouncilTitle}
        </button>

        <button
          onClick={() => setActiveTab('sandbox')}
          className={`flex items-center gap-2 px-3 py-2 text-xs md:text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
            activeTab === 'sandbox'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <Terminal className="w-4 h-4 text-cyan-400" />
          {t.experimentsTitle}
        </button>
      </div>

      {/* ─── 1. MULTI-AGENT COUNCIL VIEW ────────────────────────── */}
      {activeTab === 'council' && (
        <div className="space-y-5">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 md:p-5 shadow-lg space-y-4">
            <div>
              <h3 className="text-base md:text-lg font-semibold text-zinc-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-400" />
                {t.agentCouncilTitle}
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">{t.agentCouncilDesc}</p>
            </div>

            {/* Hypothesis Input Bar */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-zinc-400 block">
                Research Hypothesis / Scientific Question:
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={hypothesisQuery}
                  onChange={(e) => setHypothesisQuery(e.target.value)}
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs md:text-sm text-zinc-100 focus:outline-none focus:border-cyan-500 font-mono"
                  placeholder="Enter research hypothesis..."
                />
                <button
                  onClick={handleStartCouncilDebate}
                  disabled={isDebating}
                  className="bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold px-4 py-2 rounded-lg text-xs md:text-sm flex items-center justify-center gap-2 shadow transition active:scale-95"
                >
                  <Bot className={`w-4 h-4 ${isDebating ? 'animate-bounce' : ''}`} />
                  {isDebating ? t.councilDebating : t.startCouncilDebate}
                </button>
              </div>
            </div>

            {/* Council Deliberation Feed */}
            {liveMessages.length > 0 && (
              <div className="space-y-3 pt-2">
                <span className="text-xs font-mono text-zinc-400 block">
                  Council Deliberation Transcript:
                </span>
                <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                  {liveMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-3.5 rounded-xl border text-xs space-y-1.5 transition ${
                        msg.role === 'ADVERSARIAL_CRITIQUE'
                          ? 'bg-rose-950/30 border-rose-800/80 text-rose-200'
                          : msg.role === 'SYNTHESIS_REPORTER'
                          ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
                          : msg.role === 'PLANNER'
                          ? 'bg-purple-950/30 border-purple-800/80 text-purple-200'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-300'
                      }`}
                    >
                      <div className="flex justify-between items-center text-[11px] font-mono">
                        <span className="font-bold flex items-center gap-1.5">
                          <Bot className="w-3.5 h-3.5" />
                          {msg.agentName} ({msg.role})
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            msg.status === 'OBJECTION'
                              ? 'bg-rose-900 text-rose-300'
                              : msg.status === 'CONSENSUS'
                              ? 'bg-emerald-900 text-emerald-300'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {msg.status}
                        </span>
                      </div>
                      <p className="leading-relaxed font-sans text-xs">{msg.content}</p>
                    </div>
                  ))}
                </div>

                {councilSession && (
                  <div className="bg-emerald-950/40 border border-emerald-800 p-3.5 rounded-xl text-xs space-y-1">
                    <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      {t.councilConsensus}
                    </span>
                    <p className="text-zinc-300 font-sans">{councilSession.finalConclusion}</p>
                    {councilSession.overfitWarning && (
                      <p className="text-amber-400 font-sans text-[11px] pt-1">
                        ⚠️ {councilSession.overfitWarning}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── 2. SANDBOXED SCRIPTING VIEW ────────────────────────── */}
      {activeTab === 'sandbox' && (
        <div className="space-y-5">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 md:p-5 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="text-base md:text-lg font-semibold text-zinc-100 flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-cyan-400" />
                  {t.experimentsTitle}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">{t.experimentsSubtitle}</p>
              </div>

              <div className="flex items-center gap-2 text-xs text-emerald-400 bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>{t.safeTimeoutApplied}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1 border-t border-zinc-800/80 text-xs">
              <span className="text-zinc-400 font-mono self-center mr-1">{t.templatePresets}:</span>
              {Object.entries(presets).map(([key, item]) => (
                <button
                  key={key}
                  onClick={() => handleSelectPreset(key)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition ${
                    activePreset === key
                      ? 'bg-cyan-500 text-zinc-950 font-bold shadow'
                      : 'bg-zinc-950 text-zinc-300 hover:bg-zinc-800 border border-zinc-800'
                  }`}
                >
                  {item.title}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 shadow-lg space-y-3 flex flex-col">
              <div className="flex justify-between items-center text-xs">
                <span className="font-mono text-zinc-300 flex items-center gap-1.5">
                  <Code className="w-4 h-4 text-cyan-400" />
                  Deterministic JavaScript / Math Sandbox
                </span>
                <button
                  onClick={() => setCode(presets[activePreset]?.code || '')}
                  className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1 text-[11px]"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset Code
                </button>
              </div>

              <div className="flex-1 min-h-[300px]">
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full h-full min-h-[300px] bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs md:text-sm font-mono text-cyan-300 focus:outline-none focus:border-cyan-500 resize-none leading-relaxed"
                  spellCheck={false}
                />
              </div>

              <div className="pt-2">
                <button
                  onClick={handleRunScript}
                  disabled={isExecuting}
                  className="w-full bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold py-2.5 rounded-lg text-xs md:text-sm flex items-center justify-center gap-2 shadow transition active:scale-95"
                >
                  <Play className="w-4 h-4 fill-current" />
                  {isExecuting ? t.calculating : t.runScript}
                </button>
              </div>
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 shadow-lg space-y-3 flex flex-col">
              <div className="flex justify-between items-center text-xs">
                <span className="font-mono text-zinc-300 flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  {t.executionConsole}
                </span>

                {executionResult && (
                  <span className="text-[11px] font-mono text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                    Time: {executionResult.durationMs}ms
                  </span>
                )}
              </div>

              <div className="flex-1 min-h-[300px] bg-zinc-950 border border-zinc-800 rounded-xl p-3 font-mono text-xs overflow-y-auto max-h-[420px] space-y-1">
                {!executionResult && (
                  <div className="text-zinc-500 italic p-4 text-center">
                    Click "{t.runScript}" to execute the sandboxed algorithm and view live telemetry.
                  </div>
                )}

                {executionResult && (
                  <div className="space-y-1">
                    <div
                      className={`p-2 rounded text-[11px] font-semibold flex items-center gap-2 mb-2 ${
                        executionResult.success
                          ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800'
                          : 'bg-rose-950/60 text-rose-300 border border-rose-800'
                      }`}
                    >
                      {executionResult.success ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          Execution Succeeded in {executionResult.durationMs}ms
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                          Error: {executionResult.error}
                        </>
                      )}
                    </div>

                    {executionResult.logs.map((line, idx) => (
                      <div key={idx} className="text-zinc-300 flex gap-2">
                        <span className="text-zinc-600 select-none">{idx + 1}.</span>
                        <span className="break-all">{line}</span>
                      </div>
                    ))}

                    {executionResult.outputValue !== undefined && (
                      <div className="pt-2 mt-2 border-t border-zinc-800 text-cyan-400">
                        <span className="text-zinc-500 block mb-1">Return Value:</span>
                        <pre className="bg-zinc-900/80 p-2 rounded text-[11px] overflow-x-auto text-cyan-300">
                          {typeof executionResult.outputValue === 'object'
                            ? JSON.stringify(executionResult.outputValue, null, 2)
                            : String(executionResult.outputValue)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
