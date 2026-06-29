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
export type OperationalPhase = 'Seedling' | 'Vegetative' | 'Flowering' | 'Late Flower' | 'Harvest Ready' | 'Completed';
export type BatchLifecycleState = 'active' | 'ready' | 'completed';
export type RuntimeWarningKey =
  | 'cycle-ready'
  | 'high-stress'
  | 'low-vigor'
  | 'nutrient-reservoir-low';
export type SelectedRoomObject =
  | 'canopy'
  | 'lighting'
  | 'climate'
  | 'irrigation'
  | 'nutrient'
  | 'sensors'
  | 'exhaust';
export type TelemetryKey =
  | 'air-temperature'
  | 'relative-humidity'
  | 'co2-index'
  | 'light-output'
  | 'irrigation-index'
  | 'airflow'
  | 'nutrient-reservoir';
export type TelemetryTileMode = 'current' | 'trend';
export type TelemetryViewModes = Record<TelemetryKey, TelemetryTileMode>;
export type EventLogDrawerState = 'collapsed' | 'expanded';
export type ReportViewState =
  | { type: 'closed' }
  | { type: 'open'; reportKey: string };

export interface SimulationRuntimeState {
  isRunning: boolean;
  tick: number;
  speed: SimSpeed;
  ticksPerDay: number;
  initialTick: number;
}

export type OperationsCockpitControlSystem = 'light' | 'climate' | 'irrigation';

export type OperationsCockpitRuntimeAction =
  | { type: 'tick' }
  | { type: 'set-running'; isRunning: boolean }
  | { type: 'set-speed'; speed: SimSpeed }
  | {
      type: 'set-control-mode';
      system: OperationsCockpitControlSystem;
      mode: OperatingMode;
    }
  | {
      type: 'set-control-state';
      system: OperationsCockpitControlSystem;
      control: ControlState;
    }
  | {
      type: 'set-manual-value';
      system: OperationsCockpitControlSystem;
      value: number;
    }
  | { type: 'complete-batch' }
  | { type: 'start-next-batch' };

export interface OperationsControlConfig {
  mode: OperatingMode;
  control: ControlState;
  manualValue: number;
}

export type CockpitControlState = Record<OperationsCockpitControlSystem, OperationsControlConfig>;

export interface BatchCoreState {
  maturity: number;
  stress: number;
  vigor: number;
  outputPotential: number;
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
  manualValue: number;
  effectiveTarget: number;
  primaryTuning: {
    label: string;
    value: string | number;
    unit?: string;
  };
}

export interface TrendTileState {
  id: `${TelemetryKey}-trend`;
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

export interface WarningConditionState {
  key: RuntimeWarningKey;
  severity: 'warning';
  title: string;
  detail: string;
  object: SelectedRoomObject;
}

export interface BatchOutcomeAccumulators {
  elapsedTicks: number;
  warningTicks: number;
  energyKwh: number;
  operatingCost: number;
  manualInterventions: number;
  efficiencyScore: number;
}

export interface BatchReport {
  batchId: string;
  roomId: string;
  zoneId: string;
  completedDay: number;
  completedTick: number;
  batchDuration: number;
  finalMaturity: number;
  finalStress: number;
  finalVigor: number;
  finalOutputPotential: number;
  yieldEstimate: number;
  qualityEstimate: number;
  operatingCost: number;
  efficiency: number;
  warnings: number;
  finalStatus: StatusLevel;
  summary: string;
}

export interface BatchRuntimeSummaryState {
  batchDay: number;
  cycleLengthDays: number;
  startTick: number;
  cycleProgress: number;
  phase: OperationalPhase;
  lifecycleState: BatchLifecycleState;
  readyForReview: boolean;
  batchCore: BatchCoreState;
  accumulators: BatchOutcomeAccumulators;
  report?: BatchReport;
}

export interface RoomCapacityItemState {
  id: string;
  label: string;
  value: string;
  icon: string;
  active?: number;
  online?: number;
  total: number;
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
    batchId: string;
    phase: string;
    status: StatusLevel;
    activeView: '3d' | 'schematic';
    overlays: string[];
    capacity: RoomCapacityItemState[];
  };

  batchRuntime: BatchRuntimeSummaryState;
  batchStatus: ProgressTileState[];
  environmentalTelemetry: MetricTileState[];
  controls: ControlTileState[];
  telemetryTrends: TrendTileState[];
  eventLog: EventLogEntryState[];
  warningConditions: WarningConditionState[];

  energyCost: MetricTileState[];
  utilityStatus: UtilityStatusItemState[];
}

export interface OperationsCockpitRuntimeState {
  simulation: SimulationRuntimeState;
  cockpit: OperationsCockpitState;
  baseline: OperationsCockpitRuntimeBaseline;
  activeWarnings: RuntimeWarningKey[];
  completedBatchReports: BatchReport[];
}

export interface OperationsCockpitRuntimeBaseline {
  telemetry: {
    airTemperature: number;
    relativeHumidity: number;
    co2Index: number;
    lightOutput: number;
    irrigationIndex: number;
    airflow: number;
    nutrientReservoir: number;
  };
  energy: {
    powerNow: number;
  };
  batch: {
    cycleLengthDays: number;
    startTick: number;
  };
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
    cycleLengthDays: number;
    startTick: number;
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
  batchCore: BatchCoreState;
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
