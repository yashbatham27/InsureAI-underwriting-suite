import React, { useState } from 'react';
import { ApplicantInfo, UnderwritingResult } from '../types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportViewProps {
  applicant: ApplicantInfo;
  report: UnderwritingResult;
  onReset: () => void;
}

const ReportView: React.FC<ReportViewProps> = ({ applicant, report, onReset }) => {
  const [hoveredMetric, setHoveredMetric] = useState<number | null>(null);

  const chartData = report.breakdown.map(item => ({ name: item.label, value: item.points }));
  
  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return '0.00';
    return amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getCategoryColor = (cat: string) => {
    const lowerCat = cat.toLowerCase();
    if (lowerCat.includes('sub-standard')) {
      return 'text-amber-700 bg-amber-50/80 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/50 dark:text-amber-400 shadow-amber-500/10';
    }
    if (lowerCat.includes('standard')) {
      return 'text-emerald-700 bg-emerald-50/80 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/50 dark:text-emerald-400 shadow-emerald-500/10';
    }
    if (lowerCat.includes('decline') || lowerCat.includes('refer')) {
      return 'text-rose-700 bg-rose-50/80 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800/50 dark:text-rose-400 shadow-rose-500/10';
    }
    return 'text-blue-700 bg-blue-50/80 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800/50 dark:text-blue-400 shadow-blue-500/10';
  };

  const getSeverityColor = (severity: number) => {
    switch(severity) {
      case 4: return 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800';
      case 3: return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800';
      case 2: return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800';
      case 1: 
      default: return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800';
    }
  };

  const getSeverityLabel = (severity: number) => `Level ${severity}`;

  const flags: { level: string, code: string, message: string }[] = [];
  if (report.totalExtraMortalityPoints > 200) {
    flags.push({ level: 'MANUAL_UW', code: 'HIGH_EMR', message: 'EMR exceeds 200, requires manual Chief Underwriter review.' });
  }
  if (applicant.habits && applicant.habits.length > 1) {
    flags.push({ level: 'WARN', code: 'MULTI_HABIT', message: 'Multiple risky habits reported in lifestyle section.' });
  }
  if (applicant.medicalConditions && applicant.medicalConditions.length > 1) {
    flags.push({ level: 'WARN', code: 'MULTI_MORBID', message: 'Co-morbidities detected across multiple health systems.' });
  }
  if (report.decision.toLowerCase().includes('decline')) {
     flags.push({ level: 'FATAL', code: 'FIN_FAIL', message: 'Sum Assured exceeds maximum allowed financial multiplier.' });
  }
  if (flags.length === 0) {
    flags.push({ level: 'INFO', code: 'CLEAN', message: 'No significant underwriting flags triggered.' });
  }

  const currentYear = new Date().getFullYear();
  const calculatedDob = `01/01/${currentYear - applicant.age}`;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const timestamp = new Date().toLocaleString('en-IN');
    const formatNum = (num: number) => num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const refNumber = Math.floor(Math.random() * 100000);

    // --- COMPRESSED PDF AESTHETICS ---
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 32, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text("InsureAI", 14, 16);
    
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text("Automated Underwriting Report", 14, 24);
    
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`Generated: ${timestamp}`, 196, 16, { align: 'right' });
    doc.setTextColor(56, 189, 248);
    doc.text(`Ref: #${refNumber}`, 196, 24, { align: 'right' });

    const isDecline = report.decision.toLowerCase().includes('decline');
    const isStandard = report.decision.toLowerCase().includes('standard');
    
    if (isDecline) doc.setFillColor(225, 29, 72);
    else if (isStandard) doc.setFillColor(16, 185, 129);
    else doc.setFillColor(245, 158, 11);

    doc.roundedRect(14, 38, 182, 10, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text(`FINAL DECISION: ${report.decision.toUpperCase()}`, 105, 45, { align: 'center' });

    const commonTableStyles = {
      theme: 'grid' as const,
      styles: { fontSize: 8.5, cellPadding: 2.5, textColor: [51, 65, 85], lineColor: [226, 232, 240] },
      headStyles: { fillColor: [248, 250, 252], textColor: [15, 23, 42], fontStyle: 'bold' as const, lineWidth: 0.1 },
      alternateRowStyles: { fillColor: [253, 254, 255] }
    };

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("1. Applicant Risk Profile", 14, 55);

    const habitsText = applicant.habits && applicant.habits.length > 0 
      ? applicant.habits.map(h => `${h.type}: ${h.level}`).join(', ') 
      : "No risky habits disclosed";

    const profileData = [
      ["Name", applicant.name, "Age / Gender", `${applicant.age} / ${applicant.gender}`],
      ["Date of Birth", calculatedDob, "Profession", applicant.occupation],
      ["Avg Income", `Rs. ${formatNum((applicant as any).averageIncome || applicant.income || 0)}`, "BMI", applicant.bmi.toString()],
      ["Sum Assured", `Rs. ${formatNum(applicant.sumAssured)}`, "Habits", habitsText],
      ["Family History", (applicant as any).familyHistory || "Not Specified", "", ""]
    ];

    autoTable(doc, {
      ...commonTableStyles,
      startY: 58,
      head: [],
      body: profileData,
      theme: 'plain',
      styles: { ...commonTableStyles.styles, cellPadding: 3, fontSize: 8.5 },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: [100, 116, 139], cellWidth: 35 },
        1: { textColor: [15, 23, 42], fontStyle: 'bold', cellWidth: 55 },
        2: { fontStyle: 'bold', textColor: [100, 116, 139], cellWidth: 35 },
        3: { textColor: [15, 23, 42], fontStyle: 'bold' }
      },
      didDrawCell: (data) => {
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.5);
        doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
      }
    });

    let finalY = (doc as any).lastAutoTable.finalY || 58;

    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text("2. Extra Mortality (EMR) Breakdown", 14, finalY + 8);

    const emrBody = report.breakdown.map(b => [b.label, `+${b.points}`]);
    emrBody.push(['TOTAL EMR LOADING', `+${report.totalExtraMortalityPoints}`]);

    autoTable(doc, {
      ...commonTableStyles,
      startY: finalY + 11,
      head: [['Risk Component', 'Points Applied']],
      body: emrBody,
      didParseCell: (data) => {
        if (data.row.index === emrBody.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [241, 245, 249];
          data.cell.styles.textColor = [15, 23, 42];
        }
      }
    });

    finalY = (doc as any).lastAutoTable.finalY;

    if (flags.length > 0) {
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text("3. Underwriting System Flags", 14, finalY + 8);

      const flagsBody = flags.map(f => [f.level, f.code, f.message]);

      autoTable(doc, {
        ...commonTableStyles,
        startY: finalY + 11,
        head: [['Severity', 'Rule Code', 'System Message']],
        body: flagsBody,
        columnStyles: {
          0: { fontStyle: 'bold' },
          1: { fontStyle: 'italic', textColor: [100, 116, 139] }
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 0) {
            const level = data.cell.raw as string;
            if (level === 'FATAL' || level === 'MANUAL_UW') data.cell.styles.textColor = [225, 29, 72];
            else if (level === 'WARN') data.cell.styles.textColor = [217, 119, 6];
            else data.cell.styles.textColor = [2, 132, 199];
          }
        }
      });
      finalY = (doc as any).lastAutoTable.finalY;
    }

    if (finalY > 250) {
      doc.addPage();
      finalY = 20;
    } else {
      finalY += 8;
    }

    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text("4. Premium Computation Schedule", 14, finalY);

    const premiumBody = [
      ['Base Life Cover', formatNum(applicant.sumAssured), formatNum(report.basePremium), formatNum(report.loadingAmount), formatNum(report.basePremium + report.loadingAmount)]
    ];
    
    if(report.riderPremiums.accident) {
        premiumBody.push(['Accident Benefit Rider', '-', formatNum(report.riderPremiums.accident), '-', formatNum(report.riderPremiums.accident)]);
    }
    if(report.riderPremiums.criticalIllness) {
        premiumBody.push(['Critical Illness Rider', formatNum(applicant.sumAssured * 0.8), formatNum(report.riderPremiums.criticalIllness), '-', formatNum(report.riderPremiums.criticalIllness)]);
    }
    
    premiumBody.push(['TOTAL PAYABLE PREMIUM', '', '', '', formatNum(report.finalTotalPremium)]);

    autoTable(doc, {
      ...commonTableStyles,
      startY: finalY + 3,
      head: [['Coverage Type', 'Sum Assured (Rs)', 'Base Prem (Rs)', 'EM Loading (Rs)', 'Total (Rs)']],
      body: premiumBody,
      headStyles: { ...commonTableStyles.headStyles, halign: 'right' },
      columnStyles: {
        0: { halign: 'left', fontStyle: 'bold' },
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] }
      },
      didParseCell: (data) => {
        if (data.section === 'head' && data.column.index === 0) {
          data.cell.styles.halign = 'left';
        }
        if (data.row.index === premiumBody.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [30, 58, 138];
            data.cell.styles.textColor = [255, 255, 255];
            data.cell.styles.fontSize = 9.5;
        }
      }
    });

    const pageCount = (doc as any).internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        
        doc.setDrawColor(226, 232, 240);
        doc.line(14, 282, 196, 282);
        
        doc.text('This is a computer-generated underwriting assessment based on digital inputs. Valid subject to final medical verification.', 14, 288);
        doc.text(`Page ${i} of ${pageCount}`, 196, 288, { align: 'right' });
    }

    doc.save(`InsureAI_Assessment_${applicant.name.replace(/\s+/g, '_')}.pdf`);
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#0ea5e9'];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl shadow-blue-900/5 border border-slate-200/60 dark:border-slate-800 overflow-hidden flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-700 print:shadow-none print:border-none transition-all">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-black dark:via-slate-900 dark:to-black p-6 md:p-8 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:bg-white print:text-black print:hidden">
        <div>
          <div className="flex items-center gap-3">
            {/* <div className="bg-blue-500/20 p-2.5 rounded-xl border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.5)]">
              <i className="fa-solid fa-shield-check text-blue-400 text-xl"></i>
            </div> */}
            <h2 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              Underwriting Report
            </h2>
          </div>
          <p className="text-slate-400 text-xs mt-2 uppercase tracking-widest font-semibold flex items-center gap-2">
            <span>Ref: #{Math.floor(Math.random() * 100000)}</span>
            <span className="w-1 h-1 rounded-full bg-slate-600"></span>
            <span>InsureAI Core</span>
          </p>
        </div>
        <button 
          onClick={onReset}
          className="group text-sm bg-white/5 hover:bg-blue-600 px-5 py-2.5 rounded-xl transition-all duration-300 border border-white/10 hover:border-blue-500 backdrop-blur-sm font-medium flex items-center shadow-lg hover:shadow-blue-500/25"
        >
          <i className="fa-solid fa-arrow-rotate-left mr-2 opacity-70 group-hover:-rotate-180 transition-transform duration-500"></i> New Assessment
        </button>
      </div>

      <div className="p-6 md:p-8 flex-grow overflow-y-auto space-y-10 max-h-[calc(100vh-18rem)] print:max-h-none print:overflow-visible print:p-0 scroll-smooth">
        
        {/* Top Section: Decision & EMR */}
        <section className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className={`col-span-1 md:col-span-3 p-8 rounded-3xl border shadow-lg flex flex-col items-center justify-center text-center relative overflow-hidden transition-all duration-500 hover:scale-[1.01] ${getCategoryColor(report.riskCategory)} print:border-slate-200 group`}>
            <div className="absolute -right-10 -top-10 opacity-10 rotate-12 pointer-events-none group-hover:rotate-6 group-hover:scale-110 transition-transform duration-700">
              <i className="fa-solid fa-stamp text-9xl"></i>
            </div>
            
            <span className="text-xs uppercase font-black tracking-[0.2em] opacity-70 mb-2 z-10">Final Classification</span>
            <h4 className="text-4xl md:text-5xl font-black uppercase tracking-tight z-10 drop-shadow-sm">{report.riskCategory}</h4>
            <div className="h-1 w-16 bg-current opacity-20 my-5 rounded-full z-10 transition-all duration-500 group-hover:w-24"></div>
            <p className="text-base font-bold bg-white/40 dark:bg-black/20 px-4 py-1.5 rounded-full z-10 backdrop-blur-sm border border-current/10">
              {report.decision}
            </p>
          </div>

          <div className="col-span-1 md:col-span-2 p-8 bg-slate-900 dark:bg-black rounded-3xl text-white flex flex-col items-center justify-center text-center shadow-xl shadow-slate-900/20 relative overflow-hidden print:bg-slate-100 print:text-black group hover:-translate-y-1 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-transparent pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity"></div>
            
            {/* Glowing orb behind score */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl group-hover:bg-blue-500/30 transition-colors duration-500"></div>

            <span className="text-xs uppercase font-black tracking-[0.2em] text-slate-400 mb-2 z-10">Total Mortality Load</span>
            <div className="flex items-baseline gap-1 z-10">
              <h4 className="text-5xl md:text-6xl font-black text-white group-hover:scale-110 transition-transform duration-300">+{report.totalExtraMortalityPoints}</h4>
              <span className="text-blue-400 font-bold text-xl">pts</span>
            </div>
            <p className="text-sm text-slate-400 mt-4 font-medium px-4 py-1 bg-white/5 rounded-full border border-white/5 z-10 backdrop-blur-sm">EMR Score</p>
          </div>
        </section>

        {/* Profile Grid - EXPANDED & INTERACTIVE */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="h-8 w-1.5 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Applicant Profile</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-5">
            {[
              { icon: 'fa-user', label: 'Full Name', value: applicant.name, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
              { icon: 'fa-cake-candles', label: 'Age / Gender', value: `${applicant.age} Yrs / ${applicant.gender}`, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10' },
              { icon: 'fa-briefcase', label: 'Occupation', value: applicant.occupation, truncate: true, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
              { icon: 'fa-wallet', label: 'Avg Income', value: `₹ ${formatCurrency((applicant as any).averageIncome || applicant.income || 0)}`, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
              { icon: 'fa-shield', label: 'Sum Assured', value: `₹ ${formatCurrency(applicant.sumAssured)}`, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
              { icon: 'fa-weight-scale', label: 'BMI', value: applicant.bmi, color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-500/10' },
              { icon: 'fa-users', label: 'Family History', value: (applicant as any).familyHistory || 'Not disclosed', colSpan: 2, color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-500/10' },
              { icon: 'fa-smoking', label: 'Disclosed Habits', value: applicant.habits && applicant.habits.length > 0 ? applicant.habits.map(h => `${h.type} (${h.level})`).join(' • ') : 'No significant habits', colSpan: 2, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10' },
            ].map((item, idx) => (
              <div 
                key={idx} 
                className={`group relative bg-white dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ${item.colSpan ? `col-span-2` : ''}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${item.bg} group-hover:scale-110 transition-transform duration-300`}>
                    <i className={`fa-solid ${item.icon} ${item.color} text-[10px]`}></i>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">{item.label}</span>
                </div>
                <p className={`text-sm md:text-base font-bold text-slate-800 dark:text-slate-200 pl-1 ${item.truncate ? 'truncate' : ''}`} title={item.truncate ? item.value.toString() : undefined}>
                  {item.value}
                </p>
                {/* Accent border bottom on hover */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-1 bg-blue-500 rounded-t-full group-hover:w-1/2 transition-all duration-300 opacity-0 group-hover:opacity-100"></div>
              </div>
            ))}
          </div>
        </section>

        {/* Analytics Section (Chart + Medical) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 border border-slate-200/60 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
              <i className="fa-solid fa-chart-pie text-blue-500 bg-blue-50 dark:bg-blue-500/10 p-2 rounded-lg"></i>
              Risk Impact Analysis
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 20, top: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(148, 163, 184, 0.1)', radius: 8 }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px', fontWeight: 'bold' }}
                    formatter={(value: number) => [`+${value} EMR`, 'Impact']}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={28} onMouseEnter={(_, index) => setHoveredMetric(index)} onMouseLeave={() => setHoveredMetric(null)}>
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]} 
                        opacity={hoveredMetric === null || hoveredMetric === index ? 1 : 0.3}
                        className="transition-opacity duration-300"
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="bg-slate-50 dark:bg-slate-800/40 p-6 md:p-8 rounded-3xl border border-slate-200/60 dark:border-slate-700 shadow-inner relative overflow-hidden">
            {/* Background Medical Cross Pattern */}
            <div className="absolute -right-4 -bottom-4 opacity-[0.03] pointer-events-none text-9xl">
              <i className="fa-solid fa-kit-medical"></i>
            </div>

            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2 relative z-10">
               <i className="fa-solid fa-stethoscope text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 p-2 rounded-lg"></i>
               Clinical Findings
            </h3>
             {applicant.medicalConditions.length > 0 ? (
               <div className="grid grid-cols-1 gap-4 overflow-y-auto max-h-[240px] pr-2 custom-scrollbar relative z-10">
                 {applicant.medicalConditions.map((cond, idx) => (
                   <div key={idx} className="group bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-800 transition-all hover:-translate-x-1 cursor-default">
                     <div className="flex justify-between items-start mb-2">
                       <p className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{cond.name}</p>
                       <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border ${getSeverityColor(cond.severity)}`}>
                         {getSeverityLabel(cond.severity)}
                       </span>
                     </div>
                     <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                       {cond.indicators || 'Standard condition protocols applied.'}
                     </p>
                   </div>
                 ))}
               </div>
             ) : (
               <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-center p-6 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 relative z-10 group hover:border-emerald-400 transition-colors">
                 <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/40">
                   <i className="fa-solid fa-check text-emerald-500 text-2xl group-hover:rotate-12 transition-transform"></i>
                 </div>
                 <p className="text-sm text-slate-600 dark:text-slate-300 font-bold">Clean Health Profile</p>
                 <p className="text-xs text-slate-400 mt-1">No pre-existing conditions reported.</p>
               </div>
             )}
          </section>
        </div>

        {/* Bottom Section: Flags & Financials */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-8 w-1.5 bg-gradient-to-b from-amber-400 to-amber-600 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">System Alerts</h3>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700">
                  <tr>
                    <th className="text-left px-5 py-4 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Severity</th>
                    <th className="text-left px-5 py-4 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Alert Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                  {flags.map((flag, idx) => {
                    const isCritical = flag.level === 'FATAL' || flag.level === 'MANUAL_UW';
                    return (
                      <tr key={idx} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group ${isCritical ? 'bg-rose-50/30 dark:bg-rose-900/10' : ''}`}>
                        <td className="px-5 py-4 align-top w-36">
                          <div className="flex items-center gap-2">
                            {isCritical && (
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                              </span>
                            )}
                            <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-black tracking-widest uppercase ${
                              isCritical ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' : 
                              flag.level === 'WARN' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 
                              'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            }`}>
                              {flag.level}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{flag.code}</div>
                          <div className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{flag.message}</div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-8 w-1.5 bg-gradient-to-b from-indigo-400 to-indigo-600 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Premium Schedule</h3>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700">
                  <tr>
                    <th className="px-5 py-4 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Coverage Component</th>
                    <th className="px-5 py-4 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider text-right">Premium</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <i className="fa-solid fa-shield-heart text-blue-500 opacity-50 group-hover:opacity-100 transition-opacity"></i>
                        Base Life Cover
                      </div>
                      <div className="text-xs text-slate-500 mt-1 ml-6">Sum: ₹ {formatCurrency(applicant.sumAssured)}</div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="font-bold text-slate-800 dark:text-slate-200">₹ {formatCurrency(report.basePremium)}</div>
                    </td>
                  </tr>
                  
                  {report.loadingAmount > 0 && (
                     <tr className="hover:bg-rose-50/50 dark:hover:bg-rose-900/10 transition-colors group">
                       <td className="px-5 py-4">
                         <div className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                           <i className="fa-solid fa-arrow-up-right-dots text-xs group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform"></i> 
                           EMR Loading
                         </div>
                         <div className="text-xs text-slate-500 mt-1 ml-5">Based on risk profile</div>
                       </td>
                       <td className="px-5 py-4 text-right">
                         <div className="font-bold text-rose-600 dark:text-rose-400">+ ₹ {formatCurrency(report.loadingAmount)}</div>
                       </td>
                     </tr>
                  )}

                  {report.riderPremiums.accident !== undefined && report.riderPremiums.accident > 0 && (
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <i className="fa-solid fa-car-burst text-indigo-500 opacity-50 group-hover:opacity-100 transition-opacity"></i>
                          Accident Rider
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="font-bold text-slate-800 dark:text-slate-200">₹ {formatCurrency(report.riderPremiums.accident)}</div>
                      </td>
                    </tr>
                  )}
                  {report.riderPremiums.criticalIllness !== undefined && report.riderPremiums.criticalIllness > 0 && (
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <i className="fa-solid fa-heart-pulse text-rose-500 opacity-50 group-hover:opacity-100 transition-opacity"></i>
                          Critical Illness Rider
                        </div>
                        <div className="text-xs text-slate-500 mt-1 ml-6">Sum: ₹ {formatCurrency(applicant.sumAssured * 0.8)}</div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="font-bold text-slate-800 dark:text-slate-200">₹ {formatCurrency(report.riderPremiums.criticalIllness)}</div>
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white relative overflow-hidden group">
                  {/* Shimmer effect on hover */}
                  <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shimmer_1.5s_infinite]"></div>
                  <tr>
                    <td className="px-5 py-5 text-sm uppercase tracking-wider font-bold relative z-10">Total Annual Premium</td>
                    <td className="px-5 py-5 text-right text-xl font-black relative z-10">₹ {formatCurrency(report.finalTotalPremium)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-5 md:px-8 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200/60 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-semibold uppercase tracking-wider no-print">
        <span className="text-slate-400 flex items-center gap-2">
          <i className="fa-solid fa-lock text-[10px]"></i> Generated securely by InsureAI
        </span>
        <div className="flex gap-3 w-full sm:w-auto">
          <button 
            onClick={handleDownloadPDF}
            className="flex-1 sm:flex-none justify-center hover:bg-white dark:hover:bg-slate-800 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-700 transition-all flex items-center gap-2 shadow-sm hover:shadow group"
          >
            <i className="fa-solid fa-file-pdf group-hover:scale-110 transition-transform text-rose-500"></i> Save PDF
          </button>
          <button 
            onClick={handlePrint}
            className="flex-1 sm:flex-none justify-center hover:bg-white dark:hover:bg-slate-800 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-700 transition-all flex items-center gap-2 shadow-sm hover:shadow group"
          >
            <i className="fa-solid fa-print group-hover:scale-110 transition-transform text-slate-500 dark:text-slate-400"></i> Print
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportView;