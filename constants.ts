
import { Severity, RiskCategory } from './types';

// 3.3 Extra Mortality Rate Chart
export const MORTALITY_CHART: Record<string, Record<Severity, number>> = {
  'Hypertension': { [Severity.MILD]: 25, [Severity.MODERATE]: 50, [Severity.SEVERE]: 100, [Severity.CRITICAL]: 200 },
  'Diabetes': { [Severity.MILD]: 50, [Severity.MODERATE]: 100, [Severity.SEVERE]: 150, [Severity.CRITICAL]: 300 },
  'Obesity': { [Severity.MILD]: 10, [Severity.MODERATE]: 30, [Severity.SEVERE]: 75, [Severity.CRITICAL]: 150 },
  'Asthma': { [Severity.MILD]: 0, [Severity.MODERATE]: 25, [Severity.SEVERE]: 75, [Severity.CRITICAL]: 150 },
  'Heart Condition': { [Severity.MILD]: 75, [Severity.MODERATE]: 150, [Severity.SEVERE]: 250, [Severity.CRITICAL]: 500 },
  'Kidney Disease': { [Severity.MILD]: 50, [Severity.MODERATE]: 100, [Severity.SEVERE]: 200, [Severity.CRITICAL]: 400 },
  'Liver Cirrhosis': { [Severity.MILD]: 100, [Severity.MODERATE]: 200, [Severity.SEVERE]: 400, [Severity.CRITICAL]: 800 },
  'Thyroid Disorder': { [Severity.MILD]: 0, [Severity.MODERATE]: 20, [Severity.SEVERE]: 50, [Severity.CRITICAL]: 100 },
  'Anxiety/Depression': { [Severity.MILD]: 0, [Severity.MODERATE]: 25, [Severity.SEVERE]: 50, [Severity.CRITICAL]: 150 },
  'Sleep Apnea': { [Severity.MILD]: 10, [Severity.MODERATE]: 40, [Severity.SEVERE]: 80, [Severity.CRITICAL]: 160 }
};

// 3.4 Occupational Risk Chart
export const OCCUPATIONAL_RISK: Record<string, number> = {
  'IT Professional': 0,
  'Doctor': 0,
  'Driver': 25,
  'High-rise Construction Worker': 75,
  'Underground Miner': 150
};

// 3.5 Risk Rating Chart
export const RISK_RATING_MAP = [
  { maxPoints: 25, category: RiskCategory.PREFERRED, decision: 'Standard Acceptance' },
  { maxPoints: 75, category: RiskCategory.STANDARD, decision: 'Standard Acceptance' },
  { maxPoints: 150, category: RiskCategory.SUBSTANDARD, decision: 'Acceptance with Loading' },
  { maxPoints: 300, category: RiskCategory.SUBSTANDARD, decision: 'Acceptance with Exclusions & Loading' },
  { maxPoints: Infinity, category: RiskCategory.DECLINE, decision: 'Decline / Postpone' }
];

// 3.6 Premium Tables (Per 100,000 Sum Assured - Dummy data for simulation)
// Format: { ageBandStart: { base, accident, criticalIllness } }
export const PREMIUM_TABLE: Record<number, { base: number, accident: number, criticalIllness: number }> = {
  18: { base: 1200, accident: 200, criticalIllness: 400 },
  30: { base: 1800, accident: 250, criticalIllness: 600 },
  45: { base: 3500, accident: 400, criticalIllness: 1200 },
  60: { base: 7500, accident: 800, criticalIllness: 2500 }
};

export const MAPPED_CONDITIONS = Object.keys(MORTALITY_CHART);
export const MAPPED_OCCUPATIONS = Object.keys(OCCUPATIONAL_RISK);
