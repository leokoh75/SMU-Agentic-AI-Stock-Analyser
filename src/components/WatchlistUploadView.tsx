import React, { useState } from "react";
import { Stock, AnchorClassification, DecisionState } from "../types";
import { 
  FolderPlus, 
  PlusCircle, 
  Trash2, 
  RotateCcw, 
  FileJson, 
  Info, 
  Search,
  CheckCircle2,
  ListFilter
} from "lucide-react";

interface WatchlistUploadViewProps {
  stocks: Stock[];
  onAddStock: (stock: Stock) => void;
  onRemoveStock: (ticker: string) => void;
  onRestoreDefaults: () => void;
  onSelectStock: (ticker: string) => void;
}

export function WatchlistUploadView({ stocks, onAddStock, onRemoveStock, onRestoreDefaults, onSelectStock }: WatchlistUploadViewProps) {
  // Manual additions form
  const [ticker, setTicker] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [sector, setSector] = useState("");
  const [region, setRegion] = useState("US");
  const [marketCap, setMarketCap] = useState("");
  const [theme, setTheme] = useState("AI");
  const [reason, setReason] = useState("");

  // Bulk additions state
  const [bulkText, setBulkText] = useState("");
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkSuccess, setBulkSuccess] = useState<string | null>(null);

  // Search/Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [themeFilter, setThemeFilter] = useState("ALL");

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker.trim() || !companyName.trim()) return;

    const newStock: Stock = {
      ticker: ticker.toUpperCase().trim(),
      companyName: companyName.trim(),
      sector: sector.trim() || "Technology",
      region,
      marketCap: parseFloat(marketCap) || 10,
      theme,
      reasonForInclusion: reason.trim() || "Strategic thematic coverage",
      anchorClassification: "speculative_opportunity", // defaults to speculative until scored
      scores: {
        marketLeadership: 3,
        growthExposure: 4,
        revenueGrowth: 3,
        profitability: 3,
        balanceSheet: 3,
        valuationRisk: 3,
        catalystStrength: 3,
        downsideRisk: 3,
        asymmetricPotential: 3
      },
      asymmetry: {
        upside: 3,
        downside: 3,
        conviction: 3,
        catalyst: 3,
        risk: 3
      },
      rationale: "Position manually introduced for screening.",
      stats: {
        currentPrice: 100,
        high52w: 120,
        low52w: 80,
        movingAverage50: 100,
        revenueGrowthRate: 15,
        earningsTrend: "Analyzing track record",
        valuationPE: "N/A",
        debtLevel: "Medium",
        leverageRatio: "N/A"
      },
      decisionState: "WATCHLIST",
      priceHistory: []
    };

    // Calculate initial asymmetry score
    const numerator = 3 + 3 + 3;
    const denominator = 3 + 3;
    newStock.asymmetry.asymmetryScore = parseFloat((numerator / denominator).toFixed(2));

    onAddStock(newStock);
    
    // Reset Form
    setTicker("");
    setCompanyName("");
    setSector("");
    setMarketCap("");
    setReason("");
  };

  const handleBulkImport = () => {
    setBulkError(null);
    setBulkSuccess(null);
    try {
      const parsed = JSON.parse(bulkText);
      if (!Array.isArray(parsed)) {
        throw new Error("Pasted content must be an array of objects representing stocks.");
      }

      parsed.forEach((item: any, idx) => {
        if (!item.ticker || !item.companyName) {
          throw new Error(`Object at index ${idx} is missing required field: 'ticker' or 'companyName'.`);
        }
        
        // create stock shell
        const stock: Stock = {
          ticker: String(item.ticker).toUpperCase().trim(),
          companyName: String(item.companyName).trim(),
          sector: String(item.sector || "Tech").trim(),
          region: String(item.region || "US").trim(),
          marketCap: parseFloat(item.marketCap) || 10,
          theme: String(item.theme || "AI").trim().toLowerCase(),
          reasonForInclusion: String(item.reasonForInclusion || item.reason || "Thematic Coverage").trim(),
          anchorClassification: (item.anchorClassification || "speculative_opportunity") as AnchorClassification,
          scores: {
            marketLeadership: parseInt(item.scores?.marketLeadership) || 3,
            growthExposure: parseInt(item.scores?.growthExposure) || 3,
            revenueGrowth: parseInt(item.scores?.revenueGrowth) || 3,
            profitability: parseInt(item.scores?.profitability) || 3,
            balanceSheet: parseInt(item.scores?.balanceSheet) || 3,
            valuationRisk: parseInt(item.scores?.valuationRisk) || 3,
            catalystStrength: parseInt(item.scores?.catalystStrength) || 3,
            downsideRisk: parseInt(item.scores?.downsideRisk) || 3,
            asymmetricPotential: parseInt(item.scores?.asymmetricPotential) || 3
          },
          asymmetry: {
            upside: parseInt(item.asymmetry?.upside) || 3,
            downside: parseInt(item.asymmetry?.downside) || 3,
            conviction: parseInt(item.asymmetry?.conviction) || 3,
            catalyst: parseInt(item.asymmetry?.catalyst) || 3,
            risk: parseInt(item.asymmetry?.risk) || 3
          },
          rationale: String(item.rationale || "Thematic bulk import").trim(),
          stats: {
            currentPrice: parseFloat(item.stats?.currentPrice) || 100,
            high52w: parseFloat(item.stats?.high52w) || 120,
            low52w: parseFloat(item.stats?.low52w) || 80,
            movingAverage50: parseFloat(item.stats?.movingAverage50) || 100,
            revenueGrowthRate: parseFloat(item.stats?.revenueGrowthRate) || 15,
            earningsTrend: String(item.stats?.earningsTrend || "GAAP rising margins"),
            valuationPE: String(item.stats?.valuationPE || "N/A"),
            debtLevel: (item.stats?.debtLevel || "Medium") as "Low" | "Medium" | "High",
            leverageRatio: String(item.stats?.leverageRatio || "N/A")
          },
          decisionState: (item.decisionState || "WATCHLIST") as DecisionState,
          priceHistory: item.priceHistory || []
        };

        const num = (stock.asymmetry.upside) + (stock.asymmetry.conviction) + (stock.asymmetry.catalyst);
        const den = (stock.asymmetry.downside) + (stock.asymmetry.risk);
        stock.asymmetry.asymmetryScore = parseFloat((num / den).toFixed(2));

        onAddStock(stock);
      });

      setBulkSuccess(`Successfully parsed and registered ${parsed.length} tickers.`);
      setBulkText("");
    } catch (err: any) {
      setBulkError(err.message || "Failed to parse JSON. Ensure syntax is valid JSON array.");
    }
  };

  const loadBulkExample = () => {
    const example = [
      {
        "ticker": "PLTR",
        "companyName": "Palantir Technologies",
        "sector": "Software Systems",
        "region": "US",
        "marketCap": 85,
        "theme": "software",
        "reasonForInclusion": "Foundational ontology data integration operating system for defense and industry.",
        "anchorClassification": "asymmetric_opportunity",
        "asymmetry": { "upside": 5, "downside": 2, "conviction": 4, "catalyst": 5, "risk": 2 },
        "stats": { "currentPrice": 40.20, "high52w": 44.50, "low52w": 18.20, "revenueGrowthRate": 25, "earningsTrend": "Highly profitable GAAP EPS rising" }
      },
      {
        "ticker": "OKLO",
        "companyName": "Oklo Inc.",
        "sector": "Energy / Nuclear",
        "region": "US",
        "marketCap": 2.4,
        "theme": "energy",
        "reasonForInclusion": "Fast-fission clean mini modular reactors backed by Sam Altman.",
        "anchorClassification": "speculative_opportunity",
        "asymmetry": { "upside": 5, "downside": 4, "conviction": 3, "catalyst": 4, "risk": 4 },
        "stats": { "currentPrice": 12.80, "high52w": 18.50, "low52w": 5.40, "revenueGrowthRate": 0, "earningsTrend": "Pre-revenue R&D stage" }
      }
    ];
    setBulkText(JSON.stringify(example, null, 2));
  };

  // Filter processes
  const filteredStocks = stocks.filter(stock => {
    const matchesSearch = stock.ticker.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          stock.companyName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTheme = themeFilter === "ALL" || stock.theme.toUpperCase() === themeFilter.toUpperCase();
    return matchesSearch && matchesTheme;
  });

  return (
    <div className="space-y-6">
      
      {/* Title block */}
      <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 flex items-center gap-2">
            <FolderPlus className="w-6 h-6 text-indigo-500" />
            Watchlist & Stock Onboarding
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            onboard up to 20–40 technology assets. Enter credentials manually below, paste a structured JSON checklist, or restore equilibrium templates.
          </p>
        </div>
        
        <button
          onClick={onRestoreDefaults}
          className="px-4 py-2 text-xs border border-gray-100 font-semibold rounded-xl bg-slate-50 hover:bg-slate-100 text-gray-700 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4 text-gray-500" />
          Restore Default 10 Stocks
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Onboarding fields */}
        <div className="lg:col-span-1 space-y-4">
          
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <h2 className="text-xs font-semibold text-gray-900 font-mono uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <PlusCircle className="w-4 h-4 text-indigo-500" />
              Manual Onboard Form
            </h2>
            
            <form onSubmit={handleManualAdd} className="space-y-3.5 text-xs text-gray-650">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1 space-y-1">
                  <label className="font-medium">Ticker</label>
                  <input
                    required
                    type="text"
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value)}
                    placeholder="E.g., PLTR"
                    className="w-full p-2 border border-gray-100 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-400 font-mono text-xs uppercase"
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="font-medium">Company Name</label>
                  <input
                    required
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Palantir Technologies"
                    className="w-full p-2 border border-gray-100 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-medium">Thematic focus</label>
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    className="w-full p-2 border border-gray-100 rounded-lg focus:outline-hidden"
                  >
                    <option value="AI">AI Systems</option>
                    <option value="quantum">Quantum Computing</option>
                    <option value="data centres">Data Centres</option>
                    <option value="energy">Clean Energy</option>
                    <option value="cloud">Cloud Hosting</option>
                    <option value="chips">Semiconductor Silicon</option>
                    <option value="infrastructure">Infrastructure Fab</option>
                    <option value="software">SaaS Systems</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-medium">Market Capital ($B)</label>
                  <input
                    type="number"
                    step="any"
                    value={marketCap}
                    onChange={(e) => setMarketCap(e.target.value)}
                    placeholder="85"
                    className="w-full p-2 border border-gray-100 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-medium">Sub-sector</label>
                  <input
                    type="text"
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                    placeholder="Enterprise Software"
                    className="w-full p-2 border border-gray-100 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium">Region</label>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full p-2 border border-gray-100 rounded-lg focus:outline-hidden"
                  >
                    <option value="US">US / Americas</option>
                    <option value="Asia">Asia / Taiwan</option>
                    <option value="Europe">Europe</option>
                    <option value="Rest of World">Rest of World</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium">Reason for Inclusion</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  placeholder="Primary enterprise growth vector..."
                  className="w-full p-2 border border-gray-100 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-400 font-sans"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold font-sans rounded-lg shadow-xs hover:shadow-sm cursor-pointer transition-all"
              >
                Onboard to Watchlist
              </button>
            </form>
          </div>

          {/* Bulk Paste block */}
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-3">
            <h2 className="text-xs font-semibold text-gray-900 font-mono uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileJson className="w-4 h-4 text-indigo-500" /> Bulk JSON Import
              </span>
              <button 
                onClick={loadBulkExample}
                className="text-4xs text-indigo-600 hover:underline font-mono"
              >
                Load Example
              </button>
            </h2>

            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              rows={4}
              placeholder='[ { "ticker": "PLTR", "companyName": "Palantir"... } ]'
              className="w-full text-3xs p-2 border border-gray-100 rounded-lg font-mono text-gray-700"
            />

            {bulkError && <p className="text-3xs text-rose-600 bg-rose-50 p-2 rounded-md">{bulkError}</p>}
            {bulkSuccess && <p className="text-3xs text-green-600 bg-green-50 p-2 rounded-md font-medium">{bulkSuccess}</p>}

            <button
              onClick={handleBulkImport}
              disabled={!bulkText.trim()}
              className={`w-full py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                bulkText.trim() ? "bg-slate-800 hover:bg-slate-900 text-white" : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              Parse & Import JSON
            </button>
          </div>

        </div>

        {/* Right column: Covered watchlist table */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-55 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 font-mono uppercase tracking-wider">Covered Stocks Watchlist ({filteredStocks.length})</h2>
              <p className="text-3xs text-gray-400 mt-0.5">Below is the complete pool of tech assets loaded into calculations.</p>
            </div>
            
            {/* Filter toolbars */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search Ticker..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-7 pr-3 py-1 border border-gray-150 rounded-lg text-3xs focus:outline-hidden focus:ring-1 focus:ring-indigo-400 font-mono text-gray-700"
                />
                <Search className="absolute left-2.5 top-2 w-3 h-3 text-gray-400" />
              </div>

              <select
                value={themeFilter}
                onChange={(e) => setThemeFilter(e.target.value)}
                className="p-1 border border-gray-150 rounded-lg text-3xs focus:outline-hidden text-gray-700"
              >
                <option value="ALL">All Themes</option>
                <option value="AI">AI</option>
                <option value="quantum">Quantum</option>
                <option value="data centres">Data Centres</option>
                <option value="energy">Energy</option>
                <option value="chips">Semiconductors</option>
                <option value="cloud">Cloud</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-3xs font-sans">
              <thead>
                <tr className="border-b border-gray-100 font-mono font-bold text-gray-400 uppercase">
                  <th className="py-2">Symbol</th>
                  <th className="py-2">Company Name</th>
                  <th className="py-2">Theme</th>
                  <th className="py-2">Classification</th>
                  <th className="text-right py-2">Cap ($B)</th>
                  <th className="text-right py-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredStocks.map((stock) => (
                  <tr key={stock.ticker} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-2.5 font-mono font-bold">
                      <button 
                        onClick={() => onSelectStock(stock.ticker)}
                        className="text-indigo-600 hover:underline hover:text-indigo-800 text-left font-bold"
                      >
                        {stock.ticker}
                      </button>
                    </td>
                    <td className="py-2.5 max-w-[150px] truncate pr-2 text-gray-800 font-medium">
                      {stock.companyName}
                    </td>
                    <td className="py-2.5 capitalize">
                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 font-mono rounded">
                        {stock.theme}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded font-mono text-4xs font-bold uppercase ${
                        stock.anchorClassification === "core_anchor" ? "bg-slate-800 text-white" :
                        stock.anchorClassification === "asymmetric_opportunity" ? "bg-emerald-55 bg-emerald-100 text-emerald-800 border border-emerald-250" :
                        stock.anchorClassification === "speculative_opportunity" ? "bg-purple-100 text-purple-850" : "bg-red-150 bg-rose-100 text-rose-800"
                      }`}>
                        {stock.anchorClassification.replace("_", " ")}
                      </span>
                    </td>
                    <td className="text-right py-2.5 font-mono text-gray-700">
                      ${stock.marketCap.toLocaleString()}B
                    </td>
                    <td className="text-right py-2.5">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => onSelectStock(stock.ticker)}
                          className="px-2 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold rounded cursor-pointer leading-none"
                        >
                          Scoring
                        </button>
                        <button
                          onClick={() => onRemoveStock(stock.ticker)}
                          className="p-1 hover:text-rose-500 rounded text-gray-400 cursor-pointer transition-colors"
                          title="delete stock"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredStocks.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-400 font-mono">
                      No matching covered stock profiles identified.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-100/50 rounded-xl text-3xs text-amber-800 flex items-start gap-2 leading-relaxed">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Quick Tip on Tech Anchors:</p>
              <p className="mt-0.5">
                Classifying whether each stock is a Core Anchor, Asymmetric Opportunity, Speculative Opportunity, or Reject depends heavily on the Scoring factors. Once added, click the "Scoring" button of any stock to evaluate leadership, exposure and downside risk!
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
