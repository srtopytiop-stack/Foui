/**
 * ATLASYNTH — Technical & Statistical Market Indicators
 * Mathematical implementation of quantitative finance metrics.
 * @license Apache-2.0
 */

import { MarketCandle, TechnicalIndicators } from '../../../types';

export class TechnicalIndicatorsEngine {
  /**
   * Exponential Moving Average (EMA)
   */
  public static calculateEMA(prices: number[], period: number): (number | null)[] {
    const ema: (number | null)[] = new Array(prices.length).fill(null);
    if (prices.length < period) return ema;

    // SMA for initial seed
    let sum = 0;
    for (let i = 0; i < period; i++) sum += prices[i];
    ema[period - 1] = sum / period;

    const multiplier = 2 / (period + 1);
    for (let i = period; i < prices.length; i++) {
      const prev = ema[i - 1]!;
      ema[i] = (prices[i] - prev) * multiplier + prev;
    }

    return ema;
  }

  /**
   * Relative Strength Index (RSI) using Wilder's Smoothing
   */
  public static calculateRSI(prices: number[], period = 14): (number | null)[] {
    const rsi: (number | null)[] = new Array(prices.length).fill(null);
    if (prices.length <= period) return rsi;

    let avgGain = 0;
    let avgLoss = 0;

    for (let i = 1; i <= period; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) avgGain += change;
      else avgLoss += Math.abs(change);
    }

    avgGain /= period;
    avgLoss /= period;

    const rsInitial = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi[period] = 100 - 100 / (1 + rsInitial);

    for (let i = period + 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? Math.abs(change) : 0;

      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;

      if (avgLoss === 0) {
        rsi[i] = 100;
      } else {
        const rs = avgGain / avgLoss;
        rsi[i] = Number((100 - 100 / (1 + rs)).toFixed(2));
      }
    }

    return rsi;
  }

  /**
   * Bollinger Bands (20 periods, 2 standard deviations)
   */
  public static calculateBollingerBands(
    prices: number[],
    period = 20,
    multiplier = 2
  ): { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] } {
    const upper: (number | null)[] = new Array(prices.length).fill(null);
    const middle: (number | null)[] = new Array(prices.length).fill(null);
    const lower: (number | null)[] = new Array(prices.length).fill(null);

    for (let i = period - 1; i < prices.length; i++) {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += prices[j];
      const sma = sum / period;
      middle[i] = sma;

      let sumSqDiff = 0;
      for (let j = i - period + 1; j <= i; j++) {
        const diff = prices[j] - sma;
        sumSqDiff += diff * diff;
      }
      const std = Math.sqrt(sumSqDiff / period);

      upper[i] = Number((sma + multiplier * std).toFixed(4));
      lower[i] = Number((sma - multiplier * std).toFixed(4));
    }

    return { upper, middle, lower };
  }

  /**
   * Hurst Exponent using Rescaled Range (R/S) Analysis on Log Returns
   * H < 0.5: Mean-Reverting (Anti-persistent)
   * H = 0.5: Geometric Brownian Motion (Random Walk)
   * H > 0.5: Persistent Trending
   */
  public static calculateHurstExponent(prices: number[]): number {
    if (prices.length < 50) return 0.5;

    // Log returns
    const logReturns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      logReturns.push(Math.log(prices[i] / prices[i - 1]));
    }

    const n = logReturns.length;
    const lags = [8, 16, 32, 64].filter((l) => l < n / 2);
    if (lags.length < 2) return 0.5;

    const rsValues: number[] = [];

    for (const lag of lags) {
      const numChunks = Math.floor(n / lag);
      let avgRS = 0;

      for (let chunk = 0; chunk < numChunks; chunk++) {
        const slice = logReturns.slice(chunk * lag, (chunk + 1) * lag);
        const mean = slice.reduce((a, b) => a + b, 0) / lag;

        // Mean centered cumulative deviation
        let cumDev = 0;
        let maxDev = -Infinity;
        let minDev = Infinity;
        let sumSq = 0;

        for (let i = 0; i < lag; i++) {
          const diff = slice[i] - mean;
          cumDev += diff;
          if (cumDev > maxDev) maxDev = cumDev;
          if (cumDev < minDev) minDev = cumDev;
          sumSq += diff * diff;
        }

        const range = maxDev - minDev;
        const std = Math.sqrt(sumSq / lag);
        if (std > 1e-10) {
          avgRS += range / std;
        }
      }

      rsValues.push(avgRS / numChunks);
    }

    // Linear regression of log(lag) vs log(R/S)
    const logLags = lags.map((l) => Math.log(l));
    const logRS = rsValues.map((rs) => Math.log(Math.max(rs, 1e-5)));

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;
    const k = logLags.length;

    for (let i = 0; i < k; i++) {
      sumX += logLags[i];
      sumY += logRS[i];
      sumXY += logLags[i] * logRS[i];
      sumX2 += logLags[i] * logLags[i];
    }

    const denom = k * sumX2 - sumX * sumX;
    if (Math.abs(denom) < 1e-12) return 0.5;

    const hurst = (k * sumXY - sumX * sumY) / denom;
    return Number(Math.max(0.01, Math.min(0.99, hurst)).toFixed(3));
  }

  /**
   * Annualized Realized Volatility (%) from log returns
   */
  public static calculateRealizedVolatility(prices: number[], periodsPerYear = 365 * 24): number {
    if (prices.length < 10) return 0;

    const logReturns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      logReturns.push(Math.log(prices[i] / prices[i - 1]));
    }

    const mean = logReturns.reduce((a, b) => a + b, 0) / logReturns.length;
    const sumSq = logReturns.reduce((a, b) => a + Math.pow(b - mean, 2), 0);
    const variance = sumSq / (logReturns.length - 1);
    const stdDev = Math.sqrt(variance);

    // Annualize
    const annualized = stdDev * Math.sqrt(periodsPerYear) * 100;
    return Number(annualized.toFixed(2));
  }

  /**
   * Aggregate all indicators for candle series
   */
  public static computeAll(candles: MarketCandle[]): TechnicalIndicators {
    const closes = candles.map((c) => c.close);
    const ema20 = this.calculateEMA(closes, 20);
    const ema50 = this.calculateEMA(closes, 50);
    const rsi14 = this.calculateRSI(closes, 14);
    const bollinger = this.calculateBollingerBands(closes, 20, 2);
    const hurst = this.calculateHurstExponent(closes);
    const vol = this.calculateRealizedVolatility(closes);

    return {
      ema20,
      ema50,
      rsi14,
      bollinger,
      hurstExponent: hurst,
      realizedVolatilityAnnualized: vol,
    };
  }
}
