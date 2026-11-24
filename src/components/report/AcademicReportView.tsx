import React, { useState } from 'react';
import { FileText, Copy, Printer, Check, BookOpen, Download } from 'lucide-react';

export const AcademicReportView: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const copyText = () => {
    const el = document.getElementById('academic-paper-content');
    if (!el) return;
    navigator.clipboard.writeText(el.innerText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const printDocument = () => {
    window.print();
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      
      {/* HEADER DO RELATÓRIO */}
      <div className="bg-scada-card border border-scada-border rounded-xl p-4 shadow-md flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            Estrutura Documental para Relatório Universitário ABNT
          </h2>
          <p className="text-xs text-slate-400">
            Documentação técnico-científica completa dividida nos 4 pilares acadêmicos obrigatórios
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyText}
            className="px-3 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-600/60 text-emerald-300 text-xs font-mono font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copiado para Área de Transferência!' : 'Copiar Texto Integral'}
          </button>

          <button
            onClick={printDocument}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir / Salvar PDF
          </button>
        </div>
      </div>

      {/* CORPO DO ARTIGO ACADÊMICO */}
      <article id="academic-paper-content" className="bg-scada-surface border border-scada-border rounded-2xl p-8 shadow-xl text-slate-200 text-sm leading-relaxed space-y-6">
        
        <header className="text-center border-b border-scada-border pb-6 space-y-2">
          <span className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold block">
            Relatório de Engenharia e Inovação Tecnológica
          </span>
          <h1 className="text-2xl font-bold text-slate-100 font-display">
            AGROWATER SMART: PROTÓTIPO COMPUTACIONAL DE IRRIGAÇÃO DE PRECISÃO
          </h1>
          <p className="text-xs text-slate-400">
            Estudo de Simulação Computacional e Análise Comparativa de Eficiência Hídrica e Energética
          </p>
        </header>

        {/* PARTE 1 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-emerald-400 border-l-4 border-emerald-500 pl-3">
            PARTE 1 — CARACTERIZAÇÃO DO PROBLEMA E DIAGNÓSTICO AGRONÔMICO
          </h2>
          <p className="text-justify indent-8 text-slate-300">
            Este estudo compara um temporizador fixo, escolhido como referência de malha aberta, com um controle que considera o estado simulado do solo. O estudo não estima a prevalência do uso de temporizadores.
          </p>
          <p className="text-justify indent-8 text-slate-300">
            Rega em excesso pode elevar o bombeamento e a drenagem profunda. A aplicação não calcula efeitos sobre qualidade da água, produtividade ou disponibilidade hídrica na bacia.
          </p>
        </section>

        {/* PARTE 2 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-emerald-400 border-l-4 border-emerald-500 pl-3">
            PARTE 2 — FUNDAMENTAÇÃO TEÓRICA E MARCO REGULATÓRIO
          </h2>
          <p className="text-justify indent-8 text-slate-300">
            A fundamentação teórica deste projeto estrutura-se nos preceitos da <strong>Política Nacional de Recursos Hídricos (Lei Federal nº 9.433/1997)</strong>, a qual define a água como bem público dotado de valor econômico e preconiza a gestão descentralizada e sustentável dos recursos, alinhando-se também ao Objetivo de Desenvolvimento Sustentável da ONU (ODS 6 — Água Potável e Saneamento).
          </p>
          <p className="text-justify indent-8 text-slate-300">
            Os parâmetros de umidade são hipóteses por setor, não calibrações. ET₀ é fornecida pelo cenário; o reservatório didático aplica ET potencial de Kc × ET₀, reduzida durante estresse, e considera infiltrável toda a chuva informada.
          </p>
        </section>

        {/* PARTE 3 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-emerald-400 border-l-4 border-emerald-500 pl-3">
            PARTE 3 — PROPOSTA TECNOLÓGICA E ARQUITETURA DE SIMULAÇÃO
          </h2>
          <p className="text-justify indent-8 text-slate-300">
            O ecossistema <strong>AgroWater Smart</strong> foi desenvolvido em arquitetura web moderna orientada a componentes, utilizando <strong>React, TypeScript, Zustand e Tailwind CSS</strong>, modelando 4 setores agrícolas independentes (Tomates, Milho, Alface e Feijão) sem dependência de hardware físico.
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4 text-xs text-slate-300 font-sans">
            <li><strong>Balanço discreto:</strong> Δθ = (I + P − ETc − DP) / Zr. As duas estratégias usam o mesmo passo físico de um minuto.</li>
            <li><strong>Controle por regras:</strong> o limiar didático de 65% pode adiar a irrigação até expirar a previsão ou até o solo atingir o limite de segurança.</li>
            <li><strong>KNN demonstrativo:</strong> modo alternativo com k=5 e 19 amostras sintéticas; votos não são probabilidades calibradas.</li>
            <li><strong>Mecanismo de Tolerância a Falhas (Safe Mode):</strong> Caso o sensor do setor entre em falha ou desconexão, a válvula é desarmada por precaução.</li>
          </ul>
        </section>

        {/* PARTE 4 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-emerald-400 border-l-4 border-emerald-500 pl-3">
            PARTE 4 — AVALIAÇÃO DE IMPACTO, BENEFÍCIOS E LIMITAÇÕES
          </h2>
          <p className="text-justify indent-8 text-slate-300">
            Os resultados variam com as condições do cenário. A aba Comparação apresenta os consumos acumulados, a umidade final e o tempo sob o limiar de manejo em cada estratégia.
          </p>
          <p className="text-justify indent-8 text-slate-300">
            <strong>Limitações e Trabalhos Futuros:</strong> Sendo um projeto de simulação computacional acadêmica, os resultados obtidos não substituem ensaios agronômicos em campo físico. Trabalhos futuros contemplam a validação em bancada com sensores capacitivos reais e gateways LoRaWAN físicos, além da calibração laboratorial de curvas de retenção para solos latossolos e arenosos.
          </p>
        </section>

        <footer className="pt-4 border-t border-scada-border text-xs text-slate-500 font-mono">
          <p className="font-bold text-slate-400 mb-1">Diretrizes de Referenciação Acadêmica (Inserir Fontes Verificadas no Relatório Final):</p>
          <p>• [2] ALLEN, R. G. et al. Crop evapotranspiration: Guidelines for computing crop water requirements. FAO Paper 56. Roma, 1998.</p>
          <p>• [3] BRASIL. Lei Federal nº 9.433, de 8 de janeiro de 1997 (Política Nacional de Recursos Hídricos).</p>
        </footer>

      </article>

    </div>
  );
};
