import React from "react";
import { ApplicantInfo, UnderwritingResult } from "../types";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  LabelList,
  CartesianGrid,
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ReportViewProps {
  applicant: ApplicantInfo;
  report: UnderwritingResult;
  onReset: () => void;
}

// --- EXTRACTED HELPERS & CONSTANTS ---
const formatCurrency = (amount: number | undefined) => {
  if (!amount) return "0.00";
  return amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const getCategoryColor = (cat: string) => {
  const lowerCat = cat.toLowerCase();
  if (lowerCat.includes("sub-standard")) {
    return "text-amber-700 bg-amber-50/80 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/50 dark:text-amber-400 shadow-amber-500/10";
  }
  if (lowerCat.includes("standard")) {
    return "text-emerald-700 bg-emerald-50/80 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/50 dark:text-emerald-400 shadow-emerald-500/10";
  }
  if (lowerCat.includes("decline") || lowerCat.includes("refer")) {
    return "text-rose-700 bg-rose-50/80 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800/50 dark:text-rose-400 shadow-rose-500/10";
  }
  return "text-blue-700 bg-blue-50/80 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800/50 dark:text-blue-400 shadow-blue-500/10";
};

const getSeverityColor = (severity: number) => {
  switch (severity) {
    case 4:
      return "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800";
    case 3:
      return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800";
    case 2:
      return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800";
    case 1:
    default:
      return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800";
  }
};

const getSeverityLabel = (severity: number) => `Level ${severity}`;

const CHART_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#f43f5e",
  "#8b5cf6",
  "#06b6d4",
];

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;

  return (
    <div className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white px-3 py-2 sm:px-4 sm:py-3 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 pointer-events-none">
      <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mb-1 font-semibold uppercase tracking-wider">
        {data.name}
      </div>
      <div className="text-xs sm:text-sm font-black text-blue-600 dark:text-blue-400">
        +{data.value} EMR
      </div>
    </div>
  );
};

const SectionHeader = ({ icon, colorClass, subtitle, title, extra }: any) => (
  <div className="flex flex-col sm:flex-row sm:items-start md:items-center justify-between gap-3 md:gap-4 mb-5 md:mb-6">
    <div className="flex items-center gap-3 md:gap-4">
      <div
        className={`w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-xl md:rounded-2xl flex items-center justify-center shadow-sm ${colorClass}`}
      >
        <i className={`fa-solid ${icon} text-lg md:text-xl`}></i>
      </div>
      <div>
        <p className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] md:tracking-[0.24em] text-slate-400 dark:text-slate-500 font-bold mb-0.5 md:mb-1">
          {subtitle}
        </p>
        <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-slate-100 leading-tight">
          {title}
        </h3>
      </div>
    </div>
    {extra && <div className="mt-2 sm:mt-0 ml-14 sm:ml-0">{extra}</div>}
  </div>
);

