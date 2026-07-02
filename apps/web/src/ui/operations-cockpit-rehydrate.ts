import type {
  BlueprintMetric,
  CockpitFeedbackState,
  MetricTileState,
  OperationsCockpitBlueprint,
  OperationsCockpitRuntimeState,
  ProgressTileState,
  RoomCapacityItemState,
  TelemetryKey,
  TrendTileState,
} from './operations-cockpit-state-types';
import {
  createInitialBatchOutcomeAccumulators,
  deriveBatchDay,
  deriveCycleProgress,
  deriveGlobalDay,
  deriveOperationalPhase,
  initializeOperationsCockpitRuntime,
} from './operations-cockpit-runtime';

const DEFAULT_FEEDBACK: CockpitFeedbackState = {
  primary: {
    code: 'balanced_stable',
    severity: 'info',
    label: 'Stable balance',
    detail: 'Core room values are holding steady.',
    icon: 'check_circle',
    target: 'canopy',
  },
  secondary: [],
};

export function rehydrateOperationsCockpit(
  blueprint: OperationsCockpitBlueprint,
): OperationsCockpitRuntimeState {
  if (blueprint.schemaVersion !== 1) {
    throw new Error(`Unsupported operations cockpit blueprint schema: ${blueprint.schemaVersion}`);
  }

  const globalDay = deriveGlobalDay(blueprint.simulation.initialTick, blueprint.simulation.ticksPerDay);
  const batchDay = deriveBatchDay(blueprint.simulation.initialTick, blueprint.batch.startTick, blueprint.simulation.ticksPerDay);
  const batchCore = blueprint.batchCore;
  const cycleProgress = deriveCycleProgress(batchCore.maturity);
  const phase = deriveOperationalPhase(batchCore.maturity);
  const lifecycleState = cycleProgress >= 100 ? 'ready' : 'active';
  const statusLabel = titleCase(blueprint.room.status);
  const telemetry = blueprint.telemetryBase;

  return initializeOperationsCockpitRuntime({
    simulation: {
      isRunning: blueprint.simulation.initialRunning,
      tick: blueprint.simulation.initialTick,
      speed: blueprint.simulation.initialSpeed,
      ticksPerDay: blueprint.simulation.ticksPerDay,
      initialTick: blueprint.simulation.initialTick,
    },
    baseline: {
      telemetry: {
        airTemperature: telemetry.airTemperature.value,
        relativeHumidity: telemetry.relativeHumidity.value,
        co2Index: telemetry.co2Index.value,
        lightOutput: telemetry.lightOutput.value,
        irrigationIndex: telemetry.irrigationIndex.value,
        airflow: telemetry.airflow.value,
        nutrientReservoir: telemetry.nutrientReservoir.value,
      },
      energy: {
        powerNow: blueprint.energy.powerNow,
      },
      batch: {
        cycleLengthDays: blueprint.batch.cycleLengthDays,
        startTick: blueprint.batch.startTick,
      },
    },
    roomEnvironment: {
      ...blueprint.roomEnvironment,
    },
    cockpit: {
      header: {
        title: 'Room Cockpit',
        stats: [
          { label: 'Day', value: globalDay },
          { label: 'Tick', value: blueprint.simulation.initialTick },
          { label: 'Overall Status', value: statusLabel, status: blueprint.room.status },
          { label: 'Facility Load', value: blueprint.energy.powerNow, unit: 'kW', status: 'normal' },
          { label: 'Cost Today', value: blueprint.energy.dailyCost, unit: '$', status: 'normal' },
          { label: 'Utility', value: utilitySummary(blueprint), status: blueprint.utilityStatus.grid.status },
        ],
      },
      roomOverview: {
        title: `${blueprint.room.label} / ${blueprint.zone.label} Overview`,
        roomId: blueprint.room.id,
        zoneId: blueprint.zone.id,
        batchId: blueprint.batch.id,
        phase,
        status: blueprint.room.status,
        activeView: '3d',
        overlays: ['Supply Air', 'Return Air', 'Exhaust', 'Light', 'Irrigation', 'Sensors'],
        capacity: rehydrateCapacity(blueprint.capacity),
      },
      batchRuntime: {
        batchDay,
        cycleLengthDays: blueprint.batch.cycleLengthDays,
        startTick: blueprint.batch.startTick,
        cycleProgress,
        phase,
        lifecycleState,
        readyForReview: lifecycleState === 'ready',
        batchCore,
        accumulators: createInitialBatchOutcomeAccumulators(),
        loopSummary: {
          objectiveLabel: 'Run Target',
          objectiveDetail: 'Reach readiness with controlled stress and cost.',
          outlook: 'Building',
          recommendation: 'wait',
          completionHint: 'Early result',
          readinessStatus: 'building',
          blockers: ['completed_early', 'maturity_low'],
        },
      },
      batchStatus: rehydrateBatchStatus(blueprint, batchDay, cycleProgress, phase),
      environmentalTelemetry: [
        metric('air-temperature', 'Air Temperature', telemetry.airTemperature),
        metric('relative-humidity', 'Relative Humidity', telemetry.relativeHumidity),
        metric('co2-index', 'CO2 Index', telemetry.co2Index),
        metric('light-output', 'Light Output', telemetry.lightOutput),
        metric('irrigation-index', 'Irrigation Index', telemetry.irrigationIndex),
        metric('airflow', 'Airflow', telemetry.airflow),
        metric('nutrient-reservoir', 'Nutrient Reservoir', telemetry.nutrientReservoir),
      ],
      controls: [
        {
          id: 'light-control',
          label: 'Light',
          activeMode: blueprint.controls.light.mode,
          activeControl: blueprint.controls.light.control,
          manualValue: blueprint.controls.light.manualValue,
          effectiveTarget: 65,
          primaryTuning: {
            label: 'Effective Output',
            value: 65,
            unit: '%',
          },
        },
        {
          id: 'climate-control',
          label: 'Climate',
          activeMode: blueprint.controls.climate.mode,
          activeControl: blueprint.controls.climate.control,
          manualValue: blueprint.controls.climate.manualValue,
          effectiveTarget: 65,
          primaryTuning: {
            label: 'Effective Climate Effort',
            value: 65,
            unit: '%',
          },
        },
        {
          id: 'irrigation-control',
          label: 'Irrigation',
          activeMode: blueprint.controls.irrigation.mode,
          activeControl: blueprint.controls.irrigation.control,
          manualValue: blueprint.controls.irrigation.manualValue,
          effectiveTarget: 65,
          primaryTuning: {
            label: 'Effective Irrigation Index',
            value: 65,
            unit: '%',
          },
        },
      ],
      telemetryTrends: rehydrateTelemetryTrends(blueprint),
      eventLog: blueprint.eventLog.map((entry, index) => ({
        id: `evt-${index + 1}-${entry.tick}-${slug(entry.title)}`,
        time: clockFromTick(entry.tick, blueprint.simulation.ticksPerDay),
        ...entry,
      })),
      warningConditions: [],
      feedback: DEFAULT_FEEDBACK,
      energyCost: [
        {
          id: 'power-now',
          label: 'Power Now',
          value: blueprint.energy.powerNow,
          unit: 'kW',
          status: 'normal',
        },
        {
          id: 'daily-energy',
          label: 'Daily Energy',
          value: blueprint.energy.dailyEnergy,
          unit: 'kWh',
          status: 'normal',
        },
        {
          id: 'daily-cost',
          label: 'Daily Cost',
          value: blueprint.energy.dailyCost,
          unit: '$',
          status: 'normal',
        },
        {
          id: 'weekly-cost',
          label: 'Weekly Cost',
          value: blueprint.energy.weeklyCost,
          unit: '$',
          status: 'normal',
        },
        {
          id: 'efficiency',
          label: 'Efficiency',
          value: blueprint.energy.efficiencyScore,
          unit: 'score',
          status: 'normal',
        },
      ],
      utilityStatus: [
        { id: 'grid-status', label: 'Grid', ...blueprint.utilityStatus.grid },
        { id: 'backup-power', label: 'Backup Power', ...blueprint.utilityStatus.backupPower },
        { id: 'water-supply', label: 'Water Supply', ...blueprint.utilityStatus.waterSupply },
        { id: 'network', label: 'Network', ...blueprint.utilityStatus.network },
      ],
    },
    activeWarnings: [],
    completedBatchReports: [],
  });
}

