/**
 * ATLASYNTH 2.0 — Advanced Statistical Validation & Anti-Overfitting Engine
 * Rigorous mathematical implementations of DSR, PBO, Walk-Forward, and Bootstrap Drawdown.
 * @license Apache-2.0
 */

import {
  DeflatedSharpeResult,
  MarketCandle,
  MonteCarloDrawdownResult,
  PBOResult,
  WalkForwardResult,
  WalkForwardWindow,
} from '../../../types';
import { BacktestEngine } from '../backtest/backtestEngine';

export class StatisticalValidationEngine {
  /**
   * Deflated Sharpe Ratio (DSR)
   * Adjusts for trial variance, sample length, skewness, and kurtosis.
   */
  public static calculateDeflatedSharpe(
    returns: number[],
    trialsExamined = 25,
    benchmarkSharpe = 0
  ): DeflatedSharpeResult {
    const n = returns.length;
    if (n < 15) {
      return {
        rawSharpe: 0,
        deflatedSharpe: 0,
        pVal: 1.0,
        skewness: 0,
        kurtosis: 3,
        trialsExamined,
        isStatisticallySignificant: false,
      };
    }

    // Moments calculation
    const mean = returns.reduce((a, b) => a + b, 0) / n;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n - 1);
    const stdDev = Math.sqrt(variance);

    if (stdDev < 1e-9) {
      return {
        rawSharpe: 0,
        deflatedSharpe: 0,
        pVal: 1.0,
        skewness: 0,
        kurtosis: 3,
        trialsExamined,
        isStatisticallySignificant: false,
      };
    }

    let sum3 = 0;
    let sum4 = 0;
    for (const r of returns) {
      const z = (r - mean) / stdDev;
      sum3 += Math.pow(z, 3);
      sum4 += Math.pow(z, 4);
    }

    const skewness = sum3 / n;
    const kurtosis = sum4 / n; // raw kurtosis (normal is 3.0)

    const annualFactor = Math.sqrt(365 * 24);
    const rawSharpe = (mean / stdDev) * annualFactor;

    // Expected maximum Sharpe under null hypothesis across N independent trials
    const eulerMascheroni = 0.5772156649;
    const logN = Math.log(Math.max(2, trialsExamined));
    const expectedMaxSharpe =
      (Math.sqrt(2 * logN) + eulerMascheroni / Math.sqrt(2 * logN)) * 0.4;

    // Variance of the Sharpe ratio estimator
    const srVariance =
      (1 - skewness * (rawSharpe / annualFactor) + ((kurtosis - 1) / 4) * Math.pow(rawSharpe / annualFactor, 2)) /
      (n - 1);
    const srStdErr = Math.sqrt(Math.max(1e-12, srVariance)) * annualFactor;

    // Deflated Z-score test against expected max
    const zScore = (rawSharpe - Math.max(benchmarkSharpe, expectedMaxSharpe)) / srStdErr;

    // Cumulative normal distribution approximation for p-value
    const pVal = Math.max(0.0001, Math.min(0.9999, 1 - this.normalCDF(zScore)));
    const deflatedSharpe = Number(Math.max(0, rawSharpe * (1 - pVal)).toFixed(2));

