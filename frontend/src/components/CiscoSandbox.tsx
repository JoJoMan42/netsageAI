import React, { useState } from "react";
import { 
  Terminal, 
  Play, 
  Sparkles, 
  RotateCcw, 
  ShieldCheck, 
  Cpu, 
  Copy, 
  Check, 
  AlertTriangle,
  Lightbulb
} from "lucide-react";
import { AIDiagnosisResult, RuleFlag } from "../types";
import { runAllDeterministicChecks } from "../utils/ruleChecker";
import { generateMockDiagnosis, generateGeminiDiagnosis } from "../services/aiService";

interface PresetScenario {
  id: string;
  name: string;
  category: string;
  symptom: string;
  topology: string;
  showOutput: string;
  osiLayer: string;
}

const PRESET_SCENARIOS: PresetScenario[] = [
  {
    id: "preset-1",
    name: "Native VLAN Trunk Mismatch",
    category: "VLAN & Trunking",
    symptom: "Spanning Tree inconsistencies and intermittent packet loss across switch trunk link Gi0/1.",
    topology: "SW1 (Gi0/1 Trunk) -> SW2 (Gi0/1 Trunk)",
    osiLayer: "Layer 2",
    showOutput: `SW1# show interfaces trunk
Port        Mode         Encapsulation  Status        Native vlan
Gi0/1       on           802.1q         trunking      1

SW2# show interfaces trunk
Port        Mode         Encapsulation  Status        Native vlan
Gi0/1       on           802.1q         trunking      99

%CDP-4-NATIVE_VLAN_MISMATCH: Native VLAN mismatch discovered on GigabitEthernet0/1 (1), with Switch GigabitEthernet0/1 (99).`,
  },
  {
    id: "preset-2",
    name: "Duplicate IP Address Conflict",
    category: "Addressing / Conflict",
    symptom: "PC1 cannot communicate reliably with Gateway 192.168.1.1. Packet loss and ARP table flapping observed.",
    topology: "PC1 -> SW1 -> Router R1 (Gi0/0)",
    osiLayer: "Layer 3",
    showOutput: `R1# show ip interface brief
Interface              IP-Address      OK? Method Status                Protocol
GigabitEthernet0/0     192.168.1.1     YES manual up                    up
GigabitEthernet0/1     192.168.1.1     YES manual up                    up

%IP-4-DUPADDR: Duplicate IP address 192.168.1.1 on GigabitEthernet0/0, sourced by 0011.2233.4455`,
  },
  {
    id: "preset-3",
    name: "Interface Administratively Down",
    category: "Physical / Interface",
    symptom: "Branch office router cannot establish OSPF adjacency or ping headquarters over serial link.",
    topology: "R1 (Se0/0/0) -> WAN Cloud -> R2 (Se0/0/0)",
    osiLayer: "Layer 1",
    showOutput: `R1# show ip interface brief
Interface              IP-Address      OK? Method Status                Protocol
FastEthernet0/0        192.168.1.1     YES manual up                    up
Serial0/0/0            10.1.1.1        YES manual administratively down down`,
  },
  {
    id: "preset-4",
    name: "Missing IP Helper-Address (DHCP Relay)",
    category: "DHCP / Relay",
    symptom: "Clients in VLAN 10 fail to obtain an IP address via DHCP and receive 169.254.x.x APIPA addresses.",
    topology: "PC_VLAN10 -> SW1 -> R1 (Gi0/0.10) -> Central DHCP Server (172.16.1.100)",
    osiLayer: "Layer 3",
    showOutput: `R1# show running-config interface GigabitEthernet0/0.10
Building configuration...

Current configuration : 124 bytes
!
interface GigabitEthernet0/0.10
 encapsulation dot1Q 10
 ip address 192.168.10.1 255.255.255.0
 no ip helper-address
!
end`,
  },
  {
    id: "preset-5",
    name: "NAT Overload Keyword Missing",
    category: "NAT / PAT",
    symptom: "Only the first internal host can browse the internet; all subsequent host web requests time out.",
    topology: "Internal LAN (192.168.1.0/24) -> Core Router -> ISP Gateway",
    osiLayer: "Layer 3",
    showOutput: `Router# show running-config | include ip nat
ip nat inside source list 1 interface GigabitEthernet0/1
ip nat inside interface GigabitEthernet0/0
ip nat outside interface GigabitEthernet0/1

Router# show access-lists
Standard IP access list 1
    10 permit 192.168.1.0, wildcard bits 0.0.0.255 (45 matches)`,
  },
];

