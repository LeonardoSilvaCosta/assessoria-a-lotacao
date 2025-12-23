
export interface StudentRecord {
  nome: string;
  areaFormacao?: string;
  experienciaAfinidade?: string;
  orgaoAtuou?: string;
  atividadeOrgao?: string;
  empresaAtuou?: string;
  atividadeEmpresa?: string;
  atividadeDesejada?: string;
  motivacao?: string;
  idioma?: string;
}

export interface UnitRecord {
  nomeUnidade: string;
  descricaoAtuacao: string;
}

export interface WeightingCriteria {
  criterio: string;
  peso: number;
}

export interface Suggestion {
  unidade: string;
  pontos: number;
  motivo: string;
  explicacaoPontos: string;
  criterioPrincipal: 'areaFormacao' | 'experienciaAfinidade' | 'atividadeDesejada' | 'outros';
}

export interface AnalysisResult {
  nomeAluno: string;
  sugestoes: Suggestion[];
}

export interface ProcessingState {
  status: 'idle' | 'mapping' | 'loading' | 'completed' | 'error';
  message: string;
  details?: string;
}

export interface ColumnMapping {
  nome: string;
  areaFormacao: string;
  experienciaAfinidade: string;
  orgaoAtuou: string;
  atividadeOrgao: string;
  empresaAtuou: string;
  atividadeEmpresa: string;
  atividadeDesejada: string;
  motivacao: string;
  idioma: string;
}

export type FieldWeights = Record<keyof ColumnMapping, number>;
