import blueprintData from './operations-cockpit-blueprint.json';
import { rehydrateOperationsCockpit } from './operations-cockpit-rehydrate';
import {
  advanceOperationsCockpitRuntime,
  deriveEnvironmentDeviation,
  deriveGlobalDay,
  generateBatchReport,
  getModeTarget,
} from './operations-cockpit-runtime';
import type {
  BatchCoreState,
  BatchReport,
  CockpitControlState,
  EventLogEntryState,
  OperatingMode,
  OperationsCockpitBlueprint,
  OperationsCockpitControlSystem,
  OperationsCockpitRuntimeAction,
  OperationsCockpitRuntimeState,
  RoomEnvironmentState,
  RuntimeWarningKey,
  StatusLevel,
  TelemetryKey,
} from './operations-cockpit-state-types';

export type RuntimeScenarioResult = {
  name: string;
  passed: boolean;
  message?: string;
};
export type RuntimeProfileScenarioName = 'Eco' | 'Balanced' | 'Push' | 'Manual Balanced' | 'Manual Bad Balance';
export type RuntimeProfileScenarioSummary = {
  name: RuntimeProfileScenarioName;
  ticksRun: number;
  firstReadyTick?: number;
  totalCost: number;
  warningTicks: number;
  finalCore: BatchCoreState;
  yieldEstimate: number;
  qualityEstimate: number;
  efficiency: number;
  finalStatus: StatusLevel;
  warningKeys: RuntimeWarningKey[];
  finalEnvironment: RoomEnvironmentState;
  environmentDeviation: number;
};

const blueprint = blueprintData as OperationsCockpitBlueprint;
const EVENT_LOG_CAP = 20;
const CONTROL_IDS: Record<OperationsCockpitControlSystem, string> = {
  light: 'light-control',
  climate: 'climate-control',
  irrigation: 'irrigation-control',
};
const CONTROL_TELEMETRY: Record<OperationsCockpitControlSystem, TelemetryKey> = {
  light: 'light-output',
  climate: 'airflow',
  irrigation: 'irrigation-index',
};
const CONTROL_SYSTEMS: OperationsCockpitControlSystem[] = ['light', 'climate', 'irrigation'];
const INITIAL_BATCH_CORE: BatchCoreState = {
  maturity: 0,
  stress: 10,
  vigor: 70,
  outputPotential: 0,
};

export function runRuntimeScenarioChecks(): RuntimeScenarioResult[] {
  return [
    runScenario('deterministic rehydration', checkDeterministicRehydration),
    runScenario('paused tick does not advance', checkPausedTickDoesNotAdvance),
    runScenario('running tick advances deterministically', checkRunningTickDeterminism),
    runScenario('manual controls affect effective targets', checkManualControls),
    runScenario('mode targets are ordered', checkModeTargetOrdering),
    runScenario('operating profiles have directional outcomes', checkOperatingProfileOutcomes),
    runScenario('manual profile balance affects outcomes', checkManualProfileOutcomes),
    runScenario('batch lifecycle reaches harvest ready once', checkBatchLifecycleReady),
    runScenario('complete batch freezes report', checkCompleteBatchFreezesReport),
    runScenario('start next batch preserves global time', checkStartNextBatch),
    runScenario('event log does not spam warnings', checkEventLogSpamPrevention),
  ];
}

export function runEcoScenario(): RuntimeProfileScenarioSummary {
  return runProfileScenario({
    name: 'Eco',
    controls: {
      light: { mode: 'Eco', control: 'Auto', manualValue: 65 },
      climate: { mode: 'Eco', control: 'Auto', manualValue: 65 },
      irrigation: { mode: 'Eco', control: 'Auto', manualValue: 65 },
    },
  });
}

export function runBalancedScenario(): RuntimeProfileScenarioSummary {
  return runProfileScenario({
    name: 'Balanced',
    controls: {
      light: { mode: 'Balanced', control: 'Auto', manualValue: 65 },
      climate: { mode: 'Balanced', control: 'Auto', manualValue: 65 },
      irrigation: { mode: 'Balanced', control: 'Auto', manualValue: 65 },
    },
  });
}

