import { ApplicantInfo, UnderwritingResult } from '../types';
import { 
  FINANCIAL_MULTIPLIERS, 
  PREMIUM_RATES, 
  OCCUPATION_EXTRA_PER_MILLE, 
  HEALTH_EMR, 
  HABITS_EMR, 
  LIFE_CLASS_FACTORS,
  HEALTH_CLASS_FACTORS
} from '../constants'; 

export function runUnderwriting(applicant: ApplicantInfo): UnderwritingResult {
  const breakdown: { label: string, points: number }[] = [];
  let totalEMR = 0;

  // --- 1. FINANCIAL UNDERWRITING ---
  const annualIncome = (applicant as any).averageIncome || applicant.income || 0;
  
  const incomeMultipleLimit = FINANCIAL_MULTIPLIERS.find(f => applicant.age <= f.maxAge)?.multiple || 10;
  const maxAllowedInsurance = annualIncome * incomeMultipleLimit;
  const isFinancialValid = applicant.sumAssured <= maxAllowedInsurance;
  
  if (!isFinancialValid) {
    breakdown.push({ label: `Financial Alert: Sum Assured exceeds ${incomeMultipleLimit}x income limit`, points: 0 });
  }

  // --- 2. BASE PREMIUM & OCCUPATION LOADING (Per Mille) ---
  const rates = PREMIUM_RATES.find(r => applicant.age <= r.maxAge) || PREMIUM_RATES[PREMIUM_RATES.length - 1];
  const saPerMille = applicant.sumAssured / 1000;

  // Base Medical Premium rounded to nearest integer
  const baseMedicalLifePremium = Math.round(rates.life * saPerMille);

  // Occupation Extra Matching
  let occExtraPerMille = 0;
  const occLower = applicant.occupation?.toLowerCase() || '';
  for (const [key, value] of Object.entries(OCCUPATION_EXTRA_PER_MILLE)) {
    if (occLower.includes(key.toLowerCase())) {
      occExtraPerMille = value;
      breakdown.push({ label: `Occupation Loading (${key})`, points: 0 }); 
      break;
    }
  }
  const occLoadingAmount = Math.round(occExtraPerMille * saPerMille);

  // --- 3. EMR POINTS CALCULATION ---

  // A. BMI
  let bmiEMR = 0;
  if (applicant.bmi < 18) bmiEMR = 10;
  else if (applicant.bmi >= 24 && applicant.bmi <= 28) bmiEMR = 5;
  else if (applicant.bmi >= 29 && applicant.bmi <= 33) bmiEMR = 10;
  else if (applicant.bmi >= 34 && applicant.bmi <= 38) bmiEMR = 15;
  if (bmiEMR !== 0) breakdown.push({ label: `BMI (${applicant.bmi})`, points: bmiEMR });
  totalEMR += bmiEMR;

  // B. Family History
  let famEMR = 0;
  const famHistory = (applicant as any).familyHistory || ""; // Safe string fallback
  if (famHistory.includes("Both Surviving")) famEMR = -10;
  else if (famHistory.includes("Only one surviving")) famEMR = 5;
  else if (famHistory.includes("Both died < age 65")) famEMR = 10;
  if (famEMR !== 0) breakdown.push({ label: `Family History`, points: famEMR });
  totalEMR += famEMR;

  // C. Health Conditions
  let diseaseCount = 0;
  const conditions = applicant.medicalConditions || [];
  conditions.forEach(condition => {
    const diseaseChart = HEALTH_EMR[condition.name];
    if (diseaseChart) {
      diseaseCount++;
      const points = diseaseChart[condition.severity - 1] || 0;
      breakdown.push({ label: `Health: ${condition.name} (Lvl ${condition.severity})`, points });
      totalEMR += points;
    }
  });

  // D. Co-morbidity Extra
  if (diseaseCount === 2) {
    breakdown.push({ label: `Co-morbidity Extra (2 conditions)`, points: 20 });
    totalEMR += 20;
  } else if (diseaseCount >= 3) {
    breakdown.push({ label: `Co-morbidity Extra (3+ conditions)`, points: 40 });
    totalEMR += 40;
  }

  // E. Personal Habits
  let habitCount = 0;
  const habits = applicant.habits || [];
  habits.forEach(habit => {
    const points = HABITS_EMR[habit.level] || 0;
    if (points > 0) {
      habitCount++;
      breakdown.push({ label: `Habit: ${habit.type} (${habit.level})`, points });
      totalEMR += points;
    }
  });

  // F. Co-existence of risky habits
  if (habitCount === 2) {
    breakdown.push({ label: `Risky Habits Combo (2 habits)`, points: 20 });
    totalEMR += 20;
  } else if (habitCount >= 3) {
    breakdown.push({ label: `Risky Habits Combo (3+ habits)`, points: 40 });
    totalEMR += 40;
  }

  // --- 4. RATING CLASS & FINAL PREMIUM ---
  
  // Life Insurance Loading Formula
  const lifeRatingTier = LIFE_CLASS_FACTORS.find(r => totalEMR >= r.min && totalEMR <= r.max) || LIFE_CLASS_FACTORS[LIFE_CLASS_FACTORS.length - 1];
  const lifeMedicalLoadingAmount = Math.round(baseMedicalLifePremium * 0.25 * lifeRatingTier.factor);

  // Rider Check (Supports boolean objects or flat string extraction from LLM)
  const reqRidersStr = ((applicant as any).requestedRiders || "").toLowerCase();
  const wantsAccident = applicant.selectedRiders?.accidentCover || reqRidersStr.includes('accident');
  const wantsCIR = applicant.selectedRiders?.criticalIllness || reqRidersStr.includes('critical');

  // Rider Scaling (Accident max 1Cr, CIR max 50L to keep premiums realistic)
  let accidentPremium = 0;
  if (wantsAccident) {
    const accSaPerMille = Math.min(applicant.sumAssured, 10000000) / 1000;
    accidentPremium = Math.round(rates.accident * accSaPerMille);
  }

  let cirTotalPremium = 0;
  if (wantsCIR) {
    const cirSaPerMille = Math.min(applicant.sumAssured * 0.50, 5000000) / 1000; 
    const cirBase = rates.cir * cirSaPerMille;
    
    // CIR Loading uses specific Health Factor logic
    const healthRatingTier = HEALTH_CLASS_FACTORS.find(r => totalEMR >= r.min && totalEMR <= r.max) || HEALTH_CLASS_FACTORS[HEALTH_CLASS_FACTORS.length - 1];
    const cirLoadingAmount = cirBase * 0.30 * healthRatingTier.factor;
    cirTotalPremium = Math.round(cirBase + cirLoadingAmount); 
  }

  // Aggregate final totals for UI
  const totalLoadingAmount = lifeMedicalLoadingAmount + occLoadingAmount;
  const finalTotalPremium = baseMedicalLifePremium + totalLoadingAmount + accidentPremium + cirTotalPremium;

  // Determine final decision string
  let finalDecision = 'Accepted with Standard Rates';
  if (!isFinancialValid) {
    finalDecision = 'Declined (Financial Limit Exceeded)';
  } else if (totalEMR > 200) {
    finalDecision = 'Refer to Chief Underwriter';
  } else if (totalEMR > 0) {
    finalDecision = 'Accepted with Loading';
  }

  return {
    totalExtraMortalityPoints: totalEMR,
    medicalPoints: totalEMR, 
    occupationalPoints: occExtraPerMille, 
    riskCategory: lifeRatingTier.class === 'Std' ? 'Standard' : `Sub-standard (Class ${lifeRatingTier.class})`,
    decision: finalDecision,
    basePremium: baseMedicalLifePremium,
    riderPremiums: {
      accident: accidentPremium,
      criticalIllness: cirTotalPremium
    },
    loadingAmount: totalLoadingAmount,
    finalTotalPremium,
    breakdown
  };
}