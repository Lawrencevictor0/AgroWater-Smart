import type { ControlMode, Sector } from '../types';

export function sectorSituation(sector: Sector, mode: ControlMode) {
  switch (sector.valveState) {
    case 'IRRIGATING':
      return mode === 'RULES' ? 'Repondo água no solo' : 'Válvula aberta';
    case 'SUSPENDED_RAIN':
      return 'Rega adiada devido à previsão';
    case 'SAFE_MODE':
      return 'Sem leitura válida do sensor';
    case 'IDLE':
      if (mode === 'MANUAL') return 'Aguardando comando manual';
      if (mode === 'ML_DEMO') return 'Sem comando de rega do KNN';
      if (sector.soilMoisture >= sector.minMoistureThreshold) return 'Umidade no limiar ou acima dele';
      return 'Válvula fechada nesta etapa';
  }
}
