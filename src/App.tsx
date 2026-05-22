import React, { useState, useEffect } from "react";
import { Stock, MarketEvent } from "./types";
import { INITIAL_STOCKS as defaultStocks, SAMPLE_EVENTS as defaultMarketEvents } from "./initialData";

// View components
import { DashboardView } from "./components/DashboardView";
import { ScannerView } from "./components/ScannerView";
import { WatchlistUploadView } from "./components/WatchlistUploadView";
import { ScorecardView } from "./components/ScorecardView";
import { DecisionView } from "./components/DecisionView";
import { PortfolioView } from "./components/PortfolioView";
import { ChartView } from "./components/ChartView";
import { ThesisView } from "./components/ThesisView";
import { OutlierRecommendationsView } from "./components/OutlierRecommendationsView";

// Lucide icons
import { 
  BarChart4, 
  Search, 
  FolderPlus, 
  Sliders, 
  ArrowRightLeft, 
  Briefcase, 
  LineChart, 
  FileText,
  TrendingUp,
  Fingerprint,
  BookOpen,
  Zap
} from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [showGlossary, setShowGlossary] = useState<boolean>(false);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [events, setEvents] = useState<MarketEvent[]>(defaultMarketEvents);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

  // Initialize stocks from LocalStorage if they exist, else seed defaults
  useEffect(() => {
    const cached = localStorage.getItem("equilibrium_stocks");
    if (cached) {
      try {
        let loaded = JSON.parse(cached);
        if (Array.isArray(loaded)) {
          const tickersInLoaded = new Set(loaded.map((s: any) => s.ticker));
          const missingDefaults = defaultStocks.filter(s => !tickersInLoaded.has(s.ticker));
          if (missingDefaults.length > 0) {
            loaded = [...loaded, ...missingDefaults];
            localStorage.setItem("equilibrium_stocks", JSON.stringify(loaded));
          }
          setStocks(loaded);
        } else {
          setStocks(defaultStocks);
        }
      } catch (e) {
        setStocks(defaultStocks);
      }
    } else {
      setStocks(defaultStocks);
    }
  }, []);

  // Save changes to cache when stocks update
  const handleUpdateStocks = (updated: Stock[]) => {
    setStocks(updated);
    localStorage.setItem("equilibrium_stocks", JSON.stringify(updated));
  };

  const handleAddStock = (newStock: Stock) => {
    // Avoid duplicates
    if (stocks.some((s) => s.ticker === newStock.ticker)) {
      alert(`${newStock.ticker} is already registered in watchlist.`);
      return;
    }
    const next = [newStock, ...stocks];
    handleUpdateStocks(next);
  };

  const handleUpdateStock = (updatedStock: Stock) => {
    const next = stocks.map((s) => (s.ticker === updatedStock.ticker ? updatedStock : s));
    handleUpdateStocks(next);
  };

  const handleRemoveStock = (ticker: string) => {
    const next = stocks.filter((s) => s.ticker !== ticker);
    handleUpdateStocks(next);
  };

  const handleRestoreDefaults = () => {
    if (confirm("Reset current watchlist to default sample focus stocks? Any custom scores/decisions will be reset.")) {
      handleUpdateStocks(defaultStocks);
      setSelectedTicker(defaultStocks[0].ticker);
    }
  };

  // Safe global cross-navigation triggering
  const handleCrossNavigate = (tab: string, ticker?: string) => {
    let targetTab = tab;
    if (tab === "asymmetry") targetTab = "scorecard";
    if (tab === "reviews") targetTab = "portfolio";

    setActiveTab(targetTab);
    if (ticker) {
      setSelectedTicker(ticker);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col antialiased">
      
      {/* Primary Branded Header */}
      <header className="sticky top-0 z-50 bg-slate-900 border-b border-slate-850 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 text-white">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-md flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-mono font-bold tracking-widest text-indigo-400 block leading-none uppercase">ASYNCHRONOUS ALPHA</span>
            <h1 className="text-md font-extrabold tracking-tight font-display text-white mt-1">EQUILIBRIUM SUITE</h1>
          </div>
        </div>

        {/* Global tab navbar row (Screen 10 tabs total context) */}
        <nav className="flex flex-wrap items-center justify-center gap-1.5 font-sans font-semibold text-3xs uppercase">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "dashboard" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <BarChart4 className="w-3.5 h-3.5" />
            Dashboard
          </button>

          <button
            onClick={() => setActiveTab("scanner")}
            className={`px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "scanner" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            Event Scanner
          </button>

          <button
            onClick={() => setActiveTab("watchlist")}
            className={`px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "watchlist" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <FolderPlus className="w-3.5 h-3.5" />
            Watchlist Add
          </button>

          <button
            onClick={() => setActiveTab("scorecard")}
            className={`px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "scorecard" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Screen & Score
          </button>

          <button
            onClick={() => setActiveTab("decision")}
            className={`px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "decision" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            Decide
          </button>

          <button
            onClick={() => setActiveTab("portfolio")}
            className={`px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "portfolio" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            Portfolio Desk
          </button>

          <button
            onClick={() => setActiveTab("chart")}
            className={`px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "chart" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <LineChart className="w-3.5 h-3.5" />
            Performance
          </button>

          <button
            onClick={() => setActiveTab("thesis")}
            className={`px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "thesis" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Thesis checklist
          </button>

          <button
            onClick={() => setActiveTab("recommendations")}
            className={`px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "recommendations" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Buy / Sell / Hold Guide
          </button>

          <button
            onClick={() => setShowGlossary(true)}
            className="px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 ml-1.5"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Beginner Glossary
          </button>
        </nav>
      </header>

      {/* Primary viewport content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 py-8">
        {activeTab === "dashboard" && (
          <DashboardView stocks={stocks} events={events} onNavigate={handleCrossNavigate} />
        )}
        {activeTab === "scanner" && (
          <ScannerView 
            stocks={stocks} 
            events={events} 
            onAddEvent={(newEvt) => setEvents(prev => [newEvt, ...prev])} 
          />
        )}
        {activeTab === "watchlist" && (
          <WatchlistUploadView
            stocks={stocks}
            onAddStock={handleAddStock}
            onRemoveStock={handleRemoveStock}
            onRestoreDefaults={handleRestoreDefaults}
            onSelectStock={(ticker) => handleCrossNavigate("scorecard", ticker)}
          />
        )}
        {activeTab === "scorecard" && (
          <ScorecardView
            stocks={stocks}
            selectedTicker={selectedTicker}
            onUpdateStock={handleUpdateStock}
            onNavigate={handleCrossNavigate}
          />
        )}
        {activeTab === "decision" && (
          <DecisionView
            stocks={stocks}
            selectedTicker={selectedTicker}
            onUpdateStock={handleUpdateStock}
            onNavigate={handleCrossNavigate}
          />
        )}
        {activeTab === "portfolio" && (
          <PortfolioView stocks={stocks} onUpdateStock={handleUpdateStock} onNavigate={handleCrossNavigate} />
        )}
        {activeTab === "chart" && (
          <ChartView stocks={stocks} selectedTicker={selectedTicker} />
        )}
        {activeTab === "thesis" && (
          <ThesisView stocks={stocks} selectedTicker={selectedTicker} onUpdateStock={handleUpdateStock} />
        )}
        {activeTab === "recommendations" && (
          <OutlierRecommendationsView stocks={stocks} />
        )}
      </main>

      {/* Branded Status Footer */}
      <footer className="bg-white border-t border-gray-100 py-4 px-6 mt-8 text-center text-4xs font-mono font-bold tracking-wider text-gray-400 uppercase select-none">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="flex items-center gap-1">
            <Fingerprint className="w-3.5 h-3.5 text-indigo-500" />
            <span>LOCAL MEMORY BLOCK SANDBOXED ACTIVE</span>
          </div>
          <span>EQUILIBRIUM PORTFOLIO SCREENER • © 2026</span>
        </div>
      </footer>

      {/* GLOBAL BEGINNER GLOSSARY MODAL */}
      {showGlossary && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-150 shadow-2xl flex flex-col justify-between">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-950 text-white rounded-t-2xl">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-teal-400" />
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Beginner Investment Glossary</h3>
                  <p className="text-4xs text-slate-300 font-sans mt-0.5">We explain professional and technical concepts in extremely simple, friendly terms.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowGlossary(false)}
                className="text-slate-300 hover:text-white px-2.5 py-1 text-3xs font-bold uppercase hover:bg-white/10 rounded-lg cursor-pointer transition-all"
              >
                Close
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 font-sans divide-y divide-gray-100">
              
              <div className="space-y-1 pt-0">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 pt-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 block" />
                  Stock Connection / Correlation 
                  <span className="text-4xs font-mono font-bold text-indigo-500 uppercase bg-indigo-50 px-1.5 py-0.5 rounded ml-2">r Value</span>
                </h4>
                <p className="text-3xs text-gray-650 leading-relaxed">
                  <strong>What it means:</strong> A "friendship score" that shows if two stocks dance to the exact same tune. 
                  If Stock A goes up and Stock B always climbs right along with it, they have a strong positive correlation (+1 is a perfect match!). Zero means they are totally independent.
                </p>
              </div>

              <div className="space-y-1 pt-4">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 block" />
                  Stock Price Outliers
                </h4>
                <p className="text-3xs text-gray-650 leading-relaxed">
                  <strong>What it means:</strong> Think of a stock's price like a rubber band centered around its historical average. 
                  When the price gets stretched way too high or too low, we call it an "outlier". Low outliers are heavily discounted and often make amazing buying opportunities!
                </p>
              </div>

              <div className="space-y-1 pt-4">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 block" />
                  Normal Boundaries / Standard Deviation
                  <span className="text-4xs font-mono font-bold text-indigo-500 uppercase bg-indigo-50 px-1.5 py-0.5 rounded ml-2">Sigma &sigma;</span>
                </h4>
                <p className="text-3xs text-gray-650 leading-relaxed">
                  <strong>What it means:</strong> The standard boundary limits within which a stock's price normally trades. 
                  Crossing these boundaries is unusual and signals that a stock is either historically cheap (buying opportunity) or overheated (selling opportunity).
                </p>
              </div>

              <div className="space-y-1 pt-4">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 block" />
                  Deviation Score / Z-Score
                  <span className="text-4xs font-mono font-bold text-indigo-500 uppercase bg-indigo-50 px-1.5 py-0.5 rounded ml-2">Z-Score</span>
                </h4>
                <p className="text-3xs text-gray-650 leading-relaxed">
                  <strong>What it means:</strong> A helper count showing just how far todays price has wandered away from its historical average. 
                  A score of +1.5 means the price is unusually expensive, while -1.5 means the price is unusually cheap and highly discounted.
                </p>
              </div>

              <div className="space-y-1 pt-4">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 block" />
                  Shared Trend Fit
                  <span className="text-4xs font-mono font-bold text-indigo-500 uppercase bg-indigo-50 px-1.5 py-0.5 rounded ml-2">R-Squared R²</span>
                </h4>
                <p className="text-3xs text-gray-650 leading-relaxed">
                  <strong>What it means:</strong> Explains what percentage of the companion stock's prices are directly tied to or driven by the main tech stock. 
                  For example, an R² of 85% means that 85% of the helper stock's changes happen because of trends in the main stock!
                </p>
              </div>

              <div className="space-y-1 pt-4">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 block" />
                  Amplification Multiplier
                  <span className="text-4xs font-mono font-bold text-indigo-500 uppercase bg-indigo-50 px-1.5 py-0.5 rounded ml-2">Beta &beta;</span>
                </h4>
                <p className="text-3xs text-gray-650 leading-relaxed">
                  <strong>What it means:</strong> An amplification score. 
                  If a complementary helper stock has a Beta of 1.5, it normally swings 50% wider/further than the main stock when prices move, creating higher percentage opportunities.
                </p>
              </div>

              <div className="space-y-1 pt-4">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 block" />
                  Co-Integration
                </h4>
                <p className="text-3xs text-gray-650 leading-relaxed">
                  <strong>What it means:</strong> Describes two stocks that are tethered together in the real-world utility or supply chain. This means even if they wander apart temporarily, they will always move back together soon.
                </p>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-150 rounded-b-2xl text-center">
              <button 
                onClick={() => setShowGlossary(false)}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-3xs font-mono uppercase tracking-wider font-bold shadow cursor-pointer transition-all"
              >
                Got it, let's trade!
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
