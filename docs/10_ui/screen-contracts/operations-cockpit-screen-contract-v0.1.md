# Operations Cockpit Screen Contract v0.1

Status: Draft v0.1  
Scope: Iteration 1 / Single-Room-Grow-Loop  
Language: English  
Purpose: Implementation-facing screen contract for the Operations Cockpit UI

---

## 1. Screen Purpose

The Operations Cockpit is the primary monitoring and control screen for one active grow room in Iteration 1.

It provides:

- current room / zone / batch context
- batch progress and abstract outcome indicators
- abstract environmental telemetry
- recent telemetry trends
- a small set of player-facing operating controls
- energy and operating-cost overview
- recent alerts and simulation events

The cockpit is a simulation operations screen, not a real-world cultivation guide.

---

## 2. Screen Scope

Iteration 1 represents exactly:

- one room
- one zone
- one active batch
- deterministic simulation state
- abstract environmental values
- abstract operating modes
- harvest readiness and batch reporting readiness

The screen must not imply real cultivation instructions or real-world operating procedures.

---

## 3. Explicit Non-Goals

The Operations Cockpit v0.1 must not include:

- real cultivation recipes
- strain or genetics information
- pest or disease systems
- employee systems
- police or authority systems
- world map
- market, sales, or logistics systems
- multiplayer systems
- base-building controls
- detailed device-level configuration
- excessive telemetry tables
- cannabis leaf icons
- stoner, lifestyle, or cannabis-branding aesthetics
- fake sci-fi holograms
- decorative dashboard widgets without gameplay purpose

---

## 4. Screen Layout Regions

The screen is a single desktop cockpit layout.

Recommended aspect ratio:

```text
16:9
```

Primary layout regions:

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

---

## 5. Allowed Widget Families

Only the following widget families are allowed in Iteration 1:

1. Header Stat
2. Section Panel
3. Metric Tile
4. Trend Tile
5. Control Tile
6. Progress Tile
7. Log List
8. Room Visualization Panel

No additional widget family should be introduced unless a later contract revision explicitly allows it.

---

## 6. Panel Registry

| Panel ID | Panel Name | Widget Family | Purpose |
|---|---|---|---|
| `top_header` | Top Header | Header Stat group | Global screen and simulation context |
| `left_nav` | Left Navigation Rail | Navigation list | Persistent navigation placeholder |
| `room_overview` | Room / Zone Overview | Room Visualization Panel | Spatial state overview for the active room |
| `batch_status` | Batch Status | Progress Tile group | Batch progress and abstract outcome indicators |
| `environmental_telemetry` | Environmental Telemetry | Metric Tile group | Current abstract room telemetry |
| `control_panel` | Control Panel | Control Tile group | Player-facing operating modes |
| `telemetry_trends` | Telemetry Trends | Trend Tile group | Recent telemetry movement |
| `event_log` | Alerts & Event Log | Log List | Recent events and warnings |
| `energy_cost` | Energy & Operating Cost | Metric summary group | Energy and cost overview |
| `utility_status` | Utility Status | Compact status list | Facility support state |

---

## 7. Data Binding Model

The screen reads from a single immutable simulation snapshot for the current tick.

Suggested root object:

```ts
interface OperationsCockpitSnapshot {
  screen: ScreenContext;
  simulation: SimulationClock;
  room: RoomState;
  zone: ZoneState;
  batch: BatchState;
  environment: EnvironmentState;
  controls: ControlState;
  trends: TrendState;
  energy: EnergyState;
  utility: UtilityState;
  events: EventLogEntry[];
}
```

The UI must not compute authoritative simulation outcomes.  
It may format, group, color, and display values supplied by the runtime.

---

## 8. Core State Types

### 8.1 Screen Context

```ts
interface ScreenContext {
  title: 'Operations Cockpit';
  activePanel?: string;
}
```

### 8.2 Simulation Clock

```ts
interface SimulationClock {
  day: number;
  tick: number;
  phase: 'Early Cycle' | 'Mid Cycle' | 'Late Cycle' | 'Harvest Ready';
  overallStatus: StatusLevel;
}
```

### 8.3 Room State

```ts
interface RoomState {
  id: string;
  label: string;
  status: StatusLevel;
}
```

### 8.4 Zone State

