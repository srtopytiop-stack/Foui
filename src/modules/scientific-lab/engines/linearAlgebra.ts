/**
 * ATLASYNTH — Deterministic Linear Algebra Engine
 * Rigorous matrix computations with step-by-step mathematical verification.
 * @license Apache-2.0
 */

import { MatrixOperationResult } from '../../../types';

export class LinearAlgebraEngine {
  /**
   * Determinant using LU decomposition with row pivoting
   */
  public static determinant(matrix: number[][]): { det: number; steps: string[] } {
    const n = matrix.length;
    const steps: string[] = [];
    steps.push(`Input matrix dimensions: ${n} × ${n}`);

    if (n === 1) {
      return { det: matrix[0][0], steps: [`Single element determinant: det = ${matrix[0][0]}`] };
    }

    if (n === 2) {
      const det = matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
      steps.push(
        `2×2 formula: (${matrix[0][0]} × ${matrix[1][1]}) - (${matrix[0][1]} × ${matrix[1][0]}) = ${det}`
      );
      return { det, steps };
    }

    // LU decomposition copy
    const a = matrix.map((row) => [...row]);
    let det = 1;
    let sign = 1;

    for (let i = 0; i < n; i++) {
      // Pivot selection
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(a[k][i]) > Math.abs(a[maxRow][i])) {
          maxRow = k;
        }
      }

      if (Math.abs(a[maxRow][i]) < 1e-14) {
        steps.push(`Pivot at column ${i + 1} is zero. Matrix is singular.`);
        return { det: 0, steps };
      }

      if (maxRow !== i) {
        const temp = a[i];
        a[i] = a[maxRow];
        a[maxRow] = temp;
        sign = -sign;
        steps.push(`Row swap: R${i + 1} ↔ R${maxRow + 1} (inverts sign of determinant).`);
      }

      const pivot = a[i][i];
      det *= pivot;
      steps.push(`Diagonal pivot factor at pos (${i + 1},${i + 1}): ${pivot.toFixed(4)}`);

