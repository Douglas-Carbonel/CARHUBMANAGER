import { localOCRService, LicensePlateResult } from './local-ocr-service.js';

export class FreeOCRService {
  private apiKey: string;
  private baseUrl = 'https://api.ocr.space/parse/image';

  constructor() {
    this.apiKey = process.env.OCR_SPACE_API_KEY || '';
  }

  async readLicensePlate(base64Image: string): Promise<LicensePlateResult> {
    try {
      // Remove data URL prefix if present
      const base64Data = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');
      
      const formData = new FormData();
      formData.append('apikey', this.apiKey);
      formData.append('base64Image', `data:image/jpeg;base64,${base64Data}`);
      formData.append('language', 'eng');
      formData.append('isOverlayRequired', 'false');
      formData.append('detectOrientation', 'false');
      formData.append('scale', 'true');
      formData.append('OCREngine', '2');

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`OCR.Space API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.IsErroredOnProcessing && data.ParsedResults && data.ParsedResults.length > 0) {
        const extractedText = data.ParsedResults[0].ParsedText;
        
        // Extract potential license plate from text
        const plateMatch = this.extractPlateFromText(extractedText);
        
        if (plateMatch) {
          // Use local validation for the extracted plate
          return await localOCRService.readLicensePlateLocal(plateMatch);
        }
      }

      // If no plate found, return invalid result
      return {
        plate: '',
        confidence: 0,
        country: 'Brasil',
        isValid: false,
        format: 'Desconhecido'
      };

    } catch (error) {
      console.error('Error in Free OCR service:', error);
      throw new Error('Erro ao processar a imagem da placa');
    }
  }

  private extractPlateFromText(text: string): string | null {
    if (!text) return null;
    
    // Remove whitespace and normalize
    const cleanText = text.replace(/\s+/g, '').toUpperCase();
    
    // Brazilian license plate patterns
    const patterns = [
      /([A-Z]{3}[0-9]{4})/g,     // Old format: ABC1234
      /([A-Z]{3}[0-9][A-Z][0-9]{2})/g, // Mercosul: ABC1D23
      /([A-Z]{3}-?[0-9]{4})/g,   // With dash: ABC-1234
      /([A-Z]{3}-?[0-9][A-Z][0-9]{2})/g, // With dash Mercosul: ABC-1D23
    ];

    for (const pattern of patterns) {
      const matches = cleanText.match(pattern);
      if (matches && matches.length > 0) {
        return matches[0].replace('-', '');
      }
    }

    // Try to extract any sequence that looks like a plate
    const generalPattern = /([A-Z]{3}[A-Z0-9]{4})/g;
    const generalMatches = cleanText.match(generalPattern);
    if (generalMatches && generalMatches.length > 0) {
      return generalMatches[0];
    }

    return null;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }
}

export const freeOCRService = new FreeOCRService();