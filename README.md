netsage-ai/

│

├── data/

│   └── cases.csv

│       → Stores the 30+ troubleshooting cases:

│         symptoms, topology notes, show-command output,

│         expected fault, OSI layer, concept, severity.

│

├── prompts/

│   └── diagnose\_prompt.md

│       → Contains the instructions given to the AI:

│         how to analyze a case and return structured JSON.

│

├── checker/

│   └── rule\_checker.py

│       → Deterministic Python checks for simple,

│         rule-based networking errors before AI diagnosis.

│

├── ai/

│   └── diagnose.py

│       → Runs the AI diagnosis for each case using

│         the prompt, evidence, and checker results.

│

├── review/

│   └── reviewer\_log.csv

│       → Records human validation of AI diagnoses:

│         Accepted, Edited, or Rejected, plus corrections.

│

├── dashboard/

│   └── dashboard.py

│       → Analyzes the results and generates the dashboard:

│         issue counts, severity, and AI/human agreement.

│

├── README.md

│   → Explains the project, setup, architecture,

│     how to run it, and what the results mean.

│

└── .gitignore

&#x20;   → Tells Git which files/folders should not be uploaded,

&#x20;     such as secrets, virtual environments, and temporary files.

