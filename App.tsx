
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

  const saveToHistory = (applicant: ApplicantInfo, report: UnderwritingResult, pText: string, mText: string) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      applicant,
      report,
      proposalText: pText,
      medicalText: mText
    };
    
    const updatedHistory = [newItem, ...history];
    setHistory(updatedHistory);
    localStorage.setItem('uw_history', JSON.stringify(updatedHistory));
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    localStorage.setItem('uw_history', JSON.stringify(updated));
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

  const handleProcess = useCallback(async () => {
    if (!proposalText.trim() && !medicalText.trim()) {
      setError('Please provide proposal details or a medical report.');
      return;
    }

    // Reset State
    setLoading(true);
    setError(null);
    setResult(null);
    setShowHistory(false); // Ensure we are looking at input
    
    // Setup Controllers
    abortControllerRef.current = new AbortController();
    const progressInterval = startProgressSimulation();

    // Setup Timeout Safety (30s)
    timeoutRef.current = setTimeout(() => {
      abortControllerRef.current?.abort();
      setError("Analysis timed out. The server is taking too long to respond. Please try again or use shorter text.");
      setLoading(false);
      clearInterval(progressInterval);
    }, 30000);

    try {
      const { applicant, missing } = await extractUnderwritingData(
        proposalText, 
        medicalText, 
        abortControllerRef.current.signal
      );
      
      // Clear timeout as soon as we get data
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
  }, [proposalText, medicalText, history]);

  const handlePdfFile = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setShowHistory(false);
    
    abortControllerRef.current = new AbortController();
    const progressInterval = startProgressSimulation();

    // Setup Timeout Safety (45s for PDF)
    timeoutRef.current = setTimeout(() => {
      abortControllerRef.current?.abort();
      setError("Analysis timed out. The PDF might be too large or complex.");
      setLoading(false);
      clearInterval(progressInterval);
    }, 45000);

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
      // Note: We don't save PDF text to history as it's binary/image based usually, 
      // but we save the extracted result.
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
  }, [history]);

  const handleReset = () => {
    setResult(null);
    setProposalText('');
    setMedicalText('');
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col text-slate-900 dark:text-slate-100">
      <div className="no-print">
        <Header 
          onToggleHistory={() => setShowHistory(!showHistory)} 
          showHistory={showHistory} 
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      </div>
      
      <main className="flex-grow container mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className={`lg:col-span-5 space-y-6 no-print ${result && !showHistory ? 'hidden lg:block' : ''}`}>
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

        <div className={`lg:col-span-7 ${!result ? 'hidden lg:flex items-center justify-center' : ''}`}>
          {result ? (
            <ReportView 
              applicant={result.applicant} 
              report={result.report} 
              onReset={handleReset} 
            />
          ) : (
            <div className="text-center p-12 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border-2 border-dashed border-slate-200 dark:border-slate-700 w-full no-print">
              <div className="bg-slate-50 dark:bg-slate-700 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fa-solid fa-file-shield text-3xl text-slate-300 dark:text-slate-500"></i>
              </div>
              <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-200">Ready for Assessment</h3>
              <p className="text-slate-500 dark:text-slate-400 mt-2">Submit proposal and medical data or upload a PDF to generate the automated underwriting report.</p>
              {!showHistory && history.length > 0 && (
                <button 
                  onClick={() => setShowHistory(true)}
                  className="mt-6 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 underline underline-offset-4"
                >
                  View Past Cases
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      <footer className="py-6 text-center text-slate-400 text-sm border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 no-print">
        PGDM – IBM: Life Insurance Underwriting Tool &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default App;
