
import { GoogleGenAI, Type } from "@google/genai";
import { ApplicantInfo, Severity } from "../types";

// Always use named parameter for apiKey and rely solely on process.env.API_KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const EXTRACTION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    age: { type: Type.INTEGER },
    gender: { type: Type.STRING },
    occupation: { type: Type.STRING },
    income: { type: Type.NUMBER },
    smoking: { type: Type.BOOLEAN },
    alcohol: { type: Type.BOOLEAN },
    medicalConditions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          severity: { type: Type.STRING, description: "One of: Mild, Moderate, Severe, Critical" },
          indicators: { type: Type.STRING, description: "Specific clinical notes, e.g., 'BP 160/90', 'BMI 32', 'HbA1c 8.5%'" }
        },
        required: ["name", "severity"]
      }
    },
    selectedRiders: {
      type: Type.OBJECT,
      properties: {
        accidentCover: { type: Type.BOOLEAN },
        criticalIllness: { type: Type.BOOLEAN }
      }
    },
    missingInfo: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of required fields (name, age, occupation, medical history) that were NOT found in the input."
    }
  }
};

function cleanJson(text: string): string {
  if (!text) return "{}";
  let cleaned = text.trim();
  // Remove markdown code blocks if present
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json/, "").replace(/```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```/, "").replace(/```$/, "");
  }
  return cleaned.trim();
}

function normalizeData(data: any, originalContext: string = ""): { applicant: ApplicantInfo, missing: string[] } {
  // Regex Fallbacks for robust extraction if AI misses simple fields
  if (!data.age) {
    const ageMatch = originalContext.match(/Age:\s*(\d+)/i);
    if (ageMatch) data.age = parseInt(ageMatch[1], 10);
  }

  if (!data.occupation) {
    const occMatch = originalContext.match(/Occupation:\s*([^\n\r]+)/i);
    if (occMatch) data.occupation = occMatch[1].trim();
  }

  if (!data.name) {
    const nameMatch = originalContext.match(/Name:\s*([^\n\r]+)/i);
    if (nameMatch) data.name = nameMatch[1].trim();
  }

  const missing = data.missingInfo || [];
  
  if (!data.name) missing.push("Applicant Name");
  if (!data.age) missing.push("Applicant Age");
  if (!data.occupation) missing.push("Occupation");

  const applicant = {
    ...data,
    medicalConditions: (data.medicalConditions || []).map((c: any) => ({
      ...c,
      severity: Object.values(Severity).includes(c.severity as Severity) ? c.severity : Severity.MILD
    }))
  };

  return { applicant: applicant as ApplicantInfo, missing: Array.from(new Set(missing)) };
}

export async function extractUnderwritingData(
  proposalText: string, 
  medicalText: string,
  signal?: AbortSignal
): Promise<{ applicant: ApplicantInfo, missing: string[] }> {
  const fullContext = `Proposal: ${proposalText}\nMedical: ${medicalText}`;
  const prompt = `
    Extract life insurance underwriting data from the following documents.
    1. Proposal Extract: ${proposalText}
    2. Medical Report: ${medicalText}

    Rules for extraction:
    - Occupation: Extract the occupation explicitly stated in the text (usually under "Employment" or "Occupation"). You may normalize synonymous terms (e.g., "Software Engineer" -> "IT Professional"), but if the occupation is distinct, extract it exactly as written. DO NOT omit the occupation.
    - Medical Conditions must include severity.
    - Map "Level 1" to "Mild", "Level 2" to "Moderate", "Level 3" to "Severe", "Level 4" to "Critical".
    - Extract specific clinical indicators (e.g., "BP 160/100", "BMI 32", "HbA1c 8%") into the 'indicators' field.
    - IMPORTANT: Even if the text is simple, do not fail. Extract what is there.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: EXTRACTION_SCHEMA,
      },
    });

    return normalizeData(JSON.parse(cleanJson(response.text)), fullContext);
  } catch (error: any) {
    if (signal?.aborted || error.name === 'AbortError') {
      throw new Error('Aborted');
    }
    console.error("Gemini API Error:", error);
    throw error;
  }
}

export async function extractUnderwritingDataFromPDF(
  base64Pdf: string,
  signal?: AbortSignal
): Promise<{ applicant: ApplicantInfo, missing: string[] }> {
  const prompt = `
    Analyze the attached PDF document which contains a life insurance proposal and medical report.
    Extract all relevant underwriting variables.

    IMPORTANT: 
    - Verify if "Name", "Age", "Occupation", and "Medical conditions" are all present.
    - Occupation: Extract the occupation explicitly stated. Do not omit it.
    - Map "Level 1" to "Mild", "Level 2" to "Moderate", "Level 3" to "Severe", "Level 4" to "Critical".
    - Extract specific clinical indicators into the 'indicators' field.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: base64Pdf
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: EXTRACTION_SCHEMA,
      }
    });

    // Note: We cannot easily run regex on PDF content unless we extracted text first. 
    // We rely on AI for PDF.
    return normalizeData(JSON.parse(cleanJson(response.text)));
  } catch (error: any) {
    if (signal?.aborted || error.name === 'AbortError') {
      throw new Error('Aborted');
    }
    console.error("Gemini API Error:", error);
    throw error;
  }
}
