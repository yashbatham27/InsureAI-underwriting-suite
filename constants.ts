// 1. Financial Underwriting Multipliers
export const FINANCIAL_MULTIPLIERS = [
  { maxAge: 35, multiple: 25 },
  { maxAge: 45, multiple: 20 },
  { maxAge: 50, multiple: 15 },
  { maxAge: 55, multiple: 15 },
  { maxAge: 999, multiple: 10 }
];

// 2. Base Premium Rates per mille (per 1000 SA)
export const PREMIUM_RATES = [
  { maxAge: 35, life: 1.5, accident: 1.0, cir: 3.0 },
  { maxAge: 40, life: 3.0, accident: 1.0, cir: 6.0 },
  { maxAge: 45, life: 4.5, accident: 1.0, cir: 12.0 },
  { maxAge: 50, life: 6.0, accident: 1.0, cir: 15.0 },
  { maxAge: 55, life: 7.5, accident: 1.5, cir: 20.0 },
  { maxAge: 60, life: 9.0, accident: 1.5, cir: 25.0 },
  { maxAge: 65, life: 10.5, accident: 1.5, cir: 0 } // NA for CIR handled as 0
];

// 3. Occupation Extra Charge (Per Mille Loading)
export const OCCUPATION_EXTRA_PER_MILLE: Record<string, number> = {
  "Professional Athletes": 2,
  "Commercial pilots": 6,
  "Drivers": 2,
  "Merchant navy": 3,
  "Oil and Natural Gas Industry": 3
};

// 4. Health Conditions EMR (Extra Mortality Rating)
// Array index corresponds to Severity: [Level 1, Level 2, Level 3, Level 4]
export const HEALTH_EMR: Record<string, number[]> = {
  "Thyroid": [2.5, 5, 7.5, 10],
  "Asthma": [5, 7.5, 10, 12.5],
  "Hyper Tension": [5, 7.5, 10, 15],
  "Diabetes Mellitus": [10, 15, 20, 25],
  "Gut disorder": [5, 10, 15, 20]
};

// 5. Personal Habits EMR
export const HABITS_EMR: Record<string, number> = {
  "Occasionally": 5,
  "Regular (moderate)": 10,
  "Regular (high dose)": 15
};

// 6. Life Insurance Rating Class Factors
export const LIFE_CLASS_FACTORS = [
  { min: 0, max: 19, class: 'Std', factor: 0 },
  { min: 20, max: 35, class: 'I', factor: 1 },
  { min: 36, max: 39, class: 'I+', factor: 1 }, 
  { min: 40, max: 60, class: 'II', factor: 2 },
  { min: 61, max: 64, class: 'II+', factor: 2 }, 
  { min: 65, max: 85, class: 'III', factor: 3 },
  { min: 86, max: 89, class: 'III+', factor: 3 }, 
  { min: 90, max: 120, class: 'IV', factor: 4 },
  { min: 121, max: 124, class: 'IV+', factor: 4 }, 
  { min: 125, max: 170, class: 'V', factor: 6 },
  { min: 171, max: 174, class: 'V+', factor: 6 }, 
  { min: 175, max: 225, class: 'VI', factor: 8 },
  { min: 226, max: 229, class: 'VI+', factor: 8 }, 
  { min: 230, max: 275, class: 'VII', factor: 10 },
  { min: 276, max: 279, class: 'VII+', factor: 10 }, 
  { min: 280, max: 350, class: 'VIII', factor: 12 },
  { min: 351, max: 354, class: 'VIII+', factor: 12 }, 
  { min: 355, max: 450, class: 'IX', factor: 16 },
  { min: 451, max: 454, class: 'IX+', factor: 16 }, 
  { min: 455, max: 550, class: 'X', factor: 20 },
];

// 7. Health / CIR Rating Class Factors
export const HEALTH_CLASS_FACTORS = [
  { min: 0, max: 20, class: 'Std', factor: 0 },
  { min: 21, max: 35, class: 'I', factor: 1 },
  { min: 36, max: 60, class: 'II', factor: 2 },
  { min: 61, max: 75, class: 'III', factor: 3 },
  { min: 76, max: 100, class: 'IV', factor: 4 },
  { min: 101, max: 9999, class: 'Decline', factor: 5 }
];

export const MAPPED_CONDITIONS = Object.keys(HEALTH_EMR);
export const MAPPED_OCCUPATIONS = Object.keys(OCCUPATION_EXTRA_PER_MILLE);