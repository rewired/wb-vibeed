import type { AlertMessage } from '@wb/shared';
import type { RuntimeState } from '@wb/engine';

export interface OperationsCockpitReadModel {
  simulation: RuntimeState['simulation'];
  room: RuntimeState['room'];
  batch: RuntimeState['batch'];
  economy: RuntimeState['economy'];
  controls: RuntimeState['controls'];
  alerts: AlertMessage[];
  events: RuntimeState['events'];
}

export function toOperationsCockpitReadModel(state: RuntimeState): OperationsCockpitReadModel {
  return {
    simulation: state.simulation,
    room: state.room,
    batch: state.batch,
    economy: state.economy,
    controls: state.controls,
    alerts: deriveAlerts(state),
    events: state.events,
  };
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
