
import React from 'react';
import { HistoryItem, RiskCategory } from '../types';

interface HistoryPanelProps {
  history: HistoryItem[];
  onLoad: (item: HistoryItem) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onClose: () => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, onLoad, onDelete, onClose }) => {
  const getCategoryColor = (cat: RiskCategory) => {
    switch(cat) {
      case RiskCategory.PREFERRED: return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
      case RiskCategory.STANDARD: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case RiskCategory.SUBSTANDARD: return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
      case RiskCategory.DECLINE: return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
    }
  };

  const formatDate = (ts: number) => {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    }).format(new Date(ts));
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col h-full overflow-hidden animate-in slide-in-from-left-4 duration-300 transition-colors duration-300">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <i className="fa-solid fa-clock-rotate-left text-blue-500"></i>
          Case History
        </h2>
        <button 
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          <i className="fa-solid fa-xmark text-lg"></i>
        </button>
      </div>

      {history.length === 0 ? (
        <div className="flex-grow flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500 p-8">
          <i className="fa-regular fa-folder-open text-4xl mb-4 opacity-30"></i>
          <p className="text-sm">No saved cases yet.</p>
          <p className="text-xs mt-1 opacity-70">Completed assessments will appear here.</p>
        </div>
      ) : (
        <div className="flex-grow overflow-y-auto space-y-3 pr-2">
          {history.map((item) => (
            <div 
              key={item.id}
              onClick={() => onLoad(item)}
              className="group p-4 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all cursor-pointer relative"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{item.applicant.name}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(item.timestamp)}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getCategoryColor(item.report.riskCategory)}`}>
                  {item.report.riskCategory}
                </span>
              </div>
              
              <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-2">
                <span className="flex items-center gap-1">
                  <i className="fa-solid fa-briefcase opacity-50"></i> {item.applicant.occupation}
                </span>
                <span className="flex items-center gap-1">
                  <i className="fa-solid fa-indian-rupee-sign opacity-50"></i> {item.report.finalTotalPremium.toLocaleString('en-IN')}
                </span>
              </div>

              <button
                onClick={(e) => onDelete(item.id, e)}
                className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                title="Delete Case"
              >
                <i className="fa-solid fa-trash-can"></i>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryPanel;
