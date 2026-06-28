# Operations Cockpit v1 — Widget Taxonomy

Status: Draft v1  
Scope: Iteration 1 / Single-Room-Grow-Loop  
Language: English  
Purpose: UI structure definition for image mockups, screen contract, and Codex briefing

---

## 1. Design Intent

The Operations Cockpit is the main monitoring and control screen for one active grow room.

Iteration 1 represents:
- one room
- one zone
- one active batch
- deterministic simulation state
- abstract environmental values
- abstract operating modes
- harvest and batch reporting readiness

The screen must feel like a grounded industrial control interface:
- dark industrial dashboard
- readable technical UI
- clean surfaces
- green, amber and red status accents
- dense but controlled
- no cartoon farm
- no stoner aesthetic
- no lifestyle branding
- no excessive neon
- no fake sci-fi holograms

The UI must not imply real cultivation instructions. All environmental values are simulation abstractions.

---

## 2. Core UI Principle

The cockpit uses a small, repeatable set of widget families.

Do not introduce a new widget type for every data point. If a value can be represented by an existing widget family, reuse that family.

Iteration 1 allows exactly these widget families:

1. Header Stat
2. Section Panel
3. Metric Tile
4. Trend Tile
5. Control Tile
6. Progress Tile
7. Log List
8. Room Visualization Panel

No additional widget families should be introduced in Iteration 1 unless strictly required.

---

## 3. Widget Families

### 3.1 Header Stat

#### Purpose
Displays global simulation context and high-level status.

#### Used for
- Room
- Zone
- Batch
- Day
- Tick
- Phase
- Overall Status
- Power Now
- Daily Cost

#### Structure

```text
LABEL
VALUE
optional status indicator
```

#### Examples

```text
ROOM
R-01
```

```text
PHASE
MID CYCLE
```

```text
OVERALL STATUS
NORMAL
```

#### Rules
- Header stats must be compact.
- Header stats must not contain charts.
- Header stats must not contain controls.
- Status color may be used for phase and overall status only.

---

### 3.2 Section Panel

#### Purpose
Groups related UI content into clearly bounded areas.

#### Used for
- Batch Status
- Environmental Telemetry
- Control Panel
- Telemetry Trends
- Alerts & Event Log
- Energy & Operating Cost
- Utility Status

#### Structure

```text
SECTION TITLE
optional toolbar / filter controls
content area
```

#### Rules
- Every major cockpit area must be a section panel.
- Section titles must be short and functional.
- Avoid decorative titles.
- Do not use section panels as visual filler.

---

### 3.3 Metric Tile

#### Purpose
Displays a single simulation value.

#### Used for
Environmental and operational telemetry.

#### Required structure

```text
LABEL
PRIMARY VALUE
UNIT
SECONDARY REFERENCE LINE
STATUS COLOR
```

#### Optional elements
- small gauge arc
- tiny status dot
- compact threshold marker

#### Allowed metrics in Iteration 1

```text
Air Temperature
Relative Humidity
CO2 Index
Light Output
Irrigation Index
Airflow
Nutrient Reservoir
```

#### Examples

```text
AIR TEMP
24.6 °C
Target 24.0 °C
```

```text
RELATIVE HUMIDITY
58 %
Target 55 %
```

```text
CO2 INDEX
1150 ppm
Target 1200 ppm
```

```text
NUTRIENT RESERVOIR
79 %
Refill Threshold 20 %
```

#### Rules
- All telemetry metrics must use the same metric-tile family.
- The nutrient reservoir must not use a special tank widget.
- No vessel diagram.
- No custom reservoir display.
- No unique fill-state widget.
- Gauge style, spacing, typography, and status colors must remain consistent across all metric tiles.
- Metric tiles are read-only in the main telemetry area.

---

### 3.4 Trend Tile

#### Purpose
Shows recent value movement over time.

#### Used for
- Air Temperature trend
- Relative Humidity trend
- Irrigation / Moisture trend
- Power Draw trend

