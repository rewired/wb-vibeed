# WB VibeEd

**WB VibeEd** is a deterministic single-room grow operations simulator.

This repository skeleton is intentionally narrow. It exists to keep the first playable iteration focused on one room, one batch, one cycle, visible telemetry, a small number of operating modes, and a useful batch report.

## Development language

- Conversation and design discussion may happen in German.
- Documentation, code, identifiers, comments, Codex prompts, and project files are written in English.
- Game UI labels are English for now to keep read models, contracts, and frontend implementation aligned.

## Iteration 1 product formula

WB VibeEd is not a tycoon, not a grow handbook, and not a global economy simulation.

For Iteration 1, WB VibeEd is a deterministic, readable, playable single-room grow operations loop.

## Repository layout

```text
apps/
  web/                     # Frontend shell for screen implementation
packages/
  engine/                  # Deterministic runtime, tick systems, state transitions
  facade/                  # Read models for UI screens
  shared/                  # Shared types and constants
  tools/                   # Data loading, validation, CLI helpers
data/
  blueprints/              # Static JSON blueprints
  worlds/                  # Demo world definitions
  schemas/                 # JSON schema / validation references
docs/
  00_project/              # Scope, rules, product definition
  10_ui/                   # UI workflow and screen contracts
  20_codex/                # Codex handoff documents
  30_decisions/            # Architecture decision records
  90_backlog/              # Parking lot for later ideas
prompts/
  image/                   # Image generation prompts for UI mockups
  codex/                   # Short task prompts for implementation work
assets/
  ui-mockups/              # Generated UI mockups go here
```

## First working target

The first meaningful demo should load JSON blueprints, validate them, rehydrate runtime state, simulate one room with one batch over deterministic ticks, expose an operations cockpit read model, and produce a batch report.

## Hard boundary

This project uses abstract game values. It must not become a real-world cultivation guide. Avoid real strains, real recipes, exact cultivation parameters, or actionable step-by-step growing advice.
