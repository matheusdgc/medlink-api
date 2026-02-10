import axios from "axios";

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

export class BulasService {
  private geminiApiKey: string;
  private geminiUrl: string;

  constructor() {
    this.geminiApiKey = process.env.GEMINI_API_KEY || "";
    this.geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`;
  }

  async consultarBulaIA(medicamento: string): Promise<BulaIA | null> {
    if (!this.geminiApiKey) {
      console.warn("GEMINI_API_KEY não configurada");
      return null;
    }

    const prompt = `Você é um assistente farmacêutico especializado em medicamentos brasileiros.

Forneça informações detalhadas sobre o medicamento "${medicamento}" no formato JSON abaixo.
Se o medicamento não existir ou você não tiver certeza, retorne null.

IMPORTANTE: 
- Use informações precisas e atualizadas
- Foque em medicamentos comercializados no Brasil
- Se for um nome comercial, identifique o princípio ativo
- Seja conciso mas completo

Retorne APENAS o JSON, sem markdown ou explicações:

{
  "medicamento": "Nome comercial ou genérico",
  "principioAtivo": "Princípio ativo",
  "classe": "Classe terapêutica",
  "indicacoes": "Para que serve o medicamento",
  "posologia": "Como usar, doses recomendadas para adultos e crianças se aplicável",
  "contraindicacoes": "Quando NÃO usar",
  "efeitosColaterais": "Efeitos colaterais comuns e raros importantes",
  "interacoes": "Interações medicamentosas importantes",
  "armazenamento": "Como armazenar",
  "advertencias": "Advertências importantes sobre uso"
}`;

    try {
      const response = await axios.post(
        `${this.geminiUrl}?key=${this.geminiApiKey}`,
        {
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_NONE",
            },
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_NONE",
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_NONE",
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_NONE",
            },
          ],
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );

      const textResponse =
        response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textResponse) {
        return null;
      }

      let cleanJson = textResponse
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      if (cleanJson.toLowerCase() === "null") {
        return null;
      }

      const bula = JSON.parse(cleanJson) as BulaIA;
      return bula;
    } catch (error: any) {
      console.error("Erro ao consultar Gemini:", error.message);
      if (error.response?.data) {
        console.error("Detalhes:", JSON.stringify(error.response.data));
      }
      return null;
    }
  }

  async sugerirMedicamentos(termo: string): Promise<string[]> {
    if (!this.geminiApiKey) {
      return [];
    }

    const prompt = `Liste até 5 medicamentos brasileiros (nomes comerciais ou genéricos) que começam com ou são similares a "${termo}".
Retorne APENAS um array JSON de strings, sem explicações:
["Medicamento 1", "Medicamento 2", ...]

Se não encontrar nenhum, retorne: []`;

    try {
      const response = await axios.post(
        `${this.geminiUrl}?key=${this.geminiApiKey}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 256,
          },
        },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 10000,
        }
      );

      const textResponse =
        response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textResponse) return [];

      const cleanJson = textResponse
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      return JSON.parse(cleanJson) as string[];
    } catch {
      return [];
    }
  }
}

export const bulasService = new BulasService();
