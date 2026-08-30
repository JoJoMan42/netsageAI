import { ReviewItem } from "../types";

export const INITIAL_REVIEWS: ReviewItem[] = [
  {
    "case_id": "CASE-001",
    "ai_root_cause": "PC1 is assigned to VLAN 1 (default) instead of VLAN 10.",
    "ai_confidence": "medium",
    "ai_osi_layer": "Layer 2",
    "human_decision": "Accepted",
    "final_root_cause": "PC1 is assigned to VLAN 1 (default) instead of VLAN 10.",
    "correction_reason": "",
    "reviewer_notes": "AI diagnosis matches the expected fault. Confirmed via show vlan brief."
  },
  {
    "case_id": "CASE-002",
    "ai_root_cause": "VLAN 30 exists and PC3 is correctly assigned, but no other hosts are in VLAN 30 and no inter-VLAN routing is configured.",
    "ai_confidence": "medium",
    "ai_osi_layer": "Layer 2",
    "human_decision": "Edited",
    "final_root_cause": "VLAN 30 is isolated - only one host assigned and no Layer 3 gateway for inter-VLAN routing.",
    "correction_reason": "Missed a simpler cause",
    "reviewer_notes": "AI identified the isolation but did not clearly state that the fix requires either adding more hosts to VLAN 30 or configuring a router-on-a-stick for inter-VLAN routing. Edited for clarity."
  },
  {
    "case_id": "CASE-003",
    "ai_root_cause": "Trunk on SW1 does not allow VLAN 10.",
    "ai_confidence": "medium",
    "ai_osi_layer": "Layer 2",
    "human_decision": "Accepted",
    "final_root_cause": "Trunk on SW1 does not allow VLAN 10. VLAN 10 traffic is filtered on SW1 trunk port Gi0/1.",
    "correction_reason": "",
    "reviewer_notes": "Correct. The trunk allowed list 1/20/30 omits VLAN 10. Clear evidence in show interfaces trunk."
  },
  {
    "case_id": "CASE-004",
    "ai_root_cause": "Native VLAN mismatch between SW1 (native VLAN 1) and SW2 (native VLAN 99).",
    "ai_confidence": "high",
    "ai_osi_layer": "Layer 2",
    "human_decision": "Accepted",
    "final_root_cause": "Native VLAN mismatch between SW1 (native VLAN 1) and SW2 (native VLAN 99).",
    "correction_reason": "",
    "reviewer_notes": "CDP syslog message and trunk output confirm mismatch. Deterministic checker also flagged it."
  },
  {
    "case_id": "CASE-005",
    "ai_root_cause": "Access port Fa0/3 is configured as dynamic desirable and has negotiated into trunk mode.",
    "ai_confidence": "medium",
    "ai_osi_layer": "Layer 2",
    "human_decision": "Accepted",
    "final_root_cause": "Access port Fa0/3 is configured as dynamic desirable and has negotiated into trunk mode instead of access mode.",
    "correction_reason": "",
    "reviewer_notes": "Correct diagnosis. DTP negotiation caused the port to become a trunk. Fix: switchport mode access."
  },
  {
    "case_id": "CASE-006",
    "ai_root_cause": "PC1 default gateway is set to 192.168.1.254 but the router interface is 192.168.1.1.",
    "ai_confidence": "medium",
    "ai_osi_layer": "Layer 3",
    "human_decision": "Accepted",
    "final_root_cause": "PC1 default gateway is set to 192.168.1.254 but the router interface is 192.168.1.1. Gateway mismatch.",
    "correction_reason": "",
    "reviewer_notes": "Clear mismatch. PC config shows .254 while router is .1."
  },
  {
    "case_id": "CASE-007",
    "ai_root_cause": "PC2 has wrong subnet mask (255.255.0.0 instead of 255.255.255.0).",
    "ai_confidence": "medium",
    "ai_osi_layer": "Layer 3",
    "human_decision": "Accepted",
    "final_root_cause": "PC2 has wrong subnet mask (255.255.0.0 instead of 255.255.255.0). Although both IPs are in the same /24 PC2 calculates a different broadcast domain.",
    "correction_reason": "",
    "reviewer_notes": "Correct. Subnet mask mismatch causes ARP failures between the two PCs."
  },
  {
    "case_id": "CASE-008",
    "ai_root_cause": "Duplicate IP address 192.168.1.1 detected.",
    "ai_confidence": "high",
    "ai_osi_layer": "Layer 3",
    "human_decision": "Accepted",
    "final_root_cause": "Duplicate IP address 192.168.1.1 detected. Another device on the network is using the same IP as R1 GigabitEthernet0/0.",
    "correction_reason": "",
    "reviewer_notes": "Syslog message %IP-4-DUPADDR confirms the duplicate. Checker also flagged it."
  },
  {
    "case_id": "CASE-009",
    "ai_root_cause": "Router interface GigabitEthernet0/0 is administratively down.",
    "ai_confidence": "high",
    "ai_osi_layer": "Layer 1",
    "human_decision": "Accepted",
    "final_root_cause": "Router interface GigabitEthernet0/0 is administratively down (shutdown). Needs no shutdown.",
    "correction_reason": "",
    "reviewer_notes": "Admin down confirmed in show ip interface brief. Straightforward fix."
  },
  {
    "case_id": "CASE-010",
    "ai_root_cause": "DHCP pool has wrong network (10.0.0.0/24) that does not match the interface subnet (192.168.1.0/24).",
    "ai_confidence": "medium",
    "ai_osi_layer": "Layer 7",
    "human_decision": "Rejected",
    "final_root_cause": "DHCP pool network mismatch - pool is 10.0.0.0/24 but the connected interface is 192.168.1.0/24.",
    "correction_reason": "Wrong OSI layer",
    "reviewer_notes": "AI marked this as Layer 7 but this is fundamentally a Layer 3 addressing issue. The DHCP service is operational but the network configuration in the pool is a Layer 3 problem. Root cause was approximately correct but OSI classification was wrong."
  },
  {
    "case_id": "CASE-011",
    "ai_root_cause": "DHCP pool specifies default router as 192.168.1.100 but R1 LAN interface is 192.168.1.1.",
    "ai_confidence": "medium",
    "ai_osi_layer": "Layer 3",
    "human_decision": "Accepted",
    "final_root_cause": "DHCP pool specifies default router as 192.168.1.100 but R1 LAN interface is 192.168.1.1. Clients get wrong gateway from DHCP.",
    "correction_reason": "",
    "reviewer_notes": "Correct. DHCP hands out wrong gateway. Easy to verify with ipconfig on client."
  },
  {
    "case_id": "CASE-012",
    "ai_root_cause": "DHCP address pool exhausted. All 5 available addresses are allocated.",
    "ai_confidence": "medium",
    "ai_osi_layer": "Layer 7",
    "human_decision": "Edited",
    "final_root_cause": "DHCP pool exhausted - all addresses leased with 0 free. Pool size is too small for the number of clients.",
    "correction_reason": "Missed a simpler cause",
    "reviewer_notes": "AI correctly identified exhaustion but did not mention that the pool size (only 5 addresses in a /24) is abnormally small. The real fix is to expand the pool or reduce the lease time not just wait for leases to expire."
  },
  {
    "case_id": "CASE-013",
    "ai_root_cause": "Missing ip helper-address on sub-interface Gi0/0.10.",
    "ai_confidence": "medium",
    "ai_osi_layer": "Layer 7",
    "human_decision": "Rejected",
    "final_root_cause": "DHCP relay (ip helper-address) is not configured on the router sub-interface for VLAN 10.",
    "correction_reason": "Wrong OSI layer",
    "reviewer_notes": "AI correctly found the missing helper-address but classified it as Layer 7. DHCP relay is a Layer 3 function (IP forwarding of broadcasts). The application-layer DHCP service itself is fine. Corrected OSI to Layer 3."
  },
  {
    "case_id": "CASE-014",
    "ai_root_cause": "Client DNS server is set to 10.10.10.50 which is unreachable.",
    "ai_confidence": "medium",
    "ai_osi_layer": "Layer 7",
    "human_decision": "Accepted",
    "final_root_cause": "Client DNS server is set to 10.10.10.50 which is unreachable. DNS server IP is wrong or the server is offline.",
    "correction_reason": "",
    "reviewer_notes": "Confirmed by failed ping to 10.10.10.50 and nslookup timeout."
  },
  {
    "case_id": "CASE-015",
    "ai_root_cause": "DNS server is reachable but does not have an A record for webserver.lab.local.",
    "ai_confidence": "medium",
    "ai_osi_layer": "Layer 7",
    "human_decision": "Accepted",
    "final_root_cause": "DNS server is reachable but does not have an A record for webserver.lab.local. Missing DNS record on the server.",
    "correction_reason": "",
    "reviewer_notes": "Correct. nslookup returns Non-existent domain. Record needs to be added on the DNS server."
  },
  {
    "case_id": "CASE-016",
    "ai_root_cause": "Client uses external DNS (8.8.8.8) instead of internal DNS server (192.168.1.5).",
    "ai_confidence": "medium",
    "ai_osi_layer": "Layer 7",
    "human_decision": "Accepted",
    "final_root_cause": "Client uses external DNS (8.8.8.8) instead of internal DNS server (192.168.1.5). External DNS cannot resolve internal hostnames.",
    "correction_reason": "",
    "reviewer_notes": "Correct. Second nslookup with explicit server 192.168.1.5 resolves successfully proving the internal DNS works."
  },
  {
    "case_id": "CASE-017",
    "ai_root_cause": "Missing static route on R1 to reach 172.16.1.0/24 network.",
    "ai_confidence": "medium",
    "ai_osi_layer": "Layer 3",
    "human_decision": "Edited",
    "final_root_cause": "Missing static route on R1 to 172.16.1.0/24. Additionally no default gateway is set as a fallback.",
    "correction_reason": "Incomplete diagnosis",
    "reviewer_notes": "AI identified the missing route but failed to note that Gateway of last resort is not set which means there is also no default route as a catch-all. Both issues should be addressed."
  },
  {
    "case_id": "CASE-018",
    "ai_root_cause": "Static route on R1 points to next-hop 10.0.0.5 but R2 Serial0/0/0 is 10.0.0.2.",
    "ai_confidence": "medium",
    "ai_osi_layer": "Layer 3",
    "human_decision": "Accepted",
    "final_root_cause": "Static route on R1 points to next-hop 10.0.0.5 but R2 Serial0/0/0 is 10.0.0.2. Wrong next-hop address in the static route.",
    "correction_reason": "",
    "reviewer_notes": "Correct. Clear mismatch between configured next-hop and actual R2 interface IP."
  },
  {
    "case_id": "CASE-019",
    "ai_root_cause": "Static route on R1 points to 172.16.0.0/24 but Server1 is on 172.16.1.0/24.",
    "ai_confidence": "medium",
    "ai_osi_layer": "Layer 3",
    "human_decision": "Accepted",
    "final_root_cause": "Static route on R1 points to 172.16.0.0/24 but Server1 is on 172.16.1.0/24. Wrong destination network in the static route.",
    "correction_reason": "",
    "reviewer_notes": "Correct. Off-by-one octet in the destination network. Subtle but clearly visible in show ip route."
  },
  {
    "case_id": "CASE-020",
    "ai_root_cause": "Router serial interface S0/0/0 is down/down. Physical layer issue.",
    "ai_confidence": "medium",
    "ai_osi_layer": "Layer 1",
    "human_decision": "Accepted",
    "final_root_cause": "Router serial interface S0/0/0 is down/down. Physical layer issue - cable disconnected or clock rate not configured on DCE side.",
    "correction_reason": "",
    "reviewer_notes": "Correct. show ip interface brief and show interfaces confirm down/down state."
  },
  {
    "case_id": "CASE-021",
    "ai_root_cause": "Return route missing on R2. R2 has no route back to 192.168.1.0/24.",
    "ai_confidence": "medium",
    "ai_osi_layer": "Layer 3",
    "human_decision": "Accepted",
    "final_root_cause": "Return route missing on R2. R2 has no route back to 192.168.1.0/24 so reply packets are dropped.",
    "correction_reason": "",
    "reviewer_notes": "Correct. R2 routing table only shows connected networks. Asymmetric routing problem."
  },
  {
    "case_id": "CASE-022",
    "ai_root_cause": "ACL 101 explicitly denies TCP traffic from host 192.168.1.10 to Server1 on port 80.",
    "ai_confidence": "medium",
    "ai_osi_layer": "Layer 4",
    "human_decision": "Accepted",
    "final_root_cause": "ACL 101 explicitly denies TCP traffic from host 192.168.1.10 to Server1 on port 80 (www). ACL applied inbound on Gi0/0.",
    "correction_reason": "",
    "reviewer_notes": "Correct. ACL deny statement with match count confirms traffic is being blocked."
  },
  {
    "case_id": "CASE-023",
    "ai_root_cause": "ACL 110 permit statement uses wrong source subnet 192.168.10.0/24 instead of 192.168.1.0/24.",
    "ai_confidence": "medium",
    "ai_osi_layer": "Layer 4",
    "human_decision": "Accepted",
    "final_root_cause": "ACL 110 permit statement uses wrong source subnet 192.168.10.0/24 instead of 192.168.1.0/24. Zero matches on permit confirms no traffic passes.",
    "correction_reason": "",
    "reviewer_notes": "Correct. 0 matches on the permit line and 342 matches on the deny confirm the misconfiguration."
  },
  {
    "case_id": "CASE-024",
    "ai_root_cause": "ACL 120 is applied outbound on Gi0/1. Return traffic does not match the permit.",
    "ai_confidence": "medium",
    "ai_osi_layer": "Layer 4",
    "human_decision": "Edited",
    "final_root_cause": "ACL 120 applied outbound on Gi0/1 only permits traffic FROM source subnet TO dest subnet. Return traffic is blocked by implicit deny. Need a reverse permit or move ACL to inbound.",
    "correction_reason": "Incorrect interpretation of command output",
    "reviewer_notes": "AI identified the direction issue but did not clearly explain that the permit only matches one direction of traffic. The fix requires either adding a reverse permit entry or re-applying the ACL in the correct direction."
  },
  {
    "case_id": "CASE-025",
    "ai_root_cause": "ACL 130 only has deny statements. No permit statement means implicit deny blocks all traffic.",
    "ai_confidence": "medium",
    "ai_osi_layer": "Layer 4",
    "human_decision": "Accepted",
    "final_root_cause": "ACL 130 only has deny statements for telnet and ftp. There is no permit statement so the implicit deny ip any any blocks all other traffic.",
    "correction_reason": "",
    "reviewer_notes": "Correct. Classic ACL mistake. Need to add permit ip any any at the end."
  },
  {
    "case_id": "CASE-026",
    "ai_root_cause": "Missing ip nat inside on GigabitEthernet0/0.",
    "ai_confidence": "medium",
    "ai_osi_layer": "Layer 3",
    "human_decision": "Accepted",
    "final_root_cause": "Missing ip nat inside on GigabitEthernet0/0. The inside interface is not marked for NAT so translations never occur.",
    "correction_reason": "",
    "reviewer_notes": "Correct. show running-config confirms ip nat outside on Gi0/1 but no ip nat inside on Gi0/0."
  },
  {
    "case_id": "CASE-027",
    "ai_root_cause": "NAT ACL 1 only permits 192.168.1.0/24. The 10.10.10.0/24 subnet is not included.",
    "ai_confidence": "medium",
    "ai_osi_layer": "Layer 3",
    "human_decision": "Accepted",
    "final_root_cause": "NAT ACL 1 only permits 192.168.1.0/24. The 10.10.10.0/24 subnet is not included in the NAT access list.",
    "correction_reason": "",
    "reviewer_notes": "Correct. ACL 1 needs an additional permit statement for the second subnet."
  },
  {
    "case_id": "CASE-028",
    "ai_root_cause": "NAT overload (PAT) keyword is missing.",
    "ai_confidence": "medium",
    "ai_osi_layer": "Layer 3",
    "human_decision": "Accepted",
    "final_root_cause": "NAT overload (PAT) keyword is missing. Without 'overload' only one inside host can be translated at a time.",
    "correction_reason": "",
    "reviewer_notes": "Correct. Need to add 'overload' to the ip nat inside source command."
  },
  {
    "case_id": "CASE-029",
    "ai_root_cause": "SSID Guest-WiFi is mapped to VLAN 10 (Corporate) instead of VLAN 20 (Guest).",
    "ai_confidence": "medium",
    "ai_osi_layer": "Layer 2",
    "human_decision": "Rejected",
    "final_root_cause": "Guest-WiFi SSID is mapped to the wrong VLAN (10 instead of 20). This is a security issue as guest users get corporate network access.",
    "correction_reason": "Hallucinated evidence",
    "reviewer_notes": "AI identified the correct root cause but in its evidence cited a 'WLC RADIUS policy' that was not present in the show output. The actual evidence is solely from show wlan summary showing both SSIDs mapped to vlan10. Corrected to remove hallucinated evidence."
  },
  {
    "case_id": "CASE-030",
    "ai_root_cause": "No ACL is configured between VLAN 20 (Guest) and VLAN 10 (Corporate).",
    "ai_confidence": "medium",
    "ai_osi_layer": "Layer 3",
    "human_decision": "Accepted",
    "final_root_cause": "No ACL is configured between VLAN 20 (Guest) and VLAN 10 (Corporate). Inter-VLAN routing allows guest wireless clients full access to internal LAN.",
    "correction_reason": "",
    "reviewer_notes": "Correct. show access-lists returns empty. An ACL is needed on the VLAN 20 sub-interface."
  },
  {
    "case_id": "CASE-031",
    "ai_root_cause": "DHCP pool assigns default gateway 192.168.20.100 but the actual router sub-interface is 192.168.20.1.",
    "ai_confidence": "medium",
    "ai_osi_layer": "Layer 3",
    "human_decision": "Accepted",
    "final_root_cause": "DHCP pool assigns default gateway 192.168.20.100 but the actual router sub-interface for VLAN 20 is 192.168.20.1. Wireless client gets wrong gateway.",
    "correction_reason": "",
    "reviewer_notes": "Correct. DHCP pool default-router needs to be changed to 192.168.20.1."
  }
];