```ts
interface ZoneState {
  id: string;
  label: string;
  status: StatusLevel;
}
```

### 8.5 Batch State

```ts
interface BatchState {
  id: string;
  cycleProgressPct: number;
  cycleDayCurrent: number;
  cycleDayTotal: number;
  batchHealthIndex: number;
  moistureBalancePct: number;
  yieldForecastUnits: number;
  qualityEstimatePct: number;
  qualityLabel: 'Poor' | 'Fair' | 'Good' | 'Excellent';
}
```

### 8.6 Environment State

```ts
interface EnvironmentState {
  airTemperature: MetricValue;
  relativeHumidity: MetricValue;
  co2Index: MetricValue;
  lightOutput: MetricValue;
  irrigationIndex: MetricValue;
  airflow: MetricValue;
  nutrientReservoir: MetricValue;
}
```

### 8.7 Metric Value

```ts
interface MetricValue {
  label: string;
  value: number;
  unit: string;
  reference: string;
  status: StatusLevel;
}
```

### 8.8 Control State

```ts
interface ControlState {
  light: SystemControl;
  climate: SystemControl;
  irrigation: SystemControl;
}

interface SystemControl {
  system: 'Light' | 'Climate' | 'Irrigation';
  mode: OperatingMode;
  controlState: ControlMode;
  primaryTuning: PrimaryTuningValue;
}

type OperatingMode = 'Eco' | 'Balanced' | 'Push';
type ControlMode = 'Auto' | 'Manual';

interface PrimaryTuningValue {
  label: string;
  value: number | string;
  unit?: string;
}
```

### 8.9 Trend State

```ts
interface TrendState {
  selectedRange: TrendRange;
  availableRanges: TrendRange[];
  series: TrendSeries[];
}

type TrendRange = '6H' | '24H' | '7D';

interface TrendSeries {
  id: 'air_temperature' | 'relative_humidity' | 'irrigation_moisture' | 'power_draw';
  label: string;
  unit: string;
  currentValue: number;
  points: TrendPoint[];
}

interface TrendPoint {
  tick: number;
  value: number;
}
```

### 8.10 Energy State

```ts
interface EnergyState {
  powerNowKw: number;
  dailyEnergyKwh: number;
  dailyCost: number;
  weeklyCost: number;
  efficiencyScore: number;
  currency: string;
}
```

### 8.11 Utility State

```ts
interface UtilityState {
  grid: UtilityItem;
  backupPower: UtilityItem;
  waterSupply: UtilityItem;
  network: UtilityItem;
}

interface UtilityItem {
  label: string;
  value: string;
  secondary?: string;
  status: StatusLevel;
}
```

### 8.12 Event Log Entry

```ts
interface EventLogEntry {
  id: string;
  time: string;
  day: number;
  tick: number;
  severity: EventSeverity;
  title: string;
  detail?: string;
}

type EventSeverity = 'info' | 'warning' | 'critical';
```

### 8.13 Status Level

```ts
type StatusLevel = 'normal' | 'warning' | 'critical' | 'inactive';
```

---

## 9. Widget Registry

### 9.1 Header Stat Widgets

| Widget ID | Label | Data Path | Read / Write |
|---|---|---|---|
| `header.room` | Room | `room.id` | Read-only |
| `header.zone` | Zone | `zone.id` | Read-only |
| `header.batch` | Batch | `batch.id` | Read-only |
| `header.day` | Day | `simulation.day` | Read-only |
| `header.tick` | Tick | `simulation.tick` | Read-only |
| `header.phase` | Phase | `simulation.phase` | Read-only |
| `header.overall_status` | Overall Status | `simulation.overallStatus` | Read-only |
| `header.power_now` | Power Now | `energy.powerNowKw` | Read-only |
| `header.daily_cost` | Daily Cost | `energy.dailyCost` | Read-only |

---

### 9.2 Batch Status Widgets

| Widget ID | Label | Data Path | Read / Write |
|---|---|---|---|
| `batch.cycle_progress` | Cycle Progress | `batch.cycleProgressPct` | Read-only |
| `batch.health_index` | Batch Health Index | `batch.batchHealthIndex` | Read-only |
| `batch.moisture_balance` | Moisture Balance | `batch.moistureBalancePct` | Read-only |
| `batch.yield_forecast` | Yield Forecast | `batch.yieldForecastUnits` | Read-only |
| `batch.quality_estimate` | Quality Estimate | `batch.qualityEstimatePct` + `batch.qualityLabel` | Read-only |

