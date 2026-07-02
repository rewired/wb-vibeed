import type { AlertMessage } from '@wb/shared';
import { deriveBatchResult } from '@wb/engine';
import type {
  EngineBatchResultReasonCode,
  EngineCompletionRecommendation,
  EngineFeedbackCode,
  EngineFeedbackSeverity,
  EngineFeedbackSignal,
  RuntimeState,
} from '@wb/engine';

export interface OperationsCockpitReadModel {
  simulation: RuntimeState['simulation'];
  room: RuntimeState['room'];
  batch: RuntimeState['batch'];
  economy: RuntimeState['economy'];
  controls: RuntimeState['controls'];
  feedback: OperationsCockpitFeedbackReadModel;
  batchLoop: OperationsCockpitBatchLoopReadModel;
  alerts: AlertMessage[];
  events: RuntimeState['events'];
}

export type OperationsCockpitBatchOutlook = 'Weak' | 'Building' | 'Good outlook' | 'Ready' | 'Risky wait';

export interface OperationsCockpitBatchLoopReadModel {
  objective: {
    label: string;
    detail: string;
  };
  recommendation: EngineCompletionRecommendation;
  readinessStatus: 'building' | 'ready' | 'risky';
  outlook: OperationsCockpitBatchOutlook;
  blockers: EngineBatchResultReasonCode[];
  completed?: {
    batchScore: number;
    grade: string;
    resultReasons: EngineBatchResultReasonCode[];
  };
}

export interface OperationsCockpitFeedbackReadModel {
  primary: OperationsCockpitFeedbackHint;
  secondary: OperationsCockpitFeedbackHint[];
}

export interface OperationsCockpitFeedbackHint {
  code: EngineFeedbackCode;
  severity: EngineFeedbackSeverity;
  label: string;
  detail: string;
  icon: string;
}

export function toOperationsCockpitReadModel(state: RuntimeState): OperationsCockpitReadModel {
  return {
    simulation: state.simulation,
    room: state.room,
    batch: state.batch,
    economy: state.economy,
    controls: state.controls,
    feedback: deriveFeedback(state),
    batchLoop: deriveBatchLoop(state),
    alerts: deriveAlerts(state),
    events: state.events,
  };
}

function deriveBatchLoop(state: RuntimeState): OperationsCockpitBatchLoopReadModel {
  const result = deriveBatchResult({
    batchCore: {
      maturity: state.batch.maturity,
      stress: state.batch.stress,
      vigor: state.room.stability,
      outputPotential: state.batch.qualityPotential,
    },
    accumulators: {
      elapsedTicks: Math.max(0, state.simulation.tick),
      warningTicks: state.events.filter((event) => event.label.toLowerCase().includes('warning')).length,
      energyKwh: state.economy.energyCostTotal,
      operatingCost: state.economy.operatingCostTotal,
      manualInterventions: 0,
      efficiencyScore: state.economy.operatingCostTotal > 0
        ? Math.max(0, Math.min(100, Math.round((state.batch.qualityPotential / state.economy.operatingCostTotal) * 1000)))
        : 100,
    },
    lifecycleState: state.batch.maturity >= 100 ? 'ready' : 'active',
  });
  const blockers = result.resultReasons.filter((reason) => reason !== 'stable_run').slice(0, 3);

  return {
    objective: {
      label: 'Run Target',
      detail: 'Reach readiness with controlled stress and cost.',
    },
    recommendation: result.completionRecommendation,
    readinessStatus: result.completionRecommendation === 'overdue-risk'
      ? 'risky'
      : result.completionRecommendation === 'ready'
      ? 'ready'
      : 'building',
    outlook: deriveBatchOutlook(result.grade, result.completionRecommendation, state.batch.maturity),
    blockers,
  };
}

function deriveBatchOutlook(
  grade: string,
  recommendation: EngineCompletionRecommendation,
  maturity: number,
): OperationsCockpitBatchOutlook {
  if (recommendation === 'overdue-risk') return 'Risky wait';
  if (recommendation === 'ready') return 'Ready';
  if (maturity < 35 || grade === 'D') return 'Weak';
  if (grade === 'B' || grade === 'A' || grade === 'S') return 'Good outlook';
  return 'Building';
}

function deriveAlerts(state: RuntimeState): AlertMessage[] {
  const alerts: AlertMessage[] = [];

  if (state.batch.stress >= 50) {
    alerts.push({
      id: 'alert.batch.stress',
      severity: 'warning',
      label: 'Batch stress rising',
      explanation: 'Abstract stress is above the recommended game threshold.',
    });
  }

  if (state.room.stability < 60) {
    alerts.push({
      id: 'alert.room.stability',
      severity: 'warning',
      label: 'Room stability drifting',
      explanation: 'The room is becoming less stable. Review operating modes.',
    });
  }

  return alerts;
}

