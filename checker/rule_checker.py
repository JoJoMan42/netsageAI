"""
NetSage AI - Deterministic Rule Checker

Modular Python script that performs rule-based checks on Cisco show command output.
Operates independently of LLM reasoning to reliably identify common configuration errors.
"""

from dataclasses import dataclass, field
import re
from typing import List, Dict, Any, Optional


@dataclass
class Flag:
    """Represents a single rule violation or configuration anomaly detected."""
    rule: str
    message: str
    severity: str  # "high", "medium", "low"
    details: Optional[Dict[str, Any]] = None


@dataclass
class CheckResult:
    """Container holding all flags detected for a specific troubleshooting case."""
    case_id: str
    flags: List[Flag] = field(default_factory=list)

    @property
    def passed(self) -> bool:
        """Returns True if no flags were triggered."""
        return len(self.flags) == 0


def check_interface_status(case_id: str, output: str) -> List[Flag]:
    """
    Detects interfaces that are administratively down or line protocol down.
    Matches lines from outputs like 'show ip interface brief'.
    """
    flags = []
    for line in output.splitlines():
        line_clean = line.strip()
        if not line_clean:
            continue
        line_lower = line_clean.lower()
        if "administratively down" in line_lower:
            tokens = line_clean.split()
            iface = tokens[0] if tokens else "Unknown Interface"
            flags.append(
                Flag(
                    rule="INTERFACE_ADMIN_DOWN",
                    message=f"Interface {iface} is administratively down.",
                    severity="high",
                    details={"interface": iface, "raw": line_clean}
                )
            )
        elif re.search(r'\bdown\s+down\b', line_lower):
            tokens = line_clean.split()
            iface = tokens[0] if tokens else "Unknown Interface"
            flags.append(
                Flag(
                    rule="INTERFACE_LINE_DOWN",
                    message=f"Interface {iface} line protocol is down.",
                    severity="medium",
                    details={"interface": iface, "raw": line_clean}
                )
            )
    return flags


def check_duplicate_ips(case_id: str, output: str) -> List[Flag]:
    """
    Detects duplicate IP addresses assigned across interfaces or reported in syslog/ARP messages.
    """
    flags = []
    lines = output.splitlines()

    for line in lines:
        if "%IP-4-DUPADDR" in line or "duplicate ip" in line.lower():
            flags.append(
                Flag(
                    rule="DUPLICATE_IP_DETECTED",
                    message=f"Duplicate IP alert detected: {line.strip()}",
                    severity="high",
                    details={"raw": line.strip()}
                )
            )

    ip_map: Dict[str, List[str]] = {}
    for line in lines:
        match = re.search(r'([A-Za-z0-9/\.\-]+)\s+((?:\d{1,3}\.){3}\d{1,3})\s+YES', line)
        if match:
            iface, ip = match.group(1), match.group(2)
            if ip != "0.0.0.0" and ip != "127.0.0.1":
                if ip in ip_map:
                    ip_map[ip].append(iface)
                else:
                    ip_map[ip] = [iface]

    for ip, ifaces in ip_map.items():
        if len(ifaces) > 1:
            flags.append(
                Flag(
                    rule="DUPLICATE_IP_ASSIGNED",
                    message=f"Duplicate IP {ip} assigned to multiple interfaces: {', '.join(ifaces)}",
                    severity="high",
                    details={"ip": ip, "interfaces": ifaces}
                )
            )

    return flags


def check_subnet_masks(case_id: str, output: str) -> List[Flag]:
    """
    Detects subnet mask mismatches or invalid netmask configurations.
    """
    flags = []
    lines = output.splitlines()

    valid_masks = {
        "255.0.0.0", "255.128.0.0", "255.192.0.0", "255.224.0.0", "255.240.0.0", "255.248.0.0", "255.252.0.0", "255.254.0.0",
        "255.255.0.0", "255.255.128.0", "255.255.192.0", "255.255.224.0", "255.255.240.0", "255.255.248.0", "255.255.252.0", "255.255.254.0",
        "255.255.255.0", "255.255.255.128", "255.255.255.192", "255.255.255.224", "255.255.255.240", "255.255.255.248", "255.255.255.252", "255.255.255.254", "255.255.255.255", "0.0.0.0"
    }

    for line in lines:
        line_lower = line.lower()
        if "bad mask" in line_lower or "subnet mask mismatch" in line_lower:
            flags.append(
                Flag(
                    rule="SUBNET_MASK_MISMATCH",
                    message=f"Subnet mask mismatch indicated: {line.strip()}",
                    severity="high",
                    details={"raw": line.strip()}
                )
            )
        match = re.search(r'ip address\s+((?:\d{1,3}\.){3}\d{1,3})\s+((?:\d{1,3}\.){3}\d{1,3})', line, re.IGNORECASE)
        if match:
            ip, mask = match.group(1), match.group(2)
            if mask not in valid_masks:
                flags.append(
                    Flag(
                        rule="INVALID_SUBNET_MASK",
                        message=f"Invalid subnet mask {mask} configured for IP {ip}.",
                        severity="high",
                        details={"ip": ip, "mask": mask}
                    )
                )

    return flags