---

### 9.3 Environmental Telemetry Widgets

Environmental telemetry contains exactly seven Metric Tiles.

| Widget ID | Label | Data Path | Read / Write |
|---|---|---|---|
| `env.air_temperature` | Air Temperature | `environment.airTemperature` | Read-only |
| `env.relative_humidity` | Relative Humidity | `environment.relativeHumidity` | Read-only |
| `env.co2_index` | CO2 Index | `environment.co2Index` | Read-only |
| `env.light_output` | Light Output | `environment.lightOutput` | Read-only |
| `env.irrigation_index` | Irrigation Index | `environment.irrigationIndex` | Read-only |
| `env.airflow` | Airflow | `environment.airflow` | Read-only |
| `env.nutrient_reservoir` | Nutrient Reservoir | `environment.nutrientReservoir` | Read-only |

Rules:

- All seven widgets must use the same Metric Tile component.
- `env.nutrient_reservoir` must not use a special tank widget.
- No vessel diagram, vertical tank indicator, custom reservoir display, or unique fill-state component is allowed.
- Water supply is not shown here. It belongs to `utility.water_supply`.

---

### 9.4 Control Widgets

Control panel contains exactly three Control Tiles.

| Widget ID | Label | Data Path | Interaction |
|---|---|---|---|
| `control.light` | Light | `controls.light` | Mode, control state, primary tuning |
| `control.climate` | Climate | `controls.climate` | Mode, control state, primary tuning |
| `control.irrigation` | Irrigation | `controls.irrigation` | Mode, control state, primary tuning |

Allowed mode values:

```text
Eco | Balanced | Push
```

Allowed control-state values:

```text
Auto | Manual
```

Rules:

- Controls must be abstract simulation controls.
- Controls must not expose real recipes.
- No per-device controls are allowed in v0.1.
- No schedule editor is allowed in the cockpit screen.
- Control changes should dispatch intent events, not mutate simulation state directly.

---

### 9.5 Trend Widgets

Telemetry trends contain exactly four Trend Tiles.

| Widget ID | Label | Data Path | Read / Write |
|---|---|---|---|
| `trend.air_temperature` | Air Temperature | `trends.series[id=air_temperature]` | Read-only |
| `trend.relative_humidity` | Relative Humidity | `trends.series[id=relative_humidity]` | Read-only |
| `trend.irrigation_moisture` | Irrigation / Moisture | `trends.series[id=irrigation_moisture]` | Read-only |
| `trend.power_draw` | Power Draw | `trends.series[id=power_draw]` | Read-only |

Rules:

- All trend widgets use the same chart component.
- Do not mix line, bar, radial, and sparkline chart styles in this panel.
- The default range is `24H`.
- The range selector applies to all trend widgets together.

---

### 9.6 Event Log Widgets

| Widget ID | Label | Data Path | Read / Write |
|---|---|---|---|
| `event_log.filters` | Filters | local UI state | Read-only filter selection |
| `event_log.entries` | Entries | `events[]` | Read-only |

Allowed filters:

```text
All | Alerts | Info
```

Filter behavior:

- `All` shows all severities.
- `Alerts` shows `warning` and `critical`.
- `Info` shows only `info`.

Rules:

- Maximum visible entries in the cockpit: 5.
- Longer history belongs to a later History screen.
- No external-world events in Iteration 1.

---

### 9.7 Energy & Cost Widgets

| Widget ID | Label | Data Path | Read / Write |
|---|---|---|---|
| `energy.power_now` | Power Now | `energy.powerNowKw` | Read-only |
| `energy.daily_energy` | Daily Energy | `energy.dailyEnergyKwh` | Read-only |
| `energy.daily_cost` | Daily Cost | `energy.dailyCost` | Read-only |
| `energy.weekly_cost` | Weekly Cost | `energy.weeklyCost` | Read-only |
| `energy.efficiency` | Efficiency | `energy.efficiencyScore` | Read-only |

Rules:

