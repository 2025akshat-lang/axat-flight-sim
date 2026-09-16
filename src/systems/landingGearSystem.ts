/**
 * Landing Gear Transit, Locking, and Warning System
 */

import { LandingGearState } from '../types/simulation';
import { simulationEventBus } from '../core/eventBus';

export class LandingGearSystem {
  public static init(): LandingGearState {
    return {
      handleDown: true,
      transitState: 'DOWN_LOCKED',
      noseGearPercent: 1.0,
      leftMainGearPercent: 1.0,
      rightMainGearPercent: 1.0,
      gearDoorsOpen: false,
      emergencyGearExtended: false,
      gearWarningHorn: false,
      wheelSpeedKnots: { nose: 0, left: 0, right: 0 },
      brakePressurePsi: { left: 0, right: 0 },
      antiSkidActive: true,
      tiresBlown: { nose: false, left: false, right: false },
    };
  }

  public static update(
    current: LandingGearState,
    handleDown: boolean,
    hydraulicPressurePsi: number,
    gearBreakerLive: boolean,
    throttle: number,
    indicatedAirspeedKts: number,
    altitudeFt: number,
    wowNose: boolean,
    wowMain: boolean,
    dt: number
  ): LandingGearState {
    const next = { ...current, handleDown };

    // Weight on wheels interlock prevents gear handle retraction on ground
    if (wowMain && !handleDown && !current.emergencyGearExtended) {
      next.handleDown = true; // Mechanical lock solenoid stops gear handle
    }

    const hydraulicPower = hydraulicPressurePsi > 1500 && gearBreakerLive;
    const transitSpeed = 0.22 * dt; // approx 4.5 seconds for full transit

    if (next.emergencyGearExtended) {
      // Gravity freefall extension
      next.transitState = 'TRANSIT_DOWN';
      next.noseGearPercent = Math.min(1.0, next.noseGearPercent + transitSpeed * 0.8);
      next.leftMainGearPercent = Math.min(1.0, next.leftMainGearPercent + transitSpeed * 0.8);
      next.rightMainGearPercent = Math.min(1.0, next.rightMainGearPercent + transitSpeed * 0.8);
      if (next.noseGearPercent >= 1.0 && next.leftMainGearPercent >= 1.0) {
        next.transitState = 'DOWN_LOCKED';
      }
    } else if (hydraulicPower) {
      if (next.handleDown) {
        // Extending gear
        if (next.noseGearPercent < 1.0 || next.leftMainGearPercent < 1.0) {
          next.transitState = 'TRANSIT_DOWN';
          next.gearDoorsOpen = true;
          next.noseGearPercent = Math.min(1.0, next.noseGearPercent + transitSpeed);
          next.leftMainGearPercent = Math.min(1.0, next.leftMainGearPercent + transitSpeed);
          next.rightMainGearPercent = Math.min(1.0, next.rightMainGearPercent + transitSpeed);
        } else {
          if (next.transitState !== 'DOWN_LOCKED') {
            simulationEventBus.emit('GEAR_DOWN_LOCKED', 'GEAR', 'Landing gear down and locked (3 green)');
          }
          next.transitState = 'DOWN_LOCKED';
          next.gearDoorsOpen = false;
        }
      } else {
        // Retracting gear
        if (next.noseGearPercent > 0.0 || next.leftMainGearPercent > 0.0) {
          next.transitState = 'TRANSIT_UP';
          next.gearDoorsOpen = true;
          next.noseGearPercent = Math.max(0.0, next.noseGearPercent - transitSpeed);
          next.leftMainGearPercent = Math.max(0.0, next.leftMainGearPercent - transitSpeed);
          next.rightMainGearPercent = Math.max(0.0, next.rightMainGearPercent - transitSpeed);
        } else {
          if (next.transitState !== 'UP_LOCKED') {
            simulationEventBus.emit('GEAR_UP_LOCKED', 'GEAR', 'Landing gear up and locked');
          }
          next.transitState = 'UP_LOCKED';
          next.gearDoorsOpen = false;
        }
      }
    } else {
      // No hydraulic or electrical power to move gear
      if (next.noseGearPercent > 0 && next.noseGearPercent < 1.0) {
        next.transitState = 'UNSAFE';
      }
    }

    // Gear Warning Horn: Throttle low, low airspeed, low altitude, gear not locked down
    const gearSafe = next.transitState === 'DOWN_LOCKED';
    if (!gearSafe && throttle < 0.20 && indicatedAirspeedKts < 210 && altitudeFt < 1200 && !wowMain) {
      next.gearWarningHorn = true;
    } else {
      next.gearWarningHorn = false;
    }

    return next;
  }
}
