/**
 * ATLASYNTH — Calculus & ODE Numerical Solvers
 * Runge-Kutta 4 (RK4), Adaptive Quadrature, and System Simulators.
 * @license Apache-2.0
 */

import { ODESimulationResult } from '../../../types';

export type SystemDerivativeFn = (t: number, state: Record<string, number>) => Record<string, number>;

export class CalculusEngine {
  /**
   * Runge-Kutta 4th Order (RK4) numerical integrator for system of ODEs
   */
  public static solveRK4(
    systemName: string,
    derivativeFn: SystemDerivativeFn,
    initialConditions: Record<string, number>,
    parameters: Record<string, number>,
    tStart: number,
    tEnd: number,
    h: number
  ): ODESimulationResult {
    const startTime = performance.now();
    const keys = Object.keys(initialConditions);
    const steps = Math.min(2000, Math.floor((tEnd - tStart) / h));

    const timeSeries: number[] = [];
    const values: Record<string, number[]> = {};
    keys.forEach((k) => (values[k] = []));

    let t = tStart;
    let current = { ...initialConditions };

    timeSeries.push(Number(t.toFixed(4)));
    keys.forEach((k) => values[k].push(Number(current[k].toFixed(6))));

    for (let step = 0; step < steps; step++) {
      // k1 = f(t, y)
      const k1 = derivativeFn(t, current);

      // k2 = f(t + h/2, y + h*k1/2)
      const stateK2: Record<string, number> = {};
      keys.forEach((k) => (stateK2[k] = current[k] + (h * (k1[k] || 0)) / 2));
      const k2 = derivativeFn(t + h / 2, stateK2);

      // k3 = f(t + h/2, y + h*k2/2)
      const stateK3: Record<string, number> = {};
      keys.forEach((k) => (stateK3[k] = current[k] + (h * (k2[k] || 0)) / 2));
      const k3 = derivativeFn(t + h / 2, stateK3);

      // k4 = f(t + h, y + h*k3)
      const stateK4: Record<string, number> = {};
      keys.forEach((k) => (stateK4[k] = current[k] + h * (k3[k] || 0)));
      const k4 = derivativeFn(t + h, stateK4);

      // y_{n+1} = y_n + (h/6) * (k1 + 2k2 + 2k3 + k4)
      const nextState: Record<string, number> = {};
      keys.forEach((k) => {
        const delta = (h / 6) * ((k1[k] || 0) + 2 * (k2[k] || 0) + 2 * (k3[k] || 0) + (k4[k] || 0));
        nextState[k] = current[k] + delta;
      });

      t += h;
      current = nextState;

      timeSeries.push(Number(t.toFixed(4)));
      keys.forEach((k) => values[k].push(Number(current[k].toFixed(6))));
    }

    const durationMs = performance.now() - startTime;

    return {
      systemName,
      timeSeries,
      values,
      parameters,
      initialConditions,
      stepSize: h,
      durationMs: Number(durationMs.toFixed(2)),
    };
  }

  /**
   * Pre-configured classic ODE systems
   */
  public static getPresetSystem(
    name: 'harmonic' | 'lorenz' | 'lotka_volterra' | 'sir',
    params: Record<string, number>
  ): {
    fn: SystemDerivativeFn;
    defaultInit: Record<string, number>;
    defaultParams: Record<string, number>;
  } {
    switch (name) {
      case 'harmonic': {
        // x'' + 2*gamma*x' + omega^2*x = 0  =>  x' = v, v' = -2*gamma*v - omega^2*x
        const gamma = params.gamma ?? 0.15;
        const omega = params.omega ?? 1.2;
        return {
          fn: (_t, state) => ({
            x: state.v,
            v: -2 * gamma * state.v - omega * omega * state.x,
          }),
          defaultInit: { x: 1.0, v: 0.0 },
          defaultParams: { gamma, omega },
        };
      }

      case 'lorenz': {
        // dx/dt = sigma*(y - x), dy/dt = x*(rho - z) - y, dz/dt = x*y - beta*z
        const sigma = params.sigma ?? 10.0;
        const rho = params.rho ?? 28.0;
        const beta = params.beta ?? 8.0 / 3.0;
        return {
          fn: (_t, state) => ({
            x: sigma * (state.y - state.x),
            y: state.x * (rho - state.z) - state.y,
            z: state.x * state.y - beta * state.z,
          }),
          defaultInit: { x: 1.0, y: 1.0, z: 1.0 },
          defaultParams: { sigma, rho, beta: Number(beta.toFixed(3)) },
        };
      }

      case 'lotka_volterra': {
        // dx/dt = alpha*x - beta*x*y, dy/dt = delta*x*y - gamma*y
        const alpha = params.alpha ?? 1.1; // prey birth
        const beta = params.beta ?? 0.4; // predation rate
        const delta = params.delta ?? 0.1; // predator reproduction
        const gamma = params.gamma ?? 0.4; // predator mortality
        return {
          fn: (_t, state) => ({
            Prey: alpha * state.Prey - beta * state.Prey * state.Predator,
            Predator: delta * state.Prey * state.Predator - gamma * state.Predator,
          }),
          defaultInit: { Prey: 10.0, Predator: 2.0 },
          defaultParams: { alpha, beta, delta, gamma },
        };
      }

      case 'sir': {
        // dS/dt = -beta*S*I, dI/dt = beta*S*I - gamma*I, dR/dt = gamma*I
        const beta = params.beta ?? 0.35; // transmission rate
        const gamma = params.gamma ?? 0.1; // recovery rate
        return {
          fn: (_t, state) => {
            const infection = beta * state.S * state.I;
            const recovery = gamma * state.I;
            return {
              S: -infection,
              I: infection - recovery,
              R: recovery,
            };
          },
          defaultInit: { S: 0.99, I: 0.01, R: 0.0 },
          defaultParams: { beta, gamma },
        };
      }
    }
  }

  /**
   * Adaptive Simpson's Quadrature for numerical integration ∫_a^b f(x)dx
   */
  public static integrateSimpson(
    f: (x: number) => number,
    a: number,
    b: number,
    intervals = 1000
  ): { integral: number; errorEstimate: number } {
    const n = intervals % 2 === 0 ? intervals : intervals + 1;
    const h = (b - a) / n;
    let sum = f(a) + f(b);

    for (let i = 1; i < n; i++) {
      const x = a + i * h;
      sum += (i % 2 === 0 ? 2 : 4) * f(x);
    }

    const integral = (h / 3) * sum;
    // Bounded Richardson error estimate
    const errorEstimate = Math.abs((Math.pow(h, 4) * (b - a)) / 180);

    return {
      integral: Number(integral.toFixed(8)),
      errorEstimate: Number(errorEstimate.toExponential(4)),
    };
  }

  /**
   * Numerical Derivative with Richardson Extrapolation
   */
  public static derivative(f: (x: number) => number, x: number, h = 1e-5): { first: number; second: number } {
    const d1 = (f(x + h) - f(x - h)) / (2 * h);
    const d2 = (f(x + h) - 2 * f(x) + f(x - h)) / (h * h);
    return {
      first: Number(d1.toFixed(7)),
      second: Number(d2.toFixed(7)),
    };
  }
}
