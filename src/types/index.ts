export type ValveState = 'IDLE' | 'IRRIGATING' | 'SUSPENDED_RAIN' | 'SAFE_MODE';
export type SensorStatus = 'ONLINE' | 'OFFLINE' | 'DEGRADED';
export type ControlMode = 'RULES' | 'ML_DEMO' | 'MANUAL';
export type WeatherCondition = 'SUNNY' | 'PARTLY_CLOUDY' | 'OVERCAST' | 'RAINY' | 'STORM';
export type ActiveTab = 'dashboard' | 'farm' | 'lab' | 'comparison' | 'history' | 'report';

export interface SectorMeasurement {
  timestamp: string;
  moisture: number;
  soilTemp: number;
  valveState: ValveState;
  rainMm: number;
}

export interface Sector {
  id: string;
  name: string;
  crop: string;
  areaHa: number;
  soilMoisture: number; // % (0-100)
  soilTemp: number; // °C
  minMoistureThreshold: number; // % (e.g. 30%)
  targetFieldCapacity: number; // % (e.g. 60%)
  maxMoistureThreshold: number; // % (e.g. 80%)
  valveState: ValveState;
  valveFlowRateLps: number; // Liters per second
  pumpPowerKw: number; // kW
  waterConsumedLiters: number;
  energyConsumedKwh: number;
  sensorStatus: SensorStatus;
  kcFactor: number; // Coeficiente da cultura
  rootDepthMm: number; // Profundidade radicular em mm
  wiltingPoint?: number; // % volumétrico
  pumpMinutes?: number;
  stressMinutes?: number;
  rainHoldMinutes?: number;
  telemetryPaused?: boolean;
  lastPacketMinute?: number;
  lastMeasuredMoisture?: number;
  history: SectorMeasurement[];
}

export interface WeatherState {
  airTemp: number; // °C
  airHumidity: number; // %
  rainProbability2h: number; // %
  rainIntensity: number; // mm/h
  et0: number; // mm/dia
  condition: WeatherCondition;
}

export interface TraditionalIrrigationState {
  waterConsumedLiters: number;
  energyConsumedKwh: number;
  pumpRunningMinutes: number;
  triggerCount: number;
  scheduleTimes: string[]; // e.g. ["06:00", "18:00"]
  durationMinutes: number;
}

export type EventSeverity = 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';

export interface LogEvent {
  id: string;
  timestamp: string;
  virtualTime: string;
  sectorId?: string;
  sectorName?: string;
  type: 
    | 'IRRIGATION_START' 
    | 'IRRIGATION_STOP' 
    | 'RAIN_SUSPEND' 
    | 'CRITICAL_MOISTURE' 
    | 'OPTIMAL_MOISTURE' 
    | 'SENSOR_FAULT' 
    | 'MANUAL_OVERRIDE' 
    | 'RAIN_START'
    | 'RAIN_STOP'
    | 'MODE_CHANGE';
  severity: EventSeverity;
  message: string;
  reason: string;
}

export interface SimulationClock {
  virtualTime: string; // ISO string
  speedMultiplier: number; // 1, 2, 5, 10, 30
  isPaused: boolean;
  tickCount: number;
  randomSeed: number;
}

export type ScenarioPreset = 
  | 'SECA_PROLONGADA' 
  | 'CHUVA_INESPERADA' 
  | 'IRRIGACAO_EXCESSIVA' 
  | 'OPERACAO_IDEAL' 
  | 'FALHA_SENSOR';
