import type {
  BatchLifecycleState,
  BatchReport,
  ControlState,
  ControlTileState,
  EventLogEntryState,
  MetricTileState,
  OperatingMode,
  OperationalPhase,
  OperationsCockpitControlSystem,
  OperationsCockpitRuntimeAction,
  OperationsCockpitRuntimeState,
  RuntimeWarningKey,
  StatusLevel,
  TrendTileState,
  UtilityStatusItemState,
  WarningConditionState,
} from './operations-cockpit-state-types';

const MAX_EVENT_LOG_ENTRIES = 20;
const COST_PER_KWH = 0.34;
const NUTRIENT_REVIEW_THRESHOLD = 45;

export function advanceOperationsCockpitRuntime(
  state: OperationsCockpitRuntimeState,
  action: OperationsCockpitRuntimeAction,
): OperationsCockpitRuntimeState {
  if (action.type === 'tick') {
    if (!state.simulation.isRunning) return state;

    return deriveOperationsCockpitRuntime({
      ...state,
      simulation: {
        ...state.simulation,
        tick: state.simulation.tick + 1,
      },
    });
  }

  if (action.type === 'complete-batch') {
    if (state.cockpit.batchRuntime.lifecycleState !== 'ready' || state.cockpit.batchRuntime.report) return state;

    const report = generateBatchReport(state);
    const event = batchCompletedEvent(state);

    return deriveOperationsCockpitRuntime({
      ...state,
      cockpit: {
        ...state.cockpit,
        batchRuntime: {
          ...state.cockpit.batchRuntime,
          lifecycleState: 'completed',
          readyForReview: false,
          report,
        },
        eventLog: [event, ...state.cockpit.eventLog].slice(0, MAX_EVENT_LOG_ENTRIES),
      },
    });
  }

  if (action.type === 'set-running') {
    if (state.simulation.isRunning === action.isRunning) return state;

    return {
      ...state,
      simulation: {
        ...state.simulation,
        isRunning: action.isRunning,
      },
    };
  }

  if (action.type === 'set-speed') {
    if (state.simulation.speed === action.speed) return state;

    return deriveOperationsCockpitRuntime({
      ...state,
      simulation: {
        ...state.simulation,
        speed: action.speed,
      },
    });
  }

  if (action.type === 'set-control-mode') {
    return applyControlChange(state, action.system, 'mode', action.mode);
  }

  return applyControlChange(state, action.system, 'control', action.control);
}

export function initializeOperationsCockpitRuntime(state: OperationsCockpitRuntimeState): OperationsCockpitRuntimeState {
  return deriveOperationsCockpitRuntime(state, { emitWarningEvents: false });
}

export function generateBatchReport(state: OperationsCockpitRuntimeState): BatchReport {
  const runtime = state.cockpit.batchRuntime;
  const warningCount = state.cockpit.warningConditions.length;
  const finalStatus = warningCount > 0 ? 'warning' : state.cockpit.roomOverview.status;
  const dailyEnergy = numericMetric(state.cockpit.energyCost, 'Daily Energy', 0);
  const dailyCost = numericMetric(state.cockpit.energyCost, 'Daily Cost', 0);

  return {
    batchId: state.cockpit.roomOverview.batchId,
    roomId: state.cockpit.roomOverview.roomId,
    zoneId: state.cockpit.roomOverview.zoneId,
    completedDay: runtime.currentDay,
    completedTick: state.simulation.tick,
    cycleLengthDays: runtime.cycleLengthDays,
    actualDays: runtime.currentDay,
    finalHealthIndex: numericMetric(state.cockpit.batchStatus, 'Batch Health Index', 0),
    finalMoistureBalance: numericMetric(state.cockpit.batchStatus, 'Moisture Balance', 0),
    finalQualityEstimate: numericMetric(state.cockpit.batchStatus, 'Quality Estimate', 0),
    finalYieldEstimate: numericMetric(state.cockpit.batchStatus, 'Yield Forecast', 0),
    totalEnergyKwh: round(dailyEnergy * runtime.currentDay, 1),
    totalCost: round(dailyCost * runtime.currentDay, 2),
    efficiencyScore: numericMetric(state.cockpit.energyCost, 'Efficiency', 0),
    warningCount,
    finalStatus,
    summary: batchReportSummary(runtime.currentDay, runtime.cycleLengthDays, warningCount),
  };
}

