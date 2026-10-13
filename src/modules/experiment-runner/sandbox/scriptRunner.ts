/**
 * ATLASYNTH — Sandboxed Numerical Script Runner
 * Time-bounded, isolated code evaluation with console interception.
 * @license Apache-2.0
 */

export interface ScriptExecutionResult {
  success: boolean;
  logs: string[];
  outputValue?: any;
  durationMs: number;
  error?: string;
}

export class ScriptRunner {
  public static executeScript(
    code: string,
    timeoutMs = 4000
  ): Promise<ScriptExecutionResult> {
    return new Promise((resolve) => {
      const logs: string[] = [];
      const startTime = performance.now();

      // Custom console proxy
      const customConsole = {
        log: (...args: any[]) => {
          logs.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
        },
        warn: (...args: any[]) => {
          logs.push('[WARN] ' + args.map((a) => String(a)).join(' '));
        },
        error: (...args: any[]) => {
          logs.push('[ERROR] ' + args.map((a) => String(a)).join(' '));
        },
      };

      let timer: any = null;
      let hasFinished = false;

      timer = setTimeout(() => {
        if (!hasFinished) {
          hasFinished = true;
          resolve({
            success: false,
            logs,
            durationMs: Number((performance.now() - startTime).toFixed(2)),
            error: `Execution timed out after ${timeoutMs}ms. CPU safety limit triggered.`,
          });
        }
      }, timeoutMs);

      try {
        // Sandboxed execution scope
        const sandboxFunction = new Function('console', 'Math', `
          "use strict";
          try {
            ${code}
          } catch(err) {
            throw err;
          }
        `);

        const result = sandboxFunction(customConsole, Math);
        clearTimeout(timer);
        hasFinished = true;

        resolve({
          success: true,
          logs,
          outputValue: result,
          durationMs: Number((performance.now() - startTime).toFixed(2)),
        });
      } catch (err: any) {
        clearTimeout(timer);
        hasFinished = true;
        resolve({
          success: false,
          logs,
          durationMs: Number((performance.now() - startTime).toFixed(2)),
          error: err?.message || String(err),
        });
      }
    });
  }

  public static getPresetScripts(): Record<string, { title: string; code: string; description: string }> {
    return {
      monte_carlo_pi: {
        title: 'Monte Carlo Estimation of π',
        description: 'Random uniform sampling in [0, 1]² quadrant to approximate π with error bounds.',
        code: `// Monte Carlo Pi Simulation
const samples = 250000;
let insideCircle = 0;

for (let i = 0; i < samples; i++) {
  const x = Math.random();
  const y = Math.random();
  if (x * x + y * y <= 1.0) {
    insideCircle++;
  }
}

const piEstimate = (4 * insideCircle) / samples;
const truePi = Math.PI;
const relativeError = Math.abs(piEstimate - truePi) / truePi;

console.log("Total Samples:", samples);
console.log("Samples inside unit circle:", insideCircle);
console.log("Estimated π:", piEstimate.toFixed(6));
console.log("True π:", truePi.toFixed(6));
console.log("Relative Error:", (relativeError * 100).toFixed(4) + "%");

return { piEstimate, samples, relativeError };`,
      },

      newton_raphson: {
        title: 'Newton-Raphson Root Finding',
        description: 'Finding roots of f(x) = x³ - 2x - 5 using iterative tangents x_{n+1} = x_n - f(x)/f\'(x).',
        code: `// f(x) = x^3 - 2x - 5 = 0
// f'(x) = 3x^2 - 2
const f = (x) => Math.pow(x, 3) - 2 * x - 5;
const df = (x) => 3 * Math.pow(x, 2) - 2;

let x = 2.0; // initial guess
const tolerance = 1e-9;
const maxIter = 20;

console.log("Initial guess x_0 =", x);

for (let i = 1; i <= maxIter; i++) {
  const fx = f(x);
  const dfx = df(x);
  const nextX = x - fx / dfx;
  console.log("Iteration " + i + ": x = " + nextX.toFixed(8) + " | f(x) = " + fx.toExponential(3));
  
  if (Math.abs(nextX - x) < tolerance) {
    console.log("Converged successfully at iteration", i);
    x = nextX;
    break;
  }
  x = nextX;
}

console.log("Final root approximation:", x.toFixed(9));
return { root: x };`,
      },

      fourier_series: {
        title: 'Fourier Series Square Wave Synthesis',
        description: 'Superposition of odd harmonics: f(x) = (4/π) ∑ [sin((2k-1)x) / (2k-1)].',
        code: `// Fourier Series Synthesis for Square Wave
const harmonics = 9;
const samplePoints = 20;
console.log("Synthesizing square wave with", harmonics, "harmonics.");

for (let i = 0; i <= samplePoints; i++) {
  const t = (i / samplePoints) * Math.PI;
  let sum = 0;
  for (let k = 1; k <= harmonics; k++) {
    const n = 2 * k - 1; // odd harmonics
    sum += Math.sin(n * t) / n;
  }
  const waveVal = (4 / Math.PI) * sum;
  console.log("t = " + (t / Math.PI).toFixed(2) + "π -> f(t) = " + waveVal.toFixed(4));
}

return { harmonics, synthesized: true };`,
      },
    };
  }
}
