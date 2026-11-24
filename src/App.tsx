import React, { useEffect, useRef } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, ActiveTab } from './components/layout/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { FarmView } from './components/farm/FarmView';
import { SimulationLabView } from './components/lab/SimulationLabView';
import { ComparisonView } from './components/comparison/ComparisonView';
import { HistoryView } from './components/history/HistoryView';
import { AcademicReportView } from './components/report/AcademicReportView';
import { PresentationWizard } from './components/presentation/PresentationWizard';
import { PhaseFooter } from './components/presentation/PhaseFooter';
import { useAgroStore } from './store/useAgroStore';

export const App: React.FC = () => {
  const tick = useAgroStore(state => state.tick);
  const isPresentationMode = useAgroStore(state => state.isPresentationMode);
  const activeTab = useAgroStore(state => state.activeTab);
  const setActiveTab = useAgroStore(state => state.setActiveTab);
  const main = useRef<HTMLElement>(null);

  useEffect(() => {
    if (main.current) main.current.scrollTop = 0;
  }, [activeTab]);

  // Ciclo Contínuo da Simulação Virtual
  useEffect(() => {
    if (isPresentationMode) return;
    // A cada 1.5s real, dispara 1 tick do modelo hídrico
    const interval = setInterval(() => {
      tick();
    }, 1500);

    return () => clearInterval(interval);
  }, [tick, isPresentationMode]);

  if (isPresentationMode) {
    return (
      <div className="flex h-dvh flex-col bg-scada-bg font-sans text-slate-100">
        <main className="min-h-0 flex-1 overflow-y-auto px-4"><PresentationWizard /></main>
        <PhaseFooter />
      </div>
    );
  }

  return (
    <div className="h-dvh bg-scada-bg text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
      
      {/* Top SCADA Navbar */}
      <Navbar />

      <div className="flex-1 min-h-0 flex overflow-hidden max-w-[1780px] w-full mx-auto">
        
        {/* Navigation Sidebar */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Main Content Area */}
        <main ref={main} className="min-w-0 flex-1 p-4 overflow-y-auto">
          <p className="mb-3 text-sm text-slate-300">Dados simulados · sem sensores ou atuadores conectados</p>
          <div className="md:hidden block mb-3">
            <label htmlFor="mobile-screen">Tela</label>
            <select id="mobile-screen" className="ml-2 max-w-full bg-slate-900 p-2" value={activeTab}
              onChange={event => setActiveTab(event.target.value as ActiveTab)}>
              <option value="dashboard">Painel</option><option value="farm">Fazenda</option>
              <option value="lab">Laboratório</option><option value="comparison">Comparação</option>
              <option value="history">Histórico</option><option value="report">Relatório</option>
            </select>
          </div>
          
          {/* Renderização das Telas do Sistema */}
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'farm' && <FarmView />}
          {activeTab === 'lab' && <SimulationLabView />}
          {activeTab === 'comparison' && <ComparisonView />}
          {activeTab === 'history' && <HistoryView />}
          {activeTab === 'report' && <AcademicReportView />}

        </main>

      </div>

      <PhaseFooter />

    </div>
  );
};
export default App;
