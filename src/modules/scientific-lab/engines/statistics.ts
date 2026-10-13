/**
 * ATLASYNTH — Descriptive & Inferential Statistics Engine
 * @license Apache-2.0
 */

import { StatisticalAnalysisResult } from '../../../types';

export class StatisticsEngine {
  public static analyzeSample(data: number[]): StatisticalAnalysisResult {
    if (!data || data.length === 0) {
      throw new Error('Sample dataset is empty');
    }

    const n = data.length;
    const sorted = [...data].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[n - 1];

    // Mean
    const sum = sorted.reduce((acc, val) => acc + val, 0);
    const mean = sum / n;

    // Median
    const mid = Math.floor(n / 2);
    const median = n % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

    // Variance & Standard Deviation (unbiased sample n - 1)
    let sumSqDiff = 0;
    let sumCubeDiff = 0;
    let sumFourthDiff = 0;

    for (let i = 0; i < n; i++) {
      const diff = sorted[i] - mean;
      sumSqDiff += diff * diff;
      sumCubeDiff += diff * diff * diff;
      sumFourthDiff += diff * diff * diff * diff;
    }

    const variance = n > 1 ? sumSqDiff / (n - 1) : 0;
    const stdDev = Math.sqrt(variance);

    // Skewness & Excess Kurtosis
    let skewness = 0;
    let kurtosis = 0;
    if (stdDev > 1e-12 && n > 2) {
      skewness = (n / ((n - 1) * (n - 2))) * (sumCubeDiff / Math.pow(stdDev, 3));
      if (n > 3) {
        const factor1 = (n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3));
        const factor2 = (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
        kurtosis = factor1 * (sumFourthDiff / Math.pow(variance, 2)) - factor2;
      }
    }

    // Histogram with Freedman-Diaconis or Sturges rule
    const binCount = Math.min(20, Math.max(5, Math.ceil(Math.log2(n) + 1)));
    const binWidth = max > min ? (max - min) / binCount : 1;
    const histogram: Array<{ binStart: number; binEnd: number; count: number }> = [];

    for (let b = 0; b < binCount; b++) {
      const binStart = min + b * binWidth;
      const binEnd = min + (b + 1) * binWidth;
      const count = sorted.filter((v) => (b === binCount - 1 ? v >= binStart && v <= binEnd : v >= binStart && v < binEnd)).length;
      histogram.push({
        binStart: Number(binStart.toFixed(2)),
        binEnd: Number(binEnd.toFixed(2)),
        count,
      });
    }

    return {
      sampleSize: n,
      mean: Number(mean.toFixed(5)),
      median: Number(median.toFixed(5)),
      variance: Number(variance.toFixed(5)),
      stdDev: Number(stdDev.toFixed(5)),
      skewness: Number(skewness.toFixed(4)),
      kurtosis: Number(kurtosis.toFixed(4)),
      min: Number(min.toFixed(4)),
      max: Number(max.toFixed(4)),
      histogram,
    };
  }

  /**
   * Linear Regression and Pearson Correlation
   */
  public static linearRegression(
    x: number[],
    y: number[]
  ): { slope: number; intercept: number; rSquared: number; pearsonR: number; equation: string } {
    const n = Math.min(x.length, y.length);
    if (n < 2) throw new Error('At least 2 coordinate pairs are required for regression');

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;
    let sumY2 = 0;

    for (let i = 0; i < n; i++) {
      sumX += x[i];
      sumY += y[i];
      sumXY += x[i] * y[i];
      sumX2 += x[i] * x[i];
      sumY2 += y[i] * y[i];
    }

    const denom = n * sumX2 - sumX * sumX;
    if (Math.abs(denom) < 1e-12) {
      return { slope: 0, intercept: sumY / n, rSquared: 0, pearsonR: 0, equation: 'y = constant' };
    }

    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;

    // Pearson r
    const numR = n * sumXY - sumX * sumY;
    const denR = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    const pearsonR = denR > 1e-12 ? numR / denR : 0;
    const rSquared = pearsonR * pearsonR;

    const equation = `y = ${slope.toFixed(4)}x ${intercept >= 0 ? '+' : '-'} ${Math.abs(intercept).toFixed(4)}`;

    return {
      slope: Number(slope.toFixed(5)),
      intercept: Number(intercept.toFixed(5)),
      rSquared: Number(rSquared.toFixed(5)),
      pearsonR: Number(pearsonR.toFixed(5)),
      equation,
    };
  }

  /**
   * Gaussian (Normal) Distribution Probability Density Function
   */
  public static normalPDF(x: number, mean = 0, stdDev = 1): number {
    const factor = 1 / (stdDev * Math.sqrt(2 * Math.PI));
    const exponent = -0.5 * Math.pow((x - mean) / stdDev, 2);
    return factor * Math.exp(exponent);
  }
}
