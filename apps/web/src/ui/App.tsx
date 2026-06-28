import { createDemoRuntimeState } from '@wb/engine';
import { toOperationsCockpitReadModel } from '@wb/facade';

export function App() {
  const readModel = toOperationsCockpitReadModel(createDemoRuntimeState());

  return (
    <main className="app-shell">
      <header className="top-bar">
        <span>WB VibeEd</span>
        <span>Day {readModel.simulation.day}</span>
        <span>Tick {readModel.simulation.tick}</span>
        <span>{readModel.simulation.phase}</span>
      </header>

      <section className="cockpit-grid" aria-label="Operations Cockpit placeholder">
        <article className="panel room-panel">
          <h1>{readModel.room.name}</h1>
          <p>{readModel.batch.label}</p>
          <strong>Stability {readModel.room.stability}</strong>
        </article>

        <article className="panel telemetry-panel">
          <h2>Telemetry</h2>
          <dl>
            <div><dt>Growth</dt><dd>{readModel.batch.growth}</dd></div>
            <div><dt>Stress</dt><dd>{readModel.batch.stress}</dd></div>
            <div><dt>Maturity</dt><dd>{readModel.batch.maturity}</dd></div>
            <div><dt>Quality Potential</dt><dd>{readModel.batch.qualityPotential}</dd></div>
          </dl>
        </article>

        <article className="panel controls-panel">
          <h2>Operating Modes</h2>
          <p>Light: {readModel.controls.lightMode}</p>
          <p>Climate: {readModel.controls.climateMode}</p>
          <p>Irrigation: {readModel.controls.irrigationMode}</p>
        </article>
      </section>
    </main>
  );
}
