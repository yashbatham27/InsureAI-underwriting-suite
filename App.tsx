import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ApplicantInfo, UnderwritingResult, HistoryItem } from './types';
import { extractUnderwritingData, extractUnderwritingDataFromPDF } from './services/geminiService';
import { runUnderwriting } from './logic/underwriter';
import Header from './components/Header';
import InputPanel from './components/InputPanel';
import ReportView from './components/ReportView';
import HistoryPanel from './components/HistoryPanel';

const App: React.FC = () => {
  const [proposalText, setProposalText] = useState('');
  const [medicalText, setMedicalText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ applicant: ApplicantInfo, report: UnderwritingResult } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load history from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('uw_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Theme effect
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // OPTIMIZATION: Functional state update prevents stale closures
  const saveToHistory = useCallback((applicant: ApplicantInfo, report: UnderwritingResult, pText: string, mText: string) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      applicant,
      report,
      proposalText: pText,
      medicalText: mText
    };
    
    setHistory(prev => {
      const updatedHistory = [newItem, ...prev];
      localStorage.setItem('uw_history', JSON.stringify(updatedHistory));
      return updatedHistory;
    });
  }, []);

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory(prev => {
      const updated = prev.filter(item => item.id !== id);
      localStorage.setItem('uw_history', JSON.stringify(updated));
      return updated;
    });
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setProposalText(item.proposalText);
    setMedicalText(item.medicalText);
    setResult({ applicant: item.applicant, report: item.report });
    setShowHistory(false);
  };

  const startProgressSimulation = () => {
    setProgress(0);
    const steps = [
      { p: 15, msg: 'Reading input data...' },
      { p: 40, msg: 'Identifying applicant details...' },
      { p: 65, msg: 'Analyzing medical risks...' },
      { p: 85, msg: 'Cross-referencing mortality tables...' },
      { p: 95, msg: 'Finalizing assessment...' }
    ];
    
    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setLoadingStep(steps[currentStep].msg);
        setProgress(steps[currentStep].p);
        currentStep++;
      } else {
        clearInterval(interval);
      }
    }, 1200);
    
    return interval;
  };

  const clearProcess = () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setLoading(false);
    setProgress(0);
    setLoadingStep('');
  };

  const handleCancel = useCallback(() => {
    clearProcess();
    setError('Operation cancelled by user.');
  }, []);

  // Removed `history` from dependency array thanks to functional state update
  const handleProcess = useCallback(async () => {
    if (!proposalText.trim() && !medicalText.trim()) {
      setError('Please provide proposal details or a medical report.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setShowHistory(false);
    
    abortControllerRef.current = new AbortController();
    const progressInterval = startProgressSimulation();

    timeoutRef.current = setTimeout(() => {
      abortControllerRef.current?.abort();
      setError("Analysis timed out. The server is taking too long to respond. Please try again or use shorter text.");
      setLoading(false);
      clearInterval(progressInterval);
    }, 60000);

    try {
      const { applicant, missing } = await extractUnderwritingData(
        proposalText, 
        medicalText, 
        abortControllerRef.current.signal
      );
      
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      if (missing.length > 0) {
        setError(`Incomplete Data Found. Missing: ${missing.join(', ')}`);
        setLoading(false);
        clearInterval(progressInterval);
        return;
      }

      const report = runUnderwriting(applicant);
      setResult({ applicant, report });
      saveToHistory(applicant, report, proposalText, medicalText);

    } catch (err: any) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (err.message === 'Aborted') return;
      
      console.error(err);
      if (err.message?.includes('Rpc failed') || err.message?.includes('xhr error')) {
        setError("Network error: The AI service is currently unreachable or the request was too large. Please try again.");
      } else {
        setError("Extraction failed. Please ensure the text is clear and contains relevant underwriting info.");
      }
    } finally {
      clearInterval(progressInterval);
      setLoading(false);
      setProgress(0);
      setLoadingStep('');
    }
  }, [proposalText, medicalText, saveToHistory]);

  const handlePdfFile = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setShowHistory(false);
    
    abortControllerRef.current = new AbortController();
    const progressInterval = startProgressSimulation();

    timeoutRef.current = setTimeout(() => {
      abortControllerRef.current?.abort();
      setError("Analysis timed out. The PDF might be too large or complex.");
      setLoading(false);
      clearInterval(progressInterval);
    }, 90000);

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const base64String = (reader.result as string).split(',')[1];
          resolve(base64String);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      
      const base64Data = await base64Promise;
      const { applicant, missing } = await extractUnderwritingDataFromPDF(
        base64Data,
        abortControllerRef.current.signal
      );

      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      if (missing.length > 0) {
        setError(`The PDF is missing required information: ${missing.join(', ')}`);
        setLoading(false);
        clearInterval(progressInterval);
        return;
      }

      const report = runUnderwriting(applicant);
      setResult({ applicant, report });
      saveToHistory(applicant, report, "PDF Upload", "PDF Upload");

    } catch (err: any) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (err.message === 'Aborted') return;
      
      console.error(err);
      if (err.message?.includes('Rpc failed') || err.message?.includes('xhr error')) {
        setError("Network error: The AI service is currently unreachable or the PDF is too large (Limit: ~3MB).");
      } else {
        setError('Failed to analyze PDF. Ensure it contains a clear Proposal and Medical Report.');
      }
    } finally {
      clearInterval(progressInterval);
      setLoading(false);
      setProgress(0);
      setLoadingStep('');
    }
  }, [saveToHistory]);

  const handleReset = () => {
    setResult(null);
    setProposalText('');
    setMedicalText('');
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col text-slate-900 dark:text-slate-100 selection:bg-blue-500/30">
      <div className="no-print z-50 relative">
        <Header 
          onToggleHistory={() => setShowHistory(!showHistory)} 
          showHistory={showHistory} 
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      </div>
      
      <main className="flex-grow container mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        
        {/* Input/History Side */}
        <div className={`lg:col-span-5 space-y-6 no-print transition-all duration-500 ${result && !showHistory ? 'hidden lg:block' : ''}`}>
          {showHistory ? (
            <HistoryPanel 
              history={history} 
              onLoad={loadHistoryItem} 
              onDelete={deleteHistoryItem}
              onClose={() => setShowHistory(false)}
            />
          ) : (
            <InputPanel 
              proposalText={proposalText}
              setProposalText={setProposalText}
              medicalText={medicalText}
              setMedicalText={setMedicalText}
              onProcess={handleProcess}
              onPdfUpload={handlePdfFile}
              onCancel={handleCancel}
              loading={loading}
              loadingStep={loadingStep}
              progress={progress}
              error={error}
              extractedInfo={result?.applicant || null}
            />
          )}
        </div>

        {/* Output/Empty State Side */}
        <div className={`lg:col-span-7 transition-all duration-500 ${!result ? 'hidden lg:flex items-center justify-center' : ''}`}>
          {result ? (
            <ReportView 
              applicant={result.applicant} 
              report={result.report} 
              onReset={handleReset} 
            />
          ) : (
            <div className="text-center p-12 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl shadow-2xl shadow-blue-900/5 border border-slate-200/60 dark:border-slate-800 w-full no-print relative overflow-hidden group">
              
              {/* Background Glows */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-colors duration-700"></div>
              
              <div className="relative z-10">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-inner border border-white/50 dark:border-slate-700 group-hover:-translate-y-2 transition-transform duration-500">
                  <i className="fa-solid fa-microchip text-5xl bg-clip-text text-transparent bg-gradient-to-br from-blue-500 to-indigo-600"></i>
                </div>
                
                <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight mb-3">System Standby</h3>
                <p className="text-slate-500 dark:text-slate-400 font-medium max-w-sm mx-auto leading-relaxed">
                  Provide proposal details, clinical history, or upload a full PDF dossier to initiate the AI underwriting sequence.
                </p>
                
                {!showHistory && history.length > 0 && (
                  <button 
                    onClick={() => setShowHistory(true)}
                    className="mt-8 px-6 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-800 transition-all shadow-sm hover:shadow flex items-center gap-2 mx-auto"
                  >
                    <i className="fa-solid fa-clock-rotate-left"></i> Load Previous Assessment
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="py-6 text-center text-slate-400 text-xs font-bold uppercase tracking-widest border-t border-slate-100 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md no-print relative z-10">
        PGDM – IBM: Life Insurance Underwriting Tool &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default App;