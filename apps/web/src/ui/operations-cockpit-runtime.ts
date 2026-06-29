import type {
  ActuatorTargetState,
  BatchCoreState,
  BatchLifecycleState,
  BatchOutcomeAccumulators,
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
  ProgressTileState,
  RoomEnvironmentState,
  RuntimeWarningKey,
  StatusLevel,
  TrendTileState,
  UtilityStatusItemState,
  WarningConditionState,
} from './operations-cockpit-state-types';

const MAX_EVENT_LOG_ENTRIES = 20;
const COST_PER_KWH = 0.34;
const NUTRIENT_REVIEW_THRESHOLD = 20;
const BASE_YIELD_UNITS = 480;
const IDEAL_ENVIRONMENT_INDEX = 65;
const ENVIRONMENT_RATES = {
  lightIndex: 0.35,
  airflowIndex: 0.22,
  irrigationIndex: 0.18,
  temperatureIndex: 0.08,
  humidityIndex: 0.07,
  co2Index: 0.05,
} as const satisfies Record<Exclude<keyof RoomEnvironmentState, 'nutrientReservoir'>, number>;
const INITIAL_BATCH_CORE: BatchCoreState = {
  maturity: 0,
  stress: 10,
  vigor: 70,
  outputPotential: 0,
};

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
    }, { advanceBatchCore: true, advanceRoomEnvironment: true, accumulateBatchTick: true });
  }

  if (action.type === 'complete-batch') {
    if (state.cockpit.batchRuntime.lifecycleState !== 'ready' || state.cockpit.batchRuntime.report) return state;

    const report = generateBatchReport(state);
    const event = batchCompletedEvent(state, report);

    return deriveOperationsCockpitRuntime({
      ...state,
      completedBatchReports: archiveCompletedReport(state.completedBatchReports, report),
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

  if (action.type === 'start-next-batch') {
    const report = state.cockpit.batchRuntime.report;

    if (state.cockpit.batchRuntime.lifecycleState !== 'completed' || !report) return state;

    const nextBatchId = incrementBatchId(state.cockpit.roomOverview.batchId);
    const event = batchStartedEvent(state, nextBatchId);

    return deriveOperationsCockpitRuntime({
      ...state,
      baseline: {
        ...state.baseline,
        batch: {
          ...state.baseline.batch,
          startTick: state.simulation.tick,
        },
      },
      completedBatchReports: archiveCompletedReport(state.completedBatchReports, report),
      activeWarnings: state.activeWarnings.filter((warning) => warning === 'nutrient-reservoir-low'),
      cockpit: {
        ...state.cockpit,
        roomOverview: {
          ...state.cockpit.roomOverview,
          batchId: nextBatchId,
        },
        batchRuntime: {
          batchDay: 1,
          cycleLengthDays: state.cockpit.batchRuntime.cycleLengthDays,
          startTick: state.simulation.tick,
          cycleProgress: 0,
          phase: 'Seedling',
          lifecycleState: 'active',
          readyForReview: false,
          batchCore: INITIAL_BATCH_CORE,
          accumulators: createInitialBatchOutcomeAccumulators(),
        },
        batchStatus: resetBatchStatus(state.cockpit.batchStatus),
        eventLog: [event, ...state.cockpit.eventLog].slice(0, MAX_EVENT_LOG_ENTRIES),
      },
    }, { emitWarningEvents: false });
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

  if (action.type === 'set-control-state') {
    return applyControlChange(state, action.system, 'control', action.control);
  }

  return applyManualValueChange(state, action.system, action.value);
}

export function initializeOperationsCockpitRuntime(state: OperationsCockpitRuntimeState): OperationsCockpitRuntimeState {
  return deriveOperationsCockpitRuntime(state, { emitWarningEvents: false });
}

export function createInitialBatchOutcomeAccumulators(): BatchOutcomeAccumulators {
  return {
    elapsedTicks: 0,
    warningTicks: 0,
    energyKwh: 0,
    operatingCost: 0,
    manualInterventions: 0,
    efficiencyScore: 100,
  };
}

export function generateBatchReport(state: OperationsCockpitRuntimeState): BatchReport {
  const batchCore = state.cockpit.batchRuntime.batchCore;
  const accumulators = state.cockpit.batchRuntime.accumulators;
  const completedDay = deriveGlobalDay(state.simulation.tick, state.simulation.ticksPerDay);
  const batchDuration = deriveBatchElapsedTicks(state.simulation.tick, state.baseline.batch.startTick);
  const warningCount = state.cockpit.warningConditions.length;
  const finalStatus = deriveRoomStatus(state.cockpit.warningConditions, batchCore, state.roomEnvironment);
  const qualityEstimate = clamp(Math.round(batchCore.vigor * 0.7 + (100 - batchCore.stress) * 0.3), 0, 100);
  const yieldEstimate = Math.round(BASE_YIELD_UNITS * (0.5 + batchCore.outputPotential / 150));
  const efficiency = deriveEfficiencyScore(batchCore.outputPotential, accumulators.operatingCost);

  return {
    batchId: state.cockpit.roomOverview.batchId,
    roomId: state.cockpit.roomOverview.roomId,
    zoneId: state.cockpit.roomOverview.zoneId,
    completedDay,
    completedTick: state.simulation.tick,
    batchDuration,
    finalMaturity: round(batchCore.maturity, 1),
    finalStress: round(batchCore.stress, 1),
    finalVigor: round(batchCore.vigor, 1),
    finalOutputPotential: round(batchCore.outputPotential, 1),
    yieldEstimate,
    qualityEstimate,
    operatingCost: round(accumulators.operatingCost, 2),
    efficiency,
    warnings: warningCount,
    finalStatus,
    summary: batchReportSummary(batchCore, efficiency, warningCount),
  };
}

export function getModeTarget(mode: OperatingMode): number {
  switch (mode) {
    case 'Eco':
      return 40;
    case 'Balanced':
      return 65;
    case 'Push':
      return 85;
  }
}

export function getEffectiveTarget(control: {
  mode: OperatingMode;
  control: ControlState;
  manualValue: number;
}): number {
  return control.control === 'Manual'
    ? clamp(control.manualValue, 0, 100)
    : getModeTarget(control.mode);
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
  const accumulators = shouldUpdateBatchAccumulators(state.cockpit.batchRuntime.lifecycleState)
    ? incrementManualInterventions(state.cockpit.batchRuntime.accumulators)
    : state.cockpit.batchRuntime.accumulators;

  return deriveOperationsCockpitRuntime({
    ...state,
    cockpit: {
      ...state.cockpit,
      batchRuntime: {
        ...state.cockpit.batchRuntime,
        accumulators,
      },
      controls,
      eventLog: [event, ...state.cockpit.eventLog].slice(0, MAX_EVENT_LOG_ENTRIES),
    },
  });
}

function applyManualValueChange(
  state: OperationsCockpitRuntimeState,
  system: OperationsCockpitControlSystem,
  value: number,
) {
  const controlId = controlIdForSystem(system);
  const control = state.cockpit.controls.find((item) => item.id === controlId);
  const nextValue = clamp(Math.round(value), 0, 100);

  if (!control || control.manualValue === nextValue) return state;

  const previousBucket = Math.floor(control.manualValue / 5);
  const nextBucket = Math.floor(nextValue / 5);
  const shouldLog = previousBucket !== nextBucket;
  const controls = state.cockpit.controls.map((item) => (
    item.id === controlId ? { ...item, manualValue: nextValue } : item
  ));
  const accumulators = shouldLog && shouldUpdateBatchAccumulators(state.cockpit.batchRuntime.lifecycleState)
    ? incrementManualInterventions(state.cockpit.batchRuntime.accumulators)
    : state.cockpit.batchRuntime.accumulators;
  const eventLog = shouldLog
    ? [manualValueEvent(state, control.label, nextValue), ...state.cockpit.eventLog].slice(0, MAX_EVENT_LOG_ENTRIES)
    : state.cockpit.eventLog;

  return deriveOperationsCockpitRuntime({
    ...state,
    cockpit: {
      ...state.cockpit,
      batchRuntime: {
        ...state.cockpit.batchRuntime,
        accumulators,
      },
      controls,
      eventLog,
    },
  });
}

function deriveOperationsCockpitRuntime(
  state: OperationsCockpitRuntimeState,
  options: {
    emitWarningEvents?: boolean;
    advanceBatchCore?: boolean;
    advanceRoomEnvironment?: boolean;
    accumulateBatchTick?: boolean;
  } = {},
): OperationsCockpitRuntimeState {
  const globalDay = deriveGlobalDay(state.simulation.tick, state.simulation.ticksPerDay);
  const batchDay = deriveBatchDay(state.simulation.tick, state.baseline.batch.startTick, state.simulation.ticksPerDay);
  const controls = deriveControls(state.cockpit.controls);
  const actuatorTargets = deriveActuatorTargets(controls);
  const roomEnvironment = options.advanceRoomEnvironment
    ? advanceRoomEnvironment(state.roomEnvironment, actuatorTargets, state.simulation.tick)
    : state.roomEnvironment;
  const environmentDeviation = deriveEnvironmentDeviation(roomEnvironment);
  const previousLifecycleState = state.cockpit.batchRuntime.lifecycleState;
  const batchCore = options.advanceBatchCore && shouldUpdateBatchAccumulators(previousLifecycleState)
    ? advanceBatchCore(state.cockpit.batchRuntime.batchCore, roomEnvironment)
    : state.cockpit.batchRuntime.batchCore;
  const lifecycleState = deriveBatchLifecycleState(previousLifecycleState, batchCore.maturity);
  const readyForReview = lifecycleState === 'ready';
  const phase = lifecycleState === 'completed' ? 'Completed' : deriveOperationalPhase(batchCore.maturity);
  const metrics = deriveTelemetry(state, roomEnvironment, actuatorTargets);
  const warnings = deriveWarnings(roomEnvironment, environmentDeviation, batchCore, readyForReview);
  const warningKeys = warnings.map((warning) => warning.key);
  const roomStatus = deriveRoomStatus(warnings, batchCore, roomEnvironment);
  const powerNow = derivePowerNow(state, actuatorTargets, environmentDeviation);
  const dailyEnergy = round(powerNow * 24, 1);
  const dailyCost = round(dailyEnergy * COST_PER_KWH, 2);
  const accumulators = options.accumulateBatchTick && shouldUpdateBatchAccumulators(lifecycleState)
    ? accumulateBatchTick({
        accumulators: state.cockpit.batchRuntime.accumulators,
        hasWarnings: warnings.length > 0,
        powerNow,
        dailyCost,
        ticksPerDay: state.simulation.ticksPerDay,
        outputPotential: batchCore.outputPotential,
      })
    : state.cockpit.batchRuntime.accumulators;
  const batchRuntime = {
    batchDay,
    cycleLengthDays: state.cockpit.batchRuntime.cycleLengthDays,
    startTick: state.baseline.batch.startTick,
    cycleProgress: deriveCycleProgress(batchCore.maturity),
    phase,
    lifecycleState,
    readyForReview,
    batchCore,
    accumulators,
    ...(state.cockpit.batchRuntime.report ? { report: state.cockpit.batchRuntime.report } : {}),
  };
  const utilityStatus = deriveUtilityStatus(state.cockpit.utilityStatus, warnings);
  const warningEvents = options.emitWarningEvents === false
    ? []
    : warnings
        .filter((warning) => !state.activeWarnings.includes(warning.key))
        .map((warning) => warningEvent(state, warning));
  const eventLog = [...warningEvents, ...state.cockpit.eventLog].slice(0, MAX_EVENT_LOG_ENTRIES);

  return {
    ...state,
    roomEnvironment,
    activeWarnings: warningKeys,
    cockpit: {
      ...state.cockpit,
      header: {
        ...state.cockpit.header,
        stats: state.cockpit.header.stats.map((stat) => {
          if (stat.label === 'Day') return { ...stat, value: globalDay };
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
      batchStatus: deriveBatchStatus(state.cockpit.batchStatus, batchRuntime, roomStatus),
      environmentalTelemetry: metrics,
      controls,
      telemetryTrends: deriveTrends(state.cockpit.telemetryTrends, metrics),
      energyCost: deriveEnergyCost(state.cockpit.energyCost, powerNow, dailyEnergy, dailyCost, accumulators.efficiencyScore),
      utilityStatus,
      eventLog,
      warningConditions: warnings,
    },
  };
}

export function deriveActuatorTargets(controls: ControlTileState[]): ActuatorTargetState {
  return {
    light: effectiveTargetByLabel(controls, 'Light'),
    climate: effectiveTargetByLabel(controls, 'Climate'),
    irrigation: effectiveTargetByLabel(controls, 'Irrigation'),
  };
}

function deriveEnvironmentTargets(targets: ActuatorTargetState, tick: number): RoomEnvironmentState {
  return {
    lightIndex: targets.light,
    airflowIndex: targets.climate,
    irrigationIndex: targets.irrigation,
    temperatureIndex: 50 + targets.light * 0.25 - targets.climate * 0.18,
    humidityIndex: 45 + targets.irrigation * 0.22 - targets.climate * 0.12,
    co2Index: 60 + wave(tick, 4, 19),
    nutrientReservoir: 100,
  };
}

function advanceRoomEnvironment(
  current: RoomEnvironmentState,
  targets: ActuatorTargetState,
  tick: number,
): RoomEnvironmentState {
  const targetEnvironment = deriveEnvironmentTargets(targets, tick);
  const nutrientDrain = 0.025 + targets.irrigation * 0.001;

  return {
    temperatureIndex: clamp(approach(current.temperatureIndex, targetEnvironment.temperatureIndex, ENVIRONMENT_RATES.temperatureIndex), 0, 100),
    humidityIndex: clamp(approach(current.humidityIndex, targetEnvironment.humidityIndex, ENVIRONMENT_RATES.humidityIndex), 0, 100),
    co2Index: clamp(approach(current.co2Index, targetEnvironment.co2Index, ENVIRONMENT_RATES.co2Index), 0, 100),
    lightIndex: clamp(approach(current.lightIndex, targetEnvironment.lightIndex, ENVIRONMENT_RATES.lightIndex), 0, 100),
    irrigationIndex: clamp(approach(current.irrigationIndex, targetEnvironment.irrigationIndex, ENVIRONMENT_RATES.irrigationIndex), 0, 100),
    airflowIndex: clamp(approach(current.airflowIndex, targetEnvironment.airflowIndex, ENVIRONMENT_RATES.airflowIndex), 0, 100),
    nutrientReservoir: clamp(current.nutrientReservoir - nutrientDrain, 0, 100),
  };
}

export function deriveEnvironmentDeviation(environment: RoomEnvironmentState): number {
  return (
    distanceFromIdeal(environment.temperatureIndex, IDEAL_ENVIRONMENT_INDEX) * 0.20
    + distanceFromIdeal(environment.humidityIndex, IDEAL_ENVIRONMENT_INDEX) * 0.18
    + distanceFromIdeal(environment.lightIndex, IDEAL_ENVIRONMENT_INDEX) * 0.20
    + distanceFromIdeal(environment.irrigationIndex, IDEAL_ENVIRONMENT_INDEX) * 0.18
    + distanceFromIdeal(environment.airflowIndex, IDEAL_ENVIRONMENT_INDEX) * 0.14
    + distanceFromIdeal(environment.co2Index, IDEAL_ENVIRONMENT_INDEX) * 0.10
  );
}

function advanceBatchCore(batchCore: BatchCoreState, roomEnvironment: RoomEnvironmentState): BatchCoreState {
  const environmentDeviation = deriveEnvironmentDeviation(roomEnvironment);
  const stability = clamp(100 - environmentDeviation, 0, 100);
  const operatingPressure = (
    roomEnvironment.lightIndex
    + roomEnvironment.airflowIndex
    + roomEnvironment.irrigationIndex
  ) / 3;
  const stress = clamp(
    batchCore.stress
      + environmentDeviation * 0.025
      + Math.max(0, operatingPressure - 75) * 0.02
      - 0.16,
    0,
    100,
  );
  const vigor = clamp(
    batchCore.vigor
      + (stability - 60) * 0.02
      - stress * 0.006,
    0,
    100,
  );
  const outputPotential = clamp(
    batchCore.outputPotential
      + vigor * 0.01
      + Math.max(0, operatingPressure - 55) * 0.01
      - stress * 0.008,
    0,
    100,
  );

  return {
    maturity: clamp(batchCore.maturity + 0.22 + operatingPressure * 0.004, 0, 100),
    stress,
    vigor,
    outputPotential,
  };
}

function deriveBatchLifecycleState(currentLifecycleState: BatchLifecycleState, maturity: number): BatchLifecycleState {
  if (currentLifecycleState === 'completed') return 'completed';
  if (maturity >= 100) return 'ready';
  return 'active';
}

function resetBatchStatus(items: ProgressTileState[]): ProgressTileState[] {
  return items.map((item) => {
    if (item.id === 'cycle-progress') {
      return { ...item, value: 0, secondary: 'Batch Day 1 / Seedling', status: 'normal' };
    }

    if (item.id === 'maturity') return { ...item, value: INITIAL_BATCH_CORE.maturity, status: 'normal' };
    if (item.id === 'stress') return { ...item, value: INITIAL_BATCH_CORE.stress, status: 'normal' };
    if (item.id === 'vigor') return { ...item, value: INITIAL_BATCH_CORE.vigor, status: 'normal' };
    if (item.id === 'output-potential') return { ...item, value: INITIAL_BATCH_CORE.outputPotential, status: 'normal' };

    return { ...item, status: 'normal' };
  });
}

function deriveBatchStatus(
  items: ProgressTileState[],
  runtime: {
    batchDay: number;
    cycleLengthDays: number;
    cycleProgress: number;
    phase: OperationalPhase;
    lifecycleState: BatchLifecycleState;
    readyForReview: boolean;
    batchCore: BatchCoreState;
  },
  roomStatus: StatusLevel,
): ProgressTileState[] {
  return items.map((item) => {
    if (item.id === 'cycle-progress') {
      return {
        ...item,
        value: runtime.cycleProgress,
        secondary: runtime.lifecycleState === 'completed'
          ? `Batch Day ${runtime.batchDay} / Completed`
          : runtime.readyForReview
          ? `Batch Day ${runtime.batchDay} / Harvest Ready`
          : `Batch Day ${runtime.batchDay} / ${runtime.phase}`,
        status: runtime.readyForReview ? 'warning' : roomStatus,
      };
    }

    if (item.id === 'maturity') return { ...item, value: round(runtime.batchCore.maturity), status: runtime.readyForReview ? 'warning' : 'normal' };
    if (item.id === 'stress') return { ...item, value: round(runtime.batchCore.stress), status: runtime.batchCore.stress >= 70 ? 'warning' : 'normal' };
    if (item.id === 'vigor') return { ...item, value: round(runtime.batchCore.vigor), status: runtime.batchCore.vigor <= 40 ? 'warning' : 'normal' };
    if (item.id === 'output-potential') return { ...item, value: round(runtime.batchCore.outputPotential), status: 'normal' };

    return item;
  });
}

function shouldUpdateBatchAccumulators(lifecycleState: BatchLifecycleState) {
  return lifecycleState === 'active' || lifecycleState === 'ready';
}

function incrementManualInterventions(accumulators: BatchOutcomeAccumulators): BatchOutcomeAccumulators {
  return {
    ...accumulators,
    manualInterventions: accumulators.manualInterventions + 1,
  };
}

function accumulateBatchTick({
  accumulators,
  hasWarnings,
  powerNow,
  dailyCost,
  ticksPerDay,
  outputPotential,
}: {
  accumulators: BatchOutcomeAccumulators;
  hasWarnings: boolean;
  powerNow: number;
  dailyCost: number;
  ticksPerDay: number;
  outputPotential: number;
}): BatchOutcomeAccumulators {
  const elapsedTicks = accumulators.elapsedTicks + 1;
  const warningTicks = accumulators.warningTicks + (hasWarnings ? 1 : 0);
  const energyKwh = round(accumulators.energyKwh + powerNow / ticksPerDay, 4);
  const operatingCost = round(accumulators.operatingCost + dailyCost / ticksPerDay, 4);
  const efficiencyScore = deriveEfficiencyScore(outputPotential, operatingCost);

  return {
    ...accumulators,
    elapsedTicks,
    warningTicks,
    energyKwh,
    operatingCost,
    efficiencyScore,
  };
}

function deriveTelemetry(
  state: OperationsCockpitRuntimeState,
  roomEnvironment: RoomEnvironmentState,
  actuatorTargets: ActuatorTargetState,
): MetricTileState[] {
  const values: Record<string, number> = {
    'air-temperature': round(20 + roomEnvironment.temperatureIndex * 0.08, 1),
    'relative-humidity': round(roomEnvironment.humidityIndex),
    'co2-index': round(800 + roomEnvironment.co2Index * 6),
    'light-output': round(roomEnvironment.lightIndex),
    'irrigation-index': round(roomEnvironment.irrigationIndex),
    airflow: round(roomEnvironment.airflowIndex),
    'nutrient-reservoir': round(roomEnvironment.nutrientReservoir),
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

    if (item.id === 'air-temperature') return { ...nextItem, reference: 'Abstract room index' };
    if (item.id === 'relative-humidity') return { ...nextItem, reference: 'Abstract room index' };
    if (item.id === 'co2-index') return { ...nextItem, reference: 'Abstract CO2 index' };
    if (item.id === 'light-output') return { ...nextItem, reference: `Target ${actuatorTargets.light} %` };
    if (item.id === 'airflow') return { ...nextItem, reference: `Target ${actuatorTargets.climate} %` };
    if (item.id === 'irrigation-index') return { ...nextItem, reference: `Target ${actuatorTargets.irrigation} %` };

    return item.id === 'nutrient-reservoir'
      ? { ...nextItem, reference: `Low Threshold ${NUTRIENT_REVIEW_THRESHOLD} %` }
      : nextItem;
  });
}

function deriveWarnings(
  roomEnvironment: RoomEnvironmentState,
  environmentDeviation: number,
  batchCore: BatchCoreState,
  readyForReview: boolean,
): WarningConditionState[] {
  const warnings: WarningConditionState[] = [];

  if (batchCore.stress >= 70) {
    warnings.push({
      key: 'high-stress',
      severity: 'warning',
      title: 'High stress.',
      detail: `Batch stress is ${round(batchCore.stress)} / 100.`,
      object: 'canopy',
    });
  }

  if (batchCore.vigor <= 40) {
    warnings.push({
      key: 'low-vigor',
      severity: 'warning',
      title: 'Low vigor.',
      detail: `Batch vigor is ${round(batchCore.vigor)} / 100.`,
      object: 'canopy',
    });
  }

  if (environmentDeviation >= 35) {
    warnings.push({
      key: 'environment-drift',
      severity: 'warning',
      title: 'Environment drift.',
      detail: `Room environment deviation is ${round(environmentDeviation)} / 100.`,
      object: 'sensors',
    });
  }

  if (roomEnvironment.nutrientReservoir <= NUTRIENT_REVIEW_THRESHOLD) {
    warnings.push({
      key: 'nutrient-reservoir-low',
      severity: 'warning',
      title: 'Nutrient reservoir low.',
      detail: 'Reservoir level is below the operating threshold.',
      object: 'nutrient',
    });
  }

  if (readyForReview) {
    warnings.push({
      key: 'cycle-ready',
      severity: 'warning',
      title: 'Batch harvest-ready.',
      detail: 'Batch maturity has reached 100 / 100.',
      object: 'canopy',
    });
  }

  return warnings;
}

function deriveRoomStatus(
  warnings: WarningConditionState[],
  batchCore: BatchCoreState,
  roomEnvironment: RoomEnvironmentState,
): StatusLevel {
  if (batchCore.stress >= 90 || batchCore.vigor <= 20 || roomEnvironment.nutrientReservoir <= 5) return 'critical';
  return warnings.length > 0 ? 'warning' : 'normal';
}

function deriveControls(controls: ControlTileState[]) {
  return controls.map((control) => {
    const effectiveTarget = getEffectiveTarget({
      mode: control.activeMode,
      control: control.activeControl,
      manualValue: control.manualValue,
    });

    return {
      ...control,
      effectiveTarget,
      primaryTuning: {
        label: effectiveLabel(control.label),
        value: effectiveTarget,
        unit: '%',
      },
    };
  });
}

function derivePowerNow(
  state: OperationsCockpitRuntimeState,
  actuatorTargets: ActuatorTargetState,
  environmentDeviation: number,
) {
  const targetLoad =
    actuatorTargets.light * 0.08
    + actuatorTargets.climate * 0.07
    + actuatorTargets.irrigation * 0.03;
  const environmentLoadPenalty = Math.max(0, environmentDeviation - 20) * 0.03;

  return round(clamp(state.baseline.energy.powerNow + targetLoad + environmentLoadPenalty, 0, 40), 1);
}

function deriveEnergyCost(
  items: MetricTileState[],
  powerNow: number,
  dailyEnergy: number,
  dailyCost: number,
  efficiencyScore: number,
) {
  return items.map((item) => {
    if (item.id === 'power-now') return { ...item, value: powerNow };
    if (item.id === 'daily-energy') return { ...item, value: dailyEnergy };
    if (item.id === 'daily-cost') return { ...item, value: dailyCost };
    if (item.id === 'weekly-cost') return { ...item, value: round(dailyCost * 7, 2) };
    if (item.id === 'efficiency') return { ...item, value: efficiencyScore };
    return item;
  });
}

function deriveUtilityStatus(items: UtilityStatusItemState[], warnings: WarningConditionState[]): UtilityStatusItemState[] {
  const hasNutrientWarning = warnings.some((warning) => warning.key === 'nutrient-reservoir-low');

  return items.map((item) => {
    if (item.id !== 'water-supply') return item;

    if (hasNutrientWarning) {
      return { ...item, value: 'Review', secondary: 'Reservoir low', status: 'warning' };
    }

    return { ...item, value: 'Facility Line', secondary: 'Stable', status: 'normal' };
  });
}

function deriveTrends(items: TrendTileState[], metrics: MetricTileState[]) {
  const metricValues: Record<string, number> = {
    'air-temperature-trend': numericMetric(metrics, 'Air Temperature', 24.6),
    'relative-humidity-trend': numericMetric(metrics, 'Relative Humidity', 58),
    'co2-index-trend': numericMetric(metrics, 'CO2 Index', 1150),
    'light-output-trend': numericMetric(metrics, 'Light Output', 65),
    'irrigation-index-trend': numericMetric(metrics, 'Irrigation Index', 65),
    'airflow-trend': numericMetric(metrics, 'Airflow', 65),
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
  const day = deriveGlobalDay(state.simulation.tick, state.simulation.ticksPerDay);
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

function manualValueEvent(
  state: OperationsCockpitRuntimeState,
  systemLabel: string,
  value: number,
): EventLogEntryState {
  const day = deriveGlobalDay(state.simulation.tick, state.simulation.ticksPerDay);

  return {
    id: `local-${state.simulation.tick}-${slug(systemLabel)}-manual-${value}-${state.cockpit.eventLog.length}`,
    time: clockFromTick(state.simulation.tick, state.simulation.ticksPerDay),
    day,
    tick: state.simulation.tick,
    severity: 'info',
    title: `${systemLabel} manual target changed to ${value}%.`,
    detail: 'Operator panel action.',
  };
}

function warningEvent(state: OperationsCockpitRuntimeState, warning: WarningConditionState): EventLogEntryState {
  const day = deriveGlobalDay(state.simulation.tick, state.simulation.ticksPerDay);

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

function batchCompletedEvent(state: OperationsCockpitRuntimeState, report: BatchReport): EventLogEntryState {
  const day = deriveGlobalDay(state.simulation.tick, state.simulation.ticksPerDay);

  return {
    id: `batch-completed-${state.simulation.tick}-${state.cockpit.roomOverview.batchId}`,
    time: clockFromTick(state.simulation.tick, state.simulation.ticksPerDay),
    day,
    tick: state.simulation.tick,
    severity: 'info',
    title: 'Batch completed.',
    detail: `Report generated. Output potential ${report.finalOutputPotential} / 100.`,
  };
}

function batchStartedEvent(state: OperationsCockpitRuntimeState, batchId: string): EventLogEntryState {
  const day = deriveGlobalDay(state.simulation.tick, state.simulation.ticksPerDay);
  const roomId = state.cockpit.roomOverview.roomId;
  const zoneId = state.cockpit.roomOverview.zoneId;

  return {
    id: `batch-started-${state.simulation.tick}-${batchId}`,
    time: clockFromTick(state.simulation.tick, state.simulation.ticksPerDay),
    day,
    tick: state.simulation.tick,
    severity: 'info',
    title: 'New batch started.',
    detail: `Batch ${batchId} started in Room ${roomId} / Zone ${zoneId}.`,
  };
}

function archiveCompletedReport(reports: BatchReport[], report: BatchReport): BatchReport[] {
  if (reports.some((item) => item.batchId === report.batchId && item.completedTick === report.completedTick)) {
    return reports;
  }

  return [report, ...reports];
}

export function incrementBatchId(batchId: string): string {
  const match = /^B-(\d+)$/.exec(batchId);
  if (!match) return `${batchId}-NEXT`;

  const numericId = match[1];
  if (!numericId) return `${batchId}-NEXT`;

  const nextNumber = Number(numericId) + 1;
  return `B-${String(nextNumber).padStart(numericId.length, '0')}`;
}

function controlIdForSystem(system: OperationsCockpitControlSystem) {
  const ids: Record<OperationsCockpitControlSystem, string> = {
    light: 'light-control',
    climate: 'climate-control',
    irrigation: 'irrigation-control',
  };

  return ids[system];
}

function numericMetric(items: { label: string; value: string | number }[], label: string, fallback: number) {
  const value = items.find((item) => item.label === label)?.value;
  return typeof value === 'number' ? value : fallback;
}

function effectiveTargetByLabel(items: ControlTileState[], label: string) {
  return items.find((item) => item.label === label)?.effectiveTarget ?? 65;
}

function effectiveLabel(label: string) {
  if (label === 'Light') return 'Effective Output';
  if (label === 'Climate') return 'Effective Climate Effort';
  return 'Effective Irrigation Index';
}

function approach(current: number, target: number, rate: number): number {
  const delta = target - current;
  return current + delta * rate;
}

function distanceFromIdeal(value: number, ideal: number): number {
  return Math.abs(value - ideal);
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

export function deriveGlobalDay(tick: number, ticksPerDay: number): number {
  return Math.floor(tick / ticksPerDay) + 1;
}

export function deriveBatchElapsedTicks(globalTick: number, batchStartTick: number): number {
  return Math.max(0, globalTick - batchStartTick);
}

export function deriveBatchDay(globalTick: number, batchStartTick: number, ticksPerDay: number): number {
  return Math.floor(deriveBatchElapsedTicks(globalTick, batchStartTick) / ticksPerDay) + 1;
}

export function deriveCycleProgress(maturity: number): number {
  return clamp(Math.round(maturity), 0, 100);
}

export function deriveOperationalPhase(maturity: number): OperationalPhase {
  if (maturity < 15) return 'Seedling';
  if (maturity < 45) return 'Vegetative';
  if (maturity < 85) return 'Flowering';
  if (maturity < 100) return 'Late Flower';
  return 'Harvest Ready';
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

function batchReportSummary(batchCore: BatchCoreState, efficiency: number, warningCount: number) {
  if (batchCore.stress >= 70) return 'Batch completed with elevated stress reducing outcome quality.';
  if (batchCore.vigor <= 40) return 'Batch completed with low vigor and constrained output potential.';
  if (warningCount > 0) return 'Batch completed with warning conditions present at review.';
  if (efficiency >= 70) return 'Batch completed with stable core values and efficient operating cost.';
  return 'Batch completed with stable core values and moderate operating cost.';
}

function deriveEfficiencyScore(outputPotential: number, operatingCost: number) {
  if (operatingCost <= 0) return 100;
  return clamp(Math.round((outputPotential / Math.max(1, operatingCost)) * 1000), 0, 100);
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
