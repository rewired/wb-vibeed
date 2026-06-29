import { useEffect, useState } from 'react';
import blueprintData from './operations-cockpit-blueprint.json';
import { rehydrateOperationsCockpit } from './operations-cockpit-rehydrate';
import { advanceOperationsCockpitRuntime } from './operations-cockpit-runtime';
import {
  EnvironmentalTelemetry,
  EventLogDrawer,
  Header,
  NavigationRail,
  ObjectInspector,
  RoomAssetsList,
  RoomContext,
} from './room-cockpit-components';
import { controlSystemFromId, reportKey } from './room-cockpit-selectors';
import type {
  BatchReport,
  ControlState,
  EventLogDrawerState,
  OperatingMode,
  OperationsCockpitBlueprint,
  OperationsCockpitRuntimeAction,
  ReportViewState,
  SelectedRoomObject,
  TelemetryKey,
  TelemetryTileMode,
  TelemetryViewModes,
} from './operations-cockpit-state-types';

const initialRuntimeState = rehydrateOperationsCockpit(blueprintData as OperationsCockpitBlueprint);
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

export function App() {
  const [runtime, setRuntime] = useState(() => initialRuntimeState);
  const [selectedObject, setSelectedObject] = useState<SelectedRoomObject>('lighting');
  const [telemetryViewModes, setTelemetryViewModes] = useState<TelemetryViewModes>(initialTelemetryViewModes);
  const [eventDrawerState, setEventDrawerState] = useState<EventLogDrawerState>('collapsed');
  const [reportViewState, setReportViewState] = useState<ReportViewState>({ type: 'closed' });
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

  function handleManualValueChange(controlId: string, value: number) {
    const system = controlSystemFromId(controlId);
    if (!system) return;
    dispatch({ type: 'set-manual-value', system, value });
  }

  function toggleEventDrawer() {
    setEventDrawerState((current) => (current === 'collapsed' ? 'expanded' : 'collapsed'));
  }

  function handleTelemetryModeChange(metricId: TelemetryKey, mode: TelemetryTileMode) {
    setTelemetryViewModes((current) => ({ ...current, [metricId]: mode }));
  }

  function handleCompleteBatch() {
    dispatch({ type: 'complete-batch' });
    setEventDrawerState('expanded');
  }

  function handleStartNextBatch() {
    dispatch({ type: 'start-next-batch' });
    setEventDrawerState('expanded');
    setReportViewState({ type: 'closed' });
  }

  function handleSelectObject(object: SelectedRoomObject) {
    setSelectedObject(object);
    if (object !== 'canopy') setReportViewState({ type: 'closed' });
  }

  function handleViewBatchReport(report: BatchReport) {
    setSelectedObject('canopy');
    setReportViewState({ type: 'open', reportKey: reportKey(report) });
  }

  return (
    <main className="cockpit-shell" aria-label="Room Cockpit static prototype">
      <Header state={displayState} runtimeState={runtimeState} dispatch={dispatch} />

      <div className="cockpit-layout">
        <NavigationRail />

        <section className="workspace-grid" aria-label="Room cockpit workspace">
          <RoomContext
            state={displayState}
            eventCount={displayState.eventLog.length}
            onToggleEvents={toggleEventDrawer}
          />
          <RoomAssetsList state={displayState} selectedObject={selectedObject} onSelect={handleSelectObject} />
          <ObjectInspector
            state={displayState}
            completedReports={runtime.completedBatchReports}
            selectedObject={selectedObject}
            onModeChange={handleControlModeChange}
            onControlChange={handleControlStateChange}
            onManualValueChange={handleManualValueChange}
            reportViewState={reportViewState}
            onCompleteBatch={handleCompleteBatch}
            onStartNextBatch={handleStartNextBatch}
            onViewReport={handleViewBatchReport}
            onBackToCanopy={() => setReportViewState({ type: 'closed' })}
          />
          <EnvironmentalTelemetry
            items={displayState.environmentalTelemetry}
            trends={displayState.telemetryTrends}
            viewModes={telemetryViewModes}
            onModeChange={handleTelemetryModeChange}
          />
        </section>
      </div>

      <EventLogDrawer
        state={eventDrawerState}
        entries={displayState.eventLog}
        onToggle={toggleEventDrawer}
      />
    </main>
  );
}
