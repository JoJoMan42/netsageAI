import React, { useState } from "react";
import { X, Key, ShieldCheck, Check, AlertCircle, Sparkles, ExternalLink } from "lucide-react";

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveApiKey: (key: string, model: string) => void;
  currentModel: string;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  apiKey,
  onSaveApiKey,
  currentModel,
}) => {
  const [keyInput, setKeyInput] = useState<string>(apiKey);
  const [selectedModel, setSelectedModel] = useState<string>(currentModel || "gemini-2.5-flash");
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState<string>("");

  if (!isOpen) return null;

  const handleTestKey = async () => {
    if (!keyInput.trim()) {
      setTestStatus("error");
      setStatusMessage("Please enter an API key first.");
      return;
    }

    setTestStatus("testing");
    setStatusMessage("Validating API key with Google Gemini...");

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${keyInput.trim()}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Respond with the word OK." }] }],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API test failed (HTTP ${response.status})`);
      }

      setTestStatus("success");
      setStatusMessage("API key verified successfully! Connected to Google Gemini.");
    } catch (err: any) {
      setTestStatus("error");
      setStatusMessage(err.message || "Failed to verify API key.");
    }
  };

  const handleSave = () => {
    onSaveApiKey(keyInput.trim(), selectedModel);
    onClose();
  };

  const handleClear = () => {
    setKeyInput("");
    onSaveApiKey("", selectedModel);
    setTestStatus("idle");
    setStatusMessage("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="glass-panel-glow bg-[#0f172a] rounded-2xl max-w-lg w-full border border-slate-700 shadow-2xl p-6 space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Google Gemini API Configuration</h3>
              <p className="text-xs text-slate-400">Enable live LLM network troubleshooting</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-200">
              Google Gemini API Key:
            </label>
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl p-3 font-mono text-xs focus:border-cyan-500 focus:outline-none"
            />
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>Key is stored securely in your local browser session only.</span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 hover:underline flex items-center gap-1"
              >
                Get API Key <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block font-bold text-slate-200">Gemini Model:</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl p-2.5 text-xs focus:border-cyan-500 focus:outline-none"
            >
              <option value="gemini-2.5-flash">Gemini 2.5 Flash (Recommended - Ultra Fast)</option>
              <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep Reasoning)</option>
            </select>
          </div>

          {/* Test Status Banner */}
          {testStatus !== "idle" && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2 ${
                testStatus === "testing"
                  ? "bg-blue-950/50 border-blue-800 text-blue-300"
                  : testStatus === "success"
                  ? "bg-emerald-950/50 border-emerald-800 text-emerald-300"
                  : "bg-rose-950/50 border-rose-800 text-rose-300"
              }`}
            >
              {testStatus === "testing" && <Sparkles className="w-4 h-4 animate-spin text-blue-400" />}
              {testStatus === "success" && <Check className="w-4 h-4 text-emerald-400" />}
              {testStatus === "error" && <AlertCircle className="w-4 h-4 text-rose-400" />}
              <span className="leading-tight">{statusMessage}</span>
            </div>
          )}

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1 text-slate-400">
            <div className="flex items-center gap-1.5 text-slate-300 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Offline Mock Engine Fallback
            </div>
            <p className="text-[11px] leading-relaxed">
              If no API key is provided, NetSage AI operates seamlessly in <strong>Mock AI Mode</strong> using deterministic rule checks and pre-calculated expert reasoning.
            </p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-rose-400 hover:text-rose-300 font-medium"
          >
            Clear Stored Key
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestKey}
              disabled={testStatus === "testing"}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              Test Connection
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20 transition-all"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
