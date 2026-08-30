"""
NetSage AI - AI Diagnosis Runner

Loads troubleshooting cases from cases.csv, runs the deterministic rule checker,
builds a prompt from diagnose_prompt.md, calls the AI model (Google Gemini or OpenAI),
validates the structured JSON response, and saves results for human review.

Supports modes:
  --mock               Use built-in mock responses (no API key needed, for offline testing/demo)
  --live               Call real Google Gemini API (requires GEMINI_API_KEY)
  --provider gemini    Use Google Gemini (default for --live)
  --provider openai    Use OpenAI (requires OPENAI_API_KEY)
  --model <name>       Specify custom model name (e.g., gemini-2.5-flash, gemini-1.5-flash)

Usage:
  python ai/diagnose.py --mock                  # Run all cases with mock AI
  python ai/diagnose.py --mock --case CASE-001   # Run single case with mock AI
  python ai/diagnose.py --live                   # Run all cases with Google Gemini API
  python ai/diagnose.py --live --case CASE-017   # Run single case with Google Gemini API
"""

import argparse
import csv
import json
import os
import sys
import urllib.request
import urllib.error
from pathlib import Path
from typing import Dict, List, Optional

# Add project root to path so we can import checker
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from checker.rule_checker import run_all_checks, CheckResult


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

CASES_CSV = PROJECT_ROOT / "data" / "cases.csv"
PROMPT_TEMPLATE = PROJECT_ROOT / "prompts" / "diagnose_prompt.md"
OUTPUT_DIR = PROJECT_ROOT / "ai" / "outputs"
REQUIRED_KEYS = {"root_cause", "confidence", "evidence", "osi_layer", "next_command", "fix_steps"}
VALID_CONFIDENCE = {"high", "medium", "low"}
VALID_OSI = {"Layer 1", "Layer 2", "Layer 3", "Layer 4", "Layer 7"}


# ---------------------------------------------------------------------------
# Data Loading & Helpers
# ---------------------------------------------------------------------------

def load_cases(csv_path: Path = CASES_CSV) -> List[Dict[str, str]]:
    """Load troubleshooting cases from CSV."""
    cases = []
    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            cases.append(row)
    return cases


def load_prompt_template(template_path: Path = PROMPT_TEMPLATE) -> str:
    """Load the AI prompt markdown template."""
    with open(template_path, encoding="utf-8") as f:
        return f.read()


