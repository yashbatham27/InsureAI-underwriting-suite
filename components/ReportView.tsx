
import React from 'react';
import { ApplicantInfo, UnderwritingResult, RiskCategory } from '../types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportViewProps {
  applicant: ApplicantInfo;
  report: UnderwritingResult;
  onReset: () => void;
}

const ReportView: React.FC<ReportViewProps> = ({ applicant, report, onReset }) => {
  const chartData = report.breakdown.map(item => ({ name: item.label, value: item.points }));
  
  const formatCurrency = (amount: number) => {
    return '₹' + amount.toLocaleString('en-IN');
  };

  const getCategoryColor = (cat: RiskCategory) => {
    switch(cat) {
      case RiskCategory.PREFERRED: return 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400';
      case RiskCategory.STANDARD: return 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400';
      case RiskCategory.SUBSTANDARD: return 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400';
      case RiskCategory.DECLINE: return 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400';
      default: return 'text-slate-600 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch(severity) {
      case 'Critical': return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
      case 'Severe': return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800';
      case 'Moderate': return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800';
      default: return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800'; // Mild
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const formatCurrencyPDF = (num: number) => `INR ${num.toLocaleString('en-IN')}`;
    const timestamp = new Date().toLocaleString('en-IN');

    // Header
    doc.setFontSize(20);
    doc.setTextColor(37, 99, 235); // Blue-600
    doc.text("InsureAI", 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Automated Underwriting Report", 14, 28);
    
    doc.setFontSize(9);
    doc.text(`Generated: ${timestamp}`, 140, 22);
    doc.text(`Ref: #${Math.floor(Math.random() * 100000)}`, 140, 28);
    
    doc.setLineWidth(0.5);
    doc.setDrawColor(200);
    doc.line(14, 34, 196, 34);

    // Section 1: Applicant Profile
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text("Applicant Risk Profile", 14, 45);

    const profileData = [
      ["Name", applicant.name, "Occupation", applicant.occupation],
      ["Age/Gender", `${applicant.age} / ${applicant.gender}`, "Income", `INR ${applicant.income.toLocaleString('en-IN')}`],
      ["Smoker", applicant.smoking ? "Yes" : "No", "Alcohol", applicant.alcohol ? "Yes" : "No"]
    ];

    autoTable(doc, {
      startY: 50,
      body: profileData,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 2, textColor: [51, 65, 85] },
      columnStyles: {
        0: { fontStyle: 'bold', width: 25 },
        2: { fontStyle: 'bold', width: 25 }
      }
    });

    // Section 2: Medical Evaluation
    let finalY = (doc as any).lastAutoTable.finalY || 50;
    doc.text("Medical Evaluation Details", 14, finalY + 15);
    
    const medData = applicant.medicalConditions.map(c => [
      c.name, 
      c.severity, 
      c.indicators || 'No specific clinical notes extracted.'
    ]);
    
    if (medData.length === 0) {
       doc.setFontSize(10);
       doc.setTextColor(100);
       doc.text("No significant medical conditions identified.", 14, finalY + 25);
       finalY += 15;
    } else {
      autoTable(doc, {
        startY: finalY + 20,
        head: [['Condition', 'Severity', 'Indicators']],
        body: medData,
        theme: 'striped',
        headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 }
      });
      finalY = (doc as any).lastAutoTable.finalY;
    }

    // Section 3: Risk Assessment Summary
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("Risk Assessment Summary", 14, finalY + 15);

    // Draw a box for the summary
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setFillColor(248, 250, 252); // slate-50
    doc.roundedRect(14, finalY + 20, 182, 35, 3, 3, 'FD');

    // Column 1: Risk Classification (x=20)
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Risk Classification", 20, finalY + 30);
    doc.setFontSize(14);
    doc.setTextColor(37, 99, 235);
    doc.setFont(undefined, 'bold');
    doc.text(report.riskCategory, 20, finalY + 40);
    doc.setFont(undefined, 'normal');

    // Column 2: Total Loading (x=80, moved left to give space to Decision)
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Total Loading", 80, finalY + 30);
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(`+${report.totalExtraMortalityPoints} EM Points`, 80, finalY + 40);

    // Column 3: Decision (x=130, moved left)
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Decision", 130, finalY + 30);
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    // Use maxWidth to wrap text within the remaining box width (~60mm)
    doc.text(report.decision, 130, finalY + 40, { maxWidth: 60 });

    finalY += 65;

    // Section 4: Risk Breakdown
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("Risk Breakdown", 14, finalY);

    const breakdownTable = report.breakdown.map(b => [b.label, `+${b.points}`]);
    autoTable(doc, {
      startY: finalY + 5,
      head: [['Factor', 'Points Impact']],
      body: breakdownTable,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: { 1: { halign: 'right', fontStyle: 'bold', textColor: [220, 38, 38] } },
      styles: { fontSize: 9 }
    });

    finalY = (doc as any).lastAutoTable.finalY;

    // Section 5: Premium Calculation
    // Check if we need a new page
    if (finalY > 220) {
      doc.addPage();
      finalY = 20;
    } else {
      finalY += 15;
    }

    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("Premium Computation", 14, finalY);

    const premiumData = [
      ['Base Term Life Cover', formatCurrencyPDF(report.basePremium)],
      [`Risk Loading (${report.totalExtraMortalityPoints} pts)`, formatCurrencyPDF(report.loadingAmount)],
    ];
    
    if(report.riderPremiums.accident) {
        premiumData.push(['Accident Rider', formatCurrencyPDF(report.riderPremiums.accident)]);
    }
    if(report.riderPremiums.criticalIllness) {
        premiumData.push(['Critical Illness Rider', formatCurrencyPDF(report.riderPremiums.criticalIllness)]);
    }
    
    // Add Total Row
    premiumData.push(['TOTAL ANNUAL PREMIUM', formatCurrencyPDF(report.finalTotalPremium)]);

    autoTable(doc, {
      startY: finalY + 5,
      head: [['Component', 'Amount']],
      body: premiumData,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42] },
      columnStyles: {
          1: { halign: 'right', fontStyle: 'bold' }
      },
      styles: { fontSize: 10, cellPadding: 4 },
      didParseCell: (data) => {
          if (data.row.index === premiumData.length - 1) {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fillColor = [240, 253, 244];
              data.cell.styles.textColor = [21, 128, 61];
          }
      }
    });

    // Disclaimer Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text('This is a computer-generated report based on submitted information. Valid subject to medical verification.', 14, 285);
        doc.text(`Page ${i} of ${pageCount}`, 190, 285, { align: 'right' });
    }

    doc.save(`InsureAI_Report_${applicant.name.replace(/\s+/g, '_')}.pdf`);
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500 print:shadow-none print:border-none transition-colors duration-300">
      {/* Header */}
      <div className="bg-slate-900 dark:bg-slate-950 p-6 text-white flex justify-between items-center print:bg-slate-900 print:text-white">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <i className="fa-solid fa-clipboard-check text-blue-400 no-print"></i>
            Automated Underwriting Report
          </h2>
          <p className="text-slate-400 text-xs mt-1 uppercase tracking-widest font-medium">Case Ref: #{Math.floor(Math.random() * 100000)}</p>
        </div>
        <button 
          onClick={onReset}
          className="text-sm bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors border border-white/10 no-print"
        >
          <i className="fa-solid fa-arrow-rotate-left mr-2"></i> New Case
        </button>
      </div>

      <div className="p-6 md:p-8 flex-grow overflow-y-auto space-y-8 max-h-[calc(100vh-18rem)] print:max-h-none print:overflow-visible">
        {/* Profile Grid */}
        <section>
          <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Applicant Risk Profile</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl print:border print:border-slate-100 dark:border-slate-700">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Name</span>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{applicant.name}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl print:border print:border-slate-100 dark:border-slate-700">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Age/Gender</span>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{applicant.age} / {applicant.gender}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl col-span-2 print:border print:border-slate-100 dark:border-slate-700">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Occupation</span>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{applicant.occupation}</p>
            </div>
          </div>
        </section>

        {/* Medical Evaluation Details */}
        <section className="bg-slate-50 dark:bg-slate-700/30 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 print:border-slate-200">
           <h3 className="text-sm font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
             <i className="fa-solid fa-stethoscope text-blue-400 no-print"></i>
             Medical Evaluation Details
           </h3>
           {applicant.medicalConditions.length > 0 ? (
             <div className="grid grid-cols-1 gap-3">
               {applicant.medicalConditions.map((cond, idx) => (
                 <div key={idx} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 print:shadow-none print:border-slate-200">
                   <div>
                     <div className="flex items-center gap-2">
                       <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{cond.name}</p>
                       <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getSeverityColor(cond.severity)}`}>
                         {cond.severity}
                       </span>
                     </div>
                     <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                       <span className="text-slate-400 dark:text-slate-500 mr-1">Indicators:</span>
                       {cond.indicators || 'No specific indicators cited in report.'}
                     </p>
                   </div>
                   {/* Visual indicator of severity level */}
                   <div className="flex gap-1 no-print">
                      <div className={`w-2 h-2 rounded-full ${['Mild', 'Moderate', 'Severe', 'Critical'].indexOf(cond.severity) >= 0 ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                      <div className={`w-2 h-2 rounded-full ${['Moderate', 'Severe', 'Critical'].indexOf(cond.severity) >= 0 ? 'bg-amber-400' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                      <div className={`w-2 h-2 rounded-full ${['Severe', 'Critical'].indexOf(cond.severity) >= 0 ? 'bg-orange-400' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                      <div className={`w-2 h-2 rounded-full ${['Critical'].indexOf(cond.severity) >= 0 ? 'bg-red-400' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                   </div>
                 </div>
               ))}
             </div>
           ) : (
             <div className="text-center py-4 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
               <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">No medical conditions identified.</p>
             </div>
           )}
        </section>

        {/* Decision & Rating */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className={`p-6 rounded-2xl border-2 flex flex-col items-center justify-center text-center ${getCategoryColor(report.riskCategory)} print:border-slate-200`}>
            <span className="text-[10px] uppercase font-black tracking-widest opacity-60">Risk Classification</span>
            <h4 className="text-3xl font-black mt-1 uppercase">{report.riskCategory}</h4>
            <div className="h-px w-12 bg-current opacity-20 my-4"></div>
            <p className="text-sm font-bold">{report.decision}</p>
          </div>

          <div className="p-6 bg-slate-900 dark:bg-black rounded-2xl text-white flex flex-col items-center justify-center text-center print:bg-slate-900">
            <span className="text-[10px] uppercase font-black tracking-widest text-slate-500">Mortality Loading</span>
            <h4 className="text-4xl font-black mt-1 text-blue-400">+{report.totalExtraMortalityPoints}</h4>
            <p className="text-xs text-slate-400 mt-2 font-medium">Extra Mortality Points (EM)</p>
          </div>
        </section>

        {/* Breakdown Visualization */}
        <section className="bg-slate-50 dark:bg-slate-700/30 rounded-2xl p-6 print:border print:border-slate-100">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
            <i className="fa-solid fa-chart-bar text-blue-500 no-print"></i>
            Risk Contribution Analysis
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 40, right: 20 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`${value} pts`, 'Impact']}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Premium Computation */}
        <section>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
            <i className="fa-solid fa-receipt text-blue-500 no-print"></i>
            Premium Computation
          </h3>
          <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm print:border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700/50 print:bg-slate-100">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Component</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                <tr>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">Base Term Life Cover</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-800 dark:text-slate-200">{formatCurrency(report.basePremium)}</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">Risk Loading ({report.totalExtraMortalityPoints} EM pts)</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-800 dark:text-slate-200">{formatCurrency(report.loadingAmount)}</td>
                </tr>
                {report.riderPremiums.accident !== undefined && report.riderPremiums.accident > 0 && (
                  <tr>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">Accident Rider</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800 dark:text-slate-200">{formatCurrency(report.riderPremiums.accident)}</td>
                  </tr>
                )}
                {report.riderPremiums.criticalIllness !== undefined && report.riderPremiums.criticalIllness > 0 && (
                  <tr>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">Critical Illness Rider</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800 dark:text-slate-200">{formatCurrency(report.riderPremiums.criticalIllness)}</td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-blue-600 dark:bg-blue-800 text-white font-bold print:bg-blue-600 print:text-white">
                <tr>
                  <td className="px-4 py-4 text-lg">Final Annual Premium</td>
                  <td className="px-4 py-4 text-right text-lg">{formatCurrency(report.finalTotalPremium)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* Policy Exclusions / Remarks */}
        {/* {report.riskCategory === RiskCategory.SUBSTANDARD && (
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800 flex gap-3 print:bg-white print:border-slate-200">
            <i className="fa-solid fa-triangle-exclamation text-amber-500 text-lg mt-0.5 no-print"></i>
            <div>
              <h5 className="text-sm font-bold text-amber-800 dark:text-amber-300 print:text-slate-800">Underwriting Remark</h5>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 print:text-slate-600">Due to extra mortality points, the policy is subject to a <b>Permanent Exclusion Rider</b> for the declared medical conditions. Coverage remains active for all other standard perils.</p>
            </div>
          </div>
        )} */}
      </div>

      <div className="p-4 bg-slate-50 dark:bg-slate-700/30 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest no-print">
        <span>Generated by InsureAI Core v3.0</span>
        <div className="flex gap-4">
          <button 
            onClick={handleDownloadPDF}
            className="hover:text-blue-500 transition-colors flex items-center gap-1"
          >
            <i className="fa-solid fa-download"></i> Download PDF
          </button>
          <button 
            onClick={handlePrint}
            className="hover:text-blue-500 transition-colors flex items-center gap-1"
          >
            <i className="fa-solid fa-print"></i> Print Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportView;
