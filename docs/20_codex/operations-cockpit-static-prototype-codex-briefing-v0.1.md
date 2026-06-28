# Operations Cockpit Static Prototype — Codex Briefing v0.1

Status: Draft v0.1  
Scope: Iteration 1 / Static UI Prototype  
Target: Codex implementation briefing  
Language: English  

---

## 1. Objective

Build a static desktop UI prototype for the Operations Cockpit screen.

The prototype represents the main screen of a deterministic single-room grow-operations simulation.

This task is UI-only.
It must not implement the simulation loop yet.
It must not introduce gameplay systems beyond the approved screen contract.

The result should be a clean, readable, dark industrial dashboard that can later be wired to deterministic runtime state.

---

## 2. Required Source Documents

Use these documents as the source of truth:

```text
docs/10_ui/operations-cockpit-widget-taxonomy-v1.md
docs/10_ui/operations-cockpit-layout-content-v1.md
docs/10_ui/operations-cockpit-screen-contract-v0.1.md
docs/prompts/operations-cockpit-mockup-prompt-v1.md
```

The screen contract overrides the mockup prompt if there is any conflict.

---

## 3. Implementation Goal

Create one static screen:

```text
Operations Cockpit
```

The screen must show:

- one room
- one zone
- one batch
- day / tick / phase
- room / zone visualization placeholder
- batch status
- environmental telemetry
- light / climate / irrigation controls
- telemetry trends
- alerts and event log
- energy and operating cost
- utility status

---

## 4. Non-Goals

Do not implement:

- real simulation progression
- save/load
- runtime rehydration
- JSON blueprint loading
- harvest flow
- batch report generation
- real grow recipes
- strain or genetics systems
- pests or disease systems
- employee systems
- police or authority systems
- market, sales, or logistics systems
- world map
- multiplayer
- base-building
- complex settings screens
- responsive mobile UI

Do not add extra dashboard sections because they look interesting.

---

## 5. UI Style Direction

The screen should look like:

- dark industrial control dashboard
- technical and readable
- slightly worn but not dirty
- grounded HMI / SCADA influence
- green and amber status accents
- dense but controlled
- modular panel layout
- clear hierarchy

Avoid:

- cartoon farm style
- cannabis branding
- marijuana leaf icons
- stoner aesthetic
- lifestyle product branding
- excessive neon
- fake sci-fi holograms
- flashy game HUD effects
- decorative widgets without function

---

## 6. Allowed Widget Families

Only use these widget families:

1. Header Stat
2. Section Panel
3. Metric Tile
4. Trend Tile
5. Control Tile
6. Progress Tile
7. Log List
8. Room Visualization Panel

Do not introduce a new widget type for every data point.

---

## 7. Screen Layout

Use a single desktop 16:9-style cockpit layout.

Recommended structure:

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

The main room visualization should be the largest visual anchor.
The right column should contain batch status and environmental telemetry.
The lower area should contain controls, trends, and the event log.

---

## 8. Panel IDs

Use these stable panel IDs in code:

```text
panel.topHeader
panel.leftNavigation
panel.roomOverview
panel.batchStatus
panel.environmentalTelemetry
panel.controlPanel
panel.telemetryTrends
panel.eventLog
panel.energyCost
panel.utilityStatus
```

These IDs should be visible in component names, data structures, or test selectors where appropriate.

---

## 9. Required Data Snapshot

Use this static mock state.
Do not invent additional gameplay fields.

