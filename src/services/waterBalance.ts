import { Sector, WeatherState } from '../types';

/**
 * Reservatório radicular didático; ET0 é uma entrada em mm/dia.
 */
export function calculateSoilMoistureDelta(
  sector: Sector,
  weather: WeatherState,
  deltaMinutes: number,
  limitIrrigation = true
): {
  newMoisture: number;
  evapotranspirationMm: number;
  rainInfiltrationMm: number;
  irrigationMm: number;
  drainageMm: number;
  irrigationLiters: number;
  pumpMinutes: number;
} {
  const nonnegative = (v: number) => Number.isFinite(v) ? Math.max(0, v) : 0;
  const areaM2 = nonnegative(sector.areaHa) * 10000;
  const depth = Math.max(1, nonnegative(sector.rootDepthMm));
  const minutes = nonnegative(deltaMinutes);
  const capacity = Math.min(100, nonnegative(sector.targetFieldCapacity)) * depth / 100;
  const wilting = Math.min(capacity, nonnegative(sector.wiltingPoint ?? 12) * depth / 100);
  const threshold = Math.min(capacity, Math.max(wilting, nonnegative(sector.minMoistureThreshold) * depth / 100));
  const initial = Math.min(100, nonnegative(sector.soilMoisture)) * depth / 100;
  // Sem modelo de escoamento: considera-se toda a chuva infiltrável.
  const rainInfiltrationMm = nonnegative(weather.rainIntensity) * minutes / 60;
  const available = initial + rainInfiltrationMm;
  const stressFactor = threshold > wilting
    ? Math.min(1, Math.max(0, (available - wilting) / (threshold - wilting)))
    : Number(available > wilting);
  const evapotranspirationMm = Math.min(Math.max(0, available - wilting),
    nonnegative(weather.et0) * nonnegative(sector.kcFactor) * minutes / 1440 * stressFactor);
  const deficit = Math.max(0, capacity - available + evapotranspirationMm);
  const litersPerMinute = areaM2 > 0 && sector.valveState === 'IRRIGATING'
    ? nonnegative(sector.valveFlowRateLps) * 60 : 0;
  const pumpMinutes = litersPerMinute > 0
    ? Math.min(minutes, limitIrrigation ? deficit * areaM2 / litersPerMinute : minutes) : 0;
  const irrigationLiters = litersPerMinute * pumpMinutes;
  const irrigationMm = areaM2 > 0 ? irrigationLiters / areaM2 : 0;
  const storage = available + irrigationMm - evapotranspirationMm;
  const drainageMm = minutes > 0 ? Math.max(0, storage - capacity) : 0;
  return {
    newMoisture: (storage - drainageMm) / depth * 100,
    evapotranspirationMm,
    rainInfiltrationMm,
    irrigationMm,
    drainageMm,
    irrigationLiters,
    pumpMinutes
  };
}

/**
 * Cálculo de volume de água necessário para restabelecer a Capacidade de Campo (CC)
 */
export function calculateRequiredIrrigationVolume(
  currentMoisture: number,
  targetMoisture: number,
  areaHa: number,
  rootDepthMm: number
): number {
  if (![currentMoisture, targetMoisture, areaHa, rootDepthMm].every(Number.isFinite)) return 0;
  if (currentMoisture >= targetMoisture) return 0;
  const safeArea = Math.max(0, isNaN(areaHa) ? 0 : areaHa);
  const safeDepth = Math.max(0, isNaN(rootDepthMm) ? 0 : rootDepthMm);
  const deficitPct = (targetMoisture - currentMoisture) / 100;
  const deficitDepthMm = deficitPct * safeDepth;
  // 1 mm em 1 ha = 10.000 Litros
  return Math.round(deficitDepthMm * safeArea * 10000);
}
