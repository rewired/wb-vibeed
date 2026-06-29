import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import blueprintData from './operations-cockpit-blueprint.json';
import { rehydrateOperationsCockpit } from './operations-cockpit-rehydrate';
import { advanceOperationsCockpitRuntime } from './operations-cockpit-runtime';
import type {
  ControlTileState,
  EventLogEntryState,
  HeaderStat,
  MetricTileState,
  OperatingMode,
  OperationsCockpitControlSystem,
  OperationsCockpitBlueprint,
  OperationsCockpitRuntimeAction,
  OperationsCockpitState,
  ProgressTileState,
  SimSpeed,
  SimulationRuntimeState,
  TrendTileState,
  ControlState,
} from './operations-cockpit-state-types';

const initialRuntimeState = rehydrateOperationsCockpit(blueprintData as OperationsCockpitBlueprint);
const modeOptions = ['Eco', 'Balanced', 'Push'] as const;
const controlOptions = ['Auto', 'Manual'] as const;
const speedOptions = [1, 2, 4, 8] as const satisfies readonly SimSpeed[];
const BASE_TICK_MS = 1000;
type SelectedSystem = 'lighting' | 'climate' | 'irrigation' | 'nutrient';
type TelemetryViewMode = 'current' | 'trend';
type TelemetryViewModes = Record<string, TelemetryViewMode>;