```ts
export const operationsCockpitMockState = {
  simulation: {
    day: 24,
    tick: 288,
    phase: "Mid Cycle",
    overallStatus: "Normal"
  },

  room: {
    id: "R-01",
    label: "Room R-01"
  },

  zone: {
    id: "Z-01",
    label: "Zone Z-01"
  },

  batch: {
    id: "B-017",
    cycleProgress: 61,
    cycleDayText: "Day 24 of 39",
    healthIndex: 78,
    moistureBalance: 54,
    yieldForecast: 1248,
    qualityEstimate: 82,
    qualityLabel: "Good"
  },

  environment: {
    airTemperature: {
      label: "Air Temperature",
      value: 24.6,
      unit: "°C",
      reference: "Target 24.0 °C",
      status: "normal"
    },
    relativeHumidity: {
      label: "Relative Humidity",
      value: 58,
      unit: "%",
      reference: "Target 55 %",
      status: "normal"
    },
    co2Index: {
      label: "CO2 Index",
      value: 1150,
      unit: "ppm",
      reference: "Target 1200 ppm",
      status: "normal"
    },
    lightOutput: {
      label: "Light Output",
      value: 72,
      unit: "%",
      reference: "Target 75 %",
      status: "normal"
    },
    irrigationIndex: {
      label: "Irrigation Index",
      value: 46,
      unit: "%",
      reference: "Target 45 %",
      status: "normal"
    },
    airflow: {
      label: "Airflow",
      value: 68,
      unit: "%",
      reference: "Target 65 %",
      status: "normal"
    },
    nutrientReservoir: {
      label: "Nutrient Reservoir",
      value: 79,
      unit: "%",
      reference: "Refill Threshold 20 %",
      status: "normal"
    }
  },

  controls: {
    light: {
      label: "Light",
      activeMode: "Balanced",
      activeControl: "Auto",
      primaryTuningLabel: "Intensity",
      primaryTuningValue: 72,
      primaryTuningUnit: "%"
    },
    climate: {
      label: "Climate",
      activeMode: "Balanced",
      activeControl: "Auto",
      primaryTuningLabel: "Target Bias",
      primaryTuningValue: "Balanced"
    },
    irrigation: {
      label: "Irrigation",
      activeMode: "Balanced",
      activeControl: "Auto",
      primaryTuningLabel: "Irrigation Index",
      primaryTuningValue: 46,
      primaryTuningUnit: "%"
    }
  },

  energy: {
    powerNow: 18.6,
    powerNowUnit: "kW",
    dailyEnergy: 447.2,
    dailyEnergyUnit: "kWh",
    dailyCost: 152.34,
    weeklyCost: 1084.71,
    currency: "$",
    efficiency: 2.41,
    efficiencyUnit: "score"
  },

  utilityStatus: {
    grid: {
      label: "Grid",
      value: "Normal",
      status: "normal"
    },
    backupPower: {
      label: "Backup Power",
      value: "Available",
      status: "normal"
    },
    waterSupply: {
      label: "Water Supply",
      value: "Facility Line",
      secondary: "Flow Stable",
      status: "normal"
    },
    network: {
      label: "Network",
      value: "Connected",
      status: "normal"
    }
  },

  eventLog: [
    {
      time: "11:42:15",
      day: 24,
      tick: 286,
      severity: "info",
      title: "Irrigation cycle complete.",
      detail: "Zone Z-01"
    },
    {
      time: "10:17:08",
      day: 24,
      tick: 281,
      severity: "warning",
      title: "Humidity deviation detected.",
      detail: "Outside target band for 12 minutes."
    },
    {
      time: "09:58:31",
      day: 24,
      tick: 279,
      severity: "info",
      title: "Light mode changed to Balanced.",
      detail: "System automation"
    },
    {
      time: "08:21:05",
      day: 24,
      tick: 271,
      severity: "info",
      title: "CO2 enrichment active.",
      detail: "Target index restored."
    },
    {
      time: "07:45:10",
      day: 24,
      tick: 268,
      severity: "info",
      title: "Filter maintenance due in 3 days.",
      detail: "Utility system notice."
    }
  ]
} as const;
```

---

## 10. Nutrient Reservoir vs Water Supply Rule

This rule is mandatory.

```text
Nutrient Reservoir != Water Supply
```

The nutrient reservoir is a fertilizer / nutrient reservoir.
It appears only as a normal telemetry metric tile.
It must use the same Metric Tile component as the other environmental telemetry values.

Do not create:

- a tank widget
- a vessel diagram
- a vertical fill gauge
- a unique reservoir component
- a custom reservoir visualization

Water supply is facility-fed.
It appears only in Utility Status:

