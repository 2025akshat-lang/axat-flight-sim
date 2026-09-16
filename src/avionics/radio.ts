/**
 * Simulated Communication Radio and ATC Training Messages
 */

import { RadioState } from '../types/simulation';

export class RadioSystem {
  public static init(): RadioState {
    return {
      comm1Power: true,
      comm1FreqMhz: 121.8, // Ground control
      comm1ActiveFreqMhz: 121.8,
      comm1StandbyFreqMhz: 119.9, // Tower
      comm2Power: true,
      comm2FreqMhz: 305.5, // Tactical / Flight Operations UHF
      comm2ActiveFreqMhz: 305.5,
      comm2StandbyFreqMhz: 243.0, // Military Guard
      squelchOn: true,
      volumePercent: 80,
      activeRadio: 'COMM1',
      lastTransmission: {
        sender: 'SEATTLE TOWER',
        message: 'VANGUARD 01, RUNWAY 09 CLEARED FOR TAKEOFF, WIND 090 AT 12 KTS.',
        timestamp: Date.now(),
      },
    };
  }

  public static swapFrequencies(current: RadioState, radio: 'COMM1' | 'COMM2'): RadioState {
    if (radio === 'COMM1') {
      return {
        ...current,
        comm1ActiveFreqMhz: current.comm1StandbyFreqMhz,
        comm1StandbyFreqMhz: current.comm1ActiveFreqMhz,
        comm1FreqMhz: current.comm1StandbyFreqMhz,
      };
    } else {
      return {
        ...current,
        comm2ActiveFreqMhz: current.comm2StandbyFreqMhz,
        comm2StandbyFreqMhz: current.comm2ActiveFreqMhz,
        comm2FreqMhz: current.comm2StandbyFreqMhz,
      };
    }
  }

  public static setStandbyFreq(current: RadioState, radio: 'COMM1' | 'COMM2', freq: number): RadioState {
    if (radio === 'COMM1') {
      return { ...current, comm1StandbyFreqMhz: freq };
    } else {
      return { ...current, comm2StandbyFreqMhz: freq };
    }
  }

  public static transmitMessage(current: RadioState, messageType: 'DEPARTURE' | 'APPROACH' | 'EMERGENCY'): RadioState {
    let sender = 'TOWER';
    let text = '';
    const now = Date.now();

    switch (messageType) {
      case 'DEPARTURE':
        sender = 'SEATTLE DEP';
        text = 'VANGUARD 01, RADAR CONTACT, CLIMB AND MAINTAIN FL240, TURN RIGHT DIRECT RAINIER.';
        break;
      case 'APPROACH':
        sender = 'SEATTLE APP';
        text = 'VANGUARD 01, DESCEND AND MAINTAIN 3000, CLEARED ILS RUNWAY 09 APPROACH.';
        break;
      case 'EMERGENCY':
        sender = 'SEATTLE CENTER';
        text = 'VANGUARD 01, MAYDAY ACKNOWLEDGED, SQUAWK 7700, WIND 090 AT 10 KTS, RUNWAY 09 IS YOURS.';
        break;
    }

    return {
      ...current,
      lastTransmission: { sender, message: text, timestamp: now },
    };
  }
}