export function runPushScenario(): RuntimeProfileScenarioSummary {
  return runProfileScenario({
    name: 'Push',
    controls: {
      light: { mode: 'Push', control: 'Auto', manualValue: 65 },
      climate: { mode: 'Push', control: 'Auto', manualValue: 65 },
      irrigation: { mode: 'Push', control: 'Auto', manualValue: 65 },
    },
  });
}

export function runManualBalancedScenario(): RuntimeProfileScenarioSummary {
  return runProfileScenario({
    name: 'Manual Balanced',
    controls: {
      light: { mode: 'Balanced', control: 'Manual', manualValue: 70 },
      climate: { mode: 'Balanced', control: 'Manual', manualValue: 70 },
      irrigation: { mode: 'Balanced', control: 'Manual', manualValue: 65 },
    },
  });
}

export function runManualBadBalanceScenario(): RuntimeProfileScenarioSummary {
  return runProfileScenario({
    name: 'Manual Bad Balance',
    controls: {
      light: { mode: 'Balanced', control: 'Manual', manualValue: 100 },
      climate: { mode: 'Balanced', control: 'Manual', manualValue: 0 },
      irrigation: { mode: 'Balanced', control: 'Manual', manualValue: 100 },
    },
  });
}

function checkDeterministicRehydration(): void {
  const first = createRuntime();
  const second = createRuntime();

  assertEqual(
    rehydrationSnapshot(first),
    rehydrationSnapshot(second),
    'same blueprint produced different rehydrated runtime snapshots',
  );
}

function checkPausedTickDoesNotAdvance(): void {
  const paused = dispatch(createRuntime(), { type: 'set-running', isRunning: false });
  const beforeTick = paused.simulation.tick;
  const beforeBatchCore = paused.cockpit.batchRuntime.batchCore;
  const after = dispatch(paused, { type: 'tick' });

  assert(after.simulation.tick === beforeTick, 'paused tick advanced simulation tick');
  assertEqual(after.cockpit.batchRuntime.batchCore, beforeBatchCore, 'paused tick advanced batch core values');
}

function checkRunningTickDeterminism(): void {
  const initial = dispatch(createRuntime(), { type: 'set-running', isRunning: true });
  const oneTick = dispatch(initial, { type: 'tick' });

  assert(oneTick.simulation.tick === initial.simulation.tick + 1, 'running tick did not advance by exactly one');

  const first = tick(initial, 24);
  const second = tick(dispatch(createRuntime(), { type: 'set-running', isRunning: true }), 24);

  assertEqual(runtimeSnapshot(first), runtimeSnapshot(second), 'same initial state and ticks produced different output');
}

function checkManualControls(): void {
  for (const system of CONTROL_SYSTEMS) {
    const autoState = dispatch(createRuntime(), { type: 'set-control-mode', system, mode: 'Eco' });
    const autoControl = controlForSystem(autoState, system);

    assert(
      autoControl.effectiveTarget === getModeTarget('Eco'),
      `${system} Auto target did not derive from selected mode`,
    );

    const manualState = dispatch(
      dispatch(autoState, { type: 'set-control-state', system, control: 'Manual' }),
      { type: 'set-manual-value', system, value: 73 },
    );
    const manualControl = controlForSystem(manualState, system);

    assert(manualControl.manualValue === 73, `${system} manual value was not stored`);
    assert(manualControl.effectiveTarget === 73, `${system} Manual target did not derive from manual value`);

    const clampedLow = dispatch(manualState, { type: 'set-manual-value', system, value: -12 });
    const clampedHigh = dispatch(manualState, { type: 'set-manual-value', system, value: 112 });

    assert(controlForSystem(clampedLow, system).manualValue === 0, `${system} manual value did not clamp low`);
    assert(controlForSystem(clampedHigh, system).manualValue === 100, `${system} manual value did not clamp high`);

    const lowTelemetry = telemetryAfterManualTicks(system, 10, 4);
    const highTelemetry = telemetryAfterManualTicks(system, 90, 4);
    const highTelemetryAfterOneTick = telemetryAfterManualTicks(system, 90, 1);

    assert(
      lowTelemetry !== highTelemetry,
      `${system} manual value change did not affect derived telemetry over multiple ticks`,
    );
    assert(
      highTelemetryAfterOneTick !== 90,
      `${system} telemetry snapped instantly to the manual target`,
    );
  }
}