```text
Water Supply
Facility Line
Flow Stable
```

Do not show water supply as a large telemetry component.

---

## 11. Component Guidance

A suitable implementation may use components similar to:

```text
OperationsCockpitScreen
TopHeader
LeftNavigation
SectionPanel
HeaderStat
MetricTile
TrendTile
ControlTile
ProgressTile
LogList
RoomVisualization
EnergyCostSummary
UtilityStatusPanel
```

Keep components small and boring.
Boring is good here.
The goal is structural clarity, not component cleverness.

---

## 12. Interaction Rules for Static Prototype

The static prototype may visually show controls, but no real simulation logic should run.

Allowed:

- Hover states
- Active mode highlighting
- Active Auto / Manual highlighting
- Static range buttons for trends
- Static event-log filter buttons

Not allowed yet:

- changing simulation values
- advancing ticks
- changing phase
- calculating yields
- dynamic chart generation from simulation
- opening sub-screens
- editing schedules
- saving state

If a control is clickable for UI demonstration, keep the change local and cosmetic only.
Do not mutate a simulation model.

---

## 13. Visual State Rules

Use a small status palette:

```text
normal  -> green
warning -> amber
critical -> red
neutral -> gray
```

Use warning sparingly.
The screen should mostly be stable / normal, with one visible warning in the event log.

Do not color every number aggressively.
Color should support meaning, not decoration.

---

## 14. Room Visualization Requirements

The room visualization should be a UI panel, not an illustration poster.

It should show:

- one room
- one zone
- generic canopy trays or crop tables
- overhead lights
- airflow paths
- sensors
- irrigation markers
- overlay legend

It must not show:

- cannabis leaf icons
- detailed plant realism as the focus
- humans
- lifestyle props
- brand logos
- cartoon farm assets
- sci-fi holograms

A simple schematic / semi-isometric placeholder is acceptable for this prototype.

---

## 15. Trend Chart Rules

Use exactly four trend tiles:

```text
Air Temperature
Relative Humidity
Irrigation / Moisture
Power Draw
```

Use one shared chart style.
The chart data may be hardcoded placeholder arrays.
Do not add additional analytics charts.
Do not add detailed sensor-level graphs.

---

## 16. Event Log Rules

The event log shows recent simulation events.

Rules:

- keep entries short
- show time, day, tick, severity, title, and detail
- include one warning entry
- do not include story prose
- do not include police, market, logistics, or external-world events
- do not include real cultivation advice

---

## 17. Suggested File Placement

Adapt to the existing project stack, but keep the concept roughly like this:

```text
src/
  features/
    operations-cockpit/
      OperationsCockpitScreen.tsx
      operationsCockpitMockState.ts
      components/
        TopHeader.tsx
        LeftNavigation.tsx
        SectionPanel.tsx
        HeaderStat.tsx
        MetricTile.tsx
        TrendTile.tsx
        ControlTile.tsx
        ProgressTile.tsx
        LogList.tsx
        RoomVisualization.tsx
        EnergyCostSummary.tsx
        UtilityStatusPanel.tsx
      operations-cockpit.css
```

If the project is not React-based, keep the same conceptual split:

- one screen entry
- one mock-state file
- small reusable widget components
- one dedicated stylesheet/module

---

## 18. Acceptance Criteria

The implementation is acceptable when:

- the screen renders as one coherent desktop cockpit
- the layout follows the approved screen contract
- all required panels are present
- all required telemetry metrics are present
- all telemetry metrics use the same Metric Tile component
- Nutrient Reservoir does not use a special widget
- Water Supply appears only in Utility Status
- exactly three Control Tiles are present
- exactly four Trend Tiles are present
- the event log contains the required entries
- no real grow instructions are shown
- no excluded systems appear
- the visual style is dark, industrial, technical, and readable
- the UI is dense but not overloaded
- the implementation uses static mock data only

---

## 19. Implementation Warning

Do not overbuild.

This task is not the simulation.
This task is not the full game UI.
This task is not a dashboard framework.

It is one static screen prototype intended to validate layout, visual grammar, and screen structure before simulation binding.
