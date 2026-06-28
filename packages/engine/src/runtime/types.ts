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
