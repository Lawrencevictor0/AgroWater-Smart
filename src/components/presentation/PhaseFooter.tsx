import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAgroStore } from '../../store/useAgroStore';
import { applyDemoPhase, demoPhases } from '../../services/demoPhases';

export function PhaseFooter() {
  const phase = useAgroStore(state => state.demoPhase);
  const change = (offset: number) => applyDemoPhase(phase === null ? 0 :
    (phase + offset + demoPhases.length) % demoPhases.length);
  const arrow = 'inline-flex items-center gap-1 rounded-md border border-scada-border px-2 py-1.5 text-sm hover:bg-slate-800';

  return (
    <footer className="shrink-0 border-t border-scada-border bg-scada-surface px-3 py-2 text-slate-100">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2">
        <p role="status" className="text-sm">
          {phase === null ? <>Fase ativa: <strong>nenhuma · simulação livre</strong></> :
            <>Fase ativa: <strong className="text-emerald-200">{phase + 1}/{demoPhases.length} — {demoPhases[phase].title}</strong></>}
        </p>
        <div className="flex gap-2">
          {phase === null ?
            <button type="button" className={arrow} onClick={() => applyDemoPhase(0)}>Começar demonstração</button> :
            <>
              <button type="button" className={arrow} aria-label="Fase anterior" onClick={() => change(-1)}>
                <ChevronLeft aria-hidden="true" size={17} /> Anterior
              </button>
              <button type="button" className={arrow} aria-label="Próxima fase" onClick={() => change(1)}>
                Próxima <ChevronRight aria-hidden="true" size={17} />
              </button>
            </>}
        </div>
      </div>
    </footer>
  );
}