function applyControlChange(
  state: OperationsCockpitRuntimeState,
  system: OperationsCockpitControlSystem,
  target: 'mode' | 'control',
  value: OperatingMode | ControlState,
) {
  const controlId = controlIdForSystem(system);
  const control = state.cockpit.controls.find((item) => item.id === controlId);
  const currentValue = target === 'mode' ? control?.activeMode : control?.activeControl;

  if (!control || currentValue === value) return state;

  const controls = state.cockpit.controls.map((item) => {
    if (item.id !== controlId) return item;

    return target === 'mode'
      ? { ...item, activeMode: value as OperatingMode }
      : { ...item, activeControl: value as ControlState };
  });

  const event = controlChangeEvent(state, control.label, target, value);

  return deriveOperationsCockpitRuntime({
    ...state,
    cockpit: {
      ...state.cockpit,
      controls,
      eventLog: [event, ...state.cockpit.eventLog].slice(0, MAX_EVENT_LOG_ENTRIES),
    },
  });
}

function deriveOperationsCockpitRuntime(
  state: OperationsCockpitRuntimeState,
  options: { emitWarningEvents?: boolean } = {},
): OperationsCockpitRuntimeState {
  const day = dayFromTick(state.simulation.tick, state.simulation.ticksPerDay);
  const cycleProgress = cycleProgressFromDay(day, state.baseline.batch.cycleLengthDays);
  const lifecycleState = deriveBatchLifecycleState(state.cockpit.batchRuntime.lifecycleState, cycleProgress);
  const phase = lifecycleState === 'completed' ? 'Completed' : phaseFromCycleProgress(cycleProgress);
  const readyForReview = lifecycleState === 'ready';
  const batchRuntime = {
    currentDay: day,
    cycleLengthDays: state.baseline.batch.cycleLengthDays,
    cycleProgress,
    phase,
    lifecycleState,
    readyForReview,
    ...(state.cockpit.batchRuntime.report ? { report: state.cockpit.batchRuntime.report } : {}),
  };
  const controls = deriveControls(state.cockpit.controls);
  const metrics = deriveTelemetry({ ...state, cockpit: { ...state.cockpit, controls } });
  const warnings = deriveWarnings(state, metrics, cycleProgress, readyForReview);
  const warningKeys = warnings.map((warning) => warning.key);
  const roomStatus = deriveRoomStatus(state.cockpit.roomOverview.status, warnings);
  const powerNow = derivePowerNow({ ...state, cockpit: { ...state.cockpit, controls } });
  const dailyEnergy = round(powerNow * 24, 1);
  const dailyCost = round(dailyEnergy * COST_PER_KWH, 2);
  const utilityStatus = deriveUtilityStatus(state.cockpit.utilityStatus, warnings);
  const warningEvents = options.emitWarningEvents === false
    ? []
    : warnings
        .filter((warning) => !state.activeWarnings.includes(warning.key))
        .map((warning) => warningEvent(state, warning));
  const eventLog = [...warningEvents, ...state.cockpit.eventLog].slice(0, MAX_EVENT_LOG_ENTRIES);

  return {
    ...state,
    activeWarnings: warningKeys,
    cockpit: {
      ...state.cockpit,
      header: {
        ...state.cockpit.header,
        stats: state.cockpit.header.stats.map((stat) => {
          if (stat.label === 'Day') return { ...stat, value: day };
          if (stat.label === 'Tick') return { ...stat, value: state.simulation.tick };
          if (stat.label === 'Overall Status') return { ...stat, value: titleCase(roomStatus), status: roomStatus };
          if (stat.label === 'Facility Load') return { ...stat, value: powerNow };
          if (stat.label === 'Cost Today') return { ...stat, value: dailyCost };
          if (stat.label === 'Utility') return { ...stat, value: utilitySummary(utilityStatus), status: statusFromUtility(utilityStatus) };
          return stat;
        }),
      },
      roomOverview: {
        ...state.cockpit.roomOverview,
        phase,
        status: roomStatus,
      },
      batchRuntime,
      batchStatus: state.cockpit.batchStatus.map((item) => {
        if (item.id !== 'cycle-progress') return item;

        return {
          ...item,
          value: cycleProgress,
          secondary: lifecycleState === 'completed'
            ? `Day ${day} of ${state.baseline.batch.cycleLengthDays} / Completed`
            : readyForReview
            ? `Day ${day} of ${state.baseline.batch.cycleLengthDays} / Harvest Ready`
            : `Day ${day} of ${state.baseline.batch.cycleLengthDays}`,
          status: readyForReview ? 'warning' : roomStatus,
        };
      }),
      environmentalTelemetry: metrics,
      controls,
      telemetryTrends: deriveTrends(state.cockpit.telemetryTrends, metrics),
      energyCost: deriveEnergyCost(state.cockpit.energyCost, powerNow, dailyEnergy, dailyCost),
      utilityStatus,
      eventLog,
      warningConditions: warnings,
    },
  };
}

