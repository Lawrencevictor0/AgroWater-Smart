import { useAgroStore } from '../store/useAgroStore';

export const demoPhases = [
  { title: 'Seca: os quatro setores irrigam', detail: 'Os quatro solos começam abaixo do limiar. A previsão baixa não impede a rega.' },
  { title: 'Previsão de chuva: rega suspensa', detail: 'Os solos continuam secos. A previsão de 70% adia a rega; ainda não caiu chuva.' },
  { title: 'Falha no tomate: modo seguro', detail: 'Só o Setor A ficou cinco minutos virtuais sem leitura. Ele fechou; os outros três continuam irrigando.' },
  { title: 'Leitura recuperada: tomate volta a irrigar', detail: 'O Setor A recebeu uma nova leitura. Como o solo ainda está seco, ele voltou a irrigar.' },
] as const;

export function applyDemoPhase(phase: number) {
  if (!Number.isInteger(phase) || !demoPhases[phase]) return;
  const { applyScenario, advanceMinute, setWeather, setTelemetryPaused, togglePause } = useAgroStore.getState();
  applyScenario('SECA_PROLONGADA');
  if (phase === 1) setWeather({ rainProbability2h: 70, rainIntensity: 0 });
  advanceMinute();
  if (phase >= 2) {
    setTelemetryPaused('sector-a', true);
    for (let minute = 0; minute < 5; minute++) advanceMinute();
    if (phase === 3) {
      setTelemetryPaused('sector-a', false);
      advanceMinute();
    }
  } else {
    for (let minute = 1; minute < 10; minute++) advanceMinute();
  }
  togglePause();
  useAgroStore.setState({ demoPhase: phase });
}
