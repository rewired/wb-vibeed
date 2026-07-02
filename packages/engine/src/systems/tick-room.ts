import type {
  BatchCoreState,
  BatchOutcomeAccumulators,
  EngineBatchLifecycleState,
  EngineOperatingMode,
  EngineWarningKey,
  ResolvedActuatorTargets,
  RoomEconomyState,
  RoomEnvironmentState,
  RoomSimulationCoreState,
} from '../runtime/types';

const COST_PER_KWH = 0.34;
const NUTRIENT_REVIEW_THRESHOLD = 20;
const IDEAL_ENVIRONMENT_INDEX = 65;
const ENVIRONMENT_RATES = {
  lightIndex: 0.35,
  airflowIndex: 0.22,
  irrigationIndex: 0.18,
  temperatureIndex: 0.08,
  humidityIndex: 0.07,
  co2Index: 0.05,
} as const satisfies Record<Exclude<keyof RoomEnvironmentState, 'nutrientReservoir'>, number>;

export function createInitialBatchCore(): BatchCoreState {
  return {
    maturity: 0,
    stress: 10,
    vigor: 70,
    outputPotential: 0,
  };
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

export function getOperatingModeTarget(mode: EngineOperatingMode): number {
  switch (mode) {
    case 'Eco':
      return 40;
    case 'Balanced':
      return 65;
    case 'Push':
      return 85;
  }
}

export function tickRoom(state: Readonly<RoomSimulationCoreState>): RoomSimulationCoreState {
  const nextTick = state.simulation.tick + 1;
  const roomEnvironment = advanceRoomEnvironment(state.roomEnvironment, state.targets, nextTick);
  const batchCore = shouldAdvanceBatch(state.lifecycleState)
    ? advanceBatchCore(state.batchCore, roomEnvironment)
    : state.batchCore;
  const lifecycleState = deriveBatchLifecycleState(state.lifecycleState, batchCore.maturity);
  const environmentDeviation = deriveEnvironmentDeviation(roomEnvironment);
  const warnings = deriveEngineWarningKeys(roomEnvironment, environmentDeviation, batchCore, lifecycleState === 'ready');
  const economy = deriveRoomEconomy(state.baselinePowerNow, state.targets, environmentDeviation);
  const accumulators = shouldAdvanceBatch(lifecycleState)
    ? accumulateBatchTick({
        accumulators: state.accumulators,
        hasWarnings: warnings.length > 0,
        powerNow: economy.powerNow,
        dailyCost: economy.dailyCost,
        ticksPerDay: state.simulation.ticksPerDay,
        outputPotential: batchCore.outputPotential,
      })
    : state.accumulators;

  return {
    ...state,
    simulation: {
      ...state.simulation,
      tick: nextTick,
    },
    roomEnvironment,
    batchCore,
    lifecycleState,
    accumulators,
    economy,
    warnings,
  };
}

export function deriveRoomEconomy(
  baselinePowerNow: number,
  targets: Readonly<ResolvedActuatorTargets>,
  environmentDeviation: number,
): RoomEconomyState {
  const targetLoad =
    targets.light * 0.08
    + targets.climate * 0.07
    + targets.irrigation * 0.03;
  const environmentLoadPenalty = Math.max(0, environmentDeviation - 20) * 0.03;
  const powerNow = round(clamp(baselinePowerNow + targetLoad + environmentLoadPenalty, 0, 40), 1);
  const dailyEnergy = round(powerNow * 24, 1);
  const dailyCost = round(dailyEnergy * COST_PER_KWH, 2);

  return {
    powerNow,
    dailyEnergy,
    dailyCost,
  };
}

export function deriveEngineWarningKeys(
  roomEnvironment: Readonly<RoomEnvironmentState>,
  environmentDeviation: number,
  batchCore: Readonly<BatchCoreState>,
  readyForReview: boolean,
): EngineWarningKey[] {
  const warnings: EngineWarningKey[] = [];

  if (batchCore.stress >= 70) warnings.push('high-stress');
  if (batchCore.vigor <= 40) warnings.push('low-vigor');
  if (environmentDeviation >= 35) warnings.push('environment-drift');
  if (roomEnvironment.nutrientReservoir <= NUTRIENT_REVIEW_THRESHOLD) warnings.push('nutrient-reservoir-low');
  if (readyForReview) warnings.push('cycle-ready');

  return warnings;
}

export function deriveEnvironmentDeviation(environment: Readonly<RoomEnvironmentState>): number {
  return (
    distanceFromIdeal(environment.temperatureIndex, IDEAL_ENVIRONMENT_INDEX) * 0.20
    + distanceFromIdeal(environment.humidityIndex, IDEAL_ENVIRONMENT_INDEX) * 0.18
    + distanceFromIdeal(environment.lightIndex, IDEAL_ENVIRONMENT_INDEX) * 0.20
    + distanceFromIdeal(environment.irrigationIndex, IDEAL_ENVIRONMENT_INDEX) * 0.18
    + distanceFromIdeal(environment.airflowIndex, IDEAL_ENVIRONMENT_INDEX) * 0.14
    + distanceFromIdeal(environment.co2Index, IDEAL_ENVIRONMENT_INDEX) * 0.10
  );
}

export function deriveBatchLifecycleState(
  currentLifecycleState: EngineBatchLifecycleState,
  maturity: number,
): EngineBatchLifecycleState {
  if (currentLifecycleState === 'completed') return 'completed';
  if (maturity >= 100) return 'ready';
  return 'active';
}

export function deriveEfficiencyScore(outputPotential: number, operatingCost: number): number {
  if (operatingCost <= 0) return 100;
  return clamp(Math.round((outputPotential / Math.max(1, operatingCost)) * 1000), 0, 100);
}

function advanceRoomEnvironment(
  current: Readonly<RoomEnvironmentState>,
  targets: Readonly<ResolvedActuatorTargets>,
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

function deriveEnvironmentTargets(
  targets: Readonly<ResolvedActuatorTargets>,
  tick: number,
): RoomEnvironmentState {
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

function advanceBatchCore(
  batchCore: Readonly<BatchCoreState>,
  roomEnvironment: Readonly<RoomEnvironmentState>,
): BatchCoreState {
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

function accumulateBatchTick({
  accumulators,
  hasWarnings,
  powerNow,
  dailyCost,
  ticksPerDay,
  outputPotential,
}: {
  accumulators: Readonly<BatchOutcomeAccumulators>;
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

function shouldAdvanceBatch(lifecycleState: EngineBatchLifecycleState): boolean {
  return lifecycleState === 'active' || lifecycleState === 'ready';
}

function approach(current: number, target: number, rate: number): number {
  const delta = target - current;
  return current + delta * rate;
}

function distanceFromIdeal(value: number, ideal: number): number {
  return Math.abs(value - ideal);
}

function wave(tick: number, amplitude: number, period: number, phase = 0): number {
  return Math.sin((tick + phase) / period) * amplitude;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 0): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