function deriveBatchLifecycleState(currentLifecycleState: BatchLifecycleState, cycleProgress: number): BatchLifecycleState {
  if (currentLifecycleState === 'completed') return 'completed';
  if (cycleProgress >= 100) return 'ready';
  return 'active';
}

function deriveTelemetry(state: OperationsCockpitRuntimeState): MetricTileState[] {
  const tick = elapsedTick(state);
  const light = controlByLabel(state.cockpit.controls, 'Light');
  const climate = controlByLabel(state.cockpit.controls, 'Climate');
  const irrigation = controlByLabel(state.cockpit.controls, 'Irrigation');
  const baseline = state.baseline.telemetry;

  const values: Record<string, number> = {
    'air-temperature': round(clamp(baseline.airTemperature + modeBias(light?.activeMode, 0.25) + wave(tick, 0.4, 16), 23.4, 25.8), 1),
    'relative-humidity': round(clamp(baseline.relativeHumidity + modeBias(irrigation?.activeMode, 1.2) + wave(tick, 1.8, 20, 4), 50, 64)),
    'co2-index': round(clamp(baseline.co2Index + wave(tick, 24, 17, 8), 1080, 1220)),
    'light-output': round(clamp(baseline.lightOutput + modeBias(light?.activeMode, 6) + wave(tick, 1.2, 18), 55, 88)),
    'irrigation-index': round(clamp(baseline.irrigationIndex + modeBias(irrigation?.activeMode, 5) + wave(tick, 1.5, 22, 6), 34, 62)),
    airflow: round(clamp(baseline.airflow + modeBias(climate?.activeMode, 4) + wave(tick, 1.4, 19, 2), 54, 82)),
    'nutrient-reservoir': round(clamp(baseline.nutrientReservoir - tick * 0.22 + wave(tick, 0.35, 28), 0, 100)),
  };

  return state.cockpit.environmentalTelemetry.map((item) => {
    const value = values[item.id];
    if (typeof value !== 'number') return item;
    const status: StatusLevel = item.id === 'nutrient-reservoir' && value <= NUTRIENT_REVIEW_THRESHOLD ? 'warning' : 'normal';
    const nextItem = {
      ...item,
      value,
      status,
    };

    return item.id === 'nutrient-reservoir'
      ? { ...nextItem, reference: `Review Threshold ${NUTRIENT_REVIEW_THRESHOLD} %` }
      : nextItem;
  });
}

function deriveWarnings(
  state: OperationsCockpitRuntimeState,
  metrics: MetricTileState[],
  cycleProgress: number,
  readyForReview: boolean,
): WarningConditionState[] {
  const day = dayFromTick(state.simulation.tick, state.simulation.ticksPerDay);
  const cycleLengthDays = state.baseline.batch.cycleLengthDays;
  const nutrientReservoir = numericMetric(metrics, 'Nutrient Reservoir', state.baseline.telemetry.nutrientReservoir);
  const warnings: WarningConditionState[] = [];

  if (day >= Math.max(1, cycleLengthDays - 15)) {
    warnings.push({
      key: 'filter-maintenance-due',
      severity: 'warning',
      title: 'Filter maintenance due.',
      detail: 'Exhaust / Filtration requires operational review.',
      object: 'exhaust',
    });
  }

  if (cycleProgress >= 70 && !readyForReview) {
    warnings.push({
      key: 'sensor-network-warning',
      severity: 'warning',
      title: 'Sensor network warning.',
      detail: 'Telemetry network requires review.',
      object: 'sensors',
    });
  }

  if (nutrientReservoir <= NUTRIENT_REVIEW_THRESHOLD) {
    warnings.push({
      key: 'nutrient-reservoir-low',
      severity: 'warning',
      title: 'Nutrient reservoir below threshold.',
      detail: 'Nutrient system requires review.',
      object: 'nutrient',
    });
  }

  if (readyForReview) {
    warnings.push({
      key: 'cycle-ready',
      severity: 'warning',
      title: 'Batch harvest-ready.',
      detail: 'Cycle progress reached 100%.',
      object: 'canopy',
    });
  }

  return warnings;
}

