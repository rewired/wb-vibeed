# WB VibeEd – Iteration 1 Definition

## Project core

WB VibeEd is a deterministic single-room grow operations simulator focused on observation, operating decisions, trade-offs, and batch evaluation.

The player does not initially run a corporation, a world map, or a complex production network. The first playable scope is one controlled room with one active batch.

## Guiding formula

One room.  
One batch.  
One cycle.  
Few controls.  
Visible consequences.  
A report that makes the next attempt attractive.

## Core loop

1. Review or select setup
2. Start batch
3. Run simulation
4. Observe telemetry
5. Adjust operating modes
6. Detect drift, stress, and cost issues
7. Harvest
8. Evaluate batch report
9. Improve the next run

## Technical principle

Static JSON blueprints are loaded, validated, and rehydrated into runtime state. The simulation operates deterministically on this runtime state. Behavior belongs to explicit systems/services, not to random UI logic or hidden magic.

```text
Blueprint JSON
→ Validation
→ Runtime state
→ Deterministic tick systems
→ Events / snapshots / read models
→ UI
```

## Iteration 1 scope

Included:

- one company
- one structure
- one room
- one zone
- one batch
- one fictional plant line
- abstract environmental values
- a small device set
- deterministic tick loop
- visible telemetry
- simple operating modes
- basic cost model
- harvest
- batch report

## Abstract simulation values

The first iteration uses game values only:

- light status
- temperature status
- humidity status
- water status
- abstract nutrient status
- stability
- growth
- stress
- maturity
- quality potential
- energy use
- operating cost

These are game values and must not be presented as real-world cultivation instructions.

## First devices

Only devices that directly support the core loop:

- light
- abstract ventilation/climate
- abstract irrigation
- optional basic sensor module

Each device must visibly affect telemetry, cost, stability, or batch outcome.

## First player actions

The player can:

- set light mode
- set climate mode
- set irrigation mode
- pause simulation
- step simulation
- change simulation speed
- harvest when eligible

No free numeric input fields for real-world grow recipes.

## Definition of Done

Iteration 1 is done when:

1. Blueprints are loaded and validated from JSON.
2. Runtime state is rehydrated from validated blueprints.
3. One room with one batch can be simulated over deterministic ticks.
4. Environmental values, growth, stress, maturity, cost, and quality potential are reproducibly calculated.
5. The player can adjust a small set of operating modes.
6. These changes have visible consequences.
7. Harvest is possible.
8. A batch report explains the result.
9. The UI is based on the three core screens.
10. No out-of-scope systems were implemented.
