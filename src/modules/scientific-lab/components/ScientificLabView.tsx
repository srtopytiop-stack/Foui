/**
 * ATLASYNTH — Scientific Lab Interactive View
 * High-precision numerical computing, ODE graphs, and physical modeling.
 * @license Apache-2.0
 */

import React, { useState } from 'react';
import {
  Atom,
  Binary,
  Calculator,
  Compass,
  Layers,
  LineChart,
  Play,
  RotateCcw,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { taskManager } from '../../../core/orchestrator/taskManager';
import { convertUnits, UNIT_CATEGORIES } from '../../../core/units/converter';
import { translations } from '../../../core/i18n/translations';
import { Language, ODESimulationResult, StatisticalAnalysisResult } from '../../../types';
import { CalculusEngine } from '../engines/calculus';
import { LinearAlgebraEngine } from '../engines/linearAlgebra';
import { StatisticsEngine } from '../engines/statistics';
import { PhysicsEngine } from '../simulations/physicsSim';

interface Props {
  lang: Language;
}

export const ScientificLabView: React.FC<Props> = ({ lang }) => {
  const t = translations[lang];
  const [subTab, setSubTab] = useState<'matrix' | 'ode' | 'stats' | 'physics' | 'units'>('ode');

  // ─── Linear Algebra State ──────────────────────────────────────
  const [matrixSize, setMatrixSize] = useState<number>(3);
  const [matrixA, setMatrixA] = useState<number[][]>([
    [4, 1, 2],
    [1, 5, 1],
    [2, 1, 6],
  ]);
  const [vectorB, setVectorB] = useState<number[]>([14, 19, 23]);
  const [matrixResult, setMatrixResult] = useState<{
    type: string;
    value?: any;
    steps?: string[];
  } | null>(null);

  // ─── ODE State ────────────────────────────────────────────────
  const [odePreset, setOdePreset] = useState<'harmonic' | 'lorenz' | 'lotka_volterra' | 'sir'>('harmonic');
  const [odeParams, setOdeParams] = useState<Record<string, number>>({ gamma: 0.15, omega: 1.2 });
  const [odeInit, setOdeInit] = useState<Record<string, number>>({ x: 1.0, v: 0.0 });
  const [odeTimeEnd, setOdeTimeEnd] = useState<number>(30);
  const [odeResult, setOdeResult] = useState<ODESimulationResult | null>(null);

  // ─── Statistics State ─────────────────────────────────────────
  const [datasetStr, setDatasetStr] = useState<string>(
    '12.4, 15.2, 14.8, 16.1, 11.9, 13.5, 15.8, 18.2, 14.0, 16.9, 15.5, 13.8, 17.1, 14.4, 15.0'
  );
  const [statsResult, setStatsResult] = useState<StatisticalAnalysisResult | null>(null);

  // ─── Physics State ────────────────────────────────────────────
  const [projVelocity, setProjVelocity] = useState<number>(45);
  const [projAngle, setProjAngle] = useState<number>(45);
  const [projDrag, setProjDrag] = useState<number>(0.04);
  const [projResult, setProjResult] = useState<any>(null);

  // ─── Units Converter State ────────────────────────────────────
  const [unitCategory, setUnitCategory] = useState<string>('energy');
  const [fromUnit, setFromUnit] = useState<string>('joule');
  const [toUnit, setToUnit] = useState<string>('calorie');
  const [unitInputValue, setUnitInputValue] = useState<number>(100);
  const [unitConversionResult, setUnitConversionResult] = useState<any>(null);

  // ─── Linear Algebra Handlers ──────────────────────────────────
  const handleMatrixCellChange = (r: number, c: number, val: number) => {
    const updated = matrixA.map((row, ri) =>
      row.map((cell, ci) => (ri === r && ci === c ? val : cell))
    );
    setMatrixA(updated);
  };

  const handleRunMatrix = (op: 'det' | 'inv' | 'eigs' | 'solve') => {
    const idempotency = taskManager.generateIdempotencyKey('scientific', `matrix_${op}`, matrixA);
    const { task } = taskManager.registerTask('scientific', `Matrix ${op.toUpperCase()}`, idempotency);

    taskManager.updateTaskProgress(task.id, 40);

    try {
      if (op === 'det') {
        const res = LinearAlgebraEngine.determinant(matrixA);
        setMatrixResult({ type: 'det', value: res.det, steps: res.steps });
        taskManager.completeTask(task.id, { det: res.det });
      } else if (op === 'inv') {
        const res = LinearAlgebraEngine.inverse(matrixA);
        setMatrixResult({ type: 'inv', value: res.inv, steps: res.steps });
        taskManager.completeTask(task.id, { inverted: res.inv !== null });
      } else if (op === 'eigs') {
        const res = LinearAlgebraEngine.eigenvalues(matrixA);
        setMatrixResult({ type: 'eigs', value: res.eigenvalues, steps: res.steps });
        taskManager.completeTask(task.id, { eigenvalues: res.eigenvalues });
      } else if (op === 'solve') {
        const res = LinearAlgebraEngine.solveLinearSystem(matrixA, vectorB);
        setMatrixResult({ type: 'solve', value: res.solution, steps: res.steps });
        taskManager.completeTask(task.id, { solution: res.solution });
      }
    } catch (err: any) {
      taskManager.failTask(task.id, err.message);
    }
  };

  // ─── ODE Solver Handler ───────────────────────────────────────
  const handleRunODE = () => {
    const idempotency = taskManager.generateIdempotencyKey('scientific', `ode_${odePreset}`, {
      params: odeParams,
      init: odeInit,
      time: odeTimeEnd,
    });
    const { task } = taskManager.registerTask(
      'scientific',
      `Runge-Kutta 4: ${odePreset}`,
      idempotency
    );

    taskManager.updateTaskProgress(task.id, 50);

    try {
      const preset = CalculusEngine.getPresetSystem(odePreset, odeParams);
      const res = CalculusEngine.solveRK4(
        odePreset,
        preset.fn,
        odeInit,
        odeParams,
        0,
        odeTimeEnd,
        0.05
      );
      setOdeResult(res);
      taskManager.completeTask(task.id, {
        steps: res.timeSeries.length,
        durationMs: res.durationMs,
      });
    } catch (err: any) {
      taskManager.failTask(task.id, err.message);
    }
  };

  // ─── Statistics Handler ───────────────────────────────────────
  const handleRunStats = () => {
    try {
      const numbers = datasetStr
        .split(/[,\s]+/)
        .map((s) => parseFloat(s.trim()))
        .filter((n) => !isNaN(n));

      if (numbers.length < 2) return;

      const idempotency = taskManager.generateIdempotencyKey('scientific', 'stats_sample', numbers);
      const { task } = taskManager.registerTask('scientific', 'Sample Statistics', idempotency);

      const res = StatisticsEngine.analyzeSample(numbers);
      setStatsResult(res);
      taskManager.completeTask(task.id, { mean: res.mean, n: res.sampleSize });
    } catch (err: any) {
      // Handle error
    }
  };

  // ─── Physics Simulation Handler ───────────────────────────────
  const handleRunPhysics = () => {
    const idempotency = taskManager.generateIdempotencyKey('scientific', 'physics_projectile', {
      v0: projVelocity,
      angle: projAngle,
      drag: projDrag,
    });
    const { task } = taskManager.registerTask('scientific', 'Projectile Drag Sim', idempotency);

    const res = PhysicsEngine.simulateProjectile(projVelocity, projAngle, 1.0, projDrag);
    setProjResult(res);
    taskManager.completeTask(task.id, res.metrics);
  };

  // ─── Unit Conversion Handler ──────────────────────────────────
  const handleConvertUnit = () => {
    const res = convertUnits(unitCategory, fromUnit, toUnit, unitInputValue);
    setUnitConversionResult(res);
  };

  return (
    <div className="space-y-6">
      {/* Subtab Navigator */}
      <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-none border-b border-zinc-800">
        <button
          onClick={() => setSubTab('ode')}
          className={`flex items-center gap-2 px-3 py-2 text-xs md:text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
            subTab === 'ode'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          {t.scientificSubtabs.calculusOde}
        </button>

        <button
          onClick={() => setSubTab('matrix')}
          className={`flex items-center gap-2 px-3 py-2 text-xs md:text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
            subTab === 'matrix'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <Binary className="w-4 h-4 text-cyan-400" />
          {t.scientificSubtabs.linearAlgebra}
        </button>

        <button
          onClick={() => setSubTab('stats')}
          className={`flex items-center gap-2 px-3 py-2 text-xs md:text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
            subTab === 'stats'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <LineChart className="w-4 h-4 text-cyan-400" />
          {t.scientificSubtabs.statistics}
        </button>

        <button
          onClick={() => setSubTab('physics')}
          className={`flex items-center gap-2 px-3 py-2 text-xs md:text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
            subTab === 'physics'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <Atom className="w-4 h-4 text-cyan-400" />
          {t.scientificSubtabs.physicsSim}
        </button>

        <button
          onClick={() => setSubTab('units')}
          className={`flex items-center gap-2 px-3 py-2 text-xs md:text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
            subTab === 'units'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <Compass className="w-4 h-4 text-cyan-400" />
          {t.scientificSubtabs.unitsConverter}
        </button>
      </div>

      {/* ─── 1. ODE CALCULUS VIEW ───────────────────────────────── */}
      {subTab === 'ode' && (
        <div className="space-y-5">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 md:p-5 shadow-lg">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <div>
                <h3 className="text-base md:text-lg font-semibold text-zinc-100 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-cyan-400" />
                  {t.odeRungeKutta}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Numerical integration with global truncation error O(h⁴).
                </p>
              </div>

              {/* System Selector */}
              <div className="flex flex-wrap gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-xs">
                {(['harmonic', 'lorenz', 'lotka_volterra', 'sir'] as const).map((preset) => (
                  <button
                    key={preset}
                    onClick={() => {
                      setOdePreset(preset);
                      const def = CalculusEngine.getPresetSystem(preset, {});
                      setOdeParams(def.defaultParams);
                      setOdeInit(def.defaultInit);
                    }}
                    className={`px-2.5 py-1.5 rounded-md transition-all font-medium ${
                      odePreset === preset
                        ? 'bg-cyan-500 text-zinc-950 shadow-sm font-semibold'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {preset === 'harmonic'
                      ? t.modelHarmonic.split('(')[0]
                      : preset === 'lorenz'
                      ? t.modelLorenz.split('(')[0]
                      : preset === 'lotka_volterra'
                      ? t.modelLotkaVolterra.split('(')[0]
                      : t.modelSIR.split('(')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Parameters Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800/80 mb-4 text-xs">
              {Object.entries(odeParams).map(([paramKey, val]) => (
                <div key={paramKey} className="space-y-1">
                  <label className="text-zinc-400 font-mono text-[11px] block uppercase">
                    Parameter ({paramKey})
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={val}
                    onChange={(e) =>
                      setOdeParams({ ...odeParams, [paramKey]: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-zinc-900 border border-zinc-700/80 rounded-md px-2.5 py-1.5 text-zinc-200 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              ))}

              <div className="space-y-1">
                <label className="text-zinc-400 font-mono text-[11px] block">
                  {t.timeSpan} (0 → {odeTimeEnd})
                </label>
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={odeTimeEnd}
                  onChange={(e) => setOdeTimeEnd(parseInt(e.target.value) || 30)}
                  className="w-full bg-zinc-900 border border-zinc-700/80 rounded-md px-2.5 py-1.5 text-zinc-200 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleRunODE}
                  className="w-full bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold px-3 py-1.5 rounded-md flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  {t.runCalculation}
                </button>
              </div>
            </div>

            {/* SVG Visualizer Chart */}
            {odeResult && (
              <div className="bg-zinc-950 rounded-xl border border-zinc-800 p-4 space-y-3">
                <div className="flex justify-between items-center text-xs text-zinc-400">
                  <span className="font-mono text-cyan-400">
                    System: {odeResult.systemName} (t: 0 → {odeTimeEnd}, dt = 0.05)
                  </span>
                  <span className="text-[11px] bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                    Solved in {odeResult.durationMs}ms ({odeResult.timeSeries.length} points)
                  </span>
                </div>

                {/* Responsive SVG Curve Plot */}
                <div className="w-full h-60 md:h-72 overflow-hidden relative">
                  <svg
                    viewBox="0 0 800 300"
                    className="w-full h-full stroke-linejoin-round stroke-linecap-round"
                  >
                    {/* Grid lines */}
                    <line x1="40" y1="20" x2="40" y2="270" stroke="#27272a" strokeWidth="1" />
                    <line x1="40" y1="145" x2="780" y2="145" stroke="#3f3f46" strokeDasharray="3 3" />
                    <line x1="40" y1="270" x2="780" y2="270" stroke="#27272a" strokeWidth="1" />

                    {/* Plot each variable curve */}
                    {Object.entries(odeResult.values).map(([varName, pts], idx) => {
                      const colors = ['#22d3ee', '#f59e0b', '#ec4899', '#10b981'];
                      const strokeColor = colors[idx % colors.length];

                      // Scale values into svg space [40..780, 20..270]
                      const maxVal = Math.max(...pts.map(Math.abs), 1);
                      const pathStr = pts
                        .map((val, i) => {
                          const x = 40 + (i / (pts.length - 1)) * 740;
                          const y = 145 - (val / (maxVal * 1.15)) * 115;
                          return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                        })
                        .join(' ');

                      return (
                        <g key={varName}>
                          <path d={pathStr} fill="none" stroke={strokeColor} strokeWidth="2" opacity="0.9" />
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Series Legend */}
                <div className="flex flex-wrap gap-4 pt-1 border-t border-zinc-900 text-xs">
                  {Object.entries(odeResult.values).map(([varName, pts], idx) => {
                    const colors = ['bg-cyan-400', 'bg-amber-500', 'bg-pink-500', 'bg-emerald-500'];
                    const lastVal = pts[pts.length - 1];
                    return (
                      <div key={varName} className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${colors[idx % colors.length]}`} />
                        <span className="font-mono text-zinc-300 font-semibold">{varName}:</span>
                        <span className="font-mono text-zinc-400">{lastVal?.toFixed(4)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── 2. LINEAR ALGEBRA VIEW ─────────────────────────────── */}
      {subTab === 'matrix' && (
        <div className="space-y-5">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 md:p-5 shadow-lg space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base md:text-lg font-semibold text-zinc-100 flex items-center gap-2">
                  <Binary className="w-5 h-5 text-cyan-400" />
                  {t.matrixA} ({matrixSize} × {matrixSize})
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Gaussian elimination, LU decomposition, and QR eigenvalue approximations.
                </p>
              </div>

              <div className="flex gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-xs">
                {[2, 3].map((size) => (
                  <button
                    key={size}
                    onClick={() => {
                      setMatrixSize(size);
                      if (size === 2) {
                        setMatrixA([
                          [4, 2],
                          [1, 3],
                        ]);
                        setVectorB([10, 5]);
                      } else {
                        setMatrixA([
                          [4, 1, 2],
                          [1, 5, 1],
                          [2, 1, 6],
                        ]);
                        setVectorB([14, 19, 23]);
                      }
                      setMatrixResult(null);
                    }}
                    className={`px-3 py-1 rounded-md font-mono ${
                      matrixSize === size
                        ? 'bg-cyan-500 text-zinc-950 font-bold'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {size}×{size}
                  </button>
                ))}
              </div>
            </div>

            {/* Matrix & Vector Input Grid */}
            <div className="flex flex-col md:flex-row gap-4 items-start">
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2">
                <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider block">
                  Matrix A Values:
                </span>
                <div
                  className="grid gap-2"
                  style={{ gridTemplateColumns: `repeat(${matrixSize}, minmax(50px, 1fr))` }}
                >
                  {matrixA.map((row, r) =>
                    row.map((val, c) => (
                      <input
                        key={`${r}-${c}`}
                        type="number"
                        value={val}
                        onChange={(e) =>
                          handleMatrixCellChange(r, c, parseFloat(e.target.value) || 0)
                        }
                        className="bg-zinc-900 border border-zinc-700 rounded p-2 text-center text-zinc-100 font-mono text-sm focus:border-cyan-500 focus:outline-none"
                      />
                    ))
                  )}
                </div>
              </div>

              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2">
                <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider block">
                  Vector b (for Ax = b):
                </span>
                <div className="flex md:flex-col gap-2">
                  {vectorB.map((val, i) => (
                    <input
                      key={i}
                      type="number"
                      value={val}
                      onChange={(e) => {
                        const updated = [...vectorB];
                        updated[i] = parseFloat(e.target.value) || 0;
                        setVectorB(updated);
                      }}
                      className="bg-zinc-900 border border-zinc-700 rounded p-2 text-center text-zinc-100 font-mono text-sm w-16 focus:border-cyan-500 focus:outline-none"
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
              <button
                onClick={() => handleRunMatrix('det')}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs md:text-sm font-medium py-2 rounded-lg border border-zinc-700 transition-all flex items-center justify-center gap-1.5"
              >
                <Calculator className="w-4 h-4 text-cyan-400" />
                {t.opDeterminant}
              </button>

              <button
                onClick={() => handleRunMatrix('inv')}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs md:text-sm font-medium py-2 rounded-lg border border-zinc-700 transition-all flex items-center justify-center gap-1.5"
              >
                <Layers className="w-4 h-4 text-cyan-400" />
                {t.opInverse}
              </button>

              <button
                onClick={() => handleRunMatrix('eigs')}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs md:text-sm font-medium py-2 rounded-lg border border-zinc-700 transition-all flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-4 h-4 text-cyan-400" />
                {t.opEigenvalues}
              </button>

              <button
                onClick={() => handleRunMatrix('solve')}
                className="bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs md:text-sm font-semibold py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 shadow"
              >
                <Play className="w-4 h-4 fill-current" />
                {t.opSolveLinear}
              </button>
            </div>

            {/* Matrix Results & Reasoning Steps */}
            {matrixResult && (
              <div className="bg-zinc-950 rounded-xl border border-zinc-800 p-4 space-y-3 mt-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-cyan-400 uppercase tracking-wide">
                    Calculation Result ({matrixResult.type})
                  </span>
                </div>

                <div className="font-mono text-zinc-200 text-sm bg-zinc-900/90 p-3 rounded-lg border border-zinc-800">
                  {matrixResult.type === 'det' && (
                    <span>Determinant det(A) = <strong className="text-cyan-400 text-base">{matrixResult.value}</strong></span>
                  )}
                  {matrixResult.type === 'inv' && (
                    <div>
                      {matrixResult.value ? (
                        <div className="space-y-1">
                          <span className="text-xs text-zinc-400 block mb-1">Inverse Matrix A⁻¹:</span>
                          <div className="inline-block bg-zinc-950 p-2 rounded border border-zinc-800">
                            {matrixResult.value.map((row: number[], ri: number) => (
                              <div key={ri} className="flex gap-4">
                                {row.map((val, ci) => (
                                  <span key={ci} className="w-16 text-right text-cyan-300">
                                    {val.toFixed(4)}
                                  </span>
                                ))}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <span className="text-rose-400">{t.noSolutionWarning}</span>
                      )}
                    </div>
                  )}
                  {matrixResult.type === 'eigs' && (
                    <div>
                      <span className="text-xs text-zinc-400 block mb-1">Approximated Eigenvalues (λ):</span>
                      <span className="text-cyan-300 text-base font-semibold">
                        [{matrixResult.value.join(', ')}]
                      </span>
                    </div>
                  )}
                  {matrixResult.type === 'solve' && (
                    <div>
                      <span className="text-xs text-zinc-400 block mb-1">Solution Vector x (Ax = b):</span>
                      <span className="text-cyan-300 text-base font-semibold">
                        [{matrixResult.value.join(', ')}]
                      </span>
                    </div>
                  )}
                </div>

                {/* Mathematical Proof Steps */}
                {matrixResult.steps && matrixResult.steps.length > 0 && (
                  <div className="space-y-1 pt-2 border-t border-zinc-900">
                    <span className="text-xs font-mono text-zinc-400">{t.stepByStepSolution}:</span>
                    <ul className="text-xs font-mono text-zinc-400 space-y-1 bg-zinc-900/40 p-2.5 rounded border border-zinc-800/60 max-h-40 overflow-y-auto">
                      {matrixResult.steps.map((s, idx) => (
                        <li key={idx} className="flex gap-2">
                          <span className="text-cyan-500 font-bold">{idx + 1}.</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── 3. STATISTICS VIEW ─────────────────────────────────── */}
      {subTab === 'stats' && (
        <div className="space-y-5">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 md:p-5 shadow-lg space-y-4">
            <div>
              <h3 className="text-base md:text-lg font-semibold text-zinc-100 flex items-center gap-2">
                <LineChart className="w-5 h-5 text-cyan-400" />
                {t.scientificSubtabs.statistics}
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Descriptive statistics, distribution moments (skewness, kurtosis), and histogram binning.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-zinc-400 block">{t.datasetInput}:</label>
              <textarea
                rows={3}
                value={datasetStr}
                onChange={(e) => setDatasetStr(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs md:text-sm font-mono text-zinc-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleRunStats}
                className="bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold px-4 py-2 rounded-lg text-xs md:text-sm flex items-center gap-2 shadow"
              >
                <Play className="w-4 h-4 fill-current" />
                {t.runCalculation}
              </button>

              <button
                onClick={() => {
                  // Generate 30 points of random normal sample (Box-Muller)
                  const gen: number[] = [];
                  for (let i = 0; i < 30; i++) {
                    const u1 = Math.random();
                    const u2 = Math.random();
                    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
                    gen.push(Number((50 + z * 8).toFixed(1)));
                  }
                  setDatasetStr(gen.join(', '));
                }}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-3 py-2 rounded-lg text-xs md:text-sm border border-zinc-700 flex items-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Generate Normal Sample
              </button>
            </div>

            {statsResult && (
              <div className="bg-zinc-950 rounded-xl border border-zinc-800 p-4 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                    <span className="text-zinc-400 block">{t.sampleSize}</span>
                    <span className="text-base font-bold font-mono text-zinc-100">{statsResult.sampleSize}</span>
                  </div>
                  <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                    <span className="text-zinc-400 block">{t.mean}</span>
                    <span className="text-base font-bold font-mono text-cyan-400">{statsResult.mean}</span>
                  </div>
                  <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                    <span className="text-zinc-400 block">{t.stdDev}</span>
                    <span className="text-base font-bold font-mono text-amber-400">{statsResult.stdDev}</span>
                  </div>
                  <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                    <span className="text-zinc-400 block">{t.median}</span>
                    <span className="text-base font-bold font-mono text-zinc-100">{statsResult.median}</span>
                  </div>
                  <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                    <span className="text-zinc-400 block">{t.skewness}</span>
                    <span className="text-base font-bold font-mono text-zinc-100">{statsResult.skewness}</span>
                  </div>
                  <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                    <span className="text-zinc-400 block">{t.kurtosis}</span>
                    <span className="text-base font-bold font-mono text-zinc-100">{statsResult.kurtosis}</span>
                  </div>
                  <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                    <span className="text-zinc-400 block">Min</span>
                    <span className="text-base font-bold font-mono text-zinc-100">{statsResult.min}</span>
                  </div>
                  <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                    <span className="text-zinc-400 block">Max</span>
                    <span className="text-base font-bold font-mono text-zinc-100">{statsResult.max}</span>
                  </div>
                </div>

                {/* Histogram Visualizer */}
                <div className="space-y-2 pt-2 border-t border-zinc-900">
                  <span className="text-xs font-mono text-zinc-400 block">Sample Distribution Histogram:</span>
                  <div className="flex items-end gap-1.5 h-36 bg-zinc-900/60 p-3 rounded-lg border border-zinc-800/80">
                    {statsResult.histogram.map((bin, i) => {
                      const maxCount = Math.max(...statsResult.histogram.map((h) => h.count), 1);
                      const heightPercent = (bin.count / maxCount) * 100;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                          <span className="text-[10px] font-mono text-cyan-400 mb-1 opacity-80">
                            {bin.count}
                          </span>
                          <div
                            style={{ height: `${Math.max(8, heightPercent)}%` }}
                            className="w-full bg-cyan-500/70 group-hover:bg-cyan-400 rounded-t transition-all"
                          />
                          <span className="text-[9px] font-mono text-zinc-500 mt-1 truncate max-w-full">
                            {bin.binStart.toFixed(0)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── 4. PHYSICS SIMULATION VIEW ─────────────────────────── */}
      {subTab === 'physics' && (
        <div className="space-y-5">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 md:p-5 shadow-lg space-y-4">
            <div>
              <h3 className="text-base md:text-lg font-semibold text-zinc-100 flex items-center gap-2">
                <Atom className="w-5 h-5 text-cyan-400" />
                {t.scientificSubtabs.physicsSim} (Projectile with Air Drag)
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Quadratic drag force F_drag = -k v² resolved via numerical integration.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-xs">
              <div className="space-y-1">
                <label className="text-zinc-400 font-mono block">{t.projectileVelocity}:</label>
                <input
                  type="number"
                  value={projVelocity}
                  onChange={(e) => setProjVelocity(parseFloat(e.target.value) || 10)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-zinc-200 font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-mono block">{t.projectileAngle}:</label>
                <input
                  type="number"
                  min="5"
                  max="85"
                  value={projAngle}
                  onChange={(e) => setProjAngle(parseFloat(e.target.value) || 45)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-zinc-200 font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-mono block">{t.projectileDrag}:</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="0.5"
                  value={projDrag}
                  onChange={(e) => setProjDrag(parseFloat(e.target.value) || 0)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-zinc-200 font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              onClick={handleRunPhysics}
              className="bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold px-4 py-2 rounded-lg text-xs md:text-sm flex items-center gap-2 shadow"
            >
              <Play className="w-4 h-4 fill-current" />
              {t.runCalculation}
            </button>

            {projResult && (
              <div className="bg-zinc-950 rounded-xl border border-zinc-800 p-4 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-zinc-900 p-3 rounded border border-zinc-800">
                    <span className="text-zinc-400 block">{t.maxHeight}</span>
                    <span className="text-base font-bold font-mono text-cyan-400">
                      {projResult.metrics.maxHeight} m
                    </span>
                  </div>
                  <div className="bg-zinc-900 p-3 rounded border border-zinc-800">
                    <span className="text-zinc-400 block">{t.range}</span>
                    <span className="text-base font-bold font-mono text-emerald-400">
                      {projResult.metrics.totalRange} m
                    </span>
                  </div>
                  <div className="bg-zinc-900 p-3 rounded border border-zinc-800">
                    <span className="text-zinc-400 block">{t.flightTime}</span>
                    <span className="text-base font-bold font-mono text-zinc-100">
                      {projResult.metrics.flightTime} s
                    </span>
                  </div>
                  <div className="bg-zinc-900 p-3 rounded border border-zinc-800">
                    <span className="text-zinc-400 block">Impact Velocity</span>
                    <span className="text-base font-bold font-mono text-amber-400">
                      {projResult.metrics.impactVelocity} m/s
                    </span>
                  </div>
                </div>

                {/* Trajectory Plot */}
                <div className="w-full h-56 bg-zinc-900/60 rounded-lg p-2 border border-zinc-800">
                  <svg viewBox="0 0 700 220" className="w-full h-full">
                    <line x1="30" y1="190" x2="680" y2="190" stroke="#3f3f46" strokeWidth="1" />
                    <line x1="30" y1="20" x2="30" y2="190" stroke="#3f3f46" strokeWidth="1" />

                    {/* Trajectory curve */}
                    {(() => {
                      const maxR = Math.max(projResult.metrics.totalRange, 10);
                      const maxH = Math.max(projResult.metrics.maxHeight, 5);
                      const path = projResult.coordinates
                        .map((pt: any, i: number) => {
                          const px = 30 + (pt.x / maxR) * 640;
                          const py = 190 - (pt.y / (maxH * 1.2)) * 160;
                          return `${i === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`;
                        })
                        .join(' ');
                      return <path d={path} fill="none" stroke="#22d3ee" strokeWidth="2.5" />;
                    })()}
                  </svg>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── 5. UNIT CONVERTER VIEW ─────────────────────────────── */}
      {subTab === 'units' && (
        <div className="space-y-5">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 md:p-5 shadow-lg space-y-4">
            <div>
              <h3 className="text-base md:text-lg font-semibold text-zinc-100 flex items-center gap-2">
                <Compass className="w-5 h-5 text-cyan-400" />
                {t.scientificSubtabs.unitsConverter}
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Exact dimensional conversions conforming to SI physical standards.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-xs">
              <div className="space-y-1">
                <label className="text-zinc-400 font-mono block">Physical Dimension:</label>
                <select
                  value={unitCategory}
                  onChange={(e) => {
                    const cat = e.target.value;
                    setUnitCategory(cat);
                    const units = Object.keys(UNIT_CATEGORIES[cat].units);
                    setFromUnit(units[0]);
                    setToUnit(units[1] || units[0]);
                  }}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-zinc-200 font-mono focus:border-cyan-500 focus:outline-none"
                >
                  {Object.entries(UNIT_CATEGORIES).map(([catKey, cat]) => (
                    <option key={catKey} value={catKey}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-mono block">From Unit:</label>
                <select
                  value={fromUnit}
                  onChange={(e) => setFromUnit(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-zinc-200 font-mono focus:border-cyan-500 focus:outline-none"
                >
                  {Object.entries(UNIT_CATEGORIES[unitCategory].units).map(([uKey, u]) => (
                    <option key={uKey} value={uKey}>
                      {uKey} ({u.symbol})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-mono block">To Unit:</label>
                <select
                  value={toUnit}
                  onChange={(e) => setToUnit(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-zinc-200 font-mono focus:border-cyan-500 focus:outline-none"
                >
                  {Object.entries(UNIT_CATEGORIES[unitCategory].units).map(([uKey, u]) => (
                    <option key={uKey} value={uKey}>
                      {uKey} ({u.symbol})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-mono block">Magnitude:</label>
                <input
                  type="number"
                  value={unitInputValue}
                  onChange={(e) => setUnitInputValue(parseFloat(e.target.value) || 0)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-zinc-200 font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              onClick={handleConvertUnit}
              className="bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold px-4 py-2 rounded-lg text-xs md:text-sm flex items-center gap-2 shadow"
            >
              <Compass className="w-4 h-4" />
              Convert
            </button>

            {unitConversionResult && (
              <div className="bg-zinc-950 rounded-xl border border-zinc-800 p-4 space-y-1 text-sm font-mono">
                <span className="text-zinc-400 text-xs block">Exact Conversion Result:</span>
                <span className="text-cyan-400 text-lg font-bold block">
                  {unitConversionResult.result} {UNIT_CATEGORIES[unitCategory].units[toUnit]?.symbol}
                </span>
                <span className="text-zinc-500 text-xs block pt-1 font-mono">
                  Formula: {unitConversionResult.formula}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
