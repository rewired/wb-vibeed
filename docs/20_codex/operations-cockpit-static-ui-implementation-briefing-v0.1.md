# Operations Cockpit Static UI Implementation Briefing v0.1

Status: Draft v0.1  
Scope: Iteration 1 / Single-Room-Grow-Loop  
Audience: Codex / implementation agent  
Language: English  
Purpose: Build a static, contract-driven Operations Cockpit UI prototype without adding simulation logic.

---

## 1. Objective

Implement a static desktop UI prototype for the `Operations Cockpit` screen.

The prototype must render the main cockpit screen for one active grow room, one zone, and one batch using fixed mock state.

This task is UI-only.

Do not implement the simulation loop.  
Do not invent new gameplay systems.  
Do not add real grow instructions.  
Do not add dynamic data generation.  
Do not add routing unless the project already has it and it is required to show the screen.

The goal is to turn the existing screen contract and mock state into a readable, structured, dark industrial control dashboard.

---

## 2. Source Documents

Use these files as authoritative inputs:

```text
docs/ui/operations-cockpit-widget-taxonomy-v1.md
docs/ui/operations-cockpit-layout-content-v1.md
docs/ui/operations-cockpit-screen-contract-v0.1.md
docs/data/operations-cockpit-mock-state-v0.1.md
```

Optional visual reference / prompt context:

```text
docs/prompts/operations-cockpit-mockup-prompt-v1.md
```

Do not contradict these documents.

If implementation choices are needed, choose the simpler option that preserves the contract.

---

## 3. Implementation Scope

Build exactly one static cockpit screen.

The screen must include:

- top header with global simulation context
- left navigation rail
- main room / zone visualization panel
- batch status panel
- environmental telemetry panel
- control panel
- telemetry trends panel
- alerts & event log panel
- energy & operating cost panel
- compact utility status panel

The UI may use local component state only for visual toggle selection if the existing frontend stack makes this easy, but it must not mutate or simulate the underlying mock data.

---

## 4. Required Layout

Use a single 16:9-oriented desktop cockpit layout.

Recommended layout structure:

```text
+--------------------------------------------------------------------------------+
| TOP HEADER: Room | Zone | Batch | Day | Tick | Phase | Status | Power | Cost   |
+------+-------------------------------------------------------------------------+
| NAV  | MAIN ROOM / ZONE OVERVIEW                         | BATCH STATUS       |
|      |                                                     +--------------------+
|      |                                                     | ENV TELEMETRY      |
|      +-------------------------+---------------------------+--------------------+
|      | CONTROL PANEL           | TELEMETRY TRENDS          | ALERTS & EVENT LOG |
|      +-------------------------+---------------------------+--------------------+
|      | ENERGY & OPERATING COST SUMMARY                    | UTILITY STATUS     |
+------+-------------------------------------------------------------------------+
```

The layout should be dense but not overloaded.

Avoid dashboard clutter.

---

## 5. Required Widget Families

Use only these widget families:

1. Header Stat
2. Section Panel
3. Metric Tile
4. Trend Tile
5. Control Tile
6. Progress Tile
7. Log List
8. Room Visualization Panel

Do not introduce special-purpose widgets for individual values.

In particular:

- `Nutrient Reservoir` must be rendered as a normal Metric Tile.
- It must not use a tank illustration.
- It must not use a vertical fill gauge.
- It must not use a custom reservoir component.
- `Water Supply` belongs only in Utility Status and represents the facility line / house connection.

---

## 6. Data Source

Create a local mock state file if one does not already exist.

Preferred location:

```text
src/features/operations-cockpit/mockState.ts
```

or, if the project does not use feature folders:

```text
src/mock/operationsCockpitState.ts
```

The mock state must follow the shape defined in:

```text
docs/data/operations-cockpit-mock-state-v0.1.md
```

The screen must render from this mock state instead of hardcoding values inside individual components.

Hardcoded labels are acceptable.  
Hardcoded values are not acceptable except in the mock state file.

---

## 7. Suggested Component Structure

Use the project’s existing frontend conventions. If no convention exists, use this structure:

```text
src/features/operations-cockpit/
  OperationsCockpitScreen.tsx
  mockState.ts
  components/
    HeaderStat.tsx
    SectionPanel.tsx
    MetricTile.tsx
    TrendTile.tsx
    ControlTile.tsx
    ProgressTile.tsx
    LogList.tsx
    RoomVisualization.tsx
    OperationsHeader.tsx
    NavigationRail.tsx
  operationsCockpit.css
```

If the project does not use React/TSX, translate the same structure into the active stack.

Do not add unnecessary abstractions.

Avoid over-engineering.

---

## 8. Visual Direction

The UI should feel like a grounded industrial operations dashboard:

- dark charcoal / gunmetal base
- subtle worn industrial surfaces
- readable technical typography
- green status accents
- amber warning accents
- thin borders and modular panels
- restrained highlights
- compact but clear spacing

Avoid:

- cartoon farm visuals
- stoner aesthetic
- cannabis leaf iconography
- lifestyle branding
- excessive neon
- fake sci-fi holograms
- decorative dashboards for their own sake
- too many chart styles
- too many gauge styles

This is a simulation cockpit, not a poster.

---

## 9. Required Content

### 9.1 Header

Render:

- Operations Cockpit
- Room: R-01
- Zone: Z-01
- Batch: B-017
- Day: 24
- Tick: 288
- Phase: Mid Cycle
- Overall Status: Normal
- Power Now: 18.6 kW
- Daily Cost: $152.34

