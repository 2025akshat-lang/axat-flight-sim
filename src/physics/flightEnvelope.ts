/**
 * Flight Envelope & V-n Diagram Engineering Model
 * Evaluates structural boundaries, stall line, corner airspeed, and turn performance.
 */

import { AircraftProfile } from '../types/aircraft';
import { CONSTANTS } from '../core/constants';

export interface FlightEnvelopePoint {
  airspeedKts: number;
  maxPositiveG: number;
  maxNegativeG: number;
}

export interface TurnPerformance {
  bankAngleDeg: number;
  turnRateDegPerSec: number;
  turnRadiusMeters: number;
  turnRadiusNm: number;
  loadFactorG: number;
}

export class FlightEnvelopeModel {
  /**
   * Generates V-n diagram points from 0 to V_ne.
   */
  public static generateVnDiagram(
    profile: AircraftProfile,
    massKg: number,
    densityKgM3: number
  ): {
    points: FlightEnvelopePoint[];
    stallSpeedCleanKts: number;
    cornerSpeedKts: number;
    vNeKts: number;
  } {
    const aero = profile.aerodynamics;
    const S = profile.wingAreaM2;
    const g = CONSTANTS.GRAVITY_SEA_LEVEL;
    const maxGPos = profile.maxGPositive;
    const maxGNeg = profile.maxGNegative;
    const vNeKts = profile.vNeKnots;

    // Clean stall speed (1G): V_stall = sqrt( (2 * m * g) / (rho * S * CL_max) )
    const vStallCleanMps = Math.sqrt((2.0 * massKg * g) / (densityKgM3 * S * aero.cLmax));
    const stallSpeedCleanKts = vStallCleanMps * CONSTANTS.MPS_TO_KNOTS;

    // Corner speed (maneuvering speed Va): minimum speed where max positive G can be achieved
    // Va = V_stall * sqrt(Nz_max)
    const cornerSpeedKts = stallSpeedCleanKts * Math.sqrt(maxGPos);

    const points: FlightEnvelopePoint[] = [];
    const stepKts = 25;

    for (let kts = 0; kts <= vNeKts + stepKts; kts += stepKts) {
      const vMps = kts * CONSTANTS.KNOTS_TO_MPS;
      const q = 0.5 * densityKgM3 * vMps * vMps;

      // Aerodynamic aerodynamic limit positive: Nz_aero = (q * S * CL_max) / (m * g)
      const aeroLimitPos = (q * S * aero.cLmax) / (massKg * g);
      const posG = Math.min(maxGPos, aeroLimitPos);

      // Aerodynamic limit negative (assume CL_min ~ -0.8 * CL_max)
      const aeroLimitNeg = -(q * S * (0.8 * aero.cLmax)) / (massKg * g);
      const negG = Math.max(maxGNeg, aeroLimitNeg);

      points.push({
        airspeedKts: kts,
        maxPositiveG: posG,
        maxNegativeG: negG,
      });
    }

    return {
      points,
      stallSpeedCleanKts,
      cornerSpeedKts,
      vNeKts,
    };
  }

  /**
   * Computes sustained turn performance.
   * Turn rate omega = (g * sqrt(n^2 - 1)) / V
   * Turn radius R = V^2 / (g * sqrt(n^2 - 1))
   */
  public static calculateTurn(trueAirspeedMps: number, bankAngleDeg: number): TurnPerformance {
    const bankRad = Math.abs(bankAngleDeg) * CONSTANTS.DEG_TO_RAD;
    const cosBank = Math.max(0.05, Math.cos(bankRad));
    const loadFactor = 1.0 / cosBank;

    if (trueAirspeedMps < 5.0 || Math.abs(bankAngleDeg) < 1.0) {
      return {
        bankAngleDeg,
        turnRateDegPerSec: 0,
        turnRadiusMeters: Infinity,
        turnRadiusNm: Infinity,
        loadFactorG: 1.0,
      };
    }

    const g = CONSTANTS.GRAVITY_SEA_LEVEL;
    const tanBank = Math.tan(bankRad);
    // omega = g * tan(phi) / V (rad/s)
    const turnRateRadS = (g * tanBank) / trueAirspeedMps;
    // R = V^2 / (g * tan(phi)) (m)
    const turnRadiusMeters = (trueAirspeedMps * trueAirspeedMps) / (g * tanBank);

    return {
      bankAngleDeg,
      turnRateDegPerSec: turnRateRadS * CONSTANTS.RAD_TO_DEG,
      turnRadiusMeters,
      turnRadiusNm: turnRadiusMeters * CONSTANTS.METERS_TO_NM,
      loadFactorG: loadFactor,
    };
  }
}