- Cost model is abstract.
- No market data.
- No sales data.
- No accounting breakdown.

---

### 9.8 Utility Status Widgets

| Widget ID | Label | Data Path | Read / Write |
|---|---|---|---|
| `utility.grid` | Grid | `utility.grid` | Read-only |
| `utility.backup_power` | Backup Power | `utility.backupPower` | Read-only |
| `utility.water_supply` | Water Supply | `utility.waterSupply` | Read-only |
| `utility.network` | Network | `utility.network` | Read-only |

Rules:

- Water Supply refers to facility line / house connection.
- Water Supply is not the nutrient reservoir.
- Nutrient Reservoir appears only as `env.nutrient_reservoir`.
- Utility Status must remain compact.

---

## 10. Interaction Contract

### 10.1 Allowed Player Interactions

The cockpit allows only these interactions in v0.1:

1. Change Light mode: `Eco | Balanced | Push`
2. Change Light control state: `Auto | Manual`
3. Adjust Light primary tuning value
4. Change Climate mode: `Eco | Balanced | Push`
5. Change Climate control state: `Auto | Manual`
6. Adjust Climate primary tuning value
7. Change Irrigation mode: `Eco | Balanced | Push`
8. Change Irrigation control state: `Auto | Manual`
9. Adjust Irrigation primary tuning value
10. Change trend range: `6H | 24H | 7D`
11. Filter event log: `All | Alerts | Info`
12. Toggle room overview view mode: `3D | Schematic`

### 10.2 Interaction Event Names

Control interactions should dispatch intent events.

```ts
type CockpitIntent =
  | { type: 'SET_LIGHT_MODE'; mode: OperatingMode }
  | { type: 'SET_LIGHT_CONTROL_STATE'; controlState: ControlMode }
  | { type: 'SET_LIGHT_TUNING'; value: number }
  | { type: 'SET_CLIMATE_MODE'; mode: OperatingMode }
  | { type: 'SET_CLIMATE_CONTROL_STATE'; controlState: ControlMode }
  | { type: 'SET_CLIMATE_TUNING'; value: number | string }
  | { type: 'SET_IRRIGATION_MODE'; mode: OperatingMode }
  | { type: 'SET_IRRIGATION_CONTROL_STATE'; controlState: ControlMode }
  | { type: 'SET_IRRIGATION_TUNING'; value: number }
  | { type: 'SET_TREND_RANGE'; range: TrendRange }
  | { type: 'SET_EVENT_LOG_FILTER'; filter: 'All' | 'Alerts' | 'Info' }
  | { type: 'SET_ROOM_VIEW_MODE'; viewMode: '3D' | 'Schematic' };
```

### 10.3 Forbidden Interactions

The cockpit must not provide:

- direct editing of telemetry values
- per-device configuration
- recipe editing
- schedule editing
- batch creation
- batch deletion
- harvest confirmation
- market actions
- staff actions
- legal or external-world actions

---

## 11. Visual State Rules

### 11.1 Status Colors

Allowed status levels:

| Status | Meaning | Visual Use |
|---|---|---|
| `normal` | Value is inside expected simulation band | green accent |
| `warning` | Value is outside target band but not failing | amber accent |
| `critical` | Value requires immediate player attention | red accent |
| `inactive` | Value or system is disabled / unavailable | muted gray |

### 11.2 Color Discipline

- Green is used for normal / active / stable states.
- Amber is used for warning / deviation states.
- Red is reserved for critical states only.
- Do not use excessive neon.
- Do not introduce decorative colors without state meaning.

### 11.3 Typography

- Labels should be short and functional.
- Values should be more prominent than labels.
- Units should be visible but secondary.
- Avoid long explanatory text inside tiles.

### 11.4 Density

The cockpit should be dense but controlled.

Prefer:

- fewer panel types
- fewer chart styles
- consistent tiles
- compact labels
- stable alignment

Avoid:

- decorative micro-widgets
- redundant gauges
- repeated status badges
- multiple competing chart styles
- table-heavy layouts

---

## 12. Content Rules

### 12.1 Nutrient Reservoir

The nutrient reservoir is a fertilizer / nutrient reservoir abstraction.

It is displayed as a standard Metric Tile:

```text
NUTRIENT RESERVOIR
79 %
Refill Threshold 20 %
```

