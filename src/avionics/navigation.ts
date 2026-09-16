/**
 * Navigation System: Synthetic INS, GNSS Receiver, Waypoints, and ILS
 */

import { NavigationState, NavWaypoint } from '../types/simulation';
import { CONSTANTS } from '../core/constants';

export const SYNTHETIC_AIRSPACE_WAYPOINTS: NavWaypoint[] = [
  { id: 'WP-01', name: 'KSEA AIRFIELD', type: 'AIRPORT', latitude: 47.4502, longitude: -122.3088, altitudeFt: 433, xMeters: 0, yMeters: 0, frequency: '110.3' },
  { id: 'WP-02', name: 'OLYMPIA VOR', type: 'TACAN', latitude: 46.9744, longitude: -122.9038, altitudeFt: 5000, xMeters: -53000, yMeters: -45000, channel: '34X' },
  { id: 'WP-03', name: 'RAINIER FIX', type: 'FIX', latitude: 46.8523, longitude: -121.7603, altitudeFt: 14500, xMeters: -66000, yMeters: 42000 },
  { id: 'WP-04', name: 'YAKIMA TACAN', type: 'TACAN', latitude: 46.5683, longitude: -120.5333, altitudeFt: 18000, xMeters: -98000, yMeters: 135000, channel: '89X' },
  { id: 'WP-05', name: 'MOSES LAKE', type: 'WAYPOINT', latitude: 47.2077, longitude: -119.3202, altitudeFt: 22000, xMeters: -27000, yMeters: 228000 },
  { id: 'WP-06', name: 'COLUMBIA RANGE', type: 'FIX', latitude: 47.9255, longitude: -119.8512, altitudeFt: 25000, xMeters: 53000, yMeters: 188000 },
  { id: 'WP-07', name: 'SNOHOMISH INITIAL', type: 'FIX', latitude: 47.9073, longitude: -122.2816, altitudeFt: 8000, xMeters: 51000, yMeters: 2000 },
  { id: 'WP-08', name: 'FINAL RWY 09', type: 'FIX', latitude: 47.4502, longitude: -122.4500, altitudeFt: 2500, xMeters: 0, yMeters: -10500, frequency: '109.5' },
];

export class NavigationSystem {
  public static init(): NavigationState {
    return {
      insState: 'OFF',
      insAlignmentProgress: 0,
      insPosition: { lat: 47.4502, lon: -122.3088, altFt: 433 },
      insDriftErrorNm: 0,
      gnssState: 'LOCKED',
      satellitesLocked: 10,
      hdop: 0.85,
      waypoints: [...SYNTHETIC_AIRSPACE_WAYPOINTS],
      activeWaypointIndex: 1, // Start directing toward WP-02
      distanceToActiveNm: 38.5,
      bearingToActiveDeg: 220.0,
      trackErrorDeg: 0,
      etaSeconds: 420,
      ilsCourseDeg: 90.0, // Runway 09
      ilsGlideslopeDevDeg: 0,
      ilsLocalizerDevDeg: 0,
      ilsSignalValid: false,
    };
  }

  public static update(
    current: NavigationState,
    acX: number,
    acY: number,
    acAltM: number,
    trueHeadingDeg: number,
    groundSpeedKnots: number,
    onGround: boolean,
    navBreakerLive: boolean,
    dt: number
  ): NavigationState {
    const next = { ...current };

    if (!navBreakerLive) {
      next.insState = 'OFF';
      next.gnssState = 'OFF';
      next.satellitesLocked = 0;
      return next;
    }

    // INS Alignment logic
    if (next.insState === 'OFF') {
      next.insState = 'ALIGNING';
      next.insAlignmentProgress = 0;
    } else if (next.insState === 'ALIGNING') {
      if (onGround && groundSpeedKnots < 2.0) {
        // Alignment progresses when aircraft is stationary
        next.insAlignmentProgress = Math.min(100, next.insAlignmentProgress + 5.0 * dt);
        if (next.insAlignmentProgress >= 100) {
          next.insState = 'NAVIGATING';
        }
      } else {
        // Alignment degraded if aircraft moving during alignment
        next.insState = 'DEGRADED';
      }
    } else if (next.insState === 'NAVIGATING') {
      // Natural INS gyro drift ~0.6 NM per hour
      next.insDriftErrorNm += (0.6 / 3600.0) * dt;
    }

    // Active Waypoint Calculations
    const activeWp = next.waypoints[next.activeWaypointIndex] || next.waypoints[0];
    const dx = activeWp.xMeters - acX;
    const dy = activeWp.yMeters - acY;
    const distMeters = Math.sqrt(dx * dx + dy * dy);
    next.distanceToActiveNm = distMeters * CONSTANTS.METERS_TO_NM;

    // Bearing to waypoint (NED coordinates: x is North, y is East)
    let bearingRad = Math.atan2(dy, dx);
    if (bearingRad < 0) bearingRad += 2 * Math.PI;
    next.bearingToActiveDeg = bearingRad * CONSTANTS.RAD_TO_DEG;

    // Track error relative to aircraft heading
    let trackDiff = next.bearingToActiveDeg - trueHeadingDeg;
    while (trackDiff > 180) trackDiff -= 360;
    while (trackDiff < -180) trackDiff += 360;
    next.trackErrorDeg = trackDiff;

    // ETA
    const effectiveSpeed = Math.max(50, groundSpeedKnots);
    next.etaSeconds = Math.round((next.distanceToActiveNm / effectiveSpeed) * 3600);

    // Auto-sequence waypoint when within 1.5 NM
    if (next.distanceToActiveNm < 1.5 && next.activeWaypointIndex < next.waypoints.length - 1) {
      next.activeWaypointIndex += 1;
    }

    // ILS Calculations (Runway 09: origin X=0, Y=0, heading 090°)
    // Runway threshold is at (0, 0), approach comes from the West (-Y direction)
    const distFromThresholdNm = -acY * CONSTANTS.METERS_TO_NM;
    if (distFromThresholdNm > 0 && distFromThresholdNm < 25.0 && Math.abs(acX) < 15000) {
      next.ilsSignalValid = true;
      // Localizer: lateral deviation from centerline (X axis)
      const locDevRad = Math.atan2(acX, -acY);
      next.ilsLocalizerDevDeg = Math.max(-2.5, Math.min(2.5, locDevRad * CONSTANTS.RAD_TO_DEG));

      // Glideslope (3.0 degree nominal descent)
      const idealAltM = CONSTANTS.RUNWAY_ELEVATION_M + -acY * Math.tan(3.0 * CONSTANTS.DEG_TO_RAD);
      const altDeltaM = acAltM - idealAltM;
      const gsDevRad = Math.atan2(altDeltaM, -acY);
      next.ilsGlideslopeDevDeg = Math.max(-1.5, Math.min(1.5, gsDevRad * CONSTANTS.RAD_TO_DEG));
    } else {
      next.ilsSignalValid = false;
      next.ilsLocalizerDevDeg = 0;
      next.ilsGlideslopeDevDeg = 0;
    }

    return next;
  }
}