const defaultTelemetryViewModes = initialRuntimeState.cockpit.environmentalTelemetry.reduce<TelemetryViewModes>(
  (modes, item) => ({ ...modes, [item.id]: 'current' }),
  {},
);

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
  const [selectedSystem, setSelectedSystem] = useState<SelectedSystem>('lighting');
  const [telemetryViewModes, setTelemetryViewModes] = useState<TelemetryViewModes>(() => defaultTelemetryViewModes);
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

  function handleTelemetryViewModeChange(metricId: string, mode: TelemetryViewMode) {
    setTelemetryViewModes((current) => ({ ...current, [metricId]: mode }));
  }

  return (
    <main className="cockpit-shell" aria-label="Operations Cockpit static prototype">
      <Header state={displayState} runtimeState={runtimeState} dispatch={dispatch} />

      <div className="cockpit-layout">
        <NavigationRail />

        <section className="screen-grid" aria-label="Operations cockpit panels">
          <RoomOverview
            state={displayState}
            selectedSystem={selectedSystem}
            onSystemSelect={setSelectedSystem}
            onModeChange={handleControlModeChange}
            onControlChange={handleControlStateChange}
          />
          <BatchStatus items={displayState.batchStatus} />
          <EnvironmentalTelemetry
            items={displayState.environmentalTelemetry}
            trends={displayState.telemetryTrends}
            viewModes={telemetryViewModes}
            onViewModeChange={handleTelemetryViewModeChange}
          />
          <EventLog entries={displayState.eventLog} />
        </section>
      </div>
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

function RoomOverview({
  state,
  selectedSystem,
  onSystemSelect,
  onModeChange,
  onControlChange,
}: {
  state: OperationsCockpitState;
  selectedSystem: SelectedSystem;
  onSystemSelect: (system: SelectedSystem) => void;
  onModeChange: (controlId: string, mode: OperatingMode) => void;
  onControlChange: (controlId: string, controlValue: ControlState) => void;
}) {
  const lighting = controlByLabel(state.controls, 'Light');
  const climate = controlByLabel(state.controls, 'Climate');
  const irrigation = controlByLabel(state.controls, 'Irrigation');
  const maintenance = state.eventLog.find((entry) => entry.title.toLowerCase().includes('maintenance'));

  return (
    <Panel className="room-overview" title={state.roomOverview.title}>
      <div className="room-ops-overview" aria-label="Room operational overview">
        <div className="room-context" aria-label="Active operational context">
          <div>
            <span className="label">Room / Zone</span>
            <strong>{state.roomOverview.roomId} / {state.roomOverview.zoneId}</strong>
          </div>
          <div>
            <span className="label">Batch</span>
            <strong>{state.roomOverview.batchId}</strong>
          </div>
          <div>
            <span className="label">Phase</span>
            <strong>{state.roomOverview.phase}</strong>
          </div>
          <div className={`status-${state.roomOverview.status}`}>
            <span className="label">Status</span>
            <strong>{titleCase(state.roomOverview.status)}</strong>
          </div>
        </div>

        <section className="overview-group capacity-group" aria-label="Capacity and active setup">
          <h3>Capacity / Readiness</h3>
          <div className="capacity-list">
            {state.roomOverview.capacity.map((item) => (
              <div key={item.id} className="capacity-item">
                <Icon name={item.icon} size="sm" />
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="overview-group systems-group" aria-label="Core room systems">
          <h3>Core Systems</h3>
          <div className="system-list">
            <SystemStatus
              id="lighting"
              icon="lightbulb"
              label="Lighting System"
              mode={controlMode(lighting)}
              value="Online"
              selected={selectedSystem === 'lighting'}
              onSelect={onSystemSelect}
            />
            <SystemStatus
              id="climate"
              icon="air"
              label="Climate System"
              mode={controlMode(climate)}
              value="Online"
              selected={selectedSystem === 'climate'}
              onSelect={onSystemSelect}
            />
            <SystemStatus
              id="irrigation"
              icon="water_drop"
              label="Irrigation System"
              mode={controlMode(irrigation)}
              value="Online"
              selected={selectedSystem === 'irrigation'}
              onSelect={onSystemSelect}
            />
            <SystemStatus
              id="nutrient"
              icon="water_drop"
              label="Nutrient System"
              mode="Reservoir Connected"
              value="Online"
              selected={selectedSystem === 'nutrient'}
              onSelect={onSystemSelect}
            />
          </div>
        </section>

        <SystemInspector
          state={state}
          selectedSystem={selectedSystem}
          onModeChange={onModeChange}
          onControlChange={onControlChange}
        />

        <section className="overview-group attention-group" aria-label="Attention and maintenance">
          <h3>Attention / Room Notices</h3>
          <div className="attention-list">
            <div className="attention-item normal">
              <Icon name="check_circle" size="sm" />
              <span>No active room faults</span>
            </div>
            {maintenance ? (
              <div className="attention-item">
                <Icon name="build" size="sm" />
                <span>{maintenance.title}</span>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </Panel>
  );
}

function BatchStatus({ items }: { items: ProgressTileState[] }) {
  const [cycleProgress, ...kpis] = items;

  return (
    <Panel className="batch-status" title="Batch Status">
      {cycleProgress ? (
        <article className={`batch-progress status-${cycleProgress.status ?? 'normal'}`}>
          <div>
            <span className="label">{cycleProgress.label}</span>
            {cycleProgress.secondary ? <small>{cycleProgress.secondary}</small> : null}
          </div>
          <strong>{formatValue(cycleProgress.value, cycleProgress.unit)}</strong>
          {typeof cycleProgress.value === 'number' ? <ProgressBar value={cycleProgress.value} /> : null}
        </article>
      ) : null}
      <div className="batch-kpi-grid">
        {kpis.map((item) => (
          <article key={item.id} className={`batch-kpi ${item.status ? `status-${item.status}` : ''}`}>
            <span className="label">{compactBatchLabel(item.label)}</span>
            <strong>{formatValue(item.value, item.unit)}</strong>
            {item.secondary ? <small>{item.secondary}</small> : null}
          </article>
        ))}
      </div>
    </Panel>
  );
}

function SystemStatus({
  id,
  icon,
  label,
  mode,
  value,
  selected,
  onSelect,
}: {
  id: SelectedSystem;
  icon: string;
  label: string;
  mode: string;
  value: string;
  selected: boolean;
  onSelect: (system: SelectedSystem) => void;
}) {
  return (
    <button
      className={selected ? 'system-status selected' : 'system-status'}
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(id)}
    >
      <Icon name={icon} size="sm" />
      <div>
        <strong>{label}</strong>
        <span>{mode}</span>
      </div>
      <b>{value}</b>
    </button>
  );
}

function SystemInspector({
  state,
  selectedSystem,
  onModeChange,
  onControlChange,
}: {
  state: OperationsCockpitState;
  selectedSystem: SelectedSystem;
  onModeChange: (controlId: string, mode: OperatingMode) => void;
  onControlChange: (controlId: string, controlValue: ControlState) => void;
}) {
  const details = systemInspectorDetails(state, selectedSystem);
  const control = details.control;

  return (
    <section className="overview-group system-inspector" aria-label="Selected system inspector">
      <h3>System Inspector</h3>
      <div className="inspector-body">
        <div className="inspector-title">
          <Icon name={details.icon} size="lg" />
          <div>
            <span className="label">Selected System</span>
            <strong>{details.name}</strong>
          </div>
          <b>{details.status}</b>
        </div>

        {control ? (
          <div className="inspector-controls">
            <div className="control-row">
              <span className="label">Mode</span>
              <SegmentedControl
                items={modeOptions}
                active={control.activeMode}
                onChange={(mode) => onModeChange(control.id, mode)}
              />
            </div>
            <div className="control-row">
              <span className="label">Control</span>
              <SegmentedControl
                items={controlOptions}
                active={control.activeControl}
                onChange={(controlValue) => onControlChange(control.id, controlValue)}
              />
            </div>
          </div>
        ) : null}

        <dl className="inspector-facts">
          {details.facts.map((fact) => (
            <div key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function EnvironmentalTelemetry({
  items,
  trends,
  viewModes,
  onViewModeChange,
}: {
  items: MetricTileState[];
  trends: TrendTileState[];
  viewModes: TelemetryViewModes;
  onViewModeChange: (metricId: string, mode: TelemetryViewMode) => void;
}) {
  const trendByLabel = new Map(trends.map((trend) => [trend.label, trend]));

  return (
    <Panel className="environmental-telemetry" title="Environmental Telemetry">
      <div className="metric-grid">
        {items.map((item) => (
          <MetricTile
            key={item.id}
            item={item}
            trend={trendByLabel.get(item.label)}
            viewMode={viewModes[item.id] ?? 'current'}
            onViewModeChange={onViewModeChange}
          />
        ))}
      </div>
    </Panel>
  );
}

function EventLog({ entries }: { entries: EventLogEntryState[] }) {
  return (
    <Panel
      className="event-log"
      title="Alerts & Event Log"
      toolbar={(
        <div className="log-filter" aria-label="Event log filters">
          <button className="active" type="button">All</button>
          <button type="button">Alerts</button>
          <button type="button">Info</button>
        </div>
      )}
    >
      <div className="event-list">
        {entries.map((entry) => <EventRow key={entry.id} entry={entry} />)}
      </div>
    </Panel>
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
  trend,
  viewMode,
  onViewModeChange,
}: {
  item: MetricTileState;
  trend: TrendTileState | undefined;
  viewMode: TelemetryViewMode;
  onViewModeChange: (metricId: string, mode: TelemetryViewMode) => void;
}) {
  return (
    <article className={`metric-tile status-${item.status}`}>
      <div className="metric-tile-header">
        <span className="label">{item.label}</span>
        <div className="tile-toggle" aria-label={`${item.label} display mode`}>
          <button
            className={viewMode === 'current' ? 'active' : ''}
            type="button"
            aria-pressed={viewMode === 'current'}
            onClick={() => onViewModeChange(item.id, 'current')}
          >
            Current
          </button>
          <button
            className={viewMode === 'trend' ? 'active' : ''}
            type="button"
            aria-pressed={viewMode === 'trend'}
            onClick={() => onViewModeChange(item.id, 'trend')}
          >
            Trend
          </button>
        </div>
      </div>
      {viewMode === 'trend' && trend ? (
        <div className="metric-trend">
          <strong>{formatValue(trend.currentValue, trend.unit)}</strong>
          <Sparkline points={trend.points} />
        </div>
      ) : (
        <div className="metric-current">
          <div className="gauge" aria-hidden="true">
            <span style={{ '--gauge-value': metricPercent(item) } as CSSProperties} />
          </div>
          <strong>{formatValue(item.value, item.unit)}</strong>
          {item.reference ? <small>{item.reference}</small> : null}
        </div>
      )}
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

function EventRow({ entry }: { entry: EventLogEntryState }) {
  return (
    <article className={`event-row severity-${entry.severity}`}>
      <div className="event-time">
        <strong>{entry.time}</strong>
        <span>Day {entry.day} · Tick {entry.tick}</span>
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
  const progress = Math.min(Math.max(value, 0), 100);

  return (
    <div className="progress-bar" aria-label={`Progress ${progress}%`}>
      <span style={{ width: `${progress}%` }} />
    </div>
  );
}

function systemInspectorDetails(state: OperationsCockpitState, selectedSystem: SelectedSystem) {
  const light = controlByLabel(state.controls, 'Light');
  const climate = controlByLabel(state.controls, 'Climate');
  const irrigation = controlByLabel(state.controls, 'Irrigation');
  const nutrientReservoir = metricById(state.environmentalTelemetry, 'nutrient-reservoir');

  if (selectedSystem === 'lighting') {
    return {
      name: 'Lighting System',
      icon: 'lightbulb',
      status: 'Online',
      control: light,
      facts: [
        inspectorFact(light?.primaryTuning.label ?? 'Target', formatInspectorValue(light?.primaryTuning)),
        inspectorFact('Related', metricReference(state.environmentalTelemetry, 'light-output')),
        inspectorFact('Last Event', lastEventForSystem(state.eventLog, selectedSystem, 'Mode changed to Balanced')),
      ],
    };
  }

  if (selectedSystem === 'climate') {
    return {
      name: 'Climate System',
      icon: 'air',
      status: 'Online',
      control: climate,
      facts: [
        inspectorFact(climate?.primaryTuning.label ?? 'Target Bias', formatInspectorValue(climate?.primaryTuning)),
        inspectorFact(
          'Related',
          `${metricReference(state.environmentalTelemetry, 'air-temperature')} / ${metricReference(state.environmentalTelemetry, 'airflow')}`,
        ),
        inspectorFact('Last Event', lastEventForSystem(state.eventLog, selectedSystem, 'No recent manual change')),
      ],
    };
  }

  if (selectedSystem === 'irrigation') {
    return {
      name: 'Irrigation System',
      icon: 'water_drop',
      status: 'Online',
      control: irrigation,
      facts: [
        inspectorFact(irrigation?.primaryTuning.label ?? 'Target Bias', formatInspectorValue(irrigation?.primaryTuning)),
        inspectorFact('Related', metricReference(state.environmentalTelemetry, 'irrigation-index')),
        inspectorFact('Last Event', lastEventForSystem(state.eventLog, selectedSystem, 'Irrigation cycle complete')),
      ],
    };
  }

  return {
    name: 'Nutrient System',
    icon: 'science',
    status: 'Online',
    control: undefined,
    facts: [
      inspectorFact('Reservoir', 'Connected'),
      inspectorFact('Related', metricReference(state.environmentalTelemetry, 'nutrient-reservoir')),
      inspectorFact('Refill Threshold', nutrientReservoir?.reference?.replace('Refill Threshold ', '') ?? '20 %'),
      inspectorFact('Last Event', lastEventForSystem(state.eventLog, selectedSystem, 'No active room faults')),
    ],
  };
}

function inspectorFact(label: string, value: string) {
  return { label, value };
}

function formatInspectorValue(tuning?: ControlTileState['primaryTuning']) {
  if (!tuning) return 'Nominal';
  return formatValue(tuning.value, tuning.unit);
}

function metricReference(items: MetricTileState[], id: string) {
  const item = metricById(items, id);
  if (!item) return 'Unavailable';
  return `${item.label} ${formatValue(item.value, item.unit)}`;
}

function metricById(items: MetricTileState[], id: string) {
  return items.find((item) => item.id === id);
}

function lastEventForSystem(entries: EventLogEntryState[], selectedSystem: SelectedSystem, fallback: string) {
  const needles: Record<SelectedSystem, string[]> = {
    lighting: ['light'],
    climate: ['climate', 'humidity', 'airflow'],
    irrigation: ['irrigation'],
    nutrient: ['nutrient', 'reservoir'],
  };
  const entry = entries.find((item) => {
    const text = `${item.title} ${item.detail ?? ''}`.toLowerCase();
    return needles[selectedSystem].some((needle) => text.includes(needle));
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
  if (item.unit === '°C') return `${Math.min(Math.max((item.value / 35) * 100, 0), 100)}%`;
  if (item.unit === 'ppm') return `${Math.min(Math.max((item.value / 1600) * 100, 0), 100)}%`;
  return `${Math.min(Math.max(item.value, 0), 100)}%`;
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
  if (!item) return 'Auto';
  return `${titleCase(item.activeMode)} / ${titleCase(item.activeControl)}`;
}

function compactBatchLabel(label: string) {
  if (label === 'Batch Health Index') return 'Health Index';
  return label;
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
    Phase: 'cycle',
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
