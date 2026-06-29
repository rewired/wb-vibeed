import type {
  ControlState,
  ControlTileState,
  EventLogEntryState,
  MetricTileState,
  OperatingMode,
  OperationsCockpitControlSystem,
  OperationsCockpitRuntimeAction,
  OperationsCockpitRuntimeState,
  TrendTileState,
} from './operations-cockpit-state-types';

const MAX_EVENT_LOG_ENTRIES = 20;
const COST_PER_KWH = 0.34;

export function advanceOperationsCockpitRuntime(
  state: OperationsCockpitRuntimeState,
  action: OperationsCockpitRuntimeAction,
): OperationsCockpitRuntimeState {
  if (action.type === 'tick') {
    if (!state.simulation.isRunning) return state;

    return deriveRuntimeState({
      ...state,
      simulation: {
        ...state.simulation,
        tick: state.simulation.tick + 1,
      },
    });
  }

  if (action.type === 'set-running') {
    if (state.simulation.isRunning === action.isRunning) return state;

    return {
      ...state,
      simulation: {
        ...state.simulation,
        isRunning: action.isRunning,
      },
    };
  }

  if (action.type === 'set-speed') {
    if (state.simulation.speed === action.speed) return state;

    return deriveRuntimeState({
      ...state,
      simulation: {
        ...state.simulation,
        speed: action.speed,
      },
    });
  }

  if (action.type === 'set-control-mode') {
    return applyControlChange(state, action.system, 'mode', action.mode);
  }

  return applyControlChange(state, action.system, 'control', action.control);
}

function applyControlChange(
  state: OperationsCockpitRuntimeState,
  system: OperationsCockpitControlSystem,
  target: 'mode' | 'control',
  value: OperatingMode | ControlState,
) {
  const controlId = controlIdForSystem(system);
  const control = state.cockpit.controls.find((item) => item.id === controlId);
  const currentValue = target === 'mode' ? control?.activeMode : control?.activeControl;

  if (!control || currentValue === value) return state;

  const controls = state.cockpit.controls.map((item) => {
    if (item.id !== controlId) return item;

    return target === 'mode'
      ? { ...item, activeMode: value as OperatingMode }
      : { ...item, activeControl: value as ControlState };
  });

  const event = controlChangeEvent(state, control.label, target, value);

  return deriveRuntimeState({
    ...state,
    cockpit: {
      ...state.cockpit,
      controls,
      eventLog: [event, ...state.cockpit.eventLog].slice(0, MAX_EVENT_LOG_ENTRIES),
    },
  });
}

function deriveRuntimeState(state: OperationsCockpitRuntimeState): OperationsCockpitRuntimeState {
  const day = dayFromTick(state.simulation.tick, state.simulation.ticksPerDay);
  const metrics = deriveTelemetry(state);
  const powerNow = derivePowerNow(state);
  const dailyEnergy = round(powerNow * 24, 1);
  const dailyCost = round(dailyEnergy * COST_PER_KWH, 2);
  const cycleProgress = cycleProgressFromDay(day, state.baseline.batch.cycleLengthDays);

  return {
    ...state,
    cockpit: {
      ...state.cockpit,
      header: {
        ...state.cockpit.header,
        stats: state.cockpit.header.stats.map((stat) => {
          if (stat.label === 'Day') return { ...stat, value: day };
          if (stat.label === 'Tick') return { ...stat, value: state.simulation.tick };
          if (stat.label === 'Facility Load') return { ...stat, value: powerNow };
          if (stat.label === 'Cost Today') return { ...stat, value: dailyCost };
          return stat;
        }),
      },
      batchStatus: state.cockpit.batchStatus.map((item) => (
        item.id === 'cycle-progress'
          ? { ...item, value: cycleProgress, secondary: `Day ${day} of ${state.baseline.batch.cycleLengthDays}` }
          : item
      )),
      environmentalTelemetry: metrics,
      controls: deriveControls(state.cockpit.controls),
      telemetryTrends: deriveTrends(state.cockpit.telemetryTrends, metrics),
      energyCost: deriveEnergyCost(state.cockpit.energyCost, powerNow, dailyEnergy, dailyCost),
    },
  };
}

