"""
NetSage AI - Dashboard

Generates visual analytics from the troubleshooting cases and human review data.
Produces charts showing issue distribution, severity breakdown, AI/human agreement,
and responsible AI correction analysis.

Usage:
  python dashboard/dashboard.py
"""

import csv
import os
import sys
from pathlib import Path
from collections import Counter

try:
    import matplotlib
    matplotlib.use("Agg")  # Non-interactive backend for saving to files
    import matplotlib.pyplot as plt
    import matplotlib.patches as mpatches
except ImportError:
    print("ERROR: matplotlib is required. Install with: pip install matplotlib")
    sys.exit(1)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CASES_CSV = PROJECT_ROOT / "data" / "cases.csv"
REVIEW_CSV = PROJECT_ROOT / "review" / "reviewer_log.csv"
OUTPUT_DIR = PROJECT_ROOT / "dashboard" / "charts"


# ---------------------------------------------------------------------------
# Data Loading
# ---------------------------------------------------------------------------

def load_csv(path: Path):
    """Load a CSV file and return list of dictionaries."""
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


# ---------------------------------------------------------------------------
# Color Palette
# ---------------------------------------------------------------------------

COLORS = {
    "primary": "#2563EB",
    "secondary": "#7C3AED",
    "success": "#059669",
    "warning": "#D97706",
    "danger": "#DC2626",
    "info": "#0891B2",
    "light_gray": "#F3F4F6",
    "dark": "#1F2937",
}

ISSUE_COLORS = {
    "VLAN": "#3B82F6",
    "Gateway": "#8B5CF6",
    "DHCP": "#10B981",
    "DNS": "#F59E0B",
    "Routing": "#EF4444",
    "ACL": "#EC4899",
    "NAT": "#06B6D4",
    "Wireless": "#F97316",
}

SEVERITY_COLORS = {
    "High": "#DC2626",
    "Medium": "#F59E0B",
    "Low": "#10B981",
}

DECISION_COLORS = {
    "Accepted": "#059669",
    "Edited": "#D97706",
    "Rejected": "#DC2626",
}


# ---------------------------------------------------------------------------
# Chart Generators
# ---------------------------------------------------------------------------

def chart_issue_type_distribution(cases):
    """Bar chart: Number of cases by issue type."""
    types = [c["issue_type"] for c in cases]
    counts = Counter(types)

    # Sort by count descending
    sorted_items = sorted(counts.items(), key=lambda x: x[1], reverse=True)
    labels = [item[0] for item in sorted_items]
    values = [item[1] for item in sorted_items]
    colors = [ISSUE_COLORS.get(label, COLORS["primary"]) for label in labels]

    fig, ax = plt.subplots(figsize=(10, 6))
    bars = ax.bar(labels, values, color=colors, edgecolor="white", linewidth=0.5)

    # Add value labels on bars
    for bar, val in zip(bars, values):
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.15,
                str(val), ha="center", va="bottom", fontweight="bold", fontsize=12)

    ax.set_title("Cases by Issue Type", fontsize=16, fontweight="bold", pad=15)
    ax.set_xlabel("Issue Type", fontsize=12)
    ax.set_ylabel("Number of Cases", fontsize=12)
    ax.set_ylim(0, max(values) + 1.5)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.grid(axis="y", alpha=0.3)

    fig.tight_layout()
    save_path = OUTPUT_DIR / "issue_type_distribution.png"
    fig.savefig(save_path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"  Saved: {save_path}")


def chart_severity_breakdown(cases):
    """Pie chart: Case severity breakdown."""
    severities = [c["severity"] for c in cases]
    counts = Counter(severities)

    labels = list(counts.keys())
    values = list(counts.values())
    colors = [SEVERITY_COLORS.get(label, COLORS["info"]) for label in labels]

    fig, ax = plt.subplots(figsize=(8, 8))
    wedges, texts, autotexts = ax.pie(
        values, labels=labels, colors=colors, autopct="%1.0f%%",
        startangle=140, textprops={"fontsize": 13},
        wedgeprops={"edgecolor": "white", "linewidth": 2}
    )
    for autotext in autotexts:
        autotext.set_fontweight("bold")
        autotext.set_color("white")

    ax.set_title("Case Severity Breakdown", fontsize=16, fontweight="bold", pad=20)

    fig.tight_layout()
    save_path = OUTPUT_DIR / "severity_breakdown.png"
    fig.savefig(save_path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"  Saved: {save_path}")


