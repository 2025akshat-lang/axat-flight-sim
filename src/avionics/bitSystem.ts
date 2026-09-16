/**
 * Built-In-Test (BIT) Subsystem
 * PBIT, CBIT, and IBIT diagnostic test sequences.
 */

import { BitState, SimulationState } from '../types/simulation';

export class BitSystem {
  public static init(): BitState {
    return {
      pbitCompleted: true,
      cbitActive: true,
      ibitInProgress: false,
      ibitProgressPercent: 0,
      results: {
        AVIONICS: { name: 'Avionics Suite & Mission Computers', status: 'PASS', detail: 'Primary & backup processors dual-sync 100%' },
        FLCS: { name: 'Digital Fly-By-Wire Quad Channels', status: 'PASS', detail: 'Ch 1-4 parity OK, actuator feedback nominal' },
        HYDRAULIC: { name: 'Dual Hydraulic Pressure & Servos', status: 'PASS', detail: 'System A/B transducers validated' },
        ELECTRICAL: { name: 'Generator, AC/DC Buses & Breakers', status: 'PASS', detail: 'Voltages within nominal band' },
        FUEL: { name: 'Fuel Gauging & Boost Pumps', status: 'PASS', detail: 'Float probes and crossfeed servos verified' },
        PROPULSION: { name: 'FADEC & Turbine Sensors', status: 'PASS', detail: 'Igniter coils and thermocouples verified' },
        ECS_O2: { name: 'OBOGS & Cabin Pressure Regulators', status: 'PASS', detail: 'Oxygen purity 94%, bleed valves responding' },
        RADAR_SEN: { name: 'Tactical Situational Sensor', status: 'PASS', detail: 'Antenna scan and TWS tracking operational' },
      },
    };
  }

  public static runCbit(current: BitState, sim: SimulationState): BitState {
    const next = { ...current, results: { ...current.results } };

    // Continuous BIT updates based on real physical states
    // FLCS CBIT
    if (sim.flcs.flightControlMode === 'DIRECT_MANUAL') {
      next.results.FLCS = { name: 'Fly-By-Wire FLCS', status: 'FAIL', detail: 'Primary FBW computer offline (Breaker open)', faultCode: 'F-201' };
    } else if (sim.flcs.flightControlMode === 'DEGRADED') {
      next.results.FLCS = { name: 'Fly-By-Wire FLCS', status: 'DEGRADED', detail: 'Hydraulic low pressure degraded rate', faultCode: 'F-108' };
    } else {
      next.results.FLCS = { name: 'Fly-By-Wire FLCS', status: 'PASS', detail: 'Quad-channel parity 100% nominal' };
    }

    // Hydraulic CBIT
    if (sim.hydraulic.systemAPressurePsi < 1800 && sim.engine.n2RpmPercent > 20) {
      next.results.HYDRAULIC = { name: 'Dual Hydraulic System', status: 'DEGRADED', detail: 'Sys A press low (< 1800 PSI)', faultCode: 'H-004' };
    } else {
      next.results.HYDRAULIC = { name: 'Dual Hydraulic System', status: 'PASS', detail: 'Sys A & B 3000 PSI nominal' };
    }

    // Electrical CBIT
    if (sim.electrical.generatorFailWarning) {
      next.results.ELECTRICAL = { name: 'Electrical Power Network', status: 'DEGRADED', detail: 'Generator offline - battery/ext pwr', faultCode: 'E-012' };
    } else {
      next.results.ELECTRICAL = { name: 'Electrical Power Network', status: 'PASS', detail: 'Main Gen 115V AC / 28V DC nominal' };
    }

    // Fuel CBIT
    if (sim.fuel.fuelLowCaution) {
      next.results.FUEL = { name: 'Fuel Gauging & Pumps', status: 'DEGRADED', detail: 'Bingo fuel warning threshold reached', faultCode: 'U-002' };
    } else {
      next.results.FUEL = { name: 'Fuel Gauging & Pumps', status: 'PASS', detail: 'Tanks balanced, boost pumps nominal' };
    }

    return next;
  }
}
