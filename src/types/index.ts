/**
 * ATLASYNTH — Shared Type Definitions & Domain Contracts
 * @license Apache-2.0
 */

export type Language = 'ar' | 'en';
export type Direction = 'rtl' | 'ltr';

export type WorkspaceTab =
  | 'scientific'
  | 'binance'
  | 'research'
  | 'experiments'
  | 'tasks';

// ─── Task & Orchestration Contracts ───────────────────────────

export type TaskStatus =
  | 'idle'
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface TaskRecord {
  id: string;
  domain: 'scientific' | 'financial' | 'research' | 'experiment';
  title: string;
  status: TaskStatus;
  progress: number; // 0 - 100
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  durationMs?: number;
  idempotencyKey: string;
  inputSummary?: Record<string, any>;
  resultSummary?: Record<string, any>;
  errorMessage?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'security';
  component: string;
  message: string;
  details?: Record<string, any>;
}

// ─── Scientific Domain Models ──────────────────────────────────

export interface MatrixOperationResult {
  matrixA: number[][];
  matrixB?: number[][];
  resultMatrix?: number[][];
  scalarResult?: number;
  eigenvalues?: number[];
  steps?: string[];
  durationMs: number;
}

export interface ODESimulationResult {
  timeSeries: number[];
  values: Record<string, number[]>; // variableName -> array of values
  systemName: string;
  parameters: Record<string, number>;
  initialConditions: Record<string, number>;
  stepSize: number;
  durationMs: number;
}

export interface StatisticalAnalysisResult {
  sampleSize: number;
  mean: number;
  median: number;
  variance: number;
  stdDev: number;
  skewness: number;
  kurtosis: number;
  min: number;
  max: number;
  histogram: Array<{ binStart: number; binEnd: number; count: number }>;
  correlation?: {
    pearson: number;
    spearman: number;
  };
  regression?: {
    slope: number;
    intercept: number;
    rSquared: number;
    equation: string;
  };
}

export interface PhysicsSimulationResult {
  model: 'projectile' | 'harmonic_oscillator' | 'lorenz' | 'lotka_volterra';
  time: number[];
  coordinates: Array<{ x: number; y: number; z?: number; label?: string }>;
  energyConserved?: { kinetic: number[]; potential: number[]; total: number[] };
  metrics: Record<string, number>;
}

// ─── Financial & Binance Spot Domain Models ───────────────────

export interface MarketCandle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
  quoteVolume: number;
  trades: number;
  isClosed: boolean;
}

export interface TechnicalIndicators {
  sma20?: (number | null)[];
  ema20?: (number | null)[];
  ema50?: (number | null)[];
  rsi14?: (number | null)[];
  macd?: {
    macdLine: (number | null)[];
    signalLine: (number | null)[];
    histogram: (number | null)[];
  };
  bollinger?: {
    upper: (number | null)[];
    middle: (number | null)[];
    lower: (number | null)[];
  };
  atr14?: (number | null)[];
  hurstExponent?: number; // < 0.5 mean reverting, = 0.5 random walk, > 0.5 trending
  realizedVolatilityAnnualized?: number;
}

export interface TradeRecord {
  id: string;
  entryTime: number;
  exitTime?: number;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  pnl?: number;
  pnlPercent?: number;
  feePaid: number;
  slippageIncurred: number;
  exitReason?: 'SIGNAL' | 'STOP_LOSS' | 'TAKE_PROFIT' | 'END_OF_DATA';
}

export interface BacktestResult {
  runId: string;
  symbol: string;
  timeframe: string;
  strategyName: string;
  parameters: Record<string, any>;
  candleCount: number;
  initialBalance: number;
  finalBalance: number;
  totalReturnPercent: number;
  benchmarkReturnPercent: number; // Buy & hold
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdownPercent: number;
  winRatePercent: number;
  profitFactor: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  equityCurve: Array<{ time: number; equity: number; drawdown: number }>;
  trades: TradeRecord[];
  isCausallySound: boolean; // Verified 0 lookahead bias
}

export type MarketRegime =
  | 'STRONG_BULL_TREND'
  | 'STRONG_BEAR_TREND'
  | 'MEAN_REVERTING_RANGE'
  | 'HIGH_VOLATILITY_EXPANSION'
  | 'LOW_VOLATILITY_COMPRESSION';

// ─── Research & Knowledge Domain Models ───────────────────────

export type EpistemicStatus =
  | 'MATHEMATICALLY_PROVEN'
  | 'EMPIRICALLY_VERIFIED'
  | 'NUMERICAL_APPROXIMATION'
  | 'THEORETICAL_MODEL'
  | 'WORKING_HYPOTHESIS';

export interface ResearchDocument {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  category: 'mathematics' | 'physics' | 'quantitative_finance' | 'computer_science' | 'biology';
  epistemicStatus: EpistemicStatus;
  confidenceScore: number; // 0.0 - 1.0 (0% - 100%)
  sourceName: string;
  sourceUrl?: string;
  license: string;
  retrievedAt: number;
  contentHash: string;
  bibtexCitation: string;
  tags: string[];
  keyFormulas?: string[];
  userNotes?: string;
  verified: boolean;
}

// ─── Experiment & Scripting Models ────────────────────────────

export interface ScriptExperiment {
  id: string;
  title: string;
  description: string;
  code: string;
  parameters: Record<string, number | string>;
  outputLog: string[];
  resultData?: any;
  executionDurationMs?: number;
  status: 'draft' | 'running' | 'success' | 'error';
  lastRunTimestamp?: number;
}
