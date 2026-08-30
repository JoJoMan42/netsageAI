# NetSage AI

**AI-Assisted Network Troubleshooting for Cisco-Style Lab Environments**

NetSage AI is an applied AI project that combines deterministic rule checking, LLM-powered diagnosis, and mandatory human review to troubleshoot Cisco-style network faults. It is designed for academic Packet Tracer / lab environments and demonstrates a responsible AI pipeline where the human reviewer always has final authority.

---

## Architecture

```
                    cases.csv
                        |
                        v
              Python Rule Checker
                        |
                        v
              deterministic flags
                        |
                        v
              diagnose_prompt.md
                  + case evidence
                        |
                        v
                     AI call
                        |
                        v
              Structured JSON output
                        |
                        v
               Human Reviewer
                        |
             +----------+----------+
             v          v          v
          Accepted    Edited    Rejected
             |          |          |
             +----------+----------+
                        v
               reviewer_log.csv
                        |
                        v
                    Dashboard
```

**Key Principle:** The AI recommends, the human decides. AI diagnoses are never automatically applied.

---

## Project Structure

```
netsage-ai/
|
├── data/
│   └── cases.csv                # 31 troubleshooting cases with symptoms, show outputs, faults
|
├── prompts/
│   └── diagnose_prompt.md       # Structured AI prompt with few-shot examples
|
├── checker/
│   ├── rule_checker.py          # Deterministic Python rule checker (6 checks)
│   └── test_rule_checker.py     # Unit tests for all rule checker functions
|
├── ai/
│   ├── diagnose.py              # AI diagnosis runner (mock + live LLM modes)
│   └── outputs/                 # Generated AI diagnosis JSON files (gitignored)
|
├── review/
│   └── reviewer_log.csv         # Human review log: Accepted / Edited / Rejected
|
├── dashboard/
│   ├── dashboard.py             # Dashboard chart generator (matplotlib)
│   └── charts/                  # Generated chart PNG files
|
├── requirements.txt             # Python dependencies
├── README.md
└── .gitignore
```

---

## Components

### 1. Case Dataset (`data/cases.csv`)

31 troubleshooting cases covering 8 fault categories:

| Category   | Cases     | Count |
|------------|-----------|-------|
| VLAN       | CASE-001–005 | 5  |
| Gateway/IP | CASE-006–009 | 4  |
| DHCP       | CASE-010–013 | 4  |
| DNS        | CASE-014–016 | 3  |
| Routing    | CASE-017–021 | 5  |
| ACL        | CASE-022–025 | 4  |
| NAT        | CASE-026–028 | 3  |
| Wireless   | CASE-029–031 | 3  |

Each case includes: `case_id`, `issue_type`, `symptom`, `topology_note`, `show_output`, `expected_fault`, `osi_layer`, `concept_tag`, `severity`.

### 2. Deterministic Rule Checker (`checker/rule_checker.py`)

Six independent, modular checks that run **before** the AI:

| Check Function           | Rule Detected                | Severity |
|--------------------------|------------------------------|----------|
| `check_interface_status` | INTERFACE_ADMIN_DOWN, INTERFACE_DOWN, INTERFACE_LINE_DOWN | high/medium |
| `check_duplicate_ips`    | DUPLICATE_IP_DETECTED, DUPLICATE_IP_ASSIGNED | high |
| `check_subnet_masks`     | SUBNET_MASK_MISMATCH, INVALID_SUBNET_MASK | high |
| `check_gateway_mismatch` | NO_GATEWAY_SET, GATEWAY_MISMATCH | medium/high |
| `check_missing_vlans`    | MISSING_VLAN, INACTIVE_VLAN, NATIVE_VLAN_MISMATCH | high |
| `check_missing_routes`   | MISSING_ROUTE | high |

The checker uses Python standard library (`dataclasses`, `re`, `ipaddress`) with no external dependencies.

### 3. AI Prompt (`prompts/diagnose_prompt.md`)

A structured prompt template that:
- Enforces strict evidence grounding (no hallucination)
- Calibrates confidence levels (high / medium / low)
- Requires the AI to output valid JSON with: `root_cause`, `confidence`, `evidence`, `osi_layer`, `next_command`, `fix_steps`
- Includes 3 few-shot worked examples at different confidence levels

### 4. AI Diagnosis Runner (`ai/diagnose.py`)

Operating modes:

- **`--mock`**: Uses built-in mock responses for offline testing/demo (no API key needed)
- **`--live`**: Calls **Google Gemini API** (requires `GEMINI_API_KEY` in `.env`)
- **`--provider openai`**: Optional support for OpenAI (requires `OPENAI_API_KEY`)
- **`--model <name>`**: Custom model override (defaults to `gemini-2.5-flash`)

