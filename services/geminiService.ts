import { GoogleGenAI, Type } from "@google/genai";
import { ApplicantInfo } from "../types";

// Always use named parameter for apiKey and rely solely on process.env.API_KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Define your model cascade from fastest/cheapest to most capable fallback
const MODEL_CASCADE = [
  'gemini-3-flash-preview',
  'gemini-2.5-pro',
  'gemini-2.5-flash',
];

const EXTRACTION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    age: { type: Type.INTEGER },
    gender: { type: Type.STRING },
    occupation: { type: Type.STRING },
    income: { type: Type.NUMBER },
    sumAssured: { type: Type.NUMBER },
    bmi: { type: Type.NUMBER },
    familyHistory: { type: Type.STRING, description: "e.g., 'Both Surviving > age 65', 'Only one surviving > age 65', 'Both died < age 65'" },
    habits: {
      type: Type.ARRAY,
      description: "List of personal habits like Smoking, Alcoholic drinks, or Tobacco.",
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, description: "e.g., 'Smoking', 'Alcoholic drinks', 'Tobacco'" },
          level: { type: Type.STRING, description: "Must be exactly one of: 'Occasionally', 'Regular (moderate)', 'Regular (high dose)'" }
        },
        required: ["type", "level"]
      }
    },
    medicalConditions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          severity: { type: Type.INTEGER, description: "Must be an integer: 1, 2, 3, or 4" },
          indicators: { type: Type.STRING, description: "Specific clinical notes, e.g., 'BP 160/90', 'HbA1c 8.5%'" }
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
      description: "List of required fields (name, age, occupation, income, sum assured, bmi, medical history) that were NOT found in the input."
    }
  }
};

function cleanJson(text: string): string {
  if (!text) return "{}";
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json/, "").replace(/```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```/, "").replace(/```$/, "");
  }
  return cleaned.trim();
}

function normalizeData(data: any, originalContext: string = ""): { applicant: ApplicantInfo, missing: string[] } {
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
  if (!data.income) missing.push("Income");
  if (!data.sumAssured) missing.push("Sum Assured");
  if (!data.bmi) missing.push("BMI");

  const applicant = {
    ...data,
    averageIncome: data.averageIncome || data.income || 0,
    habits: data.habits || [],
    familyHistory: data.familyHistory || "Not Disclosed",
    medicalConditions: (data.medicalConditions || []).map((c: any) => ({
      ...c,
      severity: [1, 2, 3, 4].includes(c.severity) ? c.severity : 1 
    }))
  };

  return { applicant: applicant as ApplicantInfo, missing: Array.from(new Set(missing)) };
}

/**
 * Helper function to attempt generation across multiple models in case of limits/failures
 */
async function generateWithFallback(
  contents: any, 
  config: any, 
  signal?: AbortSignal
) {
  let lastError: any;

  for (const model of MODEL_CASCADE) {
    if (signal?.aborted) throw new Error('Aborted');

    try {
      console.log(`[AI] Attempting extraction with: ${model}`);
      const response = await ai.models.generateContent({
        model,
        contents,
        config,
      });
      return response;
    } catch (error: any) {
      lastError = error;
      console.warn(`[AI] Model ${model} failed:`, error.message);
      
      // If the user cancelled the request, don't try the next model
      if (signal?.aborted || error.name === 'AbortError') {
        throw new Error('Aborted');
      }

      // If it's a structural 400 error (bad request/schema), retrying usually won't help. 
      // But for 429 (Rate Limit) or 503 (Overloaded), we want to continue to the next model.
      if (error.status === 400) {
        throw error; 
      }
    }
  }

  // If the loop finishes without returning, all models failed
  console.error("[AI] All fallback models failed.");
  throw lastError;
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
    - Occupation: Extract exactly as written.
    - Financials: Extract 'income' and 'sumAssured' as raw numbers without currency symbols.
    - Biometrics: Extract 'bmi' as a numeric value.
    - Family History: Extract the exact phrase mapping to either: "Both Surviving > age 65", "Only one surviving > age 65", or "Both died < age 65".
    - Habits: For any mentioned habits (Smoking, Alcoholic drinks, Tobacco), assign the level strictly as one of: 'Occasionally', 'Regular (moderate)', or 'Regular (high dose)'.
    - Medical Conditions: Extract severity as an INTEGER (1, 2, 3, or 4). Do NOT use words. For example, 'Severity level 3' becomes 3.
    - IMPORTANT: Even if the text is simple, do not fail. Extract what is there.
  `;

  const response = await generateWithFallback(
    prompt,
    {
      responseMimeType: "application/json",
      responseSchema: EXTRACTION_SCHEMA,
    },
    signal
  );

  return normalizeData(JSON.parse(cleanJson(response.text)), fullContext);
}

export async function extractUnderwritingDataFromPDF(
  base64Pdf: string,
  signal?: AbortSignal
): Promise<{ applicant: ApplicantInfo, missing: string[] }> {
  const prompt = `
    Analyze the attached PDF document which contains a life insurance proposal and medical report.
    Extract all relevant underwriting variables.

    IMPORTANT: 
    - Verify if "Name", "Age", "Occupation", "Income", "Sum Assured", and "BMI" are present.
    - Family History: Must match phrasing like "Both Surviving > age 65" or "Both died < age 65".
    - Habits: Map habit consumption to exactly 'Occasionally', 'Regular (moderate)', or 'Regular (high dose)'.
    - Medical conditions: Extract severity as a NUMBER (1, 2, 3, or 4). Do not use text descriptions for severity.
    - Extract specific clinical indicators into the 'indicators' field.
  `;

  const response = await generateWithFallback(
    {
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
    {
      responseMimeType: "application/json",
      responseSchema: EXTRACTION_SCHEMA,
    },
    signal
  );

  return normalizeData(JSON.parse(cleanJson(response.text)));
}