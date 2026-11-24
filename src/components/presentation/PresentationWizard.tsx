import { useAgroStore } from '../../store/useAgroStore';
import { demoPhases } from '../../services/demoPhases';

const status = { IDLE: 'Fechada', IRRIGATING: 'Irrigando', SUSPENDED_RAIN: 'Suspensa por chuva', SAFE_MODE: 'Modo seguro' };

export function PresentationWizard() {
  const phase = useAgroStore(state => state.demoPhase);
  const sectors = useAgroStore(state => state.sectors);
  const exit = useAgroStore(state => state.togglePresentationMode);
  const active = phase === null ? null : demoPhases[phase];
  const irrigating = sectors.filter(sector => sector.valveState === 'IRRIGATING').length;

  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center gap-4 py-5">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-300">AgroWater Smart · Simulação</p>
        <button type="button" onClick={exit} className="rounded-lg border border-scada-border px-3 py-2 text-sm hover:bg-slate-800">Voltar ao painel</button>
      </header>
      <section className="rounded-xl border border-scada-border bg-scada-card p-5 sm:p-7">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">{active?.title ?? 'Demonstração da irrigação'}</h1>
        <p className="mt-2 text-slate-300">{active?.detail ?? 'Comece a demonstração no rodapé.'}</p>
        <p className="my-4 text-2xl font-semibold text-emerald-200">{irrigating} de {sectors.length} irrigando</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {sectors.map(sector => (
            <li key={sector.id} className="rounded-lg border border-scada-border p-3">
              <h2 className="font-semibold">{sector.crop}</h2>
              <p className="text-sm text-slate-300">{status[sector.valveState]} · {sector.waterConsumedLiters.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
