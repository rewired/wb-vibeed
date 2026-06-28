# Operations Cockpit Mock State v0.1

Status: Draft v0.1  
Scope: Iteration 1 / Static Operations Cockpit Prototype  
Language: English  
Purpose: Provide a stable mock state shape and example snapshot for the Operations Cockpit static UI prototype.

---

## 1. Purpose

This document defines the mock state used by the Operations Cockpit static prototype.

The mock state is not a simulation engine.  
It is a fixed data snapshot used to render the cockpit UI according to the screen contract.

Codex must not infer additional game systems from this file.

---

## 2. Scope

The mock state represents:

- one room
- one zone
- one active batch
- one deterministic simulation timestamp
- abstract environmental telemetry
- abstract player controls
- batch progress indicators
- energy and operating cost summaries
- utility status
- recent event log entries
- small trend series for chart rendering

---

## 3. Explicit Non-Goals

This mock state must not include:

- real grow recipes
- strain or genetics data
- pests or disease state
- employee state
- police or authority state
- market, sales, or logistics state
- world map state
- multiplayer state
- base-building state
- detailed device-level configuration
- nutrient composition data
- real cultivation schedules

---

## 4. TypeScript-Oriented State Shape

```ts
export type StatusLevel = 'normal' | 'warning' | 'critical';
export type ControlMode = 'eco' | 'balanced' | 'push';
export type ControlState = 'auto' | 'manual';
export type EventSeverity = 'info' | 'warning' | 'critical';
export type TrendRange = '6h' | '24h' | '7d';

export interface HeaderState {
  title: string;
  roomId: string;
  zoneId: string;
  batchId: string;
  day: number;
  tick: number;
  phase: string;
  overallStatus: StatusLevel;
}

export interface MetricValue {
  id: string;
  label: string;
  value: number | string;
  unit?: string;
  reference?: string;
  status: StatusLevel;
}

export interface BatchStatusState {
  cycleProgress: MetricValue;
  batchHealthIndex: MetricValue;
  moistureBalance: MetricValue;
  yieldForecast: MetricValue;
  qualityEstimate: MetricValue;
}

export interface EnvironmentalTelemetryState {
  metrics: MetricValue[];
}

export interface ControlTileState {
  id: string;
  label: string;
  activeMode: ControlMode;
  activeControlState: ControlState;
  primaryTuning: MetricValue;
}

export interface ControlPanelState {
  controls: ControlTileState[];
}

export interface TrendPoint {
  tick: number;
  value: number;
}

export interface TrendTileState {
  id: string;
  label: string;
  unit: string;
  currentValue: number;
  range: TrendRange;
  points: TrendPoint[];
}

export interface TelemetryTrendsState {
  defaultRange: TrendRange;
  trends: TrendTileState[];
}

export interface EnergyCostState {
  metrics: MetricValue[];
  powerDraw7d: number[];
}

export interface UtilityStatusItem {
  id: string;
  label: string;
  value: string;
  secondary?: string;
  status: StatusLevel;
}

export interface UtilityStatusState {
  items: UtilityStatusItem[];
}

export interface EventLogEntry {
  id: string;
  time: string;
  day: number;
  tick: number;
  severity: EventSeverity;
  title: string;
  detail?: string;
}

export interface EventLogState {
  activeFilter: 'all' | 'alerts' | 'info';
  entries: EventLogEntry[];
}

export interface RoomOverlayState {
  supplyAir: boolean;
  returnAir: boolean;
  exhaust: boolean;
  light: boolean;
  irrigation: boolean;
  sensors: boolean;
}

export interface RoomOverviewState {
  roomId: string;
  zoneId: string;
  activeView: '3d' | 'schematic';
  overlays: RoomOverlayState;
}

export interface OperationsCockpitMockState {
  header: HeaderState;
  roomOverview: RoomOverviewState;
  batchStatus: BatchStatusState;
  environmentalTelemetry: EnvironmentalTelemetryState;
  controlPanel: ControlPanelState;
  telemetryTrends: TelemetryTrendsState;
  energyCost: EnergyCostState;
  utilityStatus: UtilityStatusState;
  eventLog: EventLogState;
}
```

---

## 5. Fixed Mock Snapshot

```json
{
  "header": {
    "title": "Operations Cockpit",
    "roomId": "R-01",
    "zoneId": "Z-01",
    "batchId": "B-017",
    "day": 24,
    "tick": 288,
    "phase": "Mid Cycle",
    "overallStatus": "normal"
  },
  "roomOverview": {
    "roomId": "R-01",
    "zoneId": "Z-01",
    "activeView": "3d",
    "overlays": {
      "supplyAir": true,
      "returnAir": true,
      "exhaust": true,
      "light": true,
      "irrigation": true,
      "sensors": true
    }
  },
  "batchStatus": {
    "cycleProgress": {
      "id": "cycleProgress",
      "label": "Cycle Progress",
      "value": 61,
      "unit": "%",
      "reference": "Day 24 of 39",
      "status": "normal"
    },
    "batchHealthIndex": {
      "id": "batchHealthIndex",
      "label": "Batch Health Index",
      "value": 78,
      "unit": "/100",
      "reference": "Stable",
      "status": "normal"
    },
    "moistureBalance": {
      "id": "moistureBalance",
      "label": "Moisture Balance",
      "value": 54,
      "unit": "%",
      "reference": "Within target band",
      "status": "normal"
    },
    "yieldForecast": {
      "id": "yieldForecast",
      "label": "Yield Forecast",
      "value": 1248,
      "unit": "units",
      "reference": "Simulation estimate",
      "status": "normal"
    },
    "qualityEstimate": {
      "id": "qualityEstimate",
      "label": "Quality Estimate",
      "value": 82,
      "unit": "%",
      "reference": "Good",
      "status": "normal"
    }
  },
  "environmentalTelemetry": {
    "metrics": [
      {
        "id": "airTemperature",
        "label": "Air Temperature",
        "value": 24.6,
        "unit": "°C",
        "reference": "Target 24.0 °C",
        "status": "normal"
      },
      {
        "id": "relativeHumidity",
        "label": "Relative Humidity",
        "value": 58,
        "unit": "%",
        "reference": "Target 55 %",
        "status": "normal"
      },
      {
        "id": "co2Index",
        "label": "CO2 Index",
        "value": 1150,
        "unit": "ppm",
        "reference": "Target 1200 ppm",
        "status": "normal"
      },
      {
        "id": "lightOutput",
        "label": "Light Output",
        "value": 72,
        "unit": "%",
        "reference": "Target 75 %",
        "status": "normal"
      },
      {
        "id": "irrigationIndex",
        "label": "Irrigation Index",
        "value": 46,
        "unit": "%",
        "reference": "Target 45 %",
        "status": "normal"
      },
      {
        "id": "airflow",
        "label": "Airflow",
        "value": 68,
        "unit": "%",
        "reference": "Target 65 %",
        "status": "normal"
      },
      {
        "id": "nutrientReservoir",
        "label": "Nutrient Reservoir",
        "value": 79,
        "unit": "%",
        "reference": "Refill Threshold 20 %",
        "status": "normal"
      }
    ]
  },
  "controlPanel": {
    "controls": [
      {
        "id": "light",
        "label": "Light",
        "activeMode": "balanced",
        "activeControlState": "auto",
        "primaryTuning": {
          "id": "lightIntensity",
          "label": "Intensity",
          "value": 72,
          "unit": "%",
          "status": "normal"
        }
      },
      {
        "id": "climate",
        "label": "Climate",
        "activeMode": "balanced",
        "activeControlState": "auto",
        "primaryTuning": {
          "id": "climateTargetBias",
          "label": "Target Bias",
          "value": "Balanced",
          "status": "normal"
        }
      },
      {
        "id": "irrigation",
        "label": "Irrigation",
        "activeMode": "balanced",
        "activeControlState": "auto",
        "primaryTuning": {
          "id": "irrigationIndex",
          "label": "Irrigation Index",
          "value": 46,
          "unit": "%",
          "status": "normal"
        }
      }
    ]
  },
  "telemetryTrends": {
    "defaultRange": "24h",
    "trends": [
      {
        "id": "airTemperatureTrend",
        "label": "Air Temperature",
        "unit": "°C",
        "currentValue": 24.6,
        "range": "24h",
        "points": [
          { "tick": 264, "value": 23.9 },
          { "tick": 268, "value": 24.2 },
          { "tick": 272, "value": 24.5 },
          { "tick": 276, "value": 24.7 },
          { "tick": 280, "value": 24.4 },
          { "tick": 284, "value": 24.5 },
          { "tick": 288, "value": 24.6 }
        ]
      },
      {
        "id": "relativeHumidityTrend",
        "label": "Relative Humidity",
        "unit": "%",
        "currentValue": 58,
        "range": "24h",
        "points": [
          { "tick": 264, "value": 55 },
          { "tick": 268, "value": 56 },
          { "tick": 272, "value": 59 },
          { "tick": 276, "value": 62 },
          { "tick": 280, "value": 60 },
          { "tick": 284, "value": 59 },
          { "tick": 288, "value": 58 }
        ]
      },
      {
        "id": "irrigationMoistureTrend",
        "label": "Irrigation / Moisture",
        "unit": "%",
        "currentValue": 46,
        "range": "24h",
        "points": [
          { "tick": 264, "value": 44 },
          { "tick": 268, "value": 46 },
          { "tick": 272, "value": 52 },
          { "tick": 276, "value": 49 },
          { "tick": 280, "value": 47 },
          { "tick": 284, "value": 45 },
          { "tick": 288, "value": 46 }
        ]
      },
      {
        "id": "powerDrawTrend",
        "label": "Power Draw",
        "unit": "kW",
        "currentValue": 18.6,
        "range": "24h",
        "points": [
          { "tick": 264, "value": 16.8 },
          { "tick": 268, "value": 17.5 },
          { "tick": 272, "value": 19.1 },
          { "tick": 276, "value": 18.9 },
          { "tick": 280, "value": 18.2 },
          { "tick": 284, "value": 18.4 },
          { "tick": 288, "value": 18.6 }
        ]
      }
    ]
  },
  "energyCost": {
    "metrics": [
      {
        "id": "powerNow",
        "label": "Power Now",
        "value": 18.6,
        "unit": "kW",
        "status": "normal"
      },
      {
        "id": "dailyEnergy",
        "label": "Daily Energy",
        "value": 447.2,
        "unit": "kWh",
        "status": "normal"
      },
      {
        "id": "dailyCost",
        "label": "Daily Cost",
        "value": 152.34,
        "unit": "$",
        "status": "normal"
      },
      {
        "id": "weeklyCost",
        "label": "Weekly Cost",
        "value": 1084.71,
        "unit": "$",
        "status": "normal"
      },
      {
        "id": "efficiencyScore",
        "label": "Efficiency",
        "value": 2.41,
        "unit": "score",
        "status": "normal"
      }
    ],
    "powerDraw7d": [17.2, 18.4, 19.0, 18.2, 17.8, 18.9, 18.6]
  },
  "utilityStatus": {
    "items": [
      {
        "id": "grid",
        "label": "Grid",
        "value": "Normal",
        "status": "normal"
      },
      {
        "id": "backupPower",
        "label": "Backup Power",
        "value": "Available",
        "status": "normal"
      },
      {
        "id": "waterSupply",
        "label": "Water Supply",
        "value": "Facility Line",
        "secondary": "Flow Stable",
        "status": "normal"
      },
      {
        "id": "network",
        "label": "Network",
        "value": "Connected",
        "status": "normal"
      }
    ]
  },
  "eventLog": {
    "activeFilter": "all",
    "entries": [
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
}
```

---

## 6. Binding Rules

### 6.1 Read-Only State

These values are display-only in the static prototype:

- header values
- room overview labels
- batch status values
- environmental telemetry metrics
- telemetry trends
- energy and cost metrics
- utility status values
- event log entries

### 6.2 Clickable But Non-Simulating Controls

The following controls may visually update local UI state only:

- Light mode
- Light control state
- Climate mode
- Climate control state
- Irrigation mode
- Irrigation control state
- Event log filter
- Trend range selector

These interactions must not calculate new telemetry values in the static prototype.

---

## 7. Important Semantic Rules

### 7.1 Nutrient Reservoir

The nutrient reservoir represents a fertilizer / nutrient supply reservoir.

It is displayed as a normal telemetry metric tile:

```text
Nutrient Reservoir
79 %
Refill Threshold 20 %
```

It must not use:

- a tank diagram
- a vessel illustration
- a vertical fill gauge
- a unique reservoir component
- nutrient composition details

### 7.2 Water Supply

Water supply comes from the facility line / house connection.

It appears only in Utility Status:

```text
Water Supply
Facility Line
Flow Stable
```

Water Supply must not be treated as a telemetry metric in Iteration 1.

---

## 8. Acceptance Criteria

The static prototype satisfies this mock-state document when:

- the UI can render directly from this mock state
- no additional domain data is required
- no additional systems are invented
- all telemetry values use the same metric tile structure
- the nutrient reservoir uses the same metric tile structure as other telemetry values
- water supply remains a utility status item
- controls do not simulate new values
- trends render from fixed point arrays
- event log entries render from fixed entries
- the screen remains within Iteration 1 scope
