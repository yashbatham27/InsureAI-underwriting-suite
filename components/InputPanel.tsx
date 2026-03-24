import React, { useRef, useEffect } from 'react';
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
  icon: string;
}

const HighlightedTextarea: React.FC<HighlightedTextareaProps> = ({ value, onChange, placeholder, terms, label, icon }) => {
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

    const validTerms = terms.filter(t => t.text && t.text.length > 2);
    if (!validTerms.length) return value;

    const sortedTerms = [...validTerms].sort((a, b) => b.text.length - a.text.length);
    const pattern = sortedTerms.map(t => t.text.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|');
    const regex = new RegExp(`(${pattern})`, 'gi');

    const parts = value.split(regex);
    return parts.map((part, i) => {
      const match = sortedTerms.find(t => t.text.toLowerCase() === part.toLowerCase());
      if (match) {
        return (
          <mark key={i} className={`${match.color} rounded text-transparent shadow-[0_0_10px_currentColor] opacity-40 mix-blend-multiply dark:mix-blend-screen`}>
            {part}
          </mark>
        );
      }
      return part;
    });
  };

  return (
    <div className="relative group flex flex-col">
      <div className="flex justify-between items-center mb-2 px-1">
        <label className="flex items-center gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          <i className={`fa-solid ${icon} text-blue-500`}></i> {label}
        </label>
        {value.length > 0 && (
          <button
            onClick={() => onChange('')}
            className="text-[10px] text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400 font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-900/20"
            title="Clear text"
          >
            <i className="fa-solid fa-eraser"></i> Clear
          </button>
        )}
      </div>
      
      {/* Container ensures identical sizing for both layers */}
      <div className="relative min-h-[140px] h-36 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 group-focus-within:border-blue-500 dark:group-focus-within:border-blue-500 group-focus-within:ring-4 ring-blue-500/10 transition-all overflow-hidden shadow-inner">
        
        {/* Backdrop (Highlights) - Using font-mono ensures precise character alignment */}
        <div
          ref={backdropRef}
          aria-hidden="true"
          className="absolute inset-0 p-4 text-sm font-mono leading-relaxed whitespace-pre-wrap break-words overflow-y-auto pointer-events-none text-transparent z-0"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }} // Hide scrollbar to prevent offset
        >
          {renderHighlights()}
          {"\n"}
        </div>
        
        {/* Foreground (Actual Input) */}
        <textarea
          ref={textareaRef}
          onScroll={syncScroll}
          className="absolute inset-0 w-full h-full p-4 text-sm font-mono leading-relaxed bg-transparent text-slate-800 dark:text-slate-200 resize-none outline-none z-10 caret-blue-600 dark:caret-blue-400 custom-scrollbar"
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
    // EXPANDED DATA POOLS
    const maleNames = ["Rajesh", "Amit", "Vikram", "Rahul", "Sanjay", "Mohammed", "Rohan", "Arjun", "Karan", "Siddharth", "Aarav", "Tariq", "Surya", "Aditya"];
    const femaleNames = ["Priya", "Sneha", "Anjali", "Meera", "Kavita", "Zara", "Sunita", "Aisha", "Neha", "Pooja", "Riya", "Fatima", "Diya", "Nandini"];
    const lastNames = ["Sharma", "Patel", "Verma", "Singh", "Gupta", "Kumar", "Desai", "Reddy", "Iyer", "Khan", "Nair", "Das", "Joshi", "Bose", "Chauhan"];

    const occupations = [
      "Software Engineer", "Commercial pilots", "Drivers - Public carriers", "Professional Athletes", 
      "Merchant navy", "Oil and Natural Gas Industry", "Data Analyst", "Underground Miner", 
      "School Teacher", "Investment Banker", "Stunt Double", "General Physician", 
      "Construction Worker", "Retail Shop Owner", "Armed Forces Personnel"
    ];

    const random = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
    
    const isMale = Math.random() > 0.5;
    const name = `${isMale ? random(maleNames) : random(femaleNames)} ${random(lastNames)}`;
    const age = Math.floor(Math.random() * (60 - 25 + 1)) + 25;
    const occupation = random(occupations);
    
    const baseIncomeLakhs = Math.floor(Math.random() * 57) + 3;
    const variance = Math.floor(Math.random() * 99) * 1000;
    const avgIncome = (baseIncomeLakhs * 100000) + variance;
    
    const saMultiplier = Math.floor(Math.random() * 30) + 5; 
    const exactSumAssured = avgIncome * saMultiplier; 
    const sumAssured = Math.round(exactSumAssured / 100000) * 100000;

    const habitScenarios = [
      "No risky habits. Non-smoker and Teetotaler.",
      "Smoking: Regular (moderate). Alcoholic drinks: Occasionally.",
      "Tobacco: Regular (high dose). Smoking: Occasionally.",
      "Alcoholic drinks: Regular (moderate).",
      "Smoking: Chain smoker (heavy). Alcoholic drinks: Regular (heavy). History of substance abuse (marijuana).",
      "Occasional social drinker (1-2 drinks per month). Denies any tobacco use.",
      "Vapes daily. No alcohol or other substance use.",
      "Chews tobacco (regular). Non-drinker."
    ];

    const famHistoryScenarios = [
      "Both Surviving > age 65",
      "Only one surviving > age 65",
      "Both died < age 65",
      "Father died at 52 (Cardiac Arrest). Mother surviving at 68.",
      "Mother died at 45 (Breast Cancer). Father surviving at 70.",
      "Both parents alive and in excellent health (Father 72, Mother 69)."
    ];

    const proposal = `**APPLICATION SUMMARY**
---------------------
**Applicant Details:**
Name: ${name}
Age: ${age}
Gender: ${isMale ? "Male" : "Female"}

**Financials & Occupation:**
Occupation: ${occupation}
Average Income (Last 3 Years): ₹${avgIncome.toLocaleString('en-IN')}
Requested Sum Assured: ₹${sumAssured.toLocaleString('en-IN')}
Requested Riders: Accidental Death Benefit, Critical Illness Cover

**Lifestyle & Background:**
Family History Status: ${random(famHistoryScenarios)}
Personal Habits: ${random(habitScenarios)}
`;

    const medicalScenarios = [
      {
        text: "Perfectly healthy individual. All vital signs are within normal parameters. No current medications. Lipid profile and fasting blood sugar are excellent.",
        bmi: 23.5, bp: "118/78"
      },
      {
        text: "Patient presents with Hyper Tension (Severity level 3: With middle dose medication). Routine checkup reveals Obese classification. ECG shows mild Left Ventricular Hypertrophy.",
        bmi: 31.4, bp: "145/92"
      },
      {
        text: "Diagnosed with Diabetes Mellitus (Severity level 2: With basic medicines). Co-morbidity present with Thyroid (Severity level 1: Border line - managing without medicine). HbA1c is 7.2%.",
        bmi: 26.2, bp: "125/82"
      },
      {
        text: "History of Asthma (Severity level 4: Very high dose medication). Patient is severely underweight. Chest X-ray indicates chronic bronchial changes.",
        bmi: 17.5, bp: "110/70"
      },
      {
        text: "Patient complains of Gut disorder (Severity level 2: With basic medicines). Otherwise healthy. LFTs are within normal limits.",
        bmi: 22.1, bp: "120/80"
      },
      {
        text: "Morbid obesity noted. Mild Sleep Apnea reported (Severity level 2). Liver enzymes (SGOT/SGPT) slightly elevated indicating possible fatty liver.",
        bmi: 38.2, bp: "150/95"
      },
      {
        text: "History of mild depression (Severity level 1: fully recovered, no current medication). Physical exam is completely unremarkable. Cardiovascular system normal.",
        bmi: 21.8, bp: "115/75"
      },
      {
        text: "Patient has elevated cholesterol levels (Severity level 2: taking statins). Family history of premature coronary artery disease. Fasting blood sugar is 98 mg/dL.",
        bmi: 28.5, bp: "135/85"
      }
    ];

    const scenario = random(medicalScenarios);

    const medical = `**MEDICAL EXAMINER REPORT**
-------------------------
**Clinical History & Observations:**
${scenario.text}

**Biometrics:**
- Height: 172cm
- Weight calculated to BMI: ${scenario.bmi}
- Blood Pressure: ${scenario.bp} mmHg

**Physician Notes:**
Review requested against EMR factor load tables for existing conditions and co-morbidities. Laboratory tests attached in Annexure A.
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

  // Extract highlight strings safely
  const extractString = (val: string | number | undefined | null) => val ? val.toString() : '';

  const proposalHighlights = extractedInfo ? [
    { text: extractString(extractedInfo.name), color: 'bg-blue-400 text-blue-400' },
    { text: extractString(extractedInfo.occupation), color: 'bg-purple-400 text-purple-400' },
    { text: extractString(extractedInfo.age), color: 'bg-blue-400 text-blue-400' },
    { text: extractString(extractedInfo.sumAssured), color: 'bg-green-400 text-green-400' },
    { text: extractString((extractedInfo as any).averageIncome || (extractedInfo as any).income), color: 'bg-emerald-400 text-emerald-400' },
  ].filter(h => h.text.length > 2) : [];

  const medicalHighlights = extractedInfo && extractedInfo.medicalConditions ? extractedInfo.medicalConditions.map(c => ({
    text: c.name,
    color: 'bg-amber-400 text-amber-400'
  })) : [];

  return (
    <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200/60 dark:border-slate-800 flex flex-col h-full overflow-hidden relative transition-colors duration-300">
      
      {/* High-Tech Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 z-50 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md animate-in fade-in duration-500">
          <div className="w-full max-w-[320px] bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 relative overflow-hidden">
            {/* Scanning line animation */}
            <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,1)] animate-[scan_2s_ease-in-out_infinite]"></div>
            
            <div className="mb-6 relative">
              <div className="w-20 h-20 border-4 border-slate-100 dark:border-slate-700 border-t-blue-500 border-r-blue-500 rounded-full animate-spin mx-auto shadow-lg shadow-blue-500/20"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <i className="fa-solid fa-microchip text-blue-500 text-2xl animate-pulse"></i>
              </div>
            </div>
            
            <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-2 tracking-tight">AI Underwriter Active</h3>
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-6 min-h-[40px] leading-relaxed flex items-center justify-center gap-2">
              <i className="fa-solid fa-circle-notch animate-spin text-xs"></i> {loadingStep}
            </p>
            
            <div className="w-full bg-slate-100 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden mb-8 shadow-inner">
              <div 
                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full transition-all duration-700 ease-out relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-[shimmer_1s_infinite]"></div>
              </div>
            </div>

            <button 
              onClick={onCancel}
              className="px-6 py-2.5 bg-slate-50 dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:text-rose-600 dark:hover:text-rose-400 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 mx-auto border border-slate-200 dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-800"
            >
              <i className="fa-solid fa-stop"></i> Abort Process
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-3 tracking-tight">
            <div className="bg-blue-100 dark:bg-blue-500/20 p-2 rounded-lg">
              <i className="fa-solid fa-folder-open text-blue-600 dark:text-blue-400"></i>
            </div>
            Case Assembly
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium ml-11">Provide proposal and medical reports.</p>
        </div>
        <button 
          onClick={fillSample}
          className="group text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 hover:text-indigo-600 dark:hover:text-indigo-400 px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 border border-slate-200 dark:border-slate-700"
        >
          <i className="fa-solid fa-wand-magic-sparkles text-indigo-500 group-hover:animate-pulse"></i> Auto-Fill Sample
        </button>
      </div>

      <div className="space-y-6 flex-grow overflow-y-auto pr-2 custom-scrollbar">
        
        {/* Interactive Dropzone */}
        <div 
          onClick={triggerFileUpload}
          className={`group cursor-pointer relative rounded-3xl p-8 transition-all flex flex-col items-center justify-center gap-4 overflow-hidden bg-slate-50 dark:bg-slate-800/30 ${
            loading ? 'opacity-50 pointer-events-none' : 'hover:bg-blue-50/50 dark:hover:bg-blue-900/20 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-1'
          }`}
        >
          {/* Animated dashed border using SVG for smooth corners */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            <rect 
              x="2" y="2" 
              width="calc(100% - 4px)" height="calc(100% - 4px)" 
              rx="22" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeDasharray="8 8" 
              className="text-slate-300 dark:text-slate-600 group-hover:text-blue-400 dark:group-hover:text-blue-500 transition-colors duration-300 group-hover:animate-[spin_20s_linear_infinite]"
            />
          </svg>

          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf" className="hidden" />
          
          <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-md group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300 relative z-10 border border-slate-100 dark:border-slate-700">
            <i className="fa-solid fa-file-pdf text-rose-500 text-3xl"></i>
          </div>
          <div className="text-center relative z-10">
            <p className="text-base font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Upload PDF Dossier</p>
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-1">Drag & drop or click to browse</p>
          </div>
        </div>

        <div className="flex items-center gap-4 py-2 opacity-50">
          <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
          <span className="flex-shrink text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Manual Input Mode</span>
          <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
        </div>

        {/* Extracted Info Badges */}
        {extractedInfo && (
          <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2">
            {[
              { label: 'Identity', icon: 'fa-id-card', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-500/20 border-blue-200 dark:border-blue-500/30' },
              { label: 'Work', icon: 'fa-briefcase', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-500/20 border-purple-200 dark:border-purple-500/30' },
              { label: 'Medical', icon: 'fa-stethoscope', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-500/20 border-amber-200 dark:border-amber-500/30' },
              { label: 'Financials', icon: 'fa-coins', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-500/20 border-green-200 dark:border-green-500/30' },
            ].map((badge, idx) => (
              <div key={idx} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border ${badge.bg} ${badge.color} shadow-sm transition-all hover:scale-105`}>
                <i className={`fa-solid ${badge.icon}`}></i> {badge.label} Captured
              </div>
            ))}
          </div>
        )}

        {/* Highlighted Text Areas */}
        <HighlightedTextarea 
          icon="fa-file-signature"
          label="Proposal Application Extract"
          placeholder="Paste identity, age, income, sum assured, family history, habits..."
          value={proposalText}
          onChange={setProposalText}
          terms={proposalHighlights}
        />

        <HighlightedTextarea 
          icon="fa-file-medical"
          label="Medical Examiner Report"
          placeholder="Paste BMI, health conditions, severities, physician notes..."
          value={medicalText}
          onChange={setMedicalText}
          terms={medicalHighlights}
        />
      </div>

      {error && (
        <div className="mt-6 p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 text-xs rounded-2xl flex items-start gap-3 border border-rose-200 dark:border-rose-800/50 animate-in fade-in zoom-in-95 duration-200 shadow-sm">
          <div className="bg-white dark:bg-rose-900/50 p-2 rounded-xl shadow-sm border border-rose-100 dark:border-transparent">
            <i className="fa-solid fa-triangle-exclamation text-rose-500 text-lg"></i>
          </div>
          <div className="pt-0.5">
            <p className="font-black uppercase tracking-wider mb-1">Validation Error</p>
            <p className="font-medium leading-relaxed opacity-90">{error}</p>
          </div>
        </div>
      )}

      {/* Main Action Button */}
      <div className="pt-6 mt-2">
        <button 
          onClick={onProcess}
          disabled={loading || (!proposalText && !medicalText)}
          className={`group relative w-full py-5 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all duration-300 overflow-hidden ${
            loading || (!proposalText && !medicalText)
              ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-200 dark:border-slate-700' 
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 active:translate-y-0 active:shadow-none'
          }`}
        >
          {/* Shimmer effect on active button */}
          {!loading && (proposalText || medicalText) && (
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shimmer_1.5s_infinite]"></div>
          )}
          <i className={`fa-solid fa-bolt text-lg ${!loading && (proposalText || medicalText) ? 'text-yellow-300 group-hover:scale-125 transition-transform duration-300 drop-shadow-[0_0_8px_rgba(253,224,71,0.5)]' : ''}`}></i>
          Execute AI Assessment
        </button>
      </div>

    </div>
  );
};

export default InputPanel;