function checkModeTargetOrdering(): void {
  const modes: OperatingMode[] = ['Eco', 'Balanced', 'Push'];
  const [eco, balanced, push] = modes.map((mode) => getModeTarget(mode));

  assert(typeof eco === 'number' && typeof balanced === 'number' && typeof push === 'number', 'mode target missing');
  assert(eco < balanced && balanced < push, 'mode targets are not ordered Eco < Balanced < Push');
}

function checkOperatingProfileOutcomes(): void {
  const eco = runEcoScenario();
  const balanced = runBalancedScenario();
  const push = runPushScenario();

  assert(eco.totalCost < balanced.totalCost, 'Eco scenario total cost was not lower than Balanced');
  assert(balanced.totalCost < push.totalCost, 'Balanced scenario total cost was not lower than Push');
  assert(eco.finalCore.outputPotential <= balanced.finalCore.outputPotential, 'Eco output potential exceeded Balanced');
  assert(push.finalCore.stress > balanced.finalCore.stress, 'Push stress was not higher than Balanced');
  assert(balanced.finalCore.vigor >= push.finalCore.vigor, 'Balanced vigor was lower than long-run Push vigor');
  assert(
    readyTick(push) < readyTick(balanced),
    'Push did not reach ready state before Balanced',
  );
}

function checkManualProfileOutcomes(): void {
  const eco = runEcoScenario();
  const manualBalanced = runManualBalancedScenario();
  const manualBadBalance = runManualBadBalanceScenario();

  assert(
    manualBadBalance.finalCore.stress > manualBalanced.finalCore.stress,
    'Bad manual balance did not increase stress over balanced manual values',
  );
  assert(
    manualBadBalance.environmentDeviation > manualBalanced.environmentDeviation,
    'Bad manual balance did not increase environment deviation',
  );
  assert(
    manualBadBalance.finalCore.outputPotential < manualBalanced.finalCore.outputPotential,
    'Bad manual balance did not reduce output potential',
  );
  assert(
    manualBadBalance.qualityEstimate < manualBalanced.qualityEstimate,
    'Bad manual balance did not reduce quality estimate',
  );
  assert(
    manualBalanced.finalCore.outputPotential >= eco.finalCore.outputPotential,
    'Balanced manual values underperformed Eco output potential',
  );
}

function checkBatchLifecycleReady(): void {
  const ready = tickUntilReady(dispatch(createRuntime(), { type: 'set-running', isRunning: true }));
  const readyEventCount = countWarningEvents(ready, 'cycle-ready');
  const afterExtraTicks = tick(ready, 5);

  assert(ready.cockpit.batchRuntime.lifecycleState === 'ready', 'batch lifecycle did not become ready');
  assert(ready.cockpit.batchRuntime.phase === 'Harvest Ready', 'ready batch phase is not Harvest Ready');
  assert(readyEventCount === 1, 'harvest-ready warning event was not created exactly once');
  assert(
    countWarningEvents(afterExtraTicks, 'cycle-ready') === readyEventCount,
    'harvest-ready warning event duplicated on additional ticks',
  );
}

