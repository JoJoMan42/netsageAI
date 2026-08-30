import React, { useState } from "react";
import { CaseItem, AIDiagnosisResult } from "../types";
import { 
  Cpu, 
  Play, 
  Sparkles, 
  Check, 
  Copy, 
  AlertCircle, 
  Terminal, 
  ShieldCheck, 
  ArrowRight,
  RefreshCw,
  Zap,
  Layers,
  HelpCircle
} from "lucide-react";
import { generateMockDiagnosis, generateGeminiDiagnosis } from "../services/aiService";
import { runAllDeterministicChecks } from "../utils/ruleChecker";

interface AIDiagnoseStudioProps {
  cases: CaseItem[];
  selectedCase: CaseItem;
  onSelectCase: (caseItem: CaseItem) => void;
  apiKey: string;
  onOpenApiKeyModal: () => void;
  onSubmitToHumanReview: (caseItem: CaseItem, diagnosis: AIDiagnosisResult) => void;
}

export const AIDiagnoseStudio: React.FC<AIDiagnoseStudioProps> = ({
  cases,
  selectedCase,
  onSelectCase,
  apiKey,
  onOpenApiKeyModal,
  onSubmitToHumanReview,
}) => {
  const [diagnosis, setDiagnosis] = useState<AIDiagnosisResult | null>(() =>
    generateMockDiagnosis(selectedCase)
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedFixes, setCopiedFixes] = useState<boolean>(false);

  // Deterministic checks on selected case
  const checkResult = runAllDeterministicChecks(selectedCase.case_id, selectedCase.show_output);

  // Handle running AI diagnosis
  const handleRunDiagnosis = async (forceGemini: boolean = false) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      if (forceGemini || (apiKey && apiKey.trim().length > 0)) {
        if (!apiKey) {
          onOpenApiKeyModal();
          setIsLoading(false);
          return;
        }
        const result = await generateGeminiDiagnosis(selectedCase, apiKey);
        setDiagnosis(result);
      } else {
        // Mock AI diagnosis
        await new Promise((res) => setTimeout(res, 400)); // Smooth UX transition
        const result = generateMockDiagnosis(selectedCase, checkResult);
        setDiagnosis(result);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to generate AI diagnosis. Falling back to Mock mode.");
      const fallback = generateMockDiagnosis(selectedCase, checkResult);
      setDiagnosis(fallback);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyFixSteps = () => {
    if (!diagnosis) return;
    navigator.clipboard.writeText(diagnosis.fix_steps.join("\n"));
    setCopiedFixes(true);
    setTimeout(() => setCopiedFixes(false), 2000);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-950 text-cyan-400 border border-cyan-800">
              Stage 2: Structured AI Reasoning
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
            AI Diagnostic Reasoning Studio
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mt-1">
            Combines symptom evidence, Cisco show command output, and deterministic checker flags to produce a grounded root cause and Cisco IOS remediation script.
          </p>
        </div>

        {/* Diagnostic Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleRunDiagnosis(false)}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Run Mock AI</span>
          </button>
          <button
            onClick={() => handleRunDiagnosis(true)}
            disabled={isLoading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-bold shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-50"
          >
            <Zap className="w-4 h-4" />
            <span>{apiKey ? "Run Gemini 2.5 Flash" : "Run Live Gemini API"}</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => onOpenApiKeyModal()}
            className="underline font-semibold hover:text-white"
          >
            Check API Key Settings
          </button>
        </div>
      )}

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Case Evidence Context (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" /> Active Case Evidence
              </h3>
              <select
                value={selectedCase.case_id}
                onChange={(e) => {
                  const c = cases.find((x) => x.case_id === e.target.value);
                  if (c) {
                    onSelectCase(c);
                    setDiagnosis(generateMockDiagnosis(c));
                  }
                }}
                className="bg-slate-900 border border-slate-700 text-cyan-300 text-xs font-mono rounded-lg px-2.5 py-1 focus:border-cyan-500 focus:outline-none"
              >
                {cases.map((c) => (
                  <option key={c.case_id} value={c.case_id}>
                    {c.case_id} ({c.issue_type})
                  </option>
                ))}
              </select>
            </div>

            {/* Case Info Cards */}
            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Symptom</span>
                <p className="text-slate-100 font-medium mt-0.5">{selectedCase.symptom}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Topology Context</span>
                <p className="text-cyan-300 font-mono mt-0.5">{selectedCase.topology_note}</p>
              </div>

              {/* Deterministic Flags passed to AI */}
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Deterministic Checker Flags
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                      checkResult.passed ? "text-emerald-400 bg-emerald-950" : "text-amber-400 bg-amber-950"
                    }`}
                  >
                    {checkResult.passed ? "0 Flags" : `${checkResult.flags.length} Flags`}
                  </span>
                </div>
                {checkResult.flags.length > 0 ? (
                  <div className="space-y-1 pt-1">
                    {checkResult.flags.map((f, i) => (
                      <div key={i} className="text-[11px] font-mono text-amber-300">
                        • [{f.severity.toUpperCase()}] {f.rule}: {f.message}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400">No deterministic flags triggered.</p>
                )}
              </div>

              {/* Cisco Show Command CLI */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Cisco Show Command Output
                </span>
                <div className="cisco-terminal rounded-xl p-3 text-xs font-mono max-h-56 overflow-y-auto whitespace-pre">
                  {selectedCase.show_output}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: AI Output Studio (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Structured AI Diagnosis</h3>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                    diagnosis?.mode === "gemini"
                      ? "bg-emerald-950 text-emerald-300 border border-emerald-700"
                      : "bg-blue-950 text-blue-300 border border-blue-700"
                  }`}
                >
                  {diagnosis?.mode === "gemini" ? "Gemini 2.5 Flash" : "Mock AI Engine"}
                </span>
              </div>

              {/* Confidence Meter Badge */}
              {diagnosis && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Confidence:</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono uppercase inline-flex items-center gap-1 ${
                      diagnosis.confidence === "high"
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-700 shadow-sm shadow-emerald-500/20"
                        : diagnosis.confidence === "medium"
                        ? "bg-amber-950 text-amber-400 border border-amber-700"
                        : "bg-rose-950 text-rose-400 border border-rose-700"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        diagnosis.confidence === "high"
                          ? "bg-emerald-400"
                          : diagnosis.confidence === "medium"
                          ? "bg-amber-400"
                          : "bg-rose-400"
                      }`}
                    />
                    {diagnosis.confidence}
                  </span>
                </div>
              )}
            </div>

            {diagnosis ? (
              <div className="space-y-4 text-xs">
                {/* Root Cause Card */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-cyan-500/30 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                      Identified Root Cause
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                      {diagnosis.osi_layer}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-white leading-relaxed">{diagnosis.root_cause}</p>
                </div>

                {/* Evidence Grounding */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Evidence Grounding (No Hallucination)
                  </span>
                  <div className="space-y-1.5">
                    {diagnosis.evidence.map((ev, idx) => (
                      <div key={idx} className="p-2 rounded bg-slate-950 border border-slate-800 text-slate-200 font-mono text-[11px] leading-relaxed">
                        • {ev}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommended Next Command */}
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Terminal className="w-3.5 h-3.5 text-cyan-400" /> Recommended Verification Command
                  </span>
                  <div className="p-2 rounded bg-slate-950 font-mono text-cyan-300 text-xs">
                    $ {diagnosis.next_command}
                  </div>
                </div>

                {/* Step-by-Step Cisco IOS Remediation Commands */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Terminal className="w-3.5 h-3.5 text-emerald-400" /> Cisco IOS Remediation Script
                    </span>
                    <button
                      onClick={handleCopyFixSteps}
                      className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700"
                    >
                      {copiedFixes ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedFixes ? "Copied!" : "Copy Fix Commands"}</span>
                    </button>
                  </div>
                  <div className="cisco-terminal rounded-xl p-3 text-xs font-mono space-y-1 leading-relaxed">
                    {diagnosis.fix_steps.map((step, idx) => (
                      <div key={idx} className="text-emerald-300">
                        {step}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Gateway to Human Review Console */}
                <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="font-bold text-white text-xs">Ready for Human Validation?</div>
                    <p className="text-[11px] text-slate-400">
                      Submit this AI diagnosis into the Human Review Console to Accept, Edit, or Reject.
                    </p>
                  </div>
                  <button
                    onClick={() => onSubmitToHumanReview(selectedCase, diagnosis)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all shadow-md shadow-cyan-500/20"
                  >
                    <span>Validate in Review Console</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 space-y-3">
                <RefreshCw className="w-8 h-8 text-slate-500 animate-spin mx-auto" />
                <p className="text-xs text-slate-400">Executing structured AI reasoning pipeline...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
