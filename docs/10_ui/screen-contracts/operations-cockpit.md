# Screen Contract – Operations Cockpit

## Purpose

Monitor one active room/zone and control a small number of abstract operating modes.

## Primary player question

Is this batch stable, and what needs attention right now?

## Read model

```ts
interface OperationsCockpitReadModel {
  simulation: {
    day: number;
    tick: number;
    phase: 'setup' | 'running' | 'harvest-ready' | 'completed';
    speed: 'paused' | 'step' | 'normal' | 'fast';
  };
  room: {
    id: string;
    name: string;
    stability: number;
    lightStatus: number;
    temperatureStatus: number;
    humidityStatus: number;
    waterStatus: number;
    nutrientStatus: number;
  };
  batch: {
    id: string;
    label: string;
    growth: number;
    stress: number;
    maturity: number;
    qualityPotential: number;
  };
  economy: {
    energyCostTotal: number;
    operatingCostTotal: number;
    projectedProfit: number;
  };
  controls: {
    lightMode: 'eco' | 'balanced' | 'push';
    climateMode: 'eco' | 'stable' | 'aggressive';
    irrigationMode: 'conserve' | 'balanced' | 'saturate';
  };
  alerts: Array<{
    id: string;
    severity: 'info' | 'warning' | 'critical';
    label: string;
    explanation: string;
  }>;
  events: Array<{
    tick: number;
    label: string;
  }>;
}
```

## User actions

- setLightMode(mode)
- setClimateMode(mode)
- setIrrigationMode(mode)
- pauseSimulation()
- stepSimulation()
- setSimulationSpeed(speed)
- triggerHarvest(), only when eligible

## Layout structure

- Top: simulation status, day/tick, global run state
- Left: room/zone visualization and batch status
- Center: telemetry cards and short trend indicators
- Right: operating mode controls and active alerts
- Bottom: event log and cost strip

## Visual priorities

The player must first see batch stability, stress, and whether an intervention is needed. Controls are secondary but always visible.

## Explicit non-goals

- No exact real-world cultivation values
- No free numeric input fields
- No strain database
- No pest or disease controls
- No logistics, employees, market, or legal systems
- No extra tabs invented by the frontend

## Acceptance criteria

- [ ] The screen uses the contract read model.
- [ ] All displayed data maps to deterministic simulation output or a deterministic demo adapter.
- [ ] The UI does not display real cultivation recipes.
- [ ] The screen structure follows the approved mockup.
