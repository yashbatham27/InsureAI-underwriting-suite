
import React, { useRef, useState, useEffect } from 'react';
import { ApplicantInfo } from '../types';

interface InputPanelProps {
  proposalText: string;
  setProposalText: (val: string) => void;
  medicalText: string;
  setMedicalText: (val: string) => void;
  onProcess: () => void;
  onPdfUpload: (file: File) => void;
  onCancel: () => void;
  loading: boolean;
  loadingStep: string;
  progress: number;
  error: string | null;
  extractedInfo: ApplicantInfo | null;
}

interface HighlightedTextareaProps {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  terms: { text: string; color: string }[];
  label: string;
}

const HighlightedTextarea: React.FC<HighlightedTextareaProps> = ({ value, onChange, placeholder, terms, label }) => {
  const backdropRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const syncScroll = () => {
    if (textareaRef.current && backdropRef.current) {
      backdropRef.current.scrollTop = textareaRef.current.scrollTop;
      backdropRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const renderHighlights = () => {
    if (!terms.length) return value;

    // Filter out empty or too short terms to avoid matching single letters
    const validTerms = terms.filter(t => t.text && t.text.length > 2);
    if (!validTerms.length) return value;

    // Build a safe regex that matches any of the terms
    const sortedTerms = [...validTerms].sort((a, b) => b.text.length - a.text.length);
    const pattern = sortedTerms.map(t => t.text.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|');
    const regex = new RegExp(`(${pattern})`, 'gi');

    const parts = value.split(regex);
    return parts.map((part, i) => {
      const match = sortedTerms.find(t => t.text.toLowerCase() === part.toLowerCase());
      if (match) {
        return (
          <mark key={i} className={`${match.color} px-0.5 rounded-sm transition-colors duration-500`}>
            {part}
          </mark>
        );
      }
      return part;
    });
  };

  return (
    <div className="relative group">
      <div className="flex justify-between items-center mb-2">
        <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{label}</label>
        {value.length > 0 && (
          <button
            onClick={() => onChange('')}
            className="text-[10px] text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 font-medium uppercase tracking-wider transition-colors flex items-center gap-1.5"
            title="Clear text"
          >
            <i className="fa-solid fa-eraser"></i> Clear
          </button>
        )}
      </div>
      <div className="relative min-h-[112px] h-28 w-full">
        {/* Highlight Layer */}
        <div
          ref={backdropRef}
          aria-hidden="true"
          className="absolute inset-0 p-3 text-sm font-normal border border-transparent whitespace-pre-wrap break-words overflow-y-auto pointer-events-none text-transparent leading-relaxed"
          style={{ fontFamily: 'inherit' }}
        >
          {renderHighlights()}
          {/* Extra line break to handle trailing spaces correctly */}
          {"\n"}
        </div>

        {/* Real Textarea */}
        <textarea
          ref={textareaRef}
          onScroll={syncScroll}
          className="absolute inset-0 w-full h-full p-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none resize-none bg-transparent leading-relaxed z-10 text-slate-800 dark:text-slate-200"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        ></textarea>
      </div>
    </div>
  );
};

const InputPanel: React.FC<InputPanelProps> = ({ 
  proposalText, setProposalText, medicalText, setMedicalText, onProcess, onPdfUpload, onCancel, loading, loadingStep, progress, error, extractedInfo 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fillSample = () => {
    // Gender-specific names
    const maleNames = ["Rajesh", "Amit", "Vikram", "Rahul", "Sanjay", "Arjun", "Mohammed", "Rohan", "Vivek", "Suresh", "Karan", "Aditya"];
    const femaleNames = ["Priya", "Sneha", "Anjali", "Meera", "Kavita", "Zara", "Lakshmi", "Sunita", "Anita", "Deepa", "Neha", "Pooja"];
    const lastNames = ["Sharma", "Patel", "Verma", "Singh", "Gupta", "Kumar", "Reddy", "Desai", "Joshi", "Malhotra", "Iyer", "Khan", "Nair", "Mehta", "Agarwal"];

    const occupations = [
      "Software Engineer", "Senior Surgeon", "Uber Driver", "High-rise Construction Worker", 
      "Underground Coal Miner", "Primary School Teacher", "Police Constable", "Chartered Accountant",
      "Commercial Pilot", "Factory Supervisor", "Data Analyst", "Architect"
    ];
    
    const medicalScenarios = [
      {
        text: "Patient presents with Stage 2 Hypertension. Blood pressure readings consistently around 160/100 mmHg over the last 3 months. BMI is 32, indicating mild obesity. Patient reports occasional palpitations. ECG shows Left Ventricular Hypertrophy. Patient admits to high salt intake.",
        risk: "High"
      },
      {
        text: "Diagnosed with Type 2 Diabetes Mellitus five years ago. Most recent HbA1c is 8.2%, indicating suboptimal control. Reports mild peripheral neuropathy in feet. Kidney function tests are within normal limits (eGFR > 90). Fundoscopy reveals early non-proliferative retinopathy.",
        risk: "Moderate"
      },
      {
        text: "History of Childhood Asthma, now well-controlled with inhalers (Salbutamol prn). No hospitalizations in the last 5 years. PFT shows mild obstruction (FEV1 85%). Patient reports seasonal allergies aggravated by pollen. Chest X-ray clear.",
        risk: "Low"
      },
      {
        text: "Routine health checkup reveals elevated cholesterol (Total 240 mg/dL, LDL 160). Patient is asymptomatic. ECG shows normal sinus rhythm. No history of cardiac events. BMI is 24 (Normal). Liver function tests are normal. Lipid profile repeat advised.",
        risk: "Low-Moderate"
      },
      {
        text: "Patient has a history of Chronic Kidney Disease (Stage 2) secondary to hypertension. Serum Creatinine 1.4 mg/dL. Blood pressure is managed with ACE inhibitors. No edema reported. Urine albumin-to-creatinine ratio is slightly elevated. Renal ultrasound shows normal kidney size.",
        risk: "High"
      },
      {
        text: "Clean bill of health. Annual physicals show no abnormalities. Blood pressure 120/80, BMI 22. Active lifestyle with regular exercise (running 5km thrice weekly). No chronic medications. Nonsmoker. Family history is unremarkable.",
        risk: "Preferred"
      },
      {
        text: "Reports anxiety and mild depression, managed with SSRIs (Sertraline 50mg) for the past 2 years. Sleeping patterns are regular. No history of self-harm or hospitalization. Mental status examination is normal. Patient is fully functional at work.",
        risk: "Moderate"
      },
      {
        text: "Patient suffered a mild myocardial infarction 4 years ago. Stent placed in LAD. Current ejection fraction is 55%. Compliant with statins and blood thinners. Stress test negative for ischemia last month. No chest pain on exertion.",
        risk: "Severe"
      },
      {
        text: "Patient diagnosed with Hypothyroidism 3 years ago. Currently on Thyroxine 50mcg daily. TSH levels are within normal range (2.5 mIU/L). No goiter or nodules palpable. Weight is stable.",
        risk: "Standard"
      },
      {
        text: "Obesity Class II (BMI 36). Reports loud snoring and daytime sleepiness. Sleep study confirms Moderate Obstructive Sleep Apnea (AHI 22). Using CPAP machine with good compliance. Blood pressure is slightly elevated (135/85).",
        risk: "Substandard"
      }
    ];

    const habits = [
      "Non-smoker, Non-drinker",
      "Occasional social drinker (1-2 units/week), Non-smoker",
      "Regular smoker (10 cigarettes/day) for 15 years, Occasional drinker",
      "Heavy smoker (pack a day), Regular alcohol consumption",
      "Non-smoker, Teetotaler",
      "Social smoker (weekend only), Moderate drinker",
      "Ex-smoker (quit 5 years ago), Occasional drinker"
    ];

    const random = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
    
    // Logic for gender-consistent names
    const isMale = Math.random() > 0.5;
    const gender = isMale ? "Male" : "Female";
    const firstName = isMale ? random(maleNames) : random(femaleNames);
    const lastName = random(lastNames);
    const name = `${firstName} ${lastName}`;
    
    const age = Math.floor(Math.random() * (55 - 28 + 1)) + 28;
    const occupation = random(occupations);
    const income = (Math.floor(Math.random() * (35 - 6 + 1)) + 6) * 100000;
    const habit = random(habits);
    const scenario = random(medicalScenarios);
    
    const accident = Math.random() > 0.5 ? "Accidental Death Benefit" : "";
    const critical = Math.random() > 0.5 ? "Critical Illness Cover" : "";
    const riders = [accident, critical].filter(Boolean).join(" and ");
    
    // Formatting for readability
    const proposal = `**APPLICATION SUMMARY**
---------------------
**Applicant Details:**
Name: ${name}
Age: ${age}
Gender: ${gender}
Marital Status: ${Math.random() > 0.3 ? 'Married' : 'Single'}
Residence: ${random(['Mumbai, Maharashtra', 'Delhi, NCR', 'Bangalore, Karnataka', 'Chennai, Tamil Nadu', 'Pune, Maharashtra', 'Hyderabad, Telangana'])}

**Employment:**
Occupation: ${occupation}
Industry: ${occupation.includes('Miner') ? 'Mining & Resources' : occupation.includes('Driver') ? 'Transportation' : occupation.includes('Doctor') ? 'Healthcare' : 'General Services'}
Annual Income: ₹${income.toLocaleString('en-IN')}
Length of Service: ${Math.floor(Math.random() * 12) + 1} years

**Lifestyle & Habits:**
${habit}.
Hobbies include ${random(['reading', 'cycling', 'cricket', 'traveling', 'cooking', 'yoga', 'chess'])}.

**Coverage Request:**
Plan: Comprehensive Term Life
Sum Assured: ₹${random(['50,00,000', '75,00,000', '1,00,00,000', '2,00,00,000'])}
Requested Riders: ${riders || "None requested"}.
`;

    const medical = `**MEDICAL EXAMINER REPORT**
-------------------------
**Clinical History:**
${scenario.text}

**Vitals & Biometrics:**
- Blood Pressure: ${scenario.risk.includes('High') ? `${150 + Math.floor(Math.random()*20)}/${90 + Math.floor(Math.random()*15)}` : `${110 + Math.floor(Math.random()*20)}/${70 + Math.floor(Math.random()*15)} mmHg`}
- Heart Rate: ${Math.floor(Math.random() * (90 - 60) + 60)} bpm
- BMI: ${scenario.text.includes('Obesity') ? (30 + Math.random() * 8).toFixed(1) : (21 + Math.random() * 4).toFixed(1)}
- Respiratory Rate: ${12 + Math.floor(Math.random() * 8)}/min

**Family History:**
- Father: ${Math.random() > 0.7 ? 'Deceased (Heart condition)' : 'Alive and healthy'}
- Mother: ${Math.random() > 0.7 ? 'Type 2 Diabetes' : 'Alive and healthy'}

**Lab Results (Summary):**
- CBC: ${scenario.text.includes('Anemia') ? 'Low Hemoglobin (10.5 g/dL)' : 'Normal parameters'}
- Lipid Profile: ${scenario.text.includes('cholesterol') || scenario.text.includes('Obesity') ? 'Elevated LDL (150 mg/dL), Triglycerides (200 mg/dL)' : 'Total Cholesterol 180 mg/dL (Normal)'}
- LFT/KFT: ${scenario.text.includes('Kidney') ? 'Creatinine 1.4 mg/dL' : 'Within normal limits'}
- HIV/Hepatitis: Negative

**Physician Notes:**
Patient appears ${scenario.risk.includes('High') || scenario.risk.includes('Severe') || scenario.risk.includes('Substandard') ? 'to satisfy criteria for substandard rating due to medical history' : 'healthy for stated age'}. Recommend ${scenario.risk.includes('Preferred') ? 'standard acceptance' : 'underwriting review'}.
`;

    setProposalText(proposal);
    setMedicalText(medical);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        alert('Please upload a PDF document.');
        return;
      }
      onPdfUpload(file);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  // Build the list of terms to highlight for Proposal
  const proposalHighlights = extractedInfo ? [
    { text: extractedInfo.name, color: 'bg-blue-200 dark:bg-blue-900/50' },
    { text: extractedInfo.occupation, color: 'bg-purple-200 dark:bg-purple-900/50' },
    { text: extractedInfo.age.toString(), color: 'bg-blue-200 dark:bg-blue-900/50' },
    { text: extractedInfo.smoking ? 'smoker' : '', color: 'bg-green-200 dark:bg-green-900/50' },
    { text: extractedInfo.selectedRiders.accidentCover ? 'Accident' : '', color: 'bg-green-200 dark:bg-green-900/50' },
    { text: extractedInfo.selectedRiders.criticalIllness ? 'Critical Illness' : '', color: 'bg-green-200 dark:bg-green-900/50' },
  ].filter(h => h.text) : [];

  // Build the list of terms to highlight for Medical
  const medicalHighlights = extractedInfo ? extractedInfo.medicalConditions.map(c => ({
    text: c.name,
    color: 'bg-amber-200 dark:bg-amber-900/50'
  })) : [];

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col h-full overflow-hidden relative transition-colors duration-300">
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/95 dark:bg-slate-800/95 z-50 flex flex-col items-center justify-center p-8 text-center backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-[280px]">
            <div className="mb-6 relative">
              <div className="w-16 h-16 border-4 border-blue-100 dark:border-slate-700 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <i className="fa-solid fa-robot text-blue-600 text-sm"></i>
              </div>
            </div>
            
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Analyzing Risks</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 min-h-[40px] leading-relaxed">{loadingStep}</p>
            
            <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden mb-8">
              <div 
                className="bg-blue-600 h-full transition-all duration-700 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>

            <button 
              onClick={onCancel}
              className="px-6 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-full transition-colors flex items-center gap-2 mx-auto"
            >
              <i className="fa-solid fa-circle-xmark"></i>
              Cancel Analysis
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <i className="fa-solid fa-file-import text-blue-500"></i>
          Assessment Inputs
        </h2>
        <button 
          onClick={fillSample}
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 underline underline-offset-4"
        >
          Load Sample Text
        </button>
      </div>

      <div className="space-y-6 flex-grow overflow-y-auto pr-1">
        {/* PDF Upload Zone */}
        <div 
          onClick={triggerFileUpload}
          className={`group cursor-pointer border-2 border-dashed rounded-2xl p-6 transition-all flex flex-col items-center justify-center gap-3 ${
            loading ? 'opacity-50 pointer-events-none' : 'hover:border-blue-400 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 border-slate-200 dark:border-slate-700'
          }`}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".pdf" 
            className="hidden" 
          />
          <div className="w-12 h-12 bg-blue-50 dark:bg-slate-700 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <i className="fa-solid fa-file-pdf text-blue-500 text-xl"></i>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Upload PDF Document</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Full Case File (Proposal + Medical)</p>
          </div>
        </div>

        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-slate-100 dark:border-slate-700"></div>
          <span className="flex-shrink mx-4 text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest">OR USE MANUAL TEXT</span>
          <div className="flex-grow border-t border-slate-100 dark:border-slate-700"></div>
        </div>

        {/* Legend for highlights when extraction is active */}
        {extractedInfo && (
          <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 rounded text-[10px] font-bold text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
              <span className="w-2 h-2 rounded-full bg-blue-300"></span> Identity
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-purple-50 dark:bg-purple-900/20 rounded text-[10px] font-bold text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-800">
              <span className="w-2 h-2 rounded-full bg-purple-300"></span> Work
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 dark:bg-amber-900/20 rounded text-[10px] font-bold text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-800">
              <span className="w-2 h-2 rounded-full bg-amber-300"></span> Medical
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 dark:bg-green-900/20 rounded text-[10px] font-bold text-green-700 dark:text-green-300 border border-green-100 dark:border-green-800">
              <span className="w-2 h-2 rounded-full bg-green-300"></span> Riders
            </div>
          </div>
        )}

        <HighlightedTextarea 
          label="Proposal Extract"
          placeholder="Paste identity, age, occupation, habits..."
          value={proposalText}
          onChange={setProposalText}
          terms={proposalHighlights}
        />

        <HighlightedTextarea 
          label="Medical Details"
          placeholder="Paste health conditions, severity..."
          value={medicalText}
          onChange={setMedicalText}
          terms={medicalHighlights}
        />
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-xs rounded-xl flex items-start gap-3 border border-red-200 dark:border-red-800 animate-in fade-in zoom-in-95 duration-200 shadow-sm">
          <div className="bg-red-100 dark:bg-red-900/40 p-1.5 rounded-lg">
            <i className="fa-solid fa-circle-exclamation text-red-600 dark:text-red-400"></i>
          </div>
          <div>
            <p className="font-bold mb-0.5">Validation Error</p>
            <p className="leading-normal">{error}</p>
          </div>
        </div>
      )}

      <button 
        onClick={onProcess}
        disabled={loading}
        className={`mt-6 w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
          loading 
            ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none' 
            : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] shadow-blue-200 dark:shadow-none'
        }`}
      >
        <i className="fa-solid fa-bolt"></i>
        Run AI Underwriter
      </button>

      <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-100 dark:border-slate-700">
        <h4 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
          <i className="fa-solid fa-shield-halved"></i> Data Completeness Check
        </h4>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          Extraction highlights show identified entities. If terms appear incorrect, refine the text and re-run.
        </p>
      </div>
    </div>
  );
};

export default InputPanel;
