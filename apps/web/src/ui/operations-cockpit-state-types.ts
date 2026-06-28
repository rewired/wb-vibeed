/**
 * Operations Cockpit v0.1
 * Static UI Prototype State Types
 *
 * Scope:
 * - one room
 * - one zone
 * - one active batch
 * - deterministic simulation snapshot
 * - static UI prototype only
 *
 * Do not add simulation logic to this file.
 */

export type StatusLevel = 'normal' | 'warning' | 'critical';
export type EventSeverity = 'info' | 'warning' | 'critical';
export type SeverityLevel = EventSeverity;
export type OperatingMode = 'Eco' | 'Balanced' | 'Push';
export type ControlState = 'Auto' | 'Manual';
export type SimSpeed = 1 | 2 | 4 | 8;

export interface SimulationRuntimeState {
  isRunning: boolean;
  tick: number;
  speed: SimSpeed;
  ticksPerDay: number;
  initialTick: number;
}

export interface CockpitControlState {
  light: {
    mode: OperatingMode;
    control: ControlState;
    intensity: number;
  };
  climate: {
    mode: OperatingMode;
    control: ControlState;
    targetBias: string;
  };
  irrigation: {
    mode: OperatingMode;
    control: ControlState;
    irrigationIndex: number;
  };
}

export interface HeaderStat {
  label: string;
  value: string | number;
  unit?: string;
  status?: StatusLevel;
}

export interface MetricTileState {
  id: string;
  label: string;
  value: string | number;
  unit?: string;
  reference?: string;
  status: StatusLevel;
}

export interface ProgressTileState {
  id: string;
  label: string;
  value: string | number;
  unit?: string;
  secondary?: string;
  status?: StatusLevel;
}

export interface ControlTileState {
  id: string;
  label: string;
  activeMode: OperatingMode;
  activeControl: ControlState;
  primaryTuning: {
    label: string;
    value: string | number;
    unit?: string;
  };
}

export interface TrendTileState {
  id: string;
  label: string;
  unit: string;
  currentValue: string | number;
  range: '6h' | '24h' | '7d';
  points: number[];
}

export interface EventLogEntryState {
  id: string;
  time: string;
  day: number;
  tick: number;
  severity: SeverityLevel;
  title: string;
  detail?: string;
}

export interface RoomCapacityItemState {
  id: string;
  label: string;
  value: string;
  icon: string;
}

export interface RoomInventoryItemState {
  id: string;
  label: string;
  value: string;
}

export interface UtilityStatusItemState {
  id: string;
  label: string;
  value: string;
  secondary?: string;
  status: StatusLevel;
}

export interface OperationsCockpitState {
  header: {
    title: string;
    stats: HeaderStat[];
  };

  roomOverview: {
    title: string;
    roomId: string;
    zoneId: string;
    activeView: '3d' | 'schematic';
    overlays: string[];
    capacity: RoomCapacityItemState[];
    inventory: RoomInventoryItemState[];
  };

  batchStatus: ProgressTileState[];
  environmentalTelemetry: MetricTileState[];
  controls: ControlTileState[];
  telemetryTrends: TrendTileState[];
  eventLog: EventLogEntryState[];

  energyCost: MetricTileState[];
  utilityStatus: UtilityStatusItemState[];
}

export interface OperationsCockpitRuntimeState {
  simulation: SimulationRuntimeState;
  cockpit: OperationsCockpitState;
}

export interface OperationsCockpitBlueprint {
  schemaVersion: 1;
  simulation: {
    initialTick: number;
    ticksPerDay: number;
    initialSpeed: SimSpeed;
    initialRunning: boolean;
  };
  room: {
    id: string;
    label: string;
    status: StatusLevel;
  };
  zone: {
    id: string;
    label: string;
    roomId: string;
  };
  batch: {
    id: string;
    roomId: string;
    zoneId: string;
    phase: string;
    cycleLengthDays: number;
    status: StatusLevel;
  };
  capacity: {
    canopyTables: CapacityCount;
    lightRails: CapacityCount;
    circulationFans: CapacityCount;
    sensorPoints: CapacityCount;
    exhaustFilters: CapacityCount;
    nutrientReservoirs: CapacityCount;
    controlCabinets: CapacityCount;
  };
  telemetryBase: {
    airTemperature: BlueprintMetric;
    relativeHumidity: BlueprintMetric;
    co2Index: BlueprintMetric;
    lightOutput: BlueprintMetric;
    irrigationIndex: BlueprintMetric;
    airflow: BlueprintMetric;
    nutrientReservoir: BlueprintMetric;
  };
  controls: CockpitControlState;
  batchStatus: {
    healthIndex: number;
    moistureBalance: number;
    yieldForecast: number;
    qualityEstimate: number;
  };
  energy: {
    powerNow: number;
    dailyEnergy: number;
    dailyCost: number;
    weeklyCost: number;
    efficiencyScore: number;
  };
  utilityStatus: {
    grid: BlueprintUtilityStatus;
    backupPower: BlueprintUtilityStatus;
    waterSupply: BlueprintUtilityStatus;
    network: BlueprintUtilityStatus;
  };
  eventLog: BlueprintEventLogEntry[];
}

export interface CapacityCount {
  online?: number;
  active?: number;
  total: number;
}

export interface BlueprintMetric {
  value: number;
  unit: string;
  reference: string;
  status: StatusLevel;
}

export interface BlueprintUtilityStatus {
  value: string;
  secondary?: string;
  status: StatusLevel;
}

export interface BlueprintEventLogEntry {
  day: number;
  tick: number;
  severity: EventSeverity;
  title: string;
  detail?: string;
}
