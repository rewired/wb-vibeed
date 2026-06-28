# Operations Cockpit Static UI Review Checklist v0.1

Status: Draft v0.1  
Scope: Iteration 1 / Static UI Prototype Review  
Purpose: Review checklist for evaluating the first Codex-generated Operations Cockpit screen against the agreed UI contract.

---

## 1. Review Goal

This checklist is used after Codex has generated the first static Operations Cockpit UI prototype.

The goal is not to judge whether the screen looks impressive.

The goal is to verify whether the implementation follows the defined contract:

- one room
- one zone
- one active batch
- deterministic simulation context
- abstract telemetry values
- limited control surface
- no real cultivation guidance
- no additional game systems
- no dashboard bloat

---

## 2. Required Source Documents

The reviewer should compare the implementation against these documents:

```text
docs/10_ui/operations-cockpit-widget-taxonomy-v1.md
docs/10_ui/operations-cockpit-layout-content-v1.md
docs/10_ui/screen-contracts/operations-cockpit-screen-contract-v0.1.md
docs/80_data/operations-cockpit-mock-state-v0.1.md
docs/20_codex/operations-cockpit-static-ui-implementation-briefing-v0.1.md
```

The screen contract is the primary source of truth.

---

## 3. Hard Scope Checks

The implementation must satisfy all of these checks.

```text
[ ] The screen represents exactly one room.
[ ] The screen represents exactly one zone.
[ ] The screen represents exactly one active batch.
[ ] The screen is a static UI prototype.
[ ] No simulation loop was added.
[ ] No runtime rehydration was added.
[ ] No JSON blueprint system was invented.
[ ] No market system was added.
[ ] No logistics system was added.
[ ] No staff system was added.
[ ] No police / authorities system was added.
[ ] No world map was added.
[ ] No genetics / strain system was added.
[ ] No pests or disease system was added.
[ ] No base-building system was added.
```

If any of these fail, the implementation has drifted out of Iteration 1 scope.

---

## 4. Layout Checks

```text
[ ] The screen uses a single desktop cockpit layout.
[ ] The layout is readable at 16:9.
[ ] The top header is clearly visible.
[ ] The left navigation rail is present but secondary.
[ ] The room overview is the primary visual anchor.
[ ] Batch Status appears as a compact status panel.
[ ] Environmental Telemetry appears as a structured metric section.
[ ] Control Panel contains only the allowed control groups.
[ ] Telemetry Trends contains compact trend charts.
[ ] Alerts & Event Log is a list, not a narrative panel.
[ ] Energy & Operating Cost appears as a compact summary.
[ ] Utility Status remains small and secondary.
```

---

## 5. Widget Taxonomy Checks

Allowed widget families only:

```text
[ ] Header Stat
[ ] Section Panel
[ ] Metric Tile
[ ] Trend Tile
[ ] Control Tile
[ ] Progress Tile
[ ] Log List
[ ] Room Visualization Panel
```

Additional checks:

```text
[ ] No new widget family was introduced without need.
[ ] Similar values use similar widgets.
[ ] Metric tiles look and behave consistently.
[ ] Trend tiles use one shared chart style.
[ ] Control tiles use one shared structure.
[ ] Log rows use one shared row format.
```

Failure example:

```text
Nutrient Reservoir rendered as a custom tank graphic while other telemetry uses metric tiles.
```

This is not allowed.

---

## 6. Header Content Checks

The header must show:

```text
[ ] Operations Cockpit title
[ ] Room: R-01
[ ] Zone: Z-01
[ ] Batch: B-017
[ ] Day: 24
[ ] Tick: 288
[ ] Phase: Mid Cycle
[ ] Overall Status: Normal
[ ] Power Now: 18.6 kW
[ ] Daily Cost: $152.34
```

Rules:

```text
[ ] Header values are compact.
[ ] Header contains no large charts.
[ ] Header contains no controls.
```

---

## 7. Environmental Telemetry Checks

The Environmental Telemetry panel must contain exactly these seven metrics:

```text
[ ] Air Temperature
[ ] Relative Humidity
[ ] CO2 Index
[ ] Light Output
[ ] Irrigation Index
[ ] Airflow
[ ] Nutrient Reservoir
```

Rules:

```text
[ ] All seven metrics use the same Metric Tile design.
[ ] Nutrient Reservoir is a normal Metric Tile.
[ ] Nutrient Reservoir is not displayed as a tank widget.
[ ] Nutrient Reservoir is not displayed as a vessel diagram.
[ ] Nutrient Reservoir is not displayed with a unique vertical fill component.
[ ] Water Supply is not mixed into Environmental Telemetry.
[ ] Water Supply appears only in Utility Status.
```

Expected Nutrient Reservoir presentation:

```text
Nutrient Reservoir
79 %
Refill Threshold 20 %
```

---

## 8. Utility Status Checks

Utility Status must remain compact and secondary.

Expected items:

```text
[ ] Grid: Normal
[ ] Backup Power: Available
[ ] Water Supply: Facility Line / Flow Stable
[ ] Network: Connected
```

Rules:

```text
[ ] Water Supply refers to facility line / house connection.
[ ] Water Supply does not use a reservoir display.
[ ] Utility Status does not duplicate Environmental Telemetry.
[ ] Utility Status does not become a large subsystem dashboard.
```

---

## 9. Control Panel Checks

The Control Panel must contain exactly three Control Tiles:

```text
[ ] Light
[ ] Climate
[ ] Irrigation
```

Each Control Tile must include:

```text
[ ] Mode selector: Eco | Balanced | Push
[ ] Control state: Auto | Manual
[ ] One primary tuning value
```

Rules:

```text
[ ] No per-device controls.
[ ] No schedule editor.
[ ] No recipe editor.
[ ] No advanced climate matrix.
[ ] No per-valve irrigation management.
[ ] No real cultivation instruction text.
```

---

## 10. Batch Status Checks

Batch Status must contain:

```text
[ ] Cycle Progress
[ ] Batch Health Index
[ ] Moisture Balance
[ ] Yield Forecast
[ ] Quality Estimate
```

Rules:

```text
[ ] Batch values are abstract simulation indicators.
[ ] No strain or genetics information appears.
[ ] No disease or pest information appears.
[ ] No market price information appears.
[ ] No detailed cultivation advice appears.
```

---

## 11. Trend Checks

Telemetry Trends must contain exactly four trend tiles:

```text
[ ] Air Temperature
[ ] Relative Humidity
[ ] Irrigation / Moisture
[ ] Power Draw
```

Rules:

```text
[ ] All charts use one consistent visual style.
[ ] Default range is 24H / Last 24 Hours.
[ ] No more than four trend charts are shown.
[ ] No deep analytics dashboard was added.
```

---

## 12. Event Log Checks

The Event Log must contain:

```text
[ ] Filter: All
[ ] Filter: Alerts
[ ] Filter: Info
[ ] Recent event rows
```

Each event row should include:

```text
[ ] Time
[ ] Day and/or tick
[ ] Severity
[ ] Title
[ ] Short detail
```

Rules:

```text
[ ] Event entries are short.
[ ] Event entries describe simulation state changes.
[ ] Event log does not contain narrative flavor spam.
[ ] Event log does not include external-world systems.
[ ] Event log does not include police, market, logistics, or staff events.
```

---

## 13. Visual Style Checks

Required style:

```text
[ ] Dark industrial dashboard.
[ ] Technical and readable.
[ ] Slightly worn / grounded surface treatment.
[ ] Green and amber status accents.
[ ] Dense but controlled.
[ ] Clear panel hierarchy.
[ ] Consistent typography.
[ ] Consistent spacing.
```

Forbidden style drift:

```text
[ ] No cartoon farm.
[ ] No stoner aesthetic.
[ ] No cannabis lifestyle branding.
[ ] No cannabis leaf iconography.
[ ] No excessive neon.
[ ] No fake sci-fi holograms.
[ ] No cyberpunk overkill.
[ ] No decorative clutter.
```

---

## 14. Interaction Checks

For the static prototype:

```text
[ ] Controls may visually toggle local UI state.
[ ] Controls do not run a simulation.
[ ] Controls do not mutate mock simulation data.
[ ] No hidden persistence layer was added.
[ ] No backend calls were added.
[ ] No live data fetching was added.
```

Allowed static interactions:

```text
[ ] Selecting Eco / Balanced / Push locally.
[ ] Selecting Auto / Manual locally.
[ ] Clicking event filters locally.
[ ] Switching visual trend range locally, if implemented.
```

---

## 15. Data Binding Checks

The implementation should use the mock state document as its data source.

```text
[ ] Mock data is centralized.
[ ] Display values are not scattered as random literals across components.
[ ] Components receive data through props or a clear local data object.
[ ] The mock state structure resembles the documented schema.
[ ] Read-only simulation values are not treated as editable UI state.
```

---

## 16. Component Structure Checks

Recommended components may include:

```text
[ ] OperationsCockpit
[ ] TopHeader
[ ] LeftNav
[ ] SectionPanel
[ ] HeaderStat
[ ] MetricTile
[ ] TrendTile
[ ] ControlTile
[ ] ProgressTile
[ ] RoomVisualization
[ ] EventLog
[ ] EnergyCostSummary
[ ] UtilityStatus
```

Rules:

```text
[ ] Components are not over-abstracted.
[ ] Components are not duplicated unnecessarily.
[ ] Similar UI elements reuse shared components.
[ ] Styling remains maintainable.
```

---

## 17. Immediate Rejection Criteria

Reject or rewrite the implementation if any of the following are true:

```text
[ ] It adds real cultivation recipes.
[ ] It adds strain or genetics data.
[ ] It adds market / sales / logistics gameplay.
[ ] It adds police / authorities gameplay.
[ ] It adds a world map.
[ ] It adds staff management.
[ ] It turns Nutrient Reservoir into a unique tank widget.
[ ] It creates a large number of unrelated dashboard widgets.
[ ] It uses cannabis leaf branding or stoner visuals.
[ ] It invents simulation systems not requested for Iteration 1.
```

---

## 18. Review Outcome Format

When reviewing the implementation, use this format:

```md
# Review Outcome

## Verdict
Pass / Pass with fixes / Fail

## Major Issues
- ...

## Minor Issues
- ...

## Contract Deviations
- ...

## Required Fixes
- ...

## Optional Improvements
- ...

## Do Not Change
- ...
```

---

## 19. Minimum Pass Criteria

The prototype passes v0.1 review only if:

```text
[ ] It follows the one-room / one-zone / one-batch constraint.
[ ] It uses the defined widget taxonomy.
[ ] It keeps Environmental Telemetry to exactly seven metric tiles.
[ ] Nutrient Reservoir is rendered as a normal Metric Tile.
[ ] Water Supply is shown only as Utility Status.
[ ] The Control Panel has exactly Light, Climate, and Irrigation.
[ ] The screen does not imply real cultivation instructions.
[ ] The screen does not introduce out-of-scope game systems.
[ ] The visual style matches the dark industrial cockpit direction.
[ ] The layout is readable and not overloaded.
```

---

## 20. Reviewer Note

Do not reward visual complexity by itself.

A simpler implementation that follows the contract is better than an impressive dashboard that invents systems.

The purpose of this prototype is to establish a stable UI contract for the deterministic single-room simulation loop.