def get_api_key(key_name: str) -> Optional[str]:
    """Retrieve API key from environment or .env file."""
    api_key = os.environ.get(key_name)
    if api_key:
        return api_key

    # Check alternative names (e.g. GOOGLE_API_KEY vs GEMINI_API_KEY)
    if key_name == "GEMINI_API_KEY":
        alt = os.environ.get("GOOGLE_API_KEY")
        if alt:
            return alt

    env_path = PROJECT_ROOT / ".env"
    if env_path.exists():
        with open(env_path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith(f"{key_name}="):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")
                if key_name == "GEMINI_API_KEY" and line.startswith("GOOGLE_API_KEY="):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")

    return None


# ---------------------------------------------------------------------------
# Deterministic Checker Integration
# ---------------------------------------------------------------------------

def format_flags(result: CheckResult) -> str:
    """Convert CheckResult flags into human-readable text for the AI prompt."""
    if result.passed:
        return "  No deterministic issues detected."
    lines = []
    for flag in result.flags:
        lines.append(f"  [{flag.severity.upper()}] {flag.rule}: {flag.message}")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Prompt Construction
# ---------------------------------------------------------------------------

def build_prompt(template: str, case: Dict[str, str], flags_text: str) -> str:
    """Fill the prompt template with case-specific data."""
    prompt = template.replace("{{case_id}}", case["case_id"])
    prompt = prompt.replace("{{symptom}}", case["symptom"])
    prompt = prompt.replace("{{topology_note}}", case["topology_note"])
    prompt = prompt.replace("{{deterministic_flags}}", flags_text)
    prompt = prompt.replace("{{show_output}}", case["show_output"])
    return prompt


# ---------------------------------------------------------------------------
# AI Backends
# ---------------------------------------------------------------------------

def clean_json_response(raw_text: str) -> Dict:
    """Strip markdown formatting and parse JSON response safely."""
    text = raw_text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    return json.loads(text)


def call_mock_ai(case: Dict[str, str], check_result: CheckResult) -> Dict:
    """
    Generate a plausible mock AI response based on the case data.
    Allows full offline pipeline testing without any API key.
    """
    evidence = []
    for flag in check_result.flags:
        evidence.append(f"Deterministic checker flagged {flag.rule}: {flag.message}")
    if not evidence:
        evidence.append(f"Show command output analyzed for case {case['case_id']}.")

    if check_result.flags:
        high_flags = [f for f in check_result.flags if f.severity == "high"]
        confidence = "high" if high_flags else "medium"
    else:
        confidence = "medium"

    fix_steps_map = {
        "VLAN": [
            "Switch# configure terminal",
            "Switch(config)# interface <port>",
            "Switch(config-if)# switchport access vlan <correct_vlan>",
            "Switch(config-if)# end"
        ],
        "Gateway": [
            "Device# configure terminal",
            "Device(config)# interface <interface>",
            "Device(config-if)# no shutdown",
            "Device(config-if)# end"
        ],
        "DHCP": [
            "Router# configure terminal",
            "Router(config)# ip dhcp pool <pool_name>",
            "Router(dhcp-config)# default-router <correct_gateway>",
            "Router(dhcp-config)# end"
        ],
        "DNS": [
            "Device# configure terminal",
            "Device(config)# ip name-server <correct_dns>",
            "Device(config)# end"
        ],
        "Routing": [
            "Router# configure terminal",
            "Router(config)# ip route <network> <mask> <next_hop>",
            "Router(config)# end"
        ],
        "ACL": [
            "Router# configure terminal",
            "Router(config)# ip access-list extended <acl_name>",
            "Router(config-ext-nacl)# permit ip <source> <wildcard> any",
            "Router(config-ext-nacl)# end"
        ],
        "NAT": [
            "Router# configure terminal",
            "Router(config)# interface <inside_interface>",
            "Router(config-if)# ip nat inside",
            "Router(config-if)# end"
        ],
        "Wireless": [
            "WLC# configure terminal",
            "WLC(config)# wlan <ssid>",
            "WLC(config-wlan)# vlan <correct_vlan>",
            "WLC(config-wlan)# end"
        ],
    }

    next_cmd_map = {
        "VLAN": "show vlan brief",
        "Gateway": "show ip interface brief",
        "DHCP": "show ip dhcp pool",
        "DNS": "nslookup <hostname>",
        "Routing": "show ip route",
        "ACL": "show access-lists",
        "NAT": "show ip nat translations",
        "Wireless": "show wlan summary",
    }

    issue_type = case.get("issue_type", "Routing")
    fix_steps = fix_steps_map.get(issue_type, ["Verify configuration manually."])
    next_command = next_cmd_map.get(issue_type, "show running-config")

    return {
        "root_cause": case.get("expected_fault", "Unable to determine root cause from available evidence."),
        "confidence": confidence,
        "evidence": evidence,
        "osi_layer": case.get("osi_layer", "Layer 3"),
        "next_command": next_command,
        "fix_steps": fix_steps,
    }


def call_gemini_api(prompt: str, model_name: str = "gemini-2.5-flash") -> Dict:
    """
    Call Google Gemini API using google-genai / google.generativeai SDK,
    or direct HTTPS REST API fallback.
    """
    api_key = get_api_key("GEMINI_API_KEY")
    if not api_key:
        print("ERROR: GEMINI_API_KEY (or GOOGLE_API_KEY) not found in environment or .env file.")
        print("Please add GEMINI_API_KEY=your_key to .env file.")
        sys.exit(1)

    # Attempt 1: google-genai (newest official SDK)
    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config={"response_mime_type": "application/json"}
        )
        return clean_json_response(response.text)
    except ImportError:
        pass

    # Attempt 2: google.generativeai (legacy SDK)
    try:
        import google.generativeai as genai_legacy
        genai_legacy.configure(api_key=api_key)
        model = genai_legacy.GenerativeModel(
            model_name=model_name,
            generation_config={"response_mime_type": "application/json"}
        )
        response = model.generate_content(prompt)
        return clean_json_response(response.text)
    except ImportError:
        pass

    # Attempt 3: Direct HTTPS REST API call (zero external dependencies)
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.2
        }
    }

    req_data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=req_data,
        headers={"Content-Type": "application/json"}
    )

    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
            return clean_json_response(raw_text)
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8")
        print(f"ERROR: Gemini API HTTP {e.code}: {err_msg}")
        sys.exit(1)
    except Exception as e:
        print(f"ERROR calling Gemini API: {e}")
        sys.exit(1)


