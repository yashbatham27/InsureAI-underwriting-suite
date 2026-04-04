import React from 'react';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, 
  ShieldAlert, 
  Target, 
  Activity,
  Database,
  Fingerprint
} from 'lucide-react';
import { FraudFlag, FraudSeverity } from '../types';

interface SmartFraudFlagCardProps {
  flag: FraudFlag;
  confidenceScore?: number; 
}

const SmartFraudFlagCard: React.FC<SmartFraudFlagCardProps> = ({ 
  flag, 
  confidenceScore = 94 
}) => {
  
  const severityConfig = {
    Low: {
      colors: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800/50',
      accent: 'bg-emerald-500',
      badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
      icon: <Target className="w-4 h-4" />,
      glow: ''
    },
    Medium: {
      colors: 'bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800/50',
      accent: 'bg-amber-500',
      badge: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
      icon: <Activity className="w-4 h-4" />,
      glow: ''
    },
    High: {
      colors: 'bg-orange-50 border-orange-200 dark:bg-orange-900/10 dark:border-orange-800/50',
      accent: 'bg-orange-500',
      badge: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400',
      icon: <AlertTriangle className="w-4 h-4" />,
      glow: 'shadow-[0_0_15px_rgba(249,115,22,0.15)]'
    },
    Critical: {
      colors: 'bg-rose-50 border-rose-300 dark:bg-rose-900/10 dark:border-rose-500/50',
      accent: 'bg-rose-600 animate-pulse',
      badge: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 animate-pulse',
      icon: <ShieldAlert className="w-4 h-4" />,
      glow: 'shadow-[0_0_20px_rgba(225,29,72,0.2)]' 
    }
  };

  const config = severityConfig[flag.severity] || severityConfig.Low;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className={`relative overflow-hidden p-6 rounded-2xl border transition-all duration-300 ease-in-out hover:-translate-y-1 ${config.colors} ${config.glow}`}
    >
      {/* Dynamic Left Accent Border */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${config.accent}`} />

      {/* Header - AI Metadata */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${config.badge}`}>
              {config.icon}
              {flag.severity} RISK
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
              <Fingerprint className="w-3.5 h-3.5 text-indigo-500" />
              ID: {flag.id.split('-')[0].toUpperCase()}
            </div>
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-1">
            {flag.signature}
          </h3>
        </div>
        
        {/* Confidence Ring */}
        <div className="flex flex-col items-center justify-center bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Match</span>
          <span className={`text-lg font-black ${confidenceScore > 90 ? 'text-rose-600' : 'text-amber-600'}`}>
            {confidenceScore}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        {/* Left Column: AI Reasoning */}
        <div className="flex flex-col gap-2">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-3.5 h-3.5" />
            AI Diagnostic Reason
          </h4>
          <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed bg-white/50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700/50 h-full">
            {flag.reason}
          </p>
        </div>

        {/* Right Column: Normal Evidence Box */}
        <div className="flex flex-col gap-2">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Database className="w-3.5 h-3.5" />
            Data Evidence
          </h4>
          <div className="bg-white/50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700/50 h-full">
            <p className="text-slate-600 dark:text-slate-400 font-mono text-sm leading-relaxed break-words">
              {flag.evidence}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SmartFraudFlagCard;