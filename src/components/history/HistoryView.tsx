import React, { useState } from 'react';
import { 
  History, 
  Download, 
  Printer, 
  Filter, 
  Trash2, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Search,
  Droplets
} from 'lucide-react';
import { useAgroStore } from '../../store/useAgroStore';
import { EventSeverity } from '../../types';

/**
 * Higienização estrita contra CSV Formula Injection (CWE-1236)
 * Previne execução indevida em Excel / LibreOffice caso o texto inicie com =, +, -, @, \t ou \r
 */
export function sanitizeCsvValue(val: string | number | undefined | null): string {
  let str = String(val ?? '');
  if (/^[=\+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

export const HistoryView: React.FC = () => {
  const { logs, sectors, clearLogs, traditional } = useAgroStore();

  const [selectedSectorFilter, setSelectedSectorFilter] = useState<string>('ALL');
  const [selectedSeverityFilter, setSelectedSeverityFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Filtragem dos eventos
  const filteredLogs = logs.filter(log => {
    const matchesSector = selectedSectorFilter === 'ALL' || log.sectorId === selectedSectorFilter;
    const matchesSeverity = selectedSeverityFilter === 'ALL' || log.severity === selectedSeverityFilter;
    const matchesSearch = searchTerm === '' || 
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.reason.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSector && matchesSeverity && matchesSearch;
  });

  // Exportação CSV segura
  const exportToCSV = () => {
    if (logs.length === 0) {
      alert('Nenhum registro para exportar.');
      return;
    }

    const headers = ['ID', 'DataHoraVirtual', 'Setor', 'TipoEvento', 'Severidade', 'Mensagem', 'Justificativa'];
    const rows = logs.map(l => [
      sanitizeCsvValue(l.id),
      sanitizeCsvValue(l.virtualTime),
      sanitizeCsvValue(l.sectorName || 'GLOBAL'),
      sanitizeCsvValue(l.type),
      sanitizeCsvValue(l.severity),
      sanitizeCsvValue(l.message),
      sanitizeCsvValue(l.reason)
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `agrowater_historico_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Impressão do Relatório de Auditoria (Layout de Impressão)
  const printReport = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      
      {/* HEADER DE HISTÓRICO & EXPORTAÇÕES */}
      <div className="bg-scada-card border border-scada-border rounded-xl p-4 shadow-md flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-400" />
            Histórico Operacional, Alertas & Auditoria de Decisões
          </h2>
          <p className="text-xs text-slate-400">
            Registro cronológico auditável de todos os eventos da simulação e preempções da IA
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportToCSV}
            className="px-3 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-600/60 text-emerald-300 text-xs font-mono font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar CSV
          </button>

          <button
            onClick={printReport}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir Relatório
          </button>

          <button
            onClick={clearLogs}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-500 hover:text-rose-400 border border-slate-800 transition-colors"
            title="Limpar Histórico"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* BARRA DE FILTROS */}
      <div className="bg-scada-surface border border-scada-border rounded-xl p-3 shadow-md grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        
        {/* Busca por texto */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
          <input 
            type="text"
            placeholder="Buscar por mensagem ou justificativa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-scada-border rounded-lg pl-8 pr-3 py-1.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 text-xs font-mono"
          />
        </div>

        {/* Filtro por Setor */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-mono">Setor:</span>
          <select 
            value={selectedSectorFilter}
            onChange={(e) => setSelectedSectorFilter(e.target.value)}
            className="w-full bg-slate-900 border border-scada-border rounded-lg px-2.5 py-1.5 text-slate-200 font-mono text-xs focus:outline-none"
          >
            <option value="ALL">Todos os Setores</option>
            {sectors.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.crop})</option>
            ))}
          </select>
        </div>

        {/* Filtro por Severidade */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-mono">Severidade:</span>
          <select 
            value={selectedSeverityFilter}
            onChange={(e) => setSelectedSeverityFilter(e.target.value)}
            className="w-full bg-slate-900 border border-scada-border rounded-lg px-2.5 py-1.5 text-slate-200 font-mono text-xs focus:outline-none"
          >
            <option value="ALL">Todas as Severidades</option>
            <option value="INFO">INFO (Operação Normal)</option>
            <option value="SUCCESS">SUCCESS (Irrigação / Eficiência)</option>
            <option value="WARNING">WARNING (Preempção / Chuva)</option>
            <option value="ALERT">ALERT (Falha / Risco Crítico)</option>
          </select>
        </div>

      </div>

      {/* TABELA DE REGISTROS DE EVENTOS */}
      <div className="bg-scada-card border border-scada-border rounded-xl shadow-md overflow-hidden">
        <div className="max-h-[520px] overflow-y-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead className="bg-slate-900/90 text-slate-400 sticky top-0 border-b border-scada-border z-10">
              <tr>
                <th className="py-2.5 px-3">Hora Virtual</th>
                <th className="py-2.5 px-3">Setor</th>
                <th className="py-2.5 px-3">Classificação</th>
                <th className="py-2.5 px-3">Evento & Ação</th>
                <th className="py-2.5 px-3">Justificativa da IA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 font-sans">
                    Nenhum registro encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  let badgeClass = 'bg-slate-800 text-slate-300 border-slate-700';
                  if (log.severity === 'SUCCESS') badgeClass = 'bg-emerald-950 text-emerald-300 border-emerald-700 font-bold';
                  if (log.severity === 'WARNING') badgeClass = 'bg-amber-950 text-amber-300 border-amber-600 font-bold';
                  if (log.severity === 'ALERT') badgeClass = 'bg-rose-950 text-rose-300 border-rose-600 font-bold';

                  return (
                    <tr key={log.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                        [{log.virtualTime}]
                      </td>
                      <td className="py-2.5 px-3 text-slate-200 font-bold whitespace-nowrap">
                        {log.sectorName || 'GLOBAL'}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] border ${badgeClass}`}>
                          {log.severity}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-100 font-sans">
                        {log.message}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 font-sans">
                        {log.reason}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
