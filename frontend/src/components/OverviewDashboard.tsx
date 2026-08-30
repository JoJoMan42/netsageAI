import React from "react";
import { CaseItem, ReviewItem } from "../types";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell
} from "recharts";
import { 
  ShieldAlert, 
  CheckCircle2, 
  CheckCheck, 
  Cpu, 
  Layers, 
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  FileSpreadsheet
} from "lucide-react";
import { NavTab } from "./Header";

interface OverviewDashboardProps {
  cases: CaseItem[];
  reviews: ReviewItem[];
  onNavigate: (tab: NavTab) => void;
}

const ISSUE_COLORS: Record<string, string> = {
  VLAN: "#38bdf8",
  Gateway: "#818cf8",
  DHCP: "#34d399",
  DNS: "#fbbf24",
  Routing: "#f87171",
  ACL: "#f472b6",
  NAT: "#22d3ee",
  Wireless: "#fb923c",
};

const SEVERITY_COLORS: Record<string, string> = {
  High: "#f43f5e",
  Medium: "#f59e0b",
  Low: "#10b981",
};

const DECISION_COLORS: Record<string, string> = {
  Accepted: "#10b981",
  Edited: "#f59e0b",
  Rejected: "#f43f5e",
};

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  cases,
  reviews,
  onNavigate,
}) => {
  // Compute analytics
  const totalCases = cases.length;
  const totalReviews = reviews.length;
  const acceptedCount = reviews.filter((r) => r.human_decision === "Accepted").length;
  const editedCount = reviews.filter((r) => r.human_decision === "Edited").length;
  const rejectedCount = reviews.filter((r) => r.human_decision === "Rejected").length;
  const agreementPct = totalReviews > 0 ? ((acceptedCount / totalReviews) * 100).toFixed(1) : "0.0";

  // Issue Type Chart Data
  const issueCounts: Record<string, number> = {};
  cases.forEach((c) => {
    issueCounts[c.issue_type] = (issueCounts[c.issue_type] || 0) + 1;
  });
  const issueData = Object.entries(issueCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Severity Data
  const severityCounts: Record<string, number> = {};
  cases.forEach((c) => {
    severityCounts[c.severity] = (severityCounts[c.severity] || 0) + 1;
  });
  const severityData = Object.entries(severityCounts).map(([name, value]) => ({ name, value }));

  // Human Decisions Data
  const decisionData = [
    { name: "Accepted", value: acceptedCount, color: DECISION_COLORS.Accepted },
    { name: "Edited", value: editedCount, color: DECISION_COLORS.Edited },
    { name: "Rejected", value: rejectedCount, color: DECISION_COLORS.Rejected },
  ];

  // Correction Reasons Data
  const correctionCounts: Record<string, number> = {};
  reviews
    .filter((r) => r.human_decision !== "Accepted" && r.correction_reason)
    .forEach((r) => {
      correctionCounts[r.correction_reason] = (correctionCounts[r.correction_reason] || 0) + 1;
    });
  const correctionData = Object.entries(correctionCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // OSI Layer Data
  const osiCounts: Record<string, number> = {};
  cases.forEach((c) => {
    osiCounts[c.osi_layer] = (osiCounts[c.osi_layer] || 0) + 1;
  });
  const layerOrder = ["Layer 1", "Layer 2", "Layer 3", "Layer 4", "Layer 7"];
  const osiData = layerOrder
    .filter((l) => osiCounts[l])
    .map((name) => ({ name, value: osiCounts[name] }));

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Hero Banner with Responsible AI Promise */}
      <div className="relative overflow-hidden rounded-2xl glass-panel-glow p-6 sm:p-8 bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/40 border border-cyan-500/30">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Deterministic Rule Checks + Calibrated AI + Human Review
              </span>
              <span className="flex items-center gap-1 text-xs text-emerald-400 font-mono">
                <CheckCheck className="w-4 h-4" /> 100% Case Coverage
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Cisco Lab Network Diagnostics & AI Governance
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              NetSage AI guarantees that AI never executes network modifications autonomously.
              All diagnoses are grounded in deterministic Cisco IOS checks and must be validated by human network engineers.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate("ai-diagnose")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/25 transition-all transform hover:-translate-y-0.5"
            >
              <Cpu className="w-4 h-4" />
              <span>Launch AI Diagnostic Studio</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate("human-review")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass-panel text-slate-200 hover:text-white hover:bg-slate-800 text-sm font-medium transition-all"
            >
              <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
              <span>Review Audit Log</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Cases */}
        <div className="glass-panel rounded-xl p-5 border border-slate-800 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Troubleshooting Cases</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono">{totalCases}</span>
            <span className="text-xs text-blue-400 font-medium">8 Fault Categories</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">VLAN, Routing, DHCP, ACL, NAT, DNS, Gateway, Wireless</p>
        </div>

        {/* Agreement Rate */}
        <div className="glass-panel rounded-xl p-5 border border-slate-800 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">AI / Human Agreement</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-400 font-mono">{agreementPct}%</span>
            <span className="text-xs text-slate-400">({acceptedCount}/{totalReviews} accepted)</span>
          </div>
          <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-1000"
              style={{ width: `${agreementPct}%` }}
            />
          </div>
        </div>

        {/* Human Decisions Split */}
        <div className="glass-panel rounded-xl p-5 border border-slate-800 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Human Reviews Logged</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="text-slate-300 font-mono font-bold">{acceptedCount}</span>
              <span className="text-xs text-slate-400">Accept</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span className="text-slate-300 font-mono font-bold">{editedCount}</span>
              <span className="text-xs text-slate-400">Edit</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span className="text-slate-300 font-mono font-bold">{rejectedCount}</span>
              <span className="text-xs text-slate-400">Reject</span>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-400">100% human-verified audit trail</p>
        </div>

        {/* High Severity Alerts */}
        <div className="glass-panel rounded-xl p-5 border border-slate-800 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Critical / High Severity</span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-rose-400 font-mono">{severityCounts["High"] || 0}</span>
            <span className="text-xs text-slate-400">of {totalCases} cases ({Math.round(((severityCounts["High"] || 0) / totalCases) * 100)}%)</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">Trunk filters, Duplicate IP, Admin shutdown</p>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Cases by Issue Type */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white">Cases by Issue Type</h3>
              <p className="text-xs text-slate-400">Distribution across network sub-disciplines</p>
            </div>
            <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-2 py-1 rounded border border-cyan-800/50">
              {issueData.length} Categories
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={issueData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis 
                  dataKey="name" 
                  stroke="#64748b" 
                  fontSize={11} 
                  interval={0} 
                  angle={-25} 
                  textAnchor="end"
                />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", color: "#f8fafc" }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {issueData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={ISSUE_COLORS[entry.name] || "#38bdf8"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Case Severity Breakdown */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white">Case Severity Breakdown</h3>
              <p className="text-xs text-slate-400">Impact level classification</p>
            </div>
            <span className="text-xs font-mono text-amber-400 bg-amber-950/60 px-2 py-1 rounded border border-amber-800/50">
              Risk Profile
            </span>
          </div>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                >
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-sev-${index}`} fill={SEVERITY_COLORS[entry.name] || "#38bdf8"} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", color: "#f8fafc" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Human Review Decisions & Agreement */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white">Human Review Decisions</h3>
              <p className="text-xs text-slate-400">Engineer validation outcomes</p>
            </div>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2 py-1 rounded border border-emerald-800/50">
              Agreement: {agreementPct}%
            </span>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={decisionData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                <XAxis type="number" stroke="#64748b" fontSize={11} allowDecimals={false} />
                <YAxis dataKey="name" type="category" stroke="#cbd5e1" fontSize={12} width={70} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", color: "#f8fafc" }}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {decisionData.map((entry, index) => (
                    <Cell key={`cell-dec-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. AI Correction Reasons (Responsible AI Analysis) */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white">AI Correction Reasons</h3>
              <p className="text-xs text-slate-400">Failure mode breakdown for edited/rejected diagnoses</p>
            </div>
            <span className="text-xs font-mono text-rose-400 bg-rose-950/60 px-2 py-1 rounded border border-rose-800/50">
              {editedCount + rejectedCount} Corrections
            </span>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={correctionData} margin={{ top: 10, right: 30, left: 40, bottom: 5 }}>
                <XAxis type="number" stroke="#64748b" fontSize={11} allowDecimals={false} />
                <YAxis dataKey="name" type="category" stroke="#cbd5e1" fontSize={11} width={130} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", color: "#f8fafc" }}
                />
                <Bar dataKey="value" fill="#f43f5e" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 5. OSI Layer Distribution */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white">Cases by OSI Layer</h3>
              <p className="text-xs text-slate-400">Physical (L1), Data Link (L2), Network (L3), Transport (L4), Application (L7)</p>
            </div>
            <span className="text-xs font-mono text-indigo-400 bg-indigo-950/60 px-2 py-1 rounded border border-indigo-800/50">
              Stack Coverage
            </span>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={osiData} margin={{ top: 10, right: 20, left: -20, bottom: 5 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", color: "#f8fafc" }}
                />
                <Bar dataKey="value" fill="#818cf8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Governance & Responsible AI Guidelines Banner */}
      <div className="glass-panel rounded-2xl p-6 border border-cyan-500/20 bg-cyan-950/10">
        <h4 className="text-sm font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-cyan-400" />
          Responsible AI Architecture in NetSage AI
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="font-bold text-white mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" /> 1. Deterministic Rule Guardrails
            </div>
            <p className="text-slate-400 leading-relaxed">
              Standard Cisco syntax anomalies (interface shut, duplicate IP, subnet overlaps, trunk misconfigs) are verified before AI invocation.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="font-bold text-white mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400" /> 2. Calibrated Confidence & Evidence Grounding
            </div>
            <p className="text-slate-400 leading-relaxed">
              Diagnoses cite exact lines from show outputs. Speculative fixes are labelled with low/medium confidence and secondary test commands.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="font-bold text-white mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> 3. Human Gatekeeper Mandate
            </div>
            <p className="text-slate-400 leading-relaxed">
              Every AI diagnosis is logged, audited, and must be accepted, edited, or rejected with explicit reasons before remediation is applied.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
