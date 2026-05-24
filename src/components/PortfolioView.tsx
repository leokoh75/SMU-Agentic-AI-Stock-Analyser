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

  // Real holdings transactions tracking stored in localStorage
  const [transactions, setTransactions] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem("equilibrium_portfolio_transactions");
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn("localStorage transaction load blocked:", e);
    }
    // High-fidelity pre-populated initial trades to keep the portfolio active on start!
    return [
      { id: "seed-tsmc", ticker: "TSMC", type: "BUY", shares: 45, pricePerShare: 168.50, date: "2026-02-14", commissionSgd: 15.00 },
      { id: "seed-nvda", ticker: "NVDA", type: "BUY", shares: 100, pricePerShare: 125.00, date: "2026-03-01", commissionSgd: 22.40 },
      { id: "seed-msft", ticker: "MSFT", type: "BUY", shares: 25, pricePerShare: 410.00, date: "2026-03-24", commissionSgd: 18.00 },
      { id: "seed-nvda-trim", ticker: "NVDA", type: "SELL", shares: 20, pricePerShare: 135.50, date: "2026-04-15", commissionSgd: 12.00 }
    ];
  });

  // Dynamic input states for logging new transactions
  const [formTicker, setFormTicker] = useState<string>(stocks[0]?.ticker || "");
  const [formType, setFormType] = useState<"BUY" | "SELL">("BUY");
  const [formShares, setFormShares] = useState<string>("10");
  const [formPrice, setFormPrice] = useState<string>("150");
  const [formDate, setFormDate] = useState<string>(() => new Date().toISOString().slice(0, 10)); // Local date auto-populate
  const [formCommission, setFormCommission] = useState<string>("10");

  const handleSaveTransactions = (newTxList: any[]) => {
    setTransactions(newTxList);
    try {
      localStorage.setItem("equilibrium_portfolio_transactions", JSON.stringify(newTxList));
    } catch (e) {
      console.error("Failed to write transactions storage:", e);
    }
  };

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTicker) {
      alert("Please designate a stock ticker symbol first.");
      return;
    }
    const sharesNum = parseFloat(formShares);
    const priceNum = parseFloat(formPrice);
    const commissionNum = parseFloat(formCommission);

    if (isNaN(sharesNum) || sharesNum <= 0 || isNaN(priceNum) || priceNum <= 0 || isNaN(commissionNum) || commissionNum < 0) {
      alert("Please enter valid positive values for shares, pricing, and commissions.");
      return;
    }

    const newTx = {
      id: "tx-" + Date.now(),
      ticker: formTicker,
      type: formType,
      shares: sharesNum,
      pricePerShare: priceNum,
      date: formDate,
      commissionSgd: commissionNum
    };

    const updated = [newTx, ...transactions];
    handleSaveTransactions(updated);
    alert(`Logged ${formType} entry for ${formTicker}: ${sharesNum} shares at $${priceNum} successfully!`);
    
    // Clear inputs slightly to avoid duplicating
    setFormShares("10");
  };

  const handleDeleteTransaction = (id: string) => {
    if (confirm("Permanently delete this transaction line? Net positions will update immediately.")) {
      const updated = transactions.filter(t => t.id !== id);
      handleSaveTransactions(updated);
    }
  };

  // Compile calculations to show the user their holdings positions basis
  const getHoldingsPositions = () => {
    const positionsMap: Record<string, {
      ticker: string;
      totalSharesBought: number;
      totalSharesSold: number;
      netShares: number;
      totalCostOfBuys: number; 
      weightedAverageCost: number;
      totalCommissionSgd: number;
    }> = {};

    transactions.forEach(t => {
      if (!positionsMap[t.ticker]) {
        positionsMap[t.ticker] = {
          ticker: t.ticker,
          totalSharesBought: 0,
          totalSharesSold: 0,
          netShares: 0,
          totalCostOfBuys: 0,
          weightedAverageCost: 0,
          totalCommissionSgd: 0
        };
      }

      const p = positionsMap[t.ticker];
      p.totalCommissionSgd += t.commissionSgd;

      if (t.type === "BUY") {
        p.totalSharesBought += t.shares;
        p.totalCostOfBuys += (t.shares * t.pricePerShare) + t.commissionSgd;
      } else {
        p.totalSharesSold += t.shares;
      }
    });

    const positionsList = Object.values(positionsMap).map(p => {
      const net = p.totalSharesBought - p.totalSharesSold;
      const avgCost = p.totalSharesBought > 0 
        ? (p.totalCostOfBuys / p.totalSharesBought)
        : 0;
        
      return {
        ...p,
        netShares: net,
        weightedAverageCost: avgCost
      };
    }).filter(p => p.totalSharesBought > 0 && p.netShares > 0); // Keep open net positions

    return positionsList;
  };

  const holdingsPositions = getHoldingsPositions();

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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT SIDE: Dynamic net positions and statistics (8 column span) */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Positions Summary card Header */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-gray-50 pb-2.5">
                  <div>
                    <h2 className="text-xs font-bold text-gray-900 font-mono uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                      My Net holding Positions
                    </h2>
                    <p className="text-3xs text-gray-400 mt-1 font-sans">
                      Calculated automatically from your manual trade journal logs based on live data-feeds.
                    </p>
                  </div>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-3xs font-mono font-bold rounded">
                    YTD Ledger Base
                  </span>
                </div>

                {holdingsPositions.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 font-mono text-xs space-y-3">
                    <Briefcase className="w-10 h-10 mx-auto text-gray-300" />
                    <p>No active holding transactions recorded.</p>
                    <p className="text-3xs font-sans text-gray-400 max-w-sm mx-auto leading-relaxed">
                      Use the "Record Practical Trade" form to enter your purchases. This will compute your position sizes, weighted average cost bases, and live SGD paper gains.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {holdingsPositions.map((pos) => {
                      const stockRef = stocks.find((s) => s.ticker === pos.ticker);
                      const livePrice = stockRef ? stockRef.stats.currentPrice : pos.weightedAverageCost;
                      const companyName = stockRef ? stockRef.companyName : "Asset Holdings";
                      
                      const totalCostBasis = pos.netShares * pos.weightedAverageCost;
                      const marketValue = pos.netShares * livePrice;
                      const profitSgd = marketValue - totalCostBasis;
                      const profitPercent = totalCostBasis > 0 ? (profitSgd / totalCostBasis) * 100 : 0;
                      
                      return (
                        <div key={pos.ticker} className="p-4 border border-gray-100 rounded-xl relative hover:shadow-xs transition-all flex flex-col justify-between bg-slate-50/20">
                          <div>
                            {/* Ticker Symbol bar */}
                            <div className="flex justify-between items-start mb-2.5">
                              <div>
                                <span className="font-mono text-xs font-bold px-1.5 py-0.5 bg-indigo-55 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded uppercase">
                                  {pos.ticker}
                                </span>
                                <h3 className="text-xs font-bold text-gray-900 mt-1.5 line-clamp-1">{companyName}</h3>
                              </div>
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-3xs font-mono rounded font-semibold border border-gray-205">
                                SGD Commission: ${pos.totalCommissionSgd.toFixed(2)}
                              </span>
                            </div>

                            {/* Position Stats details */}
                            <div className="space-y-2 border-y border-gray-100/50 py-3 my-3 text-3xs font-mono text-gray-600">
                              <div className="flex justify-between">
                                <span className="text-gray-400 font-sans">Net Balance Shares:</span>
                                <strong className="text-slate-900">{pos.netShares}</strong>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400 font-sans">Weighted Cost Price:</span>
                                <strong className="text-slate-900">${pos.weightedAverageCost.toFixed(2)}</strong>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400 font-sans">Current Live Price:</span>
                                <strong className="text-indigo-650">${livePrice.toFixed(2)}</strong>
                              </div>
                              <div className="flex justify-between border-t border-dashed border-gray-100 pt-2">
                                <span className="text-gray-400 font-sans">Total Invested Cost:</span>
                                <strong className="text-slate-900">${totalCostBasis.toFixed(2)}</strong>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400 font-sans">Current Market Value:</span>
                                <strong className="text-indigo-900 font-bold">${marketValue.toFixed(2)}</strong>
                              </div>
                            </div>
                          </div>

                          {/* Gain loss calculation panel */}
                          <div className="flex justify-between items-center text-3xs border-t border-gray-50 pt-2.5 mt-2 font-mono">
                            <span className="text-gray-400 font-sans">Paper Returns:</span>
                            <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                              profitSgd >= 0 
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-100" 
                                : "bg-rose-50 text-rose-800 border border-rose-100"
                            }`}>
                              {profitSgd >= 0 ? "▲" : "▼"} ${Math.abs(profitSgd).toFixed(2)} ({profitPercent.toFixed(2)}%)
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Transactions Ledger log list table */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                <h3 className="text-xs font-bold text-gray-900 font-mono uppercase tracking-wider border-b border-gray-50 pb-2">
                  Trade Ledger History Logs
                </h3>
                
                {transactions.length === 0 ? (
                  <p className="text-3xs text-gray-400 font-mono text-center py-4">No transactional events registered.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-3xs font-mono">
                      <thead>
                        <tr className="border-b border-gray-100 text-gray-400 font-sans uppercase">
                          <th className="py-2">Date</th>
                          <th className="py-2">Ticker</th>
                          <th className="py-2">Action</th>
                          <th className="py-2 text-right">Shares</th>
                          <th className="py-2 text-right">Price per Share</th>
                          <th className="py-2 text-right">Commission (SGD)</th>
                          <th className="py-2 text-right">Net Value</th>
                          <th className="py-2 text-center">Delete</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 text-gray-700">
                        {transactions.map((tx) => {
                          const value = tx.shares * tx.pricePerShare;
                          return (
                            <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-2 text-gray-505 text-gray-500">{tx.date}</td>
                              <td className="py-2 font-bold text-slate-900">{tx.ticker}</td>
                              <td className="py-2">
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                                  tx.type === "BUY" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                                }`}>
                                  {tx.type}
                                </span>
                              </td>
                              <td className="py-2 text-right">{tx.shares}</td>
                              <td className="py-2 text-right">${tx.pricePerShare.toFixed(2)}</td>
                              <td className="py-2 text-right">${tx.commissionSgd.toFixed(2)}</td>
                              <td className="py-2 text-right font-bold text-slate-800">${value.toFixed(2)}</td>
                              <td className="py-2 text-center">
                                <button
                                  onClick={() => handleDeleteTransaction(tx.id)}
                                  className="p-1 text-gray-450 hover:text-rose-600 rounded cursor-pointer transition-colors"
                                  title="Delete Transaction"
                                >
                                  <Trash2 className="w-3.5 h-3.5 mx-auto" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>

            {/* RIGHT SIDE: Transaction Logging Form Terminal (4 column span) */}
            <div className="lg:col-span-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4 sticky top-24">
                <div>
                  <h3 className="text-xs font-bold text-gray-900 font-mono uppercase tracking-wider flex items-center gap-1">
                    <PiggyBank className="w-4 h-4 text-indigo-500" />
                    Record Ledger Trade
                  </h3>
                  <p className="text-4xs text-gray-400 mt-0.5 font-sans">
                    Update your portfolio balance sheets to capture active holdings positions.
                  </p>
                </div>

                <form onSubmit={handleAddTransaction} className="space-y-3.5">
                  {/* Stock Symbol Selection */}
                  <div className="space-y-1">
                    <label htmlFor="tx-ticker-select" className="text-4xs font-bold uppercase tracking-wider text-gray-400 font-mono block">
                      Symbol of Stock:
                    </label>
                    <select
                      id="tx-ticker-select"
                      value={formTicker}
                      onChange={(e) => setFormTicker(e.target.value)}
                      className="w-full text-xs p-2.5 border border-gray-150 rounded-xl bg-slate-50 text-gray-800 font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                    >
                      {stocks.map((s) => (
                        <option key={s.ticker} value={s.ticker}>
                          {s.ticker} — {s.companyName.slice(0, 20)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Transaction Type Toggle */}
                  <div className="space-y-1">
                    <span className="text-4xs font-bold uppercase tracking-wider text-gray-400 font-mono block">
                      Transaction Type:
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormType("BUY")}
                        className={`py-2 rounded-xl text-3xs font-bold border transition-all cursor-pointer ${
                          formType === "BUY"
                            ? "bg-green-50 border-green-500 text-green-800 shadow-xs"
                            : "bg-white border-gray-150 text-gray-400 hover:text-gray-600"
                        }`}
                      >
                        BUY
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormType("SELL")}
                        className={`py-2 rounded-xl text-3xs font-bold border transition-all cursor-pointer ${
                          formType === "SELL"
                            ? "bg-red-50 border-red-500 text-red-00 text-red-800 shadow-xs"
                            : "bg-white border-gray-150 text-gray-400 hover:text-gray-600"
                        }`}
                      >
                        SELL
                      </button>
                    </div>
                  </div>

                  {/* Number of Shares / Quantities */}
                  <div className="space-y-1">
                    <label htmlFor="tx-shares" className="text-4xs font-bold uppercase tracking-wider text-gray-400 font-mono block">
                      Number of Shares:
                    </label>
                    <input
                      id="tx-shares"
                      type="number"
                      step="any"
                      min="0.001"
                      required
                      value={formShares}
                      onChange={(e) => setFormShares(e.target.value)}
                      className="w-full text-xs p-2.5 border border-gray-150 rounded-xl bg-slate-50 font-bold focus:ring-1 focus:ring-indigo-505 focus:outline-hidden"
                      placeholder="e.g. 50"
                    />
                  </div>

                  {/* Price Per Share */}
                  <div className="space-y-1">
                    <label htmlFor="tx-price" className="text-4xs font-bold uppercase tracking-wider text-gray-400 font-mono block">
                      Price per Share (USD):
                    </label>
                    <input
                      id="tx-price"
                      type="number"
                      step="any"
                      min="0.01"
                      required
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value)}
                      className="w-full text-xs p-2.5 border border-gray-150 rounded-xl bg-slate-50 font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                      placeholder="e.g. 154.20"
                    />
                  </div>

                  {/* Broker Commission In SGD */}
                  <div className="space-y-1">
                    <label htmlFor="tx-commission" className="text-4xs font-bold uppercase tracking-wider text-gray-400 font-mono block">
                      Commission in SGD:
                    </label>
                    <input
                      id="tx-commission"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={formCommission}
                      onChange={(e) => setFormCommission(e.target.value)}
                      className="w-full text-xs p-2.5 border border-gray-150 rounded-xl bg-slate-50 font-bold focus:ring-1 focus:ring-indigo-505 focus:outline-hidden"
                      placeholder="Broker surcharge in SGD"
                    />
                  </div>

                  {/* Transaction Date */}
                  <div className="space-y-1">
                    <label htmlFor="tx-date" className="text-4xs font-bold uppercase tracking-wider text-gray-400 font-mono block">
                      Date Bought/Sold:
                    </label>
                    <input
                      id="tx-date"
                      type="date"
                      required
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full text-xs p-2.5 border border-gray-150 rounded-xl bg-slate-50 font-mono font-bold focus:outline-hidden"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold font-sans text-3xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-98 cursor-pointer mt-2"
                  >
                    Confirm & Record Trade
                  </button>
                </form>
              </div>
            </div>

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
