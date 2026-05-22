import React, { useState, useEffect } from "react";
import { Stock, DecisionState, DecisionData } from "../types";
import { 
  ArrowRightLeft, 
  CornerDownRight, 
  HelpCircle, 
  BadgeAlert, 
  TrendingUp, 
  PiggyBank, 
  Trash2,
  CalendarDays,
  CheckCircle2,
  CalendarCheck2
} from "lucide-react";

interface DecisionViewProps {
  stocks: Stock[];
  selectedTicker: string | null;
  onUpdateStock: (stock: Stock) => void;
  onNavigate: (tab: string, ticker?: string) => void;
}

export function DecisionView({ stocks, selectedTicker, onUpdateStock, onNavigate }: DecisionViewProps) {
  const [activeTicker, setActiveTicker] = useState<string>(selectedTicker || stocks[0]?.ticker || "");
  const [selectedState, setSelectedState] = useState<DecisionState>("BUY");

  // BUY sub-state
  const [positionSize, setPositionSize] = useState<number>(5);
  const [targetPrice, setTargetPrice] = useState<number>(0);
  const [stopLoss, setStopLoss] = useState<number>(0);
  const [buyReason, setBuyReason] = useState("");
  const [buyCatalyst, setBuyCatalyst] = useState("");
  const [reviewDate, setReviewDate] = useState("");

  // HOLD sub-state
  const [holdReason, setHoldReason] = useState("");
  const [holdKeyRisk, setHoldKeyRisk] = useState("");
  const [holdTrigger, setHoldTrigger] = useState("");

  // SELL sub-state
  const [sellReason, setSellReason] = useState("");
  const [realizedGain, setRealizedGain] = useState<number>(0);
  const [sellLesson, setSellLesson] = useState("");
  const [keepWatchlist, setKeepWatchlist] = useState(true);

  // Sync state if selectedTicker changes
  useEffect(() => {
    if (selectedTicker && stocks.some(s => s.ticker === selectedTicker)) {
      setActiveTicker(selectedTicker);
    }
  }, [selectedTicker, stocks]);

  const activeStock = stocks.find(s => s.ticker === activeTicker);

  // Pre-populate fields on active stock change
  useEffect(() => {
    if (activeStock) {
      setSelectedState(activeStock.decisionState);
      
      // Seed target price or stop-loss ratios based on current price if starting fresh
      const currPrice = activeStock.stats.currentPrice;
      if (activeStock.decisionState === "BUY" && activeStock.decisionData) {
        setPositionSize(activeStock.decisionData.positionSizePercent || 5);
        setTargetPrice(activeStock.decisionData.targetPrice || Math.round(currPrice * 1.3));
        setStopLoss(activeStock.decisionData.stopLoss || Math.round(currPrice * 0.8));
        setBuyReason(activeStock.decisionData.buyReason || "");
        setBuyCatalyst(activeStock.decisionData.buyExpectedCatalyst || "");
        setReviewDate(activeStock.nextReviewDate || "2026-07-01");
      } else {
        setTargetPrice(Math.round(currPrice * 1.3));
        setStopLoss(Math.round(currPrice * 0.8));
        setReviewDate("2026-07-01");
      }

      if (activeStock.decisionState === "HOLD" && activeStock.decisionData) {
        setHoldReason(activeStock.decisionData.holdReason || "");
        setHoldKeyRisk(activeStock.decisionData.holdKeyRisk || "");
        setHoldTrigger(activeStock.decisionData.holdTrigger || "");
      } else {
        setHoldReason("");
        setHoldKeyRisk("");
        setHoldTrigger("");
      }

      if (activeStock.decisionState === "SELL" && activeStock.decisionData) {
        setSellReason(activeStock.decisionData.sellReason || "");
        setRealizedGain(activeStock.decisionData.realizedGainPercent || 0);
        setSellLesson(activeStock.decisionData.sellLesson || "");
        setKeepWatchlist(activeStock.decisionData.keepOnWatchlist !== false);
      } else {
        setSellReason("");
        setRealizedGain(0);
        setSellLesson("");
        setKeepWatchlist(true);
      }
    }
  }, [activeStock]);

  if (!activeStock) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-gray-100 font-mono text-xs text-gray-400">
        No stocks in watchlist. Please navigate to 'Watchlist Onboarding' tab.
      </div>
    );
  }

  const handleConfirmDecision = (e: React.FormEvent) => {
    e.preventDefault();

    let mergedData: DecisionData = {};
    let nextReviewDate = activeStock.nextReviewDate;

    if (selectedState === "BUY") {
      mergedData = {
        positionSizePercent: positionSize,
        targetPrice,
        stopLoss,
        buyReason,
        buyExpectedCatalyst: buyCatalyst,
        decidedAt: new Date().toISOString()
      };
      nextReviewDate = reviewDate || "2026-06-30";
    } else if (selectedState === "HOLD") {
      mergedData = {
        holdReason,
        holdKeyRisk,
        holdTrigger,
        decidedAt: new Date().toISOString()
      };
      nextReviewDate = reviewDate || "2026-07-30";
    } else if (selectedState === "SELL") {
      mergedData = {
        sellReason,
        realizedGainPercent: realizedGain,
        sellLesson,
        keepOnWatchlist: keepWatchlist,
        decidedAt: new Date().toISOString()
      };
      // If sell and delete watchlist entirely, route to WATCHLIST with REJECT class or let other tab handle deletion
      nextReviewDate = undefined;
    } else if (selectedState === "REVIEW") {
      nextReviewDate = new Date(Date.now() + 1000*60*60*24*30).toISOString().slice(0, 10); // +1 month
    }

    onUpdateStock({
      ...activeStock,
      decisionState: selectedState,
      nextReviewDate,
      decisionData: mergedData
    });

    // Notify & route directly to portfolio
    onNavigate("portfolio");
  };

  return (
    <div className="space-y-6">
      
      {/* Title block */}
      <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 flex items-center gap-2">
            <ArrowRightLeft className="w-6 h-6 text-indigo-500" />
            BUY / HOLD / SELL Decision Room
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Execute final pipeline routing (BUY, HOLD, SELL, REVIEW). System structures will save timestamps and automatically configure tracking logs.
          </p>
        </div>

        {/* Focus stock dropdown */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <label className="text-gray-400 font-semibold font-sans">Active Target:</label>
          <select
            value={activeTicker}
            onChange={(e) => setActiveTicker(e.target.value)}
            className="p-2 border border-gray-150 rounded-xl bg-slate-50 text-gray-800 font-bold focus:outline-hidden"
          >
            {stocks.map((s) => (
              <option key={s.ticker} value={s.ticker}>
                {s.ticker} - {s.companyName.slice(0, 15)} (Asym: {s.asymmetry.asymmetryScore})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Flow routing selectors & Current Price data card */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
            
            <div>
              <span className="text-3xs font-mono font-bold text-gray-400 uppercase">focus safety stats</span>
              <h2 className="text-xl font-bold font-display text-gray-950 mt-0.5">{activeStock.ticker} Context Check</h2>
              <p className="text-2xs text-gray-400 mt-0.5">{activeStock.companyName}</p>
            </div>

            <div className="p-4 bg-slate-50/70 border border-slate-100 rounded-xl space-y-2.5 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400 font-sans">Current Price:</span>
                <strong className="text-gray-900 font-bold font-mono">${activeStock.stats.currentPrice}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 font-sans">Theme:</span>
                <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-3xs font-bold rounded uppercase">{activeStock.theme}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 font-sans">Asymmetry Score:</span>
                <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 font-bold text-3xs rounded">{activeStock.asymmetry.asymmetryScore || "Not scored"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 font-sans">52W Range:</span>
                <span className="text-gray-700 font-mono text-3xs">${activeStock.stats.low52w} - ${activeStock.stats.high52w}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-4xs font-mono font-bold text-gray-400 uppercase">Consensus Anchor Classification</span>
              <p className="text-3xs text-gray-700 italic border-l-2 border-indigo-200 pl-2">
                Scored as a <strong className="capitalize underline">{activeStock.anchorClassification.replace("_", " ")}</strong>. 
                {activeStock.scores.valuationRisk <= 2 ? " High valuation risk requires a stricter stop-loss strategy." : " Reasonable multiples present high margin of safety."}
              </p>
            </div>
          </div>

          {/* Decision States selection buttons */}
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-3">
            <h3 className="text-xs font-semibold text-gray-900 font-mono uppercase tracking-wider">Execute State Change</h3>
            
            <div className="grid grid-cols-2 gap-2 text-2xs font-bold font-mono">
              <button
                type="button"
                onClick={() => setSelectedState("BUY")}
                className={`p-3 rounded-lg border transition-all text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                  selectedState === "BUY"
                  ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                  : "border-gray-50 bg-white hover:bg-slate-50 text-gray-400"
                }`}
              >
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                BUY POSITION
              </button>

              <button
                type="button"
                onClick={() => setSelectedState("HOLD")}
                className={`p-3 rounded-lg border transition-all text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                  selectedState === "HOLD"
                  ? "border-amber-500 bg-amber-50 text-amber-800"
                  : "border-gray-50 bg-white hover:bg-slate-50 text-gray-400"
                }`}
              >
                <CalendarDays className="w-4 h-4 text-amber-600" />
                HOLD STATE
              </button>

              <button
                type="button"
                onClick={() => setSelectedState("SELL")}
                className={`p-3 rounded-lg border transition-all text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                  selectedState === "SELL"
                  ? "border-rose-500 bg-rose-50 text-rose-800"
                  : "border-gray-50 bg-white hover:bg-slate-50 text-gray-400"
                }`}
              >
                <PiggyBank className="w-4 h-4 text-rose-600" />
                SELL CLOSEOUT
              </button>

              <button
                type="button"
                onClick={() => setSelectedState("REVIEW")}
                className={`p-3 rounded-lg border transition-all text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                  selectedState === "REVIEW"
                  ? "border-blue-500 bg-blue-50 text-blue-800"
                  : "border-gray-50 bg-white hover:bg-slate-50 text-gray-400"
                }`}
              >
                <CalendarCheck2 className="w-4 h-4 text-blue-600" />
                REVIEW STATE
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Form depending on routing selection */}
        <div className="lg:col-span-8 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <form onSubmit={handleConfirmDecision} className="space-y-5 text-xs text-gray-650">
            <h3 className="text-sm font-semibold text-gray-900 border-b border-gray-50 pb-2.5 font-mono uppercase tracking-wider">
              {selectedState} Parameters Workflow
            </h3>

            {/* Form Fields: BUY */}
            {selectedState === "BUY" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-gray-700">Position Size (%)</label>
                    <input
                      required
                      type="number" min="1" max="100"
                      value={positionSize}
                      onChange={(e) => setPositionSize(parseInt(e.target.value) || 5)}
                      className="w-full p-2 border border-gray-150 rounded-lg focus:outline-hidden"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="font-semibold text-gray-700">Target price ($)</label>
                    <input
                      required
                      type="number" step="any"
                      value={targetPrice}
                      onChange={(e) => setTargetPrice(parseFloat(e.target.value) || 0)}
                      className="w-full p-2 border border-gray-150 rounded-lg focus:outline-hidden font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-gray-700">Stop-Loss ($)</label>
                    <input
                      required
                      type="number" step="any"
                      value={stopLoss}
                      onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
                      className="w-full p-2 border border-gray-150 rounded-lg focus:outline-hidden font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-gray-700">Expected Catalyst to monitor</label>
                    <input
                      required
                      type="text"
                      value={buyCatalyst}
                      onChange={(e) => setBuyCatalyst(e.target.value)}
                      placeholder="E.g., GPU Blackwell Ultra volume release dates"
                      className="w-full p-2 border border-gray-150 rounded-lg focus:outline-hidden font-sans"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-gray-700">Review Schedule Target Date</label>
                    <input
                      required
                      type="date"
                      value={reviewDate}
                      onChange={(e) => setReviewDate(e.target.value)}
                      className="w-full p-2 border border-gray-150 rounded-lg focus:outline-hidden font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-gray-700">Core Investment Thesis Reasons</label>
                  <textarea
                    required
                    value={buyReason}
                    onChange={(e) => setBuyReason(e.target.value)}
                    rows={4}
                    placeholder="Provide 2-3 sentences summing up physical lock-ins, demand queues, and grid-access advantages..."
                    className="w-full p-2.5 border border-gray-155 rounded-lg focus:outline-hidden text-xs font-sans text-gray-800"
                  />
                </div>
              </div>
            )}

            {/* Form Fields: HOLD */}
            {selectedState === "HOLD" && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-gray-700">Reasons to HOLD (Valuation risk or weak catalyst?)</label>
                  <textarea
                    required
                    value={holdReason}
                    onChange={(e) => setHoldReason(e.target.value)}
                    rows={3}
                    placeholder="E.g., Fundamentals remain supreme, but short-term price fully captures margins."
                    className="w-full p-2.5 border border-gray-155 rounded-lg focus:outline-hidden text-xs font-sans text-gray-800"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-gray-700">Primary Key Risk to monitoring</label>
                    <input
                      required
                      type="text"
                      value={holdKeyRisk}
                      onChange={(e) => setHoldKeyRisk(e.target.value)}
                      placeholder="E.g., Hyperscalers slowing CapEx budgets"
                      className="w-full p-2 border border-gray-150 rounded-lg focus:outline-hidden font-sans"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-gray-700">Expected trigger to BUY more or SELL (Threshold price or event)</label>
                    <input
                      required
                      type="text"
                      value={holdTrigger}
                      onChange={(e) => setHoldTrigger(e.target.value)}
                      placeholder="E.g., Consolidation below $120, or nuclear approvals"
                      className="w-full p-2 border border-gray-150 rounded-lg focus:outline-hidden font-sans"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-gray-700">Safety Review Target date</label>
                  <input
                    required
                    type="date"
                    value={reviewDate}
                    onChange={(e) => setReviewDate(e.target.value)}
                    className="w-full p-2 border border-gray-150 rounded-lg focus:outline-hidden font-mono text-xs"
                  />
                </div>
              </div>
            )}

            {/* Form Fields: SELL */}
            {selectedState === "SELL" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-gray-700">Reasons for selling (Excessive multiples, macro shift, or target hit?)</label>
                    <textarea
                      required
                      value={sellReason}
                      onChange={(e) => setSellReason(e.target.value)}
                      rows={3}
                      placeholder="Target price hit, rotated fully into clean-energy alternatives."
                      className="w-full p-2.5 border border-gray-155 rounded-lg focus:outline-hidden text-xs text-gray-800"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-gray-700">Realised overall Gain / Loss (%)</label>
                    <input
                      required
                      type="number"
                      value={realizedGain}
                      onChange={(e) => setRealizedGain(parseInt(e.target.value) || 0)}
                      className="w-full p-2 border border-gray-150 rounded-lg focus:outline-hidden font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-gray-700">Key lessons learned from lifecycle</label>
                  <textarea
                    required
                    value={sellLesson}
                    onChange={(e) => setSellLesson(e.target.value)}
                    rows={3}
                    placeholder="Take profits incrementally during parabolic chip yield upgrade releases."
                    className="w-full p-2.5 border border-gray-155 rounded-lg focus:outline-hidden text-xs text-gray-800 font-sans"
                  />
                </div>

                <div className="flex items-center gap-2 font-mono text-2xs select-none">
                  <input
                    type="checkbox"
                    id="chkKeepWatch"
                    checked={keepWatchlist}
                    onChange={(e) => setKeepWatchlist(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
                  />
                  <label htmlFor="chkKeepWatch" className="text-gray-500 font-semibold font-sans cursor-pointer">
                    Retain this asset on the Watchlist for future lower-buying checks?
                  </label>
                </div>
              </div>
            )}

            {/* Form Fields: REVIEW */}
            {selectedState === "REVIEW" && (
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl space-y-2">
                <h4 className="font-bold text-indigo-950 flex items-center gap-1">
                  <CornerDownRight className="w-4 h-4 text-indigo-600" /> Confirm Immediate Review Route
                </h4>
                <p className="text-3xs text-indigo-800 leading-relaxed font-sans">
                  The Review state tells the system to store this asset inside the Review Queue. An automatic 1-month reminder will be written to flag checkups, allowing you to re-evaluate scoring variables before deploying position size parameters.
                </p>
              </div>
            )}

            {/* Submit Block */}
            <div className="border-t border-gray-50 pt-4 flex justify-end gap-3 font-sans">
              <button
                type="button"
                onClick={() => onNavigate("portfolio")}
                className="px-4 py-2 text-xs border border-gray-100 font-semibold rounded-lg bg-slate-50 text-gray-700 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs cursor-pointer hover:shadow-sm"
              >
                Confirm State Transition
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
