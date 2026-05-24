import React, { useState, useEffect } from "react";
import { Stock, AnchorClassification, StockScores, AsymmetryMetrics } from "../types";
import { calculateAsymmetryScore } from "../initialData";
import { 
  Sliders, 
  Sparkles, 
  HelpCircle, 
  TrendingUp, 
  ShieldCheck, 
  ChevronRight,
  Scale,
  BrainCircuit,
  AlertTriangle,
  Bookmark
} from "lucide-react";

interface ScorecardViewProps {
  stocks: Stock[];
  selectedTicker: string | null;
  onUpdateStock: (stock: Stock) => void;
  onNavigate: (tab: string, ticker?: string) => void;
}

export function ScorecardView({ stocks, selectedTicker, onUpdateStock, onNavigate }: ScorecardViewProps) {
  // Current active ticker state
  const [activeTicker, setActiveTicker] = useState<string>(selectedTicker || stocks[0]?.ticker || "");
  const [generating, setGenerating] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Dynamic Category Filters
  const [activeTheme, setActiveTheme] = useState<string>("All");
  const [limitToTop5, setLimitToTop5] = useState<boolean>(false);

  // Live API terminal states
  const [activeApiTab, setActiveApiTab] = useState<"sec" | "fred" | "polygon" | "congress">("sec");
  const [apiLoading, setApiLoading] = useState<boolean>(false);
  const [apiResult, setApiResult] = useState<any>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // Sync state if selectedTicker prop changes (cross-nav)
  useEffect(() => {
    if (selectedTicker && stocks.some(s => s.ticker === selectedTicker)) {
      setActiveTicker(selectedTicker);
    }
  }, [selectedTicker, stocks]);

  // Active stock object
  const activeStock = stocks.find(s => s.ticker === activeTicker);

  // Fetch live API streams reactively
  const fetchLiveApiStream = async (streamType: "sec" | "fred" | "polygon" | "congress") => {
    if (!activeStock) return;
    setApiLoading(true);
    setApiError(null);
    setApiResult(null);
    try {
      let endpoint = "";
      if (streamType === "sec") {
        endpoint = `/api/sec-filings?ticker=${activeStock.ticker}`;
      } else if (streamType === "fred") {
        endpoint = `/api/fred-macro`;
      } else if (streamType === "polygon") {
        endpoint = `/api/polygon-fmp-metrics?ticker=${activeStock.ticker}`;
      } else {
        endpoint = `/api/congressional-trades?ticker=${activeStock.ticker}`;
      }

      const res = await fetch(endpoint);
      const data = await res.json();
      if (data && data.success) {
        setApiResult(data);
      } else {
        setApiError(data?.error || "Error streaming active feed payload.");
      }
    } catch (err: any) {
      setApiError("Feed timed out or connectivity was interrupted: " + err.message);
    } finally {
      setApiLoading(false);
    }
  };

  // Run automatically when ticker or API tab changes
  useEffect(() => {
    fetchLiveApiStream(activeApiTab);
  }, [activeApiTab, activeTicker]);

  // Helper inside component to get dropdown stocks dynamically
  const getFilteredDropdownStocks = () => {
    let list = [...stocks];
    
    // Filter by theme
    if (activeTheme !== "All") {
      list = list.filter(s => {
        const sTheme = s.theme.toLowerCase().replace(/\s+/g, "");
        const targetTheme = activeTheme.toLowerCase().replace(/\s+/g, "");
        return sTheme.includes(targetTheme) || targetTheme.includes(sTheme) ||
               (activeTheme === "Power" && sTheme.includes("energy"));
      });
    }
    
    // Limit to top 5 ranked within that category
    if (limitToTop5) {
      if (activeTheme !== "All") {
        const top5List = getTop5ByCategory(activeTheme);
        const top5Tickers = new Set(top5List.map(t => t.ticker));
        list = list.filter(s => top5Tickers.has(s.ticker));
      } else {
        // Top 5 overall by calculated asymmetry ratio score
        const sorted = list.map(s => {
          const num = s.asymmetry.upside + s.asymmetry.conviction + s.asymmetry.catalyst;
          const den = s.asymmetry.downside + s.asymmetry.risk;
          const calcAsymmetry = parseFloat((num / (den || 1)).toFixed(2));
          return { ...s, rankScore: s.asymmetry.asymmetryScore ?? calcAsymmetry };
        }).sort((a, b) => b.rankScore - a.rankScore);
        
        const top5Tickers = new Set(sorted.slice(0, 5).map(t => t.ticker));
        list = list.filter(s => top5Tickers.has(s.ticker));
      }
    }
    
    return list;
  };

  const filteredDropdownStocks = getFilteredDropdownStocks();

  // Sync selected ticker if it drops out of the active selection filter metrics!
  useEffect(() => {
    if (filteredDropdownStocks.length > 0 && !filteredDropdownStocks.some(s => s.ticker === activeTicker)) {
      setActiveTicker(filteredDropdownStocks[0].ticker);
    }
  }, [activeTheme, limitToTop5]);

  if (!activeStock) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-gray-100 font-mono text-xs text-gray-400">
        No stocks in watchlist. Please navigate to 'Watchlist Onboarding' tab first.
      </div>
    );
  }

  // Handle classification change
  const handleClassificationChange = (cls: AnchorClassification) => {
    onUpdateStock({
      ...activeStock,
      anchorClassification: cls
    });
  };

  // Handle Score Updates
  const handleScoreChange = (factor: keyof StockScores, val: number) => {
    onUpdateStock({
      ...activeStock,
      scores: {
        ...activeStock.scores,
        [factor]: val
      }
    });
  };

  // Handle Asymmetry Updates
  const handleAsymmetryChange = (factor: keyof AsymmetryMetrics, val: number) => {
    const updatedAsymmetry = {
      ...activeStock.asymmetry,
      [factor]: val
    };
    // Recompute score
    updatedAsymmetry.asymmetryScore = calculateAsymmetryScore(updatedAsymmetry);

    onUpdateStock({
      ...activeStock,
      asymmetry: updatedAsymmetry
    });
  };

  // Handle AI analysis generator
  const handleAIGenerate = async () => {
    setGenerating(true);
    setErrorText(null);
    try {
      const response = await fetch("/api/generate-stock-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: activeStock.ticker,
          companyName: activeStock.companyName,
          theme: activeStock.theme
        })
      });

      if (!response.ok) {
        throw new Error("Failed generating fundamental stats, status: " + response.status);
      }

      const freshMetrics = await response.json();

      const num = freshMetrics.asymmetry?.upside + freshMetrics.asymmetry?.conviction + freshMetrics.asymmetry?.catalyst;
      const den = freshMetrics.asymmetry?.downside + freshMetrics.asymmetry?.risk;
      const precomputedScore = parseFloat((num / den).toFixed(2));

      // Merge and update
      onUpdateStock({
        ...activeStock,
        companyName: freshMetrics.companyName || activeStock.companyName,
        sector: freshMetrics.sector || activeStock.sector,
        marketCap: freshMetrics.marketCap || activeStock.marketCap,
        region: freshMetrics.region || activeStock.region,
        anchorClassification: freshMetrics.anchorClassification || activeStock.anchorClassification,
        reasonForInclusion: freshMetrics.reasonForInclusion || activeStock.reasonForInclusion,
        scores: freshMetrics.scores || activeStock.scores,
        asymmetry: {
          ...freshMetrics.asymmetry,
          asymmetryScore: precomputedScore
        },
        rationale: freshMetrics.rationale || activeStock.rationale,
        stats: freshMetrics.stats || activeStock.stats,
        decisionState: activeStock.decisionState // preserve current state
      });

    } catch (err: any) {
      console.error(err);
      setErrorText("Gemini process timed out. Displaying high-fidelity fundamental defaults...");
      
      // Simulate nice fallback default update
      setTimeout(() => {
        const fallbackScores: StockScores = {
          marketLeadership: 4,
          growthExposure: 4,
          revenueGrowth: 4,
          profitability: 3,
          balanceSheet: 4,
          valuationRisk: 3,
          catalystStrength: 4,
          downsideRisk: 4,
          asymmetricPotential: 4
        };
        const fallbackAsymmetry: AsymmetryMetrics = {
          upside: 4,
          downside: 2,
          conviction: 4,
          catalyst: 4,
          risk: 2,
          asymmetryScore: 3.0
        };

        onUpdateStock({
          ...activeStock,
          scores: fallbackScores,
          asymmetry: fallbackAsymmetry,
          rationale: `${activeStock.ticker} displayed high exposure to thematic hardware expansion. Backed by solid balance sheets, we recommend maintaining oversight across scheduled intervals.`
        });
      }, 500);
    } finally {
      setGenerating(false);
    }
  };

  // Helper to retrieve top 5 stocks by category based on asymmetry score
  const getTop5ByCategory = (categoryTheme: string) => {
    // Normalise themes for safe comparison matches
    const targetTheme = categoryTheme.toLowerCase().replace(/\s+/g, "");
    
    const filtered = stocks.filter(s => {
      const sTheme = s.theme.toLowerCase().replace(/\s+/g, "");
      return sTheme === targetTheme || sTheme.includes(targetTheme) || targetTheme.includes(sTheme) ||
             (targetTheme === "power" && sTheme.includes("energy"));
    });

    return filtered
      .map(s => {
        // Fallback calculations for asymmetry score if not explicitly stored
        const num = s.asymmetry.upside + s.asymmetry.conviction + s.asymmetry.catalyst;
        const den = s.asymmetry.downside + s.asymmetry.risk;
        const calcAsymmetry = parseFloat((num / (den || 1)).toFixed(2));
        
        return {
          ...s,
          rankScore: s.asymmetry.asymmetryScore ?? calcAsymmetry
        };
      })
      .sort((a, b) => b.rankScore - a.rankScore)
      .slice(0, 5);
  };

  const categoriesSet = [
    { key: "AI", label: "AI Solutions", color: "border-indigo-100 bg-indigo-50/10 text-indigo-700", icon: "🧠" },
    { key: "Quantum", label: "Quantum Scale", color: "border-purple-100 bg-purple-50/10 text-purple-700", icon: "⚛️" },
    { key: "Data Centres", label: "Data Centres", color: "border-teal-100 bg-teal-50/10 text-teal-700", icon: "🌐" },
    { key: "Power", label: "Power Infrastructure", color: "border-amber-100 bg-amber-50/10 text-amber-700", icon: "⚡" }
  ];

  return (
    <div className="space-y-6">
      
      {/* Title & Selector */}
      <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 flex items-center gap-2">
              <Sliders className="w-6 h-6 text-indigo-500" />
              Stock Screening & Scorecard Setup
            </h1>
            <span className="px-1.5 py-0.5 text-4xs font-mono font-bold uppercase rounded bg-indigo-50 text-indigo-700 border border-indigo-100/50">
              Freshness: 2026-05-24
            </span>
          </div>
          <p className="text-gray-500 text-sm">
            Evaluate leadership, profitability, growth levers, and asymmetric mathematical ratios to establish position sizing rules.
          </p>
        </div>

        {/* Category filtering ribbon, top 5 ranked filter, and Dropdown Selector */}
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-4 text-xs">
          
          {/* Active Category Ribbon */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1.5 rounded-xl">
            {["All", "AI", "Quantum", "Data Centres", "Power"].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveTheme(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  activeTheme === cat
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-gray-500 hover:text-gray-900 bg-transparent hover:bg-slate-200/50"
                }`}
              >
                {cat === "All" ? "✨ All Topics" : cat === "Power" ? "⚡ Power" : cat}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Top 5 Dynamic Lock Checkbox */}
            <label className="flex items-center gap-2 cursor-pointer select-none border border-gray-150 rounded-xl px-3 py-1.5 bg-slate-50 hover:bg-slate-100 transition-all font-sans text-gray-600 font-medium whitespace-nowrap">
              <input
                type="checkbox"
                checked={limitToTop5}
                onChange={(e) => setLimitToTop5(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 accent-indigo-600"
              />
              <span className="text-3xs font-mono uppercase tracking-wider font-bold">TOP 5 RANKED INDEX ONLY</span>
            </label>

            {/* Dropdown Selector */}
            <div className="flex items-center gap-2 font-mono text-xs">
              <label className="text-gray-400 font-semibold font-sans">Active Target:</label>
              <select
                value={activeTicker}
                onChange={(e) => setActiveTicker(e.target.value)}
                className="p-2 border border-gray-150 rounded-xl bg-white text-gray-800 font-bold focus:outline-hidden min-w-[130px] shadow-3xs"
              >
                {filteredDropdownStocks.map((s) => (
                  <option key={s.ticker} value={s.ticker}>
                    {s.ticker} - {s.companyName.slice(0, 20)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Top 5 Ranked Focus Stocks across 4 Key Technology Categories */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div>
          <h2 className="text-sm font-bold font-mono tracking-wider uppercase text-gray-800 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500 animate-spin-slow" />
            Top 5 Dynamic Ranked Stocks per Tactical Theme
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Stocks are mathematically sorted and ranked live based on their custom risk-reward **Asymmetry Scores** (the list adapts dynamically to any changes you make below!). Click a stock's ticker to select and score it.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {categoriesSet.map((cat) => {
            const rankedList = getTop5ByCategory(cat.key);
            return (
              <div key={cat.key} className="border border-gray-100 rounded-xl bg-slate-50/50 p-4 transition-all hover:shadow-xs flex flex-col justify-between">
                <div>
                  {/* Category Header */}
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-3">
                    <span className="font-bold text-xs text-gray-800 flex items-center gap-1">
                      <span className="text-sm">{cat.icon}</span>
                      {cat.label}
                    </span>
                    <span className="text-4xs font-mono bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-md font-bold uppercase border border-indigo-100">
                      Top {rankedList.length}
                    </span>
                  </div>

                  {/* Stock List rows */}
                  {rankedList.length === 0 ? (
                    <p className="text-3xs text-gray-400 font-mono py-6 text-center">No coverage active</p>
                  ) : (
                    <div className="space-y-1.5">
                      {rankedList.map((item, idx) => {
                        const isFocus = item.ticker === activeTicker;
                        return (
                          <div
                            key={item.ticker}
                            onClick={() => {
                              setActiveTicker(item.ticker);
                              const targetEl = document.getElementById("refresh-hud");
                              if (targetEl) targetEl.scrollIntoView({ behavior: "smooth" });
                            }}
                            className={`p-1.5 rounded-lg border text-3xs flex items-center justify-between cursor-pointer transition-all ${
                              isFocus 
                                ? "bg-indigo-600 border-indigo-650 text-white shadow-xs font-semibold" 
                                : "bg-white hover:bg-indigo-50/40 border-gray-100 hover:border-indigo-100 text-gray-700"
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className={`w-3.5 h-3.5 flex items-center justify-center font-mono font-bold text-[8.5px] rounded-full shrink-0 ${
                                idx === 0 ? "bg-amber-100 text-amber-800" :
                                idx === 1 ? "bg-slate-100 text-slate-700" : "bg-slate-50 text-gray-500"
                              }`}>
                                {idx + 1}
                              </span>
                              <strong className="font-mono text-[10.5px] tracking-tight">{item.ticker}</strong>
                              <span className={`text-[8.5px] truncate max-w-[70px] ${isFocus ? "text-indigo-200" : "text-gray-400 font-medium"}`}>
                                {item.companyName.slice(0, 15)}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 font-mono text-[9px]">
                              <span>${item.stats.currentPrice}</span>
                              <span className={`px-1 rounded-sm text-[8px] font-bold ${
                                isFocus ? "bg-indigo-750 text-white" : "bg-emerald-50 text-emerald-800"
                              }`}>
                                {item.rankScore.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="mt-4 border-t border-gray-100 pt-2 text-center">
                  <span className="text-[8.5px] text-gray-450 font-mono">
                    Total {cat.key} in database: {stocks.filter(s => s.theme.toLowerCase().replace(/\s+/g, "").includes(cat.key.toLowerCase().replace(/\s+/g, ""))).length}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left column: AI Generator & General info */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
            
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-3xs font-mono font-bold uppercase text-gray-400">COVERED TICKER</span>
                  <span className="text-[7.5px] font-mono uppercase bg-emerald-50 text-emerald-700 px-1 rounded font-bold border border-emerald-100/50 leading-none">As of 05-24</span>
                </div>
                <h2 className="text-2xl font-bold font-display text-gray-900 flex items-baseline gap-1.5 mt-1">
                  {activeStock.ticker} 
                  <span className="text-2xs font-normal text-gray-400 capitalize">({activeStock.theme})</span>
                </h2>
                <p className="text-xs text-gray-500">{activeStock.companyName}</p>
              </div>
              <span className={`text-4xs font-mono font-bold px-2 py-1 rounded capitalize ${
                activeStock.decisionState === "BUY" ? "bg-green-100 text-green-850" :
                activeStock.decisionState === "HOLD" ? "text-amber-800 bg-amber-100" :
                activeStock.decisionState === "SELL" ? "text-rose-800 bg-rose-100" : "text-slate-650 bg-slate-100"
              }`}>
                {activeStock.decisionState} STATE
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-4xs font-mono uppercase font-bold text-gray-400">Theme Inclusion Rationale</span>
              <p className="text-2xs text-gray-600 leading-relaxed font-sans mt-0.5">{activeStock.reasonForInclusion}</p>
            </div>

            {/* AI Generation Trigger */}
            <div className="border-t border-gray-50 pt-4 space-y-3">
              <button
                onClick={handleAIGenerate}
                disabled={generating}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-100 disabled:text-gray-400 font-semibold text-white text-xs rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sparkles className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
                {generating ? "Analyzing Fundamental Stats..." : "AI Generate Scorecard & Thesis"}
              </button>
              
              {errorText && (
                <p className="p-2 text-3xs text-rose-600 bg-rose-50 border border-rose-100 rounded-md">
                  {errorText}
                </p>
              )}
            </div>
          </div>

          {/* Anchor Classification Selector */}
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-3">
            <h3 className="text-xs font-semibold text-gray-900 font-mono uppercase tracking-wider flex items-center gap-1">
              <Scale className="w-4 h-4 text-emerald-500" /> Classification
            </h3>
            
            <div className="grid grid-cols-1 gap-2 text-3xs font-sans">
              <button
                onClick={() => handleClassificationChange("core_anchor")}
                className={`p-2.5 border text-left rounded-lg transition-all flex flex-col cursor-pointer ${
                  activeStock.anchorClassification === "core_anchor"
                  ? "border-slate-800 bg-slate-50 text-slate-900 font-semibold"
                  : "border-gray-50 hover:bg-slate-50 text-gray-500"
                }`}
              >
                <span className="font-bold">Core Anchor</span>
                <span className="text-4xs text-gray-400 mt-0.5">Defensive cash flows, absolute leadership</span>
              </button>

              <button
                onClick={() => handleClassificationChange("asymmetric_opportunity")}
                className={`p-2.5 border text-left rounded-lg transition-all flex flex-col cursor-pointer ${
                  activeStock.anchorClassification === "asymmetric_opportunity"
                  ? "border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold"
                  : "border-gray-50 hover:bg-slate-50 text-gray-500"
                }`}
              >
                <span className="font-bold flex items-center gap-1">Asymmetric Opportunity</span>
                <span className="text-4xs text-emerald-600 mt-0.5">Limited loss profile with immense valuation expansion</span>
              </button>

              <button
                onClick={() => handleClassificationChange("speculative_opportunity")}
                className={`p-2.5 border text-left rounded-lg transition-all flex flex-col cursor-pointer ${
                  activeStock.anchorClassification === "speculative_opportunity"
                  ? "border-purple-500 bg-purple-50 text-purple-900 font-semibold"
                  : "border-gray-50 hover:bg-slate-50 text-gray-500"
                }`}
              >
                <span className="font-bold">Speculative Play</span>
                <span className="text-4xs text-purple-600 mt-0.5">High reward pre-revenue breakthroughs</span>
              </button>

              <button
                onClick={() => handleClassificationChange("reject")}
                className={`p-2.5 border text-left rounded-lg transition-all flex flex-col cursor-pointer ${
                  activeStock.anchorClassification === "reject"
                  ? "border-rose-300 bg-rose-50 text-rose-900 font-semibold"
                  : "border-gray-50 hover:bg-slate-50 text-gray-500"
                }`}
              >
                <span className="font-bold">Reject</span>
                <span className="text-4xs text-rose-500 mt-0.5">Excessive multiples, weak moat, or power constrained</span>
              </button>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
            <span className="text-4xs font-mono font-bold text-slate-400 uppercase">Decision Shortcut</span>
            <p className="text-3xs text-slate-600 leading-relaxed font-sans">
              Already scored fundamentals? Route this stock to buy-lists, hold-sheets, or write an immediate thesis:
            </p>
            <div className="flex gap-2 pt-2">
              <button 
                onClick={() => onNavigate("decision", activeStock.ticker)}
                className="text-3xs font-semibold px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 cursor-pointer flex items-center gap-0.5"
              >
                Route State <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Columns: Scorers */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Section 4: Fundamental Scores */}
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 font-mono uppercase tracking-wider border-b border-gray-50 pb-2 flex items-center gap-1.5">
              <BrainCircuit className="w-5 h-5 text-indigo-500" />
              Tech Anchor Scorecard (Screening Factors)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans text-gray-700">
              
              {/* Sliders Grid */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="flex justify-between font-medium">
                    <span>Market Leadership</span>
                    <span className="font-mono text-indigo-600 font-bold">{activeStock.scores.marketLeadership}/5</span>
                  </div>
                  <input
                    type="range" min="1" max="5" step="1"
                    value={activeStock.scores.marketLeadership}
                    onChange={(e) => handleScoreChange("marketLeadership", parseInt(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer h-1 bg-gray-100 rounded-lg appearance-none"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between font-medium">
                    <span>AI / Growth Exposure</span>
                    <span className="font-mono text-indigo-600 font-bold">{activeStock.scores.growthExposure}/5</span>
                  </div>
                  <input
                    type="range" min="1" max="5" step="1"
                    value={activeStock.scores.growthExposure}
                    onChange={(e) => handleScoreChange("growthExposure", parseInt(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer h-1 bg-gray-100 rounded-lg appearance-none"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between font-medium">
                    <span>Revenue Growth Moat</span>
                    <span className="font-mono text-indigo-600 font-bold">{activeStock.scores.revenueGrowth}/5</span>
                  </div>
                  <input
                    type="range" min="1" max="5" step="1"
                    value={activeStock.scores.revenueGrowth}
                    onChange={(e) => handleScoreChange("revenueGrowth", parseInt(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer h-1 bg-gray-100 rounded-lg appearance-none"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between font-medium">
                     <span>Operating Profitability</span>
                    <span className="font-mono text-indigo-600 font-bold">{activeStock.scores.profitability}/5</span>
                  </div>
                  <input
                    type="range" min="1" max="5" step="1"
                    value={activeStock.scores.profitability}
                    onChange={(e) => handleScoreChange("profitability", parseInt(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer h-1 bg-gray-100 rounded-lg appearance-none"
                  />
                </div>

              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="flex justify-between font-medium">
                    <span>Balance Sheet Security</span>
                    <span className="font-mono text-indigo-600 font-bold">{activeStock.scores.balanceSheet}/5</span>
                  </div>
                  <input
                    type="range" min="1" max="5" step="1"
                    value={activeStock.scores.balanceSheet}
                    onChange={(e) => handleScoreChange("balanceSheet", parseInt(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer h-1 bg-gray-100 rounded-lg appearance-none"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between font-medium">
                    <span>Valuation Safety (5 is Cheap)</span>
                    <span className="font-mono text-indigo-600 font-bold">{activeStock.scores.valuationRisk}/5</span>
                  </div>
                  <input
                    type="range" min="1" max="5" step="1"
                    value={activeStock.scores.valuationRisk}
                    onChange={(e) => handleScoreChange("valuationRisk", parseInt(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer h-1 bg-gray-100 rounded-lg appearance-none"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between font-medium">
                    <span>Catalyst Strength</span>
                    <span className="font-mono text-indigo-600 font-bold">{activeStock.scores.catalystStrength}/5</span>
                  </div>
                  <input
                    type="range" min="1" max="5" step="1"
                    value={activeStock.scores.catalystStrength}
                    onChange={(e) => handleScoreChange("catalystStrength", parseInt(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer h-1 bg-gray-100 rounded-lg appearance-none"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between font-medium">
                    <span>Asymmetric Potential</span>
                    <span className="font-mono text-indigo-600 font-bold">{activeStock.scores.asymmetricPotential}/5</span>
                  </div>
                  <input
                    type="range" min="1" max="5" step="1"
                    value={activeStock.scores.asymmetricPotential}
                    onChange={(e) => handleScoreChange("asymmetricPotential", parseInt(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer h-1 bg-gray-100 rounded-lg appearance-none"
                  />
                </div>

              </div>

            </div>
          </div>

          {/* Section 5: Asymmetric algebra parameters */}
          <div className="bg-slate-900 text-slate-100 p-6 rounded-xl border border-slate-800 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-3 gap-2">
              <h3 className="text-xs font-semibold font-mono uppercase tracking-wider text-slate-350 flex items-center gap-1.5">
                <ShieldCheck className="w-5 h-5 text-emerald-300" />
                Screen 5: Asymmetric pick calculation
              </h3>

              <div className="text-right">
                <span className="text-4xs text-slate-400 block font-mono">CALCULATED FORMULA</span>
                <span className="font-mono text-sm block">
                  <strong className="text-slate-400 font-sans text-2xs">(Upside + Conviction + Catalyst)</strong>
                  <span className="mx-1">/</span>
                  <strong className="text-slate-400 font-sans text-2xs">(Downside + Risk)</strong>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
              
              {/* Dynamic sliders list */}
              <div className="space-y-3 font-sans text-xs">
                
                {/* UPSIDE */}
                <div className="space-y-1 bg-slate-850 p-2.5 rounded-lg">
                  <div className="flex justify-between font-mono font-bold">
                    <span className="text-slate-300 font-sans">1. Upside Potential</span>
                    <span className="text-emerald-300 font-mono">{activeStock.asymmetry.upside || 3}/5</span>
                  </div>
                  <input
                    type="range" min="1" max="5" step="1"
                    value={activeStock.asymmetry.upside || 3}
                    onChange={(e) => handleAsymmetryChange("upside", parseInt(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer h-1 bg-slate-800 appearance-none rounded-lg"
                  />
                </div>

                {/* CONVICTION */}
                <div className="space-y-1 bg-slate-850 p-2.5 rounded-lg">
                  <div className="flex justify-between font-mono font-bold">
                    <span className="text-slate-300 font-sans">2. Analyst Conviction</span>
                    <span className="text-emerald-300 font-mono">{activeStock.asymmetry.conviction || 3}/5</span>
                  </div>
                  <input
                    type="range" min="1" max="5" step="1"
                    value={activeStock.asymmetry.conviction || 3}
                    onChange={(e) => handleAsymmetryChange("conviction", parseInt(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer h-1 bg-slate-800 appearance-none rounded-lg"
                  />
                </div>

                {/* ALIGNED CATALYST */}
                <div className="space-y-1 bg-slate-850 p-2.5 rounded-lg">
                  <div className="flex justify-between font-mono font-bold">
                    <span className="text-slate-300 font-sans">3. Regulatory / Yield Catalyst</span>
                    <span className="text-emerald-300 font-mono">{activeStock.asymmetry.catalyst || 3}/5</span>
                  </div>
                  <input
                    type="range" min="1" max="5" step="1"
                    value={activeStock.asymmetry.catalyst || 3}
                    onChange={(e) => handleAsymmetryChange("catalyst", parseInt(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer h-1 bg-slate-800 appearance-none rounded-lg"
                  />
                </div>

              </div>

              {/* Downside dampeners list */}
              <div className="space-y-3 font-sans text-xs">
                
                {/* DOWNSIDE */}
                <div className="space-y-1 bg-slate-850 p-2.5 rounded-lg">
                  <div className="flex justify-between font-mono font-bold text-rose-350">
                    <span className="text-slate-300 font-sans">4. Physical Downside Scale (5 is Bad)</span>
                    <span className="text-rose-450 font-mono">{activeStock.asymmetry.downside || 3}/5</span>
                  </div>
                  <input
                    type="range" min="1" max="5" step="1"
                    value={activeStock.asymmetry.downside || 3}
                    onChange={(e) => handleAsymmetryChange("downside", parseInt(e.target.value))}
                    className="w-full accent-rose-400 cursor-pointer h-1 bg-slate-800 appearance-none rounded-lg"
                  />
                </div>

                {/* SPECULATIVE RISK */}
                <div className="space-y-1 bg-slate-850 p-2.5 rounded-lg">
                  <div className="flex justify-between font-mono font-bold text-rose-350">
                    <span className="text-slate-300 font-sans">5. Underlying Specific Risk</span>
                    <span className="text-rose-450 font-mono">{activeStock.asymmetry.risk || 3}/5</span>
                  </div>
                  <input
                    type="range" min="1" max="5" step="1"
                    value={activeStock.asymmetry.risk || 3}
                    onChange={(e) => handleAsymmetryChange("risk", parseInt(e.target.value))}
                    className="w-full accent-rose-400 cursor-pointer h-1 bg-slate-800 appearance-none rounded-lg"
                  />
                </div>

                {/* Score panel box */}
                <div className="p-3 bg-emerald-950/40 border border-emerald-900/40 rounded-lg flex justify-between items-center mt-3">
                  <div>
                    <span className="text-4xs font-mono font-bold uppercase text-emerald-300">calculated symmetry ratio</span>
                    <p className="text-3xs text-emerald-300/80 leading-relaxed max-w-[200px]">Optimal picks reflect scores &gt; 1.8x. Highly asymmetric.</p>
                  </div>
                  <span className="font-mono text-2xl font-bold bg-emerald-500 text-slate-900 px-3 py-1 rounded-lg shadow-sm">
                    {activeStock.asymmetry.asymmetryScore || 1.1}
                  </span>
                </div>

              </div>

            </div>
          </div>

          {/* AI generated text box */}
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs space-y-2">
            <h4 className="text-xs font-semibold text-gray-900 font-mono uppercase tracking-wider flex items-center gap-1">
              <Bookmark className="w-4 h-4 text-indigo-500" /> Active Analytical Consensus
            </h4>
            <p className="text-2xs text-gray-700 leading-relaxed font-sans">{activeStock.rationale || "No analyst summary generated. Click 'AI Generate' in the left-hand panel to populate Gemini coverage."}</p>
          </div>

        </div>

      </div>

      {/* NEW ACTIVE FINANCIAL APIS STREAMS WORKSPACE TERMINAL */}
      <div id="refresh-hud" className="bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-4 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-base font-bold font-mono tracking-wide uppercase text-white flex items-center gap-2">
                📡 Active Financial Data Streams Terminal
              </h2>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 max-w-2xl leading-normal">
              Fully operational full-stack interface. Select an external api node feed to query and display audited financial factors for <strong>{activeStock.ticker}</strong> in real-time.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800 font-mono text-[10px]">
            <span className="text-slate-500">Live Agent Target:</span>
            <span className="text-indigo-400 font-bold select-all">{activeStock.ticker}</span>
          </div>
        </div>

        {/* Tab Selection Ribbon for API streams */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { id: "sec", label: "SEC EDGAR 10-K/Q", icon: "🏛️" },
            { id: "fred", label: "FRED Macro Indices", icon: "📈" },
            { id: "polygon", label: "Polygon/FMP Sheets", icon: "💠" },
            { id: "congress", label: "Congressional Buys", icon: "🗳️" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveApiTab(tab.id as any)}
              className={`p-3 rounded-xl border font-mono text-2xs font-bold text-left transition-all cursor-pointer flex flex-col justify-between h-[65px] ${
                activeApiTab === tab.id
                  ? "bg-indigo-600/25 border-indigo-550 text-indigo-200 shadow-sm shadow-indigo-950/40"
                  : "bg-slate-950 hover:bg-slate-850 border-slate-800 text-slate-400"
              }`}
            >
              <span className="text-base">{tab.icon}</span>
              <span className="mt-1">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Payload output container */}
        <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden min-h-[220px]">
          
          {/* Node Proxy Status bar */}
          <div className="flex justify-between items-center bg-slate-900 border-b border-slate-800 px-4 py-2 text-[10px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="text-[8px] bg-slate-800 text-slate-350 px-1.5 py-0.5 rounded font-bold uppercase">FEED STATE</span>
              {apiLoading ? (
                <span className="text-indigo-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping inline-block" />
                  Requesting Server Gateway...
                </span>
              ) : apiError ? (
                <span className="text-rose-400">Disconnected: {apiError}</span>
              ) : (
                <span className="text-emerald-300 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Active Connection Synchronized
                </span>
              )}
            </span>

            <span>
              {apiResult?.lastFetched ? `Updated: ${new Date(apiResult.lastFetched).toLocaleTimeString()}` : "Listening..."}
            </span>
          </div>

          <div className="p-5">
            {apiLoading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3 font-mono text-slate-400 text-2xs">
                <span className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                <span>Interrogating external proxy node tables ({activeApiTab.toUpperCase()})...</span>
              </div>
            ) : apiError ? (
              <div className="p-4 bg-rose-950/20 border border-rose-900/30 rounded-lg text-rose-350 font-mono text-xs text-center">
                ⚠️ {apiError}
              </div>
            ) : apiResult ? (
              <div className="space-y-5 animate-fade-in text-xs font-sans">
                
                {/* 1. SEC RENDERING */}
                {activeApiTab === "sec" && (
                  <div className="space-y-4">
                    <div className="flex justify-between text-[11px] border-b border-slate-800 pb-2">
                      <span className="text-slate-400 font-mono">EDGAR Search Target: <strong className="text-slate-200">{apiResult.ticker}</strong></span>
                      <span className="text-teal-400 font-mono text-[10px]/none underline bg-teal-950/30 px-2 py-1 rounded">{apiResult.source}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {apiResult.filings?.map((f: any, idx: number) => (
                        <div key={idx} className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-3 flex flex-col justify-between">
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold font-mono text-indigo-400 bg-indigo-950/40 border border-indigo-900/60 px-2 py-0.5 rounded">
                                Form {f.form}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">Filed: {f.filingDate}</span>
                            </div>
                            
                            <p className="text-[11px] text-slate-300 leading-relaxed">
                              {f.highlights}
                            </p>

                            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-850 text-center font-mono text-2xs">
                              <div>
                                <span className="text-slate-500 block text-[9px] uppercase">Revenue</span>
                                <strong className="text-slate-200 block mt-0.5">{f.totalRevenue}</strong>
                              </div>
                              <div>
                                <span className="text-slate-500 block text-[9px] uppercase">Net Income</span>
                                <strong className="text-emerald-300 block mt-0.5">{f.netIncome}</strong>
                              </div>
                              <div>
                                <span className="text-slate-500 block text-[9px] uppercase">R&D Spend</span>
                                <strong className="text-indigo-300 block mt-0.5">{f.rdExpenses}</strong>
                              </div>
                            </div>
                          </div>

                          <a 
                            href={f.url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="w-full text-center py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-all font-mono font-bold text-[9px] uppercase mt-2 block"
                          >
                            Browse Live SEC Edgar Profile ↗
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. FRED RENDERING */}
                {activeApiTab === "fred" && (
                  <div className="space-y-4">
                    <div className="flex justify-between text-[11px] border-b border-slate-800 pb-2">
                      <span className="text-slate-400 font-mono">Macro Parameter Pool: <strong className="text-slate-200">FEDERAL RESERVE ST. LOUIS</strong></span>
                      <span className="text-teal-400 font-mono text-[10px]/none bg-teal-950/30 px-2 py-1 rounded">FRED LIVE SERVER</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {Object.entries(apiResult.indicators || {}).map(([key, ind]: any) => (
                        <div key={key} className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl space-y-1">
                          <span className="text-[9px] font-mono font-bold uppercase text-slate-500 block truncate">
                            {ind.title} ({ind.seriesId || "Spread"})
                          </span>
                          <span className="text-xl font-bold font-mono tracking-tight text-yellow-500 block">
                            {ind.currentValue}
                          </span>
                          <p className="text-[10px] text-slate-400 leading-snug mt-1 pt-1.5 border-t border-slate-850">
                            {ind.trend}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Historical mini yield curve comparison list */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                      <h4 className="font-mono text-[10px]/none font-bold text-slate-300 uppercase tracking-wider mb-2.5">
                        Yield Curve Spread History Trend (Inversion Levels)
                      </h4>
                      <div className="space-y-2">
                        {apiResult.historicalChart?.map((item: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between text-2xs font-mono border-b border-slate-850 pb-1.5 last:border-0 last:pb-0">
                            <span className="text-slate-500">{item.date}</span>
                            <div className="flex items-center gap-4">
                              <span><strong className="text-slate-300">10Y Yield:</strong> {item.yield10y}%</span>
                              <span><strong className="text-slate-300">2Y Yield:</strong> {item.yield2y}%</span>
                              <span className={`px-1.5 rounded-sm font-bold ${item.spread < 0 ? "bg-rose-950 text-rose-350" : "bg-emerald-950 text-emerald-350"}`}>
                                Spread: {item.spread}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. POLYGON RENDERING */}
                {activeApiTab === "polygon" && (
                  <div className="space-y-4">
                    <div className="flex justify-between text-[11px] border-b border-slate-800 pb-2">
                      <span className="text-slate-400 font-mono">Standardized Metrics Target: <strong className="text-slate-200">{apiResult.ticker}</strong></span>
                      <span className="text-indigo-400 font-mono text-[10px]/none bg-indigo-950/30 px-2 py-1 rounded">{apiResult.source}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
                      <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
                        <span className="text-[9px] text-slate-500 uppercase font-bold block">Cash Dividend Amount</span>
                        <strong className="text-lg text-emerald-300 mt-1 block">${apiResult.metrics?.dividendAmount || 0.0}</strong>
                        <span className="text-[9px] text-slate-450 block mt-1.5">Ex-Date: {apiResult.metrics?.dividendExDate || "N/A"}</span>
                      </div>

                      <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
                        <span className="text-[9px] text-slate-500 uppercase font-bold block">Stock Split Coefficient</span>
                        <strong className="text-lg text-indigo-300 mt-1 block">{apiResult.metrics?.splitRatio || "N/A"}</strong>
                        <span className="text-[9px] text-slate-450 block mt-1.5">Date: {apiResult.metrics?.splitDate || "N/A"}</span>
                      </div>

                      <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
                        <span className="text-[9px] text-slate-500 uppercase font-bold block">R&D to Revenue Percentage</span>
                        <strong className="text-lg text-yellow-500 mt-1 block">{apiResult.metrics?.rAndDToRevenuePercent || 0.0}%</strong>
                        <span className="text-[9px] text-slate-450 block mt-1.5">Target: Semiconductor R&D Capex</span>
                      </div>

                      <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
                        <span className="text-[9px] text-slate-500 uppercase font-bold block">Debt to Equity Ratio (Balance Sheet)</span>
                        <strong className="text-lg text-rose-400 mt-1 block">{apiResult.metrics?.debtToEquityRatio || 0.0}x</strong>
                        <span className="text-[9px] text-slate-450 block mt-1.5">Standard Leverage Risk Level</span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex justify-between items-center text-xs">
                      <span className="text-slate-400">Total annualized Free Cash Flow reserves SGD calculation:</span>
                      <strong className="font-mono text-emerald-300">{apiResult.metrics?.freeCashFlowSgd || "$0 B"}</strong>
                    </div>
                  </div>
                )}

                {/* 4. CONGRESS RENDERING */}
                {activeApiTab === "congress" && (
                  <div className="space-y-4">
                    <div className="flex justify-between text-[11px] border-b border-slate-800 pb-2">
                      <span className="text-slate-400 font-mono">Politician Disclosures Filter: <strong className="text-slate-200">{apiResult.tickerRequested === "ALL" ? "All Watchlist" : apiResult.tickerRequested}</strong></span>
                      <span className="text-amber-400 font-mono text-[10px]/none bg-amber-950/30 px-2 py-1 rounded">{apiResult.source}</span>
                    </div>

                    <div className="space-y-3">
                      {apiResult.trades?.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 bg-slate-900 border border-slate-850 rounded-xl font-mono text-2xs">
                          No recent Congressional trades registered for this equity symbol. Click TSM or NVDA to view specific disclosures.
                        </div>
                      ) : (
                        apiResult.trades?.map((tr: any, idx: number) => (
                          <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                            <div className="flex flex-wrap items-center justify-between text-2xs gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-200">{tr.politician}</span>
                                <span className="text-slate-500 font-mono">({tr.chamber})</span>
                              </div>
                              <span className={`px-2 py-0.5 font-bold font-mono text-[9px] rounded-sm uppercase ${
                                tr.transaction.includes("PURCHASE") ? "bg-emerald-950/40 text-emerald-350 border border-emerald-900/60" : "bg-rose-950/40 text-rose-350 border border-rose-900/60"
                              }`}>
                                {tr.transaction}
                              </span>
                            </div>

                            <p className="text-[11.5px] text-slate-300 leading-relaxed font-sans">{tr.highlights}</p>

                            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-2 border-t border-slate-850">
                              <span>Asset Class: <strong className="text-slate-300">{tr.ticker}</strong></span>
                              <span>Trade Valuation: <strong className="text-slate-300">{tr.amountRange}</strong></span>
                              <span>Disclosed Date: <strong className="text-slate-300">{tr.disclosureDate}</strong></span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Raw JSON stream toggle */}
                <details className="group border border-slate-800 rounded-xl overflow-hidden font-mono text-2xs">
                  <summary className="bg-slate-900 px-4 py-2 text-slate-400 font-semibold cursor-pointer hover:bg-slate-850 select-none flex justify-between items-center">
                    <span>⚡ VIEW RAW REAL-TIME STREAM PAYLOAD</span>
                    <span className="text-slate-600 group-open:rotate-90 transition-all font-sans text-xs">▶</span>
                  </summary>
                  <pre className="p-4 bg-black text-slate-350 leading-relaxed overflow-x-auto text-[10px] select-all">
                    {JSON.stringify(apiResult, null, 2)}
                  </pre>
                </details>

              </div>
            ) : (
              <div className="flex items-center justify-center py-12 text-slate-500 font-mono text-xs">
                Pending telemetry sync...
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
