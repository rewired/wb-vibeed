import type { RuntimeState } from './types';

export function createDemoRuntimeState(): RuntimeState {
  return {
    simulation: {
      day: 1,
      tick: 0,
      phase: 'running',
      speed: 'paused',
    },
    company: {
      id: 'company.demo',
      name: 'Demo Operator',
    },
    structure: {
      id: 'structure.demo',
      name: 'North Unit',
    },
    room: {
      id: 'room.demo.01',
      name: 'Room 01',
      stability: 72,
      lightStatus: 68,
      temperatureStatus: 74,
      humidityStatus: 71,
      waterStatus: 66,
      nutrientStatus: 70,
    },
    zone: {
      id: 'zone.demo.01',
      name: 'Zone A',
      roomId: 'room.demo.01',
    },
    batch: {
      id: 'batch.demo.001',
      label: 'Batch 001 / Vibe Line',
      growth: 6,
      stress: 11,
      maturity: 4,
      qualityPotential: 70,
    },
    economy: {
      energyCostTotal: 0,
      operatingCostTotal: 0,
      projectedProfit: 0,
    },
    controls: {
      lightMode: 'balanced',
      climateMode: 'stable',
      irrigationMode: 'balanced',
    },
    events: [{ tick: 0, label: 'Batch started.' }],
  };
}
