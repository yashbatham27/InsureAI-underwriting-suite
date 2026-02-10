
import React from 'react';

interface HeaderProps {
  onToggleHistory?: () => void;
  showHistory?: boolean;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleHistory, showHistory, theme, onToggleTheme }) => {
  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 py-4 px-6 md:px-12 flex items-center justify-between sticky top-0 z-50 transition-colors duration-300">
      <div className="flex items-center gap-3">
        <div className="bg-blue-600 p-2 rounded-lg">
          <i className="fa-solid fa-robot text-white text-xl"></i>
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">InsureAI</h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium uppercase tracking-widest">Automated Underwriting</p>
        </div>
      </div>
      
      <nav className="flex gap-4 md:gap-6 items-center">
        <button
          onClick={onToggleTheme}
          className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-blue-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          <i className={`fa-solid ${theme === 'light' ? 'fa-moon' : 'fa-sun'} text-sm`}></i>
        </button>

        {onToggleHistory && (
          <button 
            onClick={onToggleHistory}
            className={`text-sm font-medium flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
              showHistory 
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' 
                : 'text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <i className={`fa-solid ${showHistory ? 'fa-pen-to-square' : 'fa-clock-rotate-left'}`}></i>
            <span className="hidden sm:inline">{showHistory ? 'Input Panel' : 'History'}</span>
          </button>
        )}
        <div className="hidden md:block h-8 w-[1px] bg-slate-100 dark:bg-slate-800 mx-2"></div>
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-full text-xs font-semibold">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          Live Engine 3.0
        </div>
      </nav>
    </header>
  );
};

export default Header;
