import { useEffect, useMemo, useState, type CSSProperties, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import blueprintData from './operations-cockpit-blueprint.json';
import { rehydrateOperationsCockpit } from './operations-cockpit-rehydrate';
import type {
  ControlTileState,
  EventLogEntryState,
  HeaderStat,
  MetricTileState,
  OperatingMode,
  OperationsCockpitBlueprint,
  OperationsCockpitState,
  ProgressTileState,
  SimSpeed,
  SimulationRuntimeState,
  TrendTileState,
  UtilityStatusItemState,
  ControlState,
} from './operations-cockpit-state-types';

const initialRuntimeState = rehydrateOperationsCockpit(blueprintData as OperationsCockpitBlueprint);
const cockpitState = initialRuntimeState.cockpit;
const modeOptions = ['Eco', 'Balanced', 'Push'] as const;
const controlOptions = ['Auto', 'Manual'] as const;
const speedOptions = [1, 2, 4, 8] as const satisfies readonly SimSpeed[];
const BASE_TICK_MS = 1000;
const MAX_EVENT_LOG_ENTRIES = 20;
const COST_PER_KWH = 0.34;

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

export function App() {
  const [runtimeState, setRuntimeState] = useState<SimulationRuntimeState>(() => initialRuntimeState.simulation);
  const [controlState, setControlState] = useState<ControlTileState[]>(() => cockpitState.controls);
  const [localEventLog, setLocalEventLog] = useState<EventLogEntryState[]>([]);

  useEffect(() => {
    if (!runtimeState.isRunning) return undefined;

    const interval = window.setInterval(() => {
      setRuntimeState((current) => ({ ...current, tick: current.tick + 1 }));
    }, BASE_TICK_MS / runtimeState.speed);

    return () => window.clearInterval(interval);
  }, [runtimeState.isRunning, runtimeState.speed]);

  const displayState = useMemo(
    () => deriveCockpitState(cockpitState, runtimeState, controlState, localEventLog),
    [controlState, localEventLog, runtimeState],
  );

  function addControlEvent(systemLabel: string, target: 'mode' | 'control', value: string) {
    const day = dayFromTick(runtimeState.tick, runtimeState.ticksPerDay);
    const title = `${systemLabel} ${target} changed to ${value}.`;
    const entry: EventLogEntryState = {
      id: `local-${runtimeState.tick}-${slug(systemLabel)}-${target}-${slug(value)}-${localEventLog.length}`,
      time: clockFromTick(runtimeState.tick, runtimeState.ticksPerDay),
      day,
      tick: runtimeState.tick,
      severity: 'info',
      title,
      detail: 'Operator panel action.',
    };

    setLocalEventLog((entries) => [entry, ...entries].slice(0, MAX_EVENT_LOG_ENTRIES));
  }

  function handleControlModeChange(controlId: string, mode: OperatingMode) {
    const control = controlState.find((item) => item.id === controlId);
    if (!control || control.activeMode === mode) return;

    setControlState((items) => items.map((item) => (item.id === controlId ? { ...item, activeMode: mode } : item)));
    addControlEvent(control.label, 'mode', titleCase(mode));
  }

  function handleControlStateChange(controlId: string, controlValue: ControlState) {
    const control = controlState.find((item) => item.id === controlId);
    if (!control || control.activeControl === controlValue) return;

    setControlState((items) => (
      items.map((item) => (item.id === controlId ? { ...item, activeControl: controlValue } : item))
    ));
    addControlEvent(control.label, 'control', titleCase(controlValue));
  }

  return (
    <main className="cockpit-shell" aria-label="Operations Cockpit static prototype">
      <Header state={displayState} runtimeState={runtimeState} setRuntimeState={setRuntimeState} />

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
  setRuntimeState,
}: {
  state: OperationsCockpitState;
  runtimeState: SimulationRuntimeState;
  setRuntimeState: Dispatch<SetStateAction<SimulationRuntimeState>>;
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
      <TransportControls runtimeState={runtimeState} setRuntimeState={setRuntimeState} />
    </header>
  );
}

function TransportControls({
  runtimeState,
  setRuntimeState,
}: {
  runtimeState: SimulationRuntimeState;
  setRuntimeState: Dispatch<SetStateAction<SimulationRuntimeState>>;
}) {
  const speedIndex = speedOptions.indexOf(runtimeState.speed);

  return (
    <div className="transport-controls" aria-label="Simulation transport controls">
      <button
        className={runtimeState.isRunning ? 'transport-toggle running' : 'transport-toggle'}
        type="button"
        aria-pressed={runtimeState.isRunning}
        onClick={() => setRuntimeState((current) => ({ ...current, isRunning: !current.isRunning }))}
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
            setRuntimeState((current) => ({ ...current, speed: nextSpeed }));
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

function deriveCockpitState(
  state: OperationsCockpitState,
  runtimeState: SimulationRuntimeState,
  controls: ControlTileState[],
  localEventLog: EventLogEntryState[],
): OperationsCockpitState {
  const day = dayFromTick(runtimeState.tick, runtimeState.ticksPerDay);
  const metrics = deriveTelemetry(state.environmentalTelemetry, runtimeState.tick, controls);
  const powerNow = derivePowerNow(state.energyCost, runtimeState.tick, controls);
  const dailyEnergy = round(powerNow * 24, 1);
  const dailyCost = round(dailyEnergy * COST_PER_KWH, 2);
  const eventLog = [...localEventLog, ...state.eventLog].slice(0, MAX_EVENT_LOG_ENTRIES);

  return {
    ...state,
    header: {
      ...state.header,
      stats: deriveHeaderStats(state.header.stats, runtimeState, day, powerNow, dailyCost),
    },
    batchStatus: state.batchStatus.map((item) => (
      item.id === 'cycle-progress'
        ? { ...item, secondary: `Day ${day} of ${cycleLengthFromSecondary(item.secondary)}` }
        : item
    )),
    environmentalTelemetry: metrics,
    controls: deriveControls(controls, metrics),
    telemetryTrends: deriveTrends(state.telemetryTrends, metrics, powerNow),
    eventLog,
    energyCost: deriveEnergyCost(state.energyCost, powerNow, dailyEnergy, dailyCost),
  };
}

function deriveHeaderStats(
  stats: HeaderStat[],
  runtimeState: SimulationRuntimeState,
  day: number,
  powerNow: number,
  dailyCost: number,
) {
  const hasSpeed = stats.some((stat) => stat.label === 'Speed');
  const runtimeStats = hasSpeed
    ? stats
    : stats.flatMap((stat) => (stat.label === 'Tick' ? [stat, { label: 'Speed', value: formatSpeed(runtimeState.speed) }] : [stat]));

  return runtimeStats.map((stat) => {
    if (stat.label === 'Day') return { ...stat, value: day };
    if (stat.label === 'Tick') return { ...stat, value: runtimeState.tick };
    if (stat.label === 'Speed') return { ...stat, value: formatSpeed(runtimeState.speed) };
    if (stat.label === 'Power Now') return { ...stat, value: powerNow };
    if (stat.label === 'Daily Cost') return { ...stat, value: dailyCost };
    return stat;
  });
}

function deriveTelemetry(items: MetricTileState[], tick: number, controls: ControlTileState[]) {
  const light = controlByLabel(controls, 'Light');
  const climate = controlByLabel(controls, 'Climate');
  const irrigation = controlByLabel(controls, 'Irrigation');
  const elapsedTick = tick - initialRuntimeState.simulation.initialTick;
  const lightOutput = round(clamp(numericMetric(items, 'Light Output', 72) + modeBias(light?.activeMode, 6) + wave(elapsedTick, 1.2, 18), 55, 88));
  const irrigationIndex = round(clamp(numericMetric(items, 'Irrigation Index', 46) + modeBias(irrigation?.activeMode, 5) + wave(elapsedTick, 1.5, 22), 34, 62));
  const airflow = round(clamp(numericMetric(items, 'Airflow', 68) + modeBias(climate?.activeMode, 4) + wave(elapsedTick, 1.4, 19), 54, 82));
  const airTemperature = round(clamp(numericMetric(items, 'Air Temperature', 24.6) + modeBias(climate?.activeMode, 0.3) + wave(elapsedTick, 0.4, 16), 23.4, 25.8), 1);
  const relativeHumidity = round(clamp(numericMetric(items, 'Relative Humidity', 58) - modeBias(climate?.activeMode, 1.4) + wave(elapsedTick, 2, 20), 50, 64));
  const co2Index = round(clamp(numericMetric(items, 'CO2 Index', 1150) + wave(elapsedTick, 24, 17), 1080, 1220));
  const reservoirBase = numericMetric(items, 'Nutrient Reservoir', 79);
  const reservoir = round(
    clamp(reservoirBase - (elapsedTick % initialRuntimeState.simulation.ticksPerDay) * 0.15, 76, 82),
  );

  const values: Record<string, number> = {
    'air-temperature': airTemperature,
    'relative-humidity': relativeHumidity,
    'co2-index': co2Index,
    'light-output': lightOutput,
    'irrigation-index': irrigationIndex,
    airflow,
    'nutrient-reservoir': reservoir,
  };

  return items.map((item) => {
    const value = values[item.id];
    return typeof value === 'number' ? { ...item, value } : item;
  });
}

function deriveControls(controls: ControlTileState[], metrics: MetricTileState[]) {
  const lightOutput = metricByLabel(metrics, 'Light Output')?.value ?? 72;
  const irrigationIndex = metricByLabel(metrics, 'Irrigation Index')?.value ?? 46;

  return controls.map((control) => {
    if (control.label === 'Light') {
      return {
        ...control,
        primaryTuning: { ...control.primaryTuning, value: lightOutput },
      };
    }

    if (control.label === 'Climate') {
      return {
        ...control,
        primaryTuning: { ...control.primaryTuning, value: titleCase(control.activeMode) },
      };
    }

    if (control.label === 'Irrigation') {
      return {
        ...control,
        primaryTuning: { ...control.primaryTuning, value: irrigationIndex },
      };
    }

    return control;
  });
}

function derivePowerNow(items: MetricTileState[], tick: number, controls: ControlTileState[]) {
  const basePower = numericMetric(items, 'Power Now', 18.6);
  const elapsedTick = tick - initialRuntimeState.simulation.initialTick;
  const modeLoad = controls.reduce((total, control) => total + modeBias(control.activeMode, 0.55), 0);
  const manualLoad = controls.reduce((total, control) => total + (control.activeControl === 'Manual' ? 0.12 : 0), 0);

  return round(clamp(basePower + modeLoad + manualLoad + wave(elapsedTick, 0.35, 15), 14, 23), 1);
}

function deriveEnergyCost(items: MetricTileState[], powerNow: number, dailyEnergy: number, dailyCost: number) {
  return items.map((item) => {
    if (item.id === 'power-now') return { ...item, value: powerNow };
    if (item.id === 'daily-energy') return { ...item, value: dailyEnergy };
    if (item.id === 'daily-cost') return { ...item, value: dailyCost };
    if (item.id === 'weekly-cost') return { ...item, value: round(dailyCost * 7, 2) };
    return item;
  });
}

function deriveTrends(items: TrendTileState[], metrics: MetricTileState[], powerNow: number) {
  const metricValues: Record<string, number> = {
    'air-temperature-trend': numericMetric(metrics, 'Air Temperature', 24.6),
    'relative-humidity-trend': numericMetric(metrics, 'Relative Humidity', 58),
    'irrigation-moisture-trend': numericMetric(metrics, 'Irrigation Index', 46),
    'power-draw-trend': powerNow,
  };

  return items.map((item) => {
    const currentValue = metricValues[item.id];
    if (typeof currentValue !== 'number') return item;

    return {
      ...item,
      currentValue,
      points: [...item.points.slice(1), currentValue],
    };
  });
}

function wave(tick: number, amplitude: number, period: number) {
  return Math.sin(tick / period) * amplitude;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function round(value: number, digits = 0) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function modeBias(mode: OperatingMode | undefined, amount: number) {
  if (mode === 'Eco') return -amount;
  if (mode === 'Push') return amount;
  return 0;
}

function dayFromTick(tick: number, ticksPerDay: number) {
  return Math.floor(tick / ticksPerDay) + 1;
}

function clockFromTick(tick: number, ticksPerDay: number) {
  const minutesPerTick = Math.floor((24 * 60) / ticksPerDay);
  const minutes = (tick % ticksPerDay) * minutesPerTick;
  const hours = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${padTime(hours)}:${padTime(minute)}:00`;
}

function padTime(value: number) {
  return String(value).padStart(2, '0');
}

function formatSpeed(speed: SimSpeed) {
  return `${speed}x`;
}

function numericMetric(items: MetricTileState[], label: string, fallback: number) {
  const value = items.find((item) => item.label === label)?.value;
  return typeof value === 'number' ? value : fallback;
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

function cycleLengthFromSecondary(value: string | undefined) {
  const match = value?.match(/of (\d+)/);
  return match?.[1] ?? '39';
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