function deriveTelemetry(state: OperationsCockpitRuntimeState) {
  const tick = state.simulation.tick - state.simulation.initialTick;
  const light = controlByLabel(state.cockpit.controls, 'Light');
  const climate = controlByLabel(state.cockpit.controls, 'Climate');
  const irrigation = controlByLabel(state.cockpit.controls, 'Irrigation');
  const baseline = state.baseline.telemetry;

  const values: Record<string, number> = {
    'air-temperature': round(clamp(baseline.airTemperature + modeBias(climate?.activeMode, 0.3) + wave(tick, 0.4, 16), 23.4, 25.8), 1),
    'relative-humidity': round(clamp(baseline.relativeHumidity - modeBias(climate?.activeMode, 1.4) + wave(tick, 2, 20), 50, 64)),
    'co2-index': round(clamp(baseline.co2Index + wave(tick, 24, 17), 1080, 1220)),
    'light-output': round(clamp(baseline.lightOutput + modeBias(light?.activeMode, 6) + wave(tick, 1.2, 18), 55, 88)),
    'irrigation-index': round(clamp(baseline.irrigationIndex + modeBias(irrigation?.activeMode, 5) + wave(tick, 1.5, 22), 34, 62)),
    airflow: round(clamp(baseline.airflow + modeBias(climate?.activeMode, 4) + wave(tick, 1.4, 19), 54, 82)),
    'nutrient-reservoir': round(clamp(baseline.nutrientReservoir - (tick % state.simulation.ticksPerDay) * 0.15, 76, 82)),
  };

  return state.cockpit.environmentalTelemetry.map((item) => {
    const value = values[item.id];
    return typeof value === 'number' ? { ...item, value } : item;
  });
}

function deriveControls(controls: ControlTileState[]) {
  return controls.map((control) => {
    if (control.label === 'Light') {
      return {
        ...control,
        primaryTuning: { label: 'Target', value: targetFromMode(control.activeMode) },
      };
    }

    if (control.label === 'Climate') {
      return {
        ...control,
        primaryTuning: { label: 'Target Bias', value: targetFromMode(control.activeMode) },
      };
    }

    if (control.label === 'Irrigation') {
      return {
        ...control,
        primaryTuning: { label: 'Target Bias', value: targetFromMode(control.activeMode) },
      };
    }

    return control;
  });
}

function derivePowerNow(state: OperationsCockpitRuntimeState) {
  const tick = state.simulation.tick - state.simulation.initialTick;
  const modeLoad = state.cockpit.controls.reduce((total, control) => total + modeBias(control.activeMode, 0.55), 0);
  const manualLoad = state.cockpit.controls.reduce((total, control) => total + (control.activeControl === 'Manual' ? 0.12 : 0), 0);

  return round(clamp(state.baseline.energy.powerNow + modeLoad + manualLoad + wave(tick, 0.35, 15), 14, 23), 1);
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

function deriveTrends(items: TrendTileState[], metrics: MetricTileState[]) {
  const metricValues: Record<string, number> = {
    'air-temperature-trend': numericMetric(metrics, 'Air Temperature', 24.6),
    'relative-humidity-trend': numericMetric(metrics, 'Relative Humidity', 58),
    'co2-index-trend': numericMetric(metrics, 'CO2 Index', 1150),
    'light-output-trend': numericMetric(metrics, 'Light Output', 72),
    'irrigation-index-trend': numericMetric(metrics, 'Irrigation Index', 46),
    'airflow-trend': numericMetric(metrics, 'Airflow', 68),
    'nutrient-reservoir-trend': numericMetric(metrics, 'Nutrient Reservoir', 79),
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

function controlChangeEvent(
  state: OperationsCockpitRuntimeState,
  systemLabel: string,
  target: 'mode' | 'control',
  value: string,
): EventLogEntryState {
  const day = dayFromTick(state.simulation.tick, state.simulation.ticksPerDay);
  const title = `${systemLabel} ${target} changed to ${value}.`;

  return {
    id: `local-${state.simulation.tick}-${slug(systemLabel)}-${target}-${slug(value)}-${state.cockpit.eventLog.length}`,
    time: clockFromTick(state.simulation.tick, state.simulation.ticksPerDay),
    day,
    tick: state.simulation.tick,
    severity: 'info',
    title,
    detail: 'Operator panel action.',
  };
}

function controlIdForSystem(system: OperationsCockpitControlSystem) {
  const ids: Record<OperationsCockpitControlSystem, string> = {
    light: 'light-control',
    climate: 'climate-control',
    irrigation: 'irrigation-control',
  };

  return ids[system];
}

function controlByLabel(items: ControlTileState[], label: string) {
  return items.find((item) => item.label === label);
}

function numericMetric(items: MetricTileState[], label: string, fallback: number) {
  const value = items.find((item) => item.label === label)?.value;
  return typeof value === 'number' ? value : fallback;
}

function modeBias(mode: OperatingMode | undefined, amount: number) {
  if (mode === 'Eco') return -amount;
  if (mode === 'Push') return amount;
  return 0;
}

function wave(tick: number, amplitude: number, period: number, phase = 0) {
  return Math.sin((tick + phase) / period) * amplitude;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 0) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function dayFromTick(tick: number, ticksPerDay: number) {
  return Math.floor(tick / ticksPerDay) + 1;
}

function cycleProgressFromDay(day: number, cycleLengthDays: number) {
  return clamp(Math.round((day / cycleLengthDays) * 100), 0, 100);
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

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function targetFromMode(mode: OperatingMode) {
  if (mode === 'Eco') return 'Eco';
  if (mode === 'Push') return 'Push';
  return 'Nominal';
}
