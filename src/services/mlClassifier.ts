/**
 * CLASSIFICADOR MACHINE LEARNING DEMONSTRATIVO (KNN - K-Nearest Neighbors)
 * 
 * AVISO OBRIGATÓRIO:
 * Este módulo é experimental e demonstrativo, treinado sobre matriz sintética
 * gerada por regras de referência. Não possui validação agronômica de campo.
 */

export const ML_MODEL_DISCLAIMER = 
  "MÓDULO EXPERIMENTAL DEMONSTRATIVO: Classificador KNN (k=5) treinado com dados sintéticos gerados computacionalmente. Desenvolvido para fins didáticos e acadêmicos, NÃO validado agronomicamente para uso em lavouras reais.";

export type MLDecision = 'IRRIGATE' | 'SUSPEND_RAIN' | 'STANDBY';

export interface MLPredictionResult {
  decision: MLDecision;
  confidencePct: number;
  explanation: string;
  nearestNeighborsSummary: string;
  featuresUsed: {
    normalizedMoisture: number;
    normalizedTemp: number;
    normalizedRainProb: number;
    normalizedAirHumidity: number;
    normalizedEt0: number;
  };
}

interface TrainingSample {
  features: [number, number, number, number, number]; // [moisture, temp, rainProb, humidity, et0] normalizados
  label: MLDecision;
  originalDescription: string;
}

// Normalização: min-max
function normalize(val: number, min: number, max: number): number {
  return Math.max(0, Math.min(1, (val - min) / (max - min)));
}

// 19 exemplos sintéticos, sem representatividade agronômica demonstrada.
const SYNTHETIC_DATASET: TrainingSample[] = [
  // Casos de Seca sem chuva -> IRRIGATE
  { features: [0.15, 0.70, 0.05, 0.30, 0.75], label: 'IRRIGATE', originalDescription: 'Solo muito seco (18%), alta temp, sem chuva' },
  { features: [0.20, 0.65, 0.10, 0.35, 0.65], label: 'IRRIGATE', originalDescription: 'Solo seco (22%), 31°C, céu limpo' },
  { features: [0.25, 0.50, 0.20, 0.40, 0.55], label: 'IRRIGATE', originalDescription: 'Déficit hídrico (27%), chuva remota (20%)' },
  { features: [0.28, 0.55, 0.30, 0.45, 0.60], label: 'IRRIGATE', originalDescription: 'Umidade abaixo do limiar (30%), chuva baixa' },
  { features: [0.32, 0.60, 0.40, 0.50, 0.62], label: 'IRRIGATE', originalDescription: 'Limiar crítico (33%), chuva moderada-baixa (40%)' },
  { features: [0.10, 0.85, 0.15, 0.25, 0.85], label: 'IRRIGATE', originalDescription: 'Seca extrema (12%), estresse térmico' },
  { features: [0.22, 0.45, 0.25, 0.40, 0.50], label: 'IRRIGATE', originalDescription: 'Solo moderadamente seco (24%), ET0 regular' },

  // Casos de Solo Seco COM Chuva Iminente -> SUSPEND_RAIN
  { features: [0.20, 0.50, 0.75, 0.80, 0.30], label: 'SUSPEND_RAIN', originalDescription: 'Solo seco (22%), mas 75% chance de chuva em 2h' },
  { features: [0.25, 0.45, 0.85, 0.85, 0.25], label: 'SUSPEND_RAIN', originalDescription: 'Solo seco (26%), 85% de chuva e alta umidade do ar' },
  { features: [0.15, 0.40, 0.90, 0.90, 0.20], label: 'SUSPEND_RAIN', originalDescription: 'Seca severa (18%), tempestade prevista (90%)' },
  { features: [0.30, 0.40, 0.70, 0.75, 0.35], label: 'SUSPEND_RAIN', originalDescription: 'Limiar 32%, precipitação iminente em 70%' },
  { features: [0.28, 0.35, 0.95, 0.92, 0.15], label: 'SUSPEND_RAIN', originalDescription: 'Frente fria com 95% chuva, solo seco' },
  { features: [0.18, 0.48, 0.68, 0.70, 0.40], label: 'SUSPEND_RAIN', originalDescription: 'Preempção: solo 20%, chuva 68%' },

  // Casos de Solo em Capacidade de Campo / Ideal -> STANDBY
  { features: [0.55, 0.45, 0.20, 0.55, 0.45], label: 'STANDBY', originalDescription: 'Solo ótimo (55%), sem necessidade hídrica' },
  { features: [0.60, 0.40, 0.30, 0.60, 0.40], label: 'STANDBY', originalDescription: 'Capacidade de campo (60%), reserva ideal' },
  { features: [0.65, 0.50, 0.50, 0.50, 0.50], label: 'STANDBY', originalDescription: 'Solo bem umedecido (65%)' },
  { features: [0.75, 0.30, 0.80, 0.80, 0.30], label: 'STANDBY', originalDescription: 'Solo úmido (75%) e chuva prevista' },
  { features: [0.85, 0.25, 0.90, 0.95, 0.20], label: 'STANDBY', originalDescription: 'Solo saturado (85%), risco de sobre-irrigação' },
  { features: [0.45, 0.40, 0.15, 0.50, 0.45], label: 'STANDBY', originalDescription: 'Solo em 47% (acima do limiar de 35%)' }
];

