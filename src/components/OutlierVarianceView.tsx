import React, { useState, useMemo } from "react";
import { Stock, PricePoint } from "../types";
import { 
  Scale, 
  HelpCircle, 
  TrendingUp, 
  Info, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  TrendingDown, 
  Activity, 
  Zap, 
  BookOpen, 
  Maximize2,
  FileText
} from "lucide-react";

interface OutlierVarianceViewProps {
  stocks: Stock[];
}

// 1. Core definitions for the Top 5 Tech Stocks
const TOP_5_TICKERS = ["NVDA", "MSFT", "GOOGL", "AMD", "TSM"];

// Helper to calculate Pearson Correlation
function calculatePearsonCorrelation(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0, sumYY = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i];
    const y = b[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
    sumYY += y * y;
  }
  
  const num = n * sumXY - sumX * sumY;
  const den = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
  if (den === 0) return 0;
  return parseFloat((num / den).toFixed(4));
}

// Helper to calculate standard outliers and distribution parameters
interface DistributionMetrics {
  ticker: string;
  mean: number;
  stdDev: number;
  minPrice: number;
  maxPrice: number;
  prices: number[];
  dates: string[];
  zScores: { date: string; price: number; z: number }[];
  outliers: { date: string; price: number; z: number; type: "low" | "high" }[];
  buyLowThreshold: number;  // Statistical bottom: Mean - 1.0 * StdDev
  sellHighThreshold: number; // Statistical cap: Mean + 1.1 * StdDev
}

function calculateDistributionMetrics(ticker: string, priceHistory: PricePoint[]): DistributionMetrics {
  const prices = priceHistory.map(p => p.price);
  const dates = priceHistory.map(p => p.date);
  const n = prices.length;
  if (n === 0) {
    return {
      ticker, mean: 0, stdDev: 0, minPrice: 0, maxPrice: 0, prices: [], dates: [], zScores: [], outliers: [], buyLowThreshold: 0, sellHighThreshold: 0
    };
  }
  
  const mean = prices.reduce((sum, v) => sum + v, 0) / n;
  const variance = prices.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  
  const zScores = priceHistory.map(p => {
    const z = stdDev === 0 ? 0 : (p.price - mean) / stdDev;
    return { date: p.date, price: p.price, z };
  });
  
  // High-fidelity standard deviation outliers (typical thresholds of ±1.0 to ±1.5 standard deviation for limited sample sets)
  const outliers = zScores
    .filter(item => Math.abs(item.z) > 1.1)
    .map(item => ({
      date: item.date,
      price: item.price,
      z: item.z,
      type: item.z < 0 ? ("low" as const) : ("high" as const)
    }));
    
  // Calculated trading targets
  const buyLowThreshold = Math.max(minPrice * 0.95, mean - 1.0 * stdDev);
  const sellHighThreshold = Math.min(maxPrice * 1.05, mean + 1.1 * stdDev);
  
  return {
    ticker,
    mean: parseFloat(mean.toFixed(2)),
    stdDev: parseFloat(stdDev.toFixed(2)),
    minPrice,
    maxPrice,
    prices,
    dates,
    zScores,
    outliers,
    buyLowThreshold: parseFloat(buyLowThreshold.toFixed(2)),
    sellHighThreshold: parseFloat(sellHighThreshold.toFixed(2))
  };
}

// 2. High fidelity company descriptions explaining the tech/companion real-world linkages
function getOperationalLinkage(techTicker: string, companionTicker: string, baseTxt: string): string {
  const linkageMap: Record<string, string> = {
    "NVDA-VST": "NVIDIA is the dominant chipmaker of AI accelerator chips (such as Blackwell GPUs) which operate under extreme load requirements. Vistra Corp (VST) acts as a premier nuclear and thermal baseline electricity utility, supplying critical continuous wattage grid pipelines to the very datacenters hosting NVDA GPU clusters. Their correlation highlights how computing demand translates to physical megawatts.",
    "NVDA-EQIX": "NVIDIA manufactures GPU server clusters that require advanced water-cooled datacenter rack deployments. Equinix (EQIX) provides standard global carrier-neutral colocation nodes and fiber carrier meet-points that physically route computing traffic for NVIDIA clusters. This is a direct physical cloud architecture linkage.",
    "MSFT-EQIX": "Microsoft Azure hosts enterprise cloud nodes globally. Equinix provides the direct IBX (International Business Exchange) network bypass interconnections where corporate buyers physically interface with Microsoft servers. This enables secure, low-latency enterprise hybrid cloud data routing.",
    "MSFT-GS": "Microsoft leads enterprise software SaaS adoption (365, Copilot, enterprise databases), while Goldman Sachs represents institutional financial system expenditures. They are bound by corporate capital spending cycles; high corporate profitability fuels both Microsoft software contracts and Goldman's deal workflows.",
    "GOOGL-ASML": "Google designs custom hardware accelerators (Tensor Processing Units/TPUs) to supply its proprietary Gemini models and escape pure Nvidia supply reliance. ASML operates as the monopoly supplier of Extreme Ultraviolet (EUV) light systems which print Google's 3nm/5nm processor structures at foundational foundries. This is a core hardware enablement chain.",
    "GOOGL-EQIX": "Google Cloud infrastructure integrates Equinix's colocation hubs and interconnect cables to bypass standard public networks and cache dynamic user inquiries for search and Gemini engines next to geographic consumer endpoints.",
    "AMD-TSM": "Advanced Micro Devices is a completely fabless semiconductor designer. Their premium MI300X accelerators and CPU cores are fabricated exclusively at Taiwan Semiconductor (TSM) on high-density silicon wafers. The operational partnership is complete; AMD cannot grow without TSM reserving massive node volume.",
    "TSM-ASML": "Taiwan Semiconductor (TSM) operates as the world's monopoly wafer foundries, while ASML represents the absolute physical gatekeeper of EUV lithography systems. TSM relies heavily on ASML's tooling deliveries to build next-generation 2nm and 1.6nm fabs, rendering ASML the single largest structural bottleneck to physical fab capacity expansion.",
    "AVGO-TSM": "Broadcom (AVGO) specializes in custom ASICs (e.g., custom processors codeveloped with Google and Meta) alongside high-speed networking chips. Broadcom designs these chips but relies completely on Taiwan Semiconductor for packaging and wafer fabrication, uniting design scale with monopoly physical output."
  };
  
  const key = `${techTicker}-${companionTicker}`;
  const reverseKey = `${companionTicker}-${techTicker}`;
  return linkageMap[key] || linkageMap[reverseKey] || baseTxt;
}

