import { CaseItem, AIDiagnosisResult, CheckResult } from "../types";
import { runAllDeterministicChecks } from "../utils/ruleChecker";

const FIX_STEPS_MAP: Record<string, string[]> = {
  VLAN: [
    "Switch# configure terminal",
    "Switch(config)# interface <port>",
    "Switch(config-if)# switchport mode access",
    "Switch(config-if)# switchport access vlan <correct_vlan>",
    "Switch(config-if)# no shutdown",
    "Switch(config-if)# end",
    "Switch# write memory",
  ],
  Gateway: [
    "Device# configure terminal",
    "Device(config)# interface <interface>",
    "Device(config-if)# no shutdown",
    "Device(config-if)# ip address <correct_ip> <correct_mask>",
    "Device(config-if)# end",
    "Device# write memory",
  ],
  DHCP: [
    "Router# configure terminal",
    "Router(config)# ip dhcp pool <pool_name>",
    "Router(dhcp-config)# network <network_id> <subnet_mask>",
    "Router(dhcp-config)# default-router <correct_gateway_ip>",
    "Router(dhcp-config)# dns-server <dns_server_ip>",
    "Router(dhcp-config)# end",
    "Router# clear ip dhcp binding *",
  ],
  DNS: [
    "Device# configure terminal",
    "Device(config)# ip domain lookup",
    "Device(config)# ip name-server <correct_dns_ip>",
    "Device(config)# end",
    "Device# clear hosts",
  ],
  Routing: [
    "Router# configure terminal",
    "Router(config)# ip route <destination_network> <subnet_mask> <next_hop_ip>",
    "Router(config)# end",
    "Router# show ip route",
  ],
  ACL: [
    "Router# configure terminal",
    "Router(config)# ip access-list extended <acl_name_or_num>",
    "Router(config-ext-nacl)# permit ip <source_network> <wildcard_mask> <dest_network> <wildcard_mask>",
    "Router(config-ext-nacl)# permit ip any any",
    "Router(config-ext-nacl)# end",
    "Router# clear access-list counters",
  ],
  NAT: [
    "Router# configure terminal",
    "Router(config)# interface <inside_interface>",
    "Router(config-if)# ip nat inside",
    "Router(config)# interface <outside_interface>",
    "Router(config-if)# ip nat outside",
    "Router(config)# ip nat inside source list <acl_num> interface <outside_interface> overload",
    "Router(config)# end",
  ],
  Wireless: [
    "WLC# configure terminal",
    "WLC(config)# wlan <ssid_name>",
    "WLC(config-wlan)# vlan <correct_vlan_id>",
    "WLC(config-wlan)# no shutdown",
    "WLC(config-wlan)# end",
  ],
};

const NEXT_COMMAND_MAP: Record<string, string> = {
  VLAN: "show vlan brief && show interfaces trunk",
  Gateway: "show ip interface brief",
  DHCP: "show ip dhcp binding && show ip dhcp pool",
  DNS: "nslookup <target_hostname>",
  Routing: "show ip route",
  ACL: "show access-lists",
  NAT: "show ip nat translations",
  Wireless: "show wlan summary",
};

/**
 * Builds mock AI diagnosis adhering to NetSage AI specification.
 */
