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
}