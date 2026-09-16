/**
 * Fuel Management System
 * Individual tank capacities, transfer pump dynamics, crossfeed, dump, and CG calculation.
 */

import { FuelSystemState } from '../types/simulation';
import { AircraftProfile } from '../types/aircraft';
import { simulationEventBus } from '../core/eventBus';

export class FuelSystem {
  public static init(profile: AircraftProfile): FuelSystemState {
    const caps = profile.fuelCapacities;
    const total =
      caps.forwardKg +
      caps.collectorKg +
      caps.aftKg +
      caps.leftWingKg +
      caps.rightWingKg +
      caps.externalKg;

    return {
      tanks: {
        forward: { name: 'Forward Fuselage', capacityKg: caps.forwardKg, currentKg: caps.forwardKg, pumpOn: true, pumpHealth: 1.0, temperatureDegC: 15 },
        collector: { name: 'Engine Collector', capacityKg: caps.collectorKg, currentKg: caps.collectorKg, pumpOn: true, pumpHealth: 1.0, temperatureDegC: 18 },
        aft: { name: 'Aft Fuselage', capacityKg: caps.aftKg, currentKg: caps.aftKg, pumpOn: true, pumpHealth: 1.0, temperatureDegC: 15 },
        leftWing: { name: 'Left Wing', capacityKg: caps.leftWingKg, currentKg: caps.leftWingKg, pumpOn: true, pumpHealth: 1.0, temperatureDegC: 12 },
        rightWing: { name: 'Right Wing', capacityKg: caps.rightWingKg, currentKg: caps.rightWingKg, pumpOn: true, pumpHealth: 1.0, temperatureDegC: 12 },
        external: { name: 'Centerline Drop Tank', capacityKg: caps.externalKg, currentKg: caps.externalKg, pumpOn: true, pumpHealth: 1.0, temperatureDegC: 10 },
      },
      totalFuelKg: total,
      totalCapacityKg: total,
      fuelPressurePsi: 45.0,
      crossFeedOpen: false,
      dumpValveOpen: false,
      externalTransferActive: true,
      bingoFuelKg: 1200,
      jokerFuelKg: 2000,
      remainingEnduranceMinutes: 90,
      estimatedRangeNm: 680,
      fuelLowCaution: false,
      imbalanceWarning: false,
      fuelLeak: false,
    };
  }

