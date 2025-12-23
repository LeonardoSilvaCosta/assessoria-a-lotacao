
import { GoogleGenAI, Type } from "@google/genai";
import { StudentRecord, UnitRecord, WeightingCriteria, AnalysisResult } from "../types";

export const processAllocationAnalysis = async (
  students: StudentRecord[],
  units: UnitRecord[],
  weights: WeightingCriteria[],
  customInstruction: string,
  orderedFields: { key: string, label: string }[]
): Promise<AnalysisResult[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const priorityList = orderedFields.map((f, index) => `${index + 1}º (Maiura Prioridade): ${f.label}`).join('\n');

  const systemInstruction = `Você é um analista estratégico de RH da Polícia Militar do Pará (CIAP). Sua missão é realizar um cruzamento complexo para sugerir a melhor lotação de novos praças.

HIERARQUIA DE RELEVÂNCIA (DEFINIDA PELO USUÁRIO):
A ordem abaixo dita quais informações devem ter mais peso na sua decisão (o primeiro item é o mais importante):
${priorityList}

DIRETRIZES TÉCNICAS:
1. Gere 3 opções de lotação por aluno.
2. Atribua uma pontuação de 0 a 100 baseada no quanto o perfil do aluno adere à unidade, respeitando a hierarquia de relevância acima.
3. Para cada sugestão, preencha o campo 'explicacaoPontos' com um resumo técnico de como essa nota foi composta (Ex: "A Área de Formação (1ª prioridade) contribuiu com 70% da nota, somada à experiência prévia em órgão público").
4. Classifique o 'criterioPrincipal' determinante entre: 'areaFormacao', 'experienciaAfinidade' ou 'atividadeDesejada'. Use 'outros' se nenhum for predominante.

SAÍDA: JSON estrito de acordo com o esquema definido.`;

  const prompt = `
DADOS PARA PROCESSAMENTO:
Unidades: ${JSON.stringify(units)}
Alunos: ${JSON.stringify(students)}

Realize a análise detalhando a composição da pontuação de cada indicação.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              nomeAluno: { type: Type.STRING },
              sugestoes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    unidade: { type: Type.STRING },
                    pontos: { type: Type.NUMBER },
                    motivo: { type: Type.STRING },
                    explicacaoPontos: { type: Type.STRING },
                    criterioPrincipal: { 
                      type: Type.STRING,
                      description: "Deve ser 'areaFormacao', 'experienciaAfinidade', 'atividadeDesejada' ou 'outros'"
                    }
                  },
                  required: ["unidade", "pontos", "motivo", "explicacaoPontos", "criterioPrincipal"]
                }
              }
            },
            required: ["nomeAluno", "sugestoes"]
          }
        }
      }
    });

    if (!response.text) {
      throw new Error("A IA não retornou dados válidos.");
    }

    return JSON.parse(response.text);
  } catch (e: any) {
    console.error("Erro Gemini Service:", e);
    throw new Error(`Falha na IA: ${e.message || "Erro desconhecido"}`);
  }
};
