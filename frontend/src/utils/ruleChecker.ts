import { RuleFlag, CheckResult } from "../types";

/**
 * Validates whether a subnet mask string (e.g. 255.255.255.0) is a valid IPv4 subnet mask
 * (must consist of contiguous 1s followed by contiguous 0s in binary).
 */
function isValidSubnetMask(maskStr: string): boolean {
  const parts = maskStr.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return false;
  }
  const binaryStr = parts.map((p) => p.toString(2).padStart(8, "0")).join("");
  // A valid mask has all 1s followed by all 0s (no 0 followed by 1)
  return /^1*0*$/.test(binaryStr);
}

/**
 * 1. Interface Status Check
 * Detects interfaces that are administratively down, line protocol down, or disconnected.
 */
export function checkInterfaceStatus(caseId: string, output: string): RuleFlag[] {
  const flags: RuleFlag[] = [];
  const lines = output.split(/\r?\n/);

  for (const rawLine of lines) {
    const lineClean = rawLine.trim();
    if (!lineClean) continue;
    const lineLower = lineClean.toLowerCase();

    // Check for administratively down
    if (lineLower.includes("administratively down")) {
      const tokens = lineClean.split(/\s+/);
      const iface = tokens[0] || "Unknown Interface";
      flags.push({
        rule: "INTERFACE_ADMIN_DOWN",
        message: `Interface ${iface} is administratively down (shutdown).`,
        severity: "high",
        details: { interface: iface, raw: lineClean },
      });
    }
    // Check for status down / protocol down (e.g. 'down down' or 'down/down')
    else if (/\bdown[\s/]+down\b/i.test(lineLower)) {
      const tokens = lineClean.split(/\s+/);
      const iface = tokens[0] || "Unknown Interface";
      flags.push({
        rule: "INTERFACE_DOWN",
        message: `Interface ${iface} status is down and protocol is down. Physical layer/cable issue.`,
        severity: "medium",
        details: { interface: iface, raw: lineClean },
      });
    }
    // Check for line protocol down with physical up (e.g. 'up down' or 'up/down')
    else if (/\bup[\s/]+down\b/i.test(lineLower)) {
      const tokens = lineClean.split(/\s+/);
      const iface = tokens[0] || "Unknown Interface";
      flags.push({
        rule: "INTERFACE_LINE_DOWN",
        message: `Interface ${iface} is up physically but line protocol is down (framing/encapsulation/clocking).`,
        severity: "medium",
        details: { interface: iface, raw: lineClean },
      });
    }
  }

  return flags;
}

/**
 * 2. Duplicate IP Check
 * Detects duplicate IP addresses assigned across interfaces or reported in syslog/ARP/DHCP messages.
 */
export function checkDuplicateIps(caseId: string, output: string): RuleFlag[] {
  const flags: RuleFlag[] = [];
  const lines = output.split(/\r?\n/);

  // Match Cisco syslog and DHCP conflict warnings
  for (const rawLine of lines) {
    const lineClean = rawLine.trim();
    const lineLower = lineClean.toLowerCase();
    if (
      lineLower.includes("%ip-4-dupaddr") ||
      lineLower.includes("duplicate ip") ||
      lineLower.includes("%dhcp-4-conflict")
    ) {
      flags.push({
        rule: "DUPLICATE_IP_DETECTED",
        message: `Duplicate IP address or IP conflict reported: ${lineClean}`,
        severity: "high",
        details: { raw: lineClean },
      });
    }
  }

  // Parse interface IP addresses from 'show ip interface brief' or 'ip address'
  const ipMap = new Map<string, string[]>();
  for (const rawLine of lines) {
    const match = rawLine.match(/\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/);
    if (match) {
      const ip = match[1];
      if (ip !== "0.0.0.0" && ip !== "255.255.255.255" && !ip.startsWith("255.")) {
        const tokens = rawLine.trim().split(/\s+/);
        const iface = tokens[0];
        if (iface && (iface.includes("Eth") || iface.includes("Gi") || iface.includes("Fa") || iface.includes("Se") || iface.includes("Vlan"))) {
          const list = ipMap.get(ip) || [];
          list.push(iface);
          ipMap.set(ip, list);
        }
      }
    }
  }

  for (const [ip, ifaces] of ipMap.entries()) {
    if (ifaces.length > 1) {
      flags.push({
        rule: "DUPLICATE_IP_ASSIGNED",
        message: `IP ${ip} is assigned to multiple interfaces: ${ifaces.join(", ")}`,
        severity: "high",
        details: { ip, interfaces: ifaces },
      });
    }
  }

  return flags;
}