The runner:
1. Loads cases from CSV
2. Runs the deterministic rule checker on each case
3. Builds the AI prompt with case evidence + checker flags
4. Calls the AI (Gemini, OpenAI, or Mock)
5. Validates the JSON response schema
6. Saves structured output to `ai/outputs/`

### 5. Human Review Log (`review/reviewer_log.csv`)

Records the human reviewer's decision for every AI diagnosis:
- **Accepted**: AI diagnosis was correct
- **Edited**: AI was partially correct, human improved it
- **Rejected**: AI diagnosis was wrong, human provided correct answer

Includes `correction_reason` and `reviewer_notes` for accountability.

### 6. Dashboard (`dashboard/dashboard.py`)

Generates 6 charts using matplotlib:
- Cases by Issue Type (bar chart)
- Severity Breakdown (pie chart)
- Human Review Decisions (horizontal bar)
- AI/Human Agreement Rate (gauge bar)
- AI Correction Reasons (horizontal bar)
- Cases by OSI Layer (bar chart)

Also prints a summary statistics table to the console.

---

## Setup

### Prerequisites

- Python 3.10+
- pip

### Installation

```bash
# Clone the repository
git clone https://github.com/JoJoMan42/netsageAI.git
cd netsageAI

# Create and activate a virtual environment
python -m venv myvenv

# Windows
myvenv\Scripts\activate

# macOS/Linux
source myvenv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Optional: Live Google Gemini API Mode

To run diagnoses against Google Gemini, create a `.env` file in the project root:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

> **Note:** `.env` is gitignored. Never commit API keys.

---

## Usage

### Run the Deterministic Rule Checker Tests

```bash
python checker/test_rule_checker.py
```

### Run AI Diagnosis (Mock Mode — No API Key Needed)

```bash
# All 31 cases
python ai/diagnose.py --mock

# Single case
python ai/diagnose.py --mock --case CASE-017
```

### Run AI Diagnosis (Live Google Gemini API)

```bash
# Single case with Gemini
python ai/diagnose.py --live --case CASE-001

# All 31 cases with Gemini
python ai/diagnose.py --live

# Custom Gemini model
python ai/diagnose.py --live --model gemini-1.5-flash --case CASE-001
```

### Generate Dashboard (Matplotlib PNGs)

```bash
python dashboard/dashboard.py
```

Charts are saved to `dashboard/charts/`.

### Run the Interactive React Dashboard (Modern Web UI)

```bash
cd frontend
npm install
npm run dev
```

Visit **`http://localhost:5173`** in your browser to access:
- **Interactive Analytics Hub**: Dynamic Recharts visualizations, KPI metrics, and AI/Human agreement rates.
- **Case Knowledge Base**: Filterable 31 cases with Cisco CLI syntax inspection and expected root causes.
- **Deterministic Rule Checker Studio**: Live rule evaluator across all 6 Cisco checks.
- **AI Diagnostic Studio**: Real-time mock or live Google Gemini 2.5 Flash reasoning with confidence meters and 1-click copyable IOS fix scripts.
- **Human Review Console**: Interactive Accept/Edit/Reject workflow with live audit logging and CSV export.
- **Cisco CLI Sandbox**: Playground to troubleshoot custom show command outputs in real-time.

---

## Responsible AI Log

The project includes **7 documented cases** where the AI diagnosis was corrected by the human reviewer:

| Case | Decision | Correction Reason |
|------|----------|-------------------|
| CASE-002 | Edited | Missed a simpler cause |
| CASE-010 | Rejected | Wrong OSI layer |
| CASE-012 | Edited | Missed a simpler cause |
| CASE-013 | Rejected | Wrong OSI layer |
| CASE-017 | Edited | Incomplete diagnosis |
| CASE-024 | Edited | Incorrect interpretation of command output |
| CASE-029 | Rejected | Hallucinated evidence |

Detailed correction notes are in `review/reviewer_log.csv`.

---

## Dashboard Results

**AI/Human Agreement Rate: 77.4%** (24 of 31 cases accepted without modification)

| Decision  | Count |
|-----------|-------|
| Accepted  | 24    |
| Edited    | 4     |
| Rejected  | 3     |

---

## Demo Flow

1. Select a broken network case from `cases.csv`
2. Show the symptom and topology
3. Run the deterministic rule checker
4. View checker flags (if any)
5. Run AI diagnosis (mock or live)
6. View structured JSON output
7. Human reviews the diagnosis
8. Accept, edit, or reject
9. Record decision in `reviewer_log.csv`
10. Generate dashboard to see aggregate metrics

---

## Technology Stack

| Component | Technology |
|-----------|------------|
| Language | Python 3.11 |
| Data | CSV |
| Rule Checker | Python standard library (`dataclasses`, `re`, `ipaddress`) |
| AI Integration | OpenAI API (optional, mock mode available) |
| Prompt | Markdown template with few-shot examples |
| Dashboard | matplotlib |
| Version Control | Git / GitHub |

---

## License

This is an academic capstone project.
