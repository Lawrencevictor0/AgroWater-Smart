import { create } from 'zustand';
import { 
  Sector, 
  WeatherState, 
  ControlMode, 
  LogEvent, 
  SimulationClock, 
  TraditionalIrrigationState, 
  ScenarioPreset,
  SensorStatus,
  ActiveTab
} from '../types';
import { calculateSoilMoistureDelta } from '../services/waterBalance';
import { predictIrrigationKNN } from '../services/mlClassifier';

const SIMULATION_START = '2026-11-05T08:00:00.000Z';
const TELEMETRY_TIMEOUT_MINUTES = 5;
const telemetryExpired = (sector: Sector, minute: number) =>
  minute - (sector.lastPacketMinute ?? 0) >= TELEMETRY_TIMEOUT_MINUTES;

interface AgroStoreState {
  // Estado da Fazenda
  sectors: Sector[];
  weather: WeatherState;
  controlMode: ControlMode;
  clock: SimulationClock;
  scenarioPreset: ScenarioPreset | null;
  demoPhase: number | null;
  traditional: TraditionalIrrigationState;
  traditionalSectors: Sector[];
  forecastIssuedAt: number;
  logs: LogEvent[];
  
  // Apresentação Acadêmica
  isPresentationMode: boolean;
  presentationStep: number;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  
  // Ações da Simulação
  tick: () => void;
  advanceMinute: () => void;
  setControlMode: (mode: ControlMode) => void;
  setSpeedMultiplier: (speed: number) => void;
  togglePause: () => void;
  resetSimulation: () => void;
  
  // Ações de Setores e Sensores
  setSectorMoisture: (sectorId: string, moisture: number) => void;
  setSectorThresholds: (sectorId: string, min: number, target: number) => void;
  setSensorStatus: (sectorId: string, status: SensorStatus) => void;
  setTelemetryPaused: (sectorId: string, paused: boolean) => void;
  manualToggleValve: (sectorId: string) => void;
  
  // Ações Climáticas
  setWeather: (weatherUpdate: Partial<WeatherState>) => void;
  
  // Cenários do Laboratório
  applyScenario: (scenario: ScenarioPreset) => void;
  
  // Modo Apresentação
  togglePresentationMode: () => void;
  nextPresentationStep: () => void;
  prevPresentationStep: () => void;
  resetPresentation: () => void;
  
  // Limpeza
  clearLogs: () => void;
}

// 4 Setores Iniciais Conforme Especificação Mestre
const INITIAL_SECTORS: Sector[] = [
  {
    id: 'sector-a',
    name: 'Setor A',
    crop: 'Tomates',
    areaHa: 10,
    soilMoisture: 25.0, // Solo seco
    soilTemp: 29.0,
    minMoistureThreshold: 32.0,
    targetFieldCapacity: 34.0,
    wiltingPoint: 16,
    maxMoistureThreshold: 80.0,
    valveState: 'IDLE',
    valveFlowRateLps: 4.5, // 4.5 L/s
    pumpPowerKw: 5.5,
    waterConsumedLiters: 0,
    energyConsumedKwh: 0,
    sensorStatus: 'ONLINE',
    kcFactor: 1.15,
    rootDepthMm: 350,
    history: []
  },
  {
    id: 'sector-b',
    name: 'Setor B',
    crop: 'Milho',
    areaHa: 25,
    soilMoisture: 29.0,
    soilTemp: 25.0,
    minMoistureThreshold: 24.0,
    targetFieldCapacity: 32.0,
    wiltingPoint: 14,
    maxMoistureThreshold: 85.0,
    valveState: 'IDLE',
    valveFlowRateLps: 8.0,
    pumpPowerKw: 7.5,
    waterConsumedLiters: 0,
    energyConsumedKwh: 0,
    sensorStatus: 'ONLINE',
    kcFactor: 1.20,
    rootDepthMm: 500,
    history: []
  },
  {
    id: 'sector-c',
    name: 'Setor C',
    crop: 'Alface',
    areaHa: 5,
    soilMoisture: 28.0,
    soilTemp: 23.0,
    minMoistureThreshold: 23.0,
    targetFieldCapacity: 30.0,
    wiltingPoint: 13,
    maxMoistureThreshold: 90.0,
    valveState: 'IDLE',
    valveFlowRateLps: 2.5,
    pumpPowerKw: 3.0,
    waterConsumedLiters: 0,
    energyConsumedKwh: 0,
    sensorStatus: 'ONLINE',
    kcFactor: 1.05,
    rootDepthMm: 250,
    history: []
  },
  {
    id: 'sector-d',
    name: 'Setor D',
    crop: 'Feijão',
    areaHa: 15,
    soilMoisture: 27.0,
    soilTemp: 27.0,
    minMoistureThreshold: 23.0,
    targetFieldCapacity: 31.0,
    wiltingPoint: 14,
    maxMoistureThreshold: 80.0,
    valveState: 'IDLE',
    valveFlowRateLps: 5.0,
    pumpPowerKw: 5.5,
    waterConsumedLiters: 0,
    energyConsumedKwh: 0,
    sensorStatus: 'ONLINE',
    kcFactor: 1.10,
    rootDepthMm: 300,
    history: []
  }
];

