# Operations Cockpit — Codex Handoff Prompt v0.1

Status: Draft v0.1  
Scope: Iteration 1 / Static UI Prototype  
Target: Codex implementation task  
Language: English  

---

## 1. Task

Implement the first static UI prototype for the `Operations Cockpit` screen.

The cockpit is the main screen for monitoring one active grow room and controlling a few abstract operating modes in a deterministic grow-operations simulation.

This task is UI-only.
Do not implement the simulation engine.
Do not invent additional game systems.
Do not add real cultivation guidance.

---

## 2. Source Documents

Use these documents as the authoritative input:

```text
docs/10_ui/operations-cockpit-widget-taxonomy-v1.md
docs/10_ui/operations-cockpit-layout-content-v1.md
docs/10_ui/screen-contracts/operations-cockpit-screen-contract-v0.1.md
docs/80_data/operations-cockpit-mock-state-v0.1.md
docs/20_codex/operations-cockpit-static-prototype-codex-briefing-v0.1.md
docs/20_codex/operations-cockpit-static-ui-implementation-briefing-v0.1.md
```

If the documents conflict, prefer the screen contract and mock state file.

## 2.1 Project Skills

Use the existing project skills where applicable:

```text
.agents/skills/pnpm/SKILL.md
.agents/skills/typescript-advanced-types/SKILL.md
.agents/skills/web-design-guidelines/SKILL.md
```

Do not ignore the existing repository structure.
Do not introduce new documentation directories.
Place files only in the existing numbered docs folders and existing app source folders unless the task explicitly requires a new folder.

---

## 3. Required Outcome

Create a desktop-oriented static cockpit screen that presents:

- top header with room, zone, batch, day, tick, phase, status, power, and daily cost
- left navigation rail
- main room / zone visualization panel
- batch status panel
- environmental telemetry panel
- control panel with Light, Climate, and Irrigation controls
- telemetry trends panel
- alerts & event log panel
- energy & operating cost panel
- compact utility status panel

The screen should look like a dark industrial control dashboard:

- charcoal / gunmetal background
- readable technical typography
- subtle borders and panel separation
- restrained green and amber status accents
- dense but controlled layout
- no cartoon farm style
- no stoner aesthetic
- no cannabis leaf iconography
- no fake sci-fi holograms
- no excessive neon

---

## 4. Hard Scope Boundaries

Do not implement or add:

- real grow recipes
- strain or genetics systems
- pest or disease systems
- employee systems
- police or authority systems
- world map
- market / logistics systems
- multiplayer systems
- base-building systems
- advanced device-level controls
- detailed schedule editors
- complex analytics pages
- reservoir-specific tank widgets
- cannabis branding or lifestyle visuals

---

## 5. Data Source

Use a local static mock state object based on:

```text
docs/80_data/operations-cockpit-mock-state-v0.1.md
```

The static prototype must render from that mock state, not from hardcoded JSX/HTML text scattered across components.

Recommended location:

```text
src/features/operations-cockpit/mock/operationsCockpitMockState.ts
```

Use TypeScript types where the project supports TypeScript.

---

## 6. Recommended Component Structure

Create a feature-local structure similar to:

```text
src/features/operations-cockpit/
  OperationsCockpitScreen.tsx
  mock/
    operationsCockpitMockState.ts
  types/
    operationsCockpitTypes.ts
  components/
    HeaderBar.tsx
    NavigationRail.tsx
    SectionPanel.tsx
    MetricTile.tsx
    ProgressTile.tsx
    TrendTile.tsx
    ControlTile.tsx
    RoomVisualizationPanel.tsx
    EventLogList.tsx
    EnergyCostPanel.tsx
    UtilityStatusPanel.tsx
  styles/
    operationsCockpit.css
```

Adapt filenames to the existing project conventions if needed.
Do not create a new framework or large architectural layer.

---

## 7. Widget Rules

The UI may only use these widget families:

1. Header Stat
2. Section Panel
3. Metric Tile
4. Trend Tile
5. Control Tile
6. Progress Tile
7. Log List
8. Room Visualization Panel