#### Structure

```text
LABEL
small line chart
current value
time range indicator
```

#### Example

```text
AIR TEMPERATURE
line chart
24.6 °C
Last 24h
```

#### Rules
- Trend tiles use one shared chart style.
- No mixed chart styles in the same section.
- Trends are compact context, not analytics deep-dives.
- No detailed sensor-level chart matrix in Iteration 1.
- Maximum number of trend tiles: 4.

---

### 3.5 Control Tile

#### Purpose
Allows the player to switch abstract operating behavior.

#### Used for
- Light
- Climate
- Irrigation

#### Required structure

```text
SYSTEM LABEL
MODE SELECTOR
CONTROL STATE
PRIMARY TUNING VALUE
```

#### Mode selector

```text
Eco | Balanced | Push
```

#### Control state

```text
Auto | Manual
```

#### Examples

```text
LIGHT
Mode: Eco | Balanced | Push
Control: Auto | Manual
Intensity: 72 %
```

```text
CLIMATE
Mode: Eco | Balanced | Push
Control: Auto | Manual
Target Bias: Balanced
```

```text
IRRIGATION
Mode: Eco | Balanced | Push
Control: Auto | Manual
Irrigation Index: 46 %
```

#### Rules
- Only three control tiles exist in Iteration 1.
- Control tiles must not expose real grow recipes.
- Controls must operate on abstract simulation modes.
- Controls must be clearly separated from telemetry.
- No hidden advanced control matrix.
- No per-device controls in Iteration 1.

---

### 3.6 Progress Tile

#### Purpose
Shows batch-level progress and outcome estimates.

#### Used for
Batch Status.

#### Structure

```text
LABEL
progress bar or large numeric value
secondary description
optional status color
```

#### Allowed batch status values

```text
Cycle Progress
Batch Health Index
Moisture Balance
Yield Forecast
Quality Estimate
```

#### Examples

```text
CYCLE PROGRESS
61 %
Day 24 of 39
```

```text
BATCH HEALTH INDEX
78 / 100
Stable
```

```text
QUALITY ESTIMATE
82 %
Good
```

#### Rules
- Batch values are abstract simulation indicators.
- Do not expose cultivation advice.
- Yield forecast is a game/simulation estimate only.
- No genetics, strain, disease, pest, or market indicators.

---

### 3.7 Log List

#### Purpose
Displays recent simulation events and alerts.

#### Used for
Alerts & Event Log.

#### Structure

```text
timestamp
day / tick
severity icon
event title
event detail
tag
```

#### Allowed severities

```text
Info
Warning
Critical
```

#### Example entries

```text
11:42:15 / Day 24
Info
Irrigation cycle complete.
Zone Z-01
```

```text
10:17:08 / Day 24
Warning
Humidity deviation detected.
Outside target band for 12 minutes.
```

```text
07:45:10 / Day 24
Info
Filter maintenance due in 3 days.
Utility system notice.
```

#### Rules
- Log entries must be short.
- Log details must describe simulation state changes.
- No narrative flavor spam.
- No legal, police, market, or external-world events in Iteration 1.
- No real cultivation instruction text.

---

### 3.8 Room Visualization Panel

#### Purpose
Provides spatial context for the active room and zone.

#### Used for
Main room / zone overview.

#### Content
- one room
- one zone
- generic canopy trays or crop tables
- overhead lights
- ducts / airflow paths
- sensors
- irrigation markers
- basic utility indicators

#### Allowed overlays

```text
Supply Air
Return Air
Exhaust
Light
Irrigation
Sensors
```

#### Rules
- The visualization is operational, not decorative.
- It must not show detailed grow instructions.
- It must not show plant-specific realism as the focus.
- It may show generic green canopy blocks.
- No cannabis leaf iconography.
- No lifestyle props.
- No people.
- No cartoon style.
- No sci-fi holograms.
- The visualization should support reading room state at a glance.