      for (let k = i + 1; k < n; k++) {
        const factor = a[k][i] / pivot;
        for (let j = i; j < n; j++) {
          a[k][j] -= factor * a[i][j];
        }
      }
    }

    det *= sign;
    steps.push(`Final determinant calculated = ${sign > 0 ? '' : '-'}${Math.abs(det).toFixed(6)}`);
    return { det: Number(det.toFixed(8)), steps };
  }

  /**
   * Matrix Inverse using Gauss-Jordan Elimination with row pivoting
   */
  public static inverse(matrix: number[][]): { inv: number[][] | null; steps: string[] } {
    const n = matrix.length;
    const steps: string[] = [];

    // Augment with identity matrix
    const aug = matrix.map((row, i) => {
      const idRow = new Array(n).fill(0);
      idRow[i] = 1;
      return [...row, ...idRow];
    });

    steps.push(`Augmented matrix [A | I] constructed for ${n}×${n} matrix.`);

    for (let i = 0; i < n; i++) {
      // Find maximum pivot
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) {
          maxRow = k;
        }
      }

      if (Math.abs(aug[maxRow][i]) < 1e-14) {
        steps.push(`Zero pivot detected at row ${i + 1}. Matrix has no inverse (singular).`);
        return { inv: null, steps };
      }

      if (maxRow !== i) {
        const temp = aug[i];
        aug[i] = aug[maxRow];
        aug[maxRow] = temp;
        steps.push(`Swapped R${i + 1} with R${maxRow + 1} for numerical stability.`);
      }

      // Normalize pivot row
      const pivot = aug[i][i];
      for (let j = 0; j < 2 * n; j++) {
        aug[i][j] /= pivot;
      }
      steps.push(`Normalized pivot row R${i + 1} by divisor ${pivot.toFixed(4)}`);

      // Eliminate other rows
      for (let k = 0; k < n; k++) {
        if (k !== i) {
          const factor = aug[k][i];
          for (let j = 0; j < 2 * n; j++) {
            aug[k][j] -= factor * aug[i][j];
          }
        }
      }
    }

    const inv = aug.map((row) => row.slice(n).map((v) => Number(v.toFixed(6))));
    steps.push(`Inversion successfully resolved. Identity formed on left side.`);
    return { inv, steps };
  }

  /**
   * Matrix Multiplication A × B
   */
  public static multiply(matrixA: number[][], matrixB: number[][]): { result: number[][]; steps: string[] } {
    const rA = matrixA.length;
    const cA = matrixA[0].length;
    const rB = matrixB.length;
    const cB = matrixB[0].length;
    const steps: string[] = [];

    if (cA !== rB) {
      throw new Error(`Incompatible matrix dimensions: (${rA}×${cA}) cannot multiply with (${rB}×${cB})`);
    }

    steps.push(`Multiplying Matrix A (${rA}×${cA}) with Matrix B (${rB}×${cB}) → Result (${rA}×${cB})`);

    const result: number[][] = Array.from({ length: rA }, () => new Array(cB).fill(0));

    for (let i = 0; i < rA; i++) {
      for (let j = 0; j < cB; j++) {
        let sum = 0;
        for (let k = 0; k < cA; k++) {
          sum += matrixA[i][k] * matrixB[k][j];
        }
        result[i][j] = Number(sum.toFixed(6));
      }
    }

    steps.push(`Calculation completed across ${rA * cB} cells.`);
    return { result, steps };
  }

  /**
   * Solves linear system Ax = b using Gaussian elimination with back substitution
   */
  public static solveLinearSystem(
    matrixA: number[][],
    vectorB: number[]
  ): { solution: number[] | null; steps: string[] } {
    const n = matrixA.length;
    const steps: string[] = [];

    const aug = matrixA.map((row, i) => [...row, vectorB[i]]);
    steps.push(`Augmented matrix [A | b] setup for ${n} equations.`);

    for (let i = 0; i < n; i++) {
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) maxRow = k;
      }

      if (Math.abs(aug[maxRow][i]) < 1e-14) {
        steps.push(`No unique solution found (singular system).`);
        return { solution: null, steps };
      }

      if (maxRow !== i) {
        const temp = aug[i];
        aug[i] = aug[maxRow];
        aug[maxRow] = temp;
      }

      for (let k = i + 1; k < n; k++) {
        const factor = aug[k][i] / aug[i][i];
        for (let j = i; j <= n; j++) {
          aug[k][j] -= factor * aug[i][j];
        }
      }
    }

    // Back substitution
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      let sum = aug[i][n];
      for (let j = i + 1; j < n; j++) {
        sum -= aug[i][j] * x[j];
      }
      x[i] = Number((sum / aug[i][i]).toFixed(6));
      steps.push(`Back-substitution x${i + 1} = ${x[i]}`);
    }

    return { solution: x, steps };
  }

  /**
   * Approximate Eigenvalues using QR algorithm iterations
   */
  public static eigenvalues(matrix: number[][], maxIter = 30): { eigenvalues: number[]; steps: string[] } {
    const n = matrix.length;
    const steps: string[] = [];
    steps.push(`Approximating eigenvalues via QR decomposition iterations (max ${maxIter} rounds).`);

    let a = matrix.map((row) => [...row]);

    for (let iter = 0; iter < maxIter; iter++) {
      // Gram-Schmidt QR decomposition
      const q: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
      const r: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

      for (let j = 0; j < n; j++) {
        const v = new Array(n).fill(0);
        for (let i = 0; i < n; i++) v[i] = a[i][j];

        for (let i = 0; i < j; i++) {
          let dot = 0;
          for (let k = 0; k < n; k++) dot += q[k][i] * a[k][j];
          r[i][j] = dot;
          for (let k = 0; k < n; k++) v[k] -= dot * q[k][i];
        }

        let norm = 0;
        for (let k = 0; k < n; k++) norm += v[k] * v[k];
        norm = Math.sqrt(norm);
        r[j][j] = norm;

        if (norm > 1e-12) {
          for (let k = 0; k < n; k++) q[k][j] = v[k] / norm;
        }
      }

      // A_next = R * Q
      const aNext: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          let sum = 0;
          for (let k = 0; k < n; k++) sum += r[i][k] * q[k][j];
          aNext[i][j] = sum;
        }
      }
      a = aNext;
    }

    const eigs = a.map((row, i) => Number(row[i].toFixed(5)));
    steps.push(`Extracted diagonal eigenvalues: [${eigs.join(', ')}]`);
    return { eigenvalues: eigs, steps };
  }
}