export function generateMockDiagnosis(caseItem: CaseItem, checkResult?: CheckResult): AIDiagnosisResult {
  const result = checkResult || runAllDeterministicChecks(caseItem.case_id, caseItem.show_output);
  const evidence: string[] = [];

  for (const flag of result.flags) {
    evidence.push(`Deterministic checker flagged [${flag.severity.toUpperCase()}] ${flag.rule}: ${flag.message}`);
  }

  if (evidence.length === 0) {
    evidence.push(`Show command output analyzed for symptom: "${caseItem.symptom}"`);
    evidence.push(`Topology verification: ${caseItem.topology_note}`);
  }

  const confidence: "high" | "medium" | "low" =
    result.flags.some((f) => f.severity === "high") ? "high" : result.flags.length > 0 ? "medium" : "medium";

  const issueType = caseItem.issue_type || "Routing";
  const fixSteps = FIX_STEPS_MAP[issueType] || [
    "Device# configure terminal",
    "Device(config)# verify configuration",
    "Device(config)# end",
  ];
  const nextCommand = NEXT_COMMAND_MAP[issueType] || "show running-config";

  const osiLayer = (
    caseItem.osi_layer === "Layer 1" ||
    caseItem.osi_layer === "Layer 2" ||
    caseItem.osi_layer === "Layer 3" ||
    caseItem.osi_layer === "Layer 4" ||
    caseItem.osi_layer === "Layer 7"
      ? caseItem.osi_layer
      : "Layer 3"
  ) as AIDiagnosisResult["osi_layer"];

  return {
    root_cause: caseItem.expected_fault || "Network anomaly detected based on topology and show command verification.",
    confidence,
    evidence,
    osi_layer: osiLayer,
    next_command: nextCommand,
    fix_steps: fixSteps,
    mode: "mock",
  };
}

/**
 * Executes a live Google Gemini API call with structured prompt formatting.
 */
export async function generateGeminiDiagnosis(
  caseItem: CaseItem,
  apiKey: string,
  modelName: string = "gemini-2.5-flash"
): Promise<AIDiagnosisResult> {
  const checkResult = runAllDeterministicChecks(caseItem.case_id, caseItem.show_output);
  const flagsText = checkResult.passed
    ? "No deterministic issues detected."
    : checkResult.flags.map((f) => `[${f.severity.toUpperCase()}] ${f.rule}: ${f.message}`).join("\n");

  const prompt = `You are NetSage AI, an expert Cisco network troubleshooting assistant.
Analyze the following Cisco lab case and output strictly valid JSON matching this schema:
{
  "root_cause": "string (Clear explanation of root fault)",
  "confidence": "high | medium | low",
  "evidence": ["string (Direct citations of show command lines or flags)"],
  "osi_layer": "Layer 1 | Layer 2 | Layer 3 | Layer 4 | Layer 7",
  "next_command": "string (Exact Cisco CLI command to verify or troubleshoot)",
  "fix_steps": ["string (Sequential Cisco IOS CLI commands to remediate)"]
}

CASE DETAILS:
Case ID: ${caseItem.case_id}
Issue Type: ${caseItem.issue_type}
Symptom: ${caseItem.symptom}
Topology Context: ${caseItem.topology_note}
Deterministic Flags:
${flagsText}

SHOW COMMAND OUTPUT:
${caseItem.show_output}

Return ONLY raw JSON. No markdown backticks, no commentary.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Gemini API request failed with status code ${response.status}: ${response.statusText}`
    );
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error("Empty response returned by Gemini API.");
  }

  let cleaned = rawText.trim();
  if (cleaned.startsWith("```")) {
    const lines = cleaned.split("\n");
    if (lines[0].startsWith("```")) lines.shift();
    if (lines[lines.length - 1].startsWith("```")) lines.pop();
    cleaned = lines.join("\n").trim();
  }

  const parsed = JSON.parse(cleaned);

  return {
    root_cause: parsed.root_cause || "Root cause identified.",
    confidence: parsed.confidence === "high" || parsed.confidence === "medium" || parsed.confidence === "low" ? parsed.confidence : "medium",
    evidence: Array.isArray(parsed.evidence) ? parsed.evidence : [parsed.evidence || "Evidence cited from show command output."],
    osi_layer: parsed.osi_layer || "Layer 3",
    next_command: parsed.next_command || "show running-config",
    fix_steps: Array.isArray(parsed.fix_steps) ? parsed.fix_steps : ["configure terminal", "end"],
    raw_response: rawText,
    mode: "gemini",
  };
}
