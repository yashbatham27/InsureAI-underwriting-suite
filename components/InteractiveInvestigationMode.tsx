import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, 
  ChevronRight, 
  Search, 
  AlertTriangle, 
  ShieldAlert,
  CheckCircle2,
  FileWarning,
  FileSearch
} from 'lucide-react';

export interface Transaction {
  id: string;
  amount: number;
  date: string;
  description: string;
  flagged: boolean;
  status?: 'pending' | 'safe' | 'escalated'; 
  details?: { // Made optional just in case AI fails to generate it
    comparison?: string;
    highlightedText?: string[];
    fraudSignature?: string;
  };
}

interface InteractiveInvestigationModeProps {
  transactions: Transaction[];
  // NEW: Callback to notify parent/backend when an underwriter makes a decision
  onTransactionUpdate?: (id: string, status: 'safe' | 'escalated') => void; 
}

const InteractiveInvestigationMode: React.FC<InteractiveInvestigationModeProps> = ({ 
  transactions,
  onTransactionUpdate 
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [localTransactions, setLocalTransactions] = useState<Transaction[]>([]);

  // Sync with incoming AI data
  useEffect(() => {
    if (!transactions) return;
    
    const initializedTxs = transactions.map(tx => ({
      ...tx,
      status: tx.status || (tx.flagged ? 'pending' : 'safe')
    }));
    setLocalTransactions(initializedTxs);
  }, [transactions]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Action Handlers
  const handleMarkSafe = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // 1. Update local UI optimistically
    setLocalTransactions(prev => 
      prev.map(tx => tx.id === id ? { ...tx, flagged: false, status: 'safe' } : tx)
    );
    setExpandedId(null); 
    
    // 2. Notify parent to update the main state/database
    if (onTransactionUpdate) {
      onTransactionUpdate(id, 'safe');
    }
  };

  const handleEscalate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // 1. Update local UI optimistically
    setLocalTransactions(prev => 
      prev.map(tx => tx.id === id ? { ...tx, status: 'escalated' } : tx)
    );
    setExpandedId(null); 
    
    // 2. Notify parent to update the main state/database
    if (onTransactionUpdate) {
      onTransactionUpdate(id, 'escalated');
    }
  };

  // Robust highlighting function to handle missing AI data
  const highlightText = (text?: string, highlights?: string[]) => {
    if (!text) return 'No detailed comparison provided by AI.';
    if (!highlights || !highlights.length) return text;

    try {
      const regex = new RegExp(`(${highlights.join('|')})`, 'gi');
      const parts = text.split(regex);

      return parts.map((part, index) => {
        const isHighlight = highlights.some(h => h.toLowerCase() === part.toLowerCase());
        return isHighlight ? (
          <span 
            key={index} 
            className="bg-rose-500/20 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 rounded border border-rose-500/30 font-medium"
          >
            {part}
          </span>
        ) : (
          part
        );
      });
    } catch (error) {
      // Fallback if AI provides invalid regex characters in highlights
      return text; 
    }
  };

  const formatRupees = (amount?: number) => {
    if (amount === undefined || amount === null) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
          <Search className="w-5 h-5 text-indigo-500" />
          Interactive Investigation
        </h2>
        {localTransactions.length > 0 && (
          <span className="text-xs font-semibold px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full">
            {localTransactions.length} Records Scanned
          </span>
        )}
      </div>

      <div className="space-y-3 flex-grow">
        {/* NEW: Empty State UI for when no transactions are passed */}
        {localTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
            <FileSearch className="w-8 h-8 text-slate-400 mb-3" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Financial Data Analyzed</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
              Upload or paste bank statements to initiate the AI forensic scan.
            </p>
          </div>
        ) : (
          localTransactions.map((transaction) => (
            <motion.div
              key={transaction.id}
              layout
              className={`border rounded-xl overflow-hidden transition-all duration-300 ease-in-out ${
                transaction.status === 'escalated' 
                  ? 'border-purple-300 dark:border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.1)]'
                  : transaction.status === 'pending' && transaction.flagged
                  ? 'border-rose-300 dark:border-rose-500/50 shadow-[0_0_15px_rgba(225,29,72,0.1)]' 
                  : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              {/* Row Header */}
              <div
                onClick={() => toggleExpand(transaction.id)}
                className="flex items-center gap-4 p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors duration-200"
              >
                {/* 1. Chevron */}
                <div className="w-8 flex-shrink-0 flex justify-center">
                  {expandedId === transaction.id ? (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  )}
                </div>
                
                {/* 2. Amount */}
                <div className={`w-36 flex-shrink-0 font-bold text-lg ${
                  transaction.status === 'escalated' ? 'text-purple-600 dark:text-purple-400' :
                  transaction.flagged ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'
                }`}>
                  {formatRupees(transaction.amount)}
                </div>
                
                {/* 3. Date */}
                <div className="w-28 flex-shrink-0 text-sm text-slate-500 dark:text-slate-400 font-medium">
                  {transaction.date || 'Unknown Date'}
                </div>
                
                {/* 4. Description */}
                <div 
                  className="flex-1 min-w-0 text-slate-700 dark:text-slate-300 truncate pr-4"
                  title={transaction.description}
                >
                  {transaction.description || 'No description provided'}
                </div>

                {/* 5. Dynamic Badges */}
                <div className="w-32 flex-shrink-0 flex items-center justify-end">
                  {transaction.status === 'pending' && transaction.flagged && (
                    <div className="flex items-center gap-1.5 bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider animate-pulse whitespace-nowrap">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      High Risk
                    </div>
                  )}
                  {transaction.status === 'safe' && !transaction.flagged && (
                    <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Safe
                    </div>
                  )}
                  {transaction.status === 'escalated' && (
                    <div className="flex items-center gap-1.5 bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                      <FileWarning className="w-3.5 h-3.5" />
                      Escalated
                    </div>
                  )}
                </div>
              </div>

              {/* Expanded Forensic Details */}
              <AnimatePresence>
                {expandedId === transaction.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30"
                  >
                    <div className="p-6">
                      <div className="space-y-4 max-w-4xl">
                        {transaction.details?.fraudSignature && (
                           <div className={`flex items-center gap-2 font-mono text-sm p-3 rounded border ${
                             transaction.status === 'escalated' ? 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/20 dark:border-purple-800/50 dark:text-purple-400' :
                             'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-900/20 dark:border-rose-800/50 dark:text-rose-400'
                           }`}>
                             <ShieldAlert className="w-4 h-4" />
                             Signature Match: {transaction.details.fraudSignature}
                           </div>
                        )}
                        <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">AI Contextual Analysis</h4>
                          <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm leading-relaxed shadow-inner">
                            {highlightText(transaction.details?.comparison, transaction.details?.highlightedText)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Footer */}
                    <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-800/50 flex justify-end gap-3">
                      {transaction.status !== 'safe' && (
                        <button 
                          onClick={(e) => handleMarkSafe(transaction.id, e)}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg transition-colors border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Mark as Safe
                        </button>
                      )}
                      
                      {transaction.status !== 'escalated' && (
                        <button 
                          onClick={(e) => handleEscalate(transaction.id, e)}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors shadow-sm"
                        >
                          <ShieldAlert className="w-4 h-4" />
                          Escalate to Audit
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default InteractiveInvestigationMode;