import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MarketEvent, Stock } from "../types";
import { SAMPLE_EVENTS } from "../initialData";
import { 
  Activity, 
  HelpCircle, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Clock, 
  AlertCircle,
  FileCheck2,
  BookmarkCheck
} from "lucide-react";

interface ScannerViewProps {
  stocks: Stock[];
  events: MarketEvent[];
  onAddEvent: (event: MarketEvent) => void;
  onApplyStockImpacts?: (impacts: { ticker: string; impact: "Positive" | "Neutral" | "Negative"; ratingScoreChange: number }[]) => void;
}

const PRESET_HEADLINES = [
  {
    title: "AWS Nuclear Baseload Deal",
    text: "Amazon Web Services has signed a long-term agreement with a nuclear generator provider to secure 100% clean dispatchable power for its newest 1.5GW datacenter in Pennsylvania."
  },
  {
    title: "Blackwell Accelerator Packaging Yields",
    text: "Supply chain reports from Taiwan suggest high-bandwidth memory (HBM3e) yields for next-generation AI accelerators remain bottlenecked, capping NVDA's near-term customer shipment schedules."
  },
  {
    title: "Quantum Waveguide Coherence Breakthrough",
    text: "Physical chemistry researchers demonstrated coupled trapped-ion qubits achieving 99.98% fault-tolerant scaling milestones, solving a critical cryogenic thermal dispersion constraint."
  },
  {
    title: "Federal Grid Resilience Power Act Passed",
    text: "A bipartisan infrastructure bill is signed into law, streamlining licensing and providing $15B in fast-track loans for clean power utilities co-locating with computing infrastructures."
  }
];

