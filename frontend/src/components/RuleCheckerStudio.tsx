import React, { useState, useMemo } from "react";
import { CaseItem, RuleFlag } from "../types";
import { 
  ShieldCheck, 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  Terminal, 
  Layers, 
  Info,
  CheckCircle,
  XCircle,
  FileCode2
} from "lucide-react";
import { runAllDeterministicChecks } from "../utils/ruleChecker";

interface RuleCheckerStudioProps {
  cases: CaseItem[];
  onSelectCaseForDiagnose: (caseItem: CaseItem) => void;
}

interface RuleDefinition {
  id: string;
  name: string;
  category: string;
  severity: "high" | "medium" | "low";
  description: string;
  ciscoCommand: string;
  detectedRules: string[];
}

const RULES_LIST: RuleDefinition[] = [
  {
    id: "check_interface_status",
    name: "1. Interface Status Check",
    category: "Physical / Line Protocol",
    severity: "high",
    description: "Detects interfaces that are administratively down, line protocol down, or disconnected.",
    ciscoCommand: "show ip interface brief, show interfaces",
    detectedRules: ["INTERFACE_ADMIN_DOWN", "INTERFACE_DOWN", "INTERFACE_LINE_DOWN"],
  },
  {
    id: "check_duplicate_ips",
    name: "2. Duplicate IP Check",
    category: "Addressing / Conflicts",
    severity: "high",
    description: "Detects duplicate IP addresses assigned across interfaces or reported in %IP-4-DUPADDR / %DHCP-4-CONFLICT syslog messages.",
    ciscoCommand: "show ip interface brief, show ip arp, syslog",
    detectedRules: ["DUPLICATE_IP_DETECTED", "DUPLICATE_IP_ASSIGNED"],
  },
  {
    id: "check_subnet_masks",
    name: "3. Subnet Mask & Overlap Check",
    category: "Subnetting / Addressing",
    severity: "high",
    description: "Validates contiguous binary subnet mask notation (e.g., catching 255.255.250.0) and detects subnet overlap collisions.",
    ciscoCommand: "show running-config, ip address command",
    detectedRules: ["INVALID_SUBNET_MASK", "SUBNET_MASK_MISMATCH", "SUBNET_OVERLAP_DETECTED"],
  },
  {
    id: "check_gateway_mismatch",
    name: "4. Gateway Mismatch Check",
    category: "Routing & Gateways",
    severity: "medium",
    description: "Identifies missing default gateways ('Gateway of last resort is not set') and host-to-router default-gateway discrepancies.",
    ciscoCommand: "show ip route, ipconfig / show ip default-gateway",
    detectedRules: ["NO_GATEWAY_SET", "GATEWAY_MISMATCH"],
  },
  {
    id: "check_missing_vlans",
    name: "5. Missing & Native VLAN Check",
    category: "Switching & Trunking",
    severity: "high",
    description: "Detects CDP Native VLAN mismatches across trunk ports and identifies VLANs filtered from trunk allowed lists.",
    ciscoCommand: "show vlan brief, show interfaces trunk, %CDP-4-NATIVE_VLAN_MISMATCH",
    detectedRules: ["NATIVE_VLAN_MISMATCH", "VLAN_FILTERED_ON_TRUNK", "INACTIVE_VLAN"],
  },
  {
    id: "check_missing_routes",
    name: "6. Missing & Invalid Route Check",
    category: "IP Routing",
    severity: "high",
    description: "Detects missing static routes, unreachable next-hop IP addresses, and destination subnet off-by-one octet mismatches.",
    ciscoCommand: "show ip route, traceroute",
    detectedRules: ["MISSING_DEFAULT_ROUTE", "INVALID_NEXT_HOP", "DESTINATION_ROUTE_MISMATCH"],
  },
];

