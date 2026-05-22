import React, { useState } from "react";
import { Stock, DecisionState } from "../types";
import { 
  Briefcase, 
  Eye, 
  TrendingUp, 
  Trash2, 
  Clock, 
  AlertCircle, 
  ShieldCheck, 
  PiggyBank,
  CheckSquare,
  Sparkles,
  RefreshCw,
  Search
} from "lucide-react";

interface PortfolioViewProps {
  stocks: Stock[];
  onUpdateStock: (stock: Stock) => void;
  onNavigate: (tab: string, ticker?: string) => void;
}

export function PortfolioView({ stocks, onUpdateStock, onNavigate }: PortfolioViewProps) {
  const [subTab, setSubTab] = useState<"holdings" | "watchlist" | "sold" | "reviews">("holdings");

  // Filtering lists
  const activeHoldings = stocks.filter(s => s.decisionState === "BUY");
  const watchlistStocks = stocks.filter(s => s.decisionState === "WATCHLIST" || s.decisionState === "HOLD");
  const soldStocks = stocks.filter(s => s.decisionState === "SELL");

  // Review Queue is: STOCKS explicitly in "REVIEW" state, PLUS any stock with nextReviewDate <= current date
  const currentDateISO = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  const reviewQueue = stocks.filter(s => {
    return s.decisionState === "REVIEW" || 
      (s.nextReviewDate && s.nextReviewDate <= currentDateISO);
  });

  // Math counts
  const totalAllocatedSize = activeHoldings.reduce((sum, s) => sum + (s.decisionData?.positionSizePercent || 0), 0);

  const calculateTotalRealizedGains = () => {
    return soldStocks.reduce((sum, s) => sum + (s.decisionData?.realizedGainPercent || 0), 0);
  };

  const badgeColor = (state: DecisionState) => {
    if (state === "BUY") return "bg-emerald-55 text-emerald-800 bg-emerald-100";
    if (state === "HOLD") return "bg-amber-100 text-amber-800";
    if (state === "SELL") return "bg-rose-100 text-rose-800";
    if (state === "REVIEW") return "bg-indigo-150 bg-indigo-100 text-indigo-800";
    return "bg-slate-100 text-slate-700";
  };

  const handleReviewRoute = (ticker: string, targetState: DecisionState) => {
    const stock = stocks.find(s => s.ticker === ticker);
    if (!stock) return;

    if (targetState === "BUY") {
      onNavigate("decision", ticker);
    } else {
      onUpdateStock({
        ...stock,
        decisionState: targetState,
        nextReviewDate: targetState === "HOLD" 
          ? new Date(Date.now() + 1000*60*60*24*45).toISOString().slice(0, 10) // 45 days
          : undefined
      });
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Tracker headers */}
      <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-indigo-500" />
            Active Portfolio & Review tracker
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Monitor and maintain covered tech assets. Allocate position weights, track historical lessons, and re-balance on schedule indicators.
          </p>
        </div>

        {/* Aggregate metrics badges */}
        <div className="flex items-center gap-2.5 font-mono text-3xs font-semibold uppercase">
          <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span>Allocated Size: {totalAllocatedSize}%</span>
          </div>
          <div className="px-3 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-800 rounded-xl flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 text-indigo-600 animate-spin-slow" />
            <span>Pending Review: {reviewQueue.length}</span>
          </div>
        </div>
      </div>

      {/* Desk Tab Selection Row */}
      <div className="flex border-b border-gray-100 gap-2 font-mono text-2xs font-bold uppercase select-none">
        <button
          onClick={() => setSubTab("holdings")}
          className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer ${
            subTab === "holdings"
            ? "border-slate-800 text-slate-900"
            : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          Active Holdings ({activeHoldings.length})
        </button>

        <button
          onClick={() => setSubTab("watchlist")}
          className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer ${
            subTab === "watchlist"
            ? "border-amber-500 text-amber-800"
            : "border-transparent text-gray-400 hover:text-gray-400"
          }`}
        >
          Coverage Watchlist ({watchlistStocks.length})
        </button>

        <button
          onClick={() => setSubTab("sold")}
          className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer ${
            subTab === "sold"
            ? "border-rose-500 text-rose-800"
            : "border-transparent text-gray-400 hover:text-gray-400"
          }`}
        >
          Closed out History ({soldStocks.length})
        </button>

        <button
          onClick={() => setSubTab("reviews")}
          className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            subTab === "reviews"
            ? "border-indigo-500 text-indigo-800 font-semibold"
            : "border-transparent text-gray-400 hover:text-gray-400"
          }`}
        >
          Review Desk ({reviewQueue.length})
          {reviewQueue.length > 0 && <span className="w-2 h-2 rounded-full bg-rose-500 inline-block animate-pulse"></span>}
        </button>
      </div>

      {/* Desk Content */}
      <div className="space-y-4">
        
        {/* DESK 1: Active holdings */}
        {subTab === "holdings" && (
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-gray-50 pb-2">
              <h2 className="text-xs font-semibold text-gray-900 font-mono uppercase tracking-wider">Active Position Sizes</h2>
              <span className="text-3xs text-gray-400 font-mono">Current date: 2026-05-22</span>
            </div>

            {activeHoldings.length === 0 ? (
              <div className="text-center py-10 text-gray-400 font-mono text-xs">
                No active portfolio positions allocated. Route watchlisted assets to 'BUY' state first.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {activeHoldings.map((stock) => (
                  <div key={stock.ticker} className="p-4 border border-gray-100 rounded-xl relative hover:bg-slate-50/50 transition-all flex flex-col justify-between">
                    <div>
                      {/* Ticker & Size header */}
                      <div className="flex justify-between items-start mb-2.5">
                        <div>
                          <span className="font-mono text-xs font-bold px-1.5 py-0.5 bg-gray-100 rounded text-gray-700">{stock.ticker}</span>
                          <h3 className="text-xs font-medium text-gray-800 mt-1 line-clamp-1">{stock.companyName}</h3>
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-3xs font-mono font-bold rounded-lg border border-emerald-100">
                          SIZE: {stock.decisionData?.positionSizePercent || 5}%
                        </span>
                      </div>

                      {/* Technical limits */}
                      <div className="grid grid-cols-2 gap-2 p-2 bg-slate-50 rounded-lg text-3xs font-mono mb-3 text-gray-650">
                        <div>
                          <span className="text-gray-400 block font-sans">Stop-loss level:</span>
                          <strong className="text-rose-600 font-bold">${stock.decisionData?.stopLoss || "Not checked"}</strong>
                        </div>
                        <div>
                          <span className="text-gray-400 block font-sans">Target level:</span>
                          <strong className="text-emerald-600 font-bold">${stock.decisionData?.targetPrice || "Not checked"}</strong>
                        </div>
                      </div>

                      {/* Thesis summary */}
                      <div className="space-y-1 mb-4">
                        <span className="text-4xs font-mono uppercase font-bold text-gray-400">Core Buy Thesis Reason</span>
                        <p className="text-3xs text-gray-600 leading-relaxed font-sans line-clamp-3">{stock.decisionData?.buyReason || "No thesis logged."}</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-3xs border-t border-gray-50 pt-2.5 font-mono">
                      <span className="text-gray-400 font-sans">Review: {stock.nextReviewDate || "Monthly check"}</span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => onNavigate("chart", stock.ticker)}
                          className="px-2 py-0.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded"
                        >
                          Chart
                        </button>
                        <button
                          onClick={() => onNavigate("decision", stock.ticker)}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold"
                        >
                          Update
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* DESK 2: Covered Watchlist */}
        {subTab === "watchlist" && (
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
            <h2 className="text-xs font-semibold text-gray-900 font-mono uppercase tracking-wider border-b border-gray-50 pb-2">Active watchlist assets & Coverage</h2>

            {watchlistStocks.length === 0 ? (
              <div className="text-center py-10 text-gray-400 font-mono text-xs animate-pulse">No watchlist assets. Navigate to 'Watchlist Onboarding'.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {watchlistStocks.map((stock) => (
                  <div key={stock.ticker} className="p-4 border border-slate-100 rounded-xl hover:bg-slate-50/50 transition-colors flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="font-mono text-xs font-bold px-1.5 py-0.5 bg-gray-105 rounded text-gray-700">{stock.ticker}</span>
                          <h3 className="text-xs font-bold text-gray-900 mt-1">{stock.companyName}</h3>
                        </div>
                        <span className={`px-2 py-0.5 text-4xs font-mono font-bold rounded ${badgeColor(stock.decisionState)}`}>
                          {stock.decisionState}
                        </span>
                      </div>

                      <p className="text-3xs text-gray-500 mt-1 lines-clamp-2 leading-relaxed font-sans">
                        {stock.reasonForInclusion || "Thematic Coverage asset."}
                      </p>

                      {stock.decisionState === "HOLD" && stock.decisionData && (
                        <div className="mt-3 p-2.5 bg-amber-50/50 border border-amber-100/30 rounded-lg text-3xs text-amber-900 space-y-1">
                          <p className="font-semibold font-sans">Hold monitoring checkpoint:</p>
                          <p className="font-sans leading-tight text-amber-800 font-medium">Risk: {stock.decisionData.holdKeyRisk}</p>
                          <p className="font-sans leading-tight text-amber-800 font-medium">Trigger: {stock.decisionData.holdTrigger}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center text-3xs border-t border-gray-50 pt-2.5 mt-4 font-mono">
                      <span className="text-gray-400">Asymmetry Score: <strong className="text-emerald-600">{stock.asymmetry.asymmetryScore || "Not Scored"}</strong></span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => onNavigate("analysis", stock.ticker)}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold"
                        >
                          Score
                        </button>
                        <button
                          onClick={() => onNavigate("decision", stock.ticker)}
                          className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-semibold"
                        >
                          Route state
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* DESK 3: Sold Outposts */}
        {subTab === "sold" && (
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-gray-50 pb-2">
              <h2 className="text-xs font-semibold text-gray-900 font-mono uppercase tracking-wider">Historical exits & realized gains</h2>
              <span className="text-3xs font-mono text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 border border-emerald-100 rounded">Total realized: +{calculateTotalRealizedGains()}%</span>
            </div>

            {soldStocks.length === 0 ? (
              <div className="text-center py-10 text-gray-400 font-mono text-xs">
                No archived sold outposts. Change stock decisions to 'SELL' to populate.
              </div>
            ) : (
              <div className="space-y-3">
                {soldStocks.map((stock) => (
                  <div key={stock.ticker} className="p-4 border border-rose-100 bg-rose-50/20 rounded-xl text-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-2xs font-bold px-1.5 py-0.5 bg-rose-100 rounded text-rose-800">{stock.ticker}</span>
                        <h3 className="font-bold text-gray-900 font-display">{stock.companyName}</h3>
                      </div>
                      <p className="text-3xs text-gray-500 font-sans mt-0.5"><strong className="text-rose-700">Exit Cause:</strong> {stock.decisionData?.sellReason || "Strategic rebalancing"}</p>
                      <p className="text-3xs text-slate-600 font-sans italic mt-1"><strong className="text-slate-800">Lesson Learned:</strong> {stock.decisionData?.sellLesson || "No lesson logged"}</p>
                    </div>

                    <div className="flex md:flex-col items-end gap-2.5 shrink-0 text-right">
                      <div className="font-mono text-right">
                        <span className="text-4xs text-gray-400 block font-sans">REALIZED RETURN</span>
                        <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">+{stock.decisionData?.realizedGainPercent || 0}%</span>
                      </div>
                      
                      <button
                        onClick={() => onNavigate("decision", stock.ticker)}
                        className="text-3xs text-indigo-650 hover:underline font-semibold cursor-pointer"
                      >
                        Re-evaluate Buy Loop
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* DESK 4: Review Desk (Screen 8 Queue) */}
        {subTab === "reviews" && (
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
            <div className="p-4 bg-indigo-50 border border-indigo-150 rounded-xl text-xs text-indigo-900 flex items-start gap-2.5 leading-relaxed">
              <AlertCircle className="w-4 h-4 text-indigo-600 mt-1 shrink-0" />
              <div>
                <h4 className="font-bold font-display">Asymmetric periodic audit engine</h4>
                <p className="text-3xs mt-1 text-indigo-800 max-w-2xl font-sans">
                  The guidelines specify executing reviews on an asset lifecycle basis monthly or on policy signals. If the current date matches or exceeds the next target review, the asset is flagged here immediately. Check your variables.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {reviewQueue.map((stock) => {
                const isOverdue = stock.nextReviewDate && stock.nextReviewDate <= currentDateISO;
                return (
                  <div key={stock.ticker} className={`p-4 border rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-colors ${
                    isOverdue ? "border-amber-200 bg-amber-50/15" : "border-gray-50 bg-slate-50/50"
                  }`}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-2xs font-bold px-1.5 py-0.5 bg-slate-100 rounded text-gray-800">{stock.ticker}</span>
                        <h3 className="font-bold text-gray-900">{stock.companyName}</h3>
                        <span className={`text-4xs font-mono font-bold px-1.5 py-0.5 rounded capitalize ${badgeColor(stock.decisionState)}`}>
                          {stock.decisionState}
                        </span>
                      </div>
                      
                      <p className="text-3xs text-gray-500 font-sans line-clamp-2 max-w-xl">
                        {stock.reasonForInclusion || stock.rationale}
                      </p>

                      <p className="text-3xs text-amber-800 font-semibold font-mono flex items-center gap-1 mt-1.5">
                        <Clock className="w-3 h-3 text-amber-600" />
                        Next review target: {stock.nextReviewDate || "ASAP state review required"} 
                        {isOverdue && <span className="text-rose-600 uppercase text-4xs font-bold">• OVERDUE AUDIT INDICATOR</span>}
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <button
                        onClick={() => handleReviewRoute(stock.ticker, "BUY")}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-3xs rounded shadow-xs"
                      >
                        Route BUY
                      </button>
                      <button
                        onClick={() => handleReviewRoute(stock.ticker, "HOLD")}
                        className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-3xs rounded shadow-xs"
                      >
                        Route HOLD
                      </button>
                      <button
                        onClick={() => handleReviewRoute(stock.ticker, "SELL")}
                        className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-3xs rounded shadow-xs"
                      >
                        Route SELL
                      </button>
                    </div>
                  </div>
                );
              })}

              {reviewQueue.length === 0 && (
                <div className="text-center py-10 text-gray-400 font-mono text-xs">
                  Review queue clear! Beautiful. All coverage timelines are in check.
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