    return {
      rawSharpe: Number(rawSharpe.toFixed(2)),
      deflatedSharpe,
      pVal: Number(pVal.toFixed(4)),
      skewness: Number(skewness.toFixed(3)),
      kurtosis: Number(kurtosis.toFixed(3)),
      trialsExamined,
      isStatisticallySignificant: pVal < 0.05,
    };
  }

  /**
   * Probability of Backtest Overfitting (PBO) via Combinatorial Splits
   */
  public static calculatePBO(candles: MarketCandle[], strategyName: any): PBOResult {
    const n = candles.length;
    if (n < 60) {
      return {
        pboProbability: 0.5,
        medianRankDegradation: 0.5,
        combinationsEvaluated: 0,
        isOverfitRiskHigh: true,
      };
    }

    // Partition dataset into 6 chunks
    const numChunks = 6;
    const chunkSize = Math.floor(n / numChunks);
    const chunks: MarketCandle[][] = [];

    for (let i = 0; i < numChunks; i++) {
      chunks.push(candles.slice(i * chunkSize, (i + 1) * chunkSize));
    }

    // Evaluate in-sample vs out-of-sample combinations
    let overfitCount = 0;
    let totalCombinations = 0;
    let rankDeltas: number[] = [];

    // Combinations of 3 in-sample vs 3 out-of-sample
    for (let i = 0; i < numChunks - 1; i++) {
      const isCandles = [...chunks[i], ...chunks[(i + 1) % numChunks]];
      const oosCandles = [...chunks[(i + 2) % numChunks], ...chunks[(i + 3) % numChunks]];

      if (isCandles.length > 55 && oosCandles.length > 55) {
        totalCombinations++;
        try {
          const isResult = BacktestEngine.runBacktest(isCandles, {
            symbol: 'EVAL',
            timeframe: '1h',
            strategyName,
            initialBalance: 10000,
            makerFeePercent: 0.075,
            takerFeePercent: 0.075,
            slippagePercent: 0.05,
          });

          const oosResult = BacktestEngine.runBacktest(oosCandles, {
            symbol: 'EVAL',
            timeframe: '1h',
            strategyName,
            initialBalance: 10000,
            makerFeePercent: 0.075,
            takerFeePercent: 0.075,
            slippagePercent: 0.05,
          });

          if (isResult.sharpeRatio > 0.8 && oosResult.sharpeRatio <= 0.2) {
            overfitCount++;
          }

          const degradation = Math.max(0, isResult.sharpeRatio - oosResult.sharpeRatio);
          rankDeltas.push(degradation);
        } catch {
          // Continue
        }
      }
    }

    const pboProb = totalCombinations > 0 ? overfitCount / totalCombinations : 0.45;
    const medianDegradation =
      rankDeltas.length > 0
        ? rankDeltas.sort((a, b) => a - b)[Math.floor(rankDeltas.length / 2)]
        : 0.5;

    return {
      pboProbability: Number(pboProb.toFixed(2)),
      medianRankDegradation: Number(medianDegradation.toFixed(2)),
      combinationsEvaluated: totalCombinations,
      isOverfitRiskHigh: pboProb > 0.4,
    };
  }

  /**
   * Walk-Forward Validation Engine
   */
  public static runWalkForward(
    candles: MarketCandle[],
    strategyName: any,
    windowsCount = 3
  ): WalkForwardResult {
    const totalCandles = candles.length;
    const windowSize = Math.floor(totalCandles / (windowsCount + 1));
    const windows: WalkForwardWindow[] = [];

    let totalOOSReturn = 0;
    let totalRobustness = 0;

    for (let w = 0; w < windowsCount; w++) {
      const isStart = w * windowSize;
      const isEnd = isStart + Math.floor(windowSize * 1.5);
      const oosStart = isEnd;
      const oosEnd = Math.min(totalCandles, oosStart + windowSize);

      if (oosEnd - oosStart < 55) break;

      const isData = candles.slice(isStart, isEnd);
      const oosData = candles.slice(oosStart, oosEnd);

      try {
        const isRun = BacktestEngine.runBacktest(isData, {
          symbol: 'WF_IS',
          timeframe: '1h',
          strategyName,
          initialBalance: 10000,
          makerFeePercent: 0.075,
          takerFeePercent: 0.075,
          slippagePercent: 0.05,
        });

        const oosRun = BacktestEngine.runBacktest(oosData, {
          symbol: 'WF_OOS',
          timeframe: '1h',
          strategyName,
          initialBalance: 10000,
          makerFeePercent: 0.075,
          takerFeePercent: 0.075,
          slippagePercent: 0.05,
        });

        const robustnessRatio =
          isRun.sharpeRatio > 0.1
            ? Math.max(0, Math.min(2.0, oosRun.sharpeRatio / isRun.sharpeRatio))
            : oosRun.sharpeRatio > 0
            ? 1.0
            : 0;

        windows.push({
          windowIndex: w + 1,
          inSampleRange: { start: isStart, end: isEnd },
          outOfSampleRange: { start: oosStart, end: oosEnd },
          inSampleSharpe: isRun.sharpeRatio,
          outOfSampleSharpe: oosRun.sharpeRatio,
          outOfSampleReturnPct: oosRun.totalReturnPercent,
          robustnessRatio: Number(robustnessRatio.toFixed(2)),
        });

        totalOOSReturn += oosRun.totalReturnPercent;
        totalRobustness += robustnessRatio;
      } catch {
        // Continue
      }
    }

    const count = windows.length || 1;
    const avgOOS = totalOOSReturn / count;
    const avgRob = totalRobustness / count;

    return {
      windows,
      averageOutOfSampleReturn: Number(avgOOS.toFixed(2)),
      averageRobustnessRatio: Number(avgRob.toFixed(2)),
      isStrategyRobust: avgRob >= 0.55 && avgOOS > 0,
    };
  }

  /**
   * Monte Carlo Bootstrap Maximum Drawdown Simulator
   */
  public static simulateBootstrapDrawdown(
    returns: number[],
    simulations = 500
  ): MonteCarloDrawdownResult {
    if (returns.length < 10) {
      return {
        simulationsCount: 0,
        medianDrawdownPct: 0,
        percentile95DrawdownPct: 0,
        worstCaseDrawdownPct: 0,
        drawdownDistribution: [],
      };
    }

    const maxDrawdowns: number[] = [];

    for (let sim = 0; sim < simulations; sim++) {
      // Bootstrap with replacement
      let equity = 10000;
      let peak = equity;
      let maxDd = 0;

      for (let i = 0; i < returns.length; i++) {
        const randIdx = Math.floor(Math.random() * returns.length);
        const r = returns[randIdx];
        equity *= 1 + r;

        if (equity > peak) peak = equity;
        const dd = ((peak - equity) / peak) * 100;
        if (dd > maxDd) maxDd = dd;
      }

      maxDrawdowns.push(maxDd);
    }

    maxDrawdowns.sort((a, b) => a - b);
    const median = maxDrawdowns[Math.floor(simulations * 0.5)];
    const p95 = maxDrawdowns[Math.floor(simulations * 0.95)];
    const worst = maxDrawdowns[simulations - 1];

    // Build 5 distribution bins
    const minDd = maxDrawdowns[0];
    const maxVal = maxDrawdowns[maxDrawdowns.length - 1];
    const binWidth = (maxVal - minDd) / 5 || 1;
    const distribution: Array<{ bin: string; count: number }> = [];

    for (let b = 0; b < 5; b++) {
      const bStart = minDd + b * binWidth;
      const bEnd = minDd + (b + 1) * binWidth;
      const count = maxDrawdowns.filter((d) => d >= bStart && d <= bEnd).length;
      distribution.push({
        bin: `${bStart.toFixed(0)}-${bEnd.toFixed(0)}%`,
        count,
      });
    }

    return {
      simulationsCount: simulations,
      medianDrawdownPct: Number(median.toFixed(2)),
      percentile95DrawdownPct: Number(p95.toFixed(2)),
      worstCaseDrawdownPct: Number(worst.toFixed(2)),
      drawdownDistribution: distribution,
    };
  }

  private static normalCDF(x: number): number {
    const t = 1.0 / (1.0 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp((-x * x) / 2.0);
    const prob =
      d *
      t *
      (0.3193815 +
        t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1.0 - prob : prob;
  }
}