Do not create a custom widget type for every value.
Reuse the existing component families.

---

## 8. Environmental Telemetry Rules

The Environmental Telemetry panel must contain exactly these seven metric tiles:

- Air Temperature
- Relative Humidity
- CO2 Index
- Light Output
- Irrigation Index
- Airflow
- Nutrient Reservoir

All seven metrics must use the same `MetricTile` component.

Important:

- `Nutrient Reservoir` is a fertilizer / nutrient reservoir.
- It must be displayed as a normal metric tile.
- Do not create a special tank widget.
- Do not draw a vessel diagram.
- Do not use a vertical fill gauge.
- Do not create a custom reservoir component.

The facility water supply appears only in the Utility Status panel:

```text
Water Supply
Facility Line
Flow Stable
```

---

## 9. Control Rules

The Control Panel must contain exactly three control tiles:

- Light
- Climate
- Irrigation

Each control tile contains:

```text
Mode: Eco | Balanced | Push
Control: Auto | Manual
Primary tuning value
```

Allowed primary tuning values:

- Light: Intensity
- Climate: Target Bias
- Irrigation: Irrigation Index

Controls may visually react locally in the static prototype only if this can be done simply.
No simulation effects are required.
No hidden advanced controls.

---

## 10. Trend Rules

The Telemetry Trends panel must contain exactly four trend tiles:

- Air Temperature
- Relative Humidity
- Irrigation / Moisture
- Power Draw

Use one shared mini-chart visual style.
Static SVG, CSS, or simple placeholder line charts are acceptable.
Do not add external charting libraries unless the project already uses one.

---

## 11. Event Log Rules

The event log shows recent simulation events only.

Allowed severities:

- Info
- Warning
- Critical

Keep event rows short and functional.
No narrative flavor spam.
No external-world events.
No law enforcement, market, employee, logistics, or world-map events.

---

## 12. Room Visualization Rules

The room visualization should be an abstract operational schematic.

It may show:

- one room
- one zone
- generic canopy trays or crop tables
- overhead lights
- ducts / airflow paths
- sensor markers
- irrigation markers
- overlay legend

It must not show:

- detailed plant realism as the focus
- cannabis leaf iconography
- grow instructions
- lifestyle props
- people
- cartoon styling
- sci-fi holograms

If implementing the visualization as pure HTML/CSS/SVG, keep it simple and readable.
A schematic is preferable to overbuilt pseudo-3D.

---

## 13. Visual Design Rules

Use a consistent dark industrial dashboard style.

Recommended design tokens:

```text
background: near-black / charcoal
panel: dark gunmetal
panel border: muted gray
text primary: off-white
text secondary: muted gray
status normal: green
status warning: amber
status critical: red / muted red
accent: restrained green
```

Avoid:

- bright neon overload
- colorful dashboard clutter
- glossy SaaS marketing style
- cyberpunk excess
- cartoon game UI

---

## 14. Acceptance Criteria

The implementation is acceptable when:

- the cockpit renders as one coherent desktop screen
- all required panels are present
- all values come from the mock state object
- environmental telemetry contains exactly seven metric tiles
- Nutrient Reservoir uses the same MetricTile component as the other telemetry values
- Water Supply appears only in Utility Status
- exactly three control tiles exist
- exactly four trend tiles exist
- event log entries are functional and compact
- the UI style matches the dark industrial cockpit direction
- no prohibited systems or themes are introduced
- the implementation remains static and does not invent simulation behavior

---

## 15. Suggested Work Order

1. Locate the existing frontend structure.
2. Add the feature-local mock state and types.
3. Build reusable widget components.
4. Compose `OperationsCockpitScreen` from the required panels.
5. Add styling.
6. Wire the screen into the existing app route or entry point using the least invasive approach.
7. Verify the acceptance criteria.

---

## 16. Do Not Overbuild

This is a first static prototype.
The goal is to create a readable and inspectable screen foundation, not a full application.

Prefer simple, explicit, maintainable code over clever abstractions.
