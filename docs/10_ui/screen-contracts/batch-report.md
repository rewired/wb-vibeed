# Screen Contract – Batch Report

## Purpose

Explain the outcome of a completed batch and create a clear reason to try again.

## Primary player question

Why did this run perform the way it did, and what should I improve next time?

## Read model

```ts
interface BatchReportReadModel {
  batch: {
    id: string;
    label: string;
    completedAtTick: number;
  };
  outcome: {
    yieldIndex: number;
    qualityIndex: number;
    stressAverage: number;
    stressPeak: number;
    stabilityAverage: number;
    energyCostTotal: number;
    operatingCostTotal: number;
    revenueIndex: number;
    profitIndex: number;
    managementGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  };
  diagnosis: Array<{
    label: string;
    impact: 'minor' | 'moderate' | 'major';
    explanation: string;
  }>;
  comparison?: {
    previousBatchId: string;
    yieldDelta: number;
    qualityDelta: number;
    profitDelta: number;
  };
}
```

## User actions

- startNextRun()
- returnToSetup()

## Explicit non-goals

- No detailed real cultivation advice
- No real market pricing
- No global scoreboards
- No achievements system in Iteration 1
