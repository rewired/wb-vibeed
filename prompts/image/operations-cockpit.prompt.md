# Operations Cockpit v1 — Image Mockup Prompt

Status: Draft v1  
Scope: Iteration 1 / Single-Room-Grow-Loop  
Language: English  
Purpose: Prompt source for generating a controlled image-based UI mockup

---

## 1. Primary Image Prompt

Create a high-fidelity image-based UI mockup for a desktop simulation game screen titled "Operations Cockpit".

This is the main screen for monitoring one active grow room and controlling a few abstract operating modes.

Use English UI labels.

The interface must look like a dark industrial control dashboard:
- charcoal and gunmetal surfaces
- subtle wear and slight grime
- technical and readable
- restrained green and amber status accents
- dense but not overloaded

Avoid:
- cartoon farm style
- stoner aesthetic
- lifestyle branding
- excessive neon
- fake sci-fi holograms
- marijuana leaf iconography
- decorative dashboard effects with no gameplay purpose

The result should look like a coherent product UI prototype, not a poster and not a collection of unrelated widgets.

---

## 2. UI Consistency Requirements

Use a strict and minimal widget system.

Do not create many different widget types.

The cockpit may only use these widget families:
- Header Stat
- Section Panel
- Metric Tile
- Trend Tile
- Control Tile
- Progress Tile
- Log List
- Room Visualization Panel

All environmental telemetry values must use the same Metric Tile design.

Do not introduce special one-off widgets for individual values.

---

## 3. Required Screen Areas

Show a believable software dashboard layout with these sections:

### Top Header Bar
Include:
- screen title: Operations Cockpit
- Room R-01
- Zone Z-01
- Batch B-017
- Day 24
- Tick 288
- Phase: Mid Cycle
- Overall Status: Normal
- compact Power Now summary
- compact Daily Cost summary

### Left Navigation Rail
Include:
- Cockpit as active item
- Rooms
- Schedule
- History
- Maintenance
- Settings
- Log Out

Keep navigation visually secondary.

### Main Room / Zone Visualization
Show one active grow room and one zone as a technical schematic or semi-isometric industrial room interior.

Include:
- generic crop tables or canopy blocks
- overhead lights
- ducts
- airflow arrows
- sensors
- irrigation markers
- compact overlay legend

Keep the visualization abstract and operational, not instructional.

Do not make the crop visually lush or lifestyle-oriented.

### Batch Status Panel
Include compact progress and KPI values:
- Cycle Progress
- Batch Health Index
- Moisture Balance
- Yield Forecast
- Quality Estimate

Use abstract simulation indicators only.

### Environmental Telemetry Panel
Environmental telemetry must contain exactly these seven Metric Tiles:
- Air Temperature
- Relative Humidity
- CO2 Index
- Light Output
- Irrigation Index
- Airflow
- Nutrient Reservoir

The Nutrient Reservoir is a fertilizer / nutrient reservoir, not the facility water supply.
It must be displayed as a normal Metric Tile with the same style as the other telemetry values.
Do not create a special tank widget, vessel diagram, vertical fill gauge, or custom reservoir component.

Preferred Nutrient Reservoir text:

```text
Nutrient Reservoir
79 %
Refill Threshold 20 %
```

### Utility Status Panel
Water supply comes from the facility line / house connection and appears only in the compact Utility Status panel.

Preferred Water Supply text:

```text
Water Supply
Facility Line
Flow Stable
```

Do not confuse Water Supply with Nutrient Reservoir.

### Control Panel
Include exactly three Control Tiles:
- Light
- Climate
- Irrigation

Each control tile contains:
- Mode: Eco | Balanced | Push
- Control: Auto | Manual
- one primary tuning value

Use abstract operating modes only.
Do not expose real cultivation recipes.

### Telemetry Trends Panel
Include exactly four Trend Tiles:
- Air Temperature
- Relative Humidity
- Irrigation / Moisture
- Power Draw

Use one shared chart style.
Do not mix chart styles.

### Alerts & Event Log Panel
Include short timestamped entries such as:
- Irrigation cycle complete.
- Humidity deviation detected.
- Light mode changed to Balanced.
- CO2 index restored.
- Filter maintenance due in 3 days.

Keep log entries short and simulation-focused.

### Energy & Operating Cost Panel
Include compact summary values:
- Power Now
- Daily Energy
- Daily Cost
- Weekly Cost
- Efficiency

No market, sales, logistics, or accounting deep-dive.

---

## 4. Layout Guidance

Recommended aspect ratio:

```text
16:9
```

Recommended layout:

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
The right column should carry compact status and telemetry.
The lower area should carry controls, trends, logs, and energy summary.

---

## 5. Negative Prompt / Exclusions

Exclude:
- real grow recipes
- real cultivation instructions
- strain or genetics information
- pest or disease systems
- employees
- police or authority systems
- world map
- market, sales, or logistics systems
- multiplayer systems
- base-building controls
- detailed device-level configuration
- excessive telemetry tables
- too many widgets
- fake sci-fi holograms
- cyberpunk overkill
- cannabis leaf icons
- stoner branding
- lifestyle imagery
- cartoon farm aesthetics
- decorative gauges that do not support readability
