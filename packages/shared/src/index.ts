export type Id = string;

export type SimulationPhase = 'setup' | 'running' | 'harvest-ready' | 'completed';
export type SimulationSpeed = 'paused' | 'step' | 'normal' | 'fast';

export type OperatingModeLight = 'eco' | 'balanced' | 'push';
export type OperatingModeClimate = 'eco' | 'stable' | 'aggressive';
export type OperatingModeIrrigation = 'conserve' | 'balanced' | 'saturate';

export interface AlertMessage {
  id: Id;
  severity: 'info' | 'warning' | 'critical';
  label: string;
  explanation: string;
}

export interface TimelineEvent {
  tick: number;
  label: string;
}
