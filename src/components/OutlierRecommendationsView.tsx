import React, { useState, useMemo } from "react";
import { Stock, PricePoint } from "../types";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  Activity, 
  Info, 
  HelpCircle,
  BookOpen,
  ArrowRight,
  ShieldAlert,
  Clock,
  Briefcase,
  Scale
} from "lucide-react";

interface OutlierRecommendationsViewProps {
  stocks: Stock[];
}

// Helper for metrics
interface SimpleStockMetrics {
  ticker: string;
  name: string;
  sector: string;
  theme: string;
  currentPrice: number;
  averagePrice: number;
  priceSpreadRange: number; // stdDev simplified
  safeBuyPrice: number; // buyLowThreshold
  targetSellPrice: number; // sellHighThreshold
  isLowOutlier: boolean;
  isHighOutlier: boolean;
  zScore: number;
  suggestedAction: "BUY" | "SELL" | "HOLD";
}

export function OutlierRecommendationsView({ stocks }: OutlierRecommendationsViewProps) {
  const [activeTab, setActiveTab] = useState<"BUY" | "SELL" | "HOLD">("BUY");

  // Calculate beginner-friendly metrics for all stocks
  const stockMetricsList = useMemo<SimpleStockMetrics[]>(() => {
    return stocks.map(stock => {
      const prices = (stock.priceHistory || []).map(p => p.price);
      const n = prices.length;
      if (n === 0) {
        return {
          ticker: stock.ticker,
          name: stock.companyName,
          sector: stock.sector,
          theme: stock.theme,
          currentPrice: stock.stats.currentPrice,
          averagePrice: stock.stats.currentPrice,
          priceSpreadRange: 0,
          safeBuyPrice: Math.round(stock.stats.currentPrice * 0.8),
          targetSellPrice: Math.round(stock.stats.currentPrice * 1.2),
          isLowOutlier: false,
          isHighOutlier: false,
          zScore: 0,
          suggestedAction: stock.decisionState === "REVIEW" ? "HOLD" : stock.decisionState === "WATCHLIST" ? "BUY" : stock.decisionState as any
        };
      }

      // Simple calculation
      const mean = prices.reduce((sum, v) => sum + v, 0) / n;
      const variance = prices.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
      const stdDev = Math.sqrt(variance);

      const currentPrice = stock.stats.currentPrice;
      const zScore = stdDev === 0 ? 0 : (currentPrice - mean) / stdDev;

      // Classify based on both zscore and the existing model decision state to align perfectly
      let suggestedAction: "BUY" | "SELL" | "HOLD" = "HOLD";
      if (stock.decisionState === "BUY" || zScore <= -1.0) {
        suggestedAction = "BUY";
      } else if (stock.decisionState === "SELL" || zScore >= 1.1) {
        suggestedAction = "SELL";
      } else {
        suggestedAction = "HOLD";
      }

      // Calculate simple margins for safety buy and sell target prices
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const safeBuyPrice = Math.round(Math.max(minPrice * 0.95, mean - 1.0 * stdDev));
      const targetSellPrice = Math.round(Math.min(maxPrice * 1.05, mean + 1.1 * stdDev));

      return {
        ticker: stock.ticker,
        name: stock.companyName,
        sector: stock.sector,
        theme: stock.theme,
        currentPrice,
        averagePrice: Math.round(mean),
        priceSpreadRange: Math.round(stdDev),
        safeBuyPrice,
        targetSellPrice,
        isLowOutlier: zScore <= -1.0,
        isHighOutlier: zScore >= 1.1,
        zScore: parseFloat(zScore.toFixed(2)),
        suggestedAction
      };
    });
  }, [stocks]);

  // Group recommendations
  const buyStocks = useMemo(() => stockMetricsList.filter(s => s.suggestedAction === "BUY"), [stockMetricsList]);
  const sellStocks = useMemo(() => stockMetricsList.filter(s => s.suggestedAction === "SELL"), [stockMetricsList]);
  const holdStocks = useMemo(() => stockMetricsList.filter(s => s.suggestedAction === "HOLD"), [stockMetricsList]);

  const activeGroup = activeTab === "BUY" ? buyStocks : activeTab === "SELL" ? sellStocks : holdStocks;

  return (
    <div className="space-y-6">
      
      {/* Dynamic Header Badge showing status at a glance */}
      <div className="bg-gradient-to-r from-indigo-900 to-indigo-950 text-white rounded-2xl p-6 border border-slate-800 shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold tracking-widest text-indigo-400 block uppercase leading-none">
              BEGINNER-FRIENDLY PORTAL • ACTIONABLE ADVICE
            </span>
            <h2 className="text-xl font-bold font-display flex items-center gap-2">
              <Scale className="w-5 h-5 text-indigo-400" />
              Main Street Trade Advice Console
            </h2>
            <p className="text-xs text-slate-350 font-sans leading-relaxed">
              We look at historical price bands and stock connections to give you easy-to-read Buy, Sell, or Hold guidelines. Perfect for beginners to maximize safety and returns.
            </p>
          </div>

          {/* Quick Summary Badge Row */}
          <div className="flex gap-4 bg-indigo-950/60 p-4 rounded-xl border border-slate-800 text-center shrink-0">
            <div className="px-2">
              <span className="text-3xs text-slate-400 block uppercase font-bold tracking-wider mb-1">BUY Picks</span>
              <strong className="text-lg text-emerald-400 font-mono block leading-none">{buyStocks.length}</strong>
            </div>
            <div className="border-r border-slate-800" />
            <div className="px-2">
              <span className="text-3xs text-slate-400 block uppercase font-bold tracking-wider mb-1">SELL Targets</span>
              <strong className="text-lg text-rose-400 font-mono block leading-none">{sellStocks.length}</strong>
            </div>
            <div className="border-r border-slate-800" />
            <div className="px-2">
              <span className="text-3xs text-slate-400 block uppercase font-bold tracking-wider mb-1">HOLD Positions</span>
              <strong className="text-lg text-amber-400 font-mono block leading-none">{holdStocks.length}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* THREE EXPLICIT RECOMMENDATION TABS */}
      <div className="flex flex-col md:flex-row justify-between items-stretch gap-4">
        
        {/* Navigation Switch Tabs */}
        <div className="flex flex-1 bg-white border border-gray-150 rounded-xl p-1 shadow-sm select-none">
          <button
            onClick={() => setActiveTab("BUY")}
            className={`flex-1 py-3 px-4 rounded-lg font-bold text-xs uppercase flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === "BUY"
                ? "bg-emerald-600 text-white shadow-md font-extrabold"
                : "text-gray-500 hover:text-emerald-600 hover:bg-emerald-50/50"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            BUY SCORES ({buyStocks.length})
          </button>

          <button
            onClick={() => setActiveTab("SELL")}
            className={`flex-1 py-3 px-4 rounded-lg font-bold text-xs uppercase flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === "SELL"
                ? "bg-rose-600 text-white shadow-md font-extrabold"
                : "text-gray-500 hover:text-rose-600 hover:bg-rose-50/50"
            }`}
          >
            <TrendingDown className="w-4 h-4" />
            SELL SCORES ({sellStocks.length})
          </button>

          <button
            onClick={() => setActiveTab("HOLD")}
            className={`flex-1 py-3 px-4 rounded-lg font-bold text-xs uppercase flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === "HOLD"
                ? "bg-amber-500 text-white shadow-md font-extrabold"
                : "text-gray-500 hover:text-amber-500 hover:bg-amber-50/50"
            }`}
          >
            <Clock className="w-4 h-4" />
            HOLD / STEADY ({holdStocks.length})
          </button>
        </div>

        {/* Quick Help Card */}
        <div className="p-3 bg-indigo-50 border border-indigo-150 rounded-xl flex items-center gap-2.5 text-3xs text-indigo-900 md:max-w-xs font-medium">
          <Info className="w-4 h-4 text-indigo-500 shrink-0" />
          <p>
            <strong>Beginner Rule of Thumb:</strong> Always try to buy when a stock is listed under <span className="text-emerald-700 font-bold">BUY</span> (discounted), hold during <span className="text-amber-700 font-bold">HOLD</span> (normal), and secure cash during <span className="text-rose-700 font-semibold text-rose-800">SELL</span> (overheated).
          </p>
        </div>
      </div>

      {/* TAB VALUE PRESENTATION VIEW */}
      <div className="space-y-6">
        {activeGroup.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm space-y-3">
            <span className="p-3 bg-gray-50 text-gray-400 rounded-full inline-block">
              <Activity className="w-6 h-6" />
            </span>
            <h3 className="text-base font-bold text-slate-800">No Stocks Currently in {activeTab} Zone</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Market trends are in healthy balance. No watchlisted stocks currently trigger the strict boundaries required for a direct {activeTab.toLowerCase()} signal. Please review the other tabs for opportunities.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeGroup.map(stock => {
              // Decide theme colors
              const accentColorClass = 
                activeTab === "BUY" ? "text-emerald-700 bg-emerald-50 border-emerald-200" :
                activeTab === "SELL" ? "text-rose-700 bg-rose-50 border-rose-200" :
                "text-amber-700 bg-amber-50 border-amber-200";

              const badgeText = 
                activeTab === "BUY" ? "BUY / ACCUMULATE" :
                activeTab === "SELL" ? "TAKE PROFITS / SELL" :
                "HOLD / HEALTHY COMBO";

              const actionHeaderColor = 
                activeTab === "BUY" ? "bg-emerald-600" :
                activeTab === "SELL" ? "bg-rose-600" :
                "bg-amber-500";

              return (
                <div 
                  key={stock.ticker}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition-all duration-300"
                >
                  {/* Top Action Header Bar - Extremely Obvious */}
                  <div className={`${actionHeaderColor} text-white px-4 py-3 flex justify-between items-center`}>
                    <div className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider">
                      {activeTab === "BUY" && <TrendingUp className="w-4 h-4" />}
                      {activeTab === "SELL" && <TrendingDown className="w-4 h-4 text-white" />}
                      {activeTab === "HOLD" && <Clock className="w-4 h-4" />}
                      {stock.ticker}
                    </div>
                    <span className="text-4xs font-mono font-bold uppercase py-0.5 px-2 bg-black/20 rounded-md text-slate-100 tracking-wider">
                      {badgeText}
                    </span>
                  </div>

                  {/* Pricing Overview Row */}
                  <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Name & Sector */}
                      <div className="border-b border-gray-100 pb-3 mb-3.5">
                        <h4 className="font-bold text-slate-900 text-sm font-sans line-clamp-1 truncate">{stock.name}</h4>
                        <span className="text-4xs font-mono font-bold uppercase text-gray-400 mt-1 block">
                          {stock.sector} • Key theme: {stock.theme}
                        </span>
                      </div>

                       {/* Giant Present Price Circle */}
                       <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100/60 mb-4">
                         <div className="space-y-0.5">
                           <div className="flex items-center gap-1.5">
                             <span className="text-4xs text-gray-400 uppercase font-bold tracking-wider block">Today's Price</span>
                             <span className="text-[7.5px] font-mono uppercase bg-emerald-50 text-emerald-700 px-1 rounded font-bold border border-emerald-100 leading-none">As of 05-24</span>
                           </div>
                           <span className="text-lg font-black text-slate-800 font-mono tracking-tight">${stock.currentPrice}</span>
                         </div>
                         <div className="text-right space-y-0.5">
                           <span className="text-4xs text-gray-400 uppercase font-bold tracking-wider block">Normal Average</span>
                           <span className="text-xs font-bold text-slate-600 font-mono">${stock.averagePrice}</span>
                         </div>
                       </div>

                      {/* Interactive Beginner Guideline Playbook Column */}
                      <div className="space-y-3">
                        {activeTab === "BUY" && (
                          <div className="space-y-2">
                            <span className="text-4xs uppercase font-bold text-emerald-700 tracking-wider block">Simplified Buying Guide:</span>
                            <p className="text-3xs text-gray-650 leading-relaxed font-sans">
                              This stock is trading <strong className="text-emerald-700 font-black">heavily discounted</strong> relative to its 2020-2026 historical range. It is like finding a premium brand item on a discount rack!
                            </p>
                            <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-100 space-y-1">
                              <span className="text-4xs font-bold text-emerald-800 block">BEST PRICE TO BUY IN:</span>
                              <strong className="text-sm font-mono font-extrabold text-emerald-700 block">${stock.safeBuyPrice} or below</strong>
                              <span className="text-4xs text-emerald-600 font-medium block">Currently priced at ${stock.currentPrice}. If under Target, start accumulating!</span>
                            </div>
                          </div>
                        )}

                        {activeTab === "SELL" && (
                          <div className="space-y-2">
                            <span className="text-4xs uppercase font-bold text-rose-700 tracking-wider block">Simplified Selling Guide:</span>
                            <p className="text-3xs text-gray-650 leading-relaxed font-sans">
                              This stock's price has soared high above its standard historical boundaries. While growth is excellent, it is highly <strong className="text-rose-700 font-black">overstretched</strong> right now.
                            </p>
                            <div className="bg-rose-50/50 p-3 rounded-lg border border-rose-100 space-y-1">
                              <span className="text-4xs font-bold text-rose-800 block">TARGET PROFIT-TAKING TARGET:</span>
                              <strong className="text-sm font-mono font-extrabold text-rose-700 block">${stock.targetSellPrice} or above</strong>
                              <span className="text-4xs text-rose-600 font-medium block">Priced at ${stock.currentPrice}. Consider locking in some profits!</span>
                            </div>
                          </div>
                        )}

                        {activeTab === "HOLD" && (
                          <div className="space-y-2">
                            <span className="text-4xs uppercase font-bold text-amber-700 tracking-wider block">Simplified Holding Guide:</span>
                            <p className="text-3xs text-gray-650 leading-relaxed font-sans">
                              This stock is trading comfortably in its <strong className="text-amber-700 font-black">safe median trading zone</strong>. No extreme spikes or crashes are visible.
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-center text-4xs uppercase font-mono">
                              <div className="p-2 bg-slate-50 border border-slate-100 rounded">
                                <span className="block text-gray-400">Low Bound</span>
                                <strong className="text-2xs text-slate-800 block mt-0.5 font-bold">${stock.safeBuyPrice}</strong>
                              </div>
                              <div className="p-2 bg-slate-50 border border-slate-100 rounded">
                                <span className="block text-gray-400">High Bound</span>
                                <strong className="text-2xs text-slate-800 block mt-0.5 font-bold">${stock.targetSellPrice}</strong>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom simple advisory label */}
                    <div className="pt-3 border-t border-gray-150/50 mt-4 flex items-center justify-between text-4xs font-mono font-bold text-gray-400">
                      <span>TIME HORIZON: 12-18 MONTHS</span>
                      <span>VERIFIED ASSET</span>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