  public static update(
    current: FuelSystemState,
    fuelBurnRateKgps: number,
    electricalPowerAvailable: boolean,
    groundSpeedKnots: number,
    dt: number
  ): {
    nextState: FuelSystemState;
    cgShiftPercentMac: number;
  } {
    const next: FuelSystemState = {
      ...current,
      tanks: {
        forward: { ...current.tanks.forward },
        collector: { ...current.tanks.collector },
        aft: { ...current.tanks.aft },
        leftWing: { ...current.tanks.leftWing },
        rightWing: { ...current.tanks.rightWing },
        external: { ...current.tanks.external },
      },
    };

    // Fuel pressure depends on boost pumps and electrical power
    const boostPumpsActive = electricalPowerAvailable && (next.tanks.collector.pumpOn || next.crossFeedOpen);
    next.fuelPressurePsi = boostPumpsActive ? 45.0 : 4.0; // Gravity feed only gives ~4 PSI

    // Engine burns fuel from Collector tank
    const fuelToBurn = fuelBurnRateKgps * dt;
    if (fuelToBurn > 0 && next.tanks.collector.currentKg > 0) {
      const burned = Math.min(next.tanks.collector.currentKg, fuelToBurn);
      next.tanks.collector.currentKg -= burned;
    }

    // Fuel Dump logic (dump rate ~25 kg/s from wing/external tanks)
    if (next.dumpValveOpen && dt > 0) {
      const dumpRate = 25.0 * dt;
      if (next.tanks.external.currentKg > 0) {
        next.tanks.external.currentKg = Math.max(0, next.tanks.external.currentKg - dumpRate);
      } else {
        const wingDump = dumpRate / 2.0;
        next.tanks.leftWing.currentKg = Math.max(0, next.tanks.leftWing.currentKg - wingDump);
        next.tanks.rightWing.currentKg = Math.max(0, next.tanks.rightWing.currentKg - wingDump);
      }
    }

    // Transfer logic: Internal & External fuel replenishment into Collector Tank
    const collectorDeficit = next.tanks.collector.capacityKg - next.tanks.collector.currentKg;
    if (collectorDeficit > 0 && electricalPowerAvailable) {
      const transferRate = 12.0 * dt; // kg/s transfer capacity
      let needed = Math.min(collectorDeficit, transferRate);

      // Sequence: External drop tank first -> Wing tanks -> Forward/Aft tanks
      if (next.externalTransferActive && next.tanks.external.currentKg > 0) {
        const xfer = Math.min(needed, next.tanks.external.currentKg);
        next.tanks.external.currentKg -= xfer;
        next.tanks.collector.currentKg += xfer;
        needed -= xfer;
      }

      if (needed > 0 && (next.tanks.leftWing.currentKg > 0 || next.tanks.rightWing.currentKg > 0)) {
        const half = needed / 2.0;
        const xferL = Math.min(half, next.tanks.leftWing.currentKg);
        const xferR = Math.min(half, next.tanks.rightWing.currentKg);
        next.tanks.leftWing.currentKg -= xferL;
        next.tanks.rightWing.currentKg -= xferR;
        next.tanks.collector.currentKg += xferL + xferR;
        needed -= xferL + xferR;
      }

      if (needed > 0) {
        // Balance burn between forward and aft
        const half = needed / 2.0;
        const xferFwd = Math.min(half, next.tanks.forward.currentKg);
        const xferAft = Math.min(half, next.tanks.aft.currentKg);
        next.tanks.forward.currentKg -= xferFwd;
        next.tanks.aft.currentKg -= xferAft;
        next.tanks.collector.currentKg += xferFwd + xferAft;
      }
    }

    // Calculate total fuel
    next.totalFuelKg =
      next.tanks.forward.currentKg +
      next.tanks.collector.currentKg +
      next.tanks.aft.currentKg +
      next.tanks.leftWing.currentKg +
      next.tanks.rightWing.currentKg +
      next.tanks.external.currentKg;

    // Wing imbalance detection
    const wingDiff = Math.abs(next.tanks.leftWing.currentKg - next.tanks.rightWing.currentKg);
    next.imbalanceWarning = wingDiff > 250; // > 250 kg wing imbalance

    // Low fuel warning
    next.fuelLowCaution = next.totalFuelKg < next.bingoFuelKg;

    // Remaining endurance & estimated range
    if (fuelBurnRateKgps > 0.05) {
      const remainingSec = next.totalFuelKg / fuelBurnRateKgps;
      next.remainingEnduranceMinutes = Math.round(remainingSec / 60.0);
      const effectiveGs = Math.max(120, groundSpeedKnots);
      next.estimatedRangeNm = Math.round((remainingSec / 3600.0) * effectiveGs);
    } else {
      next.remainingEnduranceMinutes = 999;
      next.estimatedRangeNm = 9999;
    }

    // Calculate longitudinal CG movement due to fuel burn:
    // Forward tank is forward of CG (-2.2m), Aft tank is aft (+1.8m), Collector is at CG (0.0m)
    const fwdFuel = next.tanks.forward.currentKg;
    const aftFuel = next.tanks.aft.currentKg;
    const totalInternal = fwdFuel + aftFuel + next.tanks.collector.currentKg;
    let cgShiftPercentMac = 0;
    if (totalInternal > 0) {
      // Normal nominal CG at 26% MAC; fwd bias moves it forward, aft bias moves it aft
      const fuelMoment = aftFuel * 1.8 - fwdFuel * 2.2;
      cgShiftPercentMac = (fuelMoment / 10000.0) * 1.2;
    }

    return { nextState: next, cgShiftPercentMac };
  }
}