function deriveFeedback(state: RuntimeState): OperationsCockpitFeedbackReadModel {
  const signals = deriveFacadeFeedbackSignals(state);
  const translated = signals.map(translateFeedbackSignal);

  return {
    primary: translated[0] ?? translateFeedbackSignal(feedbackSignal('balanced_stable', 'info', 10)),
    secondary: translated.slice(1, 5),
  };
}

function deriveFacadeFeedbackSignals(state: RuntimeState): EngineFeedbackSignal[] {
  const signals: EngineFeedbackSignal[] = [];

  if (state.batch.maturity >= 85 && state.batch.stress >= 70) {
    signals.push(feedbackSignal('harvest_stress_too_high', 'warning', 100));
  }

  if (state.batch.maturity >= 85 && state.batch.maturity < 100) {
    signals.push(feedbackSignal('harvest_not_mature', 'info', 96));
  }

  if (state.batch.stress >= 55 || state.batch.qualityPotential <= 45) {
    signals.push(feedbackSignal('quality_pressure', state.batch.stress >= 70 ? 'critical' : 'warning', 90));
  }

  if (state.controls.lightMode === 'push' || state.controls.climateMode === 'aggressive') {
    signals.push(feedbackSignal('push_stress', state.batch.stress >= 55 ? 'warning' : 'info', 82));
    signals.push(feedbackSignal('maturity_fast', 'info', 58));
  }

  if (state.controls.lightMode === 'eco' || state.controls.irrigationMode === 'conserve') {
    signals.push(feedbackSignal('eco_slow_growth', 'info', 80));
    signals.push(feedbackSignal('maturity_slow', 'info', 56));
  }

  if (state.room.nutrientStatus < 60) signals.push(feedbackSignal('nutrient_drift', 'warning', 74));
  if (state.room.stability < 60 || state.room.temperatureStatus < 60 || state.room.humidityStatus < 60) {
    signals.push(feedbackSignal('climate_drift', 'warning', 70));
  }
  if (state.room.lightStatus < 55) signals.push(feedbackSignal('light_under_target', 'info', 66));
  if (state.room.waterStatus < 55) signals.push(feedbackSignal('irrigation_under_target', 'info', 64));

  if (signals.length === 0) signals.push(feedbackSignal('balanced_stable', 'info', 10));

  return [...signals].sort((first, second) => second.priority - first.priority || first.code.localeCompare(second.code));
}

function feedbackSignal(
  code: EngineFeedbackCode,
  severity: EngineFeedbackSeverity,
  priority: number,
): EngineFeedbackSignal {
  return { code, severity, priority };
}

function translateFeedbackSignal(signal: EngineFeedbackSignal): OperationsCockpitFeedbackHint {
  const text = feedbackText(signal.code);

  return {
    code: signal.code,
    severity: signal.severity,
    label: text.label,
    detail: text.detail,
    icon: text.icon,
  };
}

function feedbackText(code: EngineFeedbackCode): { label: string; detail: string; icon: string } {
  switch (code) {
    case 'light_under_target':
      return { label: 'Light below plan', detail: 'Light index is pulling pace down.', icon: 'lightbulb' };
    case 'climate_drift':
      return { label: 'Room drift', detail: 'Room indices are moving away from the stable band.', icon: 'air' };
    case 'irrigation_under_target':
      return { label: 'Flow below plan', detail: 'Irrigation index is limiting pace.', icon: 'water_drop' };
    case 'nutrient_drift':
      return { label: 'Reservoir pressure', detail: 'Reservoir index is below the review line.', icon: 'science' };
    case 'push_stress':
      return { label: 'Push pressure', detail: 'High operating pressure raises cost and stress risk.', icon: 'speed' };
    case 'eco_slow_growth':
      return { label: 'Eco pace', detail: 'Lower pressure keeps the room stable but slower.', icon: 'eco' };
    case 'balanced_stable':
      return { label: 'Stable balance', detail: 'Core room values are holding steady.', icon: 'check_circle' };
    case 'harvest_not_mature':
      return { label: 'Not ready yet', detail: 'Maturity has not reached the review gate.', icon: 'hourglass_empty' };
    case 'harvest_stress_too_high':
      return { label: 'Stress blocks review', detail: 'Stress is high for readiness review.', icon: 'warning' };
    case 'quality_pressure':
      // Facade legacy state calls this qualityPotential; the cockpit maps it to output potential.
      return { label: 'Output pressure', detail: 'Stress is constraining output potential.', icon: 'trending_down' };
    case 'maturity_fast':
      return { label: 'Fast pace', detail: 'Operating pressure is accelerating maturity.', icon: 'bolt' };
    case 'maturity_slow':
      return { label: 'Slow pace', detail: 'Lower operating pressure is slowing maturity.', icon: 'slow_motion_video' };
    default:
      return assertNever(code);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled feedback code: ${value}`);
}