def check_gateway_mismatch(case_id: str, output: str) -> List[Flag]:
    """
    Detects gateway mismatch errors or unconfigured default gateways.
    """
    flags = []
    lines = output.splitlines()

    for line in lines:
        line_lower = line.lower()
        if "gateway of last resort is not set" in line_lower:
            flags.append(
                Flag(
                    rule="NO_GATEWAY_SET",
                    message="Gateway of last resort is not set.",
                    severity="medium",
                    details={"raw": line.strip()}
                )
            )
        elif "gateway mismatch" in line_lower or "wrong default gateway" in line_lower:
            flags.append(
                Flag(
                    rule="GATEWAY_MISMATCH",
                    message=f"Gateway mismatch detected: {line.strip()}",
                    severity="high",
                    details={"raw": line.strip()}
                )
            )

    return flags


def check_missing_vlans(case_id: str, output: str) -> List[Flag]:
    """
    Checks show vlan / switchport output for missing, inactive, or mismatched VLANs.
    """
    flags = []
    lines = output.splitlines()

    for line in lines:
        line_lower = line.lower()
        if "vlan id" in line_lower and "not found" in line_lower:
            flags.append(
                Flag(
                    rule="MISSING_VLAN",
                    message=f"VLAN configuration missing: {line.strip()}",
                    severity="high",
                    details={"raw": line.strip()}
                )
            )
        elif "vlan" in line_lower and "inactive" in line_lower:
            flags.append(
                Flag(
                    rule="INACTIVE_VLAN",
                    message=f"VLAN is inactive: {line.strip()}",
                    severity="high",
                    details={"raw": line.strip()}
                )
            )
        elif "%native_vlan_mismatch" in line_lower or "native vlan mismatch" in line_lower:
            flags.append(
                Flag(
                    rule="NATIVE_VLAN_MISMATCH",
                    message=f"Native VLAN mismatch detected: {line.strip()}",
                    severity="high",
                    details={"raw": line.strip()}
                )
            )

    return flags


def check_missing_routes(case_id: str, output: str) -> List[Flag]:
    """
    Checks routing tables for missing routes or unroutable networks.
    """
    flags = []
    lines = output.splitlines()

    for line in lines:
        line_lower = line.lower()
        if "% network not in table" in line_lower or "route not found" in line_lower:
            flags.append(
                Flag(
                    rule="MISSING_ROUTE",
                    message=f"Route missing from routing table: {line.strip()}",
                    severity="high",
                    details={"raw": line.strip()}
                )
            )

    return flags


def run_all_checks(case_id: str, show_output: str) -> CheckResult:
    """
    Runs all deterministic rule checks against the given show command output.
    Returns a CheckResult containing all identified flags.
    """
    result = CheckResult(case_id=case_id)

    check_functions = [
        check_interface_status,
        check_duplicate_ips,
        check_subnet_masks,
        check_gateway_mismatch,
        check_missing_vlans,
        check_missing_routes,
    ]

    for check_fn in check_functions:
        flags = check_fn(case_id, show_output)
        result.flags.extend(flags)

    return result


if __name__ == "__main__":
    # Simple self-test demo
    sample_output = """
    GigabitEthernet0/1    192.168.1.1    YES manual    administratively down    down
    GigabitEthernet0/2    192.168.1.1    YES manual    up                      up
    Gateway of last resort is not set
    %CDP-4-NATIVE_VLAN_MISMATCH: Native VLAN mismatch discovered on GigabitEthernet0/1 (1), with Switch GigabitEthernet0/1 (99).
    """
    res = run_all_checks("DEMO-001", sample_output)
    print(f"Case {res.case_id} passed: {res.passed}")
    for f in res.flags:
        print(f"  [{f.severity.upper()}] {f.rule}: {f.message}")