def call_openai_api(prompt: str, model_name: str = "gpt-4o-mini") -> Dict:
    """Call OpenAI-compatible API."""
    try:
        from openai import OpenAI
    except ImportError:
        print("ERROR: openai package not installed. Run: pip install openai")
        sys.exit(1)

    api_key = get_api_key("OPENAI_API_KEY")
    if not api_key:
        print("ERROR: OPENAI_API_KEY not found in environment or .env file.")
        sys.exit(1)

    client = OpenAI(api_key=api_key)
    response = client.chat.completions.create(
        model=model_name,
        messages=[
            {
                "role": "system",
                "content": "You are a network troubleshooting AI assistant. Return only valid JSON."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.2,
        max_tokens=1000,
    )
    return clean_json_response(response.choices[0].message.content)


# ---------------------------------------------------------------------------
# Response Validation
# ---------------------------------------------------------------------------

def validate_response(response: Dict) -> List[str]:
    """Validate AI response against the expected JSON schema. Returns list of errors."""
    errors = []

    missing = REQUIRED_KEYS - set(response.keys())
    if missing:
        errors.append(f"Missing required keys: {missing}")

    confidence = response.get("confidence", "")
    if confidence not in VALID_CONFIDENCE:
        errors.append(f"Invalid confidence value '{confidence}'. Must be one of: {VALID_CONFIDENCE}")

    osi = response.get("osi_layer", "")
    if osi not in VALID_OSI:
        errors.append(f"Invalid osi_layer '{osi}'. Must be one of: {VALID_OSI}")

    evidence = response.get("evidence", [])
    if not isinstance(evidence, list):
        errors.append("'evidence' must be a list of strings.")

    fix_steps = response.get("fix_steps", [])
    if not isinstance(fix_steps, list):
        errors.append("'fix_steps' must be a list of strings.")

    return errors


# ---------------------------------------------------------------------------
# Output Management
# ---------------------------------------------------------------------------

def save_result(case_id: str, response: Dict, validation_errors: List[str]):
    """Save AI diagnosis result to the outputs directory."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUT_DIR / f"{case_id}_diagnosis.json"

    output = {
        "case_id": case_id,
        "ai_diagnosis": response,
        "validation_errors": validation_errors,
        "schema_valid": len(validation_errors) == 0,
    }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    return output_path


# ---------------------------------------------------------------------------
# Main Pipeline
# ---------------------------------------------------------------------------

def diagnose_case(case: Dict[str, str], template: str, mode: str = "mock", provider: str = "gemini", model_name: Optional[str] = None) -> Dict:
    """Run the full diagnosis pipeline for a single case."""
    case_id = case["case_id"]
    show_output = case["show_output"]

    # Step 1: Run deterministic checker
    check_result = run_all_checks(case_id, show_output)
    flags_text = format_flags(check_result)

    # Step 2: Build prompt
    prompt = build_prompt(template, case, flags_text)

    # Step 3: Call AI
    if mode == "mock":
        response = call_mock_ai(case, check_result)
    elif provider == "gemini":
        model = model_name or "gemini-2.5-flash"
        response = call_gemini_api(prompt, model)
    elif provider == "openai":
        model = model_name or "gpt-4o-mini"
        response = call_openai_api(prompt, model)
    else:
        raise ValueError(f"Unknown provider '{provider}'")

    # Step 4: Validate response
    validation_errors = validate_response(response)

    # Step 5: Save result
    output_path = save_result(case_id, response, validation_errors)

    return {
        "case_id": case_id,
        "checker_flags": len(check_result.flags),
        "checker_passed": check_result.passed,
        "ai_root_cause": response.get("root_cause", "N/A"),
        "ai_confidence": response.get("confidence", "N/A"),
        "ai_osi_layer": response.get("osi_layer", "N/A"),
        "schema_valid": len(validation_errors) == 0,
        "output_file": str(output_path),
    }


def main():
    parser = argparse.ArgumentParser(description="NetSage AI - Network Diagnosis Runner")
    parser.add_argument("--mock", action="store_true", help="Use mock AI responses (no API key needed)")
    parser.add_argument("--live", action="store_true", help="Use real LLM API (defaults to Google Gemini)")
    parser.add_argument("--provider", type=str, choices=["gemini", "openai"], default="gemini",
                        help="LLM provider for --live (default: gemini)")
    parser.add_argument("--model", type=str, help="Custom model name (e.g. gemini-2.5-flash, gemini-1.5-flash, gpt-4o-mini)")
    parser.add_argument("--case", type=str, help="Run a specific case by ID (e.g., CASE-001)")
    args = parser.parse_args()

    # Determine mode
    if args.live:
        mode = "live"
    else:
        mode = "mock"

    if not args.mock and not args.live:
        print("No mode specified. Use --mock or --live. Defaulting to --mock.\n")
        mode = "mock"

    # Load data
    cases = load_cases()
    template = load_prompt_template()

    print(f"NetSage AI Diagnosis Runner")
    print(f"Mode:     {mode.upper()}")
    if mode == "live":
        print(f"Provider: {args.provider.upper()}")
        print(f"Model:    {args.model or ('gemini-2.5-flash' if args.provider == 'gemini' else 'gpt-4o-mini')}")
    print(f"Cases:    {len(cases)}")
    print("=" * 70)

    # Filter to specific case if requested
    if args.case:
        cases = [c for c in cases if c["case_id"] == args.case]
        if not cases:
            print(f"ERROR: Case '{args.case}' not found in dataset.")
            sys.exit(1)

    # Run diagnosis pipeline
    results = []
    for case in cases:
        print(f"\n[{case['case_id']}] {case['issue_type']} | {case['symptom'][:60]}...")
        result = diagnose_case(case, template, mode, args.provider, args.model)
        results.append(result)

        status = "VALID" if result["schema_valid"] else "INVALID SCHEMA"
        print(f"  Checker flags: {result['checker_flags']} | "
              f"Confidence: {result['ai_confidence']} | "
              f"OSI: {result['ai_osi_layer']} | "
              f"Schema: {status}")
        print(f"  Root cause: {result['ai_root_cause'][:80]}...")

    # Summary
    print("\n" + "=" * 70)
    print(f"SUMMARY: {len(results)} cases processed")
    valid = sum(1 for r in results if r["schema_valid"])
    print(f"  Schema valid: {valid}/{len(results)}")
    flagged = sum(1 for r in results if r["checker_flags"] > 0)
    print(f"  Checker flagged: {flagged}/{len(results)}")
    print(f"  Output directory: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
