# ADR-0001: JSON Blueprints to Runtime State Rehydration

## Status

Accepted for Iteration 1.

## Context

The project uses static JSON blueprints for data definitions and deterministic runtime state for simulation.

## Decision

Blueprint JSON files are loaded and validated before use. The simulation must not run directly on raw JSON objects. Validated blueprints are transformed into runtime state records. Deterministic systems operate on runtime state.

## Consequences

Positive:

- Easier testing
- Reproducible simulation
- Clear separation of static data and mutable runtime state
- Future modding and balancing become more manageable

Negative:

- More boilerplate in the beginning
- Requires clear schemas and factories

## Non-goal

This does not mean rehydrating raw JSON into rich class instances with hidden methods. Behavior belongs to explicit systems/services.
