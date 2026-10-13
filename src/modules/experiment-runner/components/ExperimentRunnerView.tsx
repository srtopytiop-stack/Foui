/**
 * ATLASYNTH — Experiment Runner & Sandboxed Scripting View
 * Bounded CPU execution, console interception, and algorithm templates.
 * @license Apache-2.0
 */

import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Code,
  Copy,
  Cpu,
  Play,
  RotateCcw,
  Shield,
  Terminal,
} from 'lucide-react';
import { taskManager } from '../../../core/orchestrator/taskManager';
import { translations } from '../../../core/i18n/translations';
import { Language } from '../../../types';
import { ScriptExecutionResult, ScriptRunner } from '../sandbox/scriptRunner';

interface Props {
  lang: Language;
}

export const ExperimentRunnerView: React.FC<Props> = ({ lang }) => {
  const t = translations[lang];
  const presets = ScriptRunner.getPresetScripts();

  const [activePreset, setActivePreset] = useState<string>('monte_carlo_pi');
  const [code, setCode] = useState<string>(presets.monte_carlo_pi.code);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<ScriptExecutionResult | null>(null);

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

  return (
    <div className="space-y-6">
      {/* Header Banner */}
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

        {/* Preset Selector */}
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

      {/* Code Editor & Execution Console Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Code Editor Pane */}
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

        {/* Execution Output Console Pane */}
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
                {/* Status banner */}
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

                {/* Console lines */}
                {executionResult.logs.map((line, idx) => (
                  <div key={idx} className="text-zinc-300 flex gap-2">
                    <span className="text-zinc-600 select-none">{idx + 1}.</span>
                    <span className="break-all">{line}</span>
                  </div>
                ))}

                {/* Returned output object */}
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
  );
};
