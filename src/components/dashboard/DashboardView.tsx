import { useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAgroStore } from '../../store/useAgroStore';
import type { ControlMode, ScenarioPreset, ValveState } from '../../types';
import { sectorSituation } from '../sectorSituation';
import { applyDemoPhase, demoPhases } from '../../services/demoPhases';

const valveLabels: Record<ValveState, { label: string; color: string }> = {
  IDLE: { label: 'Fechada', color: 'text-slate-300 border-slate-600' },
  IRRIGATING: { label: 'Irrigando', color: 'text-emerald-300 border-emerald-500/50' },
  SUSPENDED_RAIN: { label: 'Suspensa por chuva', color: 'text-amber-300 border-amber-500/50' },
  SAFE_MODE: { label: 'Modo seguro', color: 'text-rose-300 border-rose-500/50' },
};

const number = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const moisture = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const scenarioNames: Record<ScenarioPreset, string> = {
  SECA_PROLONGADA: 'Seca prolongada',
  CHUVA_INESPERADA: 'Chuva inesperada',
  IRRIGACAO_EXCESSIVA: 'Irrigação excessiva',
  OPERACAO_IDEAL: 'Operação ideal',
  FALHA_SENSOR: 'Falha de sensor',
};
const modeNames: Record<ControlMode, string> = { RULES: 'Regras', ML_DEMO: 'KNN', MANUAL: 'Manual' };
const button = 'rounded-lg border border-scada-border px-3 py-2 text-sm font-medium text-slate-100 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300';

export function DashboardView() {
  const sectors = useAgroStore(state => state.sectors);
  const weather = useAgroStore(state => state.weather);
  const forecastAge = useAgroStore(state => state.clock.tickCount - state.forecastIssuedAt);
  const scenario = useAgroStore(state => state.scenarioPreset);
  const mode = useAgroStore(state => state.controlMode);
  const paused = useAgroStore(state => state.clock.isPaused);
  const elapsed = useAgroStore(state => state.clock.tickCount);
  const setActiveTab = useAgroStore(state => state.setActiveTab);
  const demoPhase = useAgroStore(state => state.demoPhase);
  const [showHistory, setShowHistory] = useState(false);
  const [historySectorId, setHistorySectorId] = useState('sector-a');

  const historySector = sectors.find(sector => sector.id === historySectorId);
  const totalWater = sectors.reduce((total, sector) => total + sector.waterConsumedLiters, 0);
  const irrigating = sectors.filter(sector => sector.valveState === 'IRRIGATING').length;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <section className="rounded-xl border border-scada-border bg-scada-card p-4">
        <h2 className="font-display text-2xl font-bold text-white">Visão geral da irrigação</h2>
        <p className="mt-2 text-sm text-slate-300">
          Cenário carregado: <strong className="text-emerald-200">{demoPhase !== null ? demoPhases[demoPhase].title : scenario ? scenarioNames[scenario] : 'Padrão'}</strong>
          {' · '}Modo ativo: <strong>{modeNames[mode]}</strong>{' · '}{paused ? 'Pausada' : 'Em execução'}
          {' · '}<span>{number.format(elapsed)} min virtuais</span>
        </p>
        <dl className="mt-3 grid gap-3 sm:grid-cols-3">
          <div><dt className="text-sm text-slate-400">Setores irrigando</dt><dd className="text-xl font-semibold tabular-nums">{irrigating} de {sectors.length}</dd></div>
          <div><dt className="text-sm text-slate-400">Previsão de chuva</dt>
            <dd className="text-xl font-semibold tabular-nums">{forecastAge < 120 ? `${weather.rainProbability2h}%` : 'Sem previsão válida'}</dd>
            {forecastAge >= 120 && <button className="text-sm text-emerald-200 underline" onClick={() => setActiveTab('lab')}>Alterar no Laboratório</button>}
          </div>
          <div><dt className="text-sm text-slate-400">Água bombeada</dt><dd className="text-xl font-semibold tabular-nums">{number.format(totalWater)} L</dd></div>
        </dl>
      </section>

      <section aria-labelledby="sector-heading">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h3 id="sector-heading" className="text-xl font-semibold">Setores</h3>
          <div className="flex flex-wrap gap-2">
            <button className={button} onClick={() => applyDemoPhase(0)}>Reiniciar em seca</button>
            <button className={button} onClick={() => setActiveTab('farm')}>Abrir Fazenda</button>
          </div>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {sectors.map(sector => {
            const status = valveLabels[sector.valveState];
            return (
              <li key={sector.id} className="min-w-0 rounded-xl border border-scada-border bg-scada-card p-4">
                <p className="text-sm text-slate-400">{sector.name} • {sector.areaHa} ha</p>
                <h4 className="font-display text-lg font-semibold">{sector.crop}</h4>
                <p className="mt-3 text-2xl font-semibold tabular-nums">{moisture.format(sector.soilMoisture)}%</p>
                <p className="text-sm text-slate-400">Umidade · limiar {number.format(sector.minMoistureThreshold)}%</p>
                <p className={`mt-3 inline-block rounded-md border px-2 py-1 text-sm ${status.color}`}>{status.label}</p>
                <p className="mt-1 text-xs text-slate-300">{sectorSituation(sector, mode)}</p>
                <p className="mt-2 text-sm text-slate-300">
                  {number.format(sector.waterConsumedLiters)} L acumulados
                  {sector.waterConsumedLiters === 0 && sector.valveState === 'IDLE' && ' · ainda não irrigou'}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="flex flex-wrap gap-2">
        <button className={button} onClick={() => setActiveTab('comparison')}>Ver comparação</button>
        <button type="button" className={button} aria-expanded={showHistory} aria-controls="moisture-history"
          onClick={() => setShowHistory(value => !value)}>{showHistory ? 'Ocultar' : 'Mostrar'} gráfico de umidade</button>
      </div>
      <section id="moisture-history" hidden={!showHistory} className="rounded-xl border border-scada-border bg-scada-card p-4">
        {showHistory && historySector && <>
          <label className="text-sm" htmlFor="moisture-sector">Histórico de umidade</label>
          <select id="moisture-sector" className="ml-2 rounded border border-scada-border bg-scada-bg p-2 text-sm"
            value={historySectorId} onChange={event => setHistorySectorId(event.target.value)}>
            {sectors.map(sector => <option key={sector.id} value={sector.id}>{sector.crop}</option>)}
          </select>
          <p className="my-2 text-sm text-slate-300">Últimas amostras registradas · limiar {historySector.minMoistureThreshold}%.</p>
          {historySector.history.length === 0 ? <p className="text-sm text-slate-400">Ainda sem amostras neste setor.</p> :
            <div className="h-52 min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historySector.history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#263547" />
                  <XAxis dataKey="timestamp" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <YAxis unit="%" domain={[0, 100]} stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => [`${number.format(value)}%`, 'Umidade']} />
                  <ReferenceLine y={historySector.minMoistureThreshold} stroke="#fbbf24" strokeDasharray="4 4" />
                  <Line dataKey="moisture" stroke="#34d399" strokeWidth={2} isAnimationActive={false} dot={historySector.history.length === 1} />
                </LineChart>
              </ResponsiveContainer>
            </div>}
        </>}
      </section>
    </div>
  );
}
