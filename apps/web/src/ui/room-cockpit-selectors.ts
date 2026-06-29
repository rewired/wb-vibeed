import { getModeTarget } from './operations-cockpit-runtime';
import { titleCase } from './room-cockpit-formatters';
import type {
  BatchLifecycleState,
  BatchReport,
  ControlTileState,
  EventLogEntryState,
  MetricTileState,
  OperatingMode,
  OperationsCockpitControlSystem,
  OperationsCockpitState,
  RoomCapacityItemState,
  SelectedRoomObject,
  StatusLevel,
  TelemetryKey,
  TrendTileState,
} from './operations-cockpit-state-types';

export interface RoomAssetModel {
  id: SelectedRoomObject;
  icon: string;
  name: string;
  secondary: string;
  status: string;
  statusShort: string;
  statusIcon: string;
  statusLevel: StatusLevel;
}

export interface InspectorHeaderModel {
  name: string;
  status: string;
  statusLevel: StatusLevel;
}

export interface BatchContextGroupModel {
  label: string;
  rows: [string, string][];
}

export interface BatchCycleSummaryModel {
  batchDay: number;
  cycleLengthDays: number;
  phase: string;
  progress: number;
  lifecycleState: BatchLifecycleState;
  readyForReview: boolean;
  status: StatusLevel;
}

interface ObjectStatusModel {
  label: string;
  shortLabel: string;
  icon: string;
  statusLevel: StatusLevel;
}

export function controlSystemFromId(controlId: string): OperationsCockpitControlSystem | undefined {
  const systems: Record<string, OperationsCockpitControlSystem> = {
    'light-control': 'light',
    'climate-control': 'climate',
    'irrigation-control': 'irrigation',
  };

  return systems[controlId];
}

export function roomAssets(state: OperationsCockpitState): readonly RoomAssetModel[] {
  const lighting = controlByLabel(state.controls, 'Light');
  const climate = controlByLabel(state.controls, 'Climate');
  const irrigation = controlByLabel(state.controls, 'Irrigation');
  const canopy = capacityById(state.roomOverview.capacity, 'canopy-tables');
  const sensors = capacityById(state.roomOverview.capacity, 'sensor-points');
  const canopyStatus = state.batchRuntime.readyForReview
    ? objectStatus('Harvest Ready', 'Ready', 'task_alt', 'warning')
    : objectStatus('Monitored', 'Watch', 'visibility', 'normal');
  const nutrientStatus = objectRuntimeStatus(state, 'nutrient', 'Online');
  const sensorStatus = objectRuntimeStatus(state, 'sensors', 'Online');
  const exhaustStatus = objectRuntimeStatus(state, 'exhaust', 'Online');

  return [
    {
      id: 'canopy',
      icon: 'yard',
      name: 'Canopy / Plants',
      secondary: `${canopy?.active ?? 0} tables active`,
      status: canopyStatus.label,
      statusShort: canopyStatus.shortLabel,
      statusIcon: canopyStatus.icon,
      statusLevel: canopyStatus.statusLevel,
    },
    {
      id: 'lighting',
      icon: 'lightbulb',
      name: 'Lighting System',
      secondary: controlMode(lighting),
      status: 'Online',
      statusShort: 'Online',
      statusIcon: 'check_circle',
      statusLevel: 'normal',
    },
    {
      id: 'climate',
      icon: 'air',
      name: 'Climate System',
      secondary: controlMode(climate),
      status: 'Online',
      statusShort: 'Online',
      statusIcon: 'check_circle',
      statusLevel: 'normal',
    },
    {
      id: 'irrigation',
      icon: 'water_drop',
      name: 'Irrigation System',
      secondary: controlMode(irrigation),
      status: 'Online',
      statusShort: 'Online',
      statusIcon: 'check_circle',
      statusLevel: 'normal',
    },
    {
      id: 'nutrient',
      icon: 'science',
      name: 'Nutrient System',
      secondary: 'Reservoir Connected',
      status: nutrientStatus.label,
      statusShort: nutrientStatus.shortLabel,
      statusIcon: nutrientStatus.icon,
      statusLevel: nutrientStatus.statusLevel,
    },
    {
      id: 'sensors',
      icon: 'sensors',
      name: 'Sensor Network',
      secondary: `${sensors?.online ?? 0} points online`,
      status: sensorStatus.label,
      statusShort: sensorStatus.shortLabel,
      statusIcon: sensorStatus.icon,
      statusLevel: sensorStatus.statusLevel,
    },
    {
      id: 'exhaust',
      icon: 'filter_alt',
      name: 'Exhaust / Filtration',
      secondary: exhaustStatus.statusLevel === 'warning' ? 'Maintenance due' : 'Maintenance current',
      status: exhaustStatus.label,
      statusShort: exhaustStatus.shortLabel,
      statusIcon: exhaustStatus.icon,
      statusLevel: exhaustStatus.statusLevel,
    },
  ] as const satisfies readonly RoomAssetModel[];
}

export function inspectorHeader(state: OperationsCockpitState, selectedObject: SelectedRoomObject): InspectorHeaderModel {
  const assets = roomAssets(state);
  const asset = assets.find((item) => item.id === selectedObject) ?? assets.find((item) => item.id === 'canopy');

  if (!asset) {
    return {
      name: 'Canopy / Plants',
      status: 'Monitored',
      statusLevel: 'normal',
    };
  }

  return {
    name: asset.name,
    status: asset.status,
    statusLevel: asset.statusLevel,
  };
}