export function ScannerView({ stocks, events, onAddEvent, onApplyStockImpacts }: ScannerViewProps) {
  const [inputText, setInputText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [activeAnalysis, setActiveAnalysis] = useState<any>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const handlePresetClick = (text: string) => {
    setInputText(text);
  };

  const handleAnalyze = async () => {
    if (!inputText.trim()) return;

    setAnalyzing(true);
    setErrorText(null);
    setActiveAnalysis(null);

    const tickers = stocks.map(s => s.ticker);

    try {
      const response = await fetch("/api/analyze-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventText: inputText, stocks: tickers })
      });

      if (!response.ok) {
        throw new Error("HTTP error " + response.status);
      }

      const report = await response.json();
      setActiveAnalysis(report);

      // Save as historical event log
      const newEvent: MarketEvent = {
        id: "evt_" + Date.now(),
        title: inputText.slice(0, 50) + (inputText.length > 50 ? "..." : ""),
        rawContent: inputText,
        timestamp: new Date().toISOString(),
        sentiment: report.sentiment,
        analysisSummary: report.summary,
        impactedSectors: report.impactedSectors,
        stockImpacts: report.stockImpacts
      };

      onAddEvent(newEvent);
    } catch (err: any) {
      console.error(err);
      setErrorText("Analysis encountered an error, or the server is spinning down. Re-routing fallback simulation...");
      
      // Simulate fallback directly
      setTimeout(() => {
        const simulatedReport = {
          summary: "Event digested. Strong thematic tailwinds are observed for advanced computing clusters and power-generation companies.",
          sentiment: "Bullish",
          impactedSectors: [
            { sector: "Computing Systems", impact: "Positive", rationale: "Increasing physical hardware scaling needs." }
          ],
          stockImpacts: [
            { ticker: "NVDA", impact: "Positive", analysis: "Hardware allocation requirements remain elevated." }
          ]
        };
        setActiveAnalysis(simulatedReport);
      }, 1000);
    } finally {
      setAnalyzing(false);
    }
  };

  const sentimentColor = (sentiment: string) => {
    if (sentiment === "Bullish" || sentiment === "Positive") return "bg-green-50 text-green-700 border-green-200";
    if (sentiment === "Bearish" || sentiment === "Negative") return "bg-red-50 text-red-700 border-red-200";
    return "bg-slate-50 text-slate-700 border-slate-200";
  };

  const sentimentIcon = (sentiment: string) => {
    if (sentiment === "Bullish" || sentiment === "Positive") return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (sentiment === "Bearish" || sentiment === "Negative") return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  return (
    <div className="space-y-6">
      <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 flex items-center gap-2">
          <Activity className="w-6 h-6 text-indigo-500" />
          Market Event Scanner
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          Run high-fidelity natural language analysis of macro events, regulatory changes, nuclear power upgrades, and computing breakthroughs. Powered by Gemini AI, the app traces immediate transmission lines to your coverage watchlist.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Text inputs & Presets */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-gray-900 font-mono tracking-wider uppercase">Event Input</h2>
            
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500">Paste news, policy memo, or macro event</label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                rows={6}
                placeholder="E.g., Global quantum computing lab licenses newly approved sub-nanometer fabrication modules from chipmaker..."
                className="w-full text-xs p-3 border border-gray-100 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-400 font-sans text-gray-800"
              />
            </div>

            {errorText && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-lg text-2xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{errorText}</span>
              </div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={analyzing || !inputText.trim()}
              className={`w-full py-2.5 rounded-lg text-xs font-semibold font-sans shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                analyzing || !inputText.trim()
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-md"
              }`}
            >
              <Sparkles className={`w-4 h-4 ${analyzing ? 'animate-spin' : ''}`} />
              {analyzing ? "Running Gemini Intel..." : "Analyze Event with AI"}
            </button>
          </div>

          {/* Quick-select presets */}
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-3">
            <h3 className="text-xs font-semibold text-gray-900 font-mono uppercase tracking-wider">Thematic Presets</h3>
            <div className="grid grid-cols-1 gap-2">
              {PRESET_HEADLINES.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => handlePresetClick(preset.text)}
                  className="p-3 border border-slate-100 rounded-lg text-left hover:bg-slate-50 hover:border-indigo-100 transition-all text-2xs text-gray-600 flex flex-col space-y-1 cursor-pointer"
                >
                  <strong className="text-gray-850 font-sans text-2xs block font-bold leading-tight">{preset.title}</strong>
                  <span className="text-3xs text-gray-400 line-clamp-2">{preset.text}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: AI Analysis Report Output */}
        <div className="lg:col-span-2 space-y-4">
          <AnimatePresence mode="wait">
            {analyzing ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-white p-8 rounded-xl border border-gray-100 shadow-xs flex flex-col items-center justify-center text-center space-y-4 min-h-[300px]"
              >
                <div className="relative w-12 h-12">
                  <div className="absolute inset-0 border-4 border-indigo-150 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-t-indigo-600 rounded-full animate-spin"></div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">Processing News Vector...</h3>
                  <p className="text-2xs text-gray-400 mt-1 max-w-sm">
                    Gemini is decomposing supply-chain transmission links, structural power constraints, and localized node requirements to project scoring adjustments.
                  </p>
                </div>
              </motion.div>
            ) : activeAnalysis ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-6 rounded-xl border border-gray-150 shadow-sm space-y-6"
              >
                {/* Sentiment & Overview */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-50 pb-4 gap-3">
                  <div className="space-y-1">
                    <span className="text-3xs font-mono font-bold text-indigo-500 uppercase tracking-widest">ALIGNED MACRO REPORT</span>
                    <h3 className="text-lg font-bold text-gray-900 leading-tight">AI Assessment Outcome</h3>
                  </div>
                  <div className={`px-3 py-1.5 border rounded-lg flex items-center gap-1.5 font-mono text-xs font-semibold uppercase ${sentimentColor(activeAnalysis.sentiment)}`}>
                    {sentimentIcon(activeAnalysis.sentiment)}
                    <span>{activeAnalysis.sentiment} Sentiment</span>
                  </div>
                </div>

                {/* Summary Box */}
                <div className="p-4 bg-indigo-50/50 border border-indigo-100/50 rounded-xl">
                  <h4 className="text-2xs font-semibold text-indigo-900 flex items-center gap-1">
                    <BookmarkCheck className="w-4 h-4 text-indigo-600" />
                    Structural Takeaway Summary
                  </h4>
                  <p className="text-xs text-gray-700 mt-1.5 leading-relaxed font-sans">{activeAnalysis.summary}</p>
                </div>

                {/* Sector Level Impacts */}
                {activeAnalysis.impactedSectors && activeAnalysis.impactedSectors.length > 0 && (
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-semibold text-gray-900 uppercase font-mono tracking-wider">Sector-level transmission vectors</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {activeAnalysis.impactedSectors.map((sec: any, idx: number) => (
                        <div key={idx} className="p-3 border border-gray-50 bg-slate-50/60 rounded-xl space-y-1.5">
                          <div className="flex justify-between items-center">
                            <span className="text-2xs font-bold text-gray-800">{sec.sector}</span>
                            <span className={`text-4xs px-1.5 py-0.5 rounded font-mono font-bold uppercase ${sentimentColor(sec.impact)}`}>{sec.impact}</span>
                          </div>
                          <p className="text-3xs text-gray-500 leading-relaxed">{sec.rationale}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Specific Watchlist Stocks Affected */}
                {activeAnalysis.stockImpacts && activeAnalysis.stockImpacts.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-gray-900 uppercase font-mono tracking-wider">Stock-specific coverage checks</h4>
                    <div className="divide-y divide-gray-55 space-y-3">
                      {activeAnalysis.stockImpacts.map((stk: any, idx: number) => (
                        <div key={idx} className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-2.5 gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-2xs font-bold font-mono px-1.5 py-0.5 bg-gray-100 rounded text-gray-850">{stk.ticker}</span>
                              <span className={`text-3xs font-mono font-semibold uppercase ${stk.impact === "Positive" ? "text-green-600" : stk.impact === "Negative" ? "text-red-500" : "text-gray-400"}`}>
                                {stk.impact} Impact
                              </span>
                            </div>
                            <p className="text-3xs text-gray-500 max-w-xl">{stk.analysis}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            {stk.ratingScoreChange !== undefined && (
                              <span className={`text-3xs px-2 py-0.5 rounded-md font-mono font-bold ${
                                stk.ratingScoreChange > 0 ? "bg-green-100 text-green-800" : stk.ratingScoreChange < 0 ? "bg-rose-100 text-rose-800" : "bg-gray-100 text-gray-600"
                              }`}>
                                {stk.ratingScoreChange > 0 ? `+${stk.ratingScoreChange} Score` : stk.ratingScoreChange < 0 ? `${stk.ratingScoreChange} Score` : "±0 Delta"}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="bg-white p-8 rounded-xl border border-gray-100 shadow-xs flex flex-col items-center justify-center text-center space-y-4 min-h-[300px]">
                <FileCheck2 className="w-10 h-10 text-gray-300 animate-bounce" />
                <div>
                  <h3 className="text-sm font-semibold text-gray-650">Awaiting Event Data Inputs</h3>
                  <p className="text-2xs text-gray-400 mt-1 max-w-sm mx-auto">
                    Select a thematic preset or write a fresh industry signal, then click "Analyze Event with AI" above to review how strategic bottlenecks or yields mutate portfolio risk targets.
                  </p>
                </div>
              </div>
            )}
          </AnimatePresence>

          {/* Event Logs History list */}
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-3">
            <h3 className="text-xs font-semibold text-gray-900 border-b border-gray-50 pb-2 flex justify-between items-center">
              <span>Interactive Alpha Intelligence & Event Logs ({events.length})</span>
              <span className="text-[10px] text-indigo-500 font-mono font-normal">Click any card to load into scanner</span>
            </h3>
            <div className="max-h-[260px] overflow-y-auto space-y-2.5 pr-2">
              {events.map((evt) => (
                <div 
                  key={evt.id} 
                  onClick={() => setInputText(`${evt.title}: ${evt.rawContent.replace(/\[Direct Yahoo Finance Feed\]\s*/i, "")}`)}
                  className="p-3 bg-slate-50/50 hover:bg-slate-50 hover:border-indigo-150 border border-slate-100 rounded-lg flex justify-between items-center text-3xs font-sans cursor-pointer transition-all hover:shadow-2xs active:scale-[0.99]"
                >
                  <div className="space-y-1.5 pr-4 flex-1">
                    <p className="font-semibold text-gray-800 line-clamp-2 leading-relaxed">{evt.title || evt.rawContent}</p>
                    <div className="flex flex-wrap items-center gap-2 text-gray-400 font-mono text-[9px]">
                      <span>{new Date(evt.timestamp).toLocaleDateString()}</span>
                      <span>•</span>
                      {evt.isYahooFinance ? (
                        <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 font-bold rounded-sm uppercase tracking-wider text-[8px] animate-pulse">
                          Yahoo Finance Live
                        </span>
                      ) : (
                        <span>Source: {evt.source || "Global Alert Feed"}</span>
                      )}
                      <span>•</span>
                      <span>Sectors: {evt.impactedSectors?.map(s => s.sector).join(", ") || "General"}</span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded font-mono font-semibold uppercase leading-none text-[9px] shrink-0 ${sentimentColor(evt.sentiment || "Neutral")}`}>
                    {evt.sentiment || "Neutral"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
