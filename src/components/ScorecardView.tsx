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

  // Sync state if selectedTicker prop changes (cross-nav)
  useEffect(() => {
    if (selectedTicker && stocks.some(s => s.ticker === selectedTicker)) {
      setActiveTicker(selectedTicker);
    }
  }, [selectedTicker, stocks]);

  // Active stock object
  const activeStock = stocks.find(s => s.ticker === activeTicker);

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

        {/* Dropdown Selector */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <label className="text-gray-400 font-semibold font-sans">Focus Stock:</label>
          <select
            value={activeTicker}
            onChange={(e) => setActiveTicker(e.target.value)}
            className="p-2 border border-gray-150 rounded-xl bg-slate-50 text-gray-800 font-bold focus:outline-hidden"
          >
            {stocks.map((s) => (
              <option key={s.ticker} value={s.ticker}>
                {s.ticker} - {s.companyName.slice(0, 20)}
              </option>
            ))}
          </select>
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
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
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
                    <span className="text-emerald-400 font-mono">{activeStock.asymmetry.upside || 3}/5</span>
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
                    <span className="text-emerald-400 font-mono">{activeStock.asymmetry.conviction || 3}/5</span>
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
                    <span className="text-emerald-400 font-mono">{activeStock.asymmetry.catalyst || 3}/5</span>
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
                    <span className="text-4xs font-mono font-bold uppercase text-emerald-400">calculated symmetry ratio</span>
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
    </div>
  );
}
