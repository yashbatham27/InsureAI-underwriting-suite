export type Severity = 1 | 2 | 3 | 4;

export interface MedicalCondition {
  name: string;
  severity: Severity;
  indicators?: string;
}

export interface Habit {
  type: string; // e.g., 'Smoking', 'Alcoholic drinks', 'Tobacco'
  level: 'Occasionally' | 'Regular (moderate)' | 'Regular (high dose)';
}

export interface ApplicantInfo {
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  occupation: string;
  income: number;
  sumAssured: number;
  bmi: number;
  familyHistory: string;
  habits: Habit[];
  medicalConditions: MedicalCondition[];
  selectedRiders: {
    accidentCover: boolean;
    criticalIllness: boolean;
  };
}

export interface UnderwritingResult {
  totalExtraMortalityPoints: number;
  medicalPoints: number;
  occupationalPoints: number;
  riskCategory: string; // Dynamically assigned (e.g., 'Standard', 'Sub-standard (Class II)')
  decision: string;
  basePremium: number;
  riderPremiums: {
    accident?: number;
    criticalIllness?: number;
  };
  loadingAmount: number;
  finalTotalPremium: number;
  breakdown: {
    label: string;
    points: number;
  }[];
}

export interface ExtractedData {
  applicant: ApplicantInfo;
  isExtracted: boolean;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  applicant: ApplicantInfo;
  report: UnderwritingResult;
  proposalText: string;
  medicalText: string;
  financialText?: string;
  transactions?: Transaction[];
  scenarios?: MedicalParameter[];
  fraudFlags?: FraudFlag[];
}

export type FraudSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

export interface FraudFlag {
  id: string;
  signature: string;
  severity: FraudSeverity;
  reason: string;
  evidence: string;
  action: string;
}

// --- UPDATED FOR INVESTIGATION MODE ---
export interface Transaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  flagged: boolean;
  status?: 'pending' | 'safe' | 'escalated'; // Added to handle UI action states
  details?: {
    comparison: string;
    highlightedText: string[];
    fraudSignature?: string; // Added to match specific fraud patterns
  };
}

// --- UPDATED FOR SCENARIO ANALYSIS DASHBOARD ---
export interface MedicalParameter {
  id: string; // Added for stable React mapping
  name: string;
  category: 'Vitals' | 'Lifestyle' | 'Medical History' | string; // Added for structured data
  current: string;
  adjusted: string;
  toggle: boolean;
  impactDelta: number; // Added to show exact score impact (e.g., -15 or +10)
}

export interface RiskScore {
  current: number;
  adjusted: number;
}