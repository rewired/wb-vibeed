import type {
  Id,
  OperatingModeClimate,
  OperatingModeIrrigation,
  OperatingModeLight,
  SimulationPhase,
  SimulationSpeed,
  TimelineEvent,
} from '@wb/shared';

export interface RuntimeState {
  simulation: SimulationState;
  company: CompanyState;
  structure: StructureState;
  room: RoomState;
  zone: ZoneState;
  batch: BatchState;
  economy: EconomyState;
  controls: OperatingControls;
  events: TimelineEvent[];
}

export interface SimulationState {
  day: number;
  tick: number;
  phase: SimulationPhase;
  speed: SimulationSpeed;
}

export interface CompanyState {
  id: Id;
  name: string;
}

export interface StructureState {
  id: Id;
  name: string;
}

export interface RoomState {
  id: Id;
  name: string;
  stability: number;
  lightStatus: number;
  temperatureStatus: number;
  humidityStatus: number;
  waterStatus: number;
  nutrientStatus: number;
}

export interface ZoneState {
  id: Id;
  name: string;
  roomId: Id;
}

export interface BatchState {
  id: Id;
  label: string;
  growth: number;
  stress: number;
  maturity: number;
  qualityPotential: number;
}

export interface EconomyState {
  energyCostTotal: number;
  operatingCostTotal: number;
  projectedProfit: number;
}

export interface OperatingControls {
  lightMode: OperatingModeLight;
  climateMode: OperatingModeClimate;
  irrigationMode: OperatingModeIrrigation;
}

export type EngineOperatingMode = 'Eco' | 'Balanced' | 'Push';
export type EngineBatchLifecycleState = 'active' | 'ready' | 'completed';
export type EngineWarningKey =
  | 'cycle-ready'
  | 'environment-drift'
  | 'high-stress'
  | 'low-vigor'
  | 'nutrient-reservoir-low';

export type EngineFeedbackCode =
  | 'light_under_target'
  | 'climate_drift'
  | 'irrigation_under_target'
  | 'nutrient_drift'
  | 'push_stress'
  | 'eco_slow_growth'
  | 'balanced_stable'
  | 'harvest_not_mature'
  | 'harvest_stress_too_high'
  | 'quality_pressure'
  | 'maturity_fast'
  | 'maturity_slow';

export type EngineFeedbackSeverity = 'info' | 'warning' | 'critical';
export type EngineFeedbackTarget = 'canopy' | 'lighting' | 'climate' | 'irrigation' | 'nutrient' | 'sensors';

export interface EngineFeedbackSignal {
  code: EngineFeedbackCode;
  severity: EngineFeedbackSeverity;
  priority: number;
  target?: EngineFeedbackTarget;
}

export interface RoomFeedbackSignals {
  primary: EngineFeedbackSignal;
  signals: EngineFeedbackSignal[];
}

export interface ResolvedActuatorTargets {
  light: number;
  climate: number;
  irrigation: number;
}

export interface RoomEnvironmentState {
  temperatureIndex: number;
  humidityIndex: number;
  co2Index: number;
  lightIndex: number;
  irrigationIndex: number;
  airflowIndex: number;
  nutrientReservoir: number;
}

export interface BatchCoreState {
  maturity: number;
  stress: number;
  vigor: number;
  outputPotential: number;
}

export interface BatchOutcomeAccumulators {
  elapsedTicks: number;
  warningTicks: number;
  energyKwh: number;
  operatingCost: number;
  manualInterventions: number;
  efficiencyScore: number;
}

export interface RoomEconomyState {
  powerNow: number;
  dailyEnergy: number;
  dailyCost: number;
}

export interface RoomSimulationClockState {
  tick: number;
  ticksPerDay: number;
  batchStartTick: number;
}

export interface RoomSimulationCoreState {
  simulation: RoomSimulationClockState;
  targets: ResolvedActuatorTargets;
  roomEnvironment: RoomEnvironmentState;
  batchCore: BatchCoreState;
  lifecycleState: EngineBatchLifecycleState;
  accumulators: BatchOutcomeAccumulators;
  baselinePowerNow: number;
  economy: RoomEconomyState;
  warnings: EngineWarningKey[];
}
