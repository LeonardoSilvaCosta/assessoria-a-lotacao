
import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { 
  FileSpreadsheet, 
  Upload, 
  ShieldCheck, 
  Loader2, 
  AlertCircle,
  TrendingUp,
  MapPin,
  Settings2,
  CheckCircle2,
  MessageSquareQuote,
  Zap,
  Layers,
  RefreshCw,
  Info,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Globe,
  FileText,
  Cpu,
  Settings,
  Filter,
  ArrowUp,
  ArrowDown,
  Scale,
  Download,
  BarChart3,
  Users,
  PieChart,
  ListChecks
} from 'lucide-react';
import { 
  StudentRecord, 
  UnitRecord, 
  WeightingCriteria, 
  AnalysisResult, 
  ProcessingState,
  ColumnMapping,
  Suggestion
} from './types';
import { processAllocationAnalysis } from './services/geminiService';

interface OrderedField {
  key: keyof ColumnMapping;
  label: string;
  icon: React.ReactNode;
  required?: boolean;
}

const App: React.FC = () => {
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheets, setSelectedSheets] = useState({
    responses: '',
    weights: '',
    units: ''
  });
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Partial<ColumnMapping>>({});
  const [activeTab, setActiveTab] = useState<'individual' | 'stats'>('individual');
  
  const [orderedFields, setOrderedFields] = useState<OrderedField[]>([
    { key: 'areaFormacao', label: 'Área de Formação', icon: <Info className="w-4 h-4" /> },
    { key: 'experienciaAfinidade', label: 'Experiência/Afinidade', icon: <TrendingUp className="w-4 h-4" /> },
    { key: 'atividadeDesejada', label: 'Lotação Desejada', icon: <MapPin className="w-4 h-4" /> },
    { key: 'motivacao', label: 'Motivação', icon: <MessageSquareQuote className="w-4 h-4" /> },
    { key: 'idioma', label: 'Idiomas', icon: <Globe className="w-4 h-4" /> },
    { key: 'orgaoAtuou', label: 'Órgão Público', icon: <ShieldCheck className="w-4 h-4" /> },
    { key: 'atividadeOrgao', label: 'Atividade no Órgão', icon: <Settings2 className="w-4 h-4" /> },
    { key: 'empresaAtuou', label: 'Empresa Privada', icon: <FileText className="w-4 h-4" /> },
    { key: 'atividadeEmpresa', label: 'Atividade na Empresa', icon: <Settings2 className="w-4 h-4" /> },
  ]);

  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [batchSize, setBatchSize] = useState<number>(15);
  const [processLimit, setProcessLimit] = useState<number | "all">("all");
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [processState, setProcessState] = useState<ProcessingState>({
    status: 'idle',
    message: ''
  });

  const resultsRef = useRef<HTMLDivElement>(null);

  const moveField = (index: number, direction: 'up' | 'down') => {
    const newFields = [...orderedFields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newFields.length) {
      [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
      setOrderedFields(newFields);
    }
  };

  useEffect(() => {
    if (workbook && selectedSheets.responses) {
      try {
        const sheet = workbook.Sheets[selectedSheets.responses];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 })[0] as any[];
        const stringHeaders = data?.map(h => h?.toString() || '') || [];
        setHeaders(stringHeaders);
        const autoMap: Partial<ColumnMapping> = {};
        const keywords: Record<keyof ColumnMapping, string[]> = {
          nome: ['nome', 'aluno', 'completo', 'identificação'],
          areaFormacao: ['formação', 'graduação', 'acadêmica', 'área'],
          idioma: ['idioma', 'língua', 'estrangeira', 'inglês', 'espanhol'],
          experienciaAfinidade: ['afinidade', 'experiência', 'habilidade'],
          orgaoAtuou: ['órgão', 'público', 'instituição'],
          atividadeOrgao: ['atividade que exercia', 'função no órgão'],
          empresaAtuou: ['empresa', 'privada', 'trabalhou'],
          atividadeEmpresa: ['atividade que exercia_1', 'cargo na empresa'],
          atividadeDesejada: ['gostaria', 'deseja', 'pretensão', 'lotado'],
          motivacao: ['motivação', 'por que', 'justificativa']
        };
        stringHeaders.forEach(h => {
          (Object.keys(keywords) as (keyof ColumnMapping)[]).forEach(key => {
            if (!autoMap[key] && keywords[key].some(kw => h.toLowerCase().includes(kw.toLowerCase()))) {
              autoMap[key] = h;
            }
          });
        });
        setMapping(autoMap);
      } catch (e) {
        setProcessState({ status: 'error', message: 'Falha ao ler cabeçalhos.', details: String(e) });
      }
    }
  }, [selectedSheets.responses, workbook]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessState({ status: 'loading', message: 'Processando arquivo Excel...' });
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        setWorkbook(wb);
        setSheetNames(wb.SheetNames);
        setSelectedSheets({
          responses: wb.SheetNames.find(n => n.toLowerCase().includes('respost')) || wb.SheetNames[0],
          weights: wb.SheetNames.find(n => n.toLowerCase().includes('peso')) || '',
          units: wb.SheetNames.find(n => n.toLowerCase().includes('unidad')) || (wb.SheetNames.length > 1 ? wb.SheetNames[wb.SheetNames.length - 1] : '')
        });
        setProcessState({ status: 'mapping', message: '' });
      } catch (err: any) {
        setProcessState({ status: 'error', message: 'Arquivo inválido ou corrompido.', details: err.message });
      }
    };
    reader.readAsBinaryString(file);
  };

  const executeAnalysis = async () => {
    if (!workbook || !selectedSheets.responses || !mapping.nome) {
      setProcessState({ status: 'error', message: 'Configuração Incompleta', details: 'Selecione a aba de respostas e o campo obrigatório "Nome Completo".' });
      return;
    }
    setProcessState({ status: 'loading', message: 'Extraindo dados da planilha...' });
    try {
      const sheetRespostas = workbook.Sheets[selectedSheets.responses];
      const dataRespostas: any[] = XLSX.utils.sheet_to_json(sheetRespostas);
      let mappedStudents: StudentRecord[] = dataRespostas.map((row): StudentRecord | null => {
        const nome = row[mapping.nome!]?.toString().trim();
        if (!nome) return null;
        return {
          nome,
          areaFormacao: mapping.areaFormacao ? (row[mapping.areaFormacao]?.toString().trim() || 'Não informado') : 'Não mapeado',
          idioma: mapping.idioma ? (row[mapping.idioma]?.toString().trim() || 'Não informado') : 'Não mapeado',
          experienciaAfinidade: mapping.experienciaAfinidade ? (row[mapping.experienciaAfinidade]?.toString().trim() || 'Não informado') : 'Não mapeado',
          orgaoAtuou: mapping.orgaoAtuou ? (row[mapping.orgaoAtuou]?.toString().trim() || 'Não informado') : 'Não mapeado',
          atividadeOrgao: mapping.atividadeOrgao ? (row[mapping.atividadeOrgao]?.toString().trim() || 'Não informado') : 'Não mapeado',
          empresaAtuou: mapping.empresaAtuou ? (row[mapping.empresaAtuou]?.toString().trim() || 'Não informado') : 'Não mapeado',
          atividadeEmpresa: mapping.atividadeEmpresa ? (row[mapping.atividadeEmpresa]?.toString().trim() || 'Não informado') : 'Não mapeado',
          atividadeDesejada: mapping.atividadeDesejada ? (row[mapping.atividadeDesejada]?.toString().trim() || 'Não informado') : 'Não mapeado',
          motivacao: mapping.motivacao ? (row[mapping.motivacao]?.toString().trim() || 'Não informado') : 'Não mapeado'
        };
      }).filter((s): s is StudentRecord => s !== null);
      if (processLimit !== "all") {
        mappedStudents = mappedStudents.slice(0, processLimit);
      }
      let mappedWeights: WeightingCriteria[] = [];
      if (selectedSheets.weights) {
        const sheetPesos = workbook.Sheets[selectedSheets.weights];
        const dataPesos: any[] = XLSX.utils.sheet_to_json(sheetPesos);
        mappedWeights = dataPesos.map(row => ({
          criterio: Object.values(row)[0]?.toString() || '',
          peso: Number(Object.values(row)[1]) || 0
        })).filter(w => w.criterio);
      }
      if (!selectedSheets.units) throw new Error("Aba de unidades não encontrada.");
      const sheetUnidades = workbook.Sheets[selectedSheets.units];
      const dataUnidades: any[] = XLSX.utils.sheet_to_json(sheetUnidades);
      const mappedUnits: UnitRecord[] = dataUnidades.map(row => ({
        nomeUnidade: Object.values(row)[0]?.toString() || 'Unidade s/ Nome',
        descricaoAtuacao: Object.values(row)[1]?.toString() || 'Sem descrição'
      })).filter(u => u.nomeUnidade !== 'Unidade s/ Nome');
      if (mappedStudents.length === 0) throw new Error("Nenhum dado de aluno encontrado.");
      if (mappedUnits.length === 0) throw new Error("Nenhuma unidade de destino encontrada.");
      const mappedOrderedFields = orderedFields
        .filter(f => !!mapping[f.key])
        .map(f => ({ key: f.key, label: f.label }));
      const currentBatchSize = Math.max(1, Math.min(50, batchSize));
      const totalStudents = mappedStudents.length;
      const allBatchResults: AnalysisResult[] = [];
      for (let i = 0; i < totalStudents; i += currentBatchSize) {
        const currentBatch = mappedStudents.slice(i, i + currentBatchSize);
        const batchNum = Math.floor(i / currentBatchSize) + 1;
        const totalBatches = Math.ceil(totalStudents / currentBatchSize);
        setProcessState({ status: 'loading', message: `Processando lote ${batchNum} de ${totalBatches}...` });
        try {
          const batchResponse = await processAllocationAnalysis(currentBatch, mappedUnits, mappedWeights, customPrompt, mappedOrderedFields);
          allBatchResults.push(...batchResponse);
        } catch (batchErr: any) {
          console.error(`Erro no lote ${batchNum}:`, batchErr);
          throw new Error(`Erro no lote ${batchNum}: ${batchErr.message}`);
        }
      }
      setResults(allBatchResults);
      setProcessState({ status: 'completed', message: 'Processamento Finalizado!' });
    } catch (err: any) {
      setProcessState({ status: 'error', message: 'Falha no Processamento', details: err.message || 'Erro inesperado.' });
    }
  };

  const exportResultsXLSX = () => {
    if (!results.length) return;
    const exportData = results.map(r => ({
      'Nome do Aluno': r.nomeAluno,
      'Opção 1': r.sugestoes[0]?.unidade,
      'Justificativa 1': r.sugestoes[0]?.motivo,
      'Explicação Pontos 1': r.sugestoes[0]?.explicacaoPontos,
      'Critério Principal 1': r.sugestoes[0]?.criterioPrincipal,
      'Opção 2': r.sugestoes[1]?.unidade,
      'Justificativa 2': r.sugestoes[1]?.motivo,
      'Explicação Pontos 2': r.sugestoes[1]?.explicacaoPontos,
      'Critério Principal 2': r.sugestoes[1]?.criterioPrincipal,
      'Opção 3': r.sugestoes[2]?.unidade,
      'Justificativa 3': r.sugestoes[2]?.motivo,
      'Explicação Pontos 3': r.sugestoes[2]?.explicacaoPontos,
      'Critério Principal 3': r.sugestoes[2]?.criterioPrincipal,
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Resultado Lotação");
    XLSX.writeFile(wb, "Resultado_CIAP_WEB.xlsx");
  };

  const downloadPDF = async () => {
    if (!resultsRef.current || results.length === 0) return;
    setProcessState({ status: 'loading', message: 'Gerando PDF...' });
    try {
      const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#f8fafc' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; 
      const pageHeight = 297; 
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }
      pdf.save(`Relatorio_CIAP_${new Date().getTime()}.pdf`);
      setProcessState({ status: 'completed', message: 'PDF gerado!' });
    } catch (err: any) {
      setProcessState({ status: 'error', message: 'Falha ao gerar PDF.', details: err.message });
    }
  };

  const statsSummary = useMemo(() => {
    const stats = {
      areaFormacao: {} as Record<string, number>,
      experienciaAfinidade: {} as Record<string, number>,
      atividadeDesejada: {} as Record<string, number>
    };
    let totalSuggestions = 0;
    const totalsPerCategory = {
      areaFormacao: 0,
      experienciaAfinidade: 0,
      atividadeDesejada: 0
    };
    results.forEach(res => {
      res.sugestoes.forEach(sug => {
        const crit = sug.criterioPrincipal;
        if (crit === 'areaFormacao' || crit === 'experienciaAfinidade' || crit === 'atividadeDesejada') {
          stats[crit][sug.unidade] = (stats[crit][sug.unidade] || 0) + 1;
          totalsPerCategory[crit]++;
          totalSuggestions++;
        }
      });
    });
    const formatStats = (category: 'areaFormacao' | 'experienciaAfinidade' | 'atividadeDesejada') => {
      const data = stats[category];
      const categoryTotal = totalsPerCategory[category];
      return Object.entries(data)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([unit, count]) => ({
          unit,
          count,
          percentage: categoryTotal > 0 ? ((count / categoryTotal) * 100).toFixed(1) : "0"
        }));
    };
    return {
      areaFormacao: formatStats('areaFormacao'),
      experienciaAfinidade: formatStats('experienciaAfinidade'),
      atividadeDesejada: formatStats('atividadeDesejada'),
      totalProcessed: results.length
    };
  }, [results]);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans text-slate-900">
      <header className="bg-[#0f172a] text-white shadow-2xl sticky top-0 z-50 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/20 ring-1 ring-blue-400">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight leading-none uppercase italic">CIAP <span className="text-blue-500">WEB</span></h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1.5">Assessoria à Lotação</p>
            </div>
          </div>
          <div className="flex gap-3">
            {workbook && (
              <button onClick={() => { setWorkbook(null); setResults([]); setProcessState({ status: 'idle', message: '' }); }} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-5 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all border border-slate-700">
                <RefreshCw className="w-3.5 h-3.5" /> REINICIAR
              </button>
            )}
            {results.length > 0 && (
              <>
                <button onClick={downloadPDF} className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-5 py-2.5 rounded-xl transition-all text-[10px] font-black tracking-widest shadow-lg shadow-red-500/20">
                  <FileText className="w-3.5 h-3.5" /> BAIXAR PDF
                </button>
                <button onClick={exportResultsXLSX} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl transition-all text-[10px] font-black tracking-widest shadow-lg shadow-emerald-500/20">
                  <Download className="w-3.5 h-3.5" /> EXPORTAR XLSX
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 md:p-10 space-y-12">
        {processState.status === 'idle' && (
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 p-20 flex flex-col items-center text-center animate-in fade-in zoom-in duration-500">
            <div className="w-32 h-32 bg-blue-50 text-blue-600 rounded-[2.5rem] flex items-center justify-center mb-10 shadow-inner ring-1 ring-blue-100 rotate-3">
              <FileSpreadsheet className="w-16 h-16" />
            </div>
            <h2 className="text-4xl font-black text-slate-900 mb-6 tracking-tighter">Sincronizador Estratégico</h2>
            <p className="text-slate-500 max-w-xl mb-12 text-lg font-medium leading-relaxed">
              Carregue a planilha de candidatos e defina a ordem de relevância dos parâmetros para a alocação inteligente.
            </p>
            <label className="group relative cursor-pointer">
              <div className="bg-blue-600 text-white px-16 py-8 rounded-[2rem] font-black text-2xl hover:bg-blue-700 transition-all flex items-center gap-5 shadow-2xl shadow-blue-500/20 active:scale-95 ring-1 ring-blue-400">
                <Upload className="w-8 h-8" />
                SELECIONAR PLANILHA
              </div>
              <input type="file" className="hidden" accept=".xlsx" onChange={handleFileUpload} />
            </label>
          </div>
        )}

        {processState.status === 'error' && (
          <div className="bg-white border-2 border-red-100 rounded-[2.5rem] shadow-2xl p-12 animate-in slide-in-from-top-4 duration-300">
            <div className="flex flex-col md:flex-row gap-10">
              <div className="bg-red-50 p-8 rounded-[2rem] text-red-600 shrink-0 self-start">
                <AlertCircle className="w-16 h-16" />
              </div>
              <div className="flex-1">
                <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tighter uppercase italic">{processState.message}</h3>
                <p className="text-slate-600 font-bold text-lg mb-8">Ocorreu um erro no processamento.</p>
                <button onClick={() => setShowErrorDetails(!showErrorDetails)} className="flex items-center gap-2 text-slate-400 hover:text-red-500 text-[10px] font-black uppercase tracking-[0.2em] transition-colors mb-6">
                  {showErrorDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {showErrorDetails ? 'Ocultar Detalhes' : 'Ver Detalhes Técnicos'}
                </button>
                {showErrorDetails && (
                  <div className="bg-slate-900 text-red-400 p-8 rounded-3xl font-mono text-sm border border-slate-800 shadow-inner mb-10 overflow-auto max-h-48">
                    {processState.details}
                  </div>
                )}
                <div className="flex flex-wrap gap-4">
                  <button onClick={() => setProcessState({ status: workbook ? 'mapping' : 'idle', message: '' })} className="bg-slate-900 text-white px-10 py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-black transition-all shadow-xl">
                    Tentar Novamente
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {(processState.status === 'mapping' || (processState.status === 'loading' && workbook && !results.length)) && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
            <div className="xl:col-span-8 space-y-10">
              <section className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 p-10 ring-1 ring-slate-100">
                <div className="flex items-center gap-5 mb-10 border-b border-slate-100 pb-8">
                  <div className="bg-blue-600 text-white w-12 h-12 rounded-[1.25rem] flex items-center justify-center font-black text-xl shadow-lg shadow-blue-500/20">1</div>
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">Seleção de Abas</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {[
                    { label: 'Alunos / Respostas', key: 'responses', icon: <Layers className="w-4 h-4" /> },
                    { label: 'Unidades de Destino', key: 'units', icon: <MapPin className="w-4 h-4" /> },
                    { label: 'Pesos e Critérios', key: 'weights', icon: <TrendingUp className="w-4 h-4" /> }
                  ].map((field) => (
                    <div key={field.key} className="space-y-3">
                      <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">{field.icon} {field.label}</label>
                      <select value={selectedSheets[field.key as keyof typeof selectedSheets]} onChange={(e) => setSelectedSheets(p => ({...p, [field.key]: e.target.value}))} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-700 focus:border-blue-500 focus:bg-white outline-none transition-all appearance-none shadow-sm cursor-pointer">
                        <option value="">-- Ignorar/Vazio --</option>
                        {sheetNames.map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 p-10 ring-1 ring-slate-100">
                <div className="flex items-center justify-between mb-10 border-b border-slate-100 pb-8">
                  <div className="flex items-center gap-5">
                    <div className="bg-blue-600 text-white w-12 h-12 rounded-[1.25rem] flex items-center justify-center font-black text-xl shadow-lg shadow-blue-500/20">2</div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">Mapeamento e Relevância</h2>
                  </div>
                  <div className="bg-blue-50 px-4 py-2 rounded-xl border border-blue-100 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-blue-600" />
                    <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest">A ordem define o peso</span>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="bg-blue-50/50 border-2 border-blue-200 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-6 shadow-sm ring-4 ring-blue-50/30">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-lg"><UserCheck className="w-5 h-5" /></div>
                    <div className="flex-1 space-y-1 text-center md:text-left">
                      <div className="flex items-center justify-center md:justify-start gap-3">
                        <p className="text-xs font-black text-blue-600 uppercase tracking-widest">Nome Completo *</p>
                        <span className="bg-blue-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase">Obrigatório</span>
                      </div>
                      <select value={mapping.nome || ''} onChange={(e) => setMapping(prev => ({ ...prev, nome: e.target.value }))} className="w-full bg-white border-2 border-blue-100 rounded-xl px-4 py-3 font-bold text-sm text-slate-700 focus:border-blue-500 outline-none transition-all cursor-pointer">
                        <option value="">-- Selecionar Identificador --</option>
                        {headers.map((h, i) => <option key={i} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div className="w-24 shrink-0 flex flex-col items-center"><span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Fixo</span></div>
                  </div>
                  <div className="space-y-4">
                    {orderedFields.map((field, index) => {
                      const isMapped = !!mapping[field.key];
                      return (
                        <div key={field.key} className={`group bg-white border-2 rounded-3xl p-6 transition-all duration-500 flex flex-col md:flex-row items-center gap-6 ${isMapped ? 'border-slate-200 shadow-lg scale-[1.01]' : 'border-slate-100 opacity-60 grayscale'}`}>
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${isMapped ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>{field.icon}</div>
                          <div className="flex-1 space-y-1 text-center md:text-left">
                            <div className="flex items-center justify-center md:justify-start gap-3">
                              <p className={`text-xs font-black uppercase tracking-widest ${isMapped ? 'text-slate-900' : 'text-slate-400'}`}>{field.label}</p>
                              {isMapped && <span className="bg-emerald-100 text-emerald-700 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">{index + 1}º Relevância</span>}
                            </div>
                            <select value={mapping[field.key] || ''} onChange={(e) => setMapping(prev => ({ ...prev, [field.key]: e.target.value }))} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold text-sm text-slate-700 focus:border-blue-500 outline-none transition-all cursor-pointer">
                              <option value="">-- Não utilizar este campo --</option>
                              {headers.map((h, i) => <option key={i} value={h}>{h}</option>)}
                            </select>
                          </div>
                          <div className="flex gap-2 shrink-0 no-print" data-html2canvas-ignore="true">
                            <button onClick={() => moveField(index, 'up')} disabled={index === 0} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-white transition-all disabled:opacity-20"><ArrowUp className="w-4 h-4" /></button>
                            <button onClick={() => moveField(index, 'down')} disabled={index === orderedFields.length - 1} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-white transition-all disabled:opacity-20"><ArrowDown className="w-4 h-4" /></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            </div>

            <aside className="xl:col-span-4 space-y-10">
              <section className="bg-[#0f172a] text-white rounded-[2.5rem] shadow-2xl p-10 flex flex-col h-full border border-slate-800 ring-1 ring-slate-700/50">
                <div className="flex items-center gap-4 mb-8 border-b border-slate-800 pb-6"><MessageSquareQuote className="w-7 h-7 text-emerald-500" /><h2 className="text-xl font-black uppercase tracking-tight italic">Configuração IA</h2></div>
                <div className="space-y-8 flex-1">
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1"><Settings className="w-3.5 h-3.5" /> Instruções Adicionais</label>
                    <textarea value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} placeholder="Ex: Priorize candidatos com fluência em inglês..." className="w-full p-6 bg-slate-900 border-2 border-slate-800 rounded-2xl text-sm font-bold focus:border-emerald-500 outline-none resize-none min-h-[120px] shadow-inner" />
                  </div>
                  <div className="space-y-6 bg-slate-900/50 p-6 rounded-3xl border border-slate-800">
                    <div className="space-y-4">
                      <label className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                        <div className="flex items-center gap-2"><Filter className="w-3.5 h-3.5 text-amber-500" /> Limite de Registros</div>
                        <span className="text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full">{processLimit === "all" ? "Todos" : `${processLimit} registros`}</span>
                      </label>
                      <input type="range" min="5" max="200" step="5" value={processLimit === "all" ? 200 : processLimit} onChange={(e) => { const val = parseInt(e.target.value); setProcessLimit(val >= 200 ? "all" : val); }} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-600" />
                    </div>
                  </div>
                </div>
                <button disabled={!mapping.nome || !selectedSheets.units || processState.status === 'loading'} onClick={executeAnalysis} className="mt-10 w-full flex items-center justify-center gap-4 py-8 rounded-[2rem] font-black text-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 uppercase shadow-2xl"><Zap className="w-8 h-8" /> EXECUTAR CRUZAMENTO</button>
              </section>
            </aside>
          </div>
        )}

        {processState.status === 'loading' && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xl z-[100] flex items-center justify-center p-8">
            <div className="bg-white p-16 rounded-[4rem] shadow-2xl max-w-lg w-full text-center space-y-10 animate-in zoom-in ring-1 ring-white/20">
              <div className="w-32 h-32 border-[8px] border-slate-50 border-t-blue-600 rounded-full animate-spin mx-auto shadow-inner" />
              <div className="space-y-4">
                <h3 className="text-3xl font-black text-slate-900 uppercase italic">Processamento Ativo</h3>
                <p className="text-slate-500 font-black uppercase text-xs tracking-[0.4em]">{processState.message}</p>
              </div>
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div ref={resultsRef} className="space-y-12 pb-32 animate-in fade-in slide-in-from-bottom-12 duration-1000 p-4 rounded-[4rem] bg-[#f8fafc]">
            <div className="bg-white p-12 rounded-[3rem] shadow-2xl border border-slate-200 ring-1 ring-slate-100">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-10 mb-12">
                <div className="flex items-center gap-8">
                  <div className="bg-emerald-100 text-emerald-700 p-7 rounded-[2.5rem] shadow-inner ring-1 ring-emerald-200"><CheckCircle2 className="w-12 h-12" /></div>
                  <div>
                    <h2 className="text-5xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">Análise de Lotação</h2>
                    <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.5em] mt-3">{results.length} INDIVÍDUOS ANALISADOS</p>
                  </div>
                </div>
                <div className="flex bg-slate-100 p-2 rounded-3xl self-center lg:self-auto no-print">
                  <button onClick={() => setActiveTab('individual')} className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'individual' ? 'bg-white shadow-lg text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}><Users className="w-4 h-4" /> Resultados Individuais</button>
                  <button onClick={() => setActiveTab('stats')} className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'stats' ? 'bg-white shadow-lg text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}><BarChart3 className="w-4 h-4" /> Painel Estatístico</button>
                </div>
              </div>

              {activeTab === 'individual' ? (
                <div className="grid grid-cols-1 gap-12">
                  {results.map((result, idx) => (
                    <div key={idx} className="bg-white rounded-[4rem] shadow-xl border border-slate-100 overflow-hidden hover:shadow-blue-500/5 transition-all duration-700 group break-inside-avoid">
                      <div className="p-12 border-b border-slate-50 bg-slate-50/50 flex flex-col md:flex-row items-center gap-10">
                        <div className="bg-[#0f172a] text-white w-28 h-28 rounded-[2.5rem] flex items-center justify-center font-black text-4xl uppercase italic">{result.nomeAluno.split(' ').filter(x => x.length > 2).map(n => n[0]).slice(0, 2).join('')}</div>
                        <div className="text-center md:text-left flex-1"><h3 className="font-black text-slate-900 text-4xl lg:text-5xl tracking-tighter uppercase italic">{result.nomeAluno}</h3></div>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
                        {result.sugestoes.map((sug, sIdx) => (
                          <div key={sIdx} className={`p-14 space-y-10 group/item transition-all hover:bg-slate-50/50 ${sIdx === 0 ? 'bg-amber-50/5' : ''}`}>
                            <div className="flex items-center justify-between">
                              <div className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest ${sug.criterioPrincipal === 'areaFormacao' ? 'bg-blue-100 text-blue-700' : sug.criterioPrincipal === 'experienciaAfinidade' ? 'bg-purple-100 text-purple-700' : sug.criterioPrincipal === 'atividadeDesejada' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                Por {sug.criterioPrincipal === 'areaFormacao' ? 'Formação' : sug.criterioPrincipal === 'experienciaAfinidade' ? 'Afinidade' : sug.criterioPrincipal === 'atividadeDesejada' ? 'Desejo' : 'Outros'}
                              </div>
                              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border-2 border-slate-50 font-black text-sm"><TrendingUp className="w-4 h-4 text-emerald-500" /> {sug.pontos} <span className="text-[10px] text-slate-300">PTS</span></div>
                            </div>
                            <div className="space-y-6">
                              <div className="flex items-start gap-5 text-slate-900 font-black text-2xl uppercase italic tracking-tighter leading-tight"><MapPin className="w-8 h-8 text-slate-200 group-hover/item:text-blue-500 shrink-0" />{sug.unidade}</div>
                              <div className="relative pl-8 py-2">
                                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-100 rounded-full" />
                                <p className="text-lg text-slate-500 font-bold italic tracking-tight">"{sug.motivo}"</p>
                              </div>
                              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-3">
                                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest"><ListChecks className="w-4 h-4 text-blue-500" /> Composição da Nota</div>
                                <p className="text-xs text-slate-500 font-medium leading-relaxed italic">{sug.explicacaoPontos}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-16 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="bg-slate-900 text-white rounded-[3rem] p-12 flex flex-col md:flex-row items-center justify-between gap-10 border border-slate-800 shadow-2xl">
                    <div className="flex items-center gap-6">
                      <div className="bg-blue-600 p-5 rounded-3xl shadow-lg shadow-blue-500/20"><PieChart className="w-10 h-10" /></div>
                      <div><h3 className="text-3xl font-black tracking-tighter uppercase italic">Visão Estatística Consolidada</h3><p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.4em] mt-2">Distribuição de Lotações por Eixo de Decisão</p></div>
                    </div>
                    <div className="bg-slate-800 px-8 py-5 rounded-3xl border border-slate-700 text-center"><span className="block text-3xl font-black text-blue-500">{results.length}</span><span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Analisado</span></div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    {Object.entries(statsSummary).filter(([k]) => k !== 'totalProcessed').map(([category, items]: [any, any]) => (
                      <div key={category} className={`bg-white border-2 rounded-[3rem] p-10 space-y-10 shadow-sm transition-all hover:shadow-xl ${category === 'areaFormacao' ? 'border-blue-50 hover:border-blue-100' : category === 'experienciaAfinidade' ? 'border-purple-50 hover:border-purple-100' : 'border-emerald-50 hover:border-emerald-100'}`}>
                        <div className={`flex items-center gap-4 border-b pb-6 ${category === 'areaFormacao' ? 'border-blue-50' : category === 'experienciaAfinidade' ? 'border-purple-50' : 'border-emerald-50'}`}>
                          <div className={`text-white p-4 rounded-2xl shadow-lg ${category === 'areaFormacao' ? 'bg-blue-600' : category === 'experienciaAfinidade' ? 'bg-purple-600' : 'bg-emerald-600'}`}>
                            {category === 'areaFormacao' ? <Info className="w-6 h-6" /> : category === 'experienciaAfinidade' ? <TrendingUp className="w-6 h-6" /> : <MapPin className="w-6 h-6" />}
                          </div>
                          <div>
                            <h4 className="font-black text-xl text-slate-900 tracking-tighter uppercase italic">{category === 'areaFormacao' ? 'Por Formação' : category === 'experienciaAfinidade' ? 'Por Afinidade' : 'Por Desejo'}</h4>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{category === 'areaFormacao' ? 'Aderência Acadêmica' : category === 'experienciaAfinidade' ? 'Experiência Profissional' : 'Expectativa do Praça'}</p>
                          </div>
                        </div>
                        <div className="space-y-12">
                          {items.map((item: any, i: number) => (
                            <div key={i} className="space-y-4">
                              <div className="flex flex-col gap-2">
                                <span className="text-base font-black text-slate-900 uppercase tracking-tighter leading-tight drop-shadow-sm">{item.unit}</span>
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.count} ind.</span>
                                  <span className={`text-sm font-black px-4 py-1 rounded-xl shadow-sm border ${category === 'areaFormacao' ? 'text-blue-700 bg-blue-50 border-blue-100' : category === 'experienciaAfinidade' ? 'text-purple-700 bg-purple-50 border-purple-100' : 'text-emerald-700 bg-emerald-50 border-emerald-100'}`}>{item.percentage}%</span>
                                </div>
                              </div>
                              <div className="h-4 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100 relative group/bar">
                                <div className={`h-full rounded-full transition-all duration-1000 ease-out shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] ${category === 'areaFormacao' ? 'bg-blue-600' : category === 'experienciaAfinidade' ? 'bg-purple-600' : 'bg-emerald-600'}`} style={{ width: `${item.percentage}%` }} />
                              </div>
                            </div>
                          ))}
                          {items.length === 0 && <p className="text-center text-slate-300 font-bold italic py-10">Dados insuficientes</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-20 mt-auto">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-slate-900 font-black uppercase tracking-[1em] text-xs mb-6">CIAP WEB - Assessoria à Lotação</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
