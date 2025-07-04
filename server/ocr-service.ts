import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface LicensePlateResult {
  plate: string;
  confidence: number;
  country: string;
  state?: string;
  isValid: boolean;
  format: string;
}

export class OCRService {
  async readLicensePlate(base64Image: string): Promise<LicensePlateResult> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Você é um especialista em reconhecimento de placas de veículos brasileiros. 
            Analise a imagem e extraia APENAS a placa do veículo. 
            Responda em JSON com este formato exato:
            {
              "plate": "ABC1234",
              "confidence": 0.95,
              "country": "Brazil",
              "state": "SP",
              "isValid": true,
              "format": "Mercosul"
            }
            
            Formatos brasileiros:
            - Antigo: ABC1234 (3 letras + 4 números)
            - Mercosul: ABC1D23 (3 letras + 1 número + 1 letra + 2 números)
            
            Se não conseguir identificar uma placa, retorne confidence: 0 e isValid: false.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Identifique a placa do veículo nesta imagem e retorne apenas o JSON solicitado."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ],
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 300,
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      // Validate and format the result
      return {
        plate: result.plate?.toUpperCase() || "",
        confidence: Math.max(0, Math.min(1, result.confidence || 0)),
        country: result.country || "Brazil",
        state: result.state || "",
        isValid: result.isValid || false,
        format: result.format || "Desconhecido"
      };
    } catch (error) {
      console.error("Error in OCR service:", error);
      throw new Error("Falha ao processar a imagem da placa: " + (error instanceof Error ? error.message : String(error)));
    }
  }

  async validateBrazilianPlate(plate: string): Promise<boolean> {
    if (!plate || typeof plate !== 'string') return false;
    
    const cleanPlate = plate.replace(/[^A-Z0-9]/g, '');
    
    // Formato antigo: ABC1234
    const oldFormat = /^[A-Z]{3}[0-9]{4}$/;
    
    // Formato Mercosul: ABC1D23
    const mercosulFormat = /^[A-Z]{3}[0-9]{1}[A-Z]{1}[0-9]{2}$/;
    
    return oldFormat.test(cleanPlate) || mercosulFormat.test(cleanPlate);
  }

  formatPlateDisplay(plate: string): string {
    if (!plate) return "";
    
    const cleanPlate = plate.replace(/[^A-Z0-9]/g, '');
    
    // Formato antigo: ABC-1234
    if (/^[A-Z]{3}[0-9]{4}$/.test(cleanPlate)) {
      return `${cleanPlate.slice(0, 3)}-${cleanPlate.slice(3)}`;
    }
    
    // Formato Mercosul: ABC1D23
    if (/^[A-Z]{3}[0-9]{1}[A-Z]{1}[0-9]{2}$/.test(cleanPlate)) {
      return `${cleanPlate.slice(0, 3)}${cleanPlate.slice(3, 4)}${cleanPlate.slice(4, 5)}${cleanPlate.slice(5)}`;
    }
    
    return cleanPlate;
  }
}

export const ocrService = new OCRService();