"""
Unit tests for NetSage AI Deterministic Rule Checker
"""

import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from checker.rule_checker import (
    run_all_checks,
    check_interface_status,
    check_duplicate_ips,
    check_subnet_masks,
    check_gateway_mismatch,
    check_missing_vlans,
    check_missing_routes
)


def test_interface_status():
    output = """
    GigabitEthernet0/1    192.168.1.1    YES manual    administratively down    down
    GigabitEthernet0/2    192.168.1.2    YES manual    up                      up
    FastEthernet0/1       unassigned     YES unset     down                    down
    """
    flags = check_interface_status("CASE-001", output)
    rules = [f.rule for f in flags]
    assert "INTERFACE_ADMIN_DOWN" in rules, "Should detect admin down interface"
    assert "INTERFACE_LINE_DOWN" in rules, "Should detect line down interface"
    print("[PASS] test_interface_status passed")


def test_duplicate_ips():
    output = """
    GigabitEthernet0/0    192.168.1.1    YES manual up up
    GigabitEthernet0/1    192.168.1.1    YES manual up up
    %IP-4-DUPADDR: Duplicate IP address 192.168.1.1 on GigabitEthernet0/0, sourced by 0011.2233.4455
    """
    flags = check_duplicate_ips("CASE-002", output)
    rules = [f.rule for f in flags]
    assert "DUPLICATE_IP_DETECTED" in rules or "DUPLICATE_IP_ASSIGNED" in rules
    print("[PASS] test_duplicate_ips passed")


def test_subnet_masks():
    output = """
    interface GigabitEthernet0/0
     ip address 192.168.1.1 255.255.255.0
    interface GigabitEthernet0/1
     ip address 192.168.2.1 255.255.250.0
    """
    flags = check_subnet_masks("CASE-003", output)
    rules = [f.rule for f in flags]
    assert "INVALID_SUBNET_MASK" in rules, "Should detect invalid subnet mask 255.255.250.0"
    print("[PASS] test_subnet_masks passed")


def test_gateway_mismatch():
    output = """
    Gateway of last resort is not set
    % Error: Wrong default gateway configured for subnetwork.
    """
    flags = check_gateway_mismatch("CASE-004", output)
    rules = [f.rule for f in flags]
    assert "NO_GATEWAY_SET" in rules
    assert "GATEWAY_MISMATCH" in rules
    print("[PASS] test_gateway_mismatch passed")


def test_missing_vlans():
    output = """
    %CDP-4-NATIVE_VLAN_MISMATCH: Native VLAN mismatch discovered on GigabitEthernet0/1 (1), with Switch GigabitEthernet0/1 (99).
    VLAN 10 inactive
    """
    flags = check_missing_vlans("CASE-005", output)
    rules = [f.rule for f in flags]
    assert "NATIVE_VLAN_MISMATCH" in rules
    assert "INACTIVE_VLAN" in rules
    print("[PASS] test_missing_vlans passed")


def test_missing_routes():
    output = """
    % Network not in table
    """
    flags = check_missing_routes("CASE-006", output)
    rules = [f.rule for f in flags]
    assert "MISSING_ROUTE" in rules
    print("[PASS] test_missing_routes passed")


def test_run_all_checks_clean():
    clean_output = """
    GigabitEthernet0/0    192.168.1.1    YES manual up up
    GigabitEthernet0/1    10.0.0.1       YES manual up up
    Gateway of last resort is 10.0.0.2 to network 0.0.0.0
    """
    res = run_all_checks("CLEAN-001", clean_output)
    assert res.passed is True
    assert len(res.flags) == 0
    print("[PASS] test_run_all_checks_clean passed")


if __name__ == "__main__":
    print("Running NetSage AI Rule Checker tests...")
    test_interface_status()
    test_duplicate_ips()
    test_subnet_masks()
    test_gateway_mismatch()
    test_missing_vlans()
    test_missing_routes()
    test_run_all_checks_clean()
    print("\nAll deterministic rule checker tests passed successfully!")
