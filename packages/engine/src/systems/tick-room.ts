import type { RuntimeState } from '../runtime/types';

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Deterministic placeholder tick for Iteration 0.
 *
 * This uses abstract game values only. It must not be treated as real-world
 * cultivation logic.
 */
export function tickRoom(state: RuntimeState): RuntimeState {
  const lightBias = state.controls.lightMode === 'push' ? 2 : state.controls.lightMode === 'eco' ? -1 : 1;
  const climateBias = state.controls.climateMode === 'stable' ? 2 : state.controls.climateMode === 'eco' ? -1 : 0;
  const irrigationBias = state.controls.irrigationMode === 'saturate' ? 1 : state.controls.irrigationMode === 'conserve' ? -1 : 0;

  const stability = clamp(state.room.stability + climateBias - Math.max(0, lightBias - 1));
  const stressDelta = stability < 60 ? 2 : stability < 70 ? 1 : -1;
  const growthDelta = lightBias + irrigationBias + (stability > 70 ? 1 : 0);

  const nextTick = state.simulation.tick + 1;

  return {
    ...state,
    simulation: {
      ...state.simulation,
      tick: nextTick,
      day: Math.floor(nextTick / 24) + 1,
      phase: state.batch.maturity >= 100 ? 'harvest-ready' : state.simulation.phase,
    },
    room: {
      ...state.room,
      stability,
      lightStatus: clamp(state.room.lightStatus + lightBias),
      temperatureStatus: clamp(state.room.temperatureStatus + climateBias - lightBias),
      humidityStatus: clamp(state.room.humidityStatus + irrigationBias - climateBias),
      waterStatus: clamp(state.room.waterStatus + irrigationBias),
    },
    batch: {
      ...state.batch,
      growth: clamp(state.batch.growth + growthDelta),
      stress: clamp(state.batch.stress + stressDelta),
      maturity: clamp(state.batch.maturity + 1),
      qualityPotential: clamp(state.batch.qualityPotential + (stressDelta < 0 ? 1 : -1)),
    },
    economy: {
      ...state.economy,
      energyCostTotal: state.economy.energyCostTotal + (state.controls.lightMode === 'push' ? 4 : 2),
      operatingCostTotal: state.economy.operatingCostTotal + 3,
    },
  };
}
