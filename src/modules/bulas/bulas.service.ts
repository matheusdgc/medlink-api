import axios from "axios";
import { ServiceUnavailableError } from "../../types/index.js";

interface BulaIA {
  medicamento: string;
  principioAtivo: string;
  classe: string;
  indicacoes: string;
  posologia: string;
  contraindicacoes: string;
  efeitosColaterais: string;
  interacoes: string;
  armazenamento: string;
  advertencias: string;
}

const CAMPOS_OBRIGATORIOS: (keyof BulaIA)[] = [
  "principioAtivo",
  "classe",
  "indicacoes",
  "posologia",
  "contraindicacoes",
  "efeitosColaterais",
  "interacoes",
  "armazenamento",
  "advertencias",
];

export class BulasService {
  private geminiApiKey: string;
  private geminiUrl: string;

  constructor() {
    this.geminiApiKey = process.env.GEMINI_API_KEY || "";
    this.geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;
  }

  async consultarBulaIA(medicamento: string): Promise<BulaIA | null> {
    if (!this.geminiApiKey) {
      console.warn("GEMINI_API_KEY nao configurada");
      return null;
    }

    const prompt = `Assistente farmaceutico brasileiro. Responda em portugues do Brasil, linguagem simples.

Medicamento: "${medicamento}"

Regras:
- Nome comercial? Identifique o principio ativo e use ambos
- Nao existe ou nao e medicamento valido? Retorne {"medicamento": null}
- Seja BREVE: cada campo no maximo 2 frases ou lista curta de itens
- Nao repita informacao entre campos
- Foque no essencial para o paciente

JSON de saida (todos os campos obrigatorios):
{
  "medicamento": "nome principal (ou null)",
  "principioAtivo": "substancia ativa e concentracao mais comum. Ex: Dipirona Monoidratada 500mg",
  "classe": "classe terapeutica resumida. Ex: Analgésico e antipiretico",
  "indicacoes": "lista curta: dor, febre, etc. Max 4 itens",
  "posologia": "dose adulto padrao, intervalo, via. 1-2 frases. Ex: 500mg a cada 6h, oral, max 4x/dia",
  "contraindicacoes": "lista curta dos principais. Max 4 itens",
  "efeitosColaterais": "frequentes: lista curta. Graves: max 2 itens",
  "interacoes": "max 3 interacoes mais importantes com consequencia resumida",
  "armazenamento": "temperatura e cuidados essenciais. 1 frase",
  "advertencias": "max 2 alertas criticos mais relevantes para o paciente"
}`;

    try {
      const response = await axios.post(
        `${this.geminiUrl}?key=${this.geminiApiKey}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 3072,
            responseMimeType: "application/json",
          },
          safetySettings: [
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          ],
        },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 20000,
        }
      );

      const textResponse = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textResponse) {
        console.warn("Gemini retornou resposta vazia. Candidatos:", JSON.stringify(response.data?.candidates));
        return null;
      }

      // Remove delimitadores de markdown caso o modelo os inclua (```json ... ```)
      const jsonLimpo = textResponse
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "");

      let bula: BulaIA;
      try {
        bula = JSON.parse(jsonLimpo) as BulaIA;
      } catch (parseError) {
        console.error("Falha ao interpretar JSON da resposta Gemini. Resposta recebida:", textResponse.slice(0, 500));
        return null;
      }

      if (!bula.medicamento) return null;

      for (const campo of CAMPOS_OBRIGATORIOS) {
        if (!bula[campo]) {
          bula[campo] = "Informacao nao disponivel para este medicamento.";
        }
      }

      return bula;
    } catch (error: any) {
      const status = error.response?.status;
      const details = error.response?.data;

      // Cota esgotada ou rate limit da API do Gemini
      if (status === 429) {
        console.warn("Gemini API: cota esgotada (429). Verifique o plano em https://aistudio.google.com");
        throw new ServiceUnavailableError(
          "O serviço de busca por IA está temporariamente indisponível por excesso de uso. Tente novamente em alguns minutos."
        );
      }

      console.error("Erro ao consultar Gemini:", error.message);
      if (details) {
        console.error("Detalhes:", JSON.stringify(details));
      }
      return null;
    }
  }

  async sugerirMedicamentos(termo: string): Promise<string[]> {
    if (!this.geminiApiKey) return [];

    const prompt = `Liste ate 6 medicamentos brasileiros (nomes comerciais ou genericos) que correspondem ou sao similares a "${termo}".
Responda em portugues do Brasil.
Inclua tanto nomes comerciais quanto genericos quando relevante.
Retorne APENAS um array JSON de strings, sem explicacoes:
["Medicamento 1", "Medicamento 2", ...]
Se nao encontrar nenhum medicamento valido, retorne: []`;

    try {
      const response = await axios.post(
        `${this.geminiUrl}?key=${this.geminiApiKey}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 256,
            responseMimeType: "application/json",
          },
        },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 10000,
        }
      );

      const textResponse = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textResponse) return [];

      const jsonLimpo = textResponse
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "");

      return JSON.parse(jsonLimpo) as string[];
    } catch {
      // Sugestoes sao opcionais — qualquer erro retorna lista vazia sem interromper o usuario
      return [];
    }
  }
}

export const bulasService = new BulasService();
