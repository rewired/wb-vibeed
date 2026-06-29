import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import blueprintData from './operations-cockpit-blueprint.json';
import { rehydrateOperationsCockpit } from './operations-cockpit-rehydrate';
import { advanceOperationsCockpitRuntime } from './operations-cockpit-runtime';
import type {
  ControlState,
  ControlTileState,
  EventLogDrawerState,
  EventLogEntryState,
  HeaderStat,
  MetricTileState,
  OperatingMode,
  OperationsCockpitBlueprint,
  OperationsCockpitControlSystem,
  OperationsCockpitRuntimeAction,
  OperationsCockpitState,
  RoomCapacityItemState,
  SelectedRoomObject,
  SimSpeed,
  SimulationRuntimeState,
  StatusLevel,
  TelemetryKey,
  TelemetryTileMode,
  TelemetryViewModes,
  TrendTileState,
} from './operations-cockpit-state-types';

const initialRuntimeState = rehydrateOperationsCockpit(blueprintData as OperationsCockpitBlueprint);
const modeOptions = ['Eco', 'Balanced', 'Push'] as const;
const controlOptions = ['Auto', 'Manual'] as const;
const speedOptions = [1, 2, 4, 8] as const satisfies readonly SimSpeed[];
const initialTelemetryViewModes: TelemetryViewModes = {
  'air-temperature': 'current',
  'relative-humidity': 'current',
  'co2-index': 'current',
  'light-output': 'current',
  'irrigation-index': 'current',
  airflow: 'current',
  'nutrient-reservoir': 'current',
};
const BASE_TICK_MS = 1000;

