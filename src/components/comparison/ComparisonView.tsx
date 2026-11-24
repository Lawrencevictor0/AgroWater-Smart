import { useEffect } from 'react';
import { useAgroStore } from '../../store/useAgroStore';

const format = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

function scheduledWindow(time: string, times: string[], duration: number) {
  const minuteOfDay = Number(time.slice(11, 13)) * 60 + Number(time.slice(14, 16));
  const starts = times.map(value => {
    const [hour, minute] = value.split(':').map(Number);
    return { value, offset: (hour * 60 + minute - minuteOfDay + 1440) % 1440 };
  });
  const active = starts.find(item => item.offset === 0 || 1440 - item.offset < duration);
  if (active) return { running: true, start: active.value, advance: duration - ((1440 - active.offset) % 1440) };
  const next = starts.reduce((first, item) => !first || item.offset < first.offset ? item : first, undefined as (typeof starts)[number] | undefined);
  return { running: false, start: next?.value, advance: next ? next.offset + duration : 0 };
}

export function ComparisonView() {
  const { traditional, traditionalSectors, sectors, clock, controlMode, weather, advanceMinute, togglePause, logs, applyScenario, setWeather } = useAgroStore();
  const window = scheduledWindow(clock.virtualTime, traditional.scheduleTimes, traditional.durationMinutes);
  const water = sectors.reduce((total, sector) => total + sector.waterConsumedLiters, 0);
  const energy = sectors.reduce((total, sector) => total + sector.energyConsumedKwh, 0);
  const irrigating = sectors.filter(sector => sector.valveState === 'IRRIGATING').length;
  const suspended = sectors.filter(sector => sector.valveState === 'SUSPENDED_RAIN').length;
  const safe = sectors.filter(sector => sector.valveState === 'SAFE_MODE').length;
  const stress = (plots: typeof sectors) => plots.reduce((total, sector) => total + (sector.stressMinutes ?? 0), 0);
  const difference = water - traditional.waterConsumedLiters;
  const mode = { RULES: 'Malha fechada · por regras', ML_DEMO: 'Modo KNN demonstrativo', MANUAL: 'Modo manual' }[controlMode];
  const modeChanged = logs.some(log => log.type === 'MODE_CHANGE' && log.message.startsWith('Modo de controle alterado'));
  const ruleSituation = [
    irrigating && `${irrigating} de ${sectors.length} irrigando`,
    suspended && `${suspended} com rega adiada pela previsão`,
    safe && `${safe} em modo seguro`,
  ].filter(Boolean).join(' · ') || 'Todas as válvulas fechadas';

  const runRainWeek = () => {
    applyScenario('OPERACAO_IDEAL');
    for (let minute = 0; minute < 7 * 1440; minute++) {
      const time = minute % 1440;
      if (minute % 60 === 0) setWeather({
        et0: 5.2,
        rainIntensity: time >= 240 && time < 300 ? 10 : 0,
        rainProbability2h: time >= 120 && time < 240 ? 80 : 20,
      });
      advanceMinute();
    }
    togglePause();
  };
  useEffect(() => {
    runRainWeek();
  }, []);

  const exportComparison = () => {
    const header = 'estrategia,setor,minutos_virtuais,fim_utc,modo,area_ha,profundidade_mm,kc,pmp_pct,limiar_pct,cc_pct,vazao_l_s,potencia_kw,volume_l,energia_kwh,minutos_bomba,umidade_final_pct,minutos_sob_limiar,et0_atual_mm_dia,probabilidade_atual_pct,chuva_atual_mm_h';
    const rows = (label: string, farms: typeof sectors) => farms.map(s => [
      label, s.id, clock.tickCount, clock.virtualTime, label === 'timer' ? 'TIMER' : controlMode,
      s.areaHa, s.rootDepthMm, s.kcFactor, s.wiltingPoint, s.minMoistureThreshold, s.targetFieldCapacity,
      s.valveFlowRateLps, s.pumpPowerKw, s.waterConsumedLiters, s.energyConsumedKwh, s.pumpMinutes ?? 0,
      s.soilMoisture, s.stressMinutes ?? 0, weather.et0, weather.rainProbability2h, weather.rainIntensity,
    ].join(','));
    const url = URL.createObjectURL(new Blob([[header, ...rows('timer', traditionalSectors), ...rows('smart', sectors)].join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'agrowater-comparacao.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <header className="rounded-xl border border-scada-border bg-scada-card p-4 sm:p-5">
        <p className="text-sm font-medium text-emerald-200">Uma fazenda virtual, duas formas de irrigar</p>
        <h2 className="mt-1 font-display text-2xl font-bold">Comparação simulada: timer fixo × AgroWater Smart</h2>
        <p className="mt-2 text-sm text-slate-300">
          Tempo simulado: {format.format(clock.tickCount)} minutos · relógio: {clock.virtualTime.slice(11, 16)} UTC · {clock.isPaused ? 'Pausada' : 'Em execução'}
        </p>
        <p className="mt-2 text-sm text-slate-300">Os dois começam com o mesmo solo e clima. Cada método tem seu próprio solo e acumula água e energia separadamente.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={runRainWeek} className="rounded-lg bg-emerald-300 px-3 py-2 font-semibold text-slate-950 hover:bg-emerald-200">
            Teste dos slides: 7 dias com chuva diária
          </button>
        </div>
        <p className="mt-2 text-sm text-slate-400">Ao abrir esta tela ou repetir o teste, a sessão é reiniciada e pausada no resultado.</p>
        <p className="mt-1 text-sm text-slate-400">Teste dos slides: 7 dias com 10 mm de chuva simulada por dia e previsão de 80% antes da chuva. Não são dados meteorológicos reais.</p>
        {(controlMode !== 'RULES' || modeChanged) && <p role="alert" className="mt-3 rounded-lg border border-amber-700 bg-amber-950/40 p-3 text-sm text-amber-100">
          {controlMode !== 'RULES' ? 'O AgroWater está em modo alternativo, não no controle por regras. ' : 'O modo de controle foi alterado durante esta sessão. '}
          Os totais podem incluir decisões de modos diferentes. Repita o teste de chuva para reiniciar a comparação.
        </p>}
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        <section aria-labelledby="timer-title" className="rounded-xl border border-scada-border bg-scada-card p-4">
          <p className="text-sm text-amber-200">Método 1 · malha aberta</p>
          <h3 id="timer-title" className="text-xl font-semibold">Timer convencional</h3>
          <p className="mt-2 font-semibold">{window.running ? 'Na janela de irrigação' : 'Aguardando o horário'}</p>
          <p className="text-sm text-slate-300">
            {window.running ? `Janela iniciada às ${window.start} UTC.` : window.start ? `Próxima rega: ${window.start} UTC.` : 'Nenhuma janela programada.'}{' '}
            Rega às 06:00 e 18:00 UTC por {traditional.durationMinutes} min, sem consultar o solo.
          </p>
          <p className="mt-2 text-sm text-slate-400">Horários, duração e vazões são hipóteses desta simulação, não uma medição de uma fazenda real.</p>
          {traditional.waterConsumedLiters === 0 && <p className="mt-2 text-sm text-amber-200">Ainda não bombeou nesta sessão.</p>}
        </section>
        <section aria-labelledby="smart-title" className="rounded-xl border border-scada-border bg-scada-card p-4">
          <p className="text-sm text-emerald-200">Método 2 · {mode}</p>
          <h3 id="smart-title" className="text-xl font-semibold">AgroWater Smart</h3>
          <p className="mt-2 font-semibold">{ruleSituation}</p>
          <p className="text-sm text-slate-300">
            {controlMode === 'RULES' ? 'Decide pela umidade e pode adiar a rega por previsão de chuva.' : 'Neste modo, a decisão padrão por regras não está ativa.'}
          </p>
        </section>
      </div>

      <section className="rounded-xl border border-scada-border bg-scada-card p-4">
        <h3 className="text-lg font-semibold">O que cada método consumiu</h3>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[290px] text-left text-sm tabular-nums [&_td]:p-2 [&_th]:p-2">
            <thead className="text-slate-300">
              <tr><th scope="col">Indicador</th><th scope="col">Timer</th><th scope="col">AgroWater</th></tr>
            </thead>
            <tbody className="[&_tr]:border-t [&_tr]:border-scada-border">
              <tr><th scope="row">Água bombeada</th><td className="font-semibold">{format.format(traditional.waterConsumedLiters)} L</td><td className="font-semibold">{format.format(water)} L</td></tr>
              <tr><th scope="row">Energia</th><td>{format.format(traditional.energyConsumedKwh)} kWh</td><td>{format.format(energy)} kWh</td></tr>
              <tr><th scope="row">Solo abaixo do limiar somando os setores</th><td>{format.format(stress(traditionalSectors))} min-setor</td><td>{format.format(stress(sectors))} min-setor</td></tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-sm text-slate-300">Minuto-setor: soma do tempo abaixo do limiar em cada cultura. Exemplo: 4 setores por 10 minutos = 40 min-setor. O valor não mede a intensidade do déficit.</p>
        <p className="mt-3 rounded-lg bg-scada-bg p-3 text-sm text-slate-300">
          {traditional.waterConsumedLiters === 0 ? 'Aguarde a primeira rega do timer para comparar os totais.' :
            difference === 0 ? 'Os métodos bombearam o mesmo volume até agora.' :
              `O AgroWater bombeou ${format.format(Math.abs(difference))} L a ${difference > 0 ? 'mais' : 'menos'} até agora.`}
          {' '}Bombear menos só é vantagem se a cultura continuar bem atendida.
        </p>
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer font-medium text-emerald-200">Ver umidade e tempo abaixo do limiar por setor</summary>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[290px] text-left [&_td]:p-1.5 [&_th]:p-1.5">
              <thead><tr><th>Setor</th><th>Timer</th><th>AgroWater</th></tr></thead>
              <tbody>{sectors.map((sector, i) => {
                const baseline = traditionalSectors[i];
                return <tr key={sector.id}><th scope="row">{sector.crop}</th>
                  <td>{format.format(baseline.soilMoisture)}% / {baseline.stressMinutes ?? 0} min</td>
                  <td>{format.format(sector.soilMoisture)}% / {sector.stressMinutes ?? 0} min</td>
                </tr>;
              })}</tbody>
            </table>
          </div>
        </details>
        <button type="button" onClick={exportComparison} className="mt-3 rounded-lg border border-scada-border px-3 py-2 text-sm hover:bg-slate-800">Exportar comparação CSV</button>
      </section>
    </div>
  );
}
