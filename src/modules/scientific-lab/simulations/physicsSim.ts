/**
 * ATLASYNTH — Physics & Mechanics Numerical Simulation Models
 * @license Apache-2.0
 */

import { PhysicsSimulationResult } from '../../../types';

export class PhysicsEngine {
  /**
   * Projectile motion with quadratic air drag
   * Equations:
   * m * dx/dt = vx
   * m * dy/dt = vy
   * m * dvx/dt = -k * v * vx
   * m * dvy/dt = -m * g - k * v * vy
   */
  public static simulateProjectile(
    v0: number, // m/s
    angleDeg: number, // degrees
    mass = 1.0, // kg
    dragCoeff = 0.05, // kg/m
    gravity = 9.80665 // m/s^2
  ): PhysicsSimulationResult {
    const angleRad = (angleDeg * Math.PI) / 180;
    let x = 0;
    let y = 0;
    let vx = v0 * Math.cos(angleRad);
    let vy = v0 * Math.sin(angleRad);
    let t = 0;
    const dt = 0.02; // 20ms steps

    const coordinates: Array<{ x: number; y: number }> = [{ x: 0, y: 0 }];
    const time: number[] = [0];
    let maxHeight = 0;

    while (y >= 0 && t < 120) {
      const v = Math.sqrt(vx * vx + vy * vy);
      const dragForce = dragCoeff * v;

      const ax = -(dragForce * vx) / mass;
      const ay = -gravity - (dragForce * vy) / mass;

      // Velocity Verlet / Euler-Cromer update
      vx += ax * dt;
      vy += ay * dt;
      x += vx * dt;
      y += vy * dt;
      t += dt;

      if (y > maxHeight) maxHeight = y;

      if (y >= 0) {
        coordinates.push({ x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) });
        time.push(Number(t.toFixed(2)));
      }
    }

    const range = coordinates[coordinates.length - 1]?.x || 0;
    const impactVelocity = Math.sqrt(vx * vx + vy * vy);

    return {
      model: 'projectile',
      time,
      coordinates,
      metrics: {
        maxHeight: Number(maxHeight.toFixed(2)),
        totalRange: Number(range.toFixed(2)),
        flightTime: Number(t.toFixed(2)),
        impactVelocity: Number(impactVelocity.toFixed(2)),
      },
    };
  }
}
