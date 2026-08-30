import csv
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
REVIEW_DIR = BASE_DIR / "review"
FRONTEND_DATA_DIR = BASE_DIR / "frontend" / "src" / "data"

FRONTEND_DATA_DIR.mkdir(parents=True, exist_ok=True)

# 1. Read cases.csv
cases = []
with open(DATA_DIR / "cases.csv", newline="", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        cases.append(row)

# 2. Read reviewer_log.csv
reviews = []
with open(REVIEW_DIR / "reviewer_log.csv", newline="", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        reviews.append(row)

# Write casesData.ts
with open(FRONTEND_DATA_DIR / "casesData.ts", "w", encoding="utf-8") as f:
    f.write('import { CaseItem } from "../types";\n\n')
    f.write('export const INITIAL_CASES: CaseItem[] = ')
    f.write(json.dumps(cases, indent=2))
    f.write(';\n')

# Write reviewsData.ts
with open(FRONTEND_DATA_DIR / "reviewsData.ts", "w", encoding="utf-8") as f:
    f.write('import { ReviewItem } from "../types";\n\n')
    f.write('export const INITIAL_REVIEWS: ReviewItem[] = ')
    f.write(json.dumps(reviews, indent=2))
    f.write(';\n')

print(f"Exported {len(cases)} cases and {len(reviews)} reviews to {FRONTEND_DATA_DIR}")