### 9.2 Navigation Rail

Render these items:

- Cockpit
- Rooms
- Schedule
- History
- Maintenance
- Settings
- Log Out

Only `Cockpit` is active.

### 9.3 Room / Zone Overview

Render a simplified technical room visualization.

It must show:

- one room
- one zone
- generic canopy trays or crop tables
- overhead lights
- ducts / airflow paths
- sensor markers
- irrigation markers
- legend

Allowed legend entries:

- Supply Air
- Return Air
- Exhaust
- Light
- Irrigation
- Sensors

The visualization can be CSS/SVG/HTML-based. It does not need to be photorealistic.

Keep it abstract and operational.

### 9.4 Batch Status

Render:

- Cycle Progress: 61%, Day 24 of 39
- Batch Health Index: 78 / 100
- Moisture Balance: 54%
- Yield Forecast: 1248 units
- Quality Estimate: 82%, Good

### 9.5 Environmental Telemetry

Render exactly seven Metric Tiles:

- Air Temperature: 24.6 °C, Target 24.0 °C
- Relative Humidity: 58 %, Target 55 %
- CO2 Index: 1150 ppm, Target 1200 ppm
- Light Output: 72 %, Target 75 %
- Irrigation Index: 46 %, Target 45 %
- Airflow: 68 %, Target 65 %
- Nutrient Reservoir: 79 %, Refill Threshold 20 %

All seven must use the same Metric Tile component and visual treatment.

### 9.6 Control Panel

Render exactly three Control Tiles:

- Light
- Climate
- Irrigation

Each Control Tile must show:

- mode selector: Eco | Balanced | Push
- active mode: Balanced
- control state selector: Auto | Manual
- active control state: Auto
- one primary tuning value

Primary tuning values:

- Light: Intensity 72 %
- Climate: Target Bias Balanced
- Irrigation: Irrigation Index 46 %

Controls may look interactive but do not need to change simulation state in this task.

### 9.7 Telemetry Trends

Render exactly four Trend Tiles:

- Air Temperature
- Relative Humidity
- Irrigation / Moisture
- Power Draw

Use one shared chart style.

Simple SVG polylines, CSS-only fake charts, or minimal chart components are acceptable.

Do not add a chart library unless the project already uses one.

### 9.8 Alerts & Event Log

Render filters:

- All
- Alerts
- Info

Render event entries from the mock state.

Each row must include:

- time
- day / tick
- severity
- title
- detail

Allowed severities:

- info
- warning
- critical

### 9.9 Energy & Operating Cost

Render:

- Power Now: 18.6 kW
- Daily Energy: 447.2 kWh
- Daily Cost: $152.34
- Weekly Cost: $1,084.71
- Efficiency: 2.41 score

### 9.10 Utility Status

Render:

- Grid: Normal
- Backup Power: Available
- Water Supply: Facility Line, Flow Stable
- Network: Connected

Water Supply must not be confused with Nutrient Reservoir.

---

## 10. Interaction Rules

For this static prototype:

Allowed:

- hover states
- active visual state for selected controls
- fake tab state for `3D / Schematic`, if local-only
- fake filter state for event log, if local-only

Not allowed:

- simulation tick advancement
- recalculating telemetry
- changing batch state
- generating random events
- adding persistence
- adding backend calls
- adding real control logic
- adding grow recipes or instructions

---

## 11. Styling Rules

Use clear class names or component-local styles.

Recommended design tokens:

```text
background: near-black / charcoal
panel: dark gunmetal
panel border: muted gray
text primary: off-white
text secondary: cool gray
status normal: green
status warning: amber
status critical: muted red
accent: green / amber only
```

Do not use highly saturated neon colors.

Do not use a bright clean SaaS dashboard look.

---

## 12. Accessibility / Readability

The prototype must remain readable at desktop resolution.

Requirements:

- avoid tiny unreadable text
- preserve clear contrast
- keep panels aligned
- do not overlay text on complex visuals
- avoid excessive icon-only meaning
- provide text labels for all major values

---

## 13. Implementation Constraints

Do not modify unrelated parts of the app.

Do not reorganize the entire project.

Do not introduce global state management for this screen.

Do not add external dependencies unless already present and appropriate.

Do not implement systems listed as non-goals.

Keep the implementation small, direct, and easy to replace later.

---

## 14. Acceptance Criteria

The implementation is acceptable when:

- the Operations Cockpit screen renders successfully
- all required panels are visible
- all required values come from the mock state file
- the layout follows the screen contract
- the telemetry section contains exactly seven Metric Tiles
- Nutrient Reservoir is rendered as a normal Metric Tile
- Water Supply appears only in Utility Status
- the control panel contains exactly three Control Tiles
- the trend panel contains exactly four Trend Tiles
- the event log shows the defined mock events
- no real cultivation instructions are present
- no excluded systems are added
- the screen visually matches the dark industrial control-dashboard direction
- the implementation remains static and deterministic

---

## 15. Non-Goals

Do not implement:

- real grow recipes
- strain / genetics systems
- pest / disease systems
- employee systems
- police / authority systems
- world map
- market / sales / logistics
- multiplayer
- base-building
- real scheduling logic
- simulation runtime
- harvest report generation
- save/load
- backend services
- procedural data generation

---

## 16. Delivery Notes

When finished, report:

- files created
- files modified
- how to open the screen locally
- any assumptions made
- any deviations from the contract

If something in the existing project structure conflicts with this briefing, prefer minimal adaptation over broad refactoring.
