/**
 * Flight Performance & Objective Evaluation Engine
 */

import { AircraftState, EvaluationRecord } from '../types/simulation';

export class FlightEvaluator {
  public static initEvaluation(scenarioId: string): EvaluationRecord {
    return {
      scenarioId,
      maxGRecorded: 1.0,
      minGRecorded: 1.0,
      stallEventsCount: 0,
      overspeedEventsCount: 0,
      fuelUsedKg: 0,
      flightDurationSeconds: 0,
    };
  }

  public static evaluateLanding(
    touchdownSpeedKts: number,
    touchdownFpm: number,
    gAtTouchdown: number,
    lateralDeviationM: number
  ): { score: number; notes: string[] } {
    const notes: string[] = [];
    let score = 100;

    // Sink rate evaluation (fpm)
    // Ideal touchdown: 100 - 250 fpm
    if (touchdownFpm < 100) {
      notes.push('Floated in ground effect prior to touchdown');
      score -= 5;
    } else if (touchdownFpm <= 250) {
      notes.push('Greased touchdown: nominal sink rate (100-250 fpm)');
    } else if (touchdownFpm <= 400) {
      notes.push('Firm touchdown within acceptable carrier/field parameters');
      score -= 10;
    } else if (touchdownFpm <= 600) {
      notes.push('Hard landing: elevated vertical descent rate (> 400 fpm)');
      score -= 30;
    } else {
      notes.push('CRITICAL: Structural hard landing (> 600 fpm) inspection required');
      score -= 60;
    }

    // Touchdown G
    if (gAtTouchdown > 2.5) {
      notes.push(`High G impact on touchdown: ${gAtTouchdown.toFixed(1)}G`);
      score -= 20;
    }

    // Centerline deviation
    if (Math.abs(lateralDeviationM) > 8) {
      notes.push(`Lateral deviation from runway centerline: ${lateralDeviationM.toFixed(1)}m`);
      score -= 15;
    } else {
      notes.push('Excellent runway centerline tracking');
    }

    // Touchdown speed
    if (touchdownSpeedKts > 175) {
      notes.push(`Fast touchdown: ${touchdownSpeedKts.toFixed(0)} KIAS (excess energy)`);
      score -= 15;
    } else if (touchdownSpeedKts < 135) {
      notes.push(`Low airspeed at touchdown: ${touchdownSpeedKts.toFixed(0)} KIAS (stall risk)`);
      score -= 20;
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      notes,
    };
  }
}
