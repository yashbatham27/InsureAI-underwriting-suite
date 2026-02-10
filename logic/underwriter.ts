
import { ApplicantInfo, UnderwritingResult, RiskCategory, Severity } from '../types';
import { MORTALITY_CHART, OCCUPATIONAL_RISK, RISK_RATING_MAP, PREMIUM_TABLE } from '../constants';

export function runUnderwriting(applicant: ApplicantInfo): UnderwritingResult {
  let medicalPoints = 0;
  const breakdown: { label: string, points: number }[] = [];

  // 1. Calculate Medical Mortality Points
  applicant.medicalConditions.forEach(condition => {
    // Exact match first
    let chartEntry = MORTALITY_CHART[condition.name];
    let matchedName = condition.name;

    // Fuzzy match if not found
    if (!chartEntry) {
      const conditionLower = condition.name.toLowerCase();
      const fuzzyKey = Object.keys(MORTALITY_CHART).find(key => 
        conditionLower.includes(key.toLowerCase()) || key.toLowerCase().includes(conditionLower)
      );
      if (fuzzyKey) {
        chartEntry = MORTALITY_CHART[fuzzyKey];
        matchedName = `${condition.name} (Mapped to ${fuzzyKey})`;
      }
    }

    if (chartEntry) {
      const points = chartEntry[condition.severity as Severity] || 0;
      medicalPoints += points;
      breakdown.push({ label: `${matchedName} - ${condition.severity}`, points });
    } else {
       // Fallback for unknown conditions - treat as minimal risk or flag? 
       // For now, we log it but add 0 points, or we could add a default "Unknown" load.
       // Let's assume standard risk if not in our specific chart, or maybe small load?
       // Leaving at 0 but noting it.
       breakdown.push({ label: `${condition.name} (Unlisted Condition)`, points: 0 });
    }
  });

  // 2. Calculate Occupational Loading
  // Fuzzy match occupation
  let occupationalPoints = 0;
  let occupationLabel = `Occupation: ${applicant.occupation}`;
  
  const exactOcc = OCCUPATIONAL_RISK[applicant.occupation];
  if (exactOcc !== undefined) {
    occupationalPoints = exactOcc;
  } else {
    // Try fuzzy
    const occLower = applicant.occupation.toLowerCase();
    const fuzzyOcc = Object.keys(OCCUPATIONAL_RISK).find(k => occLower.includes(k.toLowerCase()));
    if (fuzzyOcc) {
      occupationalPoints = OCCUPATIONAL_RISK[fuzzyOcc];
      occupationLabel = `Occupation: ${applicant.occupation} (Mapped to ${fuzzyOcc})`;
    }
  }

  if (occupationalPoints > 0) {
    breakdown.push({ label: occupationLabel, points: occupationalPoints });
  }

  // 3. Smoking/Alcohol adjustment (Standard industry practice +25 for smokers)
  if (applicant.smoking) {
    medicalPoints += 25;
    breakdown.push({ label: 'Lifestyle: Smoker', points: 25 });
  }

  const totalExtraMortalityPoints = medicalPoints + occupationalPoints;

  // 4. Risk Categorization
  const riskEntry = RISK_RATING_MAP.find(r => totalExtraMortalityPoints <= r.maxPoints) || RISK_RATING_MAP[RISK_RATING_MAP.length - 1];
  const { category, decision } = riskEntry;

  // 5. Premium Calculation
  // Find closest age band (downwards)
  const ageBands = Object.keys(PREMIUM_TABLE).map(Number).sort((a, b) => b - a);
  const band = ageBands.find(b => applicant.age >= b) || ageBands[ageBands.length - 1];
  const premiums = PREMIUM_TABLE[band];

  const basePremium = premiums.base;
  const accidentPremium = applicant.selectedRiders.accidentCover ? premiums.accident : 0;
  const ciPremium = applicant.selectedRiders.criticalIllness ? premiums.criticalIllness : 0;

  // Loading Calculation: (Total Points / 100) * Base Premium
  // Standard underwriting: points are percentage of extra mortality
  const loadingAmount = (totalExtraMortalityPoints / 100) * basePremium;

  const finalTotalPremium = basePremium + loadingAmount + accidentPremium + ciPremium;

  return {
    totalExtraMortalityPoints,
    medicalPoints,
    occupationalPoints,
    riskCategory: category,
    decision,
    basePremium,
    riderPremiums: {
      accident: accidentPremium,
      criticalIllness: ciPremium
    },
    loadingAmount,
    finalTotalPremium,
    breakdown
  };
}
