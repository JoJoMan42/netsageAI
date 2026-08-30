import React, { useState } from "react";
import { CaseItem, ReviewItem, AIDiagnosisResult, Decision } from "../types";
import { 
  UserCheck, 
  CheckCircle2, 
  Edit3, 
  XCircle, 
  Download, 
  Search, 
  ShieldCheck, 
  Sparkles,
  FileSpreadsheet,
  AlertCircle,
  Check
} from "lucide-react";
import confetti from "canvas-confetti";

interface HumanReviewConsoleProps {
  cases: CaseItem[];
  reviews: ReviewItem[];
  onSaveReview: (review: ReviewItem) => void;
  activeReviewCase?: CaseItem | null;
  activeDiagnosis?: AIDiagnosisResult | null;
}

const CORRECTION_REASONS = [
  "Wrong OSI layer",
  "Missed a simpler cause",
  "Hallucinated evidence",
  "Incomplete diagnosis",
  "Incorrect interpretation of command output",
  "Inaccurate remediation command",
  "Other / Custom observation",
];

export const HumanReviewConsole: React.FC<HumanReviewConsoleProps> = ({
  cases,
  reviews,
  onSaveReview,
  activeReviewCase,
  activeDiagnosis,
}) => {
  const [selectedCaseId, setSelectedCaseId] = useState<string>(
    activeReviewCase?.case_id || cases[0]?.case_id || "CASE-001"
  );
  
  // Find current review item for selected case
  const currentReview = reviews.find((r) => r.case_id === selectedCaseId);
  const currentCase = cases.find((c) => c.case_id === selectedCaseId) || cases[0];

  // Review Form State
  const [decision, setDecision] = useState<Decision>(
    (currentReview?.human_decision as Decision) || "Accepted"
  );
  const [finalRootCause, setFinalRootCause] = useState<string>(
    currentReview?.final_root_cause || activeDiagnosis?.root_cause || currentCase?.expected_fault || ""
  );
  const [correctionReason, setCorrectionReason] = useState<string>(
    currentReview?.correction_reason || ""
  );
  const [reviewerNotes, setReviewerNotes] = useState<string>(
    currentReview?.reviewer_notes || ""
  );
  const [filterDecision, setFilterDecision] = useState<string>("All");
  const [searchTable, setSearchTable] = useState<string>("");
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Sync state when selected case changes
  const handleCaseChange = (caseId: string) => {
    setSelectedCaseId(caseId);
    const existing = reviews.find((r) => r.case_id === caseId);
    const targetCase = cases.find((c) => c.case_id === caseId);
    if (existing) {
      setDecision((existing.human_decision as Decision) || "Accepted");
      setFinalRootCause(existing.final_root_cause);
      setCorrectionReason(existing.correction_reason || "");
      setReviewerNotes(existing.reviewer_notes || "");
    } else {
      setDecision("Accepted");
      setFinalRootCause(targetCase?.expected_fault || "");
      setCorrectionReason("");
      setReviewerNotes("");
    }
  };

  const handleSaveDecision = (e: React.FormEvent) => {
    e.preventDefault();
    const newReview: ReviewItem = {
      case_id: selectedCaseId,
      ai_root_cause: activeDiagnosis?.root_cause || currentReview?.ai_root_cause || currentCase.expected_fault,
      ai_confidence: activeDiagnosis?.confidence || currentReview?.ai_confidence || "medium",
      ai_osi_layer: activeDiagnosis?.osi_layer || currentReview?.ai_osi_layer || currentCase.osi_layer,
      human_decision: decision,
      final_root_cause: decision === "Accepted" ? (activeDiagnosis?.root_cause || currentReview?.ai_root_cause || finalRootCause) : finalRootCause,
      correction_reason: decision === "Accepted" ? "" : correctionReason,
      reviewer_notes: reviewerNotes,
    };

    onSaveReview(newReview);
    setSaveSuccess(true);

    if (decision === "Accepted") {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    }

    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      "case_id",
      "ai_root_cause",
      "ai_confidence",
      "ai_osi_layer",
      "human_decision",
      "final_root_cause",
      "correction_reason",
      "reviewer_notes",
    ];

    const rows = reviews.map((r) => [
      `"${r.case_id}"`,
      `"${(r.ai_root_cause || "").replace(/"/g, '""')}"`,
      `"${r.ai_confidence || ""}"`,
      `"${r.ai_osi_layer || ""}"`,
      `"${r.human_decision || ""}"`,
      `"${(r.final_root_cause || "").replace(/"/g, '""')}"`,
      `"${(r.correction_reason || "").replace(/"/g, '""')}"`,
      `"${(r.reviewer_notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `netsage_reviewer_log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Table Data
  const filteredReviews = reviews.filter((r) => {
    const matchesDecision = filterDecision === "All" || r.human_decision === filterDecision;
    const q = searchTable.toLowerCase();
    const matchesSearch =
      !q ||
      r.case_id.toLowerCase().includes(q) ||
      r.final_root_cause.toLowerCase().includes(q) ||
      r.reviewer_notes.toLowerCase().includes(q) ||
      r.correction_reason.toLowerCase().includes(q);
    return matchesDecision && matchesSearch;
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-950 text-indigo-400 border border-indigo-800">
              Stage 3: Human-in-the-Loop Governance
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
            Human Reviewer Decision Console
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mt-1">
            <strong className="text-cyan-300">Core Principle:</strong> The AI recommends, the human decides. Validate, calibrate, or override AI diagnoses to maintain 100% auditability.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all shadow-md"
        >
          <Download className="w-4 h-4 text-cyan-400" />
          <span>Export reviewer_log.csv</span>
        </button>
      </div>

      {/* Main Review Form & Case Context */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Case Synopsis & AI Diagnosis Context (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-cyan-400" /> Target Review Case
              </h3>
              <select
                value={selectedCaseId}
                onChange={(e) => handleCaseChange(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-cyan-300 text-xs font-mono rounded-lg px-2.5 py-1 focus:border-cyan-500 focus:outline-none"
              >
                {cases.map((c) => (
                  <option key={c.case_id} value={c.case_id}>
                    {c.case_id} ({c.issue_type})
                  </option>
                ))}
              </select>
            </div>

            {/* Case Details */}
            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Symptom</span>
                <p className="text-slate-100 font-medium mt-0.5">{currentCase.symptom}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  AI Recommendation
                </span>
                <p className="text-cyan-300 font-medium mt-0.5">
                  {currentReview?.ai_root_cause || activeDiagnosis?.root_cause || currentCase.expected_fault}
                </p>
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                  <span>Confidence: <strong className="text-amber-400 font-mono">{currentReview?.ai_confidence || activeDiagnosis?.confidence || "medium"}</strong></span>
                  <span>•</span>
                  <span>OSI: <strong className="text-blue-400">{currentReview?.ai_osi_layer || activeDiagnosis?.osi_layer || currentCase.osi_layer}</strong></span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Cisco Show Output Evidence
                </span>
                <div className="cisco-terminal rounded-xl p-3 text-xs font-mono max-h-48 overflow-y-auto whitespace-pre">
                  {currentCase.show_output}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Human Review Form (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <form onSubmit={handleSaveDecision} className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Human Reviewer Decision
              </h3>
              <span className="text-xs font-mono text-cyan-400">{selectedCaseId}</span>
            </div>

            {/* Decision Radio Cards */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300">Decision Outcome:</label>
              <div className="grid grid-cols-3 gap-3">
                {/* Accepted */}
                <button
                  type="button"
                  onClick={() => setDecision("Accepted")}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-bold ${
                    decision === "Accepted"
                      ? "bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-950"
                      : "bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>Accepted</span>
                </button>

                {/* Edited */}
                <button
                  type="button"
                  onClick={() => setDecision("Edited")}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-bold ${
                    decision === "Edited"
                      ? "bg-amber-950/80 border-amber-500 text-amber-300 shadow-md shadow-amber-950"
                      : "bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <Edit3 className="w-5 h-5 text-amber-400" />
                  <span>Edited</span>
                </button>

                {/* Rejected */}
                <button
                  type="button"
                  onClick={() => setDecision("Rejected")}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-bold ${
                    decision === "Rejected"
                      ? "bg-rose-950/80 border-rose-500 text-rose-300 shadow-md shadow-rose-950"
                      : "bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <XCircle className="w-5 h-5 text-rose-400" />
                  <span>Rejected</span>
                </button>
              </div>
            </div>

            {/* Final Root Cause */}
            <div className="space-y-1.5 text-xs">
              <label className="block font-bold text-slate-300">
                Final Verified Root Cause:
              </label>
              <textarea
                rows={3}
                value={finalRootCause}
                onChange={(e) => setFinalRootCause(e.target.value)}
                disabled={decision === "Accepted"}
                className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl p-3 text-xs focus:border-cyan-500 focus:outline-none disabled:opacity-60 disabled:bg-slate-950"
                placeholder="Enter verified network root cause..."
              />
            </div>

            {/* Correction Reason (if edited or rejected) */}
            {decision !== "Accepted" && (
              <div className="space-y-1.5 text-xs animate-fadeIn">
                <label className="block font-bold text-amber-400">
                  Responsible AI Correction Reason:
                </label>
                <select
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-xs focus:border-cyan-500 focus:outline-none"
                >
                  <option value="">Select failure mode / reason...</option>
                  {CORRECTION_REASONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Reviewer Notes */}
            <div className="space-y-1.5 text-xs">
              <label className="block font-bold text-slate-300">
                Reviewer Audit Notes & Justification:
              </label>
              <textarea
                rows={2}
                value={reviewerNotes}
                onChange={(e) => setReviewerNotes(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl p-3 text-xs focus:border-cyan-500 focus:outline-none"
                placeholder="Explain why this decision was made and cite relevant verification commands..."
              />
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <div className="text-xs text-slate-400">
                {saveSuccess && (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <Check className="w-4 h-4" /> Review successfully recorded into audit trail!
                  </span>
                )}
              </div>
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Save Review Decision</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Review Log Audit Table */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
              Human Reviewer Audit Log (reviewer_log.csv)
            </h3>
            <p className="text-xs text-slate-400">
              Complete historical record of engineer decisions across all troubleshooting cases
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Filter */}
            <select
              value={filterDecision}
              onChange={(e) => setFilterDecision(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:border-cyan-500 focus:outline-none"
            >
              <option value="All">All Decisions ({reviews.length})</option>
              <option value="Accepted">Accepted Only</option>
              <option value="Edited">Edited Only</option>
              <option value="Rejected">Rejected Only</option>
            </select>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search audit log..."
                value={searchTable}
                onChange={(e) => setSearchTable(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-700 text-slate-200 rounded-xl focus:border-cyan-500 focus:outline-none w-44"
              />
            </div>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-3">Case ID</th>
                <th className="p-3">AI Root Cause</th>
                <th className="p-3">Decision</th>
                <th className="p-3">Final Root Cause</th>
                <th className="p-3">Correction Reason</th>
                <th className="p-3">Reviewer Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/40 font-sans">
              {filteredReviews.map((r) => (
                <tr key={r.case_id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="p-3 font-mono font-bold text-cyan-300 whitespace-nowrap">
                    {r.case_id}
                  </td>
                  <td className="p-3 text-slate-300 max-w-xs truncate" title={r.ai_root_cause}>
                    {r.ai_root_cause}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] inline-block ${
                        r.human_decision === "Accepted"
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                          : r.human_decision === "Edited"
                          ? "bg-amber-950 text-amber-400 border border-amber-800"
                          : "bg-rose-950 text-rose-400 border border-rose-800"
                      }`}
                    >
                      {r.human_decision}
                    </span>
                  </td>
                  <td className="p-3 text-slate-200 max-w-xs truncate font-medium" title={r.final_root_cause}>
                    {r.final_root_cause}
                  </td>
                  <td className="p-3 text-amber-400 whitespace-nowrap font-mono text-[11px]">
                    {r.correction_reason || "—"}
                  </td>
                  <td className="p-3 text-slate-400 max-w-sm truncate text-[11px]" title={r.reviewer_notes}>
                    {r.reviewer_notes || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