Rules:

- Same visual treatment as other Metric Tiles.
- No special tank widget.
- No vertical fill gauge.
- No vessel diagram.
- No custom reservoir component.
- No nutrient recipe information.

### 12.2 Water Supply

Water supply comes from the facility line / house connection.

It is displayed only in Utility Status:

```text
WATER SUPPLY
Facility Line
Flow Stable
```

Rules:

- Water Supply is not a telemetry metric in v0.1.
- Water Supply is not the Nutrient Reservoir.
- No water tank model is displayed in Iteration 1.

### 12.3 Environmental Values

Environmental values are simulation abstractions.

They may use:

- percentage values
- index values
- target/reference labels
- status bands

They must not expose:

- real cultivation schedules
- real fertilizer recipes
- strain-specific recommendations
- growth-stage instructions

---

## 13. Default Mock Snapshot

This snapshot may be used for static UI implementation and mockup validation.

```json
{
  "screen": {
    "title": "Operations Cockpit",
    "activePanel": "cockpit"
  },
  "simulation": {
    "day": 24,
    "tick": 288,
    "phase": "Mid Cycle",
    "overallStatus": "normal"
  },
  "room": {
    "id": "R-01",
    "label": "Room R-01",
    "status": "normal"
  },
  "zone": {
    "id": "Z-01",
    "label": "Zone Z-01",
    "status": "normal"
  },
  "batch": {
    "id": "B-017",
    "cycleProgressPct": 61,
    "cycleDayCurrent": 24,
    "cycleDayTotal": 39,
    "batchHealthIndex": 78,
    "moistureBalancePct": 54,
    "yieldForecastUnits": 1248,
    "qualityEstimatePct": 82,
    "qualityLabel": "Good"
  },
  "environment": {
    "airTemperature": {
      "label": "Air Temperature",
      "value": 24.6,
      "unit": "°C",
      "reference": "Target 24.0 °C",
      "status": "normal"
    },
    "relativeHumidity": {
      "label": "Relative Humidity",
      "value": 58,
      "unit": "%",
      "reference": "Target 55 %",
      "status": "normal"
    },
    "co2Index": {
      "label": "CO2 Index",
      "value": 1150,
      "unit": "ppm",
      "reference": "Target 1200 ppm",
      "status": "normal"
    },
    "lightOutput": {
      "label": "Light Output",
      "value": 72,
      "unit": "%",
      "reference": "Target 75 %",
      "status": "normal"
    },
    "irrigationIndex": {
      "label": "Irrigation Index",
      "value": 46,
      "unit": "%",
      "reference": "Target 45 %",
      "status": "normal"
    },
    "airflow": {
      "label": "Airflow",
      "value": 68,
      "unit": "%",
      "reference": "Target 65 %",
      "status": "normal"
    },
    "nutrientReservoir": {
      "label": "Nutrient Reservoir",
      "value": 79,
      "unit": "%",
      "reference": "Refill Threshold 20 %",
      "status": "normal"
    }
  },
  "controls": {
    "light": {
      "system": "Light",
      "mode": "Balanced",
      "controlState": "Auto",
      "primaryTuning": {
        "label": "Intensity",
        "value": 72,
        "unit": "%"
      }
    },
    "climate": {
      "system": "Climate",
      "mode": "Balanced",
      "controlState": "Auto",
      "primaryTuning": {
        "label": "Target Bias",
        "value": "Balanced"
      }
    },
    "irrigation": {
      "system": "Irrigation",
      "mode": "Balanced",
      "controlState": "Auto",
      "primaryTuning": {
        "label": "Irrigation Index",
        "value": 46,
        "unit": "%"
      }
    }
  },
  "trends": {
    "selectedRange": "24H",
    "availableRanges": ["6H", "24H", "7D"],
    "series": [
      {
        "id": "air_temperature",
        "label": "Air Temperature",
        "unit": "°C",
        "currentValue": 24.6,
        "points": []
      },
      {
        "id": "relative_humidity",
        "label": "Relative Humidity",
        "unit": "%",
        "currentValue": 58,
        "points": []
      },
      {
        "id": "irrigation_moisture",
        "label": "Irrigation / Moisture",
        "unit": "%",
        "currentValue": 46,
        "points": []
      },
      {
        "id": "power_draw",
        "label": "Power Draw",
        "unit": "kW",
        "currentValue": 18.6,
        "points": []
      }
    ]
  },
  "energy": {
    "powerNowKw": 18.6,
    "dailyEnergyKwh": 447.2,
    "dailyCost": 152.34,
    "weeklyCost": 1084.71,
    "efficiencyScore": 2.41,
    "currency": "USD"
  },
  "utility": {
    "grid": {
      "label": "Grid",
      "value": "Normal",
      "status": "normal"
    },
    "backupPower": {
      "label": "Backup Power",
      "value": "Available",
      "status": "normal"
    },
    "waterSupply": {
      "label": "Water Supply",
      "value": "Facility Line",
      "secondary": "Flow Stable",
      "status": "normal"
    },
    "network": {
      "label": "Network",
      "value": "Connected",
      "status": "normal"
    }
  },
  "events": [
    {
      "id": "evt-001",
      "time": "11:42:15",
      "day": 24,
      "tick": 286,
      "severity": "info",
      "title": "Irrigation cycle complete.",
      "detail": "Zone Z-01"
    },
    {
      "id": "evt-002",
      "time": "10:17:08",
      "day": 24,
      "tick": 281,
      "severity": "warning",
      "title": "Humidity deviation detected.",
      "detail": "Outside target band for 12 minutes."
    },
    {
      "id": "evt-003",
      "time": "09:58:31",
      "day": 24,
      "tick": 279,
      "severity": "info",
      "title": "Light mode changed to Balanced.",
      "detail": "System automation"
    },
    {
      "id": "evt-004",
      "time": "08:21:05",
      "day": 24,
      "tick": 271,
      "severity": "info",
      "title": "CO2 enrichment active.",
      "detail": "Target index restored."
    },
    {
      "id": "evt-005",
      "time": "07:45:10",
      "day": 24,
      "tick": 268,
      "severity": "info",
      "title": "Filter maintenance due in 3 days.",
      "detail": "Utility system notice."
    }
  ]
}
```

