import React from "react";
import { 
  Activity, 
  Layers, 
  ShieldCheck, 
  Cpu, 
  UserCheck, 
  Terminal, 
  Key, 
  Sparkles,
  Server
} from "lucide-react";

export type NavTab = 
  | "overview" 
  | "explorer" 
  | "checker" 
  | "ai-diagnose" 
  | "human-review" 
  | "sandbox";

interface HeaderProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  apiKey: string;
  onOpenApiKeyModal: () => void;
  casesCount: number;
  reviewsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  apiKey,
  onOpenApiKeyModal,
  casesCount,
  reviewsCount,
}) => {
  const tabs: { id: NavTab; label: string; icon: React.ReactNode; badge?: string | number }[] = [
    { id: "overview", label: "Analytics & KPIs", icon: <Activity className="w-4 h-4" /> },
    { id: "explorer", label: "Case Knowledge Base", icon: <Layers className="w-4 h-4" />, badge: casesCount },
    { id: "checker", label: "Rule Checker", icon: <ShieldCheck className="w-4 h-4" /> },
    { id: "ai-diagnose", label: "AI Diagnostic Studio", icon: <Cpu className="w-4 h-4" /> },
    { id: "human-review", label: "Human Review Console", icon: <UserCheck className="w-4 h-4" />, badge: reviewsCount },
    { id: "sandbox", label: "Cisco Sandbox", icon: <Terminal className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-[#0b0f19]/90 backdrop-blur-xl shadow-lg shadow-black/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 shadow-md shadow-cyan-500/20 ring-1 ring-cyan-400/30">
              <Server className="w-5 h-5 text-white animate-pulse" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight text-white font-mono">
                  NetSage<span className="text-cyan-400 font-sans">AI</span>
                </span>
                <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-md bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">
                  Cisco Lab Engine
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Responsible AI & Deterministic Network Troubleshooting
              </p>
            </div>
          </div>

          {/* Right actions: AI Engine mode badge & API Key */}
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenApiKeyModal}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border ${
                apiKey
                  ? "bg-emerald-950/50 border-emerald-600/60 text-emerald-300 hover:bg-emerald-900/60"
                  : "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>{apiKey ? "Gemini 2.5 Flash Active" : "Mock AI (Click for API Key)"}</span>
              {apiKey && <Sparkles className="w-3 h-3 text-emerald-400" />}
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto no-scrollbar py-2 border-t border-slate-800/50">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-150 whitespace-nowrap ${
                  isActive
                    ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 text-[10px] font-mono rounded-full font-bold ${
                      isActive
                        ? "bg-cyan-400 text-slate-950"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
