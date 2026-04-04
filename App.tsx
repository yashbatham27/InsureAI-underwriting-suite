import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  ApplicantInfo,
  UnderwritingResult,
  HistoryItem,
  Transaction,
  RiskScore,
  MedicalParameter,
  FraudFlag,
} from "./types";
import {
  extractUnderwritingData,
  extractUnderwritingDataFromPDF,
} from "./services/geminiService";
import { runUnderwriting } from "./logic/underwriter";
import Header from "./components/Header";
import InputPanel from "./components/InputPanel";
import ReportView from "./components/ReportView";
import HistoryPanel from "./components/HistoryPanel";
import InteractiveInvestigationMode from "./components/InteractiveInvestigationMode";
import ScenarioComparisonDashboard from "./components/ScenarioComparisonDashboard";
import SmartFraudFlagCard from "./components/SmartFraudFlagCard";

const App: React.FC = () => {
  const [proposalText, setProposalText] = useState("");
  const [medicalText, setMedicalText] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [progress, setProgress] = useState(0);
  const [financialText, setFinancialText] = useState('');
  const [result, setResult] = useState<{
    applicant: ApplicantInfo;
    report: UnderwritingResult;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Advanced features state
  const [activeFeature, setActiveFeature] = useState<
    "report" | "investigation" | "scenario" | "fraud"
  >("report");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [medicalParams, setMedicalParams] = useState<MedicalParameter[]>([]);
  const [fraudFlags, setFraudFlags] = useState<FraudFlag[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("uw_history");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  // UPDATED: Now saves financial text and all AI-extracted arrays
  const saveToHistory = useCallback(
    (
      applicant: ApplicantInfo,
      report: UnderwritingResult,
      pText: string,
      mText: string,
      fText: string,
      txs: Transaction[],
      scenarios: MedicalParameter[],
      flags: FraudFlag[]
    ) => {
      const newItem: HistoryItem = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        applicant,
        report,
        proposalText: pText,
        medicalText: mText,
        financialText: fText,
        transactions: txs,
        scenarios: scenarios,
        fraudFlags: flags
      };

      setHistory((prev) => {
        const updatedHistory = [newItem, ...prev];
        localStorage.setItem("uw_history", JSON.stringify(updatedHistory));
        return updatedHistory;
      });
    },
    [],
  );

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      localStorage.setItem("uw_history", JSON.stringify(updated));
      return updated;
    });
  };

  // UPDATED: Now fully restores financial text and the dashboards
  const loadHistoryItem = (item: HistoryItem) => {
    setProposalText(item.proposalText);
    setMedicalText(item.medicalText);
    setFinancialText(item.financialText || ""); // Restore financial text
    setResult({ applicant: item.applicant, report: item.report });
    setShowHistory(false);
    setActiveFeature("report");
    
    // Restore the dashboards using saved data (or empty arrays for old saves)
    generateAdvancedFeaturesData(
      item.applicant, 
      item.report, 
      item.transactions || [], 
      item.scenarios || [], 
      item.fraudFlags || []
    );
  };

  const startProgressSimulation = () => {
    setProgress(0);
    const steps = [
      { p: 15, msg: "Reading input data..." },
      { p: 30, msg: "Identifying applicant details..." },
      { p: 50, msg: "Running forensic financial scan..." }, 
      { p: 70, msg: "Generating predictive health scenarios..." },
      { p: 85, msg: "Cross-referencing mortality tables..." },
      { p: 95, msg: "Finalizing assessment..." },
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
    setLoadingStep("");
  };

  const generateAdvancedFeaturesData = useCallback(
    (
      applicant: ApplicantInfo, 
      report: UnderwritingResult, 
      extractedTransactions: Transaction[],
      extractedScenarios: MedicalParameter[],
      extractedFraudFlags: FraudFlag[]
    ) => {
      setTransactions(extractedTransactions);
      setMedicalParams(extractedScenarios);

      const combinedFraudFlags: FraudFlag[] = [...extractedFraudFlags];

      if (report.totalExtraMortalityPoints > 150) {
        combinedFraudFlags.push({
          id: `high-emr-${Date.now()}`,
          signature: "Elevated Mortality Risk",
          severity: "High",
          reason: "EMR score significantly above standard underwriting guidelines (Rule Engine Detection).",
          evidence: `Total EMR: ${report.totalExtraMortalityPoints} points`,
          action: "Schedule Manual Review",
        });
      }

      setFraudFlags(combinedFraudFlags);
    },
    [],
  );

  const handleParameterToggle = useCallback((index: number) => {
    setMedicalParams((prev) =>
      prev.map((param, i) =>
        i === index ? { ...param, toggle: !param.toggle } : param,
      ),
    );
  }, []);

  const calculateAdjustedRisk = useCallback(
    (baseRisk: number, params: MedicalParameter[]) => {
      let adjustedRisk = baseRisk;

      params.forEach((param) => {
        if (param.toggle) {
          adjustedRisk += (param.impactDelta || 0);
        }
      });

      return Math.max(0, adjustedRisk);
    },
    [],
  );

  const handleFraudAction = useCallback((action: string) => {
    if (action.includes("Investigation Mode") || action.includes("Review")) {
      setActiveFeature("investigation");
      return;
    }
    alert(`Action triggered: ${action}`);
  }, []);

  const handleCancel = useCallback(() => {
    clearProcess();
    setError("Operation cancelled by user.");
  }, []);

  const handleProcess = useCallback(async () => {
    if (!proposalText.trim() && !medicalText.trim() && !financialText.trim()) {
      setError("Please provide proposal details, a medical report, or financial data.");
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
      setError(
        "Analysis timed out. The server is taking too long to respond. Please try again or use shorter text.",
      );
      setLoading(false);
      clearInterval(progressInterval);
    }, 60000);

    try {
      const { 
        applicant, 
        transactions: extractedTxs, 
        scenarios: extractedScenarios,
        fraudFlags: extractedFlags,
        missing 
      } = await extractUnderwritingData(
        proposalText,
        medicalText,
        financialText, 
        abortControllerRef.current.signal,
      );

      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      if (missing.length > 0) {
        setError(`Incomplete Data Found. Missing: ${missing.join(", ")}`);
        setLoading(false);
        clearInterval(progressInterval);
        return;
      }

      const report = runUnderwriting(applicant);
      setResult({ applicant, report });
      
      // Pass all dynamic AI data to the feature generation function
      generateAdvancedFeaturesData(applicant, report, extractedTxs, extractedScenarios, extractedFlags);

      // UPDATED: Save everything to history
      saveToHistory(
        applicant, 
        report, 
        proposalText, 
        medicalText, 
        financialText, 
        extractedTxs, 
        extractedScenarios, 
        extractedFlags
      );
      
    } catch (err: any) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (err.message === "Aborted") return;

      console.error(err);
      if (
        err.message?.includes("Rpc failed") ||
        err.message?.includes("xhr error")
      ) {
        setError(
          "Network error: The AI service is currently unreachable or the request was too large. Please try again.",
        );
      } else {
        setError(
          "Extraction failed. Please ensure the text is clear and contains relevant underwriting info.",
        );
      }
    } finally {
      clearInterval(progressInterval);
      setLoading(false);
      setProgress(0);
      setLoadingStep("");
    }
  }, [proposalText, medicalText, financialText, saveToHistory, generateAdvancedFeaturesData]);

  const handlePdfFile = useCallback(
    async (file: File) => {
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
            const base64String = (reader.result as string).split(",")[1];
            resolve(base64String);
          };
          reader.onerror = reject;
        });
        reader.readAsDataURL(file);

        const base64Data = await base64Promise;
        
        const { 
          applicant, 
          transactions: extractedTxs, 
          scenarios: extractedScenarios,
          fraudFlags: extractedFlags,
          missing 
        } = await extractUnderwritingDataFromPDF(
          base64Data,
          abortControllerRef.current.signal,
        );

        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        if (missing.length > 0) {
          setError(
            `The PDF is missing required information: ${missing.join(", ")}`,
          );
          setLoading(false);
          clearInterval(progressInterval);
          return;
        }

        const report = runUnderwriting(applicant);
        setResult({ applicant, report });
        
        generateAdvancedFeaturesData(applicant, report, extractedTxs, extractedScenarios, extractedFlags);

        // UPDATED: Save everything to history (using 'PDF Upload' as placeholder text for inputs)
        saveToHistory(
          applicant, 
          report, 
          "PDF Upload", 
          "PDF Upload", 
          "PDF Upload", 
          extractedTxs, 
          extractedScenarios, 
          extractedFlags
        );
        
      } catch (err: any) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (err.message === "Aborted") return;

        console.error(err);
        if (
          err.message?.includes("Rpc failed") ||
          err.message?.includes("xhr error")
        ) {
          setError(
            "Network error: The AI service is currently unreachable or the PDF is too large (Limit: ~3MB).",
          );
        } else {
          setError(
            "Failed to analyze PDF. Ensure it contains a clear Proposal and Medical Report.",
          );
        }
      } finally {
        clearInterval(progressInterval);
        setLoading(false);
        setProgress(0);
        setLoadingStep("");
      }
    },
    [saveToHistory, generateAdvancedFeaturesData],
  );

  const handleReset = () => {
    setResult(null);
    setProposalText("");
    setMedicalText("");
    setFinancialText("");
    setError(null);
    setActiveFeature("report");
    setTransactions([]);
    setMedicalParams([]);
    setFraudFlags([]);
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
        <div
          className={`lg:col-span-5 space-y-6 no-print transition-all duration-500 ${result && !showHistory ? "hidden lg:block" : ""}`}
        >
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
              financialText={financialText}
              setFinancialText={setFinancialText}
              onProcess={handleProcess}
              onPdfUpload={handlePdfFile}
              onCancel={handleCancel}
              loading={loading}
              loadingStep={loadingStep}
              progress={progress}
              error={error}
              extractedInfo={result?.applicant || null}
              transactions={transactions} 
            />
          )}
        </div>

        <div
          className={`lg:col-span-7 transition-all duration-500 ${!result ? "hidden lg:flex items-center justify-center" : ""}`}
        >
          {result ? (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex gap-2 overflow-x-auto">
                  <button
                    onClick={() => setActiveFeature("report")}
                    className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                      activeFeature === "report"
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                        : "text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                    }`}
                  >
                    <i className="fa-solid fa-file-alt mr-2"></i>
                    Underwriting Report
                  </button>
                  <button
                    onClick={() => setActiveFeature("investigation")}
                    className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                      activeFeature === "investigation"
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                        : "text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                    }`}
                  >
                    <i className="fa-solid fa-search mr-2"></i>
                    Investigation Mode
                  </button>
                  <button
                    onClick={() => setActiveFeature("scenario")}
                    className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                      activeFeature === "scenario"
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                        : "text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                    }`}
                  >
                    <i className="fa-solid fa-chart-line mr-2"></i>
                    Scenario Analysis
                  </button>
                  <button
                    onClick={() => setActiveFeature("fraud")}
                    className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                      activeFeature === "fraud"
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                        : "text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                    }`}
                  >
                    <i className="fa-solid fa-shield-alt mr-2"></i>
                    Fraud Detection
                    {fraudFlags.length > 0 && (
                      <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                        {fraudFlags.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              <div className="transition-all duration-300">
                {activeFeature === "report" && (
                  <ReportView
                    applicant={result.applicant}
                    report={result.report}
                    onReset={handleReset}
                  />
                )}

                {activeFeature === "investigation" && (
                  <InteractiveInvestigationMode transactions={transactions} />
                )}

                {activeFeature === "scenario" && (
                  <ScenarioComparisonDashboard
                    currentRisk={{
                      current: result.report.totalExtraMortalityPoints,
                      adjusted: calculateAdjustedRisk(
                        result.report.totalExtraMortalityPoints,
                        medicalParams,
                      ),
                    }}
                    medicalParams={medicalParams}
                    onParameterToggle={handleParameterToggle}
                  />
                )}

                {activeFeature === "fraud" && (
                  <div className="space-y-4">
                    {fraudFlags.length > 0 ? (
                      fraudFlags.map((flag) => (
                        <SmartFraudFlagCard
                          key={flag.id}
                          flag={flag}
                          onAction={handleFraudAction}
                        />
                      ))
                    ) : (
                      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 text-center">
                        <i className="fa-solid fa-shield-check text-4xl text-green-500 mb-4"></i>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">
                          No Fraud Flags Detected
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400">
                          The underwriting assessment appears clean with no
                          significant red flags.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center p-12 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl shadow-2xl shadow-blue-900/5 border border-slate-200/60 dark:border-slate-800 w-full no-print relative overflow-hidden group">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-colors duration-700"></div>

              <div className="relative z-10">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-inner border border-white/50 dark:border-slate-700 group-hover:-translate-y-2 transition-transform duration-500">
                  <i className="fa-solid fa-microchip text-5xl bg-clip-text text-transparent bg-gradient-to-br from-blue-500 to-indigo-600"></i>
                </div>

                <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight mb-3">
                  System Standby
                </h3>
                <p className="text-slate-500 dark:text-slate-400 font-medium max-w-sm mx-auto leading-relaxed">
                  Provide proposal details, clinical history, or upload a full
                  PDF dossier to initiate the AI underwriting sequence.
                </p>

                {!showHistory && history.length > 0 && (
                  <button
                    onClick={() => setShowHistory(true)}
                    className="mt-8 px-6 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-800 transition-all shadow-sm hover:shadow flex items-center gap-2 mx-auto"
                  >
                    <i className="fa-solid fa-clock-rotate-left"></i> Load
                    Previous Assessment
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="py-6 text-center text-slate-400 text-xs font-bold uppercase tracking-widest border-t border-slate-100 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md no-print relative z-10">
        PGDM – IBM: Life Insurance Underwriting Tool &copy;{" "}
        {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default App;