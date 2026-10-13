/**
 * ATLASYNTH — Task Orchestrator & Security Audit Trail View
 * Real-time monitoring of computational jobs, cancellation tokens, and audit events.
 * @license Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Info,
  ListChecks,
  RotateCcw,
  Shield,
  ShieldAlert,
  Trash2,
  XCircle,
} from 'lucide-react';
import { taskManager } from '../../../core/orchestrator/taskManager';
import { translations } from '../../../core/i18n/translations';
import { AuditLogEntry, Language, TaskRecord } from '../../../types';

interface Props {
  lang: Language;
}

export const TaskAuditView: React.FC<Props> = ({ lang }) => {
  const t = translations[lang];

  const [tasks, setTasks] = useState<TaskRecord[]>(() => taskManager.getTasks());
  const [logs, setLogs] = useState<AuditLogEntry[]>(() => taskManager.getAuditLogs());

  useEffect(() => {
    const unsubscribe = taskManager.subscribe(() => {
      setTasks(taskManager.getTasks());
      setLogs(taskManager.getAuditLogs());
    });
    return unsubscribe;
  }, []);

  const activeTasks = tasks.filter((task) => task.status === 'running' || task.status === 'queued');
  const pastTasks = tasks.filter((task) => task.status !== 'running' && task.status !== 'queued');

  const handleExportAudit = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify({ tasks, auditLogs: logs }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `atlasynth_audit_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 md:p-5 shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="text-base md:text-lg font-semibold text-zinc-100 flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-cyan-400" />
            {t.taskHubTitle}
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Idempotency regulation, cancellation controllers, and security audit event trail.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleExportAudit}
            className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded-lg border border-zinc-700 text-xs font-medium transition"
          >
            <Download className="w-3.5 h-3.5" />
            {t.exportData}
          </button>

          <button
            onClick={() => taskManager.clearAll()}
            className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-rose-300 px-3 py-1.5 rounded-lg border border-zinc-700 text-xs font-medium transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {t.clearAll}
          </button>
        </div>
      </div>

      {/* ─── Active Running Tasks ──────────────────────────────── */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 shadow-lg space-y-3">
        <h4 className="text-xs md:text-sm font-semibold text-zinc-200 flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          {t.activeTasks} ({activeTasks.length})
        </h4>

        {activeTasks.length === 0 ? (
          <p className="text-xs text-zinc-500 italic p-3 bg-zinc-950/60 rounded-lg border border-zinc-800">
            {t.noActiveTasks}
          </p>
        ) : (
          <div className="space-y-2">
            {activeTasks.map((task) => (
              <div
                key={task.id}
                className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 space-y-2 text-xs"
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-zinc-100">{task.title}</span>
                  <button
                    onClick={() => taskManager.cancelTask(task.id)}
                    className="text-rose-400 hover:text-rose-300 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-800 text-[11px]"
                  >
                    {t.cancel}
                  </button>
                </div>

                <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${task.progress}%` }}
                    className="bg-cyan-500 h-full rounded-full transition-all duration-300"
                  />
                </div>

                <div className="flex justify-between text-[11px] text-zinc-400 font-mono">
                  <span>Progress: {task.progress}%</span>
                  <span>Key: {task.idempotencyKey.substring(0, 18)}...</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Task History & Audit Trail ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Completed / Past Tasks */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 shadow-lg space-y-3 flex flex-col">
          <h4 className="text-xs md:text-sm font-semibold text-zinc-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {t.completedTasks} ({pastTasks.length})
          </h4>

          <div className="flex-1 max-h-[350px] overflow-y-auto space-y-2 font-mono text-xs pr-1">
            {pastTasks.length === 0 ? (
              <p className="text-zinc-500 italic p-3 text-center">No completed tasks yet.</p>
            ) : (
              pastTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-zinc-950 p-3 rounded-lg border border-zinc-800/80 space-y-1"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-200 font-semibold truncate max-w-[200px]">
                      {task.title}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${
                        task.status === 'completed'
                          ? 'bg-emerald-950 text-emerald-400'
                          : task.status === 'failed'
                          ? 'bg-rose-950 text-rose-400'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {task.status}
                    </span>
                  </div>

                  <div className="flex justify-between text-[11px] text-zinc-400">
                    <span>Duration: {task.durationMs || 0}ms</span>
                    <span>Domain: {task.domain}</span>
                  </div>

                  {task.errorMessage && (
                    <p className="text-[11px] text-rose-400 pt-1 font-sans">{task.errorMessage}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Security & System Audit Trail */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 shadow-lg space-y-3 flex flex-col">
          <h4 className="text-xs md:text-sm font-semibold text-zinc-200 flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            {t.auditLogs}
          </h4>

          <div className="flex-1 max-h-[350px] overflow-y-auto space-y-1.5 font-mono text-xs pr-1">
            {logs.length === 0 ? (
              <p className="text-zinc-500 italic p-3 text-center">Audit trail is currently clean.</p>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="bg-zinc-950 p-2.5 rounded border border-zinc-800/70 text-[11px] space-y-0.5"
                >
                  <div className="flex justify-between items-center text-zinc-500">
                    <span className="font-semibold text-zinc-400">[{log.component}]</span>
                    <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-zinc-200">
                    {log.level === 'error' ? (
                      <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    ) : log.level === 'warn' ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    ) : (
                      <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    )}
                    <span className="break-all">{log.message}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