interface CiscoSandboxProps {
  apiKey: string;
  onOpenApiKeyModal: () => void;
}

export const CiscoSandbox: React.FC<CiscoSandboxProps> = ({
  apiKey,
  onOpenApiKeyModal,
}) => {
  const [symptom, setSymptom] = useState<string>(PRESET_SCENARIOS[0].symptom);
  const [topology, setTopology] = useState<string>(PRESET_SCENARIOS[0].topology);
  const [showOutput, setShowOutput] = useState<string>(PRESET_SCENARIOS[0].showOutput);
  const [osiLayer, setOsiLayer] = useState<string>(PRESET_SCENARIOS[0].osiLayer);
  const [issueType, setIssueType] = useState<string>("VLAN");

  const [diagnosis, setDiagnosis] = useState<AIDiagnosisResult | null>(null);
  const [ruleFlags, setRuleFlags] = useState<RuleFlag[]>([]);
  const [isDiagnosing, setIsDiagnosing] = useState<boolean>(false);
  const [copiedFixes, setCopiedFixes] = useState<boolean>(false);

  const handleLoadPreset = (preset: PresetScenario) => {
    setSymptom(preset.symptom);
    setTopology(preset.topology);
    setShowOutput(preset.showOutput);
    setOsiLayer(preset.osiLayer);
    setIssueType(preset.category.split(" ")[0]);
    setDiagnosis(null);
    setRuleFlags([]);
  };

  const handleRunSandboxDiagnosis = async (useGemini: boolean) => {
    setIsDiagnosing(true);

    const syntheticCase = {
      case_id: "SANDBOX-LIVE",
      issue_type: issueType,
      symptom,
      topology_note: topology,
      show_output: showOutput,
      expected_fault: "Custom scenario analysis",
      osi_layer: osiLayer,
      concept_tag: "Sandbox Analysis",
      severity: "High",
    };

    // 1. Run Deterministic Checker
    const checks = runAllDeterministicChecks("SANDBOX-LIVE", showOutput);
    setRuleFlags(checks.flags);

    // 2. Run AI Engine
    try {
      if (useGemini) {
        if (!apiKey) {
          onOpenApiKeyModal();
          setIsDiagnosing(false);
          return;
        }
        const aiResult = await generateGeminiDiagnosis(syntheticCase, apiKey);
        setDiagnosis(aiResult);
      } else {
        await new Promise((r) => setTimeout(r, 450));
        const aiResult = generateMockDiagnosis(syntheticCase, checks);
        setDiagnosis(aiResult);
      }
    } catch (err: any) {
      console.error(err);
      const fallback = generateMockDiagnosis(syntheticCase, checks);
      setDiagnosis(fallback);
    } finally {
      setIsDiagnosing(false);
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
      {/* Header */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-950 text-cyan-400 border border-cyan-800">
              Interactive Sandbox Arena
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
            Cisco Troubleshooting CLI Playground
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mt-1">
            Input custom Cisco IOS show command outputs, network symptoms, and topology notes to execute live deterministic checks and AI reasoning.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleRunSandboxDiagnosis(false)}
            disabled={isDiagnosing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all"
          >
            <Play className="w-3.5 h-3.5 text-cyan-400" />
            <span>Diagnose (Mock Engine)</span>
          </button>
          <button
            onClick={() => handleRunSandboxDiagnosis(true)}
            disabled={isDiagnosing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-bold shadow-lg shadow-cyan-500/25 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Diagnose (Live Gemini)</span>
          </button>
        </div>
      </div>

      {/* Preset Scenario Selector */}
      <div className="glass-panel rounded-2xl p-4 border border-slate-800 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
          <Lightbulb className="w-4 h-4 text-amber-400" /> Quick-Load Lab Scenario Presets:
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESET_SCENARIOS.map((p) => (
            <button
              key={p.id}
              onClick={() => handleLoadPreset(p)}
              className="px-3 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-xs text-slate-300 hover:text-cyan-300 border border-slate-800 transition-colors font-medium flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Sandbox Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Inputs (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" /> Input Scenario & Show Outputs
            </h3>

            {/* Symptom */}
            <div className="space-y-1 text-xs">
              <label className="block font-bold text-slate-300">Network Symptom / Problem Description:</label>
              <textarea
                rows={2}
                value={symptom}
                onChange={(e) => setSymptom(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl p-2.5 text-xs focus:border-cyan-500 focus:outline-none"
                placeholder="Describe what is failing..."
              />
            </div>

            {/* Topology & Layer */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="block font-bold text-slate-300">Topology Context:</label>
                <input
                  type="text"
                  value={topology}
                  onChange={(e) => setTopology(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-cyan-300 font-mono rounded-xl p-2 text-xs focus:border-cyan-500 focus:outline-none"
                  placeholder="e.g. PC1 -> SW1 -> R1"
                />
              </div>
              <div className="space-y-1">
                <label className="block font-bold text-slate-300">OSI Layer Hypothesis:</label>
                <select
                  value={osiLayer}
                  onChange={(e) => setOsiLayer(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-xl p-2 text-xs focus:border-cyan-500 focus:outline-none"
                >
                  <option value="Layer 1">Layer 1 (Physical)</option>
                  <option value="Layer 2">Layer 2 (Data Link / VLAN)</option>
                  <option value="Layer 3">Layer 3 (Network / IP / Routing)</option>
                  <option value="Layer 4">Layer 4 (Transport / ACL)</option>
                  <option value="Layer 7">Layer 7 (Application / DHCP / DNS)</option>
                </select>
              </div>
            </div>

            {/* Raw Show Output */}
            <div className="space-y-1 text-xs">
              <label className="block font-bold text-slate-300">
                Raw Cisco Show Command Output (Evidence):
              </label>
              <textarea
                rows={10}
                value={showOutput}
                onChange={(e) => setShowOutput(e.target.value)}
                className="w-full cisco-terminal rounded-xl p-3 text-xs font-mono focus:border-cyan-500 focus:outline-none whitespace-pre placeholder:text-slate-600"
                placeholder="Paste outputs from show ip route, show interfaces, show vlan, syslog..."
              />
            </div>
          </div>
        </div>

        {/* Right Column: Real-time Analysis & Fixes (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" /> Live Sandbox Diagnostic Output
            </h3>

            {/* Rule Checker Flags */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> Deterministic Rule Evaluation
                </span>
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                    ruleFlags.length === 0
                      ? "bg-slate-800 text-slate-400"
                      : "bg-amber-950 text-amber-300 border border-amber-800"
                  }`}
                >
                  {ruleFlags.length} Flags Detected
                </span>
              </div>

              {ruleFlags.length > 0 ? (
                <div className="space-y-1.5">
                  {ruleFlags.map((flag, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-900 border border-amber-900/40 text-xs text-amber-300 space-y-0.5"
                    >
                      <span className="font-mono font-bold text-[10px] uppercase px-1.5 py-0.2 bg-amber-950 rounded">
                        {flag.rule}
                      </span>
                      <p className="text-xs text-slate-200 mt-1">{flag.message}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-900/60 text-slate-400 text-xs">
                  Run diagnosis to trigger deterministic rule checking.
                </div>
              )}
            </div>

            {/* AI Diagnosis */}
            {diagnosis ? (
              <div className="space-y-4 text-xs">
                {/* Root Cause */}
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                      Grounded Root Cause
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 uppercase font-mono">
                      Confidence: {diagnosis.confidence}
                    </span>
                  </div>
                  <p className="text-slate-100 font-semibold leading-relaxed text-sm">{diagnosis.root_cause}</p>
                </div>

                {/* Evidence */}
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Evidence Citations
                  </span>
                  {diagnosis.evidence.map((ev, i) => (
                    <div key={i} className="p-2 rounded bg-slate-950 font-mono text-[11px] text-slate-300">
                      • {ev}
                    </div>
                  ))}
                </div>

                {/* Fix Steps */}
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Remediation Script (Cisco IOS)
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
              </div>
            ) : (
              <div className="p-8 rounded-xl bg-slate-900/40 border border-slate-800 text-center space-y-2">
                <Terminal className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="text-xs text-slate-400">
                  Select a preset or paste your custom Cisco show output, then click <strong>Diagnose</strong> to evaluate.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