export const RuleCheckerStudio: React.FC<RuleCheckerStudioProps> = ({
  cases,
  onSelectCaseForDiagnose,
}) => {
  const [selectedCaseId, setSelectedCaseId] = useState<string>(cases[0]?.case_id || "CASE-001");
  const [customInput, setCustomInput] = useState<string>("");
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);

  // Selected case
  const currentCase = useMemo(() => {
    return cases.find((c) => c.case_id === selectedCaseId) || cases[0];
  }, [cases, selectedCaseId]);

  // Run checks on current case or custom text
  const checkResult = useMemo(() => {
    if (isCustomMode) {
      return runAllDeterministicChecks("CUSTOM-RUN", customInput);
    }
    return runAllDeterministicChecks(currentCase.case_id, currentCase.show_output);
  }, [isCustomMode, customInput, currentCase]);

  // Overall batch statistics across all 31 cases
  const batchStats = useMemo(() => {
    let casesWithFlags = 0;
    let totalFlags = 0;
    const ruleFlagCounts: Record<string, number> = {};

    cases.forEach((c) => {
      const res = runAllDeterministicChecks(c.case_id, c.show_output);
      if (res.flags.length > 0) {
        casesWithFlags++;
        totalFlags += res.flags.length;
        res.flags.forEach((f) => {
          ruleFlagCounts[f.rule] = (ruleFlagCounts[f.rule] || 0) + 1;
        });
      }
    });

    return {
      casesWithFlags,
      totalFlags,
      flagPercentage: Math.round((casesWithFlags / cases.length) * 100),
      ruleFlagCounts,
    };
  }, [cases]);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
              Stage 1: Deterministic Rule Checker
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
            Deterministic Rule Checking Engine
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mt-1">
            Instant rule evaluation using zero-hallucination deterministic heuristics. Catches known Cisco IOS syntax, trunking, IP, and routing anomalies before AI reasoning.
          </p>
        </div>

        {/* Global Stats Badge */}
        <div className="flex items-center gap-3 bg-slate-900/90 p-3 rounded-xl border border-slate-800 text-xs">
          <div className="text-right">
            <div className="text-slate-400 font-medium">Deterministic Detection</div>
            <div className="text-emerald-400 font-bold font-mono text-base">
              {batchStats.casesWithFlags} of {cases.length} Cases Flagged ({batchStats.flagPercentage}%)
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Interactive Testing Arena */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Case selector & Input (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" /> Target Configuration Input
              </h3>
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-[11px]">
                <button
                  onClick={() => setIsCustomMode(false)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    !isCustomMode
                      ? "bg-cyan-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Preset Cases
                </button>
                <button
                  onClick={() => {
                    setIsCustomMode(true);
                    if (!customInput) {
                      setCustomInput(currentCase.show_output);
                    }
                  }}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    isCustomMode
                      ? "bg-cyan-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Custom Output
                </button>
              </div>
            </div>

            {!isCustomMode ? (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-400">Select Lab Case to Test:</label>
                <select
                  value={selectedCaseId}
                  onChange={(e) => setSelectedCaseId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-xs rounded-xl px-3 py-2.5 font-mono focus:border-cyan-500 focus:outline-none"
                >
                  {cases.map((c) => (
                    <option key={c.case_id} value={c.case_id}>
                      {c.case_id} — [{c.issue_type}] {c.symptom.substring(0, 50)}...
                    </option>
                  ))}
                </select>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Symptom</span>
                    <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                      {currentCase.issue_type} | {currentCase.osi_layer}
                    </span>
                  </div>
                  <p className="text-slate-200 font-medium">{currentCase.symptom}</p>
                  <p className="text-slate-400 font-mono text-[11px] pt-1">Topology: {currentCase.topology_note}</p>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-400">Cisco Show Output:</span>
                  <div className="cisco-terminal rounded-xl p-3 text-xs font-mono max-h-48 overflow-y-auto whitespace-pre">
                    {currentCase.show_output}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-400">
                  Paste Raw Cisco Show Command Output:
                </label>
                <textarea
                  rows={10}
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="Paste output from 'show ip interface brief', 'show interfaces trunk', 'show ip route', syslog messages, etc..."
                  className="w-full cisco-terminal rounded-xl p-3 text-xs font-mono focus:border-cyan-500 focus:outline-none placeholder:text-slate-600"
                />
              </div>
            )}
          </div>
        </div>

        {/* Right column: Execution Results & Detected Flags (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> Evaluation Results
                </h3>
                <span className="font-mono text-xs text-slate-400">
                  ({isCustomMode ? "CUSTOM-RUN" : currentCase.case_id})
                </span>
              </div>
              <span
                className={`px-3 py-1 text-xs font-bold rounded-full inline-flex items-center gap-1.5 ${
                  checkResult.passed
                    ? "bg-emerald-950/80 text-emerald-300 border border-emerald-700/60"
                    : "bg-amber-950/80 text-amber-300 border border-amber-700/60"
                }`}
              >
                {checkResult.passed ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    Passed (No Flags)
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    {checkResult.flags.length} Rule {checkResult.flags.length === 1 ? "Violation" : "Violations"} Detected
                  </>
                )}
              </span>
            </div>

            {/* Flags List */}
            {checkResult.flags.length > 0 ? (
              <div className="space-y-3">
                {checkResult.flags.map((flag, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-slate-900/90 border border-amber-600/30 shadow-md space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-amber-950 text-amber-300 border border-amber-800">
                          {flag.rule}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                            flag.severity === "high"
                              ? "bg-rose-950 text-rose-400 border border-rose-800"
                              : "bg-amber-950 text-amber-400 border border-amber-800"
                          }`}
                        >
                          {flag.severity} severity
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-200 font-medium leading-relaxed">{flag.message}</p>
                    {flag.details && (
                      <div className="p-2.5 rounded bg-slate-950 border border-slate-800/80 font-mono text-[11px] text-cyan-300 overflow-x-auto">
                        {JSON.stringify(flag.details, null, 2)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-bold text-white">Clean Deterministic Pass</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  No explicit syntax violations, duplicate IPs, or admin down interfaces found in the provided output.
                  The case may involve higher-layer logical routing, ACL filters, or service misconfigurations requiring contextual AI analysis.
                </p>
              </div>
            )}

            {/* Quick Action Button to Launch AI Diagnosis */}
            {!isCustomMode && (
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => onSelectCaseForDiagnose(currentCase)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/20 transition-all"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Send Evidence & Flags to AI Diagnostic Studio</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* The 6 Deterministic Rules Specifications Grid */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <FileCode2 className="w-5 h-5 text-cyan-400" />
            Active Rule Checker Specifications (6 Modular Checks)
          </h3>
          <p className="text-xs text-slate-400">
            Engineered in Python standard library (`checker/rule_checker.py`) and ported to browser TypeScript
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {RULES_LIST.map((rule) => {
            const count = batchStats.ruleFlagCounts[rule.detectedRules[0]] || 0;
            return (
              <div
                key={rule.id}
                className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all space-y-2.5 flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{rule.name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {rule.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{rule.description}</p>
                </div>

                <div className="pt-2 border-t border-slate-800 text-[11px] space-y-1 text-slate-400">
                  <div>
                    <span className="text-slate-500">Target Commands: </span>
                    <span className="font-mono text-cyan-300">{rule.ciscoCommand}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {rule.detectedRules.map((r) => (
                      <span key={r} className="px-1.5 py-0.5 rounded bg-slate-950 text-[10px] font-mono text-amber-300 border border-amber-900/40">
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
