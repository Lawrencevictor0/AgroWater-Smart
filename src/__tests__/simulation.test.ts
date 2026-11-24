import { describe, it, expect, beforeEach } from 'vitest';
import { calculateSoilMoistureDelta, calculateRequiredIrrigationVolume } from '../services/waterBalance';
import { predictIrrigationKNN } from '../services/mlClassifier';
import { useAgroStore } from '../store/useAgroStore';
import { sanitizeCsvValue } from '../components/history/HistoryView';
import { Sector, WeatherState } from '../types';

describe('Balanço Hídrico & Física de Solos', () => {
  const mockSector: Sector = {
    id: 'test-sector',
    name: 'Setor Teste',
    crop: 'Soja',
    areaHa: 10,
    soilMoisture: 30.0,
    soilTemp: 28.0,
    minMoistureThreshold: 35.0,
    targetFieldCapacity: 60.0,
    maxMoistureThreshold: 85.0,
    valveState: 'IDLE',
    valveFlowRateLps: 5.0,
    pumpPowerKw: 5.5,
    waterConsumedLiters: 0,
    energyConsumedKwh: 0,
    sensorStatus: 'ONLINE',
    kcFactor: 1.15,
    rootDepthMm: 350,
    history: []
  };

  const dryWeather: WeatherState = {
    airTemp: 32.0,
    airHumidity: 30,
    rainProbability2h: 10,
    rainIntensity: 0.0,
    et0: 6.0,
    condition: 'SUNNY'
  };

  const rainyWeather: WeatherState = {
    airTemp: 22.0,
    airHumidity: 90,
    rainProbability2h: 95,
    rainIntensity: 20.0, // 20 mm/h
    et0: 2.0,
    condition: 'STORM'
  };

  it('deve reduzir a umidade do solo na ausência de água e presença de evapotranspiração', () => {
    const result = calculateSoilMoistureDelta(mockSector, dryWeather, 60); // 60 minutos
    expect(result.newMoisture).toBeLessThan(mockSector.soilMoisture);
    expect(result.evapotranspirationMm).toBeGreaterThan(0);
    expect(result.rainInfiltrationMm).toBe(0);
  });

  it('deve elevar a umidade do solo quando a válvula de irrigação estiver ativa', () => {
    const irrigatingSector: Sector = { ...mockSector, valveState: 'IRRIGATING' };
    const result = calculateSoilMoistureDelta(irrigatingSector, { ...dryWeather, et0: 0 }, 30);
    expect(result.newMoisture).toBeGreaterThan(mockSector.soilMoisture);
    expect(result.irrigationMm).toBeGreaterThan(0);
  });

  it('deve elevar a umidade do solo sob precipitação de chuva', () => {
    const result = calculateSoilMoistureDelta(mockSector, rainyWeather, 30);
    expect(result.newMoisture).toBeGreaterThan(mockSector.soilMoisture);
    expect(result.rainInfiltrationMm).toBeGreaterThan(0);
  });

  it('registra drenagem acima da capacidade e não adiciona água artificialmente ao solo seco', () => {
    // Teste com solo saturado
    const saturatedSector: Sector = { ...mockSector, soilMoisture: 95.0, valveState: 'IRRIGATING' };
    const resultSaturated = calculateSoilMoistureDelta(saturatedSector, rainyWeather, 120);
    expect(resultSaturated.newMoisture).toBeCloseTo(60);
    expect(resultSaturated.drainageMm).toBeGreaterThan(0);

    // Teste com seca extrema prolongada
    const veryDrySector: Sector = { ...mockSector, soilMoisture: 6.0, valveState: 'IDLE' };
    const resultDry = calculateSoilMoistureDelta(veryDrySector, dryWeather, 500);
    expect(resultDry.newMoisture).toBeCloseTo(6);
  });

  it('converte 270 L em 0,0027 mm sobre 10 ha', () => {
    const step = calculateSoilMoistureDelta(
      { ...mockSector, valveFlowRateLps: 4.5, valveState: 'IRRIGATING' }, { ...dryWeather, et0: 0 }, 1);
    expect(step.irrigationLiters).toBe(270);
    expect(step.irrigationMm).toBeCloseTo(0.0027, 10);
    expect((step.newMoisture - mockSector.soilMoisture) * mockSector.rootDepthMm / 100).toBeCloseTo(step.irrigationMm, 10);
  });

  it('conserva 6 mm em uma raiz de 300 mm sem perdas', () => {
    const step = calculateSoilMoistureDelta({ ...mockSector, rootDepthMm: 300 }, { ...dryWeather, et0: 0, rainIntensity: 6 }, 60);
    expect(step.newMoisture).toBeCloseTo(32, 10);
    expect(step.drainageMm).toBe(0);
  });

  it('limita a aplicação ao déficit no último minuto', () => {
    const sector = { ...mockSector, areaHa: 1, rootDepthMm: 100, soilMoisture: 59.99, valveState: 'IRRIGATING' as const };
    const step = calculateSoilMoistureDelta(sector, { ...dryWeather, et0: 0 }, 1);
    expect(step.newMoisture).toBeCloseTo(60, 10);
    expect(step.irrigationLiters).toBeCloseTo(100, 8);
    expect(step.pumpMinutes).toBeLessThan(1);
  });

  it('deve calcular corretamente o volume estrito necessário para atingir a Capacidade de Campo', () => {
    const requiredVolume = calculateRequiredIrrigationVolume(30.0, 60.0, 10, 350);
    // Déficit: 30% de 350 mm = 105 mm em 10 ha = 105 * 10 * 10000 = 10.500.000 Litros
    expect(requiredVolume).toBe(10500000);
  });
});

