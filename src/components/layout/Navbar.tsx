import { Droplets, GraduationCap, Pause, Play, RefreshCw } from 'lucide-react';
import { useAgroStore } from '../../store/useAgroStore';
import type { ControlMode } from '../../types';
import { applyDemoPhase } from '../../services/demoPhases';

const control = 'inline-flex items-center justify-center gap-1.5 rounded-lg border border-scada-border bg-scada-bg px-2.5 py-1.5 text-sm text-slate-100 hover:border-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300';

export function Navbar() {
  const clock = useAgroStore(state => state.clock);
  const mode = useAgroStore(state => state.controlMode);
  const isPresentationMode = useAgroStore(state => state.isPresentationMode);
  const setMode = useAgroStore(state => state.setControlMode);
  const setSpeed = useAgroStore(state => state.setSpeedMultiplier);
  const togglePause = useAgroStore(state => state.togglePause);
  const reset = useAgroStore(state => state.resetSimulation);
  const advanceMinute = useAgroStore(state => state.advanceMinute);
  const togglePresentation = useAgroStore(state => state.togglePresentationMode);

  return (
    <header className="border-b border-scada-border bg-scada-surface px-4 py-3">
      <div className="mx-auto flex max-w-[1780px] flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 font-display text-lg font-bold text-emerald-200">
          <Droplets aria-hidden="true" className="h-5 w-5" />AgroWater Smart
        </h1>
        <div className="flex flex-wrap items-center gap-2" aria-label="Controles da simulação" role="group">
          <time dateTime={clock.virtualTime} className="font-mono text-sm text-slate-300">{clock.virtualTime.slice(11, 16)} UTC</time>
          <button type="button" className={control} onClick={togglePause}>
            {clock.isPaused ? <Play aria-hidden="true" size={15} /> : <Pause aria-hidden="true" size={15} />}
            {clock.isPaused ? 'Continuar' : 'Pausar'}
          </button>
          <button type="button" className={control} onClick={() => {
            for (let i = 0; i < 10; i++) advanceMinute();
          }}>Avançar 10 min</button>
          <select className={control} aria-label="Velocidade da simulação" value={clock.speedMultiplier} onChange={event => setSpeed(Number(event.target.value))}>
            {[1, 2, 5, 10].map(speed => <option key={speed} value={speed}>{speed}×</option>)}
          </select>
          <button type="button" className={control} onClick={reset} title="Reiniciar Simulação">
            <RefreshCw aria-hidden="true" size={15} />Reiniciar
          </button>
          <select className={control} aria-label="Modo de controle" value={mode} onChange={event => setMode(event.target.value as ControlMode)}>
            <option value="RULES">Regras</option><option value="ML_DEMO">KNN</option><option value="MANUAL">Manual</option>
          </select>
          <button type="button" className={control} onClick={() => {
            if (useAgroStore.getState().demoPhase === null) applyDemoPhase(0);
            togglePresentation();
          }} aria-pressed={isPresentationMode}>
            <GraduationCap aria-hidden="true" size={16} />{isPresentationMode ? 'Sair da apresentação' : 'Modo Apresentação'}
          </button>
        </div>
      </div>
    </header>
  );
}
