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
export type SeverityLevel = 'info' | 'warning' | 'critical';
export type OperatingMode = 'eco' | 'balanced' | 'push';
export type ControlState = 'auto' | 'manual';

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
  };

  batchStatus: ProgressTileState[];
  environmentalTelemetry: MetricTileState[];
  controls: ControlTileState[];
  telemetryTrends: TrendTileState[];
  eventLog: EventLogEntryState[];

  energyCost: MetricTileState[];
  utilityStatus: UtilityStatusItemState[];
}