function checkCompleteBatchFreezesReport(): void {
  const ready = tickUntilReady(dispatch(createRuntime(), { type: 'set-running', isRunning: true }));
  const completed = dispatch(ready, { type: 'complete-batch' });
  const report = completed.cockpit.batchRuntime.report;

  assert(completed.cockpit.batchRuntime.lifecycleState === 'completed', 'complete-batch did not complete lifecycle');
  assert(report !== undefined, 'complete-batch did not create a report');
  assert(report.batchId === completed.cockpit.roomOverview.batchId, 'report batch id does not match completed batch');
  assert(report.completedTick === completed.simulation.tick, 'report completed tick does not match runtime tick');

  const reportSnapshot = stableStringify(report);
  const afterTicks = tick(completed, 5);

  assert(stableStringify(afterTicks.cockpit.batchRuntime.report) === reportSnapshot, 'completed report mutated after ticks');
}

function checkStartNextBatch(): void {
  let runtime = createRuntime();
  runtime = dispatch(runtime, { type: 'set-control-state', system: 'light', control: 'Manual' });
  runtime = dispatch(runtime, { type: 'set-manual-value', system: 'light', value: 33 });
  runtime = dispatch(runtime, { type: 'set-running', isRunning: true });
  runtime = tickUntilReady(runtime);
  runtime = dispatch(runtime, { type: 'complete-batch' });

  const tickBefore = runtime.simulation.tick;
  const dayBefore = deriveGlobalDay(runtime.simulation.tick, runtime.simulation.ticksPerDay);
  const controlsBefore = controlsSnapshot(runtime);
  const nutrientBefore = numericTelemetry(runtime, 'nutrient-reservoir');
  const roomEnvironmentBefore = runtime.roomEnvironment;
  const next = dispatch(runtime, { type: 'start-next-batch' });
  const dayAfter = deriveGlobalDay(next.simulation.tick, next.simulation.ticksPerDay);

  assert(next.cockpit.roomOverview.batchId === 'B-018', 'next batch id was not deterministic');
  assert(next.simulation.tick === tickBefore, 'start-next-batch reset or advanced global tick');
  assert(dayAfter === dayBefore, 'start-next-batch reset global day');
  assert(next.cockpit.batchRuntime.startTick === tickBefore, 'new batch start tick does not match current tick');
  assert(next.baseline.batch.startTick === tickBefore, 'baseline batch start tick does not match current tick');
  assert(next.cockpit.batchRuntime.lifecycleState === 'active', 'new batch is not active');
  assertEqual(next.cockpit.batchRuntime.batchCore, INITIAL_BATCH_CORE, 'new batch core values did not reset');
  assertEqual(controlsSnapshot(next), controlsBefore, 'room controls were reset when starting next batch');
  assertEqual(next.roomEnvironment, roomEnvironmentBefore, 'room environment was reset when starting next batch');
  assert(
    numericTelemetry(next, 'nutrient-reservoir') <= nutrientBefore,
    'nutrient reservoir was refilled when starting next batch',
  );
}

function checkEventLogSpamPrevention(): void {
  let runtime = dispatch(createRuntime(), { type: 'set-running', isRunning: true });

  for (const system of CONTROL_SYSTEMS) {
    runtime = dispatch(runtime, { type: 'set-control-mode', system, mode: 'Push' });
  }

  runtime = tickUntilWarning(runtime, 'high-stress');
  const firstWarningCount = countWarningEvents(runtime, 'high-stress');
  runtime = tick(runtime, 10);

  assert(firstWarningCount === 1, 'high-stress warning event was not created exactly once');
  assert(
    countWarningEvents(runtime, 'high-stress') === firstWarningCount,
    'persistent high-stress warning generated duplicate events',
  );

  runtime = dispatch(runtime, { type: 'set-control-state', system: 'light', control: 'Manual' });
  for (let value = 0; value <= 100; value += 5) {
    runtime = dispatch(runtime, { type: 'set-manual-value', system: 'light', value });
  }
  for (let value = 95; value >= 0; value -= 5) {
    runtime = dispatch(runtime, { type: 'set-manual-value', system: 'light', value });
  }

  assert(runtime.cockpit.eventLog.length <= EVENT_LOG_CAP, 'event log exceeded its runtime cap');
}

function runScenario(name: string, check: () => void): RuntimeScenarioResult {
  try {
    check();
    return { name, passed: true };
  } catch (error) {
    return { name, passed: false, message: errorMessage(error) };
  }
}

