import React, { useState } from 'react';
import { 
  Droplets, 
  Thermometer, 
  Sliders, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Zap, 
  Radio, 
  Settings2,
  ShieldAlert
} from 'lucide-react';
import { useAgroStore } from '../../store/useAgroStore';
import { calculateRequiredIrrigationVolume } from '../../services/waterBalance';
import { sectorSituation } from '../sectorSituation';

const labels = { IDLE: 'Fechada', IRRIGATING: 'Irrigando', SUSPENDED_RAIN: 'Suspensa por chuva', SAFE_MODE: 'Modo seguro' };
const moisture = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

export const FarmView: React.FC = () => {
  const { 
    sectors, 
    setSectorMoisture, 
    setSectorThresholds, 
    setSensorStatus, 
    manualToggleValve, 
    controlMode 
  } = useAgroStore();

  const [selectedSectorId, setSelectedSectorId] = useState<string>('sector-a');
  const selectedSector = sectors.find(s => s.id === selectedSectorId) || sectors[0];

  // Cálculo da necessidade hídrica teórica
  const setTelemetryPaused = useAgroStore(state => state.setTelemetryPaused);
  const requiredWaterLiters = calculateRequiredIrrigationVolume(
    selectedSector.soilMoisture,
    selectedSector.targetFieldCapacity,
    selectedSector.areaHa,
    selectedSector.rootDepthMm
  );

  return (
    <div className="space-y-4">
      
      {/* HEADER DA FAZENDA */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-scada-card border border-scada-border rounded-xl p-4 shadow-md">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            🚜 Fazenda São Jerônimo — Mapa Esquemático dos Setores (55 Hectares)
          </h2>
          <p className="text-xs text-slate-400">
            Selecione um setor para ver a última leitura e ajustar seus parâmetros.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2 py-1 rounded bg-slate-800 text-slate-300">
            Culturas: Tomate, Milho, Alface, Feijão
          </span>
          <span className="px-2 py-1 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
            4 setores simulados
          </span>
        </div>
      </div>

      {/* MAPA ESQUEMÁTICO INTERATIVO DA PROPRIEDADE (SVG) */}
      <div className="bg-scada-surface border border-scada-border rounded-xl p-4 shadow-md">
        <div className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
           Selecione um setor
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {sectors.map((sec) => {
            const isSelected = sec.id === selectedSectorId;
            let statusBorder = 'border-scada-border';
            let bgFill = 'bg-slate-900/80';

            if (sec.valveState === 'IRRIGATING') {
              statusBorder = 'border-cyan-500 ring-2 ring-cyan-500/30';
              bgFill = 'bg-cyan-950/40';
            } else if (sec.valveState === 'SUSPENDED_RAIN') {
              statusBorder = 'border-amber-500';
              bgFill = 'bg-amber-950/40';
            } else if (sec.valveState === 'SAFE_MODE') {
              statusBorder = 'border-rose-500';
              bgFill = 'bg-rose-950/40';
            }

            return (
              <button type="button"
                key={sec.id}
                onClick={() => setSelectedSectorId(sec.id)}
                aria-pressed={isSelected}
                className={`p-4 text-left rounded-xl transition-all border ${statusBorder} ${bgFill} ${
                  isSelected ? 'scale-[1.02] shadow-lg shadow-emerald-950/40' : 'hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-slate-100">{sec.name}</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                    sec.valveState === 'IRRIGATING' 
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-500 animate-pulse' 
                      : (sec.valveState === 'SUSPENDED_RAIN' ? 'bg-amber-950 text-amber-300' : 'bg-slate-800 text-slate-300')
                  }`}>
                     {labels[sec.valveState]}
                  </span>
                </div>

                <div className="text-xs text-slate-400 mb-2">
                  Cultura: <strong className="text-slate-200">{sec.crop}</strong> ({sec.areaHa} ha)
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Umidade:</span>
                    <strong className={`font-mono ${sec.soilMoisture < sec.minMoistureThreshold ? 'text-amber-400' : 'text-emerald-400'}`}>
                       {moisture.format(sec.soilMoisture)}%
                    </strong>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${sec.soilMoisture < sec.minMoistureThreshold ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(100, sec.soilMoisture)}%` }}
                    />
                  </div>
                </div>

                 <p className="mt-2 text-xs text-slate-300">{sectorSituation(sec, controlMode)}</p>
                 <div className="mt-2 pt-2 border-t border-slate-800/80 text-xs text-slate-400">
                  <span className="text-slate-300">{sec.waterConsumedLiters.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L acumulados
                    {sec.waterConsumedLiters === 0 && sec.valveState === 'IDLE' && ' · ainda não irrigou'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* DETALHES E CALIBRAÇÃO DO SETOR SELECIONADO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* COLUNA ESQUERDA: TELEMETRIA E CONTROLES (7 COLS) */}
        <div className="lg:col-span-7 bg-scada-card border border-scada-border rounded-xl p-4 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-scada-border pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Painel de Calibração: {selectedSector.name} ({selectedSector.crop})
              </h3>
              <p className="text-xs text-slate-400">
                Ajuste os sensores virtuais e limites operacionais agronômicos
              </p>
            </div>
            <span className="text-xs font-mono bg-slate-800 text-cyan-300 px-2.5 py-1 rounded border border-slate-700">
              Área: {selectedSector.areaHa} hectares
            </span>
          </div>

          {/* Sliders Interativos de Sensor */}
          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  <Droplets className="w-4 h-4 text-cyan-400" />
                  Umidade volumétrica simulada:
                </span>
                <span className="font-mono text-base font-bold text-cyan-400">
                  {selectedSector.soilMoisture.toFixed(1)}%
                </span>
              </div>
              <button type="button" aria-pressed={Boolean(selectedSector.telemetryPaused)}
                className="my-2 rounded bg-slate-800 px-3 py-2 text-sm"
                onClick={() => setTelemetryPaused(selectedSector.id, !selectedSector.telemetryPaused)}>
                {selectedSector.telemetryPaused ? 'Retomar pacotes simulados' : 'Interromper pacotes simulados'}
              </button>
              <p className="text-xs text-slate-300">
                Última leitura: {(selectedSector.lastMeasuredMoisture ?? selectedSector.soilMoisture).toFixed(2)}%.
                A válvula fecha após cinco minutos virtuais sem pacote.
              </p>
              <input 
                type="range"
                min="5" max="95" step="0.5"
                value={selectedSector.soilMoisture}
                onChange={(e) => setSectorMoisture(selectedSector.id, parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                 <span>{selectedSector.wiltingPoint ?? 12}% (Ponto de murcha)</span>
                <span className="text-amber-400 font-bold">Gatilho Mínimo: {selectedSector.minMoistureThreshold}%</span>
                <span>{selectedSector.targetFieldCapacity}% (Capacidade de Campo)</span>
              </div>
            </div>

            {/* Configuração de Limites do Setor */}
            <div className="bg-scada-bg p-3.5 rounded-xl border border-scada-border grid grid-cols-2 gap-3">
              <div>
                   <label htmlFor="sector-threshold" className="text-[11px] text-slate-400 block mb-1">
                  Limiar Mínimo de Gatilho (%)
                </label>
                <input 
                   id="sector-threshold" type="number"
                   min={(selectedSector.wiltingPoint ?? 12) + 1} max={selectedSector.targetFieldCapacity - 1} step="1"
                  value={selectedSector.minMoistureThreshold}
                  onChange={(e) => setSectorThresholds(selectedSector.id, parseFloat(e.target.value) || 30, selectedSector.targetFieldCapacity)}
                  className="w-full bg-slate-900 border border-scada-border rounded px-2.5 py-1.5 font-mono text-slate-100 text-xs"
                />
                <span className="text-[10px] text-slate-500 font-mono">Dispara irrigação abaixo deste valor</span>
              </div>

              <div>
                 <label htmlFor="sector-capacity" className="text-[11px] text-slate-400 block mb-1">
                  Capacidade de Campo Alvo (%)
                </label>
                <input 
                   id="sector-capacity" type="number"
                   min={selectedSector.minMoistureThreshold + 1} max="60" step="1"
                  value={selectedSector.targetFieldCapacity}
                  onChange={(e) => setSectorThresholds(selectedSector.id, selectedSector.minMoistureThreshold, parseFloat(e.target.value) || 60)}
                  className="w-full bg-slate-900 border border-scada-border rounded px-2.5 py-1.5 font-mono text-slate-100 text-xs"
                />
                <span className="text-[10px] text-slate-500 font-mono">Encerra a irrigação ao atingir a meta</span>
              </div>
            </div>

            {/* Diagnóstico do Nó Sensor & Safe Mode Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-scada-border text-xs">
              <div className="flex items-center gap-2">
                <Radio className={`w-4 h-4 ${selectedSector.sensorStatus === 'ONLINE' ? 'text-emerald-400' : 'text-rose-400'}`} />
                <div>
                  <span className="font-semibold block text-slate-200">Status do Nó Sensor ESP32</span>
                  <span className="text-[10px] text-slate-400">
                    {selectedSector.sensorStatus !== 'ONLINE' ? 'Falha de leitura simulada' :
                      selectedSector.telemetryPaused ? 'Fluxo de pacotes simulado interrompido' : 'Fluxo de pacotes simulado ativo'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSensorStatus(
                  selectedSector.id, 
                  selectedSector.sensorStatus === 'ONLINE' ? 'OFFLINE' : 'ONLINE'
                )}
                className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all ${
                  selectedSector.sensorStatus === 'ONLINE' 
                    ? 'bg-rose-950/80 text-rose-300 border border-rose-700 hover:bg-rose-900' 
                    : 'bg-emerald-950/80 text-emerald-300 border border-emerald-700 hover:bg-emerald-900'
                }`}
              >
                {selectedSector.sensorStatus === 'ONLINE' ? 'Simular Falha Sensor' : 'Restaurar Sensor'}
              </button>
            </div>

            {/* Controle Manual de Válvula (caso no Modo Manual) */}
            {controlMode === 'MANUAL' && (
              <div className="p-3 bg-amber-950/30 border border-amber-600/40 rounded-lg flex items-center justify-between text-xs">
                <div>
                  <strong className="text-amber-300 block">Controle Manual de Solenoide Ativo</strong>
                  <span className="text-[11px] text-slate-400">Você pode ligar ou desligar a válvula manualmente</span>
                </div>
                <button
                  onClick={() => manualToggleValve(selectedSector.id)}
                  className={`px-3 py-1.5 rounded font-mono font-bold transition-all ${
                    selectedSector.valveState === 'IRRIGATING'
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : 'bg-cyan-600 hover:bg-cyan-700 text-white'
                  }`}
                >
                  {selectedSector.valveState === 'IRRIGATING' ? 'Fechar Válvula' : 'Abrir Válvula'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* COLUNA DIREITA: BALANÇO AGRONÔMICO DO SETOR (5 COLS) */}
        <div className="lg:col-span-5 bg-scada-card border border-scada-border rounded-xl p-4 shadow-md space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-100 mb-1 flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-emerald-400" />
              Parâmetros da Cultura: {selectedSector.crop}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              Parâmetros hipotéticos do balanço hídrico
            </p>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between p-2 rounded bg-scada-bg border border-scada-border">
                 <span className="text-slate-400">Coeficiente de cultura (Kc):</span>
                <strong className="text-emerald-400">{selectedSector.kcFactor}</strong>
              </div>

              <div className="flex justify-between p-2 rounded bg-scada-bg border border-scada-border">
                 <span className="text-slate-400">Profundidade radicular (Zr):</span>
                <strong className="text-cyan-400">{selectedSector.rootDepthMm} mm</strong>
              </div>

              <div className="flex justify-between p-2 rounded bg-scada-bg border border-scada-border">
                <span className="text-slate-400">Vazão da Válvula Setorizada:</span>
                <strong className="text-slate-200">{selectedSector.valveFlowRateLps} L/s</strong>
              </div>

              <div className="flex justify-between p-2 rounded bg-scada-bg border border-scada-border">
                <span className="text-slate-400">Potência da Motobomba:</span>
                <strong className="text-yellow-400">{selectedSector.pumpPowerKw} kW</strong>
              </div>
            </div>

            {/* Cálculo de Déficit e Volume Necessário */}
            <div className="mt-4 p-3 rounded-xl bg-scada-bg border border-scada-border text-xs space-y-2">
              <div className="text-slate-300 font-semibold flex items-center justify-between">
                <span>Necessidade Hídrica Estimada:</span>
                <span className="text-cyan-400 font-mono font-bold text-sm">
                  {requiredWaterLiters.toLocaleString('pt-BR')} Litros
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                 Volume teórico para repor a umidade de {selectedSector.soilMoisture.toFixed(1)}% até a capacidade de campo de {selectedSector.targetFieldCapacity}%, sem considerar chuva e perdas durante a aplicação.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-scada-border flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Consumo Acumulado:</span>
            <strong className="text-emerald-300 font-bold text-sm">
              {selectedSector.waterConsumedLiters.toLocaleString('pt-BR')} L
            </strong>
          </div>
        </div>

      </div>

    </div>
  );
};
