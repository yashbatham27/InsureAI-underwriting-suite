import React from 'react';
import { 
  History, 
  X, 
  FolderOpen, 
  Briefcase, 
  Activity, 
  IndianRupee, 
  Trash2 
} from 'lucide-react';
import { HistoryItem } from '../types';

interface HistoryPanelProps {
  history: HistoryItem[];
  onLoad: (item: HistoryItem) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onClose: () => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, onLoad, onDelete, onClose }) => {
  const getCategoryColor = (cat: string) => {
    const lowerCat = cat.toLowerCase();
    if (lowerCat.includes('sub-standard')) {
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    }
    if (lowerCat.includes('standard')) {
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
    }
    if (lowerCat.includes('decline') || lowerCat.includes('refer')) {
      return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
    }
    return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300';
  };

  const formatDate = (ts: number) => {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    }).format(new Date(ts));
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200/60 dark:border-slate-800 flex flex-col h-full overflow-hidden animate-in slide-in-from-left-4 duration-300 transition-colors">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-500" />
          Case History
        </h2>
        <button 
          onClick={onClose}
          className="text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      {history.length === 0 ? (
        <div className="flex-grow flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500 p-8">
          <FolderOpen className="w-12 h-12 mb-4 opacity-30 stroke-[1.5]" />
          <p className="text-sm font-semibold">No saved cases yet.</p>
          <p className="text-xs mt-1 opacity-70">Completed assessments will appear here.</p>
        </div>
      ) : (
        <div className="flex-grow overflow-y-auto space-y-3 pr-2 custom-scrollbar">
          {history.map((item) => (
            <div 
              key={item.id}
              onClick={() => onLoad(item)}
              className="group p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-all cursor-pointer relative overflow-hidden"
            >
              {/* Decorative Accent */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-200 dark:bg-slate-700 group-hover:bg-indigo-500 transition-colors" />

              <div className="flex justify-between items-start mb-3 pl-2">
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm tracking-tight">{item.applicant.name}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{formatDate(item.timestamp)}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${getCategoryColor(item.report.riskCategory)}`}>
                  {item.report.riskCategory}
                </span>
              </div>
              
              <div className="flex items-center gap-4 text-xs font-medium text-slate-500 dark:text-slate-400 mt-2 flex-wrap pl-2">
                <span className="flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 opacity-70" /> 
                  <span className="truncate max-w-[100px]" title={item.applicant.occupation}>
                    {item.applicant.occupation}
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 opacity-70" /> 
                  {item.report.totalExtraMortalityPoints} EM
                </span>
                <span className="flex items-center gap-1">
                  <IndianRupee className="w-3.5 h-3.5 opacity-70" /> 
                  {item.report.finalTotalPremium.toLocaleString('en-IN')}
                </span>
              </div>

              <button
                onClick={(e) => onDelete(item.id, e)}
                className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 opacity-0 group-hover:opacity-100 bg-white dark:bg-slate-800 rounded-lg shadow-sm transition-all"
                title="Delete Case"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryPanel;