import React, { useState, useMemo } from "react";
import { Stock, PricePoint } from "../types";
import { OutlierVarianceView } from "./OutlierVarianceView";
import { 
  LineChart, 
  HelpCircle, 
  Check, 
  Sliders, 
  Plus, 
  Eye, 
  TrendingUp,
  TableProperties,
  Percent,
  CircleDollarSign,
  BarChart2,
  ArrowUpRight,
  Activity,
  Zap,
  Scale,
  Grid,
  Info
} from "lucide-react";

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
  return parseFloat((num / den).toFixed(3));
}

interface ChartViewProps {
  stocks: Stock[];
  selectedTicker: string | null;
}

const LINE_COLORS = [
  "#6366f1", // Indigo
  "#10b981", // Emerald
  "#ec4899", // Pink
  "#f59e0b", // Amber
  "#06b6d4", // Cyan
  "#8b5cf6", // Violet
  "#f43f5e", // Rose
  "#14b8a6", // Teal
  "#3b82f6", // Blue
  "#ef4444"  // Red
];

export function ChartView({ stocks, selectedTicker }: ChartViewProps) {
  // checked stocks state (defaults to matching selectedTicker, plus some anchors)
  const [checkedTickers, setCheckedTickers] = useState<Record<string, boolean>>(() => {
    const defaults: Record<string, boolean> = {};
    stocks.slice(0, 3).forEach(s => {
      defaults[s.ticker] = true;
    });
    if (selectedTicker) {
      defaults[selectedTicker] = true;
    }
    return defaults;
  });

  // Chart Mode: nominal or normalized
  const [chartMode, setChartMode] = useState<"nominal" | "normalized">("normalized");

  // Hover point states
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // --- Sub-navigation & Interactive States for Correlated Pairs ---
  const [activeSubTab, setActiveSubTab] = useState<"performance" | "correlation" | "outliers_variance">("performance");
  const [pairA, setPairA] = useState<string>("GOOGL");
  const [pairB, setPairB] = useState<string>("GS");
  const [calcMethod, setCalcMethod] = useState<"trend" | "return">("return");
  const [pairChartMode, setPairChartMode] = useState<"indexed" | "dual">("indexed");
  const [correlationViewMode, setCorrelationViewMode] = useState<"analyzer" | "matrix">("analyzer");
  const [matrixHoverCell, setMatrixHoverCell] = useState<{ tA: string; tB: string; val: number } | null>(null);

  // Computes trend correlations (raw price alignment) for every ticker pair
  const correlationMatrix = useMemo(() => {
    const matrix: Record<string, Record<string, number>> = {};
    stocks.forEach((sA) => {
      matrix[sA.ticker] = {};
      stocks.forEach((sB) => {
        const historyA = sA.priceHistory || [];
        const historyB = sB.priceHistory || [];
        const pricesA = historyA.map(p => p.price);
        const pricesB = historyB.map(p => p.price);
        matrix[sA.ticker][sB.ticker] = calculatePearsonCorrelation(pricesA, pricesB);
      });
    });
    return matrix;
  }, [stocks]);

  // Computes percentage period-to-period returns correlations for every ticker pair
  const returnsCorrelationMatrix = useMemo(() => {
    const matrix: Record<string, Record<string, number>> = {};
    stocks.forEach((sA) => {
      matrix[sA.ticker] = {};
      stocks.forEach((sB) => {
        const historyA = sA.priceHistory || [];
        const historyB = sB.priceHistory || [];
        
        const returnsA: number[] = [];
        for (let i = 1; i < historyA.length; i++) {
          returnsA.push((historyA[i].price - historyA[i-1].price) / historyA[i-1].price);
        }
        
        const returnsB: number[] = [];
        for (let i = 1; i < historyB.length; i++) {
          returnsB.push((historyB[i].price - historyB[i-1].price) / historyB[i-1].price);
        }
        
        matrix[sA.ticker][sB.ticker] = calculatePearsonCorrelation(returnsA, returnsB);
      });
    });
    return matrix;
  }, [stocks]);

  // Top correlated pairs based on active calculation type (returns velocity or overall trend)
  const topCorrelatedPairs = useMemo(() => {
    const list: { tickerA: string; tickerB: string; val: number }[] = [];
    const matrix = calcMethod === "trend" ? correlationMatrix : returnsCorrelationMatrix;
    
    for (let i = 0; i < stocks.length; i++) {
      for (let j = i + 1; j < stocks.length; j++) {
        const tA = stocks[i].ticker;
        const tB = stocks[j].ticker;
        const val = matrix[tA]?.[tB] ?? 0;
        list.push({ tickerA: tA, tickerB: tB, val });
      }
    }
    
    // Sort by absolute strength
    return list
      .map(item => ({ ...item, absVal: Math.abs(item.val) }))
      .sort((a, b) => b.absVal - a.absVal)
      .slice(0, 6);
  }, [stocks, correlationMatrix, returnsCorrelationMatrix, calcMethod]);

  // Active complementary pair details safely falling back if items are missing
  const stockA = useMemo(() => {
    return stocks.find(s => s.ticker === pairA) || stocks.find(s => s.ticker === "GOOGL") || stocks[0];
  }, [stocks, pairA]);

  const stockB = useMemo(() => {
    const found = stocks.find(s => s.ticker === pairB) || stocks.find(s => s.ticker === "GS");
    if (found && found.ticker !== stockA.ticker) return found;
    return stocks.find(s => s.ticker !== stockA.ticker) || stocks[1] || stocks[0];
  }, [stocks, pairB, stockA]);

  // Regression line & individual scatter points computation for active pair
  const regressionMetrics = useMemo(() => {
    if (!stockA || !stockB) return { slope: 0, intercept: 0, points: [] };
    
    const histA = stockA.priceHistory || [];
    const histB = stockB.priceHistory || [];
    
    const retsA: number[] = [];
    for (let i = 1; i < histA.length; i++) {
       retsA.push(((histA[i].price - histA[i-1].price) / histA[i-1].price) * 100);
    }
    const retsB: number[] = [];
    for (let i = 1; i < histB.length; i++) {
       retsB.push(((histB[i].price - histB[i-1].price) / histB[i-1].price) * 100);
    }
    
    const n = Math.min(retsA.length, retsB.length);
    if (n < 2) return { slope: 0, intercept: 0, points: [] };
    
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    const pts: { x: number; y: number; date: string }[] = [];
    
    for (let i = 0; i < n; i++) {
      const x = retsA[i];
      const y = retsB[i];
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
      pts.push({ x, y, date: histA[i+1]?.date || "" });
    }
    
    const denom = (n * sumXX - sumX * sumX);
    const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;
    
    return { slope, intercept, points: pts };
  }, [stockA, stockB]);

  // Max extent scaler for the returns responsive scatter graph
  const scatterScale = useMemo(() => {
    const pts = regressionMetrics.points;
    if (pts.length === 0) return 15;
    const maxVal = Math.max(...pts.map(p => Math.max(Math.abs(p.x), Math.abs(p.y))));
    return Math.max(maxVal * 1.15, 12); // minimum limit of 12% symmetric boundaries
  }, [regressionMetrics]);

  // --- End Pair Correlation States & Calculations ---

  const toggleTicker = (t: string) => {
    const activeCount = Object.values(checkedTickers).filter(Boolean).length;
    // Limit to 10
    if (!checkedTickers[t] && activeCount >= 10) return;

    setCheckedTickers(prev => ({
      ...prev,
      [t]: !prev[t]
    }));
  };

  const selectAll = () => {
    const res: Record<string, boolean> = {};
    stocks.forEach(s => { res[s.ticker] = true; });
    setCheckedTickers(res);
  };

  const clearAll = () => {
    setCheckedTickers({});
  };

  // List of active stocks in chart
  const activeStocks = useMemo(() => {
    return stocks.filter(s => checkedTickers[s.ticker] && s.priceHistory && s.priceHistory.length > 0);
  }, [stocks, checkedTickers]);

  // Dates timeline labels
  const timelineDates = useMemo(() => {
    if (stocks[0] && stocks[0].priceHistory) {
      return stocks[0].priceHistory.map(p => p.date);
    }
    return [];
  }, [stocks]);

  // Min/Max calculation depending on mode
  const { minVal, maxVal, coordinatesMap } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;

    const map: Record<string, { x: number; y: number }[]> = {};

    if (activeStocks.length === 0) {
      return { minVal: 0, maxVal: 100, coordinatesMap: {} };
    }

    if (chartMode === "normalized") {
      // Re-base all selected stocks to 100 base in year 2020-01
      // Each stock's comparative point: priceNow / priceZero * 100
      activeStocks.forEach(s => {
        const history = s.priceHistory || [];
        const basePrice = history[0]?.price || 1;
        
        history.forEach((pt) => {
          const ratioVal = (pt.price / basePrice) * 100;
          if (ratioVal < min) min = ratioVal;
          if (ratioVal > max) max = ratioVal;
        });
      });
      
      // Pad bounds
      min = Math.max(0, min - 10);
      max = max + 10;
    } else {
      // Nominal prices
      activeStocks.forEach(s => {
        const history = s.priceHistory || [];
        history.forEach(pt => {
          if (pt.price < min) min = pt.price;
          if (pt.price > max) max = pt.price;
        });
      });
      min = Math.max(0, min - (min * 0.1));
      max = max + (max * 0.1);
    }

    // Create SVG Viewport Normalized Points
    // Viewport: 1000 WIDTH (X), 400 HEIGHT (Y)
    activeStocks.forEach(s => {
      const history = s.priceHistory || [];
      const basePrice = history[0]?.price || 1;
      const points: { x: number; y: number }[] = [];

      history.forEach((pt, idx) => {
        const currentVal = chartMode === "normalized" 
          ? (pt.price / basePrice) * 100 
          : pt.price;

        const xPct = (idx / (history.length - 1)) * 1000;
        const normY = max === min ? 200 : 400 - (((currentVal - min) / (max - min)) * 400);
        
        points.push({ x: xPct, y: normY });
      });

      map[s.ticker] = points;
    });

    return { minVal: min, maxVal: max, coordinatesMap: map };
  }, [activeStocks, chartMode]);

  // Quick formatter
  const formattedYLabel = (val: number) => {
    if (chartMode === "normalized") {
      return `${Math.round(val)}%`;
    }
    return `$${Math.round(val)}`;
  };

  return (
    <div className="space-y-6">
      
      {/* Title block */}
      <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 flex items-center gap-2">
            <LineChart className="w-6 h-6 text-indigo-500" />
            Stock Performance & Technical Check
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Evaluate price support trends, dynamic secular growth multipliers, and asset-to-asset correlations.
          </p>
        </div>

        {activeSubTab === "performance" && (
          <div className="flex bg-slate-100 rounded-xl p-1 text-3xs font-mono font-bold uppercase select-none">
            <button
              onClick={() => setChartMode("normalized")}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                chartMode === "normalized"
                ? "bg-slate-900 text-slate-100 shadow-sm"
                : "text-gray-500 hover:text-gray-800"
              }`}
            >
              <Percent className="w-3.5 h-3.5" />
              Indexed Performance (100 Base)
            </button>
            
            <button
              onClick={() => setChartMode("nominal")}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                chartMode === "nominal"
                ? "bg-slate-900 text-slate-100 shadow-sm"
                : "text-gray-500 hover:text-gray-800"
              }`}
            >
              <CircleDollarSign className="w-3.5 h-3.5" />
              Nominal Prices ($)
            </button>
          </div>
        )}
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveSubTab("performance")}
          className={`pb-3.5 px-5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === "performance"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-gray-400 hover:text-gray-700"
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          Multi-Stock Performance Overlay
        </button>
        <button
          onClick={() => setActiveSubTab("correlation")}
          className={`pb-3.5 px-5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === "correlation"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-gray-400 hover:text-gray-700"
          }`}
        >
          <Activity className="w-4 h-4" />
          Complementary Pairs & Correlation Analyzer
        </button>
        <button
          onClick={() => setActiveSubTab("outliers_variance")}
          className={`pb-3.5 px-5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === "outliers_variance"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-gray-400 hover:text-gray-700"
          }`}
        >
          <Scale className="w-4 h-4" />
          Outliers & Variance Trade Signals
        </button>
      </div>

      {activeSubTab === "performance" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Ticker Toggle Selectors */}
          <div className="lg:col-span-3 bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-50">
              <h3 className="text-xs font-semibold text-gray-900 font-mono uppercase tracking-wider">Compare overlay</h3>
              <div className="flex gap-2">
                <button onClick={selectAll} className="text-4xs text-indigo-600 hover:underline">Select All</button>
                <button onClick={clearAll} className="text-4xs text-gray-400 hover:underline">Clear</button>
              </div>
            </div>

            <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
              {stocks.map((s, idx) => {
                const activeColor = LINE_COLORS[idx % LINE_COLORS.length];
                const isChecked = !!checkedTickers[s.ticker];
                return (
                  <button
                    key={s.ticker}
                    onClick={() => toggleTicker(s.ticker)}
                    className={`w-full p-2.5 rounded-lg border text-left flex justify-between items-center transition-all cursor-pointer ${
                      isChecked ? "border-slate-150 bg-slate-50 text-slate-900" : "border-gray-50 bg-white text-gray-400"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span 
                        className="w-2.5 h-2.5 rounded-full shrink-0" 
                        style={{ backgroundColor: isChecked ? activeColor : "#cbd5e1" }}
                      />
                      <span className="font-mono text-2xs font-bold">{s.ticker}</span>
                      <span className="text-4xs text-gray-400 font-sans line-clamp-1 truncate max-w-[100px]">{s.companyName}</span>
                    </div>
                    {isChecked && <Check className="w-3.5 h-3.5 text-slate-800" />}
                  </button>
                );
              })}
            </div>

            <div className="p-3.5 bg-indigo-50/50 border border-indigo-100/50 rounded-xl text-3xs text-indigo-850">
              <p className="font-semibold mb-0.5">Bloomberg Re-basing Tip:</p>
              <p className="font-sans leading-relaxed text-gray-600">
                When indexing performance, the starting price in early 2020 is adjusted to 100%. This allows direct multiplier overlays to verify which quantum or nuclear utility delivers top asymmetric returns relative to standard semiconductor index leaders.
              </p>
            </div>
          </div>

          {/* Right Column: Dynamic SVG line chart representation */}
          <div className="lg:col-span-9 bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-6">
            
            {/* Active Legend Markers */}
            <div className="flex flex-wrap gap-3 text-3xs font-mono">
              {activeStocks.map((s, idx) => (
                <div key={s.ticker} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: LINE_COLORS[idx % LINE_COLORS.length] }} />
                  <span className="font-bold text-gray-800">{s.ticker}</span>
                </div>
              ))}
              {activeStocks.length === 0 && <span className="text-gray-400 italic">Toggle tickers in the left panel to draw overlay coordinates.</span>}
            </div>

            {/* SVG Viewport */}
            {activeStocks.length > 0 && (
              <div className="relative">
                <svg 
                  viewBox="0 0 1000 440" 
                  className="w-full h-auto overflow-visible select-none"
                  onMouseLeave={() => setHoverIndex(null)}
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const xClick = e.clientX - rect.left;
                    const index = Math.min(13, Math.max(0, Math.round((xClick / rect.width) * 13)));
                    setHoverIndex(index);
                  }}
                >
                  {/* Horizontal Guide Grid Lines (5 tiers) */}
                  {[0, 100, 200, 300, 400].map((yCord, idx) => {
                    const calculatedLabel = maxVal - ((idx / 4) * (maxVal - minVal));
                    return (
                      <g key={yCord} className="opacity-15">
                        <line x1="0" y1={yCord} x2="1000" y2={yCord} stroke="#1e293b" strokeWidth="1.2" strokeDasharray="4 4" />
                        <text x="-4" y={yCord + 4} textAnchor="end" className="fill-slate-850 font-mono text-3xs font-bold leading-none select-none" style={{ fontSize: "20px" }}>
                          {formattedYLabel(calculatedLabel)}
                        </text>
                      </g>
                    );
                  })}

                  {/* Vertical guides for each year mark */}
                  {timelineDates.map((date, idx) => {
                    if (idx % 2 !== 0) return null; // Plot yearly
                    const xPct = (idx / (timelineDates.length - 1)) * 1000;
                    return (
                      <g key={date} className="opacity-15">
                        <line x1={xPct} y1="0" x2={xPct} y2="400" stroke="#1e293b" strokeWidth="1" />
                      </g>
                    );
                  })}

                  {/* Draw stock trajectories */}
                  {activeStocks.map((stock, idx) => {
                    const points = coordinatesMap[stock.ticker] || [];
                    if (points.length === 0) return null;
                    const activeColor = LINE_COLORS[idx % LINE_COLORS.length];
                    const pathStr = points.reduce((str, pt, i) => {
                      return i === 0 ? `M ${pt.x} ${pt.y}` : `${str} L ${pt.x} ${pt.y}`;
                    }, "");

                    return (
                      <path
                        key={stock.ticker}
                        d={pathStr}
                        fill="none"
                        stroke={activeColor}
                        strokeWidth="2.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="transition-all duration-300"
                      />
                    );
                  })}

                  {/* Hover crosshairs guide */}
                  {hoverIndex !== null && (
                    <g>
                      <line 
                        x1={(hoverIndex / (timelineDates.length - 1)) * 1000} 
                        y1="0" 
                        x2={(hoverIndex / (timelineDates.length - 1)) * 1000} 
                        y2="400" 
                        stroke="#4f46e5" 
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                      />
                      {activeStocks.map((s, idx) => {
                        const points = coordinatesMap[s.ticker] || [];
                        const pt = points[hoverIndex];
                        if (!pt) return null;
                        return (
                          <circle 
                            key={s.ticker} 
                            cx={pt.x} 
                            cy={pt.y} 
                            r="5.5" 
                            fill={LINE_COLORS[idx % LINE_COLORS.length]} 
                            stroke="#ffffff" 
                            strokeWidth="2" 
                          />
                        );
                      })}
                    </g>
                  )}
                </svg>

                {/* Bottom Label dates row */}
                <div className="flex justify-between font-mono text-3xs font-semibold text-gray-400 px-6 pt-3 select-none">
                  <span>Jan 2020</span>
                  <span>Jan 2021</span>
                  <span>Jan 2022</span>
                  <span>Jan 2023</span>
                  <span>Jan 2024</span>
                  <span>Jan 2025</span>
                  <span>May 2026</span>
                </div>
              </div>
            )}

            {/* Interactive Tooltip Card details */}
            {hoverIndex !== null && activeStocks.length > 0 && (
              <div className="p-4 bg-slate-900 border border-slate-800 text-slate-100 rounded-xl shadow-md space-y-2">
                <h4 className="text-3xs font-mono font-bold uppercase text-slate-400 tracking-wider">Historical Spot check Audit: {timelineDates[hoverIndex]}</h4>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                  {activeStocks.map((stock) => {
                    const history = stock.priceHistory || [];
                    const basePrice = history[0]?.price || 1;
                    const currentPt = history[hoverIndex];

                    return (
                      <div key={stock.ticker} className="p-2 bg-slate-850 rounded-lg text-3xs space-y-0.5">
                        <span className="font-mono font-bold text-slate-300">{stock.ticker}</span>
                        <p className="font-mono text-xs font-semibold text-emerald-400">${currentPt?.price}</p>
                        {chartMode === "normalized" && (
                          <p className="text-4xs text-slate-500 font-mono text-slate-400">Index: {Math.round((currentPt?.price / basePrice) * 100)}%</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Supporting Fundamental check sheet table */}
            <div className="space-y-3.5 pt-4 border-t border-gray-100">
              <h3 className="text-xs font-semibold text-gray-900 font-mono uppercase tracking-wider flex items-center gap-1.5">
                <TableProperties className="w-5 h-5 text-indigo-500" />
                Fundamental & Technical Checklist Matrix
              </h3>

              <div className="overflow-x-auto font-mono text-3xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 font-bold text-gray-405 text-gray-400 uppercase">
                      <th className="py-2.5">Symbol</th>
                      <th className="py-2.5">52W Low/High</th>
                      <th className="py-2.5">Revenue Growth</th>
                      <th className="py-2.5 font-sans">Earnings Trend</th>
                      <th className="py-2.5">Debt Level</th>
                      <th className="text-right py-2.5">Valuation Ratio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-gray-700">
                    {stocks.map((stock) => (
                      <tr key={stock.ticker} className="hover:bg-slate-50/20 font-sans">
                        <td className="py-2.5 font-mono font-bold text-indigo-600">{stock.ticker}</td>
                        <td className="py-2.5 font-mono text-3xs">${stock.stats.low52w} - ${stock.stats.high52w}</td>
                        <td className="py-2.5 font-mono font-bold text-green-600">+{stock.stats.revenueGrowthRate}% y/y</td>
                        <td className="py-2.5 max-w-[140px] truncate" title={stock.stats.earningsTrend}>{stock.stats.earningsTrend}</td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded text-4xs font-mono font-bold ${
                            stock.stats.debtLevel === "Low" ? "bg-emerald-50 text-emerald-800" :
                            stock.stats.debtLevel === "Medium" ? "bg-amber-50 text-amber-800" : "bg-rose-50 text-rose-850"
                          }`}>
                            {stock.stats.debtLevel}
                          </span>
                        </td>
                        <td className="text-right py-2.5 font-mono font-bold">{stock.stats.valuationPE}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>
      )}

      {activeSubTab === "correlation" && (
        /* CORRELATION WORKSPACE */
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-900 font-sans">
                {correlationViewMode === "analyzer" ? "Interactive Pair Regression Analyzer" : "Macro Watchlist Correlation Heatmap Grid"}
              </h2>
              <p className="text-xs text-slate-500 font-sans">
                {correlationViewMode === "analyzer" 
                  ? "Analyze relative proportion tracking, regression best-fits, and symmetric betas."
                  : "Correlation coordinates of standard semiconductors, quantum innovators, and complementary financial partners."}
              </p>
            </div>
            
            {/* Toggle sub-view mode */}
            <div className="flex bg-slate-100 rounded-xl p-1 text-3xs font-mono font-bold uppercase select-none">
              <button
                onClick={() => setCorrelationViewMode("analyzer")}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                  correlationViewMode === "analyzer"
                    ? "bg-slate-900 text-slate-100 shadow-sm"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                Individual Pairs
              </button>
              <button
                onClick={() => setCorrelationViewMode("matrix")}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                  correlationViewMode === "matrix"
                    ? "bg-slate-900 text-slate-100 shadow-sm"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                Watchlist Heatmap
              </button>
            </div>
          </div>

          {correlationViewMode === "analyzer" ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
              
              {/* Left Column: Selector Configuration & Top Matches */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Configuration Controls */}
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
                  <h3 className="text-3xs font-mono font-bold text-gray-400 uppercase tracking-wider">Active Pair Configurator</h3>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-3xs font-mono uppercase tracking-wider text-gray-500 mb-1">Base Stock (Asset A)</label>
                      <select
                        value={pairA}
                        onChange={(e) => setPairA(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-xs font-mono font-bold rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-800"
                      >
                        {stocks.map(s => (
                          <option key={s.ticker} value={s.ticker}>{s.ticker} - {s.companyName}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-3xs font-mono uppercase tracking-wider text-gray-500 mb-1">Complement Stock (Asset B)</label>
                      <select
                        value={pairB}
                        onChange={(e) => setPairB(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-xs font-mono font-bold rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-800"
                      >
                        {stocks.map(s => (
                          <option key={s.ticker} value={s.ticker} disabled={s.ticker === pairA}>{s.ticker} - {s.companyName}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Correlation math toggler */}
                  <div className="space-y-2 pt-2 border-t border-slate-50">
                    <label className="block text-3xs font-mono uppercase tracking-wider text-gray-500">Correlation Logic Method</label>
                    <div className="grid grid-cols-2 gap-1.5 bg-slate-100 rounded-lg p-1 text-3xs font-mono font-bold uppercase select-none">
                      <button
                        onClick={() => setCalcMethod("return")}
                        className={`py-1 rounded px-2 transition-all cursor-pointer text-center ${
                          calcMethod === "return" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500"
                        }`}
                      >
                        Returns Velocity
                      </button>
                      <button
                        onClick={() => setCalcMethod("trend")}
                        className={`py-1 rounded px-2 transition-all cursor-pointer text-center ${
                          calcMethod === "trend" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500"
                        }`}
                      >
                        Price Trends
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50 text-3xs text-indigo-850 font-sans leading-relaxed">
                    <p className="font-semibold mb-1 flex items-center gap-1 text-indigo-900">
                      <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      Active Logic Rule:
                    </p>
                    {calcMethod === "return" ? (
                      <span>
                        <strong>Returns Velocity</strong> calculates Pearson Correlation on period percentage increments. Solves short-duration, high-velocity complementary tracking.
                      </span>
                    ) : (
                      <span>
                        <strong>Price Trends</strong> alignment identifies general multi-year trajectory parallelism (2020 through 2026 secular support).
                      </span>
                    )}
                  </div>
                </div>

                {/* Top Watchlist Complements */}
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-3">
                  <h3 className="text-3xs font-mono font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Top Watchlist Complements</span>
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                  </h3>
                  <p className="text-4xs text-gray-400 font-sans">Select companion pairs modeled with highest structural alignment:</p>
                  
                  <div className="space-y-1.5">
                    {topCorrelatedPairs.map((pair, pIdx) => {
                      const isActive = (pair.tickerA === stockA.ticker && pair.tickerB === stockB.ticker) || (pair.tickerB === stockA.ticker && pair.tickerA === stockB.ticker);
                      
                      return (
                        <button
                          key={`${pair.tickerA}-${pair.tickerB}-${pIdx}`}
                          onClick={() => {
                            setPairA(pair.tickerA);
                            setPairB(pair.tickerB);
                          }}
                          className={`w-full p-2.5 rounded-lg border text-left flex justify-between items-center transition-all cursor-pointer ${
                            isActive ? "bg-indigo-600 border-indigo-600 text-white" : "bg-slate-50/40 border-gray-100 text-gray-700 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 text-3xs font-mono">
                            <span className={`font-bold ${isActive ? "text-white" : "text-indigo-600 font-semibold"}`}>{pair.tickerA}</span>
                            <span className={isActive ? "text-indigo-200" : "text-gray-400"}>&</span>
                            <span className={`font-bold ${isActive ? "text-white" : "text-indigo-600 font-semibold"}`}>{pair.tickerB}</span>
                          </div>
                          
                          <div className="flex items-center gap-1 font-mono text-3xs font-bold">
                            <span className={isActive ? "text-indigo-150" : "text-gray-400"}>r =</span>
                            <span className={isActive ? "text-white" : pair.val > 0.85 ? "text-indigo-600" : "text-emerald-600"}>
                              {(pair.val >= 0 ? "+" : "") + pair.val.toFixed(2)}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Right Column: Graphs */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* Two-Line Chart representation */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <h4 className="text-xs font-semibold text-gray-900 font-mono uppercase tracking-wider flex items-center gap-1.5 animate-fadeIn">
                        <LineChart className="w-4 h-4 text-indigo-500" />
                        Parallel Trajectory Comparison Overlay
                      </h4>
                      <p className="text-4xs text-gray-400 font-sans mt-0.5">Visually inspect direct proportional tracking over the 2020 - 2026 cycle</p>
                    </div>
                    
                    <div className="flex bg-slate-100 rounded-xl p-1 text-3xs font-mono font-bold uppercase select-none">
                      <button
                        onClick={() => setPairChartMode("indexed")}
                        className={`px-3 py-1 rounded transition-all cursor-pointer ${
                          pairChartMode === "indexed" ? "bg-slate-900 text-white shadow-sm" : "text-gray-500 hover:text-gray-800"
                        }`}
                      >
                        Indexed (%)
                      </button>
                      <button
                        onClick={() => setPairChartMode("dual")}
                        className={`px-3 py-1 rounded transition-all cursor-pointer ${
                          pairChartMode === "dual" ? "bg-slate-900 text-white shadow-sm" : "text-gray-500 hover:text-gray-800"
                        }`}
                      >
                        Dual Nominal ($)
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 text-3xs font-mono py-1 select-none border-b border-gray-50">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-1 bg-indigo-650 bg-indigo-600 rounded" />
                      <span className="font-bold text-gray-700">{stockA.ticker}</span>
                      <span className="text-gray-400">[{pairChartMode === "dual" ? `$${stockA.stats.currentPrice}` : "Re-based to 100"}]</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-1 bg-teal-500 rounded" />
                      <span className="font-bold text-gray-700">{stockB.ticker}</span>
                      <span className="text-gray-400">[{pairChartMode === "dual" ? `$${stockB.stats.currentPrice}` : "Re-based to 100"}]</span>
                    </div>
                  </div>

                  {/* SVG Multi Axis Pair Chart */}
                  <div className="relative pt-1">
                    <svg viewBox="0 0 1000 320" className="w-full h-auto overflow-visible select-none">
                      {[0, 1, 2, 3].map((tick) => {
                        const yVal = 40 + tick * 80;
                        return (
                          <g key={tick} className="opacity-15">
                            <line x1="40" y1={yVal} x2="960" y2={yVal} stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
                          </g>
                        );
                      })}
                      
                      {/* X coordinates */}
                      {timelineDates.map((date, idx) => {
                        if (idx % 2 !== 0) return null;
                        const xPct = 40 + (idx / 13) * 920;
                        return (
                          <g key={date} className="opacity-10">
                            <line x1={xPct} y1="30" x2={xPct} y2="290" stroke="#1e293b" strokeWidth="1" />
                          </g>
                        );
                      })}

                      {/* Path for Stock A */}
                      {(() => {
                        const histA = stockA.priceHistory || [];
                        if (histA.length === 0) return null;
                        let pts: { x: number; y: number }[] = [];
                        
                        if (pairChartMode === "indexed") {
                          const base = histA[0]?.price || 1;
                          const idxVals = histA.map(p => (p.price / base) * 100);
                          const maxv = Math.max(...idxVals, 100);
                          const minv = Math.min(...idxVals, 100);
                          const range = maxv === minv ? 100 : maxv - minv;
                          
                          pts = idxVals.map((v, i) => {
                            const xCo = 40 + (i / 13) * 920;
                            const yCo = 280 - ((v - minv) / range) * 230;
                            return { x: xCo, y: yCo };
                          });
                        } else {
                          const minv = Math.min(...histA.map(p => p.price));
                          const maxv = Math.max(...histA.map(p => p.price));
                          const range = maxv === minv ? 100 : maxv - minv;
                          
                          pts = histA.map((pt, i) => {
                            const xCo = 40 + (i / 13) * 920;
                            const yCo = 280 - ((pt.price - minv) / range) * 230;
                            return { x: xCo, y: yCo };
                          });
                        }
                        
                        const dStr = pts.reduce((str, p, i) => i === 0 ? `M ${p.x} ${p.y}` : `${str} L ${p.x} ${p.y}`, "");
                        return (
                          <path
                            d={dStr}
                            fill="none"
                            stroke="#6366f1"
                            strokeWidth="3.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="transition-all duration-300"
                          />
                        );
                      })()}

                      {/* Path for Stock B */}
                      {(() => {
                        const histB = stockB.priceHistory || [];
                        if (histB.length === 0) return null;
                        let pts: { x: number; y: number }[] = [];
                        
                        if (pairChartMode === "indexed") {
                          const base = histB[0]?.price || 1;
                          const idxVals = histB.map(p => (p.price / base) * 100);
                          const maxv = Math.max(...idxVals, 100);
                          const minv = Math.min(...idxVals, 100);
                          const range = maxv === minv ? 100 : maxv - minv;
                          
                          pts = idxVals.map((v, i) => {
                            const xCo = 40 + (i / 13) * 920;
                            const yCo = 280 - ((v - minv) / range) * 230;
                            return { x: xCo, y: yCo };
                          });
                        } else {
                          const minv = Math.min(...histB.map(p => p.price));
                          const maxv = Math.max(...histB.map(p => p.price));
                          const range = maxv === minv ? 100 : maxv - minv;
                          
                          pts = histB.map((pt, i) => {
                            const xCo = 40 + (i / 13) * 920;
                            const yCo = 280 - ((pt.price - minv) / range) * 230;
                            return { x: xCo, y: yCo };
                          });
                        }
                        
                        const dStr = pts.reduce((str, p, i) => i === 0 ? `M ${p.x} ${p.y}` : `${str} L ${p.x} ${p.y}`, "");
                        return (
                          <path
                            d={dStr}
                            fill="none"
                            stroke="#14b8a6"
                            strokeWidth="3.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="transition-all duration-300"
                          />
                        );
                      })()}

                      {/* Labels */}
                      {timelineDates.map((date, idx) => {
                        if (idx % 2 !== 0) return null;
                        const xPct = 40 + (idx / 13) * 920;
                        return (
                          <text
                            key={idx}
                            x={xPct}
                            y="310"
                            textAnchor="middle"
                            className="fill-gray-400 font-mono text-[9px] font-bold"
                          >
                            {date}
                          </text>
                        );
                      })}
                    </svg>
                  </div>

                  {/* Supporting technical stat row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3.5 border-t border-gray-50 text-3xs font-mono uppercase tracking-wider text-gray-500">
                    <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-center">
                      <span>Pearson correlation (r)</span>
                      <p className="text-base font-extrabold text-slate-900 leading-none">
                        {calcMethod === "trend"
                          ? correlationMatrix[stockA.ticker]?.[stockB.ticker]?.toFixed(3)
                          : returnsCorrelationMatrix[stockA.ticker]?.[stockB.ticker]?.toFixed(3)
                        }
                      </p>
                      <span className="text-[9px] text-indigo-600 block lowercase font-sans font-semibold">
                        {(() => {
                          const r = calcMethod === "trend"
                            ? correlationMatrix[stockA.ticker]?.[stockB.ticker] || 0
                            : returnsCorrelationMatrix[stockA.ticker]?.[stockB.ticker] || 0;
                          if (r > 0.85) return "high-fidelity complementary lock";
                          if (r > 0.50) return "strong parallel dynamics";
                          if (r > 0.15) return "loose comparative alignment";
                          return "absolute independent hedge";
                        })()}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-center">
                      <span>Coefficient R²</span>
                      <p className="text-base font-extrabold text-slate-900 leading-none">
                        {(() => {
                          const r = calcMethod === "trend"
                            ? correlationMatrix[stockA.ticker]?.[stockB.ticker] || 0
                            : returnsCorrelationMatrix[stockA.ticker]?.[stockB.ticker] || 0;
                          return `${(r * r * 100).toFixed(1)}%`;
                        })()}
                      </p>
                      <span className="text-[9px] text-gray-400 block lowercase font-sans">shared variance fit</span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-center">
                      <span>Proportional Beta (β)</span>
                      <p className="text-base font-extrabold text-slate-900 leading-none">
                        {regressionMetrics.slope.toFixed(2)}x
                      </p>
                      <span className="text-[9px] text-gray-400 block lowercase font-sans">
                        {`+1.0% in ${stockA.ticker} = ${regressionMetrics.slope >= 0 ? "+" : ""}${regressionMetrics.slope.toFixed(2)}% in ${stockB.ticker}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Symmetric Scatter Regression Plot */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold text-gray-900 font-mono uppercase tracking-wider flex items-center gap-1.5">
                      <Scale className="w-4 h-4 text-indigo-500" />
                      Symmetric Returns Scatter Plot & Beta Regression
                    </h4>
                    <p className="text-4xs text-gray-400 font-sans mt-0.5">Plot compares periodic change percentages side-by-side to solve exact proportional elasticity.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    
                    {/* SVG Col */}
                    <div className="md:col-span-7 flex justify-center bg-slate-50 p-4 rounded-xl border border-gray-50">
                      <div className="w-full max-w-[340px] relative">
                        <svg viewBox="0 0 450 300" className="w-full h-auto overflow-visible select-none">
                          {[0.33, 0.66, 1.0].map((sc, rIdx) => (
                            <circle
                              key={rIdx}
                              cx="225"
                              cy="150"
                              r={200 * sc}
                              fill="none"
                              stroke="#e2e8f0"
                              strokeWidth="0.8"
                              strokeDasharray="4 4"
                            />
                          ))}

                          <line x1="225" y1="10" x2="225" y2="290" stroke="#cbd5e1" strokeWidth="1" />
                          <line x1="10" y1="150" x2="440" y2="150" stroke="#cbd5e1" strokeWidth="1" />

                          <text x="435" y="142" textAnchor="end" className="fill-slate-400 font-mono text-[9px] font-bold">+{scatterScale.toFixed(0)}% {stockA.ticker}</text>
                          <text x="15" y="142" textAnchor="start" className="fill-slate-400 font-mono text-[9px] font-bold">-{scatterScale.toFixed(0)}% {stockA.ticker}</text>
                          <text x="232" y="22" textAnchor="start" className="fill-slate-400 font-mono text-[9px] font-bold">+{scatterScale.toFixed(0)}% {stockB.ticker}</text>
                          <text x="232" y="285" textAnchor="start" className="fill-slate-400 font-mono text-[9px] font-bold">-{scatterScale.toFixed(0)}% {stockB.ticker}</text>

                          {/* Fit Line */}
                          {(() => {
                            const { slope, intercept } = regressionMetrics;
                            const x1 = -scatterScale;
                            const x2 = scatterScale;
                            const y1 = slope * x1 + intercept;
                            const y2 = slope * x2 + intercept;
                            
                            const px1 = 225 + (x1 / scatterScale) * 200;
                            const py1 = 150 - (y1 / scatterScale) * 125;
                            
                            const px2 = 225 + (x2 / scatterScale) * 200;
                            const py2 = 150 - (y2 / scatterScale) * 125;

                            return (
                              <line
                                x1={px1}
                                y1={py1}
                                x2={px2}
                                y2={py2}
                                stroke="#4f46e5"
                                strokeWidth="2.5"
                                strokeDasharray="5 5"
                              />
                            );
                          })()}

                          {/* Dots */}
                          {regressionMetrics.points.map((pt, i) => {
                            const cx = 225 + (pt.x / scatterScale) * 200;
                            const cy = 150 - (pt.y / scatterScale) * 125;
                            return (
                              <circle
                                key={i}
                                cx={cx}
                                cy={cy}
                                r="5.5"
                                className="fill-indigo-500 stroke-white stroke-2 hover:fill-teal-400 cursor-pointer transition-colors"
                              >
                                <title>{pt.date}: {stockA.ticker} = {pt.x.toFixed(1)}%, {stockB.ticker} = {pt.y.toFixed(1)}%</title>
                              </circle>
                            );
                          })}
                        </svg>
                      </div>
                    </div>

                    {/* Explanation */}
                    <div className="md:col-span-5 space-y-3 font-sans">
                      <div className="bg-slate-50 p-4 rounded-xl border border-gray-100 text-xs space-y-3">
                        <div>
                          <span className="text-[9px] font-mono font-bold text-indigo-650 uppercase tracking-wider block">Estimated Linear Model</span>
                          <span className="font-mono text-xs font-bold text-gray-800 leading-relaxed block select-all bg-slate-900 text-teal-350 p-2 text-center rounded-lg mt-1 select-all">
                            {`${stockB.ticker} = ${regressionMetrics.slope.toFixed(2)} • ${stockA.ticker} ${regressionMetrics.intercept >= 0 ? "+" : "-"} ${Math.abs(regressionMetrics.intercept).toFixed(2)}%`}
                          </span>
                        </div>
                        
                        <div className="space-y-1 leading-snug text-gray-600 text-3xs">
                          <p className="font-bold border-b border-gray-100 pb-1 text-gray-800 uppercase tracking-tight">Relative Proportion Insight:</p>
                          <p className="pt-1 leading-normal">
                            When <strong>{stockA.ticker}</strong> registers a +1.0% return shift, <strong>{stockB.ticker}</strong> reacts on average by shifting <strong>{regressionMetrics.slope >= 0 ? "+" : ""}{regressionMetrics.slope.toFixed(2)}%</strong> in highly proportional, predictable synchrony.
                          </p>
                          <p className="pt-1 text-slate-450 text-gray-500 leading-normal">
                            This structural companion beta is derived from their shared macro drivers. Use this mathematical proxy to model hedging coordinates or complementary capital recycling.
                          </p>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

              </div>

            </div>
          ) : (
            /* HEATMAP MATRIX GRID */
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-50 pb-3">
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 font-mono uppercase tracking-wider">
                    Secular Watchlist Heatmap: {calcMethod === "trend" ? "PRICE TRAJECTORIES" : "RETURNS VELOCITIES"}
                  </h4>
                  <p className="text-4xs text-gray-400 font-sans mt-0.5">
                    Grid compiles cross-comparatives. Click any cell to immediately populate individual regression controls above.
                  </p>
                </div>

                <div className="flex bg-slate-100 rounded-xl p-1 text-3xs font-mono font-bold uppercase select-none">
                  <button
                    onClick={() => setCalcMethod("return")}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      calcMethod === "return" ? "bg-slate-900 text-white shadow-3xs" : "text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    Returns Mode
                  </button>
                  <button
                    onClick={() => setCalcMethod("trend")}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      calcMethod === "trend" ? "bg-slate-900 text-white shadow-3xs" : "text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    Trends Mode
                  </button>
                </div>
              </div>

              {/* Grid content */}
              <div className="overflow-x-auto pb-4">
                <div className="min-w-[650px] space-y-1">
                  
                  {/* Headers */}
                  <div className="grid font-mono text-[9px] font-bold text-gray-400 py-1" style={{ gridTemplateColumns: `100px repeat(${stocks.length}, minmax(0, 1fr))` }}>
                    <span>Base / Companion</span>
                    {stocks.map(s => (
                      <span key={s.ticker} className="text-center">{s.ticker}</span>
                    ))}
                  </div>

                  {/* Rows */}
                  {stocks.map(sRow => (
                    <div
                      key={sRow.ticker}
                      className="grid"
                      style={{ gridTemplateColumns: `100px repeat(${stocks.length}, minmax(0, 1fr))` }}
                    >
                      <span className="font-mono text-[9.5px] font-bold text-gray-700 flex items-center border-r border-gray-50 pr-2">
                        {sRow.ticker}
                        <span className="text-[8px] font-sans font-normal text-gray-400 truncate ml-1 leading-none">{sRow.companyName.split(" ")[0]}</span>
                      </span>

                      {stocks.map(sCol => {
                        const cellVal = calcMethod === "trend"
                          ? correlationMatrix[sRow.ticker]?.[sCol.ticker] ?? 0
                          : returnsCorrelationMatrix[sRow.ticker]?.[sCol.ticker] ?? 0;
                        
                        let cellStyle = {};
                        if (cellVal > 0) {
                          cellStyle = { backgroundColor: `rgba(99, 102, 241, ${Math.max(0.04, cellVal)})`, color: cellVal > 0.65 ? "#4f46e5" : "#334155" };
                        } else if (cellVal < 0) {
                          cellStyle = { backgroundColor: `rgba(244, 63, 94, ${Math.max(0.04, Math.abs(cellVal))})`, color: cellVal < -0.65 ? "#e11d48" : "#334155" };
                        }

                        const isDiag = sRow.ticker === sCol.ticker;
                        if (isDiag) {
                          cellStyle = { backgroundColor: "#1e293b", color: "#ffffff", fontWeight: "bold" };
                        }

                        return (
                          <div
                            key={sCol.ticker}
                            onMouseEnter={() => setMatrixHoverCell({ tA: sRow.ticker, tB: sCol.ticker, val: cellVal })}
                            onMouseLeave={() => setMatrixHoverCell(null)}
                            onClick={() => {
                              if (!isDiag) {
                                setPairA(sRow.ticker);
                                setPairB(sCol.ticker);
                                setCorrelationViewMode("analyzer");
                              }
                            }}
                            className="aspect-square sm:aspect-[1.4/1] flex items-center justify-center border border-white text-[9px] font-mono hover:scale-105 hover:ring-2 hover:ring-indigo-600 transition-all cursor-pointer rounded"
                            style={cellStyle}
                          >
                            {cellVal >= 0 && !isDiag && "+"}
                            {cellVal.toFixed(2)}
                          </div>
                        );
                      })}
                    </div>
                  ))}

                </div>
              </div>

              {/* Status details card footer */}
              <div className="p-4 bg-slate-900 border border-slate-800 text-slate-100 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="space-y-0.5">
                  <span className="text-4xs font-mono font-bold uppercase text-indigo-400 tracking-wider">Dynamic Matrix Inspector</span>
                  {matrixHoverCell ? (
                    <div className="flex items-baseline gap-2">
                      <p className="font-mono text-sm font-bold text-slate-100">{matrixHoverCell.tA} & {matrixHoverCell.tB}</p>
                      <p className="text-3xs text-gray-300 font-sans">
                        Pearson r = <strong className="text-teal-400 font-mono">{(matrixHoverCell.val >= 0 ? "+" : "") + matrixHoverCell.val.toFixed(3)}</strong>
                        <span className="ml-1 text-gray-400">
                          ({Math.abs(matrixHoverCell.val) > 0.85 ? "Extremely Coupled Complements" :
                            Math.abs(matrixHoverCell.val) > 0.60 ? "Strong Parallel Alignment" : "Uncorrelated Alpha Shield"})
                        </span>
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-300 font-sans">Hover over cell squares to read live coefficients. Click any cells to plot regression.</p>
                  )}
                </div>

                {matrixHoverCell && matrixHoverCell.tA !== matrixHoverCell.tB && (
                  <button
                    onClick={() => {
                      setPairA(matrixHoverCell.tA);
                      setPairB(matrixHoverCell.tB);
                      setCorrelationViewMode("analyzer");
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-3xs font-semibold text-white uppercase rounded-xl shadow transition-all cursor-pointer flex items-center gap-1 shrink-0 font-sans"
                  >
                    Lock Pair in Analyzer
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

            </div>
          )}
        </div>
      )}

      {activeSubTab === "outliers_variance" && (
        <OutlierVarianceView stocks={stocks} />
      )}
    </div>
  );
}
