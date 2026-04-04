import { GoogleGenAI, Type } from "@google/genai";
import { ApplicantInfo, Transaction, MedicalParameter, FraudFlag } from "../types";

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
    transactions: {
      type: Type.ARRAY,
      description: "List of financial transactions extracted from bank statements.",
      items: {
        type: Type.OBJECT,
        properties: {
          date: { type: Type.STRING },
          amount: { type: Type.NUMBER },
          description: { type: Type.STRING },
          flagged: { type: Type.BOOLEAN, description: "True if the transaction looks unusually large, sudden, or suspicious." },
          comparison: { type: Type.STRING, description: "AI Contextual Analysis explaining why it is flagged or safe." },
          fraudSignature: { type: Type.STRING, description: "E.g., 'Unusual High-Value Deposit', 'Normal Salary'." },
          highlightedText: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Specific numbers or words from the comparison to highlight." }
        }
      }
    },
    // NEW: Dynamic Actionable Scenarios
    actionableScenarios: {
      type: Type.ARRAY,
      description: "Generate 3 to 5 realistic medical or lifestyle improvements the applicant could make to lower their mortality risk based ONLY on their current health data.",
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "e.g., 'Weight Loss', 'Quit Smoking', 'Manage Blood Pressure'" },
          category: { type: Type.STRING, description: "'Vitals', 'Lifestyle', or 'Medical History'" },
          current: { type: Type.STRING, description: "Their current state, e.g., 'BMI 32' or 'Smokes Daily'" },
          adjusted: { type: Type.STRING, description: "A realistic target, e.g., 'BMI 28' or 'Quit'" },
          impactDelta: { type: Type.INTEGER, description: "A negative number representing how many risk points they would drop. e.g., -15" }
        }
      }
    },
    // NEW: Holistic Fraud Flags
    holisticFraudFlags: {
      type: Type.ARRAY,
      description: "Analyze the entire profile (proposal, medical, financials) for inconsistencies, over-insurance, or suspicious activity.",
      items: {
        type: Type.OBJECT,
        properties: {
          signature: { type: Type.STRING, description: "e.g., 'Income Mismatch', 'Undisclosed Medical History'" },
          severity: { type: Type.STRING, description: "Must be 'Low', 'Medium', 'High', or 'Critical'" },
          reason: { type: Type.STRING },
          evidence: { type: Type.STRING, description: "Data proving the flag, e.g., 'Stated income is 15L but bank shows no salary deposits.'" },
          action: { type: Type.STRING, description: "e.g., 'Request ITR', 'Schedule Video Medical'" }
        }
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

function normalizeData(data: any, originalContext: string = ""): { 
  applicant: ApplicantInfo, 
  transactions: Transaction[], 
  scenarios: MedicalParameter[],
  fraudFlags: FraudFlag[],
  missing: string[] 
} {
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

  const transactions: Transaction[] = (data.transactions || []).map((t: any, index: number) => ({
    id: `tx-${Date.now()}-${index}`,
    date: t.date || "Unknown",
    amount: t.amount || 0,
    description: t.description || "Unknown Transaction",
    flagged: !!t.flagged,
    status: t.flagged ? 'pending' : 'safe',
    details: {
      comparison: t.comparison || (t.flagged ? "Suspicious activity detected." : "Standard transaction pattern."),
      highlightedText: t.highlightedText || [],
      fraudSignature: t.fraudSignature || ""
    }
  }));

  // NEW: Process extracted scenarios
  const scenarios: MedicalParameter[] = (data.actionableScenarios || []).map((s: any, index: number) => ({
    id: `param-${Date.now()}-${index}`,
    name: s.name || "Unknown Risk Factor",
    category: s.category || "General",
    current: s.current || "Current State",
    adjusted: s.adjusted || "Improved State",
    toggle: false, // Default to off in UI
    impactDelta: s.impactDelta || 0 // Should be negative
  }));

  // NEW: Process extracted holistic fraud flags
  const fraudFlags: FraudFlag[] = (data.holisticFraudFlags || []).map((f: any, index: number) => ({
    id: `flag-${Date.now()}-${index}`,
    signature: f.signature || "General Anomaly",
    severity: ['Low', 'Medium', 'High', 'Critical'].includes(f.severity) ? f.severity : 'Low',
    reason: f.reason || "Review requested.",
    evidence: f.evidence || "See file notes.",
    action: f.action || "Manual Review"
  }));

  return { 
    applicant: applicant as ApplicantInfo, 
    transactions, 
    scenarios,
    fraudFlags,
    missing: Array.from(new Set(missing)) 
  };
}

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
      
      if (signal?.aborted || error.name === 'AbortError') {
        throw new Error('Aborted');
      }

      if (error.status === 400) {
        throw error; 
      }
    }
  }

  console.error("[AI] All fallback models failed.");
  throw lastError;
}

export async function extractUnderwritingData(
  proposalText: string, 
  medicalText: string,
  financialText: string, 
  signal?: AbortSignal
): Promise<{ applicant: ApplicantInfo, transactions: Transaction[], scenarios: MedicalParameter[], fraudFlags: FraudFlag[], missing: string[] }> {
  const fullContext = `Proposal: ${proposalText}\nMedical: ${medicalText}\nFinancials: ${financialText}`;
  const prompt = `
    Extract life insurance underwriting data from the following documents.
    1. Proposal Extract: ${proposalText}
    2. Medical Report: ${medicalText}
    3. Financial & Bank Statements: ${financialText}

    Rules for extraction:
    - Occupation: Extract exactly as written.
    - Financials: Extract 'income' and 'sumAssured' as raw numbers without currency symbols.
    - Biometrics: Extract 'bmi' as a numeric value.
    - Family History: Extract the exact phrase mapping to either: "Both Surviving > age 65", "Only one surviving > age 65", or "Both died < age 65".
    - Habits: Assign the level strictly as one of: 'Occasionally', 'Regular (moderate)', or 'Regular (high dose)'.
    - Medical Conditions: Extract severity as an INTEGER (1, 2, 3, or 4). Do NOT use words.
    - Transactions: Extract all financial transactions from the Bank Statements. Flag any unusual patterns like large unexpected deposits, immediate high-value withdrawals, or mismatches. Provide a contextual comparison.
    - Scenarios: Suggest realistic lifestyle/medical improvements to lower risk.
    - Fraud Flags: Check for inconsistencies across the entire profile (e.g. stated income vs deposits, hidden medical issues).
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
): Promise<{ applicant: ApplicantInfo, transactions: Transaction[], scenarios: MedicalParameter[], fraudFlags: FraudFlag[], missing: string[] }> {
  const prompt = `
    Analyze the attached PDF document which contains a life insurance proposal, medical report, and financial/bank statements.
    Extract all relevant underwriting variables.

    IMPORTANT: 
    - Verify if "Name", "Age", "Occupation", "Income", "Sum Assured", and "BMI" are present.
    - Extract habits and medical conditions according to standard strict levels.
    - Extract ALL transactions. Set flagged to true if the transaction amount is highly disproportionate to stated income, or looks like money laundering/fraud setup.
    - Scenarios: Suggest realistic lifestyle/medical improvements to lower risk.
    - Fraud Flags: Check for inconsistencies across the entire profile.
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