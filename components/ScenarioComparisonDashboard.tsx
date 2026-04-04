import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  BrainCircuit, 
  TrendingDown, 
  TrendingUp, 
  ArrowRight,
  Stethoscope
} from 'lucide-react';

export interface MedicalParameter {
  id: string;
  name: string;
  category: string;
  current: string;
  adjusted: string;
  toggle: boolean;
  impactDelta: number; 
}

export interface RiskScore {
  current: number;
  adjusted: number;
}

interface ScenarioComparisonDashboardProps {
  currentRisk: RiskScore;
  medicalParams: MedicalParameter[];
  onParameterToggle: (index: number) => void;
}

const ScenarioComparisonDashboard: React.FC<ScenarioComparisonDashboardProps> = ({
  currentRisk,
  medicalParams,
  onParameterToggle,
}) => {
  const [adjustedRisk, setAdjustedRisk] = useState(currentRisk.current);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    setIsCalculating(true);
    
    const calculatedScore = medicalParams.reduce((total, param) => {
      if (param.toggle) {
        return total + (param.impactDelta || 0);
      }
      return total;
    }, currentRisk.current);

    const timeout = setTimeout(() => {
      setAdjustedRisk(Math.max(0, calculatedScore));
      setIsCalculating(false);
    }, 400);

    return () => clearTimeout(timeout);
  }, [medicalParams, currentRisk.current]);

  const getRiskColor = (score: number) => {
    if (score >= 75) return { hex: '#e11d48', tw: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500' };
    if (score >= 50) return { hex: '#f59e0b', tw: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500' };
    return { hex: '#10b981', tw: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500' };
  };

  const CircularProgressBar: React.FC<{ value: number; label: string; isCalculating?: boolean }> = ({ value, label, isCalculating }) => {
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (value / 100) * circumference;
    const colors = getRiskColor(value);

    return (
      <div className="flex flex-col items-center relative">
        <div className="relative flex items-center justify-center">
          <svg width="120" height="120" className="transform -rotate-90 drop-shadow-md">
            <circle
              cx="60"
              cy="60"
              r={radius}
              stroke="currentColor"
              className="text-slate-100 dark:text-slate-700"
              strokeWidth="8"
              fill="transparent"
            />
            <motion.circle
              cx="60"
              cy="60"
              r={radius}
              stroke={colors.hex}
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: isCalculating ? circumference : strokeDashoffset }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 6px ${colors.hex}40)` }}
            />
          </svg>
          
          <div className="absolute flex flex-col items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.span
                key={isCalculating ? 'calc' : value}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className={`text-3xl font-black ${colors.tw}`}
              >
                {isCalculating ? '...' : value}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
        <div className="mt-3 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs">
          {label}
        </div>
      </div>
    );
  };

  const riskDifference = currentRisk.current - adjustedRisk;

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100 dark:border-slate-800">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
          <Activity className="w-6 h-6 text-indigo-500" />
          Predictive Scenario Analysis
        </h2>
        
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-500 ${
          riskDifference > 0 
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' 
            : riskDifference < 0
            ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'
            : 'bg-slate-50 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
        }`}>
          <BrainCircuit className="w-4 h-4" />
          {riskDifference > 0 ? `AI Prediction: Risk drops by ${Math.abs(riskDifference)} points` : 
           riskDifference < 0 ? `AI Prediction: Risk increases by ${Math.abs(riskDifference)} points` : 
           'AI Prediction: No change in risk profile'}
        </div>
      </div>

      {/* FIX: Changed items-start to items-stretch so the middle line fully connects top to bottom */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-8 items-stretch">
        
        {/* --- LEFT: CURRENT SCENARIO --- */}
        <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-xl p-6 border border-slate-100 dark:border-slate-700/50 h-full">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Baseline Data</h3>
          </div>
          
          <div className="flex justify-center mb-10">
            <CircularProgressBar value={currentRisk.current} label="Current Score" />
          </div>

          <div className="space-y-3">
            {medicalParams.map((param, index) => (
              <div key={`current-${index}`} className="flex justify-between items-center p-3.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-3">
                  <Stethoscope className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-700 dark:text-slate-200 font-medium text-sm">{param.name}</span>
                </div>
                <span className="font-mono text-slate-600 dark:text-slate-400 text-sm">{param.current}</span>
              </div>
            ))}
          </div>
        </div>

        {/* --- MIDDLE: VISUAL BRIDGE --- */}
        {/* FIX: Added 'relative py-10' and properly anchored the absolute line with 'inset-y-0' */}
        <div className="hidden lg:flex flex-col items-center justify-center relative py-10">
          <div className="absolute inset-y-0 w-px bg-gradient-to-b from-transparent via-slate-200 dark:via-slate-700 to-transparent"></div>
          <div className="bg-white dark:bg-slate-800 p-3 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm z-10 relative">
            <ArrowRight className="w-6 h-6 text-slate-400" />
          </div>
        </div>

        {/* --- RIGHT: ADJUSTED SCENARIO --- */}
        <div className="bg-indigo-50/30 dark:bg-indigo-900/10 rounded-xl p-6 border border-indigo-100 dark:border-indigo-500/20 shadow-[0_0_30px_rgba(99,102,241,0.03)] relative overflow-hidden h-full">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Predictive Model</h3>
          </div>
          
          <div className="flex justify-center mb-10">
            <CircularProgressBar value={adjustedRisk} label="Adjusted Score" isCalculating={isCalculating} />
          </div>

          <div className="space-y-3 relative z-10">
            {medicalParams.map((param, index) => (
              <div 
                key={`adjust-${index}`} 
                className={`flex flex-col p-3.5 bg-white dark:bg-slate-800 rounded-lg border transition-all duration-300 shadow-sm ${
                  param.toggle 
                    ? 'border-indigo-300 dark:border-indigo-500/50 ring-1 ring-indigo-500/20' 
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="flex justify-between items-center w-full">
                  <div className="flex flex-col">
                    <span className="text-slate-700 dark:text-slate-200 font-medium text-sm">{param.name}</span>
                    
                    <div className="flex items-center gap-1 mt-1">
                      {(param.impactDelta || 0) < 0 ? (
                        <TrendingDown className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <TrendingUp className="w-3 h-3 text-rose-500" />
                      )}
                      <span className={`text-xs font-semibold ${(param.impactDelta || 0) < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {Math.abs(param.impactDelta || 0)} pts
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className={`font-mono text-sm transition-colors duration-300 ${
                      param.toggle ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-400 dark:text-slate-500 line-through'
                    }`}>
                      {param.adjusted}
                    </span>

                    <button
                      onClick={() => onParameterToggle(index)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${
                        param.toggle ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          param.toggle ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ScenarioComparisonDashboard;