function rehydrateCapacity(capacity: OperationsCockpitBlueprint['capacity']): RoomCapacityItemState[] {
  return [
    {
      id: 'canopy-tables',
      label: 'Canopy Tables',
      value: `${capacity.canopyTables.active ?? 0} / ${capacity.canopyTables.total} Active`,
      icon: 'table_rows',
      active: capacity.canopyTables.active ?? 0,
      total: capacity.canopyTables.total,
    },
    {
      id: 'light-rails',
      label: 'Light Rails',
      value: `${capacity.lightRails.online ?? 0} Online`,
      icon: 'lightbulb',
      online: capacity.lightRails.online ?? 0,
      total: capacity.lightRails.total,
    },
    {
      id: 'circulation-fans',
      label: 'Circulation Fans',
      value: `${capacity.circulationFans.online ?? 0} Online`,
      icon: 'mode_fan',
      online: capacity.circulationFans.online ?? 0,
      total: capacity.circulationFans.total,
    },
    {
      id: 'sensor-points',
      label: 'Sensor Points',
      value: `${capacity.sensorPoints.online ?? 0} Online`,
      icon: 'sensors',
      online: capacity.sensorPoints.online ?? 0,
      total: capacity.sensorPoints.total,
    },
    {
      id: 'nutrient-reservoirs',
      label: 'Nutrient Reservoirs',
      value: `${capacity.nutrientReservoirs.online ?? 0} Online`,
      icon: 'science',
      online: capacity.nutrientReservoirs.online ?? 0,
      total: capacity.nutrientReservoirs.total,
    },
    {
      id: 'exhaust-filters',
      label: 'Exhaust Filters',
      value: `${capacity.exhaustFilters.online ?? 0} Online`,
      icon: 'filter_alt',
      online: capacity.exhaustFilters.online ?? 0,
      total: capacity.exhaustFilters.total,
    },
  ];
}

function rehydrateBatchStatus(
  blueprint: OperationsCockpitBlueprint,
  batchDay: number,
  cycleProgress: number,
  phase: string,
): ProgressTileState[] {
  const batchCore = blueprint.batchCore;

  return [
    {
      id: 'cycle-progress',
      label: 'Cycle Progress',
      value: cycleProgress,
      unit: '%',
      secondary: `Batch Day ${batchDay} / ${phase}`,
      status: blueprint.batch.status,
    },
    {
      id: 'maturity',
      label: 'Maturity',
      value: batchCore.maturity,
      unit: '/100',
      status: blueprint.batch.status,
    },
    {
      id: 'stress',
      label: 'Stress',
      value: batchCore.stress,
      unit: '/100',
      status: blueprint.batch.status,
    },
    {
      id: 'vigor',
      label: 'Vigor',
      value: batchCore.vigor,
      unit: '/100',
      status: blueprint.batch.status,
    },
    {
      id: 'output-potential',
      label: 'Output Potential',
      value: batchCore.outputPotential,
      unit: '/100',
      status: blueprint.batch.status,
    },
  ];
}

function rehydrateTelemetryTrends(blueprint: OperationsCockpitBlueprint): TrendTileState[] {
  const telemetry = blueprint.telemetryBase;

  return [
    trend('air-temperature-trend', 'Air Temperature', telemetry.airTemperature.unit, telemetry.airTemperature.value, [
      -0.7,
      -0.5,
      -0.4,
      -0.2,
      -0.1,
      -0.2,
      0,
    ]),
    trend('relative-humidity-trend', 'Relative Humidity', telemetry.relativeHumidity.unit, telemetry.relativeHumidity.value, [
      -3,
      -2,
      -1,
      1,
      2,
      0,
      0,
    ]),
    trend('co2-index-trend', 'CO2 Index', telemetry.co2Index.unit, telemetry.co2Index.value, [
      -40,
      -22,
      -14,
      10,
      18,
      6,
      0,
    ]),
    trend('light-output-trend', 'Light Output', telemetry.lightOutput.unit, telemetry.lightOutput.value, [
      -5,
      -3,
      -1,
      0,
      2,
      1,
      0,
    ]),
    trend('irrigation-index-trend', 'Irrigation Index', telemetry.irrigationIndex.unit, telemetry.irrigationIndex.value, [
      3,
      1,
      0,
      -2,
      -1,
      0,
      0,
    ]),
    trend('airflow-trend', 'Airflow', telemetry.airflow.unit, telemetry.airflow.value, [
      -4,
      -2,
      -1,
      1,
      2,
      1,
      0,
    ]),
    trend('nutrient-reservoir-trend', 'Nutrient Reservoir', telemetry.nutrientReservoir.unit, telemetry.nutrientReservoir.value, [
      2,
      2,
      1,
      1,
      0,
      0,
      0,
    ]),
  ];
}

function metric(id: TelemetryKey, label: string, source: BlueprintMetric): MetricTileState {
  return {
    id,
    label,
    value: source.value,
    unit: source.unit,
    reference: source.reference,
    status: source.status,
  };
}

function trend(id: TrendTileState['id'], label: string, unit: string, currentValue: number, offsets: number[]): TrendTileState {
  return {
    id,
    label,
    unit,
    currentValue,
    range: '24h',
    points: offsets.map((offset) => round(currentValue + offset, unit === '°C' || unit === 'kW' ? 1 : 0)),
  };
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

function round(value: number, digits = 0) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function titleCase(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function utilitySummary(blueprint: OperationsCockpitBlueprint) {
  if (blueprint.utilityStatus.grid.status !== 'normal') return blueprint.utilityStatus.grid.value;
  if (blueprint.utilityStatus.waterSupply.status !== 'normal') return blueprint.utilityStatus.waterSupply.value;
  if (blueprint.utilityStatus.backupPower.status !== 'normal') return blueprint.utilityStatus.backupPower.value;
  return 'Normal';
}