describe('Módulo Demonstrativo Machine Learning (KNN)', () => {
  it('deve prever IRRIGATE quando o solo estiver seco sem previsão de chuva', () => {
    const prediction = predictIrrigationKNN(20.0, 30.0, 10.0, 35.0, 6.0);
    expect(prediction.decision).toBe('IRRIGATE');
    expect(prediction.confidencePct).toBeGreaterThanOrEqual(60);
  });

  it('deve prever SUSPEND_RAIN (preempção) quando o solo estiver seco MAS com chuva iminente', () => {
    const prediction = predictIrrigationKNN(22.0, 26.0, 85.0, 80.0, 2.5);
    expect(prediction.decision).toBe('SUSPEND_RAIN');
    expect(prediction.confidencePct).toBeGreaterThanOrEqual(60);
  });

  it('deve prever STANDBY quando a umidade estiver em capacidade de campo', () => {
    const prediction = predictIrrigationKNN(62.0, 24.0, 20.0, 50.0, 4.0);
    expect(prediction.decision).toBe('STANDBY');
    expect(prediction.confidencePct).toBeGreaterThanOrEqual(60);
  });
});

describe('Estado da Simulação e Lógica de Transição (Zustand Store)', () => {
  beforeEach(() => {
    useAgroStore.getState().resetSimulation();
  });

  it('deve inicializar com 4 setores agronômicos configurados', () => {
    const sectors = useAgroStore.getState().sectors;
    expect(sectors.length).toBe(4);
    expect(sectors[0].crop).toBe('Tomates');
    expect(sectors[1].crop).toBe('Milho');
    expect(sectors[2].crop).toBe('Alface');
    expect(sectors[3].crop).toBe('Feijão');
  });

  it.each([[64, 'IRRIGATING'], [65, 'SUSPENDED_RAIN'], [66, 'SUSPENDED_RAIN']])(
    'aplica o limiar de previsão em %s%%', (probability, expected) => {
      const store = useAgroStore.getState();
      store.setWeather({ rainProbability2h: probability, rainIntensity: 0 });
      store.tick();
      expect(useAgroStore.getState().sectors[0].valveState).toBe(expected);
    }
  );

  it('retoma a irrigação quando a previsão vence sem chover', () => {
    const store = useAgroStore.getState();
    store.setWeather({ rainProbability2h: 65, rainIntensity: 0 });
    store.setSpeedMultiplier(10);
    for (let i = 0; i < 12; i++) store.tick();
    expect(useAgroStore.getState().sectors[0].waterConsumedLiters).toBe(0);
    store.tick();
    expect(useAgroStore.getState().sectors[0].waterConsumedLiters).toBeGreaterThan(0);
  });

  it('trava manual imediatamente, mas o solo continua evoluindo fisicamente', () => {
    const store = useAgroStore.getState();
    store.setControlMode('MANUAL');
    store.setSensorStatus('sector-a', 'DEGRADED');
    store.manualToggleValve('sector-a');
    expect(useAgroStore.getState().sectors[0].valveState).toBe('SAFE_MODE');
    store.setWeather({ rainIntensity: 18.5 });
    store.tick();
    const sector = useAgroStore.getState().sectors[0];
    expect(sector.waterConsumedLiters).toBe(0);
    expect(sector.soilMoisture).toBeGreaterThan(25);
    store.setSensorStatus('sector-a', 'ONLINE');
    expect(useAgroStore.getState().sectors[0].valveState).toBe('IDLE');
  });

  it('fecha após cinco minutos sem pacote e só sai do modo seguro com nova leitura', () => {
    const store = useAgroStore.getState();
    store.tick();
    store.setTelemetryPaused('sector-a', true);
    const read = () => useAgroStore.getState().sectors[0];
    for (let i = 0; i < 4; i++) store.tick();
    expect(read().valveState).toBe('IRRIGATING');
    const irrigated = read().waterConsumedLiters;
    store.tick();
    expect(read().valveState).toBe('SAFE_MODE');
    expect(read().waterConsumedLiters).toBe(irrigated);
    expect(read().lastPacketMinute).toBe(1);
    store.setControlMode('MANUAL');
    store.manualToggleValve('sector-a');
    expect(read().valveState).toBe('SAFE_MODE');
    store.setTelemetryPaused('sector-a', false);
    store.tick();
    expect(read().valveState).toBe('IDLE');
    expect(read().lastPacketMinute).toBe(7);
  });

  it('mantém física equivalente em 1× e 10× e contabiliza as duas janelas', () => {
    const run = (speed: number) => {
      const store = useAgroStore.getState();
      store.resetSimulation();
      store.setSpeedMultiplier(speed);
      for (let i = 0; i < 1440 / speed; i++) store.tick();
      const { sectors, traditional, traditionalSectors } = useAgroStore.getState();
      return { sectors, traditional, traditionalSectors };
    };
    const slow = run(1);
    expect(run(10)).toEqual(slow);
    expect(slow.traditional.waterConsumedLiters).toBe(72000);
    expect(slow.traditional.energyConsumedKwh).toBeCloseTo(21.5, 10);
    expect(slow.traditionalSectors[0].soilMoisture).not.toBe(25);
  });

  it('fecha uma válvula aberta se chega previsão bloqueante entre limiar e alvo', () => {
    const store = useAgroStore.getState();
    store.tick();
    expect(useAgroStore.getState().sectors[0].valveState).toBe('IRRIGATING');
    store.setSectorMoisture('sector-a', 33);
    store.setWeather({ rainProbability2h: 65 });
    store.tick();
    expect(useAgroStore.getState().sectors[0].valveState).toBe('SUSPENDED_RAIN');
  });

  it('aplica chuva observada de surpresa aos dois solos sem inventar previsão', () => {
    const store = useAgroStore.getState();
    store.applyScenario('CHUVA_INESPERADA');
    expect(useAgroStore.getState().weather.rainProbability2h).toBe(20);
    store.tick();
    const { traditionalSectors, sectors } = useAgroStore.getState();
    expect(traditionalSectors[0].soilMoisture).toBeGreaterThan(26);
    expect(sectors[0].soilMoisture).toBeGreaterThan(26);
  });

  it('rejeita entradas inválidas e restaura relógio, modo e solos após pausa', () => {
    const store = useAgroStore.getState();
    store.setWeather({ rainProbability2h: Infinity });
    store.setSectorMoisture('sector-a', NaN);
    store.setSectorThresholds('sector-a', 35, 30);
    expect(useAgroStore.getState().weather.rainProbability2h).toBe(20);
    expect(useAgroStore.getState().sectors[0].soilMoisture).toBe(25);
    expect(useAgroStore.getState().sectors[0].targetFieldCapacity).toBe(34);
    store.setControlMode('MANUAL');
    store.togglePause();
    store.tick();
    expect(useAgroStore.getState().clock.tickCount).toBe(0);
    store.resetSimulation();
    const reset = useAgroStore.getState();
    expect(reset.controlMode).toBe('RULES');
    expect(reset.clock.isPaused).toBe(false);
    expect(reset.traditionalSectors).toEqual(reset.sectors);
  });

  it('deve acionar SAFE_MODE quando um sensor estiver OFFLINE', () => {
    const store = useAgroStore.getState();
    store.setSensorStatus('sector-a', 'OFFLINE');
    store.tick();

    const sectorA = useAgroStore.getState().sectors.find(s => s.id === 'sector-a');
    expect(sectorA?.valveState).toBe('SAFE_MODE');
  });

  it('deve permitir alternar entre os 3 modos de controle (RULES, ML_DEMO, MANUAL)', () => {
    const store = useAgroStore.getState();
    store.setControlMode('ML_DEMO');
    expect(useAgroStore.getState().controlMode).toBe('ML_DEMO');

    store.setControlMode('MANUAL');
    expect(useAgroStore.getState().controlMode).toBe('MANUAL');

    store.setControlMode('RULES');
    expect(useAgroStore.getState().controlMode).toBe('RULES');
  });

  it('deve sincronizar a aba ativa ao executar ações do Modo Apresentação', () => {
    const store = useAgroStore.getState();
    expect(store.activeTab).toBe('dashboard');

    store.setActiveTab('farm');
    expect(useAgroStore.getState().activeTab).toBe('farm');

    store.setActiveTab('comparison');
    expect(useAgroStore.getState().activeTab).toBe('comparison');
  });
});