---

## 14. Acceptance Criteria

The Operations Cockpit v0.1 implementation is acceptable when:

1. The screen displays exactly one room, one zone, and one active batch.
2. The top header displays room, zone, batch, day, tick, phase, overall status, power now, and daily cost.
3. The room overview is the largest visual panel on the screen.
4. Environmental telemetry contains exactly seven Metric Tiles.
5. All environmental telemetry uses the same Metric Tile component.
6. Nutrient Reservoir is displayed as a normal Metric Tile.
7. No special reservoir widget, tank diagram, or vertical reservoir gauge exists.
8. Water Supply appears only in Utility Status as facility line / house connection.
9. The control panel contains exactly Light, Climate, and Irrigation controls.
10. Each control tile supports only Eco, Balanced, Push and Auto / Manual.
11. Trend panel contains exactly four Trend Tiles.
12. Trend panel uses one shared chart style.
13. Event log shows no more than five entries in the cockpit view.
14. Energy and cost are summary-only.
15. No real cultivation recipes, strain data, disease systems, market systems, staff systems, police systems, or world-map systems are present.
16. Visual styling remains dark, industrial, readable, and restrained.
17. UI density is high enough to feel operational but not overloaded.
18. The screen can be driven entirely from a deterministic snapshot object.
19. Player interactions dispatch intent events instead of mutating simulation state directly.
20. The implementation can be used as the foundation for a Codex UI build brief.

---

## 15. Codex Implementation Notes

For a first static UI prototype, Codex should:

- create reusable components for each allowed widget family
- hardcode the default mock snapshot initially
- avoid implementing simulation logic inside UI components
- keep components presentational where possible
- route player actions through typed intent handlers
- keep styling consistent and restrained
- avoid adding panels, widgets, or controls not listed in this contract

Recommended component split:

```text
OperationsCockpitScreen
  TopHeader
  LeftNav
  RoomOverviewPanel
  BatchStatusPanel
  EnvironmentalTelemetryPanel
    MetricTile
  ControlPanel
    ControlTile
  TelemetryTrendsPanel
    TrendTile
  EventLogPanel
    LogList
  EnergyCostPanel
  UtilityStatusPanel
```