const INITIAL_WEATHER: WeatherState = {
  airTemp: 28.5,
  airHumidity: 48,
  rainProbability2h: 20,
  rainIntensity: 0.0,
  et0: 5.2,
  condition: 'SUNNY'
};

const INITIAL_TRADITIONAL: TraditionalIrrigationState = {
  waterConsumedLiters: 0,
  energyConsumedKwh: 0,
  pumpRunningMinutes: 0,
  triggerCount: 0,
  scheduleTimes: ['06:00', '18:00'],
  durationMinutes: 30 // Irriga por 30 minutos em cada turno cegamente
};

export const useAgroStore = create<AgroStoreState>((set, get) => ({
  sectors: INITIAL_SECTORS,
  weather: INITIAL_WEATHER,
  controlMode: 'RULES',
  scenarioPreset: null,
  demoPhase: null,
  clock: {
    virtualTime: SIMULATION_START,
    speedMultiplier: 1,
    isPaused: false,
    tickCount: 0,
    randomSeed: 42
  },
  traditional: INITIAL_TRADITIONAL,
  traditionalSectors: INITIAL_SECTORS,
  forecastIssuedAt: 0,
  logs: [
    {
      id: 'log-init-1',
      timestamp: new Date().toISOString(),
      virtualTime: '08:00:00',
      type: 'MODE_CHANGE',
      severity: 'INFO',
      message: 'Sistema AgroWater Smart inicializado no modo Automático por Regras.',
      reason: 'Parâmetros agronômicos carregados para Tomates, Milho, Alface e Feijão.'
    }
  ],
  isPresentationMode: false,
  presentationStep: 0,
  activeTab: 'dashboard',
  setActiveTab: (tab: ActiveTab) => set({ activeTab: tab }),

  tick: () => {
    const { clock, advanceMinute } = get();
    if (clock.isPaused) return;
    for (let i = 0; i < clock.speedMultiplier; i++) advanceMinute();
  },

  advanceMinute: () => {
    const { clock, sectors, weather, controlMode, traditional, traditionalSectors, logs, forecastIssuedAt } = get();
    const currentVirtualDate = new Date(clock.virtualTime);
    const deltaMinutes = 1;
    const newVirtualTime = new Date(currentVirtualDate.getTime() + 60_000).toISOString();
    const timeString = currentVirtualDate.toISOString().slice(11, 19);

    const newLogs: LogEvent[] = [...logs];

    // Atualização do Sistema Tradicional (Executa nos horários programados sem considerar solo nem clima)
    const currentHourMin = timeString.substring(0, 5);
    let tradWaterDelta = 0;
    let tradEnergyDelta = 0;
    let tradPumpRunning = false;

    // Verifica se está dentro de uma janela de irrigação fixa tradicional (ex: 06:00 às 06:30 ou 18:00 às 18:30)
    traditional.scheduleTimes.forEach(sched => {
      const [sh, sm] = sched.split(':').map(Number);
      const schedDate = new Date(currentVirtualDate);
      schedDate.setUTCHours(sh, sm, 0, 0);
      const diffMinutes = (currentVirtualDate.getTime() - schedDate.getTime()) / (1000 * 60);
      if (diffMinutes >= 0 && diffMinutes < traditional.durationMinutes) {
        tradPumpRunning = true;
      }
    });

    const updatedTraditionalSectors = traditionalSectors.map(sector => {
      const valveState = tradPumpRunning ? 'IRRIGATING' as const : 'IDLE' as const;
      const step = calculateSoilMoistureDelta({ ...sector, valveState }, weather, deltaMinutes, false);
      const kwh = sector.pumpPowerKw * step.pumpMinutes / 60;
      tradWaterDelta += step.irrigationLiters;
      tradEnergyDelta += kwh;
      return {
        ...sector, valveState, soilMoisture: step.newMoisture,
        waterConsumedLiters: sector.waterConsumedLiters + step.irrigationLiters,
        energyConsumedKwh: sector.energyConsumedKwh + kwh,
        pumpMinutes: (sector.pumpMinutes ?? 0) + step.pumpMinutes,
        stressMinutes: (sector.stressMinutes ?? 0) + Number(step.newMoisture < sector.minMoistureThreshold)
      };
    });

    const updatedTraditional: TraditionalIrrigationState = {
      ...traditional,
      waterConsumedLiters: traditional.waterConsumedLiters + tradWaterDelta,
      energyConsumedKwh: traditional.energyConsumedKwh + tradEnergyDelta,
      pumpRunningMinutes: tradPumpRunning ? traditional.pumpRunningMinutes + deltaMinutes : traditional.pumpRunningMinutes,
      triggerCount: tradPumpRunning && (traditional.pumpRunningMinutes % traditional.durationMinutes === 0) 
        ? traditional.triggerCount + 1 
        : traditional.triggerCount
    };

    // Atualização Inteligente de Cada Setor
    const updatedSectors = sectors.map(previous => {
      const minute = clock.tickCount + 1;
      const sector = previous.sensorStatus === 'ONLINE' && !previous.telemetryPaused
        ? { ...previous, lastPacketMinute: minute, lastMeasuredMoisture: previous.soilMoisture }
        : previous;
      const expired = telemetryExpired(sector, minute);
      // 1. Tratar falha de sensor (Safe Mode)
      if (sector.sensorStatus !== 'ONLINE' || expired) {
        if (sector.valveState !== 'SAFE_MODE') {
          newLogs.unshift({
            id: `log-safemode-${Date.now()}-${sector.id}`,
            timestamp: new Date().toISOString(),
            virtualTime: timeString,
            sectorId: sector.id,
            sectorName: sector.name,
            type: 'SENSOR_FAULT',
            severity: 'ALERT',
            message: `Falha no sensor do ${sector.name} (${sector.crop}).`,
            reason: expired ? 'Cinco minutos virtuais sem pacote. Válvula fechada.' : 'Leitura indisponível. Válvula fechada.'
          });
        }
        return {
          ...sector,
          valveState: 'SAFE_MODE' as const,
          soilMoisture: calculateSoilMoistureDelta({ ...sector, valveState: 'SAFE_MODE' }, weather, 1).newMoisture,
          stressMinutes: (sector.stressMinutes ?? 0) + Number(sector.soilMoisture < sector.minMoistureThreshold)
        };
      }

      // 2. Tomada de Decisão Automatizada conforme o Modo Selecionado
      let targetValveState = sector.valveState;
      let decisionReason = '';
      const measuredMoisture = sector.lastMeasuredMoisture ?? sector.soilMoisture;
      const rainHold = clock.tickCount - forecastIssuedAt < 120 &&
        weather.rainProbability2h >= 65 && (sector.rainHoldMinutes ?? 0) < 120 &&
        measuredMoisture > (sector.wiltingPoint ?? 12) + 2;

      if (controlMode === 'RULES') {
        // REGRA A: Solo seco, porém com chuva prevista iminente (>= 65%)
        if (rainHold && (measuredMoisture < sector.minMoistureThreshold || sector.valveState === 'IRRIGATING')) {
          targetValveState = 'SUSPENDED_RAIN';
          decisionReason = `Umidade em ${sector.soilMoisture.toFixed(1)}% (< limiar ${sector.minMoistureThreshold}%), porém probabilidade de chuva em ${weather.rainProbability2h}%. Irrigação adiada pela IA.`;
        }
        // REGRA B: Solo seco sem previsão de chuva (< 65%) -> Iniciar irrigação
        else if (measuredMoisture < sector.minMoistureThreshold) {
          targetValveState = 'IRRIGATING';
          decisionReason = `Déficit hídrico detectado (${sector.soilMoisture.toFixed(1)}% < ${sector.minMoistureThreshold}%). Válvula acionada para atingir Capacidade de Campo (${sector.targetFieldCapacity}%).`;
        }
        // REGRA C: Se estiver irrigando e já alcançou ou superou a Capacidade de Campo -> Parar
        else if (sector.valveState === 'IRRIGATING' && sector.soilMoisture >= sector.targetFieldCapacity) {
          targetValveState = 'IDLE';
          decisionReason = `Capacidade de campo atingida (${sector.soilMoisture.toFixed(1)}% >= ${sector.targetFieldCapacity}%). Irrigação encerrada com sucesso.`;
        }
        // REGRA D: Solo acima do limiar sem necessidade
        else if (sector.soilMoisture >= sector.minMoistureThreshold && sector.valveState !== 'IRRIGATING') {
          targetValveState = 'IDLE';
        }
      } 
      else if (controlMode === 'ML_DEMO') {
        // Modelo KNN Demonstrativo
        const prediction = predictIrrigationKNN(
          measuredMoisture,
          sector.soilTemp,
          clock.tickCount - forecastIssuedAt < 120 ? weather.rainProbability2h : 0,
          weather.airHumidity,
          weather.et0
        );

        if (prediction.decision === 'SUSPEND_RAIN' && rainHold) {
          targetValveState = 'SUSPENDED_RAIN';
          decisionReason = `Classificador KNN (${prediction.confidencePct}% conf.): ${prediction.explanation}`;
        } else if (prediction.decision === 'IRRIGATE') {
          targetValveState = 'IRRIGATING';
          decisionReason = `Classificador KNN (${prediction.confidencePct}% conf.): ${prediction.explanation}`;
        } else {
          targetValveState = 'IDLE';
          decisionReason = `Classificador KNN (${prediction.confidencePct}% conf.): Solo adequado. Standby.`;
        }
      }
      // Se for MANUAL, o usuário controla diretamente as válvulas
      if (targetValveState === 'SAFE_MODE') targetValveState = 'IDLE';
      if (targetValveState === 'IRRIGATING' && sector.soilMoisture >= sector.targetFieldCapacity) {
        targetValveState = 'IDLE';
        decisionReason = 'Capacidade de campo atingida.';
      }

      // Log de transição de estado da válvula
      if (targetValveState !== sector.valveState && decisionReason) {
        newLogs.unshift({
          id: `log-trans-${Date.now()}-${sector.id}`,
          timestamp: new Date().toISOString(),
          virtualTime: timeString,
          sectorId: sector.id,
          sectorName: sector.name,
          type: targetValveState === 'IRRIGATING' ? 'IRRIGATION_START' : (targetValveState === 'SUSPENDED_RAIN' ? 'RAIN_SUSPEND' : 'IRRIGATION_STOP'),
          severity: targetValveState === 'SUSPENDED_RAIN' ? 'WARNING' : (targetValveState === 'IRRIGATING' ? 'SUCCESS' : 'INFO'),
          message: `${sector.name} (${sector.crop}): Válvula [${targetValveState}]`,
          reason: decisionReason
        });
      }

      // 3. Aplicação do Modelo Físico de Balanço Hídrico
      const simulatedSector = { ...sector, valveState: targetValveState };
      const { newMoisture, irrigationLiters, pumpMinutes } = calculateSoilMoistureDelta(simulatedSector, weather, deltaMinutes);

      // Consumo de água e energia no setor
      const energyDelta = sector.pumpPowerKw * pumpMinutes / 60;

      // Histórico de medições
      const newHistoryItem = {
        timestamp: timeString,
        moisture: newMoisture,
        soilTemp: sector.soilTemp,
        valveState: targetValveState,
        rainMm: (weather.rainIntensity / 60) * deltaMinutes
      };
      const updatedHistory = [...sector.history, newHistoryItem].slice(-30);

      return {
        ...sector,
        soilMoisture: newMoisture,
        valveState: targetValveState,
        waterConsumedLiters: sector.waterConsumedLiters + irrigationLiters,
        energyConsumedKwh: sector.energyConsumedKwh + energyDelta,
        pumpMinutes: (sector.pumpMinutes ?? 0) + pumpMinutes,
        stressMinutes: (sector.stressMinutes ?? 0) + Number(newMoisture < sector.minMoistureThreshold),
        rainHoldMinutes: targetValveState === 'SUSPENDED_RAIN' ? (sector.rainHoldMinutes ?? 0) + 1 : 0,
        history: updatedHistory
      };
    });

    // Limitar logs a 100 itens
    const trimmedLogs = newLogs.slice(0, 100);

    set({
      clock: {
        ...clock,
        virtualTime: newVirtualTime,
        tickCount: clock.tickCount + 1
      },
      traditional: updatedTraditional,
      traditionalSectors: updatedTraditionalSectors,
      sectors: updatedSectors,
      logs: trimmedLogs
    });
  },

  setControlMode: (mode) => {
    const { logs, clock } = get();
    const timeString = clock.virtualTime.slice(11, 19);
    const modeName = mode === 'RULES' ? 'Automático por Regras' : (mode === 'ML_DEMO' ? 'Demonstrativo Machine Learning (KNN)' : 'Manual');
    
    set({
      controlMode: mode,
      demoPhase: null,
      logs: [
        {
          id: `log-mode-${Date.now()}`,
          timestamp: new Date().toISOString(),
          virtualTime: timeString,
          type: 'MODE_CHANGE',
          severity: 'INFO',
          message: `Modo de controle alterado para: ${modeName}.`,
          reason: mode === 'ML_DEMO' ? 'Módulo experimental ativado. Decisões geradas por KNN sobre dados sintéticos.' : 'Transição solicitada pelo operador.'
        },
        ...logs
      ]
    });
  },

  setSpeedMultiplier: (speed) => {
    if (![1, 2, 5, 10].includes(speed)) return;
    set(state => ({ clock: { ...state.clock, speedMultiplier: speed } }));
  },

  togglePause: () => {
    set(state => ({ clock: { ...state.clock, isPaused: !state.clock.isPaused } }));
  },

  resetSimulation: () => {
    set({
      sectors: INITIAL_SECTORS,
      weather: INITIAL_WEATHER,
      traditional: INITIAL_TRADITIONAL,
      traditionalSectors: INITIAL_SECTORS,
      controlMode: 'RULES',
      scenarioPreset: null,
      demoPhase: null,
      forecastIssuedAt: 0,
      clock: {
        virtualTime: SIMULATION_START,
        speedMultiplier: 1,
        isPaused: false,
        tickCount: 0,
        randomSeed: 42
      },
      logs: [
        {
          id: `log-reset-${Date.now()}`,
          timestamp: new Date().toISOString(),
          virtualTime: '08:00:00',
          type: 'MODE_CHANGE',
          severity: 'INFO',
          message: 'Simulação reiniciada para os parâmetros basais.',
          reason: 'Estado da fazenda restaurado com sucesso.'
        }
      ]
    });
  },

  setSectorMoisture: (sectorId, moisture) => {
    if (!Number.isFinite(moisture)) return;
    const update = (s: Sector) => s.id === sectorId ? { ...s, soilMoisture: Math.max(0, Math.min(100, moisture)) } : s;
    set(state => ({
      demoPhase: null,
      sectors: state.sectors.map(update),
      traditionalSectors: state.traditionalSectors.map(update)
    }));
  },

  setSectorThresholds: (sectorId, min, target) => {
    if (![min, target].every(Number.isFinite) || min >= target || target > 60) return;
    const update = (s: Sector) => s.id === sectorId && min > (s.wiltingPoint ?? 12)
      ? { ...s, minMoistureThreshold: min, targetFieldCapacity: target } : s;
    set(state => ({
      demoPhase: null,
      sectors: state.sectors.map(update),
      traditionalSectors: state.traditionalSectors.map(update)
    }));
  },

  setSensorStatus: (sectorId, status) => {
    const { clock, sectors } = get();
    const sector = sectors.find(s => s.id === sectorId);
    if (!sector || sector.sensorStatus === status) return;
    set(state => ({
      demoPhase: null,
      sectors: state.sectors.map(s => s.id === sectorId
        ? { ...s, sensorStatus: status, valveState: status === 'ONLINE' ? 'IDLE' : 'SAFE_MODE',
            ...(status === 'ONLINE' && !s.telemetryPaused
              ? { lastPacketMinute: clock.tickCount, lastMeasuredMoisture: s.soilMoisture } : {}) } : s),
      logs: [{
        id: `sensor-${sectorId}-${Date.now()}`, timestamp: new Date().toISOString(),
        virtualTime: clock.virtualTime.slice(11, 19), sectorId, sectorName: sector.name,
        type: status === 'ONLINE' ? 'MODE_CHANGE' as const : 'SENSOR_FAULT' as const,
        severity: status === 'ONLINE' ? 'INFO' as const : 'ALERT' as const,
        message: `Sensor simulado: ${status}`,
        reason: status === 'ONLINE' ? 'Leitura restaurada; válvula inicialmente fechada.' : 'Válvula fechada imediatamente.'
      }, ...state.logs].slice(0, 100)
    }));
  },

  setTelemetryPaused: (sectorId, paused) => set(state => ({
    demoPhase: null,
    sectors: state.sectors.map(s => s.id === sectorId ? {
      ...s, telemetryPaused: paused,
      lastMeasuredMoisture: s.lastMeasuredMoisture ?? s.soilMoisture
    } : s)
  })),

  manualToggleValve: (sectorId) => {
    const { sectors, controlMode, logs, clock } = get();
    if (controlMode !== 'MANUAL') return;

    const timeString = clock.virtualTime.slice(11, 19);
    const targetSector = sectors.find(s => s.id === sectorId);
    if (!targetSector || targetSector.sensorStatus !== 'ONLINE' ||
        targetSector.valveState === 'SAFE_MODE' || telemetryExpired(targetSector, clock.tickCount)) return;

    const newState = targetSector.valveState === 'IRRIGATING' ? 'IDLE' : 'IRRIGATING';

    set({
      sectors: sectors.map(s => s.id === sectorId ? { ...s, valveState: newState } : s),
      logs: [
        {
          id: `log-manual-${Date.now()}`,
          timestamp: new Date().toISOString(),
          virtualTime: timeString,
          sectorId,
          sectorName: targetSector.name,
          type: 'MANUAL_OVERRIDE',
          severity: 'INFO',
          message: `${targetSector.name}: Acionamento manual da válvula para [${newState}].`,
          reason: 'Comando direto do operador no modo manual.'
        },
        ...logs
      ]
    });
  },

  setWeather: (weatherUpdate) => {
    const { airTemp, airHumidity, rainProbability2h, rainIntensity, et0 } = weatherUpdate;
    const valid = (v: number | undefined, min: number, max: number) =>
      v === undefined || (Number.isFinite(v) && v >= min && v <= max);
    if (!valid(airTemp, -80, 60) || !valid(airHumidity, 0, 100) ||
      !valid(rainProbability2h, 0, 100) || !valid(rainIntensity, 0, 300) || !valid(et0, 0, 30)) return;
    set(state => ({
      demoPhase: null,
      weather: { ...state.weather, ...weatherUpdate },
      forecastIssuedAt: rainProbability2h === undefined ? state.forecastIssuedAt : state.clock.tickCount
    }));
  },

  applyScenario: (scenario) => {
    get().resetSimulation();
    const { sectors, logs, clock } = get();
    const timeString = clock.virtualTime.slice(11, 19);

    if (scenario === 'SECA_PROLONGADA') {
      set({
        weather: {
          airTemp: 35.0,
          airHumidity: 22,
          rainProbability2h: 5,
          rainIntensity: 0.0,
          et0: 7.8,
          condition: 'SUNNY'
        },
        sectors: sectors.map(s => ({
          ...s,
          soilMoisture: Math.min(s.soilMoisture, 22.0),
          soilTemp: 33.0
        })),
        logs: [
          {
            id: `log-scen-${Date.now()}`,
            timestamp: new Date().toISOString(),
            virtualTime: timeString,
            type: 'MODE_CHANGE',
            severity: 'WARNING',
            message: 'Cenário Ativado: Seca Prolongada e Elevada Evapotranspiração.',
            reason: 'Temperatura em 35°C, umidade do ar em 22% e solo seco em todos os setores.'
          },
          ...logs
        ]
      });
    }
    else if (scenario === 'CHUVA_INESPERADA') {
      set({
        weather: {
          airTemp: 22.0,
          airHumidity: 88,
          rainProbability2h: 20,
          rainIntensity: 18.5, // 18.5 mm/h
          et0: 1.8,
          condition: 'STORM'
        },
        sectors: sectors.map(s => ({
          ...s,
          soilMoisture: 26.0 // Solo seco prestes a receber chuva
        })),
        logs: [
          {
            id: `log-scen-${Date.now()}`,
            timestamp: new Date().toISOString(),
            virtualTime: timeString,
            type: 'RAIN_START',
            severity: 'SUCCESS',
            message: 'Cenário ativado: chuva observada de 18,5 mm/h apesar da previsão de 20%.',
            reason: 'Chuva observada e probabilidade são entradas independentes.'
          },
          ...logs
        ]
      });
    }
    else if (scenario === 'IRRIGACAO_EXCESSIVA') {
      // Simula o erro do método tradicional irrigando com solo encharcado
      set({
        weather: {
          airTemp: 24.0,
          airHumidity: 70,
          rainProbability2h: 80,
          rainIntensity: 5.0,
          et0: 2.5,
          condition: 'RAINY'
        },
        sectors: sectors.map(s => ({
          ...s,
          soilMoisture: s.targetFieldCapacity
        })),
        logs: [
          {
            id: `log-scen-${Date.now()}`,
            timestamp: new Date().toISOString(),
            virtualTime: timeString,
            type: 'MODE_CHANGE',
            severity: 'ALERT',
            message: 'Cenário Ativado: Comparativo de Irrigação Excessiva.',
            reason: 'Solo inicialmente na capacidade de campo, com chuva observada.'
          },
          ...logs
        ]
      });
    }
    else if (scenario === 'OPERACAO_IDEAL') {
      set({
        weather: INITIAL_WEATHER,
        sectors: INITIAL_SECTORS.map(s => ({
          ...s,
          soilMoisture: s.targetFieldCapacity,
          sensorStatus: 'ONLINE'
        })),
        logs: [
          {
            id: `log-scen-${Date.now()}`,
            timestamp: new Date().toISOString(),
            virtualTime: timeString,
            type: 'MODE_CHANGE',
            severity: 'INFO',
            message: 'Cenário Ativado: Operação Ideal Estável.',
            reason: 'Todos os setores em Capacidade de Campo com clima ameno.'
          },
          ...logs
        ]
      });
    }
    else if (scenario === 'FALHA_SENSOR') {
      set({
        sectors: sectors.map((s, idx) => idx === 0 ? { ...s, sensorStatus: 'OFFLINE', valveState: 'SAFE_MODE' } : s),
        logs: [
          {
            id: `log-scen-${Date.now()}`,
            timestamp: new Date().toISOString(),
            virtualTime: timeString,
            type: 'SENSOR_FAULT',
            severity: 'ALERT',
            message: 'Cenário Ativado: Simulação de Falha de Sensor no Setor A (Tomates).',
            reason: 'Nó IoT desconectado. Verificando ativação do Safe Mode protetivo.'
          },
          ...logs
        ]
      });
    }
    set({
      scenarioPreset: scenario,
      traditionalSectors: get().sectors.map(s => ({ ...s, sensorStatus: 'ONLINE', valveState: 'IDLE' }))
    });
  },

  togglePresentationMode: () => {
    set(state => ({ isPresentationMode: !state.isPresentationMode }));
  },

  nextPresentationStep: () => {
    set(state => ({ presentationStep: Math.min(8, state.presentationStep + 1) }));
  },

  prevPresentationStep: () => {
    set(state => ({ presentationStep: Math.max(0, state.presentationStep - 1) }));
  },

  resetPresentation: () => {
    get().resetSimulation();
    set({ presentationStep: 0 });
  },

  clearLogs: () => set({ logs: [] })
}));
