# Screen Contract – Setup / Room Configuration

## Purpose

Review the initial single-room setup and start a controlled batch run.

## Primary player question

What setup am I starting with, and what risks or costs should I expect?

## Read model

```ts
interface SetupRoomConfigurationReadModel {
  room: {
    id: string;
    name: string;
    sizeClass: 'small';
    zoneCount: number;
  };
  devices: Array<{
    id: string;
    label: string;
    role: 'light' | 'climate' | 'irrigation' | 'sensor';
    efficiencyRating: number;
    stabilityImpact: number;
    operatingCostIndex: number;
  }>;
  batchOptions: Array<{
    id: string;
    label: string;
    difficulty: number;
    growthBias: number;
    qualityBias: number;
  }>;
  forecast: {
    expectedOperatingCost: number;
    expectedRisk: number;
    expectedYieldIndex: number;
  };
}
```

## User actions

- selectBatchOption(batchId)
- startBatch()

## Explicit non-goals

- No shop
- No large device catalog
- No construction mode
- No drag-and-drop room building
- No real strain selection