function createRuntime(): OperationsCockpitRuntimeState {
  return rehydrateOperationsCockpit(blueprint);
}

function runProfileScenario({
  name,
  controls,
}: {
  name: RuntimeProfileScenarioName;
  controls: CockpitControlState;
}): RuntimeProfileScenarioSummary {
  let runtime = applyScenarioControls(createRuntime(), controls);
  runtime = dispatch(runtime, { type: 'set-running', isRunning: true });

  const ticksRun = runtime.cockpit.batchRuntime.cycleLengthDays * runtime.simulation.ticksPerDay;
  let firstReadyTick: number | undefined;

  for (let index = 0; index < ticksRun; index += 1) {
    runtime = dispatch(runtime, { type: 'tick' });

    if (firstReadyTick === undefined && runtime.cockpit.batchRuntime.lifecycleState === 'ready') {
      firstReadyTick = index + 1;
    }
  }

  const report = generateBatchReport(runtime);

  return profileScenarioSummary(name, runtime, ticksRun, firstReadyTick, report);
}

function applyScenarioControls(
  runtime: OperationsCockpitRuntimeState,
  controls: CockpitControlState,
): OperationsCockpitRuntimeState {
  let next = runtime;

  for (const system of CONTROL_SYSTEMS) {
    const control = controls[system];
    next = dispatch(next, { type: 'set-control-mode', system, mode: control.mode });
    next = dispatch(next, { type: 'set-control-state', system, control: control.control });
    next = dispatch(next, { type: 'set-manual-value', system, value: control.manualValue });
  }

  return next;
}

function profileScenarioSummary(
  name: RuntimeProfileScenarioName,
  runtime: OperationsCockpitRuntimeState,
  ticksRun: number,
  firstReadyTick: number | undefined,
  report: BatchReport,
): RuntimeProfileScenarioSummary {
  return {
    name,
    ticksRun,
    ...(firstReadyTick === undefined ? {} : { firstReadyTick }),
    totalCost: report.operatingCost,
    warningTicks: runtime.cockpit.batchRuntime.accumulators.warningTicks,
    finalCore: runtime.cockpit.batchRuntime.batchCore,
    yieldEstimate: report.yieldEstimate,
    qualityEstimate: report.qualityEstimate,
    efficiency: report.efficiency,
    finalStatus: report.finalStatus,
    warningKeys: runtime.cockpit.warningConditions.map((warning) => warning.key),
    finalEnvironment: runtime.roomEnvironment,
    environmentDeviation: deriveEnvironmentDeviation(runtime.roomEnvironment),
  };
}

function dispatch(
  state: OperationsCockpitRuntimeState,
  action: OperationsCockpitRuntimeAction,
): OperationsCockpitRuntimeState {
  return advanceOperationsCockpitRuntime(state, action);
}

function tick(state: OperationsCockpitRuntimeState, count: number): OperationsCockpitRuntimeState {
  let next = state;

  for (let index = 0; index < count; index += 1) {
    next = dispatch(next, { type: 'tick' });
  }

  return next;
}

function tickUntilReady(state: OperationsCockpitRuntimeState): OperationsCockpitRuntimeState {
  let next = state;

  for (let index = 0; index < 500; index += 1) {
    if (next.cockpit.batchRuntime.lifecycleState === 'ready') return next;
    next = dispatch(next, { type: 'tick' });
  }

  throw new Error('batch did not reach ready lifecycle within 500 ticks');
}

function tickUntilWarning(
  state: OperationsCockpitRuntimeState,
  warningKey: RuntimeWarningKey,
): OperationsCockpitRuntimeState {
  let next = state;

  for (let index = 0; index < 500; index += 1) {
    if (next.cockpit.warningConditions.some((warning) => warning.key === warningKey)) return next;
    next = dispatch(next, { type: 'tick' });
  }

  throw new Error(`${warningKey} warning did not appear within 500 ticks`);
}

