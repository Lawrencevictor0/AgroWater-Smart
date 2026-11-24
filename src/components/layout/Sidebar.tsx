import { FileText, FlaskConical, History, LayoutDashboard, MapPin, Scale } from 'lucide-react';
import type { ActiveTab } from '../../types';

export type { ActiveTab } from '../../types';

const items = [
  { id: 'dashboard', label: 'Visão geral', icon: LayoutDashboard },
  { id: 'farm', label: 'Fazenda', icon: MapPin },
  { id: 'lab', label: 'Laboratório', icon: FlaskConical },
  { id: 'comparison', label: 'Comparação', icon: Scale },
  { id: 'history', label: 'Histórico', icon: History },
  { id: 'report', label: 'Relatório', icon: FileText },
] as const;

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  return (
    <aside className="hidden w-44 shrink-0 border-r border-scada-border bg-scada-surface p-3 md:block">
      <nav aria-label="Telas do simulador" className="space-y-1">
        {items.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" aria-current={activeTab === id ? 'page' : undefined}
            onClick={() => setActiveTab(id)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300 ${
              activeTab === id ? 'bg-emerald-950 font-semibold text-emerald-200' : 'text-slate-300 hover:bg-slate-800'
            }`}>
            <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />{label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
