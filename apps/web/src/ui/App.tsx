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
  UtilityStatusItemState,
  ControlState,
} from './operations-cockpit-state-types';

const initialRuntimeState = rehydrateOperationsCockpit(blueprintData as OperationsCockpitBlueprint);
const modeOptions = ['Eco', 'Balanced', 'Push'] as const;
const controlOptions = ['Auto', 'Manual'] as const;
const speedOptions = [1, 2, 4, 8] as const satisfies readonly SimSpeed[];
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

  return (
    <main className="cockpit-shell" aria-label="Operations Cockpit static prototype">
      <Header state={displayState} runtimeState={runtimeState} dispatch={dispatch} />

      <div className="cockpit-layout">
        <NavigationRail />

        <section className="screen-grid" aria-label="Operations cockpit panels">
          <RoomOverview state={displayState} />
          <BatchStatus items={displayState.batchStatus} />
          <EnvironmentalTelemetry items={displayState.environmentalTelemetry} />
          <ControlPanel
            items={displayState.controls}
            onModeChange={handleControlModeChange}
            onControlChange={handleControlStateChange}
          />
          <TelemetryTrends items={displayState.telemetryTrends} />
          <EventLog entries={displayState.eventLog} />
          <EnergyCost items={displayState.energyCost} />
          <UtilityStatus items={displayState.utilityStatus} />
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

function RoomOverview({ state }: { state: OperationsCockpitState }) {
  const room = statValue(state.header.stats, 'Room');
  const zone = statValue(state.header.stats, 'Zone');
  const batch = statValue(state.header.stats, 'Batch');
  const phase = statValue(state.header.stats, 'Phase');
  const status = statValue(state.header.stats, 'Overall Status');
  const lighting = controlByLabel(state.controls, 'Light');
  const climate = controlByLabel(state.controls, 'Climate');
  const irrigation = controlByLabel(state.controls, 'Irrigation');
  const lightOutput = metricByLabel(state.environmentalTelemetry, 'Light Output');
  const airflow = metricByLabel(state.environmentalTelemetry, 'Airflow');
  const irrigationIndex = metricByLabel(state.environmentalTelemetry, 'Irrigation Index');
  const reservoir = metricByLabel(state.environmentalTelemetry, 'Nutrient Reservoir');
  const maintenance = state.eventLog.find((entry) => entry.title.toLowerCase().includes('maintenance'));

  return (
    <Panel className="room-overview" title={state.roomOverview.title}>
      <div className="room-ops-overview" aria-label="Room operational overview">
        <div className="room-summary" aria-label="Room summary">
          <div>
            <span className="label">Room</span>
            <strong>{room}</strong>
          </div>
          <div>
            <span className="label">Zone</span>
            <strong>{zone}</strong>
          </div>
          <div>
            <span className="label">Batch</span>
            <strong>{batch}</strong>
          </div>
          <div>
            <span className="label">Phase</span>
            <strong>{phase}</strong>
          </div>
          <div className="summary-status">
            <span className="label">Status</span>
            <strong>{status}</strong>
          </div>
        </div>

        <section className="overview-group capacity-group" aria-label="Capacity and active setup">
          <h3>Capacity</h3>
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
              icon="lightbulb"
              label="Lighting System"
              mode={controlMode(lighting)}
              value={`Output ${formatValue(lightOutput?.value ?? 72, lightOutput?.unit ?? '%')}`}
            />
            <SystemStatus
              icon="air"
              label="Climate System"
              mode={controlMode(climate)}
              value={`Airflow ${formatValue(airflow?.value ?? 68, airflow?.unit ?? '%')}`}
            />
            <SystemStatus
              icon="water_drop"
              label="Irrigation System"
              mode={controlMode(irrigation)}
              value={`Index ${formatValue(irrigationIndex?.value ?? 46, irrigationIndex?.unit ?? '%')}`}
            />
            <SystemStatus
              icon="water_drop"
              label="Nutrient Reservoir"
              mode={reservoir?.reference ?? 'Refill Threshold 20 %'}
              value={formatValue(reservoir?.value ?? 79, reservoir?.unit ?? '%')}
            />
          </div>
        </section>

        <section className="overview-group attention-group" aria-label="Attention and maintenance">
          <h3>Attention</h3>
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

        <div className="hardware-inventory" aria-label="Room hardware inventory">
          {state.roomOverview.inventory.map((item) => (
            <span key={item.id}>
              <b>{item.label}</b>
              <strong>{item.value}</strong>
            </span>
          ))}
        </div>
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
  icon,
  label,
  mode,
  value,
}: {
  icon: string;
  label: string;
  mode: string;
  value: string;
}) {
  return (
    <article className="system-status">
      <Icon name={icon} size="sm" />
      <div>
        <strong>{label}</strong>
        <span>{mode}</span>
      </div>
      <b>{value}</b>
    </article>
  );
}

function EnvironmentalTelemetry({ items }: { items: MetricTileState[] }) {
  return (
    <Panel className="environmental-telemetry" title="Environmental Telemetry">
      <div className="metric-grid">
        {items.map((item) => <MetricTile key={item.id} item={item} />)}
      </div>
    </Panel>
  );
}

function ControlPanel({
  items,
  onModeChange,
  onControlChange,
}: {
  items: ControlTileState[];
  onModeChange: (controlId: string, mode: OperatingMode) => void;
  onControlChange: (controlId: string, controlValue: ControlState) => void;
}) {
  return (
    <Panel className="control-panel" title="Control Panel">
      <div className="control-stack">
        {items.map((item) => (
          <ControlTile
            key={item.id}
            item={item}
            onModeChange={onModeChange}
            onControlChange={onControlChange}
          />
        ))}
      </div>
    </Panel>
  );
}

function TelemetryTrends({ items }: { items: TrendTileState[] }) {
  return (
    <Panel
      className="telemetry-trends"
      title="Telemetry Trends"
      toolbar={(
        <div className="range-toggle" aria-label="Trend range selector">
          <button type="button">6H</button>
          <button className="active" type="button">24H</button>
          <button type="button">7D</button>
        </div>
      )}
    >
      <div className="trend-grid">
        {items.map((item) => <TrendTile key={item.id} item={item} />)}
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

function EnergyCost({ items }: { items: MetricTileState[] }) {
  return (
    <Panel className="energy-cost" title="Energy & Operating Cost">
      <div className="energy-grid">
        {items.map((item) => <MetricSummary key={item.id} item={item} />)}
      </div>
    </Panel>
  );
}

function UtilityStatus({ items }: { items: UtilityStatusItemState[] }) {
  return (
    <Panel className="utility-status" title="Utility Status">
      <div className="utility-grid">
        {items.map((item) => <UtilityItem key={item.id} item={item} />)}
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

function MetricTile({ item }: { item: MetricTileState }) {
  return (
    <article className={`metric-tile status-${item.status}`}>
      <div className="gauge" aria-hidden="true">
        <span style={{ '--gauge-value': metricPercent(item) } as CSSProperties} />
      </div>
      <span className="label">{item.label}</span>
      <strong>{formatValue(item.value, item.unit)}</strong>
      {item.reference ? <small>{item.reference}</small> : null}
    </article>
  );
}

function MetricSummary({ item }: { item: MetricTileState }) {
  return (
    <article className="metric-summary">
      <span className="label">{item.label}</span>
      <strong>{formatValue(item.value, item.unit)}</strong>
    </article>
  );
}

function ProgressTile({ item, compact = false }: { item: ProgressTileState; compact?: boolean }) {
  const isPercent = item.unit === '%' && typeof item.value === 'number';

  return (
    <article className={`progress-tile ${compact ? 'compact' : ''} ${item.status ? `status-${item.status}` : ''}`}>
      <span className="label">{item.label}</span>
      {isPercent && !compact ? <ProgressBar value={item.value as number} /> : null}
      <strong>{formatValue(item.value, item.unit)}</strong>
      {item.secondary ? <small>{item.secondary}</small> : null}
    </article>
  );
}

function ControlTile({
  item,
  onModeChange,
  onControlChange,
}: {
  item: ControlTileState;
  onModeChange: (controlId: string, mode: OperatingMode) => void;
  onControlChange: (controlId: string, controlValue: ControlState) => void;
}) {
  return (
    <article className="control-tile">
      <div className="control-title">
        <Icon name={controlIcon(item.label)} size="lg" className="control-icon" />
        <strong>{item.label}</strong>
      </div>
      <div className="control-row">
        <span className="label">Mode</span>
        <SegmentedControl
          items={modeOptions}
          active={item.activeMode}
          onChange={(mode) => onModeChange(item.id, mode)}
        />
      </div>
      <div className="control-row">
        <span className="label">Control</span>
        <SegmentedControl
          items={controlOptions}
          active={item.activeControl}
          onChange={(controlValue) => onControlChange(item.id, controlValue)}
        />
      </div>
      <div className="control-row tuning-row">
        <span className="label">{item.primaryTuning.label}</span>
        <strong>{formatValue(item.primaryTuning.value, item.primaryTuning.unit)}</strong>
      </div>
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

function TrendTile({ item }: { item: TrendTileState }) {
  return (
    <article className="trend-tile">
      <div className="trend-title">
        <span className="label">{item.label}</span>
        <strong>{formatValue(item.currentValue, item.unit)}</strong>
      </div>
      <Sparkline points={item.points} />
    </article>
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

function UtilityItem({ item }: { item: UtilityStatusItemState }) {
  return (
    <article className={`utility-item status-${item.status}`}>
      <Icon name={utilityIcon(item.label)} size="md" className="utility-icon" />
      <div>
        <span className="label">{item.label}</span>
        <strong>{item.value}</strong>
        {item.secondary ? <small>{item.secondary}</small> : null}
      </div>
    </article>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="progress-bar" aria-label={`Progress ${value}%`}>
      <span style={{ width: `${value}%` }} />
    </div>
  );
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

function statValue(stats: HeaderStat[], label: string) {
  const stat = stats.find((item) => item.label === label);
  return stat ? formatValue(stat.value, stat.unit) : 'n/a';
}

function controlByLabel(items: ControlTileState[], label: string) {
  return items.find((item) => item.label === label);
}

function metricByLabel(items: MetricTileState[], label: string) {
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
    'Overall Status': 'check_circle',
    'Power Now': 'bolt',
    'Daily Cost': 'payments',
  };
  return icons[label];
}

function controlIcon(label: string) {
  const icons: Record<string, string> = {
    Light: 'lightbulb',
    Climate: 'air',
    Irrigation: 'water_drop',
  };
  return icons[label] ?? 'settings';
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

function utilityIcon(label: string) {
  const icons: Record<string, string> = {
    Grid: 'bolt',
    'Backup Power': 'battery_full',
    'Water Supply': 'plumbing',
    Network: 'wifi',
  };
  return icons[label] ?? 'check_circle';
}