// Distância euclidiana com pesos agronômicos
function weightedEuclideanDistance(a: number[], b: number[]): number {
  // Pesos: [umidade: 3.0, temp: 1.0, chuva: 3.5, umidade_ar: 1.2, et0: 1.3]
  const weights = [3.0, 1.0, 3.5, 1.2, 1.3];
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += weights[i] * diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Predição KNN Demonstrativa para Tomada de Decisão
 */
export function predictIrrigationKNN(
  soilMoisture: number,
  soilTemp: number,
  rainProb2h: number,
  airHumidity: number,
  et0: number,
  k = 5
): MLPredictionResult {
  const normFeatures: [number, number, number, number, number] = [
    normalize(soilMoisture, 0, 100),
    normalize(soilTemp, 10, 45),
    normalize(rainProb2h, 0, 100),
    normalize(airHumidity, 10, 100),
    normalize(et0, 1, 10)
  ];

  // Calcular distâncias até todos os pontos de treino
  const distances = SYNTHETIC_DATASET.map(sample => ({
    sample,
    distance: weightedEuclideanDistance(normFeatures, sample.features)
  }));

  // Ordenar e pegar os k mais próximos
  distances.sort((a, b) => a.distance - b.distance);
  const kNearest = distances.slice(0, k);

  // Votação por maioria
  const votes: Record<MLDecision, number> = {
    IRRIGATE: 0,
    SUSPEND_RAIN: 0,
    STANDBY: 0
  };

  for (const item of kNearest) {
    votes[item.sample.label] += 1;
  }

  let bestDecision: MLDecision = 'STANDBY';
  let maxVotes = -1;

  const decisionKeys: MLDecision[] = ['IRRIGATE', 'SUSPEND_RAIN', 'STANDBY'];
  for (const decision of decisionKeys) {
    if (votes[decision] > maxVotes) {
      maxVotes = votes[decision];
      bestDecision = decision;
    }
  }

  const confidencePct = Math.round((maxVotes / k) * 100);

  // Explicação gerada pelo modelo
  let explanation = '';
  if (bestDecision === 'SUSPEND_RAIN') {
    explanation = `O classificador KNN identificou que, embora o solo requeira reposição (${soilMoisture.toFixed(1)}%), a probabilidade de precipitação de ${rainProb2h.toFixed(0)}% é análoga aos padrões de preempção natural, recomendando a suspensão da bomba para economizar recursos.`;
  } else if (bestDecision === 'IRRIGATE') {
    explanation = `O classificador detectou déficit hídrico crítico (${soilMoisture.toFixed(1)}%) sem expectativa pluviométrica significativa (${rainProb2h.toFixed(0)}%), votando majoritariamente pelo acionamento imediato da válvula de irrigação.`;
  } else {
    explanation = `O teor de umidade atual (${soilMoisture.toFixed(1)}%) encontra-se na faixa ótima de armazenamento radicular. O modelo classifica o estado como Standby seguro.`;
  }

  const nearestNeighborsSummary = kNearest
    .map((n, i) => `#${i + 1} [${n.sample.label} - dist: ${n.distance.toFixed(3)}]: ${n.sample.originalDescription}`)
    .join(' | ');

  return {
    decision: bestDecision,
    confidencePct,
    explanation,
    nearestNeighborsSummary,
    featuresUsed: {
      normalizedMoisture: normFeatures[0],
      normalizedTemp: normFeatures[1],
      normalizedRainProb: normFeatures[2],
      normalizedAirHumidity: normFeatures[3],
      normalizedEt0: normFeatures[4]
    }
  };
}
