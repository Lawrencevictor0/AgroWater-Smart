import React from 'react';
import { 
  FlaskConical, 
  CloudRain, 
  SunMedium, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  Gauge, 
  Zap, 
  Cpu, 
  HelpCircle,
  Play
} from 'lucide-react';
import { useAgroStore } from '../../store/useAgroStore';
import { ScenarioPreset } from '../../types';
import { predictIrrigationKNN, ML_MODEL_DISCLAIMER } from '../../services/mlClassifier';

export const SimulationLabView: React.FC = () => {
  const { 
    weather, 
    sectors, 
    controlMode, 
    clock, 
    setWeather, 
    applyScenario, 
    setControlMode, 
    setSpeedMultiplier, 
    setSectorMoisture 
  } = useAgroStore();

  const scenarios: { id: ScenarioPreset; name: string; desc: string; badge: string; color: string }[] = [
    {
      id: 'SECA_PROLONGADA',
      name: 'Cenário A — Seca Prolongada',
      desc: 'Os quatro setores começam com umidade do solo de até 22%. A previsão de chuva para 2 h é de 5%, com chuva observada de 0 mm/h.',
      badge: 'Estresse Hídrico',
      color: 'border-amber-600 bg-amber-950/40 text-amber-300'
    },
    {
      id: 'CHUVA_INESPERADA',
      name: 'Cenário B — Chuva Inesperada',
      desc: 'Os quatro setores começam com umidade do solo de 26%. A chuva observada é de 18,5 mm/h e a previsão para 2 h é de 20%.',
      badge: 'Chuva observada',
      color: 'border-cyan-500 bg-cyan-950/40 text-cyan-300'
    },
    {
      id: 'IRRIGACAO_EXCESSIVA',
      name: 'Cenário C — Irrigação Excessiva',
      desc: 'O solo começa na capacidade de campo, com chuva observada de 5 mm/h. Compare o controle por regras com o timer, que segue o horário programado.',
      badge: 'Solo úmido e chuva',
      color: 'border-rose-600 bg-rose-950/40 text-rose-300'
    },
    {
      id: 'OPERACAO_IDEAL',
      name: 'Cenário D — Operação Ideal',
      desc: 'Cada setor começa na sua capacidade de campo (30% a 34%), sem chuva.',
      badge: 'Capacidade de Campo',
      color: 'border-emerald-600 bg-emerald-950/40 text-emerald-300'
    },
    {
      id: 'FALHA_SENSOR',
      name: 'Cenário E — Falha de Sensor',
      desc: 'O sensor do Setor A (Tomates) fica offline e a válvula desse setor entra em modo seguro, com irrigação bloqueada.',
      badge: 'Modo seguro no Setor A',
      color: 'border-purple-600 bg-purple-950/40 text-purple-300'
    }
  ];

  // Exemplo de predição KNN do setor selecionado
  const sampleSector = sectors[0];
  const mlPrediction = predictIrrigationKNN(
    sampleSector.soilMoisture,
    sampleSector.soilTemp,
    weather.rainProbability2h,
    weather.airHumidity,
    weather.et0
  );

  return (
    <div className="space-y-4">
      
      {/* HEADER DO LABORATÓRIO */}
      <div className="bg-scada-card border border-scada-border rounded-xl p-4 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-indigo-400" />
              Laboratório Interativo de Simulação & Injeção de Falhas
            </h2>
            <p className="text-xs text-slate-400">
              Ajuste os parâmetros ambientais ou carregue um cenário. Carregar um cenário reinicia a simulação no modo por regras.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-300 bg-slate-800 px-3 py-1 rounded border border-slate-700">
              Multiplicador: <strong>{clock.speedMultiplier}x</strong>
            </span>
          </div>
        </div>
      </div>

      {/* GRADE DE CENÁRIOS PRONTOS (CENÁRIOS A A E) */}
      <div className="bg-scada-surface border border-scada-border rounded-xl p-4 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200 uppercase font-mono tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Cenários de demonstração
          </h3>
          <span className="text-xs text-slate-500 font-mono">5 cenários simulados</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {scenarios.map((scen) => (
            <div 
              key={scen.id} 
              className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${scen.color} hover:scale-[1.02] shadow-sm`}
            >
              <div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 font-bold block w-fit mb-2">
                  {scen.badge}
                </span>
                <h4 className="font-bold text-xs text-slate-100 mb-1">{scen.name}</h4>
                <p className="text-[11px] text-slate-300 leading-relaxed">{scen.desc}</p>
              </div>

              <button
                onClick={() => applyScenario(scen.id)}
                className="mt-3 w-full py-1.5 rounded bg-slate-900/90 hover:bg-slate-800 text-xs font-mono font-bold text-white transition-colors flex items-center justify-center gap-1.5"
              >
                <Play className="w-3 h-3 text-emerald-400" />
                Carregar cenário
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* CONTROLE MANUAL DAS VARIÁVEIS AMBIENTAIS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* PARÂMETROS METEOROLÓGICOS E FÍSICOS (7 COLS) */}
        <div className="lg:col-span-7 bg-scada-card border border-scada-border rounded-xl p-4 shadow-md space-y-4">
          <h3 className="text-sm font-bold text-slate-100 border-b border-scada-border pb-2 flex items-center gap-2">
            <SunMedium className="w-4 h-4 text-amber-400" />
            Modificação Manual de Variáveis Ambientais
          </h3>

          <div className="space-y-4 text-xs">
            {/* Probabilidade de Chuva */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-slate-300 font-medium">Probabilidade de Precipitação (2h):</span>
                <span className="font-mono font-bold text-cyan-400 text-sm">{weather.rainProbability2h}%</span>
              </div>
              <input 
                type="range"
                min="0" max="100" step="1"
                value={weather.rainProbability2h}
                onChange={(e) => setWeather({ rainProbability2h: parseInt(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
                <span>0% de chance</span>
                <span className="text-amber-400 font-bold">Limiar didático das regras: &ge; 65%</span>
                <span>100% de chance</span>
              </div>
            </div>

            {/* Intensidade da Chuva */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-slate-300 font-medium">Intensidade da Chuva Atual (mm/h):</span>
                <span className="font-mono font-bold text-indigo-400 text-sm">{weather.rainIntensity.toFixed(1)} mm/h</span>
              </div>
              <input 
                type="range"
                min="0" max="40" step="0.5"
                value={weather.rainIntensity}
                onChange={(e) => setWeather({ rainIntensity: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>

            {/* Temperatura e Umidade do Ar */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-scada-bg p-3 rounded-lg border border-scada-border">
                <div className="flex justify-between mb-1">
                  <span className="text-slate-400">Temp. Ambiente:</span>
                  <strong className="text-amber-300 font-mono">{weather.airTemp.toFixed(1)}°C</strong>
                </div>
                <input 
                  type="range"
                  min="12" max="45" step="0.5"
                  value={weather.airTemp}
                  onChange={(e) => setWeather({ airTemp: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div className="bg-scada-bg p-3 rounded-lg border border-scada-border">
                <div className="flex justify-between mb-1">
                  <span className="text-slate-400">Umidade Relativa Ar:</span>
                  <strong className="text-sky-300 font-mono">{weather.airHumidity}%</strong>
                </div>
                <input 
                  type="range"
                  min="15" max="100" step="1"
                  value={weather.airHumidity}
                  onChange={(e) => setWeather({ airHumidity: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>

            {/* Taxa de Evapotranspiração de Referência (ET0) */}
            <div className="bg-scada-bg p-3 rounded-lg border border-scada-border">
              <div className="flex justify-between mb-1">
                <span className="text-slate-400">Evapotranspiração de referência (ET₀, valor informado):</span>
                <strong className="text-emerald-400 font-mono">{weather.et0.toFixed(1)} mm/dia</strong>
              </div>
              <input 
                type="range"
                min="1.0" max="10.0" step="0.2"
                value={weather.et0}
                onChange={(e) => setWeather({ et0: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* MÓDULO DEMONSTRATIVO DE MACHINE LEARNING (5 COLS) */}
        <div className="lg:col-span-5 bg-scada-card border border-scada-border rounded-xl p-4 shadow-md space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-scada-border pb-2 mb-2">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-indigo-400" />
                Módulo Demonstrativo Machine Learning (KNN)
              </h3>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                controlMode === 'ML_DEMO' ? 'bg-indigo-950 text-indigo-300 border border-indigo-500' : 'bg-slate-800 text-slate-400'
              }`}>
                {controlMode === 'ML_DEMO' ? 'Controle por KNN' : 'Prévia do KNN'}
              </span>
            </div>

            {/* Aviso Obrigatório de Rigor Acadêmico */}
            <div className="bg-amber-950/40 border border-amber-600/40 rounded-lg p-2.5 text-[11px] text-amber-200/90 leading-relaxed mb-3">
              <strong className="text-amber-300 block font-semibold mb-0.5 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                Limitação do modelo:
              </strong>
              {ML_MODEL_DISCLAIMER}
            </div>

            {/* Predição em Tempo Real do KNN para o Setor A */}
            <div className="bg-scada-bg p-3 rounded-lg border border-scada-border space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Alvo da Inferência:</span>
                <span className="text-slate-200 font-bold">{sampleSector.name} ({sampleSector.crop})</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Sugestão do KNN:</span>
                <span className={`font-bold px-2 py-0.5 rounded ${
                  mlPrediction.decision === 'IRRIGATE' 
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-500' 
                    : (mlPrediction.decision === 'SUSPEND_RAIN' ? 'bg-amber-950 text-amber-300 border border-amber-500' : 'bg-emerald-950 text-emerald-300')
                }`}>
                  [{mlPrediction.decision}]
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Estado atual da válvula:</span>
                <span className="text-slate-200 font-bold">{{ IDLE: 'Fechada', IRRIGATING: 'Irrigando', SUSPENDED_RAIN: 'Suspensa por chuva', SAFE_MODE: 'Modo seguro' }[sampleSector.valveState]}</span>
              </div>
              <div className="flex justify-between items-center">
                 <span className="text-slate-400">Votos dos vizinhos:</span>
                 <span className="text-emerald-400 font-bold">{mlPrediction.confidencePct / 20} de 5</span>
              </div>
            </div>

            <div className="mt-3 p-2.5 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-300 leading-relaxed">
               <strong className="text-slate-200 block mb-1">Resumo didático da classe:</strong>
              {mlPrediction.explanation}
              <details className="mt-2"><summary>Vizinhos e distâncias</summary>{mlPrediction.nearestNeighborsSummary}</details>
            </div>
          </div>

          <button
            onClick={() => setControlMode(controlMode === 'ML_DEMO' ? 'RULES' : 'ML_DEMO')}
            className={`w-full py-2 rounded-lg text-xs font-mono font-bold transition-all shadow-md ${
              controlMode === 'ML_DEMO'
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            {controlMode === 'ML_DEMO' ? 'Mudar controle para regras' : 'Mudar controle para KNN'}
          </button>
        </div>

      </div>

    </div>
  );
};