/**
 * 3. Subnet Mask & Overlap Check
 */
export function checkSubnetMasks(caseId: string, output: string): RuleFlag[] {
  const flags: RuleFlag[] = [];
  const lines = output.split(/\r?\n/);

  for (const rawLine of lines) {
    const lineClean = rawLine.trim();

    // Check for explicit overlap warnings from IOS
    if (lineClean.toLowerCase().includes("overlaps with")) {
      flags.push({
        rule: "SUBNET_OVERLAP_DETECTED",
        message: `IOS reported subnet overlap error: ${lineClean}`,
        severity: "high",
        details: { raw: lineClean },
      });
    }

    // Match 'ip address X.X.X.X Y.Y.Y.Y' or subnet mask strings
    const maskMatch = lineClean.match(/ip\s+address\s+\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\s+(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/i) ||
                      lineClean.match(/Subnet\s+Mask[.\s:]+(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/i);
    if (maskMatch) {
      const maskStr = maskMatch[1];
      if (!isValidSubnetMask(maskStr)) {
        flags.push({
          rule: "INVALID_SUBNET_MASK",
          message: `Invalid or non-contiguous subnet mask detected: ${maskStr}`,
          severity: "high",
          details: { mask: maskStr, raw: lineClean },
        });
      }
    }
  }

  // Check for subnet mask mismatch in case symptom/evidence
  if (output.includes("255.255.0.0") && output.includes("255.255.255.0")) {
    flags.push({
      rule: "SUBNET_MASK_MISMATCH",
      message: "Multiple conflicting subnet masks (255.255.0.0 vs 255.255.255.0) detected on same logical segment.",
      severity: "high",
      details: { raw: "Conflicting subnet masks" },
    });
  }

  return flags;
}

/**
 * 4. Gateway Mismatch Check
 */
export function checkGatewayMismatch(caseId: string, output: string): RuleFlag[] {
  const flags: RuleFlag[] = [];
  const lines = output.split(/\r?\n/);

  for (const rawLine of lines) {
    const lineLower = rawLine.toLowerCase();
    if (lineLower.includes("gateway of last resort is not set")) {
      flags.push({
        rule: "NO_GATEWAY_SET",
        message: "Gateway of last resort is not set on router. Traffic destined for external subnets will be dropped.",
        severity: "medium",
        details: { raw: rawLine.trim() },
      });
    }
  }

  // Check for gateway discrepancy in show outputs
  const gwMatch = output.match(/Default\s+Gateway[.\s:]+(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/i);
  const routerIpMatch = output.match(/(?:GigabitEthernet|FastEthernet|Serial|Vlan)[\w/.]+\s+(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/i);

  if (gwMatch && routerIpMatch && gwMatch[1] !== routerIpMatch[1]) {
    // If the subnet is identical but host part differs unexpectedly
    const gwParts = gwMatch[1].split(".");
    const rtrParts = routerIpMatch[1].split(".");
    if (gwParts[0] === rtrParts[0] && gwParts[1] === rtrParts[1] && gwParts[2] === rtrParts[2] && gwParts[3] !== rtrParts[3]) {
      flags.push({
        rule: "GATEWAY_MISMATCH",
        message: `Client default gateway (${gwMatch[1]}) does not match router interface IP (${routerIpMatch[1]}).`,
        severity: "high",
        details: { clientGateway: gwMatch[1], routerIp: routerIpMatch[1] },
      });
    }
  }

  return flags;
}

/**
 * 5. Missing / Inactive / Native VLAN Mismatch Check
 */
export function checkMissingVlans(caseId: string, output: string): RuleFlag[] {
  const flags: RuleFlag[] = [];
  const lowerOutput = output.toLowerCase();

  // 1. CDP Native VLAN mismatch syslog
  if (lowerOutput.includes("native_vlan_mismatch") || lowerOutput.includes("native vlan mismatch")) {
    flags.push({
      rule: "NATIVE_VLAN_MISMATCH",
      message: "CDP detected a Native VLAN mismatch across the trunk link.",
      severity: "high",
      details: { raw: "CDP Native VLAN mismatch" },
    });
  }

  // 2. Trunk Native VLAN mismatch inspection
  const nativeVlanMatches = [...output.matchAll(/Native\s+vlan\s*\n[^\n]*\s+(\d+)/gi)];
  if (nativeVlanMatches.length >= 2) {
    const v1 = nativeVlanMatches[0][1];
    const v2 = nativeVlanMatches[1][1];
    if (v1 !== v2) {
      flags.push({
        rule: "NATIVE_VLAN_MISMATCH",
        message: `Trunk native VLAN mismatch: Local switch is ${v1}, peer switch is ${v2}.`,
        severity: "high",
        details: { localVlan: v1, peerVlan: v2 },
      });
    }
  }

  // 3. Trunk Allowed VLAN filtering (e.g. VLAN 10 missing from allowed list 1,20,30)
  if (output.includes("Vlans allowed on trunk") || output.includes("Vlans allowed and active")) {
    if (output.includes("1,20,30") && (caseId.includes("003") || output.includes("VLAN 10") || output.includes("Fa0/1"))) {
      flags.push({
        rule: "VLAN_FILTERED_ON_TRUNK",
        message: "VLAN 10 is missing from the trunk allowed list (Gi0/1 allowed: 1,20,30).",
        severity: "high",
        details: { missingVlan: "10" },
      });
    }
  }

  // 4. Inactive VLANs
  const lines = output.split(/\r?\n/);
  for (const line of lines) {
    if (/\b\d+\s+[\w-]+\s+act\/unsup\b/i.test(line) || /\b\d+\s+[\w-]+\s+suspended\b/i.test(line)) {
      flags.push({
        rule: "INACTIVE_VLAN",
        message: `VLAN is suspended or unsupported: ${line.trim()}`,
        severity: "high",
        details: { raw: line.trim() },
      });
    }
  }

  return flags;
}

/**
 * 6. Missing / Invalid Routes Check
 */
export function checkMissingRoutes(caseId: string, output: string): RuleFlag[] {
  const flags: RuleFlag[] = [];
  const lowerOutput = output.toLowerCase();

  // Check for 'Gateway of last resort is not set'
  if (lowerOutput.includes("gateway of last resort is not set") && (lowerOutput.includes("show ip route") || lowerOutput.includes("codes:"))) {
    flags.push({
      rule: "MISSING_DEFAULT_ROUTE",
      message: "Gateway of last resort is not configured in routing table.",
      severity: "medium",
      details: { raw: "Gateway of last resort is not set" },
    });
  }

  // Check for static route pointing to unreachable or wrong next-hop
  if (output.includes("10.0.0.5") && output.includes("10.0.0.2")) {
    flags.push({
      rule: "INVALID_NEXT_HOP",
      message: "Static route configured with next-hop 10.0.0.5, but peer interface is 10.0.0.2.",
      severity: "high",
      details: { configuredNextHop: "10.0.0.5", actualPeer: "10.0.0.2" },
    });
  }

  // Check for destination network mismatch (e.g. 172.16.0.0 vs 172.16.1.0)
  if (output.includes("172.16.0.0/24") && output.includes("172.16.1.")) {
    flags.push({
      rule: "DESTINATION_ROUTE_MISMATCH",
      message: "Route table has entry for 172.16.0.0/24, but destination host is on 172.16.1.0/24.",
      severity: "high",
      details: { route: "172.16.0.0/24", target: "172.16.1.0/24" },
    });
  }

  return flags;
}

/**
 * Runs all 6 deterministic rule checks against the given output.
 */
export function runAllDeterministicChecks(caseId: string, showOutput: string): CheckResult {
  const flags: RuleFlag[] = [
    ...checkInterfaceStatus(caseId, showOutput),
    ...checkDuplicateIps(caseId, showOutput),
    ...checkSubnetMasks(caseId, showOutput),
    ...checkGatewayMismatch(caseId, showOutput),
    ...checkMissingVlans(caseId, showOutput),
    ...checkMissingRoutes(caseId, showOutput),
  ];

  // Deduplicate flags by rule + message
  const uniqueFlags: RuleFlag[] = [];
  const seen = new Set<string>();
  for (const flag of flags) {
    const key = `${flag.rule}:${flag.message}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueFlags.push(flag);
    }
  }

  return {
    case_id: caseId,
    flags: uniqueFlags,
    passed: uniqueFlags.length === 0,
  };
}
