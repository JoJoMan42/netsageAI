"""
NetSage AI - FastAPI Backend Server

Provides REST API endpoints for:
- /api/cases: Fetch troubleshooting cases
- /api/reviews: Fetch and update human reviewer decisions
- /api/check: Run deterministic rule checker
- /api/diagnose: Run AI diagnosis (mock or Gemini)
"""

import csv
import json
from pathlib import Path
from typing import Dict, List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import sys
# Add the backend directory to sys.path so checker/ and ai/ are importable directly
BACKEND_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND_DIR))

from checker.rule_checker import run_all_checks
from ai.diagnose import call_mock_ai, call_gemini_api, build_prompt, load_prompt_template, format_flags

app = FastAPI(title="NetSage AI API", version="1.0.0")

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CASES_CSV = BACKEND_DIR / "data" / "cases.csv"
REVIEW_CSV = BACKEND_DIR / "review" / "reviewer_log.csv"
PROMPT_TEMPLATE_PATH = BACKEND_DIR / "prompts" / "diagnose_prompt.md"


class ReviewPayload(BaseModel):
    case_id: str
    ai_root_cause: str
    ai_confidence: str
    ai_osi_layer: str
    human_decision: str
    final_root_cause: str
    correction_reason: Optional[str] = ""
    reviewer_notes: Optional[str] = ""


class CheckPayload(BaseModel):
    case_id: str
    show_output: str


class DiagnosePayload(BaseModel):
    case_id: str
    symptom: str
    topology_note: str
    show_output: str
    issue_type: Optional[str] = "Routing"
    osi_layer: Optional[str] = "Layer 3"
    expected_fault: Optional[str] = ""
    api_key: Optional[str] = None
    model_name: Optional[str] = "gemini-2.5-flash"
    use_mock: Optional[bool] = False


@app.get("/api/cases")
def get_cases():
    cases = []
    if CASES_CSV.exists():
        with open(CASES_CSV, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                cases.append(row)
    return cases


@app.get("/api/reviews")
def get_reviews():
    reviews = []
    if REVIEW_CSV.exists():
        with open(REVIEW_CSV, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                reviews.append(row)
    return reviews


@app.post("/api/reviews")
def save_review(payload: ReviewPayload):
    reviews = []
    if REVIEW_CSV.exists():
        with open(REVIEW_CSV, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                reviews.append(row)

    updated = False
    for r in reviews:
        if r["case_id"] == payload.case_id:
            r["ai_root_cause"] = payload.ai_root_cause
            r["ai_confidence"] = payload.ai_confidence
            r["ai_osi_layer"] = payload.ai_osi_layer
            r["human_decision"] = payload.human_decision
            r["final_root_cause"] = payload.final_root_cause
            r["correction_reason"] = payload.correction_reason or ""
            r["reviewer_notes"] = payload.reviewer_notes or ""
            updated = True
            break

    if not updated:
        reviews.append(payload.dict())

    # Write back to CSV
    headers = [
        "case_id",
        "ai_root_cause",
        "ai_confidence",
        "ai_osi_layer",
        "human_decision",
        "final_root_cause",
        "correction_reason",
        "reviewer_notes",
    ]
    with open(REVIEW_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        writer.writerows(reviews)

    return {"status": "success", "count": len(reviews)}


@app.post("/api/check")
def check_case(payload: CheckPayload):
    result = run_all_checks(payload.case_id, payload.show_output)
    return {
        "case_id": result.case_id,
        "passed": result.passed,
        "flags": [
            {
                "rule": f.rule,
                "message": f.message,
                "severity": f.severity,
                "details": f.details,
            }
            for f in result.flags
        ],
    }


@app.post("/api/diagnose")
def diagnose_case(payload: DiagnosePayload):
    check_result = run_all_checks(payload.case_id, payload.show_output)
    flags_text = format_flags(check_result)

    case_dict = {
        "case_id": payload.case_id,
        "symptom": payload.symptom,
        "topology_note": payload.topology_note,
        "show_output": payload.show_output,
        "issue_type": payload.issue_type,
        "osi_layer": payload.osi_layer,
        "expected_fault": payload.expected_fault,
    }

    if payload.use_mock or not payload.api_key:
        return call_mock_ai(case_dict, check_result)

    try:
        template = load_prompt_template(PROMPT_TEMPLATE_PATH)
        prompt = build_prompt(template, case_dict, flags_text)
        return call_gemini_api(prompt, model_name=payload.model_name or "gemini-2.5-flash")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
