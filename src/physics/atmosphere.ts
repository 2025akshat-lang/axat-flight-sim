/**
 * Atmospheric Model
 * International Standard Atmosphere (ISA) with hot/cold day deviations and lapse rates.
 */

import { CONSTANTS } from '../core/constants';

export interface AtmosphereSample {
  altitudeMeters: number;
  altitudeFt: number;
  temperatureK: number;
  temperatureDegC: number;
  pressurePa: number;
  pressureHpa: number;
  densityKgM3: number;
  densityRatioSigma: number;
  speedOfSoundMps: number;
  speedOfSoundKnots: number;
}

export class AtmosphereModel {
  /**
   * Calculates atmospheric conditions at a given geometric altitude and temperature deviation.
   * Model Assumptions:
   * - ISA Troposphere up to 11,000m (lapse rate = -0.0065 K/m)
   * - Isothermal Lower Stratosphere from 11,000m to 20,000m (-56.5°C)
   * - Ideal gas law: P = rho * R * T
   * - Speed of sound: a = sqrt(gamma * R * T)
   */
  public static sample(altitudeMeters: number, temperatureOffsetC: number = 0): AtmosphereSample {
    const h = Math.max(0, altitudeMeters);
    const T0 = CONSTANTS.SEA_LEVEL_TEMPERATURE_K + temperatureOffsetC;
    const P0 = CONSTANTS.SEA_LEVEL_PRESSURE_PA;
    const g = CONSTANTS.GRAVITY_SEA_LEVEL;
    const R = CONSTANTS.GAS_CONSTANT_AIR;
    const gamma = CONSTANTS.GAMMA_AIR;
    const lapse = CONSTANTS.TEMPERATURE_LAPSE_RATE_K_M;

    let T: number;
    let P: number;

    if (h <= CONSTANTS.TROPOPAUSE_ALTITUDE_M) {
      // Troposphere
      T = T0 - lapse * h;
      // Barometric formula: P = P0 * (T / T0)^(g / (R * lapse))
      const exponent = g / (R * lapse);
      P = P0 * Math.pow(T / T0, exponent);
    } else {
      // Lower Stratosphere (Isothermal)
      const T_trop = T0 - lapse * CONSTANTS.TROPOPAUSE_ALTITUDE_M;
      const P_trop = P0 * Math.pow(T_trop / T0, g / (R * lapse));
      T = T_trop;
      const deltaH = h - CONSTANTS.TROPOPAUSE_ALTITUDE_M;
      // Exponential pressure decay
      P = P_trop * Math.exp((-g * deltaH) / (R * T_trop));
    }

    // Density from ideal gas law: rho = P / (R * T)
    const rho = P / (R * T);
    const sigma = rho / CONSTANTS.SEA_LEVEL_DENSITY_KG_M3;

    // Speed of sound: a = sqrt(gamma * R * T)
    const a = Math.sqrt(gamma * R * T);

    return {
      altitudeMeters: h,
      altitudeFt: h * CONSTANTS.METERS_TO_FEET,
      temperatureK: T,
      temperatureDegC: T - 273.15,
      pressurePa: P,
      pressureHpa: P * CONSTANTS.PA_TO_HPA,
      densityKgM3: rho,
      densityRatioSigma: sigma,
      speedOfSoundMps: a,
      speedOfSoundKnots: a * CONSTANTS.MPS_TO_KNOTS,
    };
  }

  /**
   * Computes dynamic pressure: q = 0.5 * rho * V^2 (Pascals)
   */
  public static dynamicPressure(densityKgM3: number, trueAirspeedMps: number): number {
    return 0.5 * densityKgM3 * trueAirspeedMps * trueAirspeedMps;
  }

  /**
   * Computes indicated airspeed from dynamic pressure (standard sea level calibration)
   * V_ias = sqrt(2 * q / rho_0)
   */
  public static indicatedAirspeedMps(dynamicPressurePa: number): number {
    if (dynamicPressurePa <= 0) return 0;
    return Math.sqrt((2.0 * dynamicPressurePa) / CONSTANTS.SEA_LEVEL_DENSITY_KG_M3);
  }
}