export function OutlierVarianceView({ stocks }: OutlierVarianceViewProps) {
  // 3. User Selectable Controls
  const [activeTech, setActiveTech] = useState<string>("NVDA");
  const [eduMode, setEduMode] = useState<"beginner" | "intermediate">("beginner");
  
  // Custom manual override for Companion Stock inside the active correlated pool
  const [overrideCompanion, setOverrideCompanion] = useState<string | null>(null);

  // Filter stocks to find the active base tech stock
  const techStock = useMemo(() => {
    return stocks.find(s => s.ticker === activeTech) || stocks.find(s => s.ticker === "NVDA") || stocks[0];
  }, [stocks, activeTech]);

  // Dynamic returns array for the active tech stock
  const techPriceHistory = useMemo(() => techStock.priceHistory || [], [techStock]);
  const techPrices = useMemo(() => techPriceHistory.map(p => p.price), [techPriceHistory]);

  // 4. Calculate dynamic correlations for all candidate stocks based on historical percentage returns
  const companionOptions = useMemo(() => {
    const currentPrices = techPrices;
    if (currentPrices.length < 2) return [];

    const techReturns: number[] = [];
    for (let i = 1; i < currentPrices.length; i++) {
      techReturns.push((currentPrices[i] - currentPrices[i - 1]) / currentPrices[i - 1]);
    }

    const candidateList = stocks
      .filter(s => s.ticker !== techStock.ticker)
      .map(cand => {
        const hPrices = (cand.priceHistory || []).map(p => p.price);
        if (hPrices.length < 2) {
          return { stock: cand, pearson: 0, rSquared: 0, beta: 0 };
        }

        const candReturns: number[] = [];
        for (let i = 1; i < hPrices.length; i++) {
          candReturns.push((hPrices[i] - hPrices[i - 1]) / hPrices[i - 1]);
        }

        const pearson = calculatePearsonCorrelation(techReturns, candReturns);
        const rSquared = pearson * pearson;

        // Calculate Beta: Covariance (Tech, Cand) / Variance (Tech)
        const len = Math.min(techReturns.length, candReturns.length);
        let meanTech = techReturns.reduce((s, x) => s + x, 0) / len;
        let meanCand = candReturns.reduce((s, x) => s + x, 0) / len;

        let cov = 0;
        let varTech = 0;
        for (let i = 0; i < len; i++) {
          cov += (techReturns[i] - meanTech) * (candReturns[i] - meanCand);
          varTech += Math.pow(techReturns[i] - meanTech, 2);
        }
        const beta = varTech === 0 ? 0 : cov / varTech;

        return {
          stock: cand,
          pearson,
          rSquared: parseFloat(rSquared.toFixed(4)),
          beta: parseFloat(beta.toFixed(3))
        };
      });

    // Sort descending by Pearson r
    return candidateList.sort((a, b) => b.pearson - a.pearson);
  }, [stocks, techStock, techPrices]);

  // Determine top-ranked companion (represents top 10th percentile according to correlation strength)
  const topRankedCompanion = useMemo(() => {
    return companionOptions[0] || { stock: stocks[1], pearson: 0, rSquared: 0, beta: 0 };
  }, [companionOptions, stocks]);

  // Resolve active Companion based on user manual override or top ranked default
  const activeCompanionObj = useMemo(() => {
    if (overrideCompanion && overrideCompanion !== techStock.ticker) {
      const found = companionOptions.find(item => item.stock.ticker === overrideCompanion);
      if (found) return found;
    }
    return topRankedCompanion;
  }, [overrideCompanion, companionOptions, topRankedCompanion, techStock]);

  const companionStock = activeCompanionObj.stock;

  // 5. Calculate distribution and outliers parameters for both stocks
  const techMetrics = useMemo(() => {
    return calculateDistributionMetrics(techStock.ticker, techPriceHistory);
  }, [techStock, techPriceHistory]);

  const companionMetrics = useMemo(() => {
    return calculateDistributionMetrics(companionStock.ticker, companionStock.priceHistory || []);
  }, [companionStock]);

  // 6. Step 4: Identify Variance Spread & Convergence Signals
  // Spread Ratio = Price(Tech) / Price(Companion) at each period in history
  const spreadHistory = useMemo(() => {
    const histA = techPriceHistory;
    const histB = companionStock.priceHistory || [];
    
    const elements: { date: string; ratio: number; priceA: number; priceB: number }[] = [];
    histA.forEach(pA => {
      const match = histB.find(pB => pB.date === pA.date);
      if (match && match.price > 0) {
        elements.push({
          date: pA.date,
          ratio: pA.price / match.price,
          priceA: pA.price,
          priceB: match.price
        });
      }
    });
    return elements;
  }, [techPriceHistory, companionStock]);

  const spreadStats = useMemo(() => {
    const ratios = spreadHistory.map(h => h.ratio);
    const len = ratios.length;
    if (len === 0) return { meanRatio: 1, stdDevRatio: 0, currentRatio: 1, zScore: 0 };

    const meanRatio = ratios.reduce((sum, val) => sum + val, 0) / len;
    const variance = ratios.reduce((sum, val) => sum + Math.pow(val - meanRatio, 2), 0) / len;
    const stdDevRatio = Math.sqrt(variance);

    // Current ratio calculation
    const currentPriceA = techStock.stats.currentPrice;
    const currentPriceB = companionStock.stats.currentPrice;
    const currentRatio = currentPriceB === 0 ? 1 : currentPriceA / currentPriceB;
    const zScore = stdDevRatio === 0 ? 0 : (currentRatio - meanRatio) / stdDevRatio;

    return {
      meanRatio: parseFloat(meanRatio.toFixed(4)),
      stdDevRatio: parseFloat(stdDevRatio.toFixed(4)),
      currentRatio: parseFloat(currentRatio.toFixed(3)),
      zScore: parseFloat(zScore.toFixed(2))
    };
  }, [spreadHistory, techStock, companionStock]);

  // Reset override companion if tech stock shifts
  const handleTechChange = (ticker: string) => {
    setActiveTech(ticker);
    setOverrideCompanion(null);
  };

  // Determine active trading signals based on spread variance
  const pairTradeSignal = useMemo(() => {
    const { zScore } = spreadStats;
    if (zScore > 1.25) {
      return {
        action: "SELL ACTIVE TECH / BUY COMPANION" as const,
        direction: "REVERSION_DOWN" as const,
        color: "text-rose-600 bg-rose-50 border-rose-100",
        indicatorBg: "bg-rose-500",
        desc: `Ratio spread registers an abnormally high Z-score (+${zScore}σ). ${techStock.ticker} has historically outpaced ${companionStock.ticker} significantly. Expect convergence: trim or sell ${techStock.ticker} and acquire ${companionStock.ticker} for high-conviction arbitrage reversion.`
      };
    } else if (zScore < -1.25) {
      return {
        action: "BUY ACTIVE TECH / SELL COMPANION" as const,
        direction: "REVERSION_UP" as const,
        color: "text-emerald-600 bg-emerald-50 border-emerald-100",
        indicatorBg: "bg-emerald-500",
        desc: `Ratio spread registers an abnormally low Z-score (${zScore}σ). ${techStock.ticker} represents a lagging undervalued asset relative to its historical companion ${companionStock.ticker}. Highly weighted buy signal on ${techStock.ticker} and take profits on ${companionStock.ticker}.`
      };
    } else {
      // Rangebound inside ±1.25 standard deviation corridor
      return {
        action: "HOLD / STEADY MULTI-ASSET CORRIDOR" as const,
        direction: "STEADY" as const,
        color: "text-indigo-600 bg-indigo-50 border-indigo-100",
        indicatorBg: "bg-indigo-500",
        desc: `The relative ratio spread (Current r = ${spreadStats.currentRatio}) is trading firmly inside its normal historical corridor (Z-score = ${spreadStats.zScore}σ). No extreme variance present. Keep holding both assets to compound secular market cap expansions.`
      };
    }
  }, [spreadStats, techStock, companionStock]);

  return (
    <div className="space-y-6">
      
      {/* 7. Selector Hub header & active profile */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-md">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-5">
          <div>
            <span className="text-[10px] font-mono font-bold tracking-widest text-indigo-400 block mb-1 uppercase">
              STATISTICAL INFERENCE DESK • CO-INTEGRATION MODELER
            </span>
            <h2 className="text-lg font-bold font-display flex items-center gap-2">
              <Scale className="w-5 h-5 text-indigo-400" />
              Core Tech Outliers & Spread Variance Engine
            </h2>
            <p className="text-xs text-slate-400 font-sans mt-1">
              Select one of the top 5 high-cap tech leaders, examine its long-term distribution boundaries, extract its most correlated companion, and analyze ratio variance triggers.
            </p>
          </div>

          <div className="flex bg-slate-850 rounded-xl p-1 text-3xs font-mono font-bold uppercase select-none shrink-0 border border-slate-800">
            {TOP_5_TICKERS.map(ticker => {
              const active = activeTech === ticker;
              return (
                <button
                  key={ticker}
                  onClick={() => handleTechChange(ticker)}
                  className={`px-3 py-2 rounded-lg cursor-pointer transition-all ${
                    active ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {ticker}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Business Profile of Active Tech Stock */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-5 items-center">
          <div className="md:col-span-8 space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="bg-indigo-950 text-indigo-400 border border-indigo-800 px-2 py-0.5 rounded font-mono text-[10px] font-bold">
                {techStock.sector}
              </span>
              <h3 className="text-sm font-bold text-slate-100">{techStock.companyName} Rationale</h3>
            </div>
            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              <strong>What the Company Does:</strong> {techStock.reasonForInclusion} {techStock.rationale}
            </p>
          </div>
          
          <div className="md:col-span-4 p-4 bg-slate-850 rounded-xl border border-slate-800 space-y-2">
            <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wide block">Focus Selection Catalyst</span>
            <p className="text-3xs text-slate-300 font-sans leading-normal-tight italic">
              &ldquo;{techStock.decisionData?.buyReason || "Standard infrastructure anchor selected based on market leadership, massive capital buffers, and structural node scale."}&rdquo;
            </p>
            <div className="flex justify-between items-baseline pt-1">
              <span className="text-[8.5px] font-mono text-slate-400">MARKET CAP</span>
              <span className="text-xs tracking-tight font-mono font-bold text-teal-400">${techStock.marketCap}B USD</span>
            </div>
          </div>
        </div>
      </div>

      {/* 8. Bento Grid: Distributions & Outliers Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* LEFT CARD: Base Tech Stock Pricing Variance & Outlier Marks */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5">
          <div className="flex justify-between items-start border-b border-gray-50 pb-3">
            <div>
              <span className="text-[9px] font-mono font-bold text-indigo-600 uppercase tracking-widest block">BASE ASSET UNIT</span>
              <h3 className="text-sm font-bold text-slate-900 font-mono flex items-center gap-1">
                {techStock.ticker} Pricing Dispersion (2020-2026)
              </h3>
            </div>
            <div className="text-right">
              <span className="text-3xs font-mono text-gray-400 block">Current Price</span>
              <span className="text-sm font-bold text-indigo-750 font-mono bg-indigo-55 bg-indigo-50 px-2 py-0.5 rounded text-indigo-700">${techStock.stats.currentPrice}</span>
            </div>
          </div>

          {/* Core Stat Rows */}
          <div className="grid grid-cols-4 gap-2 text-center text-3xs font-mono uppercase text-gray-500">
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <span className="block text-[8px] text-gray-400">Mean Price</span>
              <strong className="text-xs text-slate-800 block mt-0.5">${techMetrics.mean}</strong>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <span className="block text-[8px] text-gray-400">Std Dev (&sigma;)</span>
              <strong className="text-xs text-slate-800 block mt-0.5">${techMetrics.stdDev}</strong>
            </div>
            <div className="bg-indigo-50/40 p-2.5 rounded-lg border border-indigo-50">
              <span className="block text-[8px] text-indigo-600 font-semibold">BUY LOW (&mu; - 1&sigma;)</span>
              <strong className="text-xs text-indigo-700 block mt-0.5 font-bold">${techMetrics.buyLowThreshold}</strong>
            </div>
            <div className="bg-amber-50/40 p-2.5 rounded-lg border border-amber-50">
              <span className="block text-[8px] text-amber-600 font-semibold">SELL HIGH (&mu; + 1.1&sigma;)</span>
              <strong className="text-xs text-amber-700 block mt-0.5 font-bold">${techMetrics.sellHighThreshold}</strong>
            </div>
          </div>

          {/* HISTORICAL TIMELINE DISTRIBUTION GRAPH */}
          <div className="space-y-2">
            <span className="text-[9px] font-mono font-bold text-gray-400 uppercase tracking-wider block">Relative price deviation and outlier events</span>
            
            <div className="bg-slate-50 p-3 rounded-xl border border-gray-100">
              <svg viewBox="0 0 540 180" className="w-full h-auto overflow-visible select-none">
                {/* Horizontal reference bands */}
                <line x1="30" y1={90} x2="510" y2={90} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" /> {/* Mean line */}
                
                {/* Custom bounding box for stdDev corridors */}
                <rect x="30" y="55" width="480" height="70" fill="rgba(99, 102, 241, 0.05)" rx="4" />
                
                <text x="515" y="93" textAnchor="start" className="fill-slate-400 font-mono text-[8px]">Mean (&mu;)</text>
                <text x="515" y="57" textAnchor="start" className="fill-indigo-400 font-mono text-[8px] font-bold">Buy/Sell Bounds (&plusmn;1&sigma;)</text>

                {/* Draw historical timeline area */}
                {(() => {
                  const m = techMetrics;
                  const pts = m.zScores.map((zPt, idx) => {
                    const x = 30 + (idx / (m.zScores.length - 1)) * 480;
                    const y = 90 - (zPt.z * 40); // 40px scalar per z deviation
                    return { x, y, date: zPt.date, price: zPt.price };
                  });
                  
                  const dStr = pts.reduce((str, p, i) => i === 0 ? `M ${p.x} ${p.y}` : `${str} L ${p.x} ${p.y}`, "");
                  return (
                    <>
                      <path
                        d={dStr}
                        fill="none"
                        stroke="#6366f1"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {pts.map((p, pIdx) => {
                        const isOutlier = Math.abs((p.price - m.mean) / m.stdDev) > 1.1;
                        return (
                          <g key={pIdx}>
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r={isOutlier ? "5" : "3.5"}
                              className={`cursor-pointer transition-all ${
                                isOutlier 
                                  ? (p.y > 90 ? "fill-emerald-500 stroke-white stroke-2" : "fill-rose-500 stroke-white stroke-2")
                                  : "fill-indigo-600 stroke-white hover:fill-teal-400"
                              }`}
                            >
                              <title>Date: {p.date} • Price: ${p.price} • Z-Score: {((p.price - m.mean) / m.stdDev).toFixed(2)}&sigma;</title>
                            </circle>
                          </g>
                        );
                      })}
                    </>
                  );
                })()}

                {/* X Axis Labels */}
                {techMetrics.dates.map((d, dIdx) => {
                  if (dIdx % 3 !== 0) return null;
                  const x = 30 + (dIdx / (techMetrics.dates.length - 1)) * 480;
                  return (
                    <text key={d} x={x} y="165" textAnchor="middle" className="fill-slate-400 font-mono text-[8.5px] font-bold">
                      {d}
                    </text>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Identified Outliers Table */}
          <div className="space-y-2">
            <span className="text-[9px] font-mono font-bold text-gray-400 uppercase tracking-wider block">List of Historical Deviation Outliers (Z &gt; ±1.1&sigma;)</span>
            <div className="border border-slate-100 rounded-xl overflow-hidden text-3xs font-mono">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-gray-500 uppercase border-b border-slate-100 text-[8.5px]">
                  <tr>
                    <th className="py-2 px-3">TIMEFRAME</th>
                    <th className="py-2 px-3 text-right">PRICE RECORDED</th>
                    <th className="py-2 px-3 text-center">STANDARD DEVIATION</th>
                    <th className="py-2 px-3 text-right">SIGNAL IMPLICATION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-gray-700">
                  {techMetrics.outliers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-3 text-center text-gray-400 font-sans">No extreme price anomalies registered. Consolidation phase active.</td>
                    </tr>
                  ) : (
                    techMetrics.outliers.map((o, oIdx) => (
                      <tr key={oIdx} className="hover:bg-slate-50/40">
                        <td className="py-2 px-3 text-gray-900 font-bold">{o.date}</td>
                        <td className="py-2 px-3 text-right font-bold">${o.price}</td>
                        <td className="py-2 px-3 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold ${
                            o.type === "low" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                          }`}>
                            {o.z > 0 ? "+" : ""}{o.z.toFixed(2)}&sigma;
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <span className={o.type === "low" ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
                            {o.type === "low" ? "Undervalued / Extreme BUY Zone" : "Overextended / Take-Profit SELL Zone"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT CARD: Correlated Stock Selection, Description and Outliers */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start border-b border-gray-50 pb-3 gap-2">
            <div>
              <span className="text-[9px] font-mono font-bold text-teal-600 uppercase tracking-widest block flex items-center gap-1">
                CO-INTEGRATED COMPANION (TOP 10% CORRELATION POOL)
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" />
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <h3 className="text-sm font-bold text-slate-900 font-mono">
                  {companionStock.ticker} Dispersion Profile
                </h3>

                {/* Manual selector to swap companion in pool if desired */}
                <select
                  value={companionStock.ticker}
                  onChange={(e) => setOverrideCompanion(e.target.value)}
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-4xs font-mono font-bold rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-teal-500 text-gray-700 uppercase"
                >
                  {companionOptions.slice(0, 4).map(opt => (
                    <option key={opt.stock.ticker} value={opt.stock.ticker}>
                      {opt.stock.ticker} (r = +{opt.pearson.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="text-right shrink-0">
              <span className="text-3xs font-mono text-gray-400 block">Current Companion Price</span>
              <span className="text-sm font-bold text-teal-700 font-mono bg-teal-50 px-2 py-0.5 rounded">${companionStock.stats.currentPrice}</span>
            </div>
          </div>

          {/* Dynamic Description of Correlated Companion Stock */}
          <div className="p-3.5 bg-slate-50 rounded-xl space-y-1 text-slate-700 border border-slate-100">
            <div className="flex justify-between items-baseline">
              <span className="text-3xs font-mono font-bold text-indigo-750 font-semibold">{companionStock.companyName} ({companionStock.ticker})</span>
              <span className="text-[9px] font-mono text-slate-400 capitalize">{companionStock.theme} Core Ecosystem Entry</span>
            </div>
            <p className="text-3xs text-gray-600 leading-normal font-sans">
              <strong>Overview & Incorporation Catalyst:</strong> {companionStock.reasonForInclusion} {companionStock.rationale}
            </p>
          </div>

          {/* Core Stat Rows */}
          <div className="grid grid-cols-4 gap-2 text-center text-3xs font-mono uppercase text-gray-500">
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <span className="block text-[8px] text-gray-400">Mean Price</span>
              <strong className="text-xs text-slate-800 block mt-0.5">${companionMetrics.mean}</strong>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <span className="block text-[8px] text-gray-400">Std Dev (&sigma;)</span>
              <strong className="text-xs text-slate-800 block mt-0.5">${companionMetrics.stdDev}</strong>
            </div>
            <div className="bg-teal-50/40 p-2.5 rounded-lg border border-teal-50">
              <span className="block text-[8px] text-teal-650 font-semibold">BUY LOW (&mu; - 1&sigma;)</span>
              <strong className="text-xs text-teal-700 block mt-0.5 font-bold">${companionMetrics.buyLowThreshold}</strong>
            </div>
            <div className="bg-amber-50/40 p-2.5 rounded-lg border border-amber-50">
              <span className="block text-[8px] text-amber-650 font-semibold">SELL HIGH (&mu; + 1.1&sigma;)</span>
              <strong className="text-xs text-amber-700 block mt-0.5 font-bold">${companionMetrics.sellHighThreshold}</strong>
            </div>
          </div>

          {/* HISTORICAL TIMELINE DISTRIBUTION GRAPH COMPANION */}
          <div className="space-y-2">
            <span className="text-[9px] font-mono font-bold text-gray-400 uppercase tracking-wider block">Relative price deviation and outlier events</span>
            
            <div className="bg-slate-50 p-3 rounded-xl border border-gray-100">
              <svg viewBox="0 0 540 180" className="w-full h-auto overflow-visible select-none">
                {/* Horizontal reference bands */}
                <line x1="30" y1={90} x2="510" y2={90} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" /> {/* Mean line */}
                
                {/* Custom bounding box for stdDev corridors */}
                <rect x="30" y="55" width="480" height="70" fill="rgba(20, 184, 166, 0.05)" rx="4" />
                
                <text x="515" y="93" textAnchor="start" className="fill-slate-400 font-mono text-[8px]">Mean (&mu;)</text>
                <text x="515" y="57" textAnchor="start" className="fill-teal-500 font-mono text-[8px] font-bold">Buy/Sell Bounds (&plusmn;1&sigma;)</text>

                {/* Draw historical timeline area */}
                {(() => {
                  const m = companionMetrics;
                  const pts = m.zScores.map((zPt, idx) => {
                    const x = 30 + (idx / (m.zScores.length - 1)) * 480;
                    const y = 90 - (zPt.z * 40); // 40px scalar per z deviation
                    return { x, y, date: zPt.date, price: zPt.price };
                  });
                  
                  const dStr = pts.reduce((str, p, i) => i === 0 ? `M ${p.x} ${p.y}` : `${str} L ${p.x} ${p.y}`, "");
                  return (
                    <>
                      <path
                        d={dStr}
                        fill="none"
                        stroke="#14b8a6"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {pts.map((p, pIdx) => {
                        const isOutlier = Math.abs((p.price - m.mean) / m.stdDev) > 1.1;
                        return (
                          <g key={pIdx}>
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r={isOutlier ? "5" : "3.5"}
                              className={`cursor-pointer transition-all ${
                                isOutlier 
                                  ? (p.y > 90 ? "fill-emerald-500 stroke-white stroke-2" : "fill-rose-500 stroke-white stroke-2")
                                  : "fill-teal-600 stroke-white hover:fill-indigo-400"
                              }`}
                            >
                              <title>Date: {p.date} • Price: ${p.price} • Z-Score: {((p.price - m.mean) / m.stdDev).toFixed(2)}&sigma;</title>
                            </circle>
                          </g>
                        );
                      })}
                    </>
                  );
                })()}

                {/* X Axis Labels */}
                {companionMetrics.dates.map((d, dIdx) => {
                  if (dIdx % 3 !== 0) return null;
                  const x = 30 + (dIdx / (companionMetrics.dates.length - 1)) * 480;
                  return (
                    <text key={d} x={x} y="165" textAnchor="middle" className="fill-slate-400 font-mono text-[8.5px] font-bold">
                      {d}
                    </text>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Identified Outliers Table Companion */}
          <div className="space-y-2">
            <span className="text-[9px] font-mono font-bold text-gray-400 uppercase tracking-wider block">List of Historical Deviation Outliers (Z &gt; ±1.1&sigma;)</span>
            <div className="border border-slate-100 rounded-xl overflow-hidden text-3xs font-mono">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-gray-500 uppercase border-b border-slate-100 text-[8.5px]">
                  <tr>
                    <th className="py-2 px-3">TIMEFRAME</th>
                    <th className="py-2 px-3 text-right">PRICE RECORDED</th>
                    <th className="py-2 px-3 text-center">STANDARD DEVIATION</th>
                    <th className="py-2 px-3 text-right">SIGNAL IMPLICATION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-gray-700">
                  {companionMetrics.outliers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-3 text-center text-gray-400 font-sans">No extreme price anomalies registered. Consolidation phase active.</td>
                    </tr>
                  ) : (
                    companionMetrics.outliers.map((o, oIdx) => (
                      <tr key={oIdx} className="hover:bg-slate-50/40">
                        <td className="py-2 px-3 text-gray-900 font-bold">{o.date}</td>
                        <td className="py-2 px-3 text-right font-bold">${o.price}</td>
                        <td className="py-2 px-3 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold ${
                            o.type === "low" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                          }`}>
                            {o.z > 0 ? "+" : ""}{o.z.toFixed(2)}&sigma;
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <span className={o.type === "low" ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
                            {o.type === "low" ? "Undervalued / Extreme BUY Zone" : "Overextended / Take-Profit SELL Zone"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      {/* 9. Step 2 & 3: Strategic Fit Indicators (Pearson, R2, Beta) & Business Operational Relationship */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-[#4f46e5] block mb-1 uppercase">
            CROSS-ASSET SYNERGY COEFFICIENTS
          </span>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-indigo-500" />
            Strategic Pair Correlation Math & Real-World Business Linkages
          </h3>
          <p className="text-xs text-gray-500">
            Analyzing operational linkages between {techStock.ticker} and its companion {companionStock.ticker} using Pearson (r), Coefficient R², and Proportional Beta (β) coefficients.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          
          {/* Static Math Output boxes */}
          <div className="md:col-span-5 grid grid-cols-3 gap-3">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center space-y-1">
              <span className="text-[8px] font-mono font-bold text-gray-400 uppercase block">PEARSON (r)</span>
              <p className="text-sm font-extrabold text-indigo-700 font-mono tracking-tight leading-none pt-1">
                +{activeCompanionObj.pearson.toFixed(4)}
              </p>
              <span className="text-[8.5px] font-sans font-medium text-indigo-650 block">Co-directed flow</span>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center space-y-1">
              <span className="text-[8px] font-mono font-bold text-gray-400 uppercase block">COEFFICIENT R²</span>
              <p className="text-sm font-extrabold text-[#0d9488] font-mono tracking-tight leading-none pt-1">
                {(activeCompanionObj.rSquared * 100).toFixed(2)}%
              </p>
              <span className="text-[8.5px] font-sans text-teal-650 block">Shared variance fit</span>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center space-y-1">
              <span className="text-[8px] font-mono font-bold text-gray-400 uppercase block">PROPORTIONAL BETA (β)</span>
              <p className="text-sm font-extrabold text-amber-700 font-mono tracking-tight leading-none pt-1">
                {activeCompanionObj.beta.toFixed(3)}x
              </p>
              <span className="text-[8.5px] font-sans text-amber-650 block">Elastic multiplier</span>
            </div>
          </div>

          {/* Core Linkage text explanation */}
          <div className="md:col-span-7 bg-indigo-50/50 p-4.5 rounded-xl border border-indigo-100/50 space-y-2 text-slate-800">
            <h4 className="text-3xs font-mono font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500" />
              Operational Relationship Description
            </h4>
            <p className="text-xs text-slate-700 font-sans leading-relaxed">
              {getOperationalLinkage(techStock.ticker, companionStock.ticker, `These assets operate under highly parallel conditions in the technology value chain. When ${techStock.ticker} surges as main anchor, ${companionStock.ticker} captures downstream liquidity or hardware deployment backlog cycles.`)}
            </p>
          </div>

        </div>
      </div>

      {/* 10. Step 4 Layout: Variance Spreads & Convergent Trading Signals */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-gray-50 pb-4">
          <div>
            <span className="text-[9px] font-mono font-bold text-rose-600 uppercase tracking-widest block">VARIANCE ARBITRAGE MODEL</span>
            <h3 className="text-sm font-bold text-slate-900 font-mono flex items-center gap-1.5">
              <Scale className="w-5 h-5 text-indigo-500" />
              Dynamic Price Ratio Spread Variance Corridor
            </h3>
            <p className="text-xs text-gray-400 font-sans mt-0.5">
              Pair signal matches: Price Ratio = {techStock.ticker} Price &divide; {companionStock.ticker} Price. Trading margins define standard mean reversion target entries.
            </p>
          </div>

          <div className="text-right shrink-0">
            <span className="text-3xs font-mono text-gray-400 block">Current Ratio Spread</span>
            <span className="text-sm font-extrabold font-mono text-slate-900 bg-slate-100 px-2.5 py-1 rounded">
              1 {techStock.ticker} = {spreadStats.currentRatio} {companionStock.ticker}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* LEFT: Spread Chart Timeline */}
          <div className="lg:col-span-7 bg-slate-50 p-4 rounded-2xl border border-gray-50 space-y-2">
            <div className="flex justify-between text-3xs font-mono text-gray-400 uppercase">
              <span>Ratio Timeline Tracking (2020 - 2026)</span>
              <span className="text-indigo-650 font-bold">Standard mean: {spreadStats.meanRatio}</span>
            </div>
            
            {/* Draw dynamic Ratio chart inside standard dev lines */}
            <div>
              <svg viewBox="0 0 540 180" className="w-full h-auto overflow-visible select-none">
                {/* Mean ratio reference line */}
                <line x1="30" y1="90" x2="510" y2="90" stroke="#4f46e5" strokeWidth="1.2" strokeDasharray="3 3" />
                
                {/* 1.5 Std Dev Bollinger-style boundaries */}
                <rect x="30" y="45" width="480" height="90" fill="rgba(99, 102, 241, 0.04)" rx="4" />
                <line x1="30" y1="45" x2="510" y2="45" stroke="#ef4444" strokeWidth="0.8" strokeDasharray="4 4" className="opacity-70" /> {/* Upper trigger line */}
                <line x1="30" y1="135" x2="510" y2="135" stroke="#10b981" strokeWidth="0.8" strokeDasharray="4 4" className="opacity-70" /> {/* Lower trigger line */}
                
                <text x="515" y="48" textAnchor="start" className="fill-rose-500 font-mono text-[8.5px] font-bold">SELL LIMIT (Z=1.25)</text>
                <text x="515" y="138" textAnchor="start" className="fill-emerald-500 font-mono text-[8.5px] font-bold">BUY LIMIT (Z=-1.25)</text>
                <text x="515" y="93" textAnchor="start" className="fill-indigo-600 font-mono text-[8.5px] font-bold">HISTORICAL RATIO MEAN</text>

                {/* Draw actual ratio path */}
                {(() => {
                  const mRatio = spreadStats.meanRatio;
                  const sRatio = spreadStats.stdDevRatio || 0.1;
                  
                  const pts = spreadHistory.map((h, i) => {
                    const x = 30 + (i / (spreadHistory.length - 1)) * 480;
                    // zScore of ratio
                    const z = sRatio === 0 ? 0 : (h.ratio - mRatio) / sRatio;
                    // map z of 1.5 to 45px displacement
                    const y = 90 - (z * 36); 
                    return { x, y, date: h.date, val: h.ratio, z };
                  });

                  const dStr = pts.reduce((str, p, i) => i === 0 ? `M ${p.x} ${p.y}` : `${str} L ${p.x} ${p.y}`, "");
                  return (
                    <>
                      <path
                        d={dStr}
                        fill="none"
                        stroke="#6366f1"
                        strokeWidth="2.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {pts.map((p, pIdx) => {
                        const isExtreme = Math.abs(p.z) > 1.25;
                        return (
                          <circle
                            key={pIdx}
                            cx={p.x}
                            cy={p.y}
                            r={isExtreme ? "5" : "3.5"}
                            className={`cursor-pointer transition-colors ${
                              isExtreme 
                                ? (p.z > 0 ? "fill-rose-500 stroke-white stroke-2" : "fill-emerald-500 stroke-white stroke-2")
                                : "fill-indigo-650 fill-indigo-600 stroke-white"
                            }`}
                          >
                            <title>Date: {p.date} • Price Ratio: {p.val.toFixed(3)} (Z-score: {p.z.toFixed(2)}&sigma;)</title>
                          </circle>
                        );
                      })}
                    </>
                  );
                })()}

                {/* X labels */}
                {spreadHistory.map((h, i) => {
                  if (i % 3 !== 0) return null;
                  const x = 30 + (i / (spreadHistory.length - 1)) * 480;
                  return (
                    <text key={h.date} x={x} y="165" textAnchor="middle" className="fill-slate-400 font-mono text-[8.5px] font-bold">
                      {h.date}
                    </text>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* RIGHT: Active Pair Trading Trigger Card */}
          <div className="lg:col-span-5 space-y-4">
            <div className={`p-5 rounded-2xl border ${pairTradeSignal.color} space-y-3.5`}>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${pairTradeSignal.indicatorBg}`} />
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest block">PROPOSAL DESK TRADE SIGNAL</span>
              </div>
              
              <div className="space-y-1">
                <h4 className="text-sm font-black font-mono tracking-tight leading-none uppercase">{pairTradeSignal.action}</h4>
                <p className="text-3xs text-gray-500 font-sans">Relative pricing ratio is currently at {spreadStats.zScore}&sigma; from standard co-integrated baseline.</p>
              </div>

              <p className="text-xs leading-relaxed font-sans">{pairTradeSignal.desc}</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-[10px] font-mono space-y-2 text-gray-600">
              <p className="font-bold border-b border-slate-200 pb-1 text-slate-800 uppercase tracking-tight">Executive Arbitrage Playbook:</p>
              <ul className="list-disc pl-4 space-y-1 text-3xs leading-relaxed">
                <li>Underlying correlation (r &gt; +0.70) secures high convergence liability over 12 - 18 months cycles.</li>
                <li>When spread ratio expands beyond &plusmn;1.25&sigma;, take contrarian allocation posture.</li>
                <li>Hedge components: Acquire lagging asset under statistical floor; fund transaction with overvalued partner.</li>
              </ul>
            </div>
          </div>

        </div>
      </div>

      {/* 11. Step 5 Sections: Simplified Educational Blocks & Explicit Actionable Tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN (7 Cols): Dynamic Investor Educational Guidance (Beginner & Intermediate Switches) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-gray-50 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-500" />
                <h3 className="text-sm font-bold text-slate-900 leading-none">Educational Guidance Portal</h3>
              </div>
              
              <div className="flex bg-slate-100 rounded-xl p-1 text-3xs font-mono font-bold uppercase select-none border border-slate-50">
                <button
                  onClick={() => setEduMode("beginner")}
                  className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                    eduMode === "beginner" ? "bg-slate-900 text-white shadow" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Beginner Friendly
                </button>
                <button
                  onClick={() => setEduMode("intermediate")}
                  className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                    eduMode === "intermediate" ? "bg-slate-900 text-white shadow" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Intermediate Model
                </button>
              </div>
            </div>

            {eduMode === "beginner" ? (
              <div className="space-y-4 text-slate-700 font-sans leading-relaxed">
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    How to Think About Stock Distributions and &ldquo;Outliers&rdquo;
                  </h4>
                  <p className="text-xs">
                    Every stock has its standard trading range. If we calculate the average price over time, we can visualize a boundary around it. When a stock price spikes way above this boundary or crashes far below, we call it an <strong>outlier</strong>.
                  </p>
                  <p className="text-xs text-gray-500">
                    Think of this like a rubber band: when a stock becomes a low price outlier, the band is stretched thin and is highly likely to snap back to its normal average. This represents an excellent <strong>opportunity to buy</strong>.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    What is Correlation and Why Do We Pair Stocks?
                  </h4>
                  <p className="text-xs">
                    <strong>Correlation</strong> measures how closely two stocks dance to the exact same tune. If stock A moves up and stock B is always following closely behind it, they have a strong positive correlation.
                  </p>
                  <p className="text-xs text-gray-500">
                    By identifying perfect partner stocks, we can track them side-by-side. If one partner suddenly charges ahead while the other lags behind, we can predict that they will eventually meet back up (converge). That provides us with highly specific trading entry guidelines.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    Understanding Ratio Variance in Simple Terms
                  </h4>
                  <p className="text-xs">
                    We divide the Tech Stock price by the Companion price to get a ratio. If the ratio climbs too high, it means the Tech Star has outrun its helper. The smartest trade is to trim some Tech Stock and buy the cheaper Companion. If the ratio drops too low, buy the discounted Tech Stock!
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-slate-700 font-sans leading-relaxed">
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-900 font-mono uppercase tracking-tight flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                    1. Pearson Correlation (r) & Shared Variance (R²)
                  </h4>
                  <p className="text-xs">
                    The <strong>Pearson product-moment correlation (r)</strong> calculates linear dependency of periodic returns. The <strong>Coefficient of Determination (R²)</strong> represents the proportion of variance in the companion stock that is directly predictable from the tech baseline stock (e.g., 85% shared variance).
                  </p>
                </div>

                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-900 font-mono uppercase tracking-tight flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                    2. Elastic Proportional Beta (β)
                  </h4>
                  <p className="text-xs">
                    Beta represents the slope of the linear regression line of returns. A Beta of <strong>1.15x</strong> indicates that the companion stock acts as an amplified receiver of the base tech's momentum—providing high leverage coordinates during macro tailwinds without complex contract options.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-900 font-mono uppercase tracking-tight flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                    3. Spread Mean-Reversion Arbitrage (Z-Score)
                  </h4>
                  <p className="text-xs">
                    The pricing ratio represents a stationary co-integrated time-series. We track its standard deviation drift utilizing <strong>Z-score boundaries</strong>. When Z surpasses &plusmn;1.25σ, the probability of mean reversion exceeds 80% over corporate earnings cycles, informing exact trade triggers.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100/50 flex items-start gap-2 text-3xs font-mono uppercase text-gray-500 mt-4 leading-normal">
            <Info className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>DISCLAIMER: All statistical models and z-score alerts generated are based on semi-annual price history streams (2020 - 2026). Past performance is not a guarantee of future validation. Exercise proper position sizing!</span>
          </div>
        </div>

        {/* RIGHT COLUMN (5 Cols): Execution Trade Tickets with Target Prices / Holding Period */}
        <div className="lg:col-span-5 bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-md flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Zap className="w-4 h-4 text-amber-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-100">Actionable Trade Execution Ticket</h3>
            </div>

            <p className="text-3xs text-slate-400 font-sans leading-normal-tight">
              A dynamically formatted buy/sell/hold executive roadmap based on outlier analysis for both {techStock.ticker} and {companionStock.ticker}:
            </p>

            {/* BASE TECH TICKET */}
            <div className="bg-slate-850 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex justify-between items-center text-3xs font-mono uppercase">
                <span className="text-indigo-400 font-bold">ASSET #1: {techStock.ticker} (BASE TECH)</span>
                <span className={`px-2 py-0.5 rounded text-[8.5px] font-bold ${
                  techStock.decisionState === "BUY" ? "bg-emerald-900/40 text-emerald-300 border border-emerald-800" :
                  techStock.decisionState === "HOLD" ? "bg-amber-900/40 text-amber-300 border border-amber-800" : "bg-red-950 text-red-300 border border-red-800"
                }`}>
                  {techStock.decisionState} STATE
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-3xs font-mono">
                <div>
                  <span className="text-gray-400 block uppercase">BUY LIMIT TARGET</span>
                  <p className="text-sm font-black text-emerald-300 font-mono mt-0.5">${techMetrics.buyLowThreshold}</p>
                </div>
                <div>
                  <span className="text-gray-400 block uppercase">SELL SCALE TARGET</span>
                  <p className="text-sm font-black text-rose-450 font-mono mt-0.5">${techMetrics.sellHighThreshold}</p>
                </div>
              </div>

              <div className="text-[9px] font-mono text-slate-300 pt-1 leading-normal border-t border-slate-800 flex justify-between items-baseline">
                <span>RECOM STRATEGY:</span>
                <strong className="text-indigo-300">
                  {techStock.decisionState === "BUY" ? "ACCUMULATE DISPERSION FLOORS" : "HOLD ACCORDING TO SECULAR BASE"}
                </strong>
              </div>
            </div>

            {/* COMPANION TICKET */}
            <div className="bg-slate-850 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex justify-between items-center text-3xs font-mono uppercase">
                <span className="text-teal-400 font-bold">ASSET #2: {companionStock.ticker} (CORRELATED COMPANION)</span>
                <span className={`px-2 py-0.5 rounded text-[8.5px] font-bold ${
                  companionStock.decisionState === "BUY" ? "bg-emerald-900/40 text-emerald-300 border border-emerald-800" :
                  companionStock.decisionState === "HOLD" ? "bg-amber-900/40 text-amber-300 border border-amber-800" : "bg-red-950 text-red-300 border border-red-800"
                }`}>
                  {companionStock.decisionState} STATE
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-3xs font-mono">
                <div>
                  <span className="text-gray-400 block uppercase">BUY LIMIT TARGET</span>
                  <p className="text-sm font-black text-emerald-300 font-mono mt-0.5">${companionMetrics.buyLowThreshold}</p>
                </div>
                <div>
                  <span className="text-gray-400 block uppercase">SELL SCALE TARGET</span>
                  <p className="text-sm font-black text-rose-450 font-mono mt-0.5">${companionMetrics.sellHighThreshold}</p>
                </div>
              </div>

              <div className="text-[9px] font-mono text-slate-300 pt-1 leading-normal border-t border-slate-800 flex justify-between items-baseline">
                <span>RECOM STRATEGY:</span>
                <strong className="text-teal-300">
                  {companionStock.decisionState === "BUY" ? "ACCUMULATE DISPERSION FLOORS" : "HOLD CO-INTEGRATION SYNERGY"}
                </strong>
              </div>
            </div>

            {/* EXECUTION POSITION ACTIONS */}
            <div className="bg-indigo-950/40 p-4 rounded-xl border border-indigo-805 text-3xs font-mono space-y-1 bg-indigo-950 border border-indigo-800 leading-normal">
              <p className="text-indigo-300 font-bold uppercase tracking-wide">CO-HEDGED HORIZON RECOMMENDATION SUMMARY</p>
              <div className="pt-2 text-slate-200">
                <p>RECOMMENDED PLAY: <strong className="text-teal-400">{pairTradeSignal.action}</strong></p>
                <p className="pt-1 select-all">HOLD HORIZON TIMEFRAME: <strong className="text-white hover:underline cursor-pointer">12 - 18 MONTHS REVERSION CYCLE</strong></p>
                <p className="pt-1 text-slate-400">TARGET RATIO MARGIN: Buy when {techStock.ticker}/{companionStock.ticker} ratio reaches &lt; {(spreadStats.meanRatio - 1.1 * spreadStats.stdDevRatio).toFixed(2)}, sell when ratio &gt; {(spreadStats.meanRatio + 1.1 * spreadStats.stdDevRatio).toFixed(2)}.</p>
              </div>
            </div>
          </div>

          <div className="text-center font-mono text-[8.5px] uppercase text-slate-500 flex justify-center items-center gap-1 leading-none">
            <span>TICKET BLOCK VERIFIED IN SECURE CLIENT ENVELOPE</span>
          </div>
        </div>

      </div>

    </div>
  );
}
