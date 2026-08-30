import React, { useState, useEffect } from "react";
import { CaseItem, ReviewItem, AIDiagnosisResult } from "./types";
import { INITIAL_CASES } from "./data/casesData";
import { INITIAL_REVIEWS } from "./data/reviewsData";
import { Header, NavTab } from "./components/Header";
import { OverviewDashboard } from "./components/OverviewDashboard";
import { CaseExplorer } from "./components/CaseExplorer";
import { RuleCheckerStudio } from "./components/RuleCheckerStudio";
import { AIDiagnoseStudio } from "./components/AIDiagnoseStudio";
import { HumanReviewConsole } from "./components/HumanReviewConsole";
import { CiscoSandbox } from "./components/CiscoSandbox";
import { ApiKeyModal } from "./components/ApiKeyModal";
import { 
  ShieldCheck, 
  Cpu, 
  Activity, 
  Terminal, 
  Layers, 
  UserCheck, 
  GitBranch
} from "lucide-react";

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>("overview");
  const [cases] = useState<CaseItem[]>(INITIAL_CASES);
  
  // Stored reviews in localStorage or initial
  const [reviews, setReviews] = useState<ReviewItem[]>(() => {
    const saved = localStorage.getItem("netsage_reviews_log");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved reviews", e);
      }
    }
    return INITIAL_REVIEWS;
  });

  // Selected case for AI Diagnostic Studio
  const [selectedCase, setSelectedCase] = useState<CaseItem>(INITIAL_CASES[0]);

  // Selected case for Human Review
  const [activeReviewCase, setActiveReviewCase] = useState<CaseItem | null>(null);
  const [activeDiagnosis, setActiveDiagnosis] = useState<AIDiagnosisResult | null>(null);

  // Gemini API Key & Model stored in localStorage
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem("netsage_gemini_api_key") || "";
  });
  const [geminiModel, setGeminiModel] = useState<string>(() => {
    return localStorage.getItem("netsage_gemini_model") || "gemini-2.5-flash";
  });
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);

  // Save reviews changes to localStorage
  const handleSaveReview = (updatedReview: ReviewItem) => {
    setReviews((prev) => {
      const existingIdx = prev.findIndex((r) => r.case_id === updatedReview.case_id);
      let updatedList: ReviewItem[];
      if (existingIdx >= 0) {
        updatedList = [...prev];
        updatedList[existingIdx] = updatedReview;
      } else {
        updatedList = [updatedReview, ...prev];
      }
      localStorage.setItem("netsage_reviews_log", JSON.stringify(updatedList));
      return updatedList;
    });
  };

  const handleSaveApiKey = (key: string, model: string) => {
    setApiKey(key);
    setGeminiModel(model);
    localStorage.setItem("netsage_gemini_api_key", key);
    localStorage.setItem("netsage_gemini_model", model);
  };

  // Navigating from Case Explorer to AI Diagnostic Studio
  const handleSelectCaseForDiagnose = (caseItem: CaseItem) => {
    setSelectedCase(caseItem);
    setActiveTab("ai-diagnose");
  };

  // Navigating from AI Diagnostic Studio to Human Review Console
  const handleSubmitToHumanReview = (caseItem: CaseItem, diag: AIDiagnosisResult) => {
    setActiveReviewCase(caseItem);
    setActiveDiagnosis(diag);
    setActiveTab("human-review");
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Fixed Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        apiKey={apiKey}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        casesCount={cases.length}
        reviewsCount={reviews.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "overview" && (
          <OverviewDashboard
            cases={cases}
            reviews={reviews}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === "explorer" && (
          <CaseExplorer
            cases={cases}
            reviews={reviews}
            onSelectCaseForDiagnose={handleSelectCaseForDiagnose}
          />
        )}

        {activeTab === "checker" && (
          <RuleCheckerStudio
            cases={cases}
            onSelectCaseForDiagnose={handleSelectCaseForDiagnose}
          />
        )}

        {activeTab === "ai-diagnose" && (
          <AIDiagnoseStudio
            cases={cases}
            selectedCase={selectedCase}
            onSelectCase={(c) => setSelectedCase(c)}
            apiKey={apiKey}
            onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
            onSubmitToHumanReview={handleSubmitToHumanReview}
          />
        )}

        {activeTab === "human-review" && (
          <HumanReviewConsole
            cases={cases}
            reviews={reviews}
            onSaveReview={handleSaveReview}
            activeReviewCase={activeReviewCase}
            activeDiagnosis={activeDiagnosis}
          />
        )}

        {activeTab === "sandbox" && (
          <CiscoSandbox
            apiKey={apiKey}
            onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-[#05080f] py-6 mt-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-slate-300">NetSage AI</span>
            <span>—</span>
            <span>AI-Assisted Network Troubleshooting for Cisco Lab Environments</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span className="flex items-center gap-1">
              Deterministic Rules <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              Google Gemini / Mock AI <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              Human-in-the-Loop <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
            </span>
          </div>
        </div>
      </footer>

      {/* API Key Settings Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        apiKey={apiKey}
        onSaveApiKey={handleSaveApiKey}
        currentModel={geminiModel}
      />
    </div>
  );
}

export default App;
