/**
 * Aerodynamic Force and Moment Evaluation Engine
 * Documented engineering formulations with stall, compressibility, and surface deflections.
 */

import { AircraftProfile } from '../types/aircraft';
import { SurfaceDeflections } from '../types/simulation';
import { CONSTANTS } from '../core/constants';

export interface AeroForcesAndMoments {
  liftN: number;
  dragN: number;
  sideForceN: number;
  pitchingMomentNm: number;
  rollingMomentNm: number;
  yawingMomentNm: number;
  cL: number;
  cD: number;
  cY: number;
  cm: number;
  cl: number;
  cn: number;
  alphaDeg: number;
  betaDeg: number;
  mach: number;
  dynamicPressurePa: number;
  isStalled: boolean;
}

export class AerodynamicsModel {
  /**
   * Computes aerodynamic forces and moments in aircraft body/stability axes.
   */
  public static calculate(
    profile: AircraftProfile,
    u: number, // body forward m/s
    v: number, // body lateral m/s
    w: number, // body vertical m/s
    p: number, // roll rate rad/s
    q: number, // pitch rate rad/s
    r: number, // yaw rate rad/s
    rho: number, // ambient density kg/m^3
    speedOfSoundMps: number,
    surfaces: SurfaceDeflections,
    gearDown: boolean
  ): AeroForcesAndMoments {
    const aero = profile.aerodynamics;
    const S = profile.wingAreaM2;
    const b = profile.wingSpanMeters;
    const c = profile.meanAerodynamicChordMeters;

    const V_total = Math.sqrt(u * u + v * v + w * w);
    const q_bar = 0.5 * rho * V_total * V_total;
    const mach = speedOfSoundMps > 0 ? V_total / speedOfSoundMps : 0;

    // Angle of attack (alpha) and sideslip (beta)
    let alphaRad = 0;
    let betaRad = 0;
    if (V_total > 0.5) {
      alphaRad = Math.atan2(w, Math.max(0.1, u));
      betaRad = Math.asin(Math.max(-1, Math.min(1, v / V_total)));
    }
    const alphaDeg = alphaRad * CONSTANTS.RAD_TO_DEG;
    const betaDeg = betaRad * CONSTANTS.RAD_TO_DEG;

    // 1. Lift Coefficient (CL)
    // Linear region with stall curve and post-stall roll-off
    const stallAoA = aero.alphaStallDeg;
    let cL = 0;
    let isStalled = false;

    if (Math.abs(alphaDeg) <= stallAoA) {
      // Linear + strake vortex lift component
      cL = aero.cL0 + aero.cLalpha * alphaRad;
    } else {
      isStalled = true;
      const sign = Math.sign(alphaDeg);
      const postStallDecay = Math.max(0.2, 1.0 - (Math.abs(alphaDeg) - stallAoA) / (aero.alphaStallPostDeg - stallAoA));
      cL = sign * aero.cLmax * postStallDecay;
    }

    // Flap contribution to lift
    if (surfaces.flapsDeg > 0) {
      const flapDelta = (surfaces.flapsDeg / 35.0) * 0.45;
      cL += flapDelta;
    }

    // Stabilator/elevator contribution to lift
    const avgElevatorRad = ((surfaces.leftStabilatorDeg + surfaces.rightStabilatorDeg) / 2.0) * CONSTANTS.DEG_TO_RAD;
    cL += avgElevatorRad * 0.35;

    // 2. Drag Coefficient (CD)
    // Parasite drag + induced drag k*CL^2 + compressibility wave drag + configuration drag
    let cD = aero.cD0 + aero.inducedDragFactorK * (cL * cL);

    // Wave drag rise past critical Mach
    if (mach > aero.machCrit) {
      const deltaM = mach - aero.machCrit;
      const waveDrag = aero.cdMachWaveSlope * Math.pow(deltaM, 1.8);
      cD += waveDrag;
    }

    // Landing gear drag
    if (gearDown) {
      cD += aero.dragGear;
    }

    // Flap drag
    if (surfaces.flapsDeg > 0) {
      const flapRatio = surfaces.flapsDeg / 35.0;
      cD += flapRatio * aero.dragFlapsFull;
    }

    // Speed brake drag
    if (surfaces.speedBrakePercent > 0) {
      cD += (surfaces.speedBrakePercent / 100.0) * aero.dragSpeedBrake;
    }

    // 3. Side Force Coefficient (CY)
    const rudderRad = surfaces.rudderDeg * CONSTANTS.DEG_TO_RAD;
    let cY = aero.cyBeta * betaRad + aero.cnDeltaRudder * rudderRad;

    // Dimensional forces (N)
    const liftN = q_bar * S * cL;
    const dragN = q_bar * S * cD;
    const sideForceN = q_bar * S * cY;

    // 4. Moments (Pitching Cm, Rolling Cl, Yawing Cn)
    // Non-dimensional rates
    const q_hat = V_total > 1.0 ? (q * c) / (2.0 * V_total) : 0;
    const p_hat = V_total > 1.0 ? (p * b) / (2.0 * V_total) : 0;
    const r_hat = V_total > 1.0 ? (r * b) / (2.0 * V_total) : 0;

    // Pitching moment
    let cm = aero.cm0 + aero.cmAlpha * alphaRad + aero.cmQ * q_hat + aero.cmDeltaElevator * avgElevatorRad;
    // Post-stall pitch down moment (stall recovery tendency)
    if (isStalled) {
      cm -= Math.sign(alphaDeg) * 0.15;
    }

    // Rolling moment (differential stabilator + aileron)
    const deltaAileronRad = ((surfaces.leftAileronDeg - surfaces.rightAileronDeg) / 2.0) * CONSTANTS.DEG_TO_RAD;
    const diffStabRad = ((surfaces.leftStabilatorDeg - surfaces.rightStabilatorDeg) / 2.0) * CONSTANTS.DEG_TO_RAD;
    let cl = aero.clBeta * betaRad + aero.clP * p_hat + aero.clDeltaAileron * deltaAileronRad + 0.12 * diffStabRad;

    // Yawing moment
    let cn = aero.cnBeta * betaRad + aero.cnR * r_hat + aero.cnDeltaRudder * rudderRad;

    // Dimensional moments (Nm)
    const pitchingMomentNm = q_bar * S * c * cm;
    const rollingMomentNm = q_bar * S * b * cl;
    const yawingMomentNm = q_bar * S * b * cn;

    return {
      liftN,
      dragN,
      sideForceN,
      pitchingMomentNm,
      rollingMomentNm,
      yawingMomentNm,
      cL,
      cD,
      cY,
      cm,
      cl,
      cn,
      alphaDeg,
      betaDeg,
      mach,
      dynamicPressurePa: q_bar,
      isStalled,
    };
  }
}