function deriveRoomStatus(currentStatus: StatusLevel, warnings: WarningConditionState[]): StatusLevel {
  if (currentStatus === 'critical') return 'critical';
  return warnings.length > 0 ? 'warning' : 'normal';
}

function deriveControls(controls: ControlTileState[]) {
  return controls.map((control) => {
    if (control.label === 'Light') {
      return {
        ...control,
        primaryTuning: { label: 'Target', value: targetFromMode(control.activeMode) },
      };
    }

    if (control.label === 'Climate') {
      return {
        ...control,
        primaryTuning: { label: 'Target Bias', value: targetFromMode(control.activeMode) },
      };
    }

    if (control.label === 'Irrigation') {
      return {
        ...control,
        primaryTuning: { label: 'Target Bias', value: targetFromMode(control.activeMode) },
      };
    }

    return control;
  });
}

function derivePowerNow(state: OperationsCockpitRuntimeState) {
  const tick = elapsedTick(state);
  const modeLoad = state.cockpit.controls.reduce((total, control) => total + modeBias(control.activeMode, 0.55), 0);
  const manualLoad = state.cockpit.controls.reduce((total, control) => total + (control.activeControl === 'Manual' ? 0.12 : 0), 0);

  return round(clamp(state.baseline.energy.powerNow + modeLoad + manualLoad + wave(tick, 0.35, 15), 14, 23), 1);
}

function deriveEnergyCost(items: MetricTileState[], powerNow: number, dailyEnergy: number, dailyCost: number) {
  return items.map((item) => {
    if (item.id === 'power-now') return { ...item, value: powerNow };
    if (item.id === 'daily-energy') return { ...item, value: dailyEnergy };
    if (item.id === 'daily-cost') return { ...item, value: dailyCost };
    if (item.id === 'weekly-cost') return { ...item, value: round(dailyCost * 7, 2) };
    return item;
  });
}

function deriveUtilityStatus(items: UtilityStatusItemState[], warnings: WarningConditionState[]): UtilityStatusItemState[] {
  const hasSensorWarning = warnings.some((warning) => warning.key === 'sensor-network-warning');

  return items.map((item) => {
    if (item.id !== 'network') return item;

    if (hasSensorWarning) {
      return { ...item, value: 'Review', secondary: 'Sensor network warning', status: 'warning' };
    }

    const { secondary: _secondary, ...networkStatus } = item;
    return { ...networkStatus, value: 'Connected', status: 'normal' };
  });
}

function deriveTrends(items: TrendTileState[], metrics: MetricTileState[]) {
  const metricValues: Record<string, number> = {
    'air-temperature-trend': numericMetric(metrics, 'Air Temperature', 24.6),
    'relative-humidity-trend': numericMetric(metrics, 'Relative Humidity', 58),
    'co2-index-trend': numericMetric(metrics, 'CO2 Index', 1150),
    'light-output-trend': numericMetric(metrics, 'Light Output', 72),
    'irrigation-index-trend': numericMetric(metrics, 'Irrigation Index', 46),
    'airflow-trend': numericMetric(metrics, 'Airflow', 68),
    'nutrient-reservoir-trend': numericMetric(metrics, 'Nutrient Reservoir', 79),
  };

  return items.map((item) => {
    const currentValue = metricValues[item.id];
    if (typeof currentValue !== 'number') return item;

    return {
      ...item,
      currentValue,
      points: [...item.points.slice(1), currentValue],
    };
  });
}

function controlChangeEvent(
  state: OperationsCockpitRuntimeState,
  systemLabel: string,
  target: 'mode' | 'control',
  value: string,
): EventLogEntryState {
  const day = dayFromTick(state.simulation.tick, state.simulation.ticksPerDay);
  const title = `${systemLabel} ${target} changed to ${value}.`;

  return {
    id: `local-${state.simulation.tick}-${slug(systemLabel)}-${target}-${slug(value)}-${state.cockpit.eventLog.length}`,
    time: clockFromTick(state.simulation.tick, state.simulation.ticksPerDay),
    day,
    tick: state.simulation.tick,
    severity: 'info',
    title,
    detail: 'Operator panel action.',
  };
}

