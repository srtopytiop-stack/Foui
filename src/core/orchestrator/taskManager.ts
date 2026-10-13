/**
 * ATLASYNTH — Orchestration Engine & Security Audit Gateway
 * Manages computational task lifecycle, cancellation, idempotency, and audit trails.
 * @license Apache-2.0
 */

import { AuditLogEntry, TaskRecord, TaskStatus } from '../../types';

class TaskManager {
  private tasks: Map<string, TaskRecord> = new Map();
  private abortControllers: Map<string, AbortController> = new Map();
  private auditLogs: AuditLogEntry[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const savedTasks = localStorage.getItem('atlasynth_tasks');
      if (savedTasks) {
        const parsed = JSON.parse(savedTasks) as TaskRecord[];
        parsed.forEach((t) => this.tasks.set(t.id, t));
      }
      const savedLogs = localStorage.getItem('atlasynth_audit_logs');
      if (savedLogs) {
        this.auditLogs = JSON.parse(savedLogs);
      }
    } catch {
      // Ignore storage errors on restricted environments
    }
  }

  private persist() {
    try {
      const taskArray = Array.from(this.tasks.values()).slice(-50); // Keep last 50 tasks
      localStorage.setItem('atlasynth_tasks', JSON.stringify(taskArray));
      localStorage.setItem('atlasynth_audit_logs', JSON.stringify(this.auditLogs.slice(-100)));
    } catch {
      // Fail safely
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.persist();
    this.listeners.forEach((l) => l());
  }

  public logAudit(
    level: 'info' | 'warn' | 'error' | 'security',
    component: string,
    message: string,
    details?: Record<string, any>
  ) {
    const entry: AuditLogEntry = {
      id: 'log_' + Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      level,
      component,
      message,
      details,
    };
    this.auditLogs.unshift(entry);
    if (this.auditLogs.length > 200) {
      this.auditLogs.pop();
    }
    this.notify();
  }

  /**
   * Generates a safe deterministic idempotency key
   */
  public generateIdempotencyKey(domain: string, action: string, payload: any): string {
    const serialized = JSON.stringify(payload);
    let hash = 0;
    for (let i = 0; i < serialized.length; i++) {
      hash = (hash << 5) - hash + serialized.charCodeAt(i);
      hash |= 0;
    }
    return `${domain}_${action}_${Math.abs(hash).toString(16)}`;
  }

  /**
   * Registers a task. Returns existing result if an identical idempotent task succeeded.
   */
  public registerTask(
    domain: 'scientific' | 'financial' | 'research' | 'experiment' | 'agent',
    title: string,
    idempotencyKey: string,
    inputSummary?: Record<string, any>
  ): { task: TaskRecord; isCached: boolean; controller: AbortController } {
    // Check if duplicate running or completed task exists
    for (const t of this.tasks.values()) {
      if (t.idempotencyKey === idempotencyKey && t.status === 'completed') {
        this.logAudit('info', 'TaskManager', `Cache hit for idempotent task: ${title}`, { idempotencyKey });
        const dummyController = new AbortController();
        return { task: t, isCached: true, controller: dummyController };
      }
    }

    const id = 'task_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    const controller = new AbortController();
    this.abortControllers.set(id, controller);

    const task: TaskRecord = {
      id,
      domain,
      title,
      status: 'queued',
      progress: 0,
      createdAt: Date.now(),
      idempotencyKey,
      inputSummary,
    };

    this.tasks.set(id, task);
    this.logAudit('info', 'TaskManager', `Task registered: ${title}`, { id, domain });
    this.notify();

    return { task, isCached: false, controller };
  }

  public updateTaskProgress(id: string, progress: number, status: TaskStatus = 'running') {
    const task = this.tasks.get(id);
    if (!task) return;

    if (task.status === 'queued') {
      task.startedAt = Date.now();
    }

    task.progress = Math.min(100, Math.max(0, progress));
    task.status = status;
    this.notify();
  }

  public completeTask(id: string, resultSummary?: Record<string, any>) {
    const task = this.tasks.get(id);
    if (!task) return;

    task.status = 'completed';
    task.progress = 100;
    task.finishedAt = Date.now();
    task.durationMs = task.startedAt ? task.finishedAt - task.startedAt : 0;
    task.resultSummary = resultSummary;

    this.abortControllers.delete(id);
    this.logAudit('info', 'TaskManager', `Task completed in ${task.durationMs}ms: ${task.title}`, { id });
    this.notify();
  }

  public failTask(id: string, errorMessage: string) {
    const task = this.tasks.get(id);
    if (!task) return;

    task.status = 'failed';
    task.finishedAt = Date.now();
    task.durationMs = task.startedAt ? task.finishedAt - task.startedAt : 0;
    task.errorMessage = errorMessage;

    this.abortControllers.delete(id);
    this.logAudit('error', 'TaskManager', `Task failed: ${task.title} — ${errorMessage}`, { id });
    this.notify();
  }

  public cancelTask(id: string) {
    const task = this.tasks.get(id);
    if (!task) return;

    const controller = this.abortControllers.get(id);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(id);
    }

    task.status = 'cancelled';
    task.finishedAt = Date.now();
    task.durationMs = task.startedAt ? task.finishedAt - task.startedAt : 0;

    this.logAudit('warn', 'TaskManager', `Task cancelled by user: ${task.title}`, { id });
    this.notify();
  }

  public getTasks(): TaskRecord[] {
    return Array.from(this.tasks.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  public getAuditLogs(): AuditLogEntry[] {
    return [...this.auditLogs];
  }

  public clearAll() {
    this.tasks.clear();
    this.auditLogs = [];
    this.persist();
    this.notify();
  }
}

export const taskManager = new TaskManager();