export function batchContextGroups(state: OperationsCockpitState): BatchContextGroupModel[] {
  const core = state.batchRuntime.batchCore;

  return [
    {
      label: 'Batch Core',
      rows: [
        ['Maturity', `${Math.round(core.maturity)}/100`],
        ['Output Potential', `${Math.round(core.outputPotential)}/100`],
      ],
    },
    {
      label: 'Condition',
      rows: [
        ['Stress', `${Math.round(core.stress)}/100`],
        ['Vigor', `${Math.round(core.vigor)}/100`],
      ],
    },
  ];
}

export function batchCycleSummary(state: OperationsCockpitState): BatchCycleSummaryModel {
  const runtime = state.batchRuntime;
  const cycleProgress = state.batchStatus.find((item) => item.id === 'cycle-progress');

  return {
    batchDay: runtime.batchDay,
    cycleLengthDays: runtime.cycleLengthDays,
    phase: runtime.phase,
    progress: runtime.cycleProgress,
    lifecycleState: runtime.lifecycleState,
    readyForReview: runtime.readyForReview,
    status: cycleProgress?.status ?? state.roomOverview.status,
  };
}

export function lifecycleStateLabel(state: BatchLifecycleState): string {
  const labels: Record<BatchLifecycleState, string> = {
    active: 'Active',
    ready: 'Harvest Ready',
    completed: 'Completed',
  };

  return labels[state];
}

export function lifecycleStatusLevel(state: BatchLifecycleState, report?: BatchReport): StatusLevel {
  if (state === 'ready') return 'warning';
  if (state === 'completed') return report?.finalStatus ?? 'normal';
  return 'normal';
}

export function reportKey(report: BatchReport): string {
  return `${report.batchId}-${report.completedTick}`;
}

export function reportByKey(reports: readonly BatchReport[], key: string): BatchReport | undefined {
  return reports.find((report) => reportKey(report) === key);
}

export function metricById(items: readonly MetricTileState[], id: TelemetryKey): MetricTileState | undefined {
  return items.find((item) => item.id === id);
}

export function capacityById(items: readonly RoomCapacityItemState[], id: string): RoomCapacityItemState | undefined {
  return items.find((item) => item.id === id);
}

export function lastEventForObject(
  entries: readonly EventLogEntryState[],
  selectedObject: SelectedRoomObject,
  fallback: string,
): string {
  const needles: Record<SelectedRoomObject, string[]> = {
    canopy: ['canopy', 'table'],
    lighting: ['light'],
    climate: ['climate', 'humidity', 'airflow'],
    irrigation: ['irrigation'],
    nutrient: ['nutrient', 'reservoir'],
    sensors: ['sensor', 'network', 'co2'],
    exhaust: ['filter', 'exhaust', 'filtration'],
  };
  const entry = entries.find((item) => {
    const text = `${item.title} ${item.detail ?? ''}`.toLowerCase();
    return needles[selectedObject].some((needle) => text.includes(needle));
  });

  return entry?.title.replace(/\.$/, '') ?? fallback;
}

export function statusIcon(status: StatusLevel): string {
  const icons: Record<StatusLevel, string> = {
    normal: 'check_circle',
    warning: 'warning',
    critical: 'error',
  };
  return icons[status];
}

export function statusShortLabel(status: StatusLevel): string {
  const labels: Record<StatusLevel, string> = {
    normal: 'Online',
    warning: 'Warn',
    critical: 'Critical',
  };
  return labels[status];
}

export function objectRuntimeStatus(
  state: OperationsCockpitState,
  object: SelectedRoomObject,
  normalLabel: string,
): ObjectStatusModel {
  const warning = state.warningConditions.find((item) => item.object === object);

  if (!warning) {
    return objectStatus(normalLabel, statusShortLabel('normal'), statusIcon('normal'), 'normal');
  }

  if (warning.key === 'cycle-ready') {
    return objectStatus('Harvest Ready', 'Ready', 'task_alt', 'warning');
  }

  return objectStatus('Warning', statusShortLabel('warning'), statusIcon('warning'), 'warning');
}

export function objectStatus(label: string, shortLabel: string, icon: string, statusLevel: StatusLevel): ObjectStatusModel {
  return { label, shortLabel, icon, statusLevel };
}

export function trendIdForMetric(id: TelemetryKey): TrendTileState['id'] {
  return `${id}-trend`;
}

export function isTelemetryKey(id: string): id is TelemetryKey {
  return (
    id === 'air-temperature'
    || id === 'relative-humidity'
    || id === 'co2-index'
    || id === 'light-output'
    || id === 'irrigation-index'
    || id === 'airflow'
    || id === 'nutrient-reservoir'
  );
}

export function controlByLabel(items: readonly ControlTileState[], label: string): ControlTileState | undefined {
  return items.find((item) => item.label === label);
}

export function controlMode(item?: ControlTileState): string {
  if (!item) return 'Balanced / Auto';
  return `${titleCase(item.activeMode)} / ${titleCase(item.activeControl)}`;
}

export function modeTargetLabel(mode: OperatingMode): number {
  return getModeTarget(mode);
}

export function navIcon(item: string): string {
  const icons: Record<string, string> = {
    Cockpit: 'dashboard',
    Rooms: 'home_work',
    Schedule: 'calendar_month',
    History: 'history',
    Maintenance: 'build',
    Settings: 'settings',
  };
  return icons[item] ?? 'dashboard';
}

export function headerStatIcon(label: string): string | undefined {
  const icons: Record<string, string> = {
    Day: 'calendar_today',
    Tick: 'timer',
    'Overall Status': 'check_circle',
    'Facility Load': 'bolt',
    'Cost Today': 'payments',
    Utility: 'electrical_services',
  };
  return icons[label];
}

export function severityIcon(severity: EventLogEntryState['severity'] | 'maintenance'): string {
  const icons: Record<string, string> = {
    info: 'info',
    warning: 'warning',
    critical: 'error',
    maintenance: 'build',
  };
  return icons[severity] ?? 'info';
}
