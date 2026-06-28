# Operations Cockpit v1 — Layout Map and Content Inventory

Status: Draft v1  
Scope: Iteration 1 / Single-Room-Grow-Loop  
Language: English  
Purpose: Layout and content definition for image mockups, screen contract, and Codex briefing

---

## 1. Screen Layout Map

### 1.1 Overall Structure

The screen is a single desktop cockpit layout.

Recommended aspect ratio:

```text
16:9
```

Recommended layout:

```text
Top Header
Left Navigation Rail
Main Room Visualization
Right Status Column
Lower Control / Trends / Log Area
Bottom Energy Summary
```

### 1.2 Layout Zones

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

## 2. Panel Definitions

### 2.1 Top Header

#### Contains
- Screen title
- Room
- Zone
- Batch
- Day
- Tick
- Phase
- Overall Status
- Power Now
- Daily Cost

#### Rules
- Always visible.
- No deep controls.
- No charts except one optional tiny sparkline for power.
- Must communicate current simulation context immediately.

---

### 2.2 Left Navigation Rail

#### Contains

```text
Cockpit
Rooms
Schedule
History
Maintenance
Settings
Log Out
```

#### Rules
- Cockpit is active.
- Navigation is visible but visually secondary.
- No nested menus in Iteration 1 mockup.
- No large icons competing with the cockpit content.

---

### 2.3 Main Room / Zone Overview

#### Contains
- Room visualization
- Active room label
- Active zone label
- View selector: 3D / Schematic
- Overlay legend

#### Rules
- This is the visual anchor of the cockpit.
- It should occupy the largest single area.
- It must remain readable as a UI panel, not become concept art.
- View selector is visual only in mockup v1.

---

### 2.4 Batch Status Panel

#### Contains
- Cycle Progress
- Batch Health Index
- Moisture Balance
- Yield Forecast
- Quality Estimate

#### Rules
- Keep compact.
- Avoid over-explaining.
- No genetic, strain, disease, pest, or market data.

---

### 2.5 Environmental Telemetry Panel

#### Contains exactly seven Metric Tiles

```text
Air Temperature
Relative Humidity
CO2 Index
Light Output
Irrigation Index
Airflow
Nutrient Reservoir
```

#### Rules
- All seven metrics use the same tile design.
- Nutrient Reservoir uses the same metric tile as all others.
- No special reservoir widget.
- No tank diagram.
- No extra telemetry values unless promoted in a later iteration.

---

### 2.6 Control Panel

#### Contains exactly three Control Tiles

```text
Light
Climate
Irrigation
```

Each control tile contains:

```text
Mode: Eco | Balanced | Push
Control: Auto | Manual
Primary tuning value
```

#### Rules
- No advanced device-level controls.
- No real recipes.
- No schedule editor in cockpit v1.
- No per-light or per-valve management.

---

### 2.7 Telemetry Trends Panel

#### Contains exactly four Trend Tiles

```text
Air Temperature
Relative Humidity
Irrigation / Moisture
Power Draw
```

#### Rules
- Shared chart style.
- Same time range selector for all charts.
- Default range: Last 24 Hours.
- No more than four trend charts in Iteration 1.

---

### 2.8 Alerts & Event Log Panel

#### Contains
- Filter: All / Alerts / Info
- Event rows

#### Rules
- Recent events only.
- One-line title plus optional short detail.
- No verbose simulation prose.
- No external-world systems.

---

### 2.9 Energy & Operating Cost Panel

#### Contains

```text
Power Now
Daily Energy
Daily Cost
Weekly Cost
Efficiency
```

#### Rules
- Summary only.
- No accounting details.
- No market or sales data.
- Cost model remains abstract.

---

### 2.10 Utility Status Panel

#### Contains

```text
Grid Status
Backup Power
Water Supply
Network
```

#### Rules
- Water Supply refers to facility line / house connection.
- Nutrient Reservoir is separate and appears as telemetry.
- Utility Status must not become a second telemetry panel.
- Keep it compact.

---

## 3. Content Inventory

### 3.1 Header Content

```yaml
header:
  title: "Operations Cockpit"
  stats:
    - label: "Room"
      value: "R-01"
    - label: "Zone"
      value: "Z-01"
    - label: "Batch"
      value: "B-017"
    - label: "Day"
      value: "24"
    - label: "Tick"
      value: "288"
    - label: "Phase"
      value: "Mid Cycle"
      status: "normal"
    - label: "Overall Status"
      value: "Normal"
      status: "normal"
    - label: "Power Now"
      value: "18.6 kW"
    - label: "Daily Cost"
      value: "$152.34"
```

### 3.2 Room Overview Content

```yaml
room_overview:
  title: "Room R-01 / Zone Z-01 Overview"
  view_modes:
    - "3D"
    - "Schematic"
  active_view: "3D"
  overlays:
    - "Supply Air"
    - "Return Air"
    - "Exhaust"
    - "Light"
    - "Irrigation"
    - "Sensors"
```