const ReportView: React.FC<ReportViewProps> = ({
  applicant,
  report,
  onReset,
}) => {
  const chartData = report.breakdown
    .map((item) => ({
      name: item.label,
      value: item.points,
    }))
    .sort((a, b) => b.value - a.value);

  const flags: { level: string; code: string; message: string }[] = [];
  if (report.totalExtraMortalityPoints > 200) {
    flags.push({
      level: "MANUAL_UW",
      code: "HIGH_EMR",
      message: "EMR exceeds 200, requires manual Chief Underwriter review.",
    });
  }
  if (applicant.habits && applicant.habits.length > 1) {
    flags.push({
      level: "WARN",
      code: "MULTI_HABIT",
      message: "Multiple risky habits reported in lifestyle section.",
    });
  }
  if (applicant.medicalConditions && applicant.medicalConditions.length > 1) {
    flags.push({
      level: "WARN",
      code: "MULTI_MORBID",
      message: "Co-morbidities detected across multiple health systems.",
    });
  }
  if (report.decision.toLowerCase().includes("decline")) {
    flags.push({
      level: "FATAL",
      code: "FIN_FAIL",
      message: "Sum Assured exceeds maximum allowed financial multiplier.",
    });
  }
  if (flags.length === 0) {
    flags.push({
      level: "INFO",
      code: "CLEAN",
      message: "No significant underwriting flags triggered.",
    });
  }

  const currentYear = new Date().getFullYear();
  const calculatedDob = `01/01/${currentYear - applicant.age}`;

  const handlePrint = () => window.print();

  const handleDownloadPDF = () => {
    // PDF generation logic remains identical
    const doc = new jsPDF();
    const timestamp = new Date().toLocaleString("en-IN");
    const formatNum = (num: number) =>
      num.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    const refNumber = Math.floor(Math.random() * 100000);

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 32, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont(undefined, "bold");
    doc.text("InsureAI", 14, 16);
    doc.setFontSize(9);
    doc.setFont(undefined, "normal");
    doc.setTextColor(148, 163, 184);
    doc.text("Automated Underwriting Report", 14, 24);
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`Generated: ${timestamp}`, 196, 16, { align: "right" });
    doc.setTextColor(56, 189, 248);
    doc.text(`Ref: #${refNumber}`, 196, 24, { align: "right" });

    const isDecline = report.decision.toLowerCase().includes("decline");
    const isStandard = report.decision.toLowerCase().includes("standard");

    if (isDecline) doc.setFillColor(225, 29, 72);
    else if (isStandard) doc.setFillColor(16, 185, 129);
    else doc.setFillColor(245, 158, 11);

    doc.roundedRect(14, 38, 182, 10, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.text(`FINAL DECISION: ${report.decision.toUpperCase()}`, 105, 45, {
      align: "center",
    });

    const commonTableStyles = {
      theme: "grid" as const,
      styles: {
        fontSize: 8.5,
        cellPadding: 2.5,
        textColor: [51, 65, 85],
        lineColor: [226, 232, 240],
      },
      headStyles: {
        fillColor: [248, 250, 252],
        textColor: [15, 23, 42],
        fontStyle: "bold" as const,
        lineWidth: 0.1,
      },
      alternateRowStyles: { fillColor: [253, 254, 255] },
    };

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.text("1. Applicant Risk Profile", 14, 55);

    const habitsText =
      applicant.habits && applicant.habits.length > 0
        ? applicant.habits.map((h) => `${h.type}: ${h.level}`).join(", ")
        : "No risky habits disclosed";

    const profileData = [
      ["Name", applicant.name, "Age / Gender", `${applicant.age} / ${applicant.gender}`],
      ["Date of Birth", calculatedDob, "Profession", applicant.occupation],
      [
        "Avg Income",
        `Rs. ${formatNum((applicant as any).averageIncome || applicant.income || 0)}`,
        "BMI",
        applicant.bmi.toString(),
      ],
      ["Sum Assured", `Rs. ${formatNum(applicant.sumAssured)}`, "Habits", habitsText],
      ["Family History", (applicant as any).familyHistory || "Not Specified", "", ""],
    ];

    autoTable(doc, {
      ...commonTableStyles,
      startY: 58,
      head: [],
      body: profileData,
      theme: "plain",
      styles: { ...commonTableStyles.styles, cellPadding: 3, fontSize: 8.5 },
      columnStyles: {
        0: { fontStyle: "bold", textColor: [100, 116, 139], cellWidth: 35 },
        1: { textColor: [15, 23, 42], fontStyle: "bold", cellWidth: 55 },
        2: { fontStyle: "bold", textColor: [100, 116, 139], cellWidth: 35 },
        3: { textColor: [15, 23, 42], fontStyle: "bold" },
      },
      didDrawCell: (data) => {
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.5);
        doc.line(
          data.cell.x,
          data.cell.y + data.cell.height,
          data.cell.x + data.cell.width,
          data.cell.y + data.cell.height
        );
      },
    });

    let finalY = (doc as any).lastAutoTable.finalY || 58;

    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("2. Extra Mortality (EMR) Breakdown", 14, finalY + 8);

    const emrBody = report.breakdown.map((b) => [b.label, `+${b.points}`]);
    emrBody.push(["TOTAL EMR LOADING", `+${report.totalExtraMortalityPoints}`]);

    autoTable(doc, {
      ...commonTableStyles,
      startY: finalY + 11,
      head: [["Risk Component", "Points Applied"]],
      body: emrBody,
      didParseCell: (data) => {
        if (data.row.index === emrBody.length - 1) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [241, 245, 249];
          data.cell.styles.textColor = [15, 23, 42];
        }
      },
    });

    finalY = (doc as any).lastAutoTable.finalY;

    if (flags.length > 0) {
      doc.setFontSize(11);
      doc.setFont(undefined, "bold");
      doc.text("3. Underwriting System Flags", 14, finalY + 8);
      const flagsBody = flags.map((f) => [f.level, f.code, f.message]);

      autoTable(doc, {
        ...commonTableStyles,
        startY: finalY + 11,
        head: [["Severity", "Rule Code", "System Message"]],
        body: flagsBody,
        columnStyles: {
          0: { fontStyle: "bold" },
          1: { fontStyle: "italic", textColor: [100, 116, 139] },
        },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 0) {
            const level = data.cell.raw as string;
            if (level === "FATAL" || level === "MANUAL_UW") data.cell.styles.textColor = [225, 29, 72];
            else if (level === "WARN") data.cell.styles.textColor = [217, 119, 6];
            else data.cell.styles.textColor = [2, 132, 199];
          }
        },
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
    doc.setFont(undefined, "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("4. Premium Computation Schedule", 14, finalY);

    const premiumBody = [
      [
        "Base Life Cover",
        formatNum(applicant.sumAssured),
        formatNum(report.basePremium),
        formatNum(report.loadingAmount),
        formatNum(report.basePremium + report.loadingAmount),
      ],
    ];

    if (report.riderPremiums.accident) {
      premiumBody.push([
        "Accident Benefit Rider",
        "-",
        formatNum(report.riderPremiums.accident),
        "-",
        formatNum(report.riderPremiums.accident),
      ]);
    }
    if (report.riderPremiums.criticalIllness) {
      premiumBody.push([
        "Critical Illness Rider",
        formatNum(applicant.sumAssured * 0.8),
        formatNum(report.riderPremiums.criticalIllness),
        "-",
        formatNum(report.riderPremiums.criticalIllness),
      ]);
    }

    premiumBody.push(["TOTAL PAYABLE PREMIUM", "", "", "", formatNum(report.finalTotalPremium)]);

    autoTable(doc, {
      ...commonTableStyles,
      startY: finalY + 3,
      head: [["Coverage Type", "Sum Assured (Rs)", "Base Prem (Rs)", "EM Loading (Rs)", "Total (Rs)"]],
      body: premiumBody,
      headStyles: { ...commonTableStyles.headStyles, halign: "right" },
      columnStyles: {
        0: { halign: "left", fontStyle: "bold" },
        1: { halign: "right" },
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right", fontStyle: "bold", textColor: [15, 23, 42] },
      },
      didParseCell: (data) => {
        if (data.section === "head" && data.column.index === 0) {
          data.cell.styles.halign = "left";
        }
        if (data.row.index === premiumBody.length - 1) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [30, 58, 138];
          data.cell.styles.textColor = [255, 255, 255];
          data.cell.styles.fontSize = 9.5;
        }
      },
    });

    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.setDrawColor(226, 232, 240);
      doc.line(14, 282, 196, 282);
      doc.text("This is a computer-generated underwriting assessment based on digital inputs. Valid subject to final medical verification.", 14, 288);
      doc.text(`Page ${i} of ${pageCount}`, 196, 288, { align: "right" });
    }

    doc.save(`InsureAI_Assessment_${applicant.name.replace(/\s+/g, "_")}.pdf`);
  };

  // Base responsive class for dashboard sections
  const cardBaseClass =
    "bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 rounded-2xl md:rounded-3xl p-5 sm:p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow duration-300";

  return (
    <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl md:rounded-3xl shadow-xl md:shadow-2xl border border-slate-200/60 dark:border-slate-800 flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-700 print:shadow-none print:border-none transition-all w-full max-w-full overflow-hidden">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-black dark:via-slate-900 dark:to-black p-5 sm:p-6 md:p-8 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 rounded-t-2xl md:rounded-t-3xl print:bg-white print:text-black print:hidden">
        <div className="w-full sm:w-auto">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            Underwriting Report
          </h2>
          <p className="text-slate-400 text-[10px] sm:text-xs mt-1 sm:mt-2 uppercase tracking-widest font-semibold flex flex-wrap items-center gap-2">
            <span>Ref: #{Math.floor(Math.random() * 100000)}</span>
            <span className="w-1 h-1 rounded-full bg-slate-600 hidden sm:inline-block"></span>
            <span>InsureAI Core</span>
          </p>
        </div>
        <button
          onClick={onReset}
          className="w-full sm:w-auto group text-xs sm:text-sm bg-white/5 hover:bg-blue-600 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl transition-all duration-300 border border-white/10 hover:border-blue-500 backdrop-blur-sm font-medium flex items-center justify-center shadow-lg hover:shadow-blue-500/25"
        >
          <i className="fa-solid fa-arrow-rotate-left mr-2 opacity-70 group-hover:-rotate-180 transition-transform duration-500"></i>{" "}
          New Assessment
        </button>
      </div>

      {/* Main scrollable body area - adapted for native scrolling on mobile, constrained on large screens */}
      <div className="p-4 sm:p-6 md:p-8 flex-grow overflow-y-auto space-y-6 md:space-y-8 lg:max-h-[calc(100vh-16rem)] print:max-h-none print:overflow-visible print:p-0 scroll-smooth custom-scrollbar">
        
        {/* Top Section: Decision & EMR */}
        <section className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">
          <div
            className={`col-span-1 lg:col-span-3 p-6 sm:p-8 rounded-2xl md:rounded-3xl border shadow-sm flex flex-col items-center justify-center text-center relative transition-all duration-500 hover:scale-[1.01] ${getCategoryColor(
              report.riskCategory
            )} print:border-slate-200 group overflow-hidden`}
          >
            <div className="absolute -right-5 -top-5 sm:-right-10 sm:-top-10 opacity-10 rotate-12 pointer-events-none group-hover:rotate-6 group-hover:scale-110 transition-transform duration-700">
              <i className="fa-solid fa-stamp text-7xl sm:text-9xl"></i>
            </div>
            <span className="text-[10px] sm:text-xs uppercase font-black tracking-[0.2em] opacity-70 mb-2 z-10">
              Final Classification
            </span>
            <h4 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight z-10 drop-shadow-sm">
              {report.riskCategory}
            </h4>
            <div className="h-1 w-12 sm:w-16 bg-current opacity-20 my-4 sm:my-5 rounded-full z-10 transition-all duration-500 group-hover:w-24"></div>
            <p className="text-sm sm:text-base font-bold bg-white/40 dark:bg-black/20 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full z-10 backdrop-blur-sm border border-current/10">
              {report.decision}
            </p>
          </div>

          <div className="col-span-1 lg:col-span-2 p-6 sm:p-8 bg-slate-900 dark:bg-black rounded-2xl md:rounded-3xl text-white flex flex-col items-center justify-center text-center shadow-xl shadow-slate-900/20 relative print:bg-slate-100 print:text-black group hover:-translate-y-1 transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-transparent pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 sm:w-32 sm:h-32 bg-blue-500/20 rounded-full blur-2xl group-hover:bg-blue-500/30 transition-colors duration-500"></div>

            <span className="text-[10px] sm:text-xs uppercase font-black tracking-[0.2em] text-slate-400 mb-2 z-10">
              Total Mortality Load
            </span>
            <div className="flex items-baseline gap-1 z-10">
              <h4 className="text-4xl sm:text-5xl md:text-6xl font-black text-white group-hover:scale-110 transition-transform duration-300">
                +{report.totalExtraMortalityPoints}
              </h4>
              <span className="text-blue-400 font-bold text-lg sm:text-xl">pts</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-3 sm:mt-4 font-medium px-3 py-1 sm:px-4 sm:py-1 bg-white/5 rounded-full border border-white/5 z-10 backdrop-blur-sm">
              EMR Score
            </p>
          </div>
        </section>

        {/* Profile Grid */}
        <section className={cardBaseClass}>
          <SectionHeader
            icon="fa-id-card-clip"
            colorClass="bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
            subtitle="Applicant Profile"
            title="Applicant Snapshot"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
            {[
              { icon: "fa-user", label: "Full Name", value: applicant.name, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-500/10" },
              { icon: "fa-cake-candles", label: "Age / Gender", value: `${applicant.age} Yrs / ${applicant.gender}`, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-500/10" },
              { icon: "fa-briefcase", label: "Occupation", value: applicant.occupation, truncate: true, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-500/10" },
              { icon: "fa-wallet", label: "Avg Income", value: `₹ ${formatCurrency((applicant as any).averageIncome || applicant.income || 0)}`, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
              { icon: "fa-shield", label: "Sum Assured", value: `₹ ${formatCurrency(applicant.sumAssured)}`, color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-500/10" },
              { icon: "fa-weight-scale", label: "BMI", value: applicant.bmi, color: "text-pink-500", bg: "bg-pink-50 dark:bg-pink-500/10" },
              { icon: "fa-users", label: "Family History", value: (applicant as any).familyHistory || "Not disclosed", colSpan: true, color: "text-cyan-500", bg: "bg-cyan-50 dark:bg-cyan-500/10" },
              {
                icon: "fa-smoking",
                label: "Disclosed Habits",
                value: applicant.habits && applicant.habits.length > 0 ? applicant.habits.map((h) => `${h.type} (${h.level})`).join(" • ") : "No significant habits",
                colSpan: true,
                color: "text-rose-500",
                bg: "bg-rose-50 dark:bg-rose-500/10",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className={`group relative bg-slate-50 dark:bg-slate-900/50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/60 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-600 hover:-translate-y-0.5 sm:hover:-translate-y-1 transition-all duration-300 ${
                  item.colSpan ? `col-span-1 sm:col-span-2` : ""
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                  <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg flex items-center justify-center ${item.bg} group-hover:scale-110 transition-transform duration-300`}>
                    <i className={`fa-solid ${item.icon} ${item.color} text-[8px] sm:text-[10px]`}></i>
                  </div>
                  <span className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">
                    {item.label}
                  </span>
                </div>
                <p
                  className={`text-sm md:text-base font-bold text-slate-800 dark:text-slate-200 pl-1 ${item.truncate ? "truncate" : ""}`}
                  title={item.truncate ? item.value.toString() : undefined}
                >
                  {item.value}
                </p>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-1 bg-blue-500 rounded-t-full group-hover:w-1/2 transition-all duration-300 opacity-0 group-hover:opacity-100"></div>
              </div>
            ))}
          </div>
        </section>

        {/* Analytics Section */}
        <section className={cardBaseClass}>
          <SectionHeader
            icon="fa-chart-pie"
            colorClass="bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400"
            subtitle="Risk Impact Analysis"
            title="Top EMR Drivers"
            extra={
              <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-semibold bg-slate-100 dark:bg-slate-700 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full whitespace-nowrap">
                Weighted impact
              </span>
            }
          />
          
          <div className="w-full overflow-x-auto custom-scrollbar relative z-10 mt-4">
            {/* FIX 1: Make height dynamic so the bars never squish vertically */}
            <div 
              className="min-w-[550px]" 
              style={{ height: `${Math.max(320, chartData.length * 48)}px` }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ left: 40, right: 40, top: 10, bottom: 10 }}
                  barCategoryGap="25%"
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(148,163,184,0.15)" />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={200}
                    // FIX 2: interval={0} forces Recharts to render EVERY label, disabling the auto-hide
                    interval={0}
                    tick={({ x, y, payload }) => {
                      const label = payload.value;
                      const maxLength = 35; 
                      const truncated = label.length > maxLength ? label.substring(0, maxLength) + "..." : label;
                      return (
                        <g transform={`translate(${x - 5},${y})`}>
                          <text x={0} y={0} dy={4} textAnchor="end" className="fill-slate-600 dark:fill-slate-400 text-xs font-semibold">
                            {truncated}
                          </text>
                        </g>
                      );
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(148,163,184,0.05)" }} />
                  <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={20} animationDuration={900}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                    <LabelList dataKey="value" position="right" formatter={(val: number) => `+${val}`} className="fill-slate-800 dark:fill-slate-200 text-xs font-bold" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Clinical Findings */}
        <section className={cardBaseClass}>
          <SectionHeader
            icon="fa-stethoscope"
            colorClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
            subtitle="Clinical Findings"
            title="Key Medical Insights"
          />
          {applicant.medicalConditions.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              {applicant.medicalConditions.map((cond, idx) => (
                <div key={idx} className="group bg-slate-50 dark:bg-slate-900/50 p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/60 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-300">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{cond.name}</p>
                      <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 sm:mt-1.5 leading-relaxed">{cond.indicators || "Standard condition protocols applied."}</p>
                    </div>
                    <span className={`self-start sm:self-auto inline-flex items-center rounded-full border px-2.5 py-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.18em] whitespace-nowrap ${getSeverityColor(cond.severity)}`}>
                      {getSeverityLabel(cond.severity)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="min-h-[140px] sm:min-h-[160px] flex flex-col items-center justify-center text-center p-4 sm:p-6 bg-slate-50 dark:bg-slate-900/50 rounded-xl sm:rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
              <div className="mb-3 sm:mb-4 rounded-full bg-emerald-50 dark:bg-emerald-900/20 p-3 sm:p-4 text-emerald-500 shadow-sm">
                <i className="fa-solid fa-check text-lg sm:text-xl"></i>
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Clean Health Profile</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">No clinical risk markers detected.</p>
            </div>
          )}
        </section>

        {/* System Alerts */}
        <section className={cardBaseClass}>
          <SectionHeader
            icon="fa-triangle-exclamation"
            colorClass="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
            subtitle="Underwriting Rules"
            title="System Alerts"
          />
          <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-700 rounded-xl sm:rounded-2xl overflow-hidden">
            {/* Added overflow-x-auto to prevent table squishing on mobile */}
            <div className="overflow-x-auto w-full custom-scrollbar">
              <table className="w-full text-sm min-w-[500px]">
                <thead className="bg-white/50 dark:bg-slate-800/50 border-b border-slate-200/60 dark:border-slate-700">
                  <tr>
                    <th className="text-left px-4 sm:px-5 py-3 sm:py-4 font-bold text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs uppercase tracking-wider w-32 sm:w-40">Severity</th>
                    <th className="text-left px-4 sm:px-5 py-3 sm:py-4 font-bold text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs uppercase tracking-wider">Alert Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-slate-700/50">
                  {flags.map((flag, idx) => {
                    const isCritical = flag.level === "FATAL" || flag.level === "MANUAL_UW";
                    return (
                      <tr key={idx} className={`hover:bg-white dark:hover:bg-slate-800 transition-colors group ${isCritical ? "bg-rose-50/30 dark:bg-rose-900/10" : ""}`}>
                        <td className="px-4 sm:px-5 py-3 sm:py-4 align-top">
                          <div className="flex items-center gap-2">
                            {isCritical && (
                              <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-rose-500"></span>
                              </span>
                            )}
                            <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded text-[9px] sm:text-[10px] font-black tracking-widest uppercase ${
                              isCritical ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" : flag.level === "WARN" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            }`}>
                              {flag.level}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 sm:px-5 py-3 sm:py-4">
                          <div className="font-mono text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {flag.code}
                          </div>
                          <div className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm leading-relaxed">
                            {flag.message}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Premium Schedule */}
        <section className={cardBaseClass}>
          <SectionHeader
            icon="fa-file-invoice-dollar"
            colorClass="bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
            subtitle="Financials"
            title="Premium Schedule"
          />
          <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-700 rounded-xl sm:rounded-2xl overflow-hidden">
            {/* Added overflow-x-auto here as well */}
            <div className="overflow-x-auto w-full custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[400px]">
                <thead className="bg-white/50 dark:bg-slate-800/50 border-b border-slate-200/60 dark:border-slate-700">
                  <tr>
                    <th className="px-4 sm:px-5 py-3 sm:py-4 font-bold text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs uppercase tracking-wider">Coverage Component</th>
                    <th className="px-4 sm:px-5 py-3 sm:py-4 font-bold text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs uppercase tracking-wider text-right">Premium</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-slate-700/50">
                  <tr className="hover:bg-white dark:hover:bg-slate-800 transition-colors group">
                    <td className="px-4 sm:px-5 py-3 sm:py-4">
                      <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <i className="fa-solid fa-shield-heart text-blue-500 opacity-50 group-hover:opacity-100 transition-opacity"></i>
                        Base Life Cover
                      </div>
                      <div className="text-[10px] sm:text-xs text-slate-500 mt-1 ml-5 sm:ml-6">
                        Sum: ₹ {formatCurrency(applicant.sumAssured)}
                      </div>
                    </td>
                    <td className="px-4 sm:px-5 py-3 sm:py-4 text-right">
                      <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                        ₹ {formatCurrency(report.basePremium)}
                      </div>
                    </td>
                  </tr>

                  {report.loadingAmount > 0 && (
                    <tr className="hover:bg-rose-50/50 dark:hover:bg-rose-900/10 transition-colors group">
                      <td className="px-4 sm:px-5 py-3 sm:py-4">
                        <div className="text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                          <i className="fa-solid fa-arrow-up-right-dots text-[10px] sm:text-xs group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform"></i>
                          EMR Loading
                        </div>
                        <div className="text-[10px] sm:text-xs text-slate-500 mt-1 ml-4 sm:ml-5">
                          Based on risk profile
                        </div>
                      </td>
                      <td className="px-4 sm:px-5 py-3 sm:py-4 text-right">
                        <div className="text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400">
                          + ₹ {formatCurrency(report.loadingAmount)}
                        </div>
                      </td>
                    </tr>
                  )}

                  {report.riderPremiums.accident !== undefined && report.riderPremiums.accident > 0 && (
                    <tr className="hover:bg-white dark:hover:bg-slate-800 transition-colors group">
                      <td className="px-4 sm:px-5 py-3 sm:py-4">
                        <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <i className="fa-solid fa-car-burst text-indigo-500 opacity-50 group-hover:opacity-100 transition-opacity"></i>
                          Accident Rider
                        </div>
                      </td>
                      <td className="px-4 sm:px-5 py-3 sm:py-4 text-right">
                        <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                          ₹ {formatCurrency(report.riderPremiums.accident)}
                        </div>
                      </td>
                    </tr>
                  )}
                  {report.riderPremiums.criticalIllness !== undefined && report.riderPremiums.criticalIllness > 0 && (
                    <tr className="hover:bg-white dark:hover:bg-slate-800 transition-colors group">
                      <td className="px-4 sm:px-5 py-3 sm:py-4">
                        <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <i className="fa-solid fa-heart-pulse text-rose-500 opacity-50 group-hover:opacity-100 transition-opacity"></i>
                          Critical Illness Rider
                        </div>
                        <div className="text-[10px] sm:text-xs text-slate-500 mt-1 ml-5 sm:ml-6">
                          Sum: ₹ {formatCurrency(applicant.sumAssured * 0.8)}
                        </div>
                      </td>
                      <td className="px-4 sm:px-5 py-3 sm:py-4 text-right">
                        <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                          ₹ {formatCurrency(report.riderPremiums.criticalIllness)}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white relative overflow-hidden group">
                  <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shimmer_1.5s_infinite]"></div>
                  <tr>
                    <td className="px-4 sm:px-5 py-4 sm:py-5 text-xs sm:text-sm uppercase tracking-wider font-bold relative z-10">Total Annual Premium</td>
                    <td className="px-4 sm:px-5 py-4 sm:py-5 text-right text-lg sm:text-xl font-black relative z-10 whitespace-nowrap">
                      ₹ {formatCurrency(report.finalTotalPremium)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </section>
      </div>

      {/* Footer Actions */}
      <div className="p-4 sm:p-5 md:px-8 bg-slate-100 dark:bg-slate-900/80 rounded-b-2xl md:rounded-b-3xl border-t border-slate-200/60 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] sm:text-xs font-semibold uppercase tracking-wider no-print">
        <span className="text-slate-400 flex items-center gap-1.5 sm:gap-2">
          <i className="fa-solid fa-lock text-[8px] sm:text-[10px]"></i> Generated securely by InsureAI
        </span>
        <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={handleDownloadPDF}
            className="flex-1 sm:flex-none justify-center bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all flex items-center gap-2 shadow-sm group"
          >
            <i className="fa-solid fa-file-pdf group-hover:scale-110 transition-transform text-rose-500"></i>{" "}
            Save PDF
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 sm:flex-none justify-center bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all flex items-center gap-2 shadow-sm group"
          >
            <i className="fa-solid fa-print group-hover:scale-110 transition-transform text-slate-500 dark:text-slate-400"></i>{" "}
            Print
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportView;