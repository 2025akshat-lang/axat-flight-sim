/**
 * Physical and Mathematical Constants for Aircraft Simulation
 */

export const CONSTANTS = {
  GRAVITY_SEA_LEVEL: 9.80665, // m/s^2
  GAS_CONSTANT_AIR: 287.058, // J/(kg*K)
  GAMMA_AIR: 1.4, // Ratio of specific heats
  SEA_LEVEL_TEMPERATURE_K: 288.15, // 15°C in Kelvin
  SEA_LEVEL_PRESSURE_PA: 101325.0, // Standard pressure in Pa
  SEA_LEVEL_DENSITY_KG_M3: 1.225, // Standard density
  TEMPERATURE_LAPSE_RATE_K_M: 0.0065, // 6.5 K/km in troposphere
  TROPOPAUSE_ALTITUDE_M: 11000.0, // 11,000m (36,089 ft)
  TROPOPAUSE_TEMPERATURE_K: 216.65, // -56.5°C constant in lower stratosphere

  // Unit conversions
  METERS_TO_FEET: 3.28084,
  MPS_TO_FEET: 3.28084,
  FEET_TO_METERS: 0.3048,
  MPS_TO_KNOTS: 1.94384,
  KNOTS_TO_MPS: 0.514444,
  MPS_TO_KMH: 3.6,
  KMH_TO_MPS: 0.277778,
  RAD_TO_DEG: 180.0 / Math.PI,
  DEG_TO_RAD: Math.PI / 180.0,
  KG_TO_LBS: 2.20462,
  LBS_TO_KG: 0.453592,
  NM_TO_METERS: 1852.0,
  METERS_TO_NM: 1.0 / 1852.0,
  PA_TO_PSI: 0.000145038,
  PSI_TO_PA: 6894.76,
  PA_TO_HPA: 0.01,
  HPA_TO_INHG: 0.02953,

  // Runway reference for synthetic airport
  RUNWAY_ELEVATION_M: 12.0,
  RUNWAY_LENGTH_M: 3200.0,
  RUNWAY_WIDTH_M: 45.0,
  RUNWAY_HEADING_DEG: 90.0, // Runway 09
  RUNWAY_ORIGIN_X: 0.0,
  RUNWAY_ORIGIN_Y: 0.0,
};
