
export enum Severity {
  MILD = 'Mild',
  MODERATE = 'Moderate',
  SEVERE = 'Severe',
  CRITICAL = 'Critical'
}

export enum RiskCategory {
  STANDARD = 'Standard',
  PREFERRED = 'Preferred',
  SUBSTANDARD = 'Substandard',
  DECLINE = 'Decline',
  POSTPONE = 'Postpone'
}

export interface MedicalCondition {
  name: string;
  severity: Severity;
  indicators?: string;
}

export interface ApplicantInfo {
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  occupation: string;
  income: number;
  smoking: boolean;
  alcohol: boolean;
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
  riskCategory: RiskCategory;
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
