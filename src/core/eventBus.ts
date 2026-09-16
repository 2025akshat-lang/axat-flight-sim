/**
 * Central Event Bus for Aircraft Subsystems and Simulation Events
 */

export type SimulationEventType =
  | 'SIM_START'
  | 'SIM_PAUSE'
  | 'SIM_RESUME'
  | 'SIM_RESET'
  | 'ENGINE_MASTER_TOGGLE'
  | 'ENGINE_CRANK'
  | 'ENGINE_IGNITION'
  | 'ENGINE_IDLE_REACHED'
  | 'ENGINE_AFTERBURNER_ON'
  | 'ENGINE_AFTERBURNER_OFF'
  | 'ENGINE_FLAMEOUT'
  | 'ENGINE_FIRE'
  | 'GEAR_COMMAND_DOWN'
  | 'GEAR_COMMAND_UP'
  | 'GEAR_DOWN_LOCKED'
  | 'GEAR_UP_LOCKED'
  | 'GEAR_UNSAFE'
  | 'FLAPS_CHANGED'
  | 'SPEEDBRAKE_TOGGLE'
  | 'BRAKE_APPLIED'
  | 'ELECTRICAL_BATTERY_TOGGLE'
  | 'ELECTRICAL_GEN_TOGGLE'
  | 'ELECTRICAL_BREAKER_TRIP'
  | 'ELECTRICAL_BREAKER_RESET'
  | 'HYD_PRESSURE_LOW'
  | 'FUEL_BOOST_PUMP_TOGGLE'
  | 'FUEL_CROSSFEED_TOGGLE'
  | 'FUEL_LOW_WARNING'
  | 'STALL_WARNING'
  | 'OVERSPEED_WARNING'
  | 'G_LIMIT_EXCEEDED'
  | 'MASTER_CAUTION'
  | 'MASTER_WARNING'
  | 'TOUCHDOWN'
  | 'LIFTOFF'
  | 'WAYPOINT_REACHED'
  | 'CHECKLIST_ITEM_COMPLETE'
  | 'FAILURE_INJECTED'
  | 'FAILURE_CLEARED'
  | 'CONTROL_INPUT_CHANGE';

export interface EventBusPayload {
  type: SimulationEventType;
  timestamp: number;
  subsystem: string;
  data?: Record<string, unknown>;
  message: string;
}

export type EventListener = (event: EventBusPayload) => void;

class EventBus {
  private listeners: Map<SimulationEventType | '*', Set<EventListener>> = new Map();
  private history: EventBusPayload[] = [];
  private maxHistory = 100;

  public subscribe(type: SimulationEventType | '*', listener: EventListener): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);

    return () => {
      this.listeners.get(type)?.delete(listener);
    };
  }

  public emit(type: SimulationEventType, subsystem: string, message: string, data?: Record<string, unknown>): void {
    const payload: EventBusPayload = {
      type,
      timestamp: performance.now(),
      subsystem,
      data,
      message,
    };

    this.history.push(payload);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    // Notify specific type listeners
    const specificListeners = this.listeners.get(type);
    if (specificListeners) {
      specificListeners.forEach((listener) => {
        try {
          listener(payload);
        } catch (err) {
          console.error(`Error in event listener for ${type}:`, err);
        }
      });
    }

    // Notify wildcard listeners
    const wildcardListeners = this.listeners.get('*');
    if (wildcardListeners) {
      wildcardListeners.forEach((listener) => {
        try {
          listener(payload);
        } catch (err) {
          console.error(`Error in wildcard event listener:`, err);
        }
      });
    }
  }

  public getHistory(): EventBusPayload[] {
    return [...this.history];
  }

  public clearHistory(): void {
    this.history = [];
  }
}

export const simulationEventBus = new EventBus();