def chart_human_decisions(reviews):
    """Horizontal bar chart: Accepted / Edited / Rejected counts."""
    decisions = [r["human_decision"] for r in reviews]
    counts = Counter(decisions)

    # Order: Accepted, Edited, Rejected
    order = ["Accepted", "Edited", "Rejected"]
    labels = [d for d in order if d in counts]
    values = [counts[d] for d in labels]
    colors = [DECISION_COLORS.get(d, COLORS["primary"]) for d in labels]

    fig, ax = plt.subplots(figsize=(9, 5))
    bars = ax.barh(labels, values, color=colors, edgecolor="white", linewidth=0.5, height=0.5)

    for bar, val in zip(bars, values):
        ax.text(bar.get_width() + 0.3, bar.get_y() + bar.get_height() / 2,
                str(val), ha="left", va="center", fontweight="bold", fontsize=13)

    ax.set_title("Human Review Decisions", fontsize=16, fontweight="bold", pad=15)
    ax.set_xlabel("Number of Cases", fontsize=12)
    ax.set_xlim(0, max(values) + 3)
    ax.invert_yaxis()
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.grid(axis="x", alpha=0.3)

    fig.tight_layout()
    save_path = OUTPUT_DIR / "human_decisions.png"
    fig.savefig(save_path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"  Saved: {save_path}")


def chart_agreement_rate(reviews):
    """Gauge-style chart: AI/Human agreement rate."""
    decisions = [r["human_decision"] for r in reviews]
    total = len(decisions)
    accepted = decisions.count("Accepted")
    agreement_pct = (accepted / total) * 100 if total > 0 else 0

    fig, ax = plt.subplots(figsize=(8, 5))

    # Background bar
    ax.barh(["Agreement"], [100], color=COLORS["light_gray"], height=0.4)
    # Foreground bar
    color = COLORS["success"] if agreement_pct >= 70 else (COLORS["warning"] if agreement_pct >= 50 else COLORS["danger"])
    ax.barh(["Agreement"], [agreement_pct], color=color, height=0.4)

    ax.text(agreement_pct / 2, 0, f"{agreement_pct:.1f}%",
            ha="center", va="center", fontweight="bold", fontsize=18, color="white")
    ax.text(agreement_pct + 1.5, 0, f"{accepted}/{total} cases accepted without changes",
            ha="left", va="center", fontsize=11, color=COLORS["dark"])

    ax.set_xlim(0, 105)
    ax.set_title("AI / Human Agreement Rate", fontsize=16, fontweight="bold", pad=15)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["bottom"].set_visible(False)
    ax.set_xticks([])
    ax.set_yticks([])

    fig.tight_layout()
    save_path = OUTPUT_DIR / "agreement_rate.png"
    fig.savefig(save_path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"  Saved: {save_path}")


def chart_correction_reasons(reviews):
    """Bar chart: Reasons why AI diagnoses were corrected."""
    corrections = [r for r in reviews if r["human_decision"] in ("Edited", "Rejected")]
    if not corrections:
        print("  Skipped correction reasons chart (no corrections found).")
        return

    reasons = [r["correction_reason"] for r in corrections if r.get("correction_reason")]
    counts = Counter(reasons)

    sorted_items = sorted(counts.items(), key=lambda x: x[1], reverse=True)
    labels = [item[0] for item in sorted_items]
    values = [item[1] for item in sorted_items]

    fig, ax = plt.subplots(figsize=(10, 6))
    color_cycle = [COLORS["danger"], COLORS["warning"], COLORS["secondary"], COLORS["info"], COLORS["primary"]]
    bar_colors = [color_cycle[i % len(color_cycle)] for i in range(len(labels))]

    bars = ax.barh(labels, values, color=bar_colors, edgecolor="white", linewidth=0.5, height=0.5)

    for bar, val in zip(bars, values):
        ax.text(bar.get_width() + 0.1, bar.get_y() + bar.get_height() / 2,
                str(val), ha="left", va="center", fontweight="bold", fontsize=12)

    ax.set_title("AI Correction Reasons (Responsible AI Log)", fontsize=16, fontweight="bold", pad=15)
    ax.set_xlabel("Number of Cases", fontsize=12)
    ax.set_xlim(0, max(values) + 1.5)
    ax.invert_yaxis()
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.grid(axis="x", alpha=0.3)

    fig.tight_layout()
    save_path = OUTPUT_DIR / "correction_reasons.png"
    fig.savefig(save_path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"  Saved: {save_path}")