describe('Segurança & Blindagem (Pilar 1 - Sanitização CWE-1236)', () => {
  it('deve neutralizar caracteres perigosos de injeção de fórmulas CSV (=, +, -, @)', () => {
    expect(sanitizeCsvValue('=1+1')).toBe(`"'=1+1"`);
    expect(sanitizeCsvValue('+cmd|/c calc')).toBe(`"'+cmd|/c calc"`);
    expect(sanitizeCsvValue('-100')).toBe(`"'-100"`);
    expect(sanitizeCsvValue('@SUM(A1:A10)')).toBe(`"'@SUM(A1:A10)"`);
  });

  it('deve manter texto seguro sem prefixo desnecessário e escapar aspas duplas', () => {
    expect(sanitizeCsvValue('Válvula [IRRIGATING]')).toBe(`"Válvula [IRRIGATING]"`);
    expect(sanitizeCsvValue('Sensor "Setor A"')).toBe(`"Sensor ""Setor A"""`);
    expect(sanitizeCsvValue(null)).toBe(`""`);
  });
});

describe('Resiliência Hidrológica & Tratamento Defensivo (Pilar 2 & 3)', () => {
  const zeroSector: Sector = {
    id: 'zero-test',
    name: 'Setor Zero',
    crop: 'Milho',
    areaHa: 0, // Área zero (potencial divisão por zero)
    soilMoisture: 40.0,
    soilTemp: 25.0,
    minMoistureThreshold: 35.0,
    targetFieldCapacity: 65.0,
    maxMoistureThreshold: 85.0,
    valveState: 'IRRIGATING',
    valveFlowRateLps: 5.0,
    pumpPowerKw: 5.5,
    waterConsumedLiters: 0,
    energyConsumedKwh: 0,
    sensorStatus: 'ONLINE',
    kcFactor: 1.2,
    rootDepthMm: 0, // Profundidade zero (potencial divisão por zero)
    history: []
  };

  const weirdWeather: WeatherState = {
    airTemp: NaN,
    airHumidity: NaN,
    rainProbability2h: 0,
    rainIntensity: NaN,
    et0: NaN,
    condition: 'SUNNY'
  };

  it('não deve lançar exceção nem produzir NaN mesmo com área e profundidade zeradas ou clima corrompido', () => {
    const result = calculateSoilMoistureDelta(zeroSector, weirdWeather, 10);
    expect(isNaN(result.newMoisture)).toBe(false);
    expect(result.newMoisture).toBeGreaterThanOrEqual(5.0);
    expect(result.newMoisture).toBeLessThanOrEqual(95.0);
  });

  it('deve retornar volume zero com segurança se umidade atual for maior que o alvo ou parâmetros forem inválidos', () => {
    expect(calculateRequiredIrrigationVolume(60, 50, 10, 300)).toBe(0);
    expect(calculateRequiredIrrigationVolume(NaN, 50, 10, 300)).toBe(0);
  });
});