function telemetryAfterManualTicks(
  system: OperationsCockpitControlSystem,
  manualValue: number,
  tickCount: number,
): number {
  let state = createRuntime();
  state = dispatch(state, { type: 'set-control-state', system, control: 'Manual' });
  state = dispatch(state, { type: 'set-manual-value', system, value: manualValue });
  state = dispatch(state, { type: 'set-running', isRunning: true });
  state = tick(state, tickCount);

  return numericTelemetry(state, CONTROL_TELEMETRY[system]);
}

function readyTick(summary: RuntimeProfileScenarioSummary): number {
  return summary.firstReadyTick ?? Number.POSITIVE_INFINITY;
}

function controlForSystem(state: OperationsCockpitRuntimeState, system: OperationsCockpitControlSystem) {
  const controlId = CONTROL_IDS[system];
  const control = state.cockpit.controls.find((item) => item.id === controlId);

  if (!control) throw new Error(`missing ${system} control`);

  return control;
}

function numericTelemetry(state: OperationsCockpitRuntimeState, id: TelemetryKey): number {
  const telemetry = state.cockpit.environmentalTelemetry.find((item) => item.id === id);

  if (!telemetry || typeof telemetry.value !== 'number') {
    throw new Error(`missing numeric telemetry ${id}`);
  }

  return telemetry.value;
}

function countWarningEvents(state: OperationsCockpitRuntimeState, warningKey: RuntimeWarningKey): number {
  return state.cockpit.eventLog.filter((event) => event.id.includes(`-${warningKey}`)).length;
}

function rehydrationSnapshot(state: OperationsCockpitRuntimeState) {
  return {
    simulation: state.simulation,
    room: {
      roomId: state.cockpit.roomOverview.roomId,
      zoneId: state.cockpit.roomOverview.zoneId,
      batchId: state.cockpit.roomOverview.batchId,
    },
    controls: controlsSnapshot(state),
    batchCore: state.cockpit.batchRuntime.batchCore,
    telemetry: state.cockpit.environmentalTelemetry.map((item) => ({
      id: item.id,
      value: item.value,
      reference: item.reference,
      status: item.status,
    })),
    roomEnvironment: state.roomEnvironment,
    baseline: state.baseline,
  };
}

function runtimeSnapshot(state: OperationsCockpitRuntimeState) {
  return {
    simulation: state.simulation,
    activeWarnings: state.activeWarnings,
    completedBatchReports: state.completedBatchReports,
    roomOverview: state.cockpit.roomOverview,
    batchRuntime: state.cockpit.batchRuntime,
    batchStatus: state.cockpit.batchStatus,
    environmentalTelemetry: state.cockpit.environmentalTelemetry,
    controls: state.cockpit.controls,
    telemetryTrends: state.cockpit.telemetryTrends,
    eventLog: state.cockpit.eventLog.map(eventSnapshot),
    warningConditions: state.cockpit.warningConditions,
    energyCost: state.cockpit.energyCost,
    utilityStatus: state.cockpit.utilityStatus,
    roomEnvironment: state.roomEnvironment,
    baseline: state.baseline,
  };
}

function controlsSnapshot(state: OperationsCockpitRuntimeState) {
  return state.cockpit.controls.map((control) => ({
    id: control.id,
    activeMode: control.activeMode,
    activeControl: control.activeControl,
    manualValue: control.manualValue,
    effectiveTarget: control.effectiveTarget,
    primaryTuning: control.primaryTuning,
  }));
}

function eventSnapshot(event: EventLogEntryState) {
  return {
    id: event.id,
    day: event.day,
    tick: event.tick,
    severity: event.severity,
    title: event.title,
    detail: event.detail,
  };
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEqual(actual: unknown, expected: unknown, message: string): void {
  const actualValue = stableStringify(actual);
  const expectedValue = stableStringify(expected);

  if (actualValue !== expectedValue) {
    throw new Error(`${message}. Expected ${expectedValue}, received ${actualValue}`);
  }
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const entries = Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`);

    return `{${entries.join(',')}}`;
  }

  return JSON.stringify(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown runtime scenario failure';
}
