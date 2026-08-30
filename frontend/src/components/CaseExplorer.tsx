import React, { useState, useMemo } from "react";
import { CaseItem, ReviewItem } from "../types";
import { 
  Search, 
  Filter, 
  Layers, 
  Terminal, 
  Cpu, 
  ChevronRight, 
  X, 
  Copy, 
  Check, 
  AlertCircle,
  Network,
  ShieldCheck
} from "lucide-react";
import { runAllDeterministicChecks } from "../utils/ruleChecker";

interface CaseExplorerProps {
  cases: CaseItem[];
  reviews: ReviewItem[];
  onSelectCaseForDiagnose: (caseItem: CaseItem) => void;
}

export const CaseExplorer: React.FC<CaseExplorerProps> = ({
  cases,
  reviews,
  onSelectCaseForDiagnose,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIssueType, setSelectedIssueType] = useState<string>("All");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("All");
  const [selectedOsi, setSelectedOsi] = useState<string>("All");
  const [selectedDecision, setSelectedDecision] = useState<string>("All");
  const [activeCaseModal, setActiveCaseModal] = useState<CaseItem | null>(null);
  const [copiedOutput, setCopiedOutput] = useState(false);

  // Build review decision lookup by case_id
  const reviewMap = useMemo(() => {
    const map = new Map<string, ReviewItem>();
    reviews.forEach((r) => map.set(r.case_id, r));
    return map;
  }, [reviews]);

  // Unique lists for filters
  const issueTypes = ["All", ...Array.from(new Set(cases.map((c) => c.issue_type)))];
  const severities = ["All", "High", "Medium", "Low"];
  const osiLayers = ["All", "Layer 1", "Layer 2", "Layer 3", "Layer 4", "Layer 7"];
  const decisions = ["All", "Accepted", "Edited", "Rejected"];

  // Filter cases
  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        c.case_id.toLowerCase().includes(q) ||
        c.symptom.toLowerCase().includes(q) ||
        c.expected_fault.toLowerCase().includes(q) ||
        c.topology_note.toLowerCase().includes(q) ||
        c.issue_type.toLowerCase().includes(q);

      const matchesIssue = selectedIssueType === "All" || c.issue_type === selectedIssueType;
      const matchesSeverity = selectedSeverity === "All" || c.severity.toLowerCase() === selectedSeverity.toLowerCase();
      const matchesOsi = selectedOsi === "All" || c.osi_layer === selectedOsi;

      const review = reviewMap.get(c.case_id);
      const matchesDecision =
        selectedDecision === "All" ||
        (review && review.human_decision === selectedDecision);

      return matchesSearch && matchesIssue && matchesSeverity && matchesOsi && matchesDecision;
    });
  }, [cases, searchQuery, selectedIssueType, selectedSeverity, selectedOsi, selectedDecision, reviewMap]);

  const handleCopyShowOutput = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedOutput(true);
    setTimeout(() => setCopiedOutput(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header & Search Controls */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              Troubleshooting Case Knowledge Base
            </h2>
            <p className="text-xs text-slate-400">
              Explore 31 lab cases covering Cisco switching, routing, ACLs, NAT, DHCP, DNS, and Wireless
            </p>
          </div>
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by ID, symptom, command, or topology..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl glass-input placeholder:text-slate-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-800/80 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 font-semibold">
            <Filter className="w-3.5 h-3.5" /> Filters:
          </div>

          {/* Issue Type */}
          <div className="flex items-center gap-1">
            <span className="text-slate-500">Category:</span>
            <select
              value={selectedIssueType}
              onChange={(e) => setSelectedIssueType(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:border-cyan-500 focus:outline-none"
            >
              {issueTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Severity */}
          <div className="flex items-center gap-1">
            <span className="text-slate-500">Severity:</span>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:border-cyan-500 focus:outline-none"
            >
              {severities.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* OSI Layer */}
          <div className="flex items-center gap-1">
            <span className="text-slate-500">OSI Layer:</span>
            <select
              value={selectedOsi}
              onChange={(e) => setSelectedOsi(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:border-cyan-500 focus:outline-none"
            >
              {osiLayers.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          {/* Review Decision */}
          <div className="flex items-center gap-1">
            <span className="text-slate-500">Review:</span>
            <select
              value={selectedDecision}
              onChange={(e) => setSelectedDecision(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:border-cyan-500 focus:outline-none"
            >
              {decisions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="ml-auto text-xs text-slate-400 font-mono">
            Showing <strong className="text-cyan-400">{filteredCases.length}</strong> of {cases.length} cases
          </div>
        </div>
      </div>

      {/* Case Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {filteredCases.map((item) => {
          const review = reviewMap.get(item.case_id);
          const checkRes = runAllDeterministicChecks(item.case_id, item.show_output);
          const hasFlags = checkRes.flags.length > 0;

          return (
            <div
              key={item.case_id}
              className="glass-panel rounded-xl p-5 border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col justify-between group hover:shadow-lg hover:shadow-cyan-950/30"
            >
              <div className="space-y-3">
                {/* Top badges */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-cyan-500/30">
                      {item.case_id}
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-800/40">
                      {item.issue_type}
                    </span>
                  </div>
                  {/* Severity Badge */}
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      item.severity.toLowerCase() === "high"
                        ? "bg-rose-950/80 text-rose-400 border border-rose-800/60"
                        : item.severity.toLowerCase() === "medium"
                        ? "bg-amber-950/80 text-amber-400 border border-amber-800/60"
                        : "bg-emerald-950/80 text-emerald-400 border border-emerald-800/60"
                    }`}
                  >
                    {item.severity}
                  </span>
                </div>

                {/* Symptom */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-100 line-clamp-2 group-hover:text-cyan-300 transition-colors">
                    {item.symptom}
                  </h4>
                </div>

                {/* Topology & OSI */}
                <div className="space-y-1.5 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Network className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                    <span className="truncate font-mono text-[11px]">{item.topology_note}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>{item.osi_layer}</span>
                    {hasFlags && (
                      <span className="flex items-center gap-1 text-amber-400 font-medium">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {checkRes.flags.length} Rule {checkRes.flags.length === 1 ? "Flag" : "Flags"}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Footer & Actions */}
              <div className="pt-4 mt-3 border-t border-slate-800/70 flex items-center justify-between gap-2">
                {/* Human Review Status Badge */}
                <div>
                  {review ? (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                        review.human_decision === "Accepted"
                          ? "bg-emerald-950/80 text-emerald-400 border border-emerald-700/50"
                          : review.human_decision === "Edited"
                          ? "bg-amber-950/80 text-amber-400 border border-amber-700/50"
                          : "bg-rose-950/80 text-rose-400 border border-rose-700/50"
                      }`}
                    >
                      ● {review.human_decision}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500">Unreviewed</span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setActiveCaseModal(item)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                    title="View Cisco Show Output & Details"
                  >
                    <Terminal className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onSelectCaseForDiagnose(item)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-slate-950 text-xs font-semibold border border-cyan-500/40 transition-all"
                  >
                    <Cpu className="w-3.5 h-3.5" />
                    <span>Diagnose</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredCases.length === 0 && (
        <div className="text-center py-12 glass-panel rounded-2xl border border-slate-800 space-y-3">
          <AlertCircle className="w-10 h-10 text-slate-500 mx-auto" />
          <p className="text-slate-300 font-semibold text-sm">No cases matched your filter criteria.</p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedIssueType("All");
              setSelectedSeverity("All");
              setSelectedOsi("All");
              setSelectedDecision("All");
            }}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-cyan-600 text-white hover:bg-cyan-500 transition-colors"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Case Details Modal */}
      {activeCaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="glass-panel-glow bg-[#0f172a] rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-slate-700 shadow-2xl p-6 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white font-mono">{activeCaseModal.case_id}</h3>
                    <span className="px-2 py-0.5 text-xs font-bold rounded bg-cyan-950 text-cyan-300 border border-cyan-700">
                      {activeCaseModal.issue_type}
                    </span>
                    <span className="px-2 py-0.5 text-xs font-bold rounded bg-slate-800 text-slate-300">
                      {activeCaseModal.osi_layer}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{activeCaseModal.concept_tag}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveCaseModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Symptom & Topology */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Reported Symptom</span>
                <p className="text-slate-200 font-medium leading-relaxed">{activeCaseModal.symptom}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Topology Context</span>
                <p className="text-cyan-300 font-mono leading-relaxed">{activeCaseModal.topology_note}</p>
              </div>
            </div>

            {/* Deterministic Rule Checker Preview on This Case */}
            {(() => {
              const res = runAllDeterministicChecks(activeCaseModal.case_id, activeCaseModal.show_output);
              return (
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Deterministic Rule Checker Evaluation
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                        res.passed
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                          : "bg-amber-950 text-amber-400 border border-amber-800"
                      }`}
                    >
                      {res.passed ? "0 Flags Detected" : `${res.flags.length} Flags Detected`}
                    </span>
                  </div>
                  {res.flags.length > 0 ? (
                    <div className="space-y-1.5 pt-1">
                      {res.flags.map((flag, idx) => (
                        <div key={idx} className="p-2 rounded bg-slate-950 border border-amber-900/40 text-xs text-amber-300 flex items-center gap-2">
                          <span className="font-mono font-bold text-[10px] uppercase px-1.5 py-0.2 bg-amber-900/60 rounded">
                            {flag.rule}
                          </span>
                          <span>{flag.message}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">
                      Deterministic checks clean. LLM deep contextual diagnosis recommended.
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Cisco Show Command Output (CLI Terminal) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300 font-mono flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-cyan-400" /> Cisco Show Command Output (Evidence)
                </span>
                <button
                  onClick={() => handleCopyShowOutput(activeCaseModal.show_output)}
                  className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 bg-slate-800/80 px-2.5 py-1 rounded border border-slate-700"
                >
                  {copiedOutput ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedOutput ? "Copied!" : "Copy Output"}</span>
                </button>
              </div>
              <div className="cisco-terminal rounded-xl p-4 text-xs overflow-x-auto max-h-60 leading-relaxed font-mono whitespace-pre select-text">
                {activeCaseModal.show_output}
              </div>
            </div>

            {/* Expected Fault Benchmark */}
            <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-800/50 text-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                Ground Truth Benchmark / Expected Fault
              </span>
              <p className="text-slate-200 font-medium">{activeCaseModal.expected_fault}</p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                onClick={() => setActiveCaseModal(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const c = activeCaseModal;
                  setActiveCaseModal(null);
                  onSelectCaseForDiagnose(c);
                }}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-md shadow-cyan-500/20 transition-all"
              >
                <Cpu className="w-4 h-4" />
                <span>Launch in AI Diagnostic Studio</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