### 3.3 Batch Status Content

```yaml
batch_status:
  cycle_progress:
    value: 61
    unit: "%"
    secondary: "Day 24 of 39"
  batch_health_index:
    value: 78
    unit: "/100"
    status: "normal"
  moisture_balance:
    value: 54
    unit: "%"
    status: "normal"
  yield_forecast:
    value: 1248
    unit: "units"
  quality_estimate:
    value: 82
    unit: "%"
    secondary: "Good"
```

### 3.4 Environmental Telemetry Content

```yaml
environmental_telemetry:
  metrics:
    - label: "Air Temperature"
      value: 24.6
      unit: "°C"
      reference: "Target 24.0 °C"
      status: "normal"
    - label: "Relative Humidity"
      value: 58
      unit: "%"
      reference: "Target 55 %"
      status: "normal"
    - label: "CO2 Index"
      value: 1150
      unit: "ppm"
      reference: "Target 1200 ppm"
      status: "normal"
    - label: "Light Output"
      value: 72
      unit: "%"
      reference: "Target 75 %"
      status: "normal"
    - label: "Irrigation Index"
      value: 46
      unit: "%"
      reference: "Target 45 %"
      status: "normal"
    - label: "Airflow"
      value: 68
      unit: "%"
      reference: "Target 65 %"
      status: "normal"
    - label: "Nutrient Reservoir"
      value: 79
      unit: "%"
      reference: "Refill Threshold 20 %"
      status: "normal"
```

### 3.5 Control Panel Content

```yaml
control_panel:
  controls:
    - label: "Light"
      mode_options: ["Eco", "Balanced", "Push"]
      active_mode: "Balanced"
      control_options: ["Auto", "Manual"]
      active_control: "Auto"
      primary_tuning:
        label: "Intensity"
        value: 72
        unit: "%"
    - label: "Climate"
      mode_options: ["Eco", "Balanced", "Push"]
      active_mode: "Balanced"
      control_options: ["Auto", "Manual"]
      active_control: "Auto"
      primary_tuning:
        label: "Target Bias"
        value: "Balanced"
    - label: "Irrigation"
      mode_options: ["Eco", "Balanced", "Push"]
      active_mode: "Balanced"
      control_options: ["Auto", "Manual"]
      active_control: "Auto"
      primary_tuning:
        label: "Irrigation Index"
        value: 46
        unit: "%"
```

### 3.6 Telemetry Trends Content

```yaml
telemetry_trends:
  title: "Telemetry Trends"
  default_range: "Last 24 Hours"
  range_options: ["6H", "24H", "7D"]
  trends:
    - label: "Air Temperature"
      unit: "°C"
      current_value: 24.6
    - label: "Relative Humidity"
      unit: "%"
      current_value: 58
    - label: "Irrigation / Moisture"
      unit: "%"
      current_value: 46
    - label: "Power Draw"
      unit: "kW"
      current_value: 18.6
```

### 3.7 Alerts & Event Log Content

```yaml
event_log:
  filters: ["All", "Alerts", "Info"]
  entries:
    - time: "11:42:15"
      day: 24
      tick: 286
      severity: "info"
      title: "Irrigation cycle complete."
      detail: "Zone Z-01"
    - time: "10:17:08"
      day: 24
      tick: 281
      severity: "warning"
      title: "Humidity deviation detected."
      detail: "Outside target band for 12 minutes."
    - time: "09:58:31"
      day: 24
      tick: 279
      severity: "info"
      title: "Light mode changed to Balanced."
      detail: "System automation"
    - time: "08:21:05"
      day: 24
      tick: 271
      severity: "info"
      title: "CO2 enrichment active."
      detail: "Target index restored."
    - time: "07:45:10"
      day: 24
      tick: 268
      severity: "info"
      title: "Filter maintenance due in 3 days."
      detail: "Utility system notice."
```

### 3.8 Energy & Operating Cost Content

```yaml
energy_cost:
  metrics:
    - label: "Power Now"
      value: 18.6
      unit: "kW"
    - label: "Daily Energy"
      value: 447.2
      unit: "kWh"
    - label: "Daily Cost"
      value: 152.34
      unit: "$"
    - label: "Weekly Cost"
      value: 1084.71
      unit: "$"
    - label: "Efficiency"
      value: 2.41
      unit: "score"
```

### 3.9 Utility Status Content

```yaml
utility_status:
  items:
    - label: "Grid"
      value: "Normal"
      status: "normal"
    - label: "Backup Power"
      value: "Available"
      status: "normal"
    - label: "Water Supply"
      value: "Facility Line"
      secondary: "Flow Stable"
      status: "normal"
    - label: "Network"
      value: "Connected"
      status: "normal"
```

---

## 4. Explicit Non-Goals for Cockpit v1

The cockpit must not include:

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
- decorative fake sci-fi elements
- stoner, lifestyle, or cannabis-branding aesthetics
- cannabis leaf icons
- narrative flavor spam in the event log