function Icon({
  name,
  size = 'md',
  filled = false,
  className = '',
}: {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  filled?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`material-symbols-sharp icon-${size} ${className}`.trim()}
      style={{
        fontVariationSettings: `"FILL" ${filled ? 1 : 0}, "wght" 400, "GRAD" 0, "opsz" 20`,
      }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}

function controlSystemFromId(controlId: string): OperationsCockpitControlSystem | undefined {
  const systems: Record<string, OperationsCockpitControlSystem> = {
    'light-control': 'light',
    'climate-control': 'climate',
    'irrigation-control': 'irrigation',
  };

  return systems[controlId];
}

export function App() {
  const [runtime, setRuntime] = useState(() => initialRuntimeState);
  const [selectedObject, setSelectedObject] = useState<SelectedRoomObject>('lighting');
  const [telemetryViewModes, setTelemetryViewModes] = useState<TelemetryViewModes>(initialTelemetryViewModes);
  const [eventDrawerState, setEventDrawerState] = useState<EventLogDrawerState>('collapsed');
  const runtimeState = runtime.simulation;
  const displayState = runtime.cockpit;

  useEffect(() => {
    if (!runtimeState.isRunning) return undefined;

    const interval = window.setInterval(() => {
      setRuntime((current) => advanceOperationsCockpitRuntime(current, { type: 'tick' }));
    }, BASE_TICK_MS / runtimeState.speed);

    return () => window.clearInterval(interval);
  }, [runtimeState.isRunning, runtimeState.speed]);

  function dispatch(action: OperationsCockpitRuntimeAction) {
    setRuntime((current) => advanceOperationsCockpitRuntime(current, action));
  }

  function handleControlModeChange(controlId: string, mode: OperatingMode) {
    const system = controlSystemFromId(controlId);
    if (!system) return;
    dispatch({ type: 'set-control-mode', system, mode });
  }

  function handleControlStateChange(controlId: string, controlValue: ControlState) {
    const system = controlSystemFromId(controlId);
    if (!system) return;
    dispatch({ type: 'set-control-state', system, control: controlValue });
  }

  function toggleEventDrawer() {
    setEventDrawerState((current) => (current === 'collapsed' ? 'expanded' : 'collapsed'));
  }

  function handleTelemetryModeChange(metricId: TelemetryKey, mode: TelemetryTileMode) {
    setTelemetryViewModes((current) => ({ ...current, [metricId]: mode }));
  }

  return (
    <main className="cockpit-shell" aria-label="Room Cockpit static prototype">
      <Header state={displayState} runtimeState={runtimeState} dispatch={dispatch} />

      <div className="cockpit-layout">
        <NavigationRail />

        <section className="workspace-grid" aria-label="Room cockpit workspace">
          <RoomContext state={displayState} eventCount={displayState.eventLog.length} onToggleEvents={toggleEventDrawer} />
          <RoomAssetsList state={displayState} selectedObject={selectedObject} onSelect={setSelectedObject} />
          <ObjectInspector
            state={displayState}
            selectedObject={selectedObject}
            onModeChange={handleControlModeChange}
            onControlChange={handleControlStateChange}
          />
          <EnvironmentalTelemetry
            items={displayState.environmentalTelemetry}
            trends={displayState.telemetryTrends}
            viewModes={telemetryViewModes}
            onModeChange={handleTelemetryModeChange}
          />
        </section>
      </div>

      <EventLogDrawer state={eventDrawerState} entries={displayState.eventLog} onToggle={toggleEventDrawer} />
    </main>
  );
}

function Header({
  state,
  runtimeState,
  dispatch,
}: {
  state: OperationsCockpitState;
  runtimeState: SimulationRuntimeState;
  dispatch: (action: OperationsCockpitRuntimeAction) => void;
}) {
  return (
    <header className="cockpit-header">
      <button className="menu-button" type="button" aria-label="Open navigation">
        <Icon name="menu" size="lg" />
      </button>
      <h1>{state.header.title}</h1>
      <div className="header-stats" aria-label="Simulation context">
        {state.header.stats.map((stat) => (
          <HeaderStatTile key={stat.label} stat={stat} />
        ))}
      </div>
      <TransportControls runtimeState={runtimeState} dispatch={dispatch} />
    </header>
  );
}

function TransportControls({
  runtimeState,
  dispatch,
}: {
  runtimeState: SimulationRuntimeState;
  dispatch: (action: OperationsCockpitRuntimeAction) => void;
}) {
  const speedIndex = speedOptions.indexOf(runtimeState.speed);

  return (
    <div className="transport-controls" aria-label="Simulation transport controls">
      <button
        className={runtimeState.isRunning ? 'transport-toggle running' : 'transport-toggle'}
        type="button"
        aria-pressed={runtimeState.isRunning}
        onClick={() => dispatch({ type: 'set-running', isRunning: !runtimeState.isRunning })}
      >
        <Icon name={runtimeState.isRunning ? 'pause' : 'play_arrow'} size="sm" filled />
        <span>{runtimeState.isRunning ? 'PAUSE' : 'RUN'}</span>
      </button>
      <label className="speed-control">
        <span>SIM SPEED</span>
        <input
          type="range"
          min="0"
          max={speedOptions.length - 1}
          step="1"
          value={speedIndex}
          aria-valuetext={formatSpeed(runtimeState.speed)}
          onChange={(event) => {
            const nextSpeed = speedOptions[Number(event.currentTarget.value)] ?? runtimeState.speed;
            dispatch({ type: 'set-speed', speed: nextSpeed });
          }}
        />
        <strong>{formatSpeed(runtimeState.speed)}</strong>
      </label>
    </div>
  );
}

function HeaderStatTile({ stat }: { stat: HeaderStat }) {
  const icon = headerStatIcon(stat.label);

  return (
    <div className={`header-stat ${stat.status ? `status-${stat.status}` : ''}`}>
      <span className="label stat-label">
        {icon ? <Icon name={icon} size="sm" /> : null}
        {stat.label}
      </span>
      <strong>{formatValue(stat.value, stat.unit)}</strong>
    </div>
  );
}

function NavigationRail() {
  const items = ['Cockpit', 'Rooms', 'Schedule', 'History', 'Maintenance', 'Settings'];

  return (
    <nav className="nav-rail" aria-label="Primary navigation">
      {items.map((item) => (
        <button key={item} className={item === 'Cockpit' ? 'nav-item active' : 'nav-item'} type="button">
          <Icon name={navIcon(item)} size="lg" filled={item === 'Cockpit'} className="nav-icon" />
          <span>{item}</span>
        </button>
      ))}
      <button className="nav-item logout" type="button">
        <Icon name="logout" size="lg" className="nav-icon" />
        <span>Log Out</span>
      </button>
    </nav>
  );
}

function RoomContext({
  state,
  eventCount,
  onToggleEvents,
}: {
  state: OperationsCockpitState;
  eventCount: number;
  onToggleEvents: () => void;
}) {
  const cycle = batchCycleSummary(state);
  const roomContext = `${state.roomOverview.roomId} / ${state.roomOverview.zoneId} - Batch ${state.roomOverview.batchId}`;
  const batchGroups = batchContextGroups(state);

  return (
    <Panel
      className="room-context-panel"
      title="Active Room Context"
      toolbar={(
        <button className="event-drawer-button" type="button" onClick={onToggleEvents}>
          <Icon name="receipt_long" size="sm" />
          <span>Event Log</span>
          <b>{eventCount}</b>
        </button>
      )}
    >
      <div className="room-context-grid" aria-label="Active operational context">
        <div className="room-context-strip">
          <ContextFact label="Room Context" value={roomContext} />
          <ContextFact label="Status" value={titleCase(state.roomOverview.status)} status={state.roomOverview.status} />
        </div>
        <article className={`context-cycle status-${cycle.status}`}>
          <div>
            <span className="label">Cycle Progress</span>
            <strong>{cycle.progress}%</strong>
            <small>Day {cycle.currentDay} of {cycle.cycleLengthDays}</small>
            <small>Phase: {cycle.phase}</small>
          </div>
          <ProgressBar value={cycle.progress} />
        </article>
        <div className="batch-context-facts">
          {batchGroups.map((group) => (
            <ContextGroup key={group.label} label={group.label} rows={group.rows} />
          ))}
        </div>
      </div>
    </Panel>
  );
}

function ContextFact({ label, value, status }: { label: string; value: string; status?: StatusLevel }) {
  return (
    <div className={status ? `context-status status-${status}` : undefined}>
      <span className="label">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ContextGroup({ label, rows }: { label: string; rows: [string, string][] }) {
  return (
    <div className="context-group">
      <span className="label">{label}</span>
      <dl>
        {rows.map(([rowLabel, value]) => (
          <div key={rowLabel}>
            <dt>{rowLabel}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function RoomAssetsList({
  state,
  selectedObject,
  onSelect,
}: {
  state: OperationsCockpitState;
  selectedObject: SelectedRoomObject;
  onSelect: (object: SelectedRoomObject) => void;
}) {
  const assets = roomAssets(state);

  return (
    <Panel className="room-assets" title="Room Objects">
      <div className="asset-list" aria-label="Selectable room systems and assets">
        {assets.map((asset) => (
          <button
            key={asset.id}
            className={selectedObject === asset.id ? 'asset-row selected' : 'asset-row'}
            type="button"
            aria-pressed={selectedObject === asset.id}
            onClick={() => onSelect(asset.id)}
          >
            <Icon name={asset.icon} size="lg" className="asset-kind-icon" />
            <span>
              <strong>{asset.name}</strong>
              <small>{asset.secondary}</small>
            </span>
            <span className={`asset-status status-${asset.statusLevel}`} aria-label={`Status: ${asset.status}`} title={asset.status}>
              <Icon name={asset.statusIcon} size="md" filled />
              <small>{asset.statusShort}</small>
            </span>
          </button>
        ))}
      </div>
    </Panel>
  );
}

function ObjectInspector({
  state,
  selectedObject,
  onModeChange,
  onControlChange,
}: {
  state: OperationsCockpitState;
  selectedObject: SelectedRoomObject;
  onModeChange: (controlId: string, mode: OperatingMode) => void;
  onControlChange: (controlId: string, controlValue: ControlState) => void;
}) {
  const details = inspectorHeader(state, selectedObject);

  return (
    <Panel className="object-inspector" title="Selected Object Inspector">
      <div className="inspector-shell">
        <div className="inspector-heading">
          <div>
            <span className="label">Selected Object</span>
            <strong>{details.name}</strong>
          </div>
          <b className={`status-pill status-${details.statusLevel}`}>{details.status}</b>
        </div>
        <InspectorContent
          state={state}
          selectedObject={selectedObject}
          onModeChange={onModeChange}
          onControlChange={onControlChange}
        />
      </div>
    </Panel>
  );
}

function InspectorContent({
  state,
  selectedObject,
  onModeChange,
  onControlChange,
}: {
  state: OperationsCockpitState;
  selectedObject: SelectedRoomObject;
  onModeChange: (controlId: string, mode: OperatingMode) => void;
  onControlChange: (controlId: string, controlValue: ControlState) => void;
}) {
  if (selectedObject === 'lighting') {
    return (
      <ControlledSystemInspector
        state={state}
        system="lighting"
        control={controlByLabel(state.controls, 'Light')}
        targetLabel="Target"
        metrics={['light-output']}
        fallbackEvent="No recent lighting event"
        onModeChange={onModeChange}
        onControlChange={onControlChange}
      />
    );
  }
  if (selectedObject === 'climate') {
    return (
      <ControlledSystemInspector
        state={state}
        system="climate"
        control={controlByLabel(state.controls, 'Climate')}
        targetLabel="Target Bias"
        metrics={['air-temperature', 'relative-humidity', 'airflow']}
        fallbackEvent="No recent climate event"
        onModeChange={onModeChange}
        onControlChange={onControlChange}
      />
    );
  }
  if (selectedObject === 'irrigation') {
    return (
      <ControlledSystemInspector
        state={state}
        system="irrigation"
        control={controlByLabel(state.controls, 'Irrigation')}
        targetLabel="Target Bias"
        metrics={['irrigation-index']}
        fallbackEvent="No recent irrigation event"
        onModeChange={onModeChange}
        onControlChange={onControlChange}
      />
    );
  }
  if (selectedObject === 'nutrient') return <NutrientInspector state={state} />;
  if (selectedObject === 'canopy') return <CanopyInspector state={state} />;
  if (selectedObject === 'sensors') return <SensorsInspector state={state} />;
  return <ExhaustInspector state={state} />;
}

function ControlledSystemInspector({
  state,
  system,
  control,
  targetLabel,
  metrics,
  fallbackEvent,
  onModeChange,
  onControlChange,
}: {
  state: OperationsCockpitState;
  system: SelectedRoomObject;
  control: ControlTileState | undefined;
  targetLabel: 'Target' | 'Target Bias';
  metrics: TelemetryKey[];
  fallbackEvent: string;
  onModeChange: (controlId: string, mode: OperatingMode) => void;
  onControlChange: (controlId: string, controlValue: ControlState) => void;
}) {
  const lastEvent = lastEventForObject(state.eventLog, system, fallbackEvent);

  return (
    <div className="system-inspector-grid">
      {control ? (
        <div className="inspector-controls">
          <div className="control-row">
            <span className="label">Mode</span>
            <SegmentedControl items={modeOptions} active={control.activeMode} onChange={(mode) => onModeChange(control.id, mode)} />
          </div>
          <div className="control-row">
            <span className="label">Control</span>
            <SegmentedControl
              items={controlOptions}
              active={control.activeControl}
              onChange={(controlValue) => onControlChange(control.id, controlValue)}
            />
          </div>
          <InspectorFacts
            facts={[
              ['Status', 'Online'],
              [targetLabel, formatInspectorValue(control.primaryTuning)],
            ]}
          />
        </div>
      ) : null}
      <RelatedTelemetry state={state} metricIds={metrics} />
      <LastEvent event={lastEvent} />
    </div>
  );
}

function NutrientInspector({ state }: { state: OperationsCockpitState }) {
  const reservoir = metricById(state.environmentalTelemetry, 'nutrient-reservoir');

  return (
    <div className="inspector-stack">
      <InspectorFacts
        facts={[
          ['Status', 'Online'],
          ['Reservoir Connected', 'Yes'],
          ['Nutrient Reservoir %', reservoir ? formatValue(reservoir.value, reservoir.unit) : 'Unavailable'],
          ['Refill Threshold', reservoir?.reference?.replace('Refill Threshold ', '') ?? '20 %'],
        ]}
      />
      <LastEvent event={lastEventForObject(state.eventLog, 'nutrient', 'Reservoir connected')} />
    </div>
  );
}

function CanopyInspector({ state }: { state: OperationsCockpitState }) {
  const canopy = capacityById(state.roomOverview.capacity, 'canopy-tables');

  return (
    <div className="inspector-stack">
      <InspectorFacts
        facts={[
          ['Status', 'Monitored'],
          ['Tables Active', `${canopy?.active ?? 0} active`],
          ['Batch Reference', state.roomOverview.batchId],
          ['Plant Detail Model', 'Not available in Iteration 1'],
        ]}
      />
    </div>
  );
}

function SensorsInspector({ state }: { state: OperationsCockpitState }) {
  const sensors = capacityById(state.roomOverview.capacity, 'sensor-points');
  const coverageMetricIds: TelemetryKey[] = ['air-temperature', 'relative-humidity', 'co2-index', 'airflow'];
  const coverage = coverageMetricIds
    .map((id) => metricById(state.environmentalTelemetry, id)?.label)
    .filter(Boolean)
    .join(' / ');

  return (
    <div className="inspector-stack">
      <InspectorFacts
        facts={[
          ['Status', titleCase(state.roomOverview.status)],
          ['Sensor Points Online', `${sensors?.online ?? 0} / ${sensors?.total ?? 0}`],
          ['Telemetry Coverage', coverage],
        ]}
      />
      <RelatedTelemetry state={state} metricIds={['air-temperature', 'relative-humidity', 'co2-index', 'airflow']} />
      <LastEvent event={lastEventForObject(state.eventLog, 'sensors', 'No recent sensor network event')} />
    </div>
  );
}

function ExhaustInspector({ state }: { state: OperationsCockpitState }) {
  const exhaust = capacityById(state.roomOverview.capacity, 'exhaust-filters');

  return (
    <div className="inspector-stack">
      <InspectorFacts
        facts={[
          ['Filter Count', `${exhaust?.online ?? 0} / ${exhaust?.total ?? 0}`],
          ['Status', 'Maintenance Due'],
          ['Maintenance State', 'Due in 3 days'],
        ]}
      />
      <LastEvent event={lastEventForObject(state.eventLog, 'exhaust', 'No recent filtration event')} />
    </div>
  );
}

function RelatedTelemetry({ state, metricIds }: { state: OperationsCockpitState; metricIds: TelemetryKey[] }) {
  const metrics = metricIds.map((id) => metricById(state.environmentalTelemetry, id)).filter((item): item is MetricTileState => Boolean(item));

  return (
    <section className="related-telemetry" aria-label="Related telemetry">
      <h3>Related Telemetry</h3>
      <div>
        {metrics.map((metric) => (
          <MetricReadout key={metric.id} item={metric} />
        ))}
      </div>
    </section>
  );
}

function InspectorFacts({ facts }: { facts: [string, string][] }) {
  return (
    <dl className="inspector-facts">
      {facts.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function LastEvent({ event }: { event: string }) {
  return (
    <article className="last-event">
      <span className="label">Last Relevant Event</span>
      <strong>{event}</strong>
    </article>
  );
}

function EnvironmentalTelemetry({
  items,
  trends,
  viewModes,
  onModeChange,
}: {
  items: MetricTileState[];
  trends: TrendTileState[];
  viewModes: TelemetryViewModes;
  onModeChange: (metricId: TelemetryKey, mode: TelemetryTileMode) => void;
}) {
  return (
    <Panel className="environmental-telemetry" title="Environmental Telemetry">
      <div className="metric-grid">
        {items.map((item) => {
          if (!isTelemetryKey(item.id)) return null;

          const metricId = item.id;
          const mode = viewModes[metricId];
          const trend = trends.find((trendItem) => trendItem.id === trendIdForMetric(metricId));

          return (
            <MetricTile
              key={item.id}
              item={item}
              mode={mode}
              trend={trend}
              onModeChange={(nextMode) => onModeChange(metricId, nextMode)}
            />
          );
        })}
      </div>
    </Panel>
  );
}

function EventLogDrawer({
  state,
  entries,
  onToggle,
}: {
  state: EventLogDrawerState;
  entries: EventLogEntryState[];
  onToggle: () => void;
}) {
  const latest = entries[0];
  const expanded = state === 'expanded';

  return (
    <aside className={`event-drawer ${state}`} aria-label="Event Log">
      <div className="event-drawer-header">
        <button type="button" onClick={onToggle} aria-expanded={expanded}>
          <Icon name={expanded ? 'keyboard_arrow_down' : 'keyboard_arrow_up'} size="sm" />
          <span>Event Log</span>
        </button>
        {latest ? <strong>{latest.title}</strong> : <strong>No events logged</strong>}
        <div className="log-filter" aria-label="Event log filters">
          <button className="active" type="button">All</button>
          <button type="button">Alerts</button>
          <button type="button">Info</button>
        </div>
      </div>
      {expanded ? (
        <div className="event-list">
          {entries.map((entry) => <EventRow key={entry.id} entry={entry} />)}
        </div>
      ) : null}
    </aside>
  );
}

function Panel({
  title,
  toolbar,
  className,
  children,
}: {
  title: string;
  toolbar?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`panel ${className ?? ''}`} aria-labelledby={slug(title)}>
      <div className="panel-header">
        <h2 id={slug(title)}>{title}</h2>
        {toolbar}
      </div>
      {children}
    </section>
  );
}

function MetricTile({
  item,
  mode,
  trend,
  onModeChange,
}: {
  item: MetricTileState;
  mode: TelemetryTileMode;
  trend: TrendTileState | undefined;
  onModeChange: (mode: TelemetryTileMode) => void;
}) {
  const isTrendMode = mode === 'trend' && Boolean(trend);
  const displayedValue = isTrendMode && trend ? formatValue(trend.currentValue, trend.unit) : formatValue(item.value, item.unit);
  const nextMode: TelemetryTileMode = isTrendMode ? 'current' : 'trend';

  return (
    <article className={`metric-tile metric-mode-${isTrendMode ? 'trend' : 'current'} status-${item.status}`}>
      <div className="metric-tile-header">
        <span className="label">{item.label}</span>
        <button
          className={isTrendMode ? 'metric-mode-toggle active' : 'metric-mode-toggle'}
          type="button"
          aria-label={isTrendMode ? 'Show current value' : 'Show trend'}
          aria-pressed={isTrendMode}
          onClick={() => onModeChange(nextMode)}
        >
          <Icon name="show_chart" size="sm" />
        </button>
      </div>
      <div className="metric-body">
        <strong>{displayedValue}</strong>
        <small>{item.reference ?? '\u00a0'}</small>
        <div className="metric-visual">
          {isTrendMode && trend ? (
            <Sparkline points={trend.points} />
          ) : (
            <Gauge value={metricPercent(item)} />
          )}
        </div>
      </div>
    </article>
  );
}

function MetricReadout({ item }: { item: MetricTileState }) {
  return (
    <article className={`metric-readout status-${item.status}`}>
      <span className="label">{item.label}</span>
      <strong>{formatValue(item.value, item.unit)}</strong>
      {item.reference ? <small>{item.reference}</small> : null}
    </article>
  );
}

function SegmentedControl<T extends string>({
  items,
  active,
  onChange,
}: {
  items: readonly T[];
  active: T;
  onChange: (item: T) => void;
}) {
  return (
    <div className="segmented-control">
      {items.map((item) => (
        <button
          key={item}
          className={item === active ? 'active' : ''}
          type="button"
          aria-pressed={item === active}
          onClick={() => onChange(item)}
        >
          {titleCase(item)}
        </button>
      ))}
    </div>
  );
}

function Sparkline({ points }: { points: number[] }) {
  const width = 180;
  const height = 54;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = Math.max(max - min, 1);
  const step = points.length > 1 ? width / (points.length - 1) : width;
  const d = points
    .map((point, index) => {
      const x = index * step;
      const y = height - ((point - min) / range) * (height - 8) - 4;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');

  return (
    <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Trend line">
      <path className="sparkline-grid" d="M 0 13.5 H 180 M 0 27 H 180 M 0 40.5 H 180" />
      <path className="sparkline-line" d={d} />
    </svg>
  );
}

function Gauge({ value }: { value: string | number }) {
  const percent = typeof value === 'number' ? value : Number.parseFloat(value);
  const gaugeAngle = Number.isFinite(percent) ? `${clamp(percent, 0, 100) * 1.8}deg` : '117deg';

  return (
    <div className="gauge" aria-hidden="true" style={{ '--gauge-angle': gaugeAngle } as CSSProperties}>
      <span />
    </div>
  );
}

function EventRow({ entry }: { entry: EventLogEntryState }) {
  return (
    <article className={`event-row severity-${entry.severity}`}>
      <div className="event-time">
        <strong>{entry.time}</strong>
        <span>Day {entry.day} / Tick {entry.tick}</span>
      </div>
      <Icon name={severityIcon(entry.severity)} size="sm" className="event-icon" />
      <div className="event-copy">
        <strong>{entry.title}</strong>
        {entry.detail ? <span>{entry.detail}</span> : null}
      </div>
      <span className="event-tag">{entry.severity}</span>
    </article>
  );
}

function ProgressBar({ value }: { value: number }) {
  const progress = clamp(value, 0, 100);

  return (
    <div className="progress-bar" aria-label={`Progress ${progress}%`}>
      <span style={{ width: `${progress}%` }} />
    </div>
  );
}

function roomAssets(state: OperationsCockpitState) {
  const lighting = controlByLabel(state.controls, 'Light');
  const climate = controlByLabel(state.controls, 'Climate');
  const irrigation = controlByLabel(state.controls, 'Irrigation');
  const canopy = capacityById(state.roomOverview.capacity, 'canopy-tables');
  const sensors = capacityById(state.roomOverview.capacity, 'sensor-points');

  return [
    {
      id: 'canopy',
      icon: 'yard',
      name: 'Canopy / Plants',
      secondary: `${canopy?.active ?? 0} tables active`,
      status: 'Monitored',
      statusShort: 'Watch',
      statusIcon: 'visibility',
      statusLevel: 'normal',
    },
    {
      id: 'lighting',
      icon: 'lightbulb',
      name: 'Lighting System',
      secondary: controlMode(lighting),
      status: 'Online',
      statusShort: 'Online',
      statusIcon: 'check_circle',
      statusLevel: 'normal',
    },
    {
      id: 'climate',
      icon: 'air',
      name: 'Climate System',
      secondary: controlMode(climate),
      status: 'Online',
      statusShort: 'Online',
      statusIcon: 'check_circle',
      statusLevel: 'normal',
    },
    {
      id: 'irrigation',
      icon: 'water_drop',
      name: 'Irrigation System',
      secondary: controlMode(irrigation),
      status: 'Online',
      statusShort: 'Online',
      statusIcon: 'check_circle',
      statusLevel: 'normal',
    },
    {
      id: 'nutrient',
      icon: 'science',
      name: 'Nutrient System',
      secondary: 'Reservoir Connected',
      status: 'Online',
      statusShort: 'Online',
      statusIcon: 'check_circle',
      statusLevel: 'normal',
    },
    {
      id: 'sensors',
      icon: 'sensors',
      name: 'Sensor Network',
      secondary: `${sensors?.online ?? 0} points online`,
      status: titleCase(state.roomOverview.status),
      statusShort: statusShortLabel(state.roomOverview.status),
      statusIcon: statusIcon(state.roomOverview.status),
      statusLevel: state.roomOverview.status,
    },
    {
      id: 'exhaust',
      icon: 'filter_alt',
      name: 'Exhaust / Filtration',
      secondary: 'Maintenance due',
      status: 'Maintenance Due',
      statusShort: 'Due',
      statusIcon: 'build_circle',
      statusLevel: 'warning',
    },
  ] as const satisfies readonly {
    id: SelectedRoomObject;
    icon: string;
    name: string;
    secondary: string;
    status: string;
    statusShort: string;
    statusIcon: string;
    statusLevel: 'normal' | 'warning' | 'critical';
  }[];
}

function inspectorHeader(state: OperationsCockpitState, selectedObject: SelectedRoomObject) {
  const asset = roomAssets(state).find((item) => item.id === selectedObject) ?? roomAssets(state)[0];
  return {
    name: asset.name,
    status: asset.status,
    statusLevel: asset.statusLevel,
  };
}

function batchContextGroups(state: OperationsCockpitState): { label: string; rows: [string, string][] }[] {
  const healthIndex = state.batchStatus.find((item) => item.id === 'batch-health-index');
  const moistureBalance = state.batchStatus.find((item) => item.id === 'moisture-balance');
  const yieldForecast = state.batchStatus.find((item) => item.id === 'yield-forecast');
  const qualityEstimate = state.batchStatus.find((item) => item.id === 'quality-estimate');

  return [
    {
      label: 'Health / Yield',
      rows: [
        ['Health Index', healthIndex ? formatValue(healthIndex.value, healthIndex.unit) : 'Unavailable'],
        ['Yield Forecast', yieldForecast ? formatValue(yieldForecast.value, yieldForecast.unit) : 'Unavailable'],
      ],
    },
    {
      label: 'Moisture / Quality',
      rows: [
        ['Moisture Balance', moistureBalance ? formatValue(moistureBalance.value, moistureBalance.unit) : 'Unavailable'],
        ['Quality Estimate', qualityEstimate ? formatValue(qualityEstimate.value, qualityEstimate.unit) : 'Unavailable'],
      ],
    },
  ];
}

function batchCycleSummary(state: OperationsCockpitState) {
  const cycleProgress = state.batchStatus.find((item) => item.id === 'cycle-progress');
  const dayStat = state.header.stats.find((item) => item.label === 'Day')?.value;
  const cycleText = cycleProgress?.secondary ?? '';
  const match = /Day\s+(\d+)\s+of\s+(\d+)/i.exec(cycleText);
  const currentDay = typeof dayStat === 'number' ? dayStat : Number(match?.[1] ?? 0);
  const cycleLengthDays = Number(match?.[2] ?? currentDay);
  const progress = clamp(Math.round((currentDay / Math.max(cycleLengthDays, 1)) * 100), 0, 100);

  return {
    currentDay,
    cycleLengthDays,
    phase: state.roomOverview.phase || lifecyclePhaseFromProgress(progress),
    progress,
    status: cycleProgress?.status ?? state.roomOverview.status,
  };
}

function lifecyclePhaseFromProgress(progress: number) {
  if (progress <= 15) return 'Seedling';
  if (progress <= 45) return 'Vegetative';
  if (progress <= 85) return 'Flowering';
  return 'Late Cycle';
}

function formatInspectorValue(tuning?: ControlTileState['primaryTuning']) {
  if (!tuning) return 'Nominal';
  return formatValue(tuning.value, tuning.unit);
}

function metricById(items: MetricTileState[], id: TelemetryKey) {
  return items.find((item) => item.id === id);
}

function capacityById(items: RoomCapacityItemState[], id: string) {
  return items.find((item) => item.id === id);
}

function lastEventForObject(entries: EventLogEntryState[], selectedObject: SelectedRoomObject, fallback: string) {
  const needles: Record<SelectedRoomObject, string[]> = {
    canopy: ['canopy', 'table'],
    lighting: ['light'],
    climate: ['climate', 'humidity', 'airflow'],
    irrigation: ['irrigation'],
    nutrient: ['nutrient', 'reservoir'],
    sensors: ['sensor', 'network', 'co2'],
    exhaust: ['filter', 'exhaust', 'filtration'],
  };
  const entry = entries.find((item) => {
    const text = `${item.title} ${item.detail ?? ''}`.toLowerCase();
    return needles[selectedObject].some((needle) => text.includes(needle));
  });

  return entry?.title.replace(/\.$/, '') ?? fallback;
}

function formatSpeed(speed: SimSpeed) {
  return `${speed}x`;
}

function formatValue(value: string | number, unit?: string) {
  if (!unit) return String(value);
  if (unit === '$') return `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (unit.startsWith('/')) return `${value}${unit}`;
  return `${value} ${unit}`;
}

function metricPercent(item: MetricTileState) {
  if (typeof item.value !== 'number') return '65%';
  if (item.unit === 'Â°C') return `${clamp((item.value / 35) * 100, 0, 100)}%`;
  if (item.unit === 'ppm') return `${clamp((item.value / 1600) * 100, 0, 100)}%`;
  return `${clamp(item.value, 0, 100)}%`;
}

function statusIcon(status: StatusLevel) {
  const icons: Record<StatusLevel, string> = {
    normal: 'check_circle',
    warning: 'warning',
    critical: 'error',
  };
  return icons[status];
}

function statusShortLabel(status: StatusLevel) {
  const labels: Record<StatusLevel, string> = {
    normal: 'Online',
    warning: 'Warn',
    critical: 'Critical',
  };
  return labels[status];
}

function trendIdForMetric(id: TelemetryKey): TrendTileState['id'] {
  return `${id}-trend`;
}

function isTelemetryKey(id: string): id is TelemetryKey {
  return (
    id === 'air-temperature'
    || id === 'relative-humidity'
    || id === 'co2-index'
    || id === 'light-output'
    || id === 'irrigation-index'
    || id === 'airflow'
    || id === 'nutrient-reservoir'
  );
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function titleCase(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function controlByLabel(items: ControlTileState[], label: string) {
  return items.find((item) => item.label === label);
}

function controlMode(item?: ControlTileState) {
  if (!item) return 'Balanced / Auto';
  return `${titleCase(item.activeMode)} / ${titleCase(item.activeControl)}`;
}

function navIcon(item: string) {
  const icons: Record<string, string> = {
    Cockpit: 'dashboard',
    Rooms: 'home_work',
    Schedule: 'calendar_month',
    History: 'history',
    Maintenance: 'build',
    Settings: 'settings',
  };
  return icons[item] ?? 'dashboard';
}

function headerStatIcon(label: string) {
  const icons: Record<string, string> = {
    Day: 'calendar_today',
    Tick: 'timer',
    'Overall Status': 'check_circle',
    'Facility Load': 'bolt',
    'Cost Today': 'payments',
    Utility: 'electrical_services',
  };
  return icons[label];
}

function severityIcon(severity: EventLogEntryState['severity'] | 'maintenance') {
  const icons: Record<string, string> = {
    info: 'info',
    warning: 'warning',
    critical: 'error',
    maintenance: 'build',
  };
  return icons[severity] ?? 'info';
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