function warningEvent(state: OperationsCockpitRuntimeState, warning: WarningConditionState): EventLogEntryState {
  const day = dayFromTick(state.simulation.tick, state.simulation.ticksPerDay);

  return {
    id: `warning-${state.simulation.tick}-${warning.key}`,
    time: clockFromTick(state.simulation.tick, state.simulation.ticksPerDay),
    day,
    tick: state.simulation.tick,
    severity: warning.severity,
    title: warning.title,
    detail: warning.detail,
  };
}

function batchCompletedEvent(state: OperationsCockpitRuntimeState): EventLogEntryState {
  const day = dayFromTick(state.simulation.tick, state.simulation.ticksPerDay);

  return {
    id: `batch-completed-${state.simulation.tick}-${state.cockpit.roomOverview.batchId}`,
    time: clockFromTick(state.simulation.tick, state.simulation.ticksPerDay),
    day,
    tick: state.simulation.tick,
    severity: 'info',
    title: 'Batch completed.',
    detail: 'Batch report generated.',
  };
}

function controlIdForSystem(system: OperationsCockpitControlSystem) {
  const ids: Record<OperationsCockpitControlSystem, string> = {
    light: 'light-control',
    climate: 'climate-control',
    irrigation: 'irrigation-control',
  };

  return ids[system];
}

function controlByLabel(items: ControlTileState[], label: string) {
  return items.find((item) => item.label === label);
}

function numericMetric(items: { label: string; value: string | number }[], label: string, fallback: number) {
  const value = items.find((item) => item.label === label)?.value;
  return typeof value === 'number' ? value : fallback;
}

function modeBias(mode: OperatingMode | undefined, amount: number) {
  if (mode === 'Eco') return -amount;
  if (mode === 'Push') return amount;
  return 0;
}

function wave(tick: number, amplitude: number, period: number, phase = 0) {
  return Math.sin((tick + phase) / period) * amplitude;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 0) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function dayFromTick(tick: number, ticksPerDay: number) {
  return Math.floor(tick / ticksPerDay) + 1;
}

function cycleProgressFromDay(day: number, cycleLengthDays: number) {
  return clamp(Math.round((day / cycleLengthDays) * 100), 0, 100);
}

function phaseFromCycleProgress(progress: number): OperationalPhase {
  if (progress < 15) return 'Seedling';
  if (progress < 45) return 'Vegetative';
  if (progress < 85) return 'Flowering';
  if (progress < 100) return 'Late Flower';
  return 'Harvest Ready';
}

function elapsedTick(state: OperationsCockpitRuntimeState) {
  return Math.max(0, state.simulation.tick - state.simulation.initialTick);
}

function clockFromTick(tick: number, ticksPerDay: number) {
  const minutesPerTick = Math.floor((24 * 60) / ticksPerDay);
  const minutes = (tick % ticksPerDay) * minutesPerTick;
  const hours = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${padTime(hours)}:${padTime(minute)}:00`;
}

function padTime(value: number) {
  return String(value).padStart(2, '0');
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function targetFromMode(mode: OperatingMode) {
  if (mode === 'Eco') return 'Eco';
  if (mode === 'Push') return 'Push';
  return 'Nominal';
}

function batchReportSummary(actualDays: number, cycleLengthDays: number, warningCount: number) {
  if (actualDays > cycleLengthDays) {
    return 'Batch completed after extended runtime. Review warning history before starting the next batch.';
  }

  if (warningCount > 0) {
    return 'Batch completed with warning conditions present at review time.';
  }

  return 'Batch completed with stable operating conditions and minor warnings.';
}

function titleCase(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function utilitySummary(items: UtilityStatusItemState[]) {
  const warning = items.find((item) => item.status !== 'normal');
  return warning ? titleCase(warning.status) : 'Normal';
}

function statusFromUtility(items: UtilityStatusItemState[]): StatusLevel {
  if (items.some((item) => item.status === 'critical')) return 'critical';
  if (items.some((item) => item.status === 'warning')) return 'warning';
  return 'normal';
}
