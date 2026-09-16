/**
 * Aircraft Configuration Profile Definition
 */

export interface AeroCoefficients {
  cL0: number; // Zero-AoA lift coefficient
  cLalpha: number; // Lift curve slope per radian
  cLmax: number; // Maximum lift coefficient
  alphaStallDeg: number; // Stall angle of attack
  alphaStallPostDeg: number; // Deep stall boundary
  cD0: number; // Zero-lift drag coefficient
  inducedDragFactorK: number; // Induced drag factor k = 1 / (pi * e * AR)
  cdMachWaveSlope: number; // Transonic drag rise factor
  machCrit: number; // Critical Mach number
  dragGear: number; // Parasite drag delta with gear down
  dragFlapsHalf: number;
  dragFlapsFull: number;
  dragSpeedBrake: number; // Parasite drag delta with speed brake deployed
  cyBeta: number; // Side force derivative per rad
  clBeta: number; // Dihedral effect
  clP: number; // Roll damping
  clDeltaAileron: number; // Roll control power
  cm0: number; // Pitching moment at zero alpha
  cmAlpha: number; // Longitudinal static stability
  cmQ: number; // Pitch damping
  cmDeltaElevator: number; // Pitch control power
  cnBeta: number; // Directional stability
  cnR: number; // Yaw damping
  cnDeltaRudder: number; // Rudder yaw power
}

export interface AircraftProfile {
  id: string;
  name: string;
  designation: string;
  role: string;
  emptyMassKg: number;
  maxTakeoffWeightKg: number;
  maxGPositive: number;
  maxGNegative: number;
  vNeKnots: number; // Never exceed airspeed (KIAS)
  maxMach: number;
  wingSpanMeters: number;
  wingAreaM2: number;
  meanAerodynamicChordMeters: number;
  aspectRatio: number;
  engine: {
    model: string;
    dryThrustKn: number;
    afterburnerThrustKn: number;
    idleFuelFlowPph: number;
    milFuelFlowPph: number;
    abFuelFlowPph: number;
    spoolRatePerSecond: number;
    starterDurationSec: number;
    normalIdleN2: number;
    normalMilN2: number;
  };
  fuelCapacities: {
    forwardKg: number;
    collectorKg: number;
    aftKg: number;
    leftWingKg: number;
    rightWingKg: number;
    externalKg: number;
  };
  aerodynamics: AeroCoefficients;
  limits: {
    maxGearExtendKts: number;
    maxFlapExtendKts: number;
    maxSpeedBrakeKts: number;
    serviceCeilingFt: number;
  };
}

export const SF27_VANGUARD: AircraftProfile = {
  id: 'sf-27',
  name: 'SF-27 Vanguard',
  designation: 'Synthetic Heavy Air-Dominance Fighter',
  role: 'Air Superiority & Systems Training',
  emptyMassKg: 13800,
  maxTakeoffWeightKg: 28500,
  maxGPositive: 9.0,
  maxGNegative: -3.0,
  vNeKnots: 800,
  maxMach: 2.25,
  wingSpanMeters: 13.05,
  wingAreaM2: 56.5,
  meanAerodynamicChordMeters: 4.85,
  aspectRatio: 3.01,
  engine: {
    model: 'F-210 Advanced Turbofan with Reheat',
    dryThrustKn: 76.0,
    afterburnerThrustKn: 131.0,
    idleFuelFlowPph: 950,
    milFuelFlowPph: 7200,
    abFuelFlowPph: 36000,
    spoolRatePerSecond: 0.35,
    starterDurationSec: 14,
    normalIdleN2: 63.5,
    normalMilN2: 100.0,
  },
  fuelCapacities: {
    forwardKg: 1800,
    collectorKg: 650,
    aftKg: 2100,
    leftWingKg: 1450,
    rightWingKg: 1450,
    externalKg: 1600,
  },
  aerodynamics: {
    cL0: 0.05,
    cLalpha: 3.82, // per radian
    cLmax: 1.65,
    alphaStallDeg: 28.0, // High-AoA vortex lift with strakes
    alphaStallPostDeg: 42.0,
    cD0: 0.0195, // Clean zero-lift drag
    inducedDragFactorK: 0.088,
    cdMachWaveSlope: 0.045,
    machCrit: 0.88,
    dragGear: 0.038,
    dragFlapsHalf: 0.024,
    dragFlapsFull: 0.058,
    dragSpeedBrake: 0.042,
    cyBeta: -0.85,
    clBeta: -0.11,
    clP: -0.42,
    clDeltaAileron: 0.16,
    cm0: -0.015,
    cmAlpha: -0.38,
    cmQ: -2.8,
    cmDeltaElevator: -0.72,
    cnBeta: 0.18,
    cnR: -0.22,
    cnDeltaRudder: -0.085,
  },
  limits: {
    maxGearExtendKts: 260,
    maxFlapExtendKts: 280,
    maxSpeedBrakeKts: 650,
    serviceCeilingFt: 62000,
  },
};

export const SF19_PHANTOM_X: AircraftProfile = {
  id: 'sf-19',
  name: 'SF-19 Phantom-X',
  designation: 'Synthetic Lightweight Multi-Role Trainer',
  role: 'Advanced Jet Systems Trainer',
  emptyMassKg: 8600,
  maxTakeoffWeightKg: 17200,
  maxGPositive: 8.5,
  maxGNegative: -2.8,
  vNeKnots: 750,
  maxMach: 1.85,
  wingSpanMeters: 9.8,
  wingAreaM2: 32.5,
  meanAerodynamicChordMeters: 3.65,
  aspectRatio: 2.95,
  engine: {
    model: 'F-140 Turbofan Engine',
    dryThrustKn: 54.0,
    afterburnerThrustKn: 89.0,
    idleFuelFlowPph: 720,
    milFuelFlowPph: 5100,
    abFuelFlowPph: 24000,
    spoolRatePerSecond: 0.42,
    starterDurationSec: 12,
    normalIdleN2: 62.0,
    normalMilN2: 100.0,
  },
  fuelCapacities: {
    forwardKg: 1200,
    collectorKg: 400,
    aftKg: 1300,
    leftWingKg: 950,
    rightWingKg: 950,
    externalKg: 1000,
  },
  aerodynamics: {
    cL0: 0.045,
    cLalpha: 3.65,
    cLmax: 1.55,
    alphaStallDeg: 24.0,
    alphaStallPostDeg: 38.0,
    cD0: 0.021,
    inducedDragFactorK: 0.092,
    cdMachWaveSlope: 0.048,
    machCrit: 0.86,
    dragGear: 0.035,
    dragFlapsHalf: 0.022,
    dragFlapsFull: 0.052,
    dragSpeedBrake: 0.038,
    cyBeta: -0.78,
    clBeta: -0.095,
    clP: -0.38,
    clDeltaAileron: 0.15,
    cm0: -0.012,
    cmAlpha: -0.35,
    cmQ: -2.5,
    cmDeltaElevator: -0.68,
    cnBeta: 0.16,
    cnR: -0.20,
    cnDeltaRudder: -0.078,
  },
  limits: {
    maxGearExtendKts: 250,
    maxFlapExtendKts: 260,
    maxSpeedBrakeKts: 600,
    serviceCeilingFt: 52000,
  },
};

export const AIRCRAFT_PROFILES: Record<string, AircraftProfile> = {
  'sf-27': SF27_VANGUARD,
  'sf-19': SF19_PHANTOM_X,
};