def chart_osi_layer_distribution(cases):
    """Bar chart: Cases by OSI layer."""
    layers = [c["osi_layer"] for c in cases]
    counts = Counter(layers)

    # Sort by layer number
    layer_order = ["Layer 1", "Layer 2", "Layer 3", "Layer 4", "Layer 7"]
    labels = [l for l in layer_order if l in counts]
    values = [counts[l] for l in labels]

    layer_colors = {
        "Layer 1": "#EF4444",
        "Layer 2": "#F97316",
        "Layer 3": "#3B82F6",
        "Layer 4": "#8B5CF6",
        "Layer 7": "#10B981",
    }
    colors = [layer_colors.get(l, COLORS["primary"]) for l in labels]

    fig, ax = plt.subplots(figsize=(9, 6))
    bars = ax.bar(labels, values, color=colors, edgecolor="white", linewidth=0.5)

    for bar, val in zip(bars, values):
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.15,
                str(val), ha="center", va="bottom", fontweight="bold", fontsize=12)

    ax.set_title("Cases by OSI Layer", fontsize=16, fontweight="bold", pad=15)
    ax.set_xlabel("OSI Layer", fontsize=12)
    ax.set_ylabel("Number of Cases", fontsize=12)
    ax.set_ylim(0, max(values) + 2)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.grid(axis="y", alpha=0.3)

    fig.tight_layout()
    save_path = OUTPUT_DIR / "osi_layer_distribution.png"
    fig.savefig(save_path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"  Saved: {save_path}")


def print_summary_table(cases, reviews):
    """Print a summary statistics table to the console."""
    total_cases = len(cases)
    issue_counts = Counter(c["issue_type"] for c in cases)
    severity_counts = Counter(c["severity"] for c in cases)
    decision_counts = Counter(r["human_decision"] for r in reviews)
    corrections = [r for r in reviews if r["human_decision"] in ("Edited", "Rejected")]

    accepted = decision_counts.get("Accepted", 0)
    agreement_pct = (accepted / total_cases) * 100 if total_cases > 0 else 0

    print("\n" + "=" * 60)
    print("  NETSAGE AI - DASHBOARD SUMMARY")
    print("=" * 60)

    print(f"\n  Total Cases:          {total_cases}")
    print(f"  AI/Human Agreement:   {agreement_pct:.1f}% ({accepted}/{total_cases})")
    print(f"  Corrections Made:     {len(corrections)}")

    print(f"\n  --- Issue Types ---")
    for itype, count in sorted(issue_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"    {itype:15s}  {count}")

    print(f"\n  --- Severity ---")
    for sev in ["High", "Medium", "Low"]:
        print(f"    {sev:15s}  {severity_counts.get(sev, 0)}")

    print(f"\n  --- Human Decisions ---")
    for dec in ["Accepted", "Edited", "Rejected"]:
        print(f"    {dec:15s}  {decision_counts.get(dec, 0)}")

    if corrections:
        print(f"\n  --- Correction Reasons ---")
        reason_counts = Counter(r["correction_reason"] for r in corrections if r.get("correction_reason"))
        for reason, count in reason_counts.most_common():
            print(f"    {reason:40s}  {count}")

    print("\n" + "=" * 60)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print("NetSage AI Dashboard Generator")
    print("=" * 40)

    # Load data
    cases = load_csv(CASES_CSV)
    reviews = load_csv(REVIEW_CSV)
    print(f"Loaded {len(cases)} cases and {len(reviews)} reviews.\n")

    # Create output directory
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Generate charts
    print("Generating charts...")
    chart_issue_type_distribution(cases)
    chart_severity_breakdown(cases)
    chart_human_decisions(reviews)
    chart_agreement_rate(reviews)
    chart_correction_reasons(reviews)
    chart_osi_layer_distribution(cases)

    # Print summary table
    print_summary_table(cases, reviews)

    print(f"\nAll charts saved to: {OUTPUT_DIR}")
    print("Dashboard generation complete.")


if __name__ == "__main__":
    main()
