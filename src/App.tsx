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
import { supabase } from "./lib/supabase";
import { DiscussionEmbed } from 'disqus-react';

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
  Zap,
  MoreHorizontal,
  MessageSquare
} from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [showGlossary, setShowGlossary] = useState<boolean>(false);
  const [showDiscussion, setShowDiscussion] = useState<boolean>(false);
  const [showMoreMenu, setShowMoreMenu] = useState<boolean>(false);

  const commentsProps = {
    article: {
      url: typeof window !== "undefined" ? window.location.href : "https://smu-agentic-ai-stock-analyse.com",
      id: "smu-agentic-ai-stock-analyse-comments-hub-v2",
      title: "SMU Agentic AI Stock Analyse Discussion Hub"
    }
  };
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [events, setEvents] = useState<MarketEvent[]>(defaultMarketEvents);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

  // Fetch stocks from Supabase and sync local state
  const loadStocksFromSupabase = async () => {
    try {
      const { data, error } = await supabase
        .from("entries")
        .select("*")
        .order("id", { ascending: true });

      if (error) {
        console.error("Error fetching stocks from Supabase:", error);
        setStocks(defaultStocks);
        return;
      }

      if (!data || data.length === 0) {
        console.log("Supabase entries table is empty. Seeding defaults...");
        const seedRows = defaultStocks.map((stock) => ({
          text: JSON.stringify(stock),
          author: stock.ticker,
        }));
        const { error: seedError } = await supabase.from("entries").insert(seedRows);
        if (seedError) {
          console.error("Failed to seed default stocks:", seedError);
        }
        setStocks(defaultStocks);
        return;
      }

      // Build a map of the latest entry for each stock ticker (grouped by author)
      const stockMap = new Map<string, Stock | null>();
      for (const row of data) {
        if (!row.author || !row.text) continue;
        const ticker = row.author;
        if (row.text === "DELETED") {
          stockMap.set(ticker, null);
        } else {
          try {
            const stock = JSON.parse(row.text) as Stock;
            stockMap.set(ticker, stock);
          } catch (e) {
            // Gracefully ignore rows with invalid JSON layouts (e.g. diagnostic strings)
          }
        }
      }

      const activeStocks: Stock[] = [];
      for (const [_, stock] of stockMap.entries()) {
        if (stock) {
          activeStocks.push(stock);
        }
      }

      if (activeStocks.length === 0) {
        console.log("No valid active stocks found. Seeding defaults...");
        const seedRows = defaultStocks.map((stock) => ({
          text: JSON.stringify(stock),
          author: stock.ticker,
        }));
        await supabase.from("entries").insert(seedRows);
        setStocks(defaultStocks);
      } else {
        setStocks(activeStocks);
      }
    } catch (err) {
      console.error("Unexpected error in loadStocksFromSupabase:", err);
      setStocks(defaultStocks);
    }
  };

  const [isSyncingPrices, setIsSyncingPrices] = useState<boolean>(false);
  const [isSyncingNews, setIsSyncingNews] = useState<boolean>(false);
  const [newsError, setNewsError] = useState<string | null>(null);

  const loadLiveNews = async () => {
    setIsSyncingNews(true);
    setNewsError(null);
    try {
      const response = await fetch("/api/live-news");
      const data = await response.json();
      if (data && data.success && Array.isArray(data.news)) {
        setEvents((prev) => {
          const existingIds = new Set(prev.map(e => e.id));
          const filteredNews = data.news.filter((item: any) => !existingIds.has(item.id));
          return [...filteredNews, ...prev];
        });
      } else {
        setNewsError(data?.error || "Failed to process live RSS stream");
      }
    } catch (err: any) {
      console.warn("Live headlines RSS fetch error in frontend:", err);
      // Suppress alert so background load doesn't disturb user
      setNewsError(err.message);
    } finally {
      setIsSyncingNews(false);
    }
  };

  const handleSyncPrices = async () => {
    if (isSyncingPrices || stocks.length === 0) {
      alert("No stocks currently selected or synchronization is already underway.");
      return;
    }
    setIsSyncingPrices(true);
    try {
      const tickers = stocks.map(s => s.ticker);
      const res = await fetch("/api/sync-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tickers })
      });
      const data = await res.json();
      if (data && data.success && data.prices) {
        setStocks((prev) => {
          const updated = prev.map(s => {
            const live = data.prices[s.ticker];
            if (live) {
              return {
                ...s,
                stats: {
                  ...s.stats,
                  currentPrice: Number(live.currentPrice.toFixed(2)),
                  high52w: Number(live.high52w.toFixed(2)),
                  low52w: Number(live.low52w.toFixed(2)),
                  movingAverage50: Number(live.movingAverage50.toFixed(2))
                }
              };
            }
            return s;
          });
          
          // Non-blocking sync to Supabase table
          updated.forEach(async (item) => {
            await supabase
              .from("entries")
              .insert([{ text: JSON.stringify(item), author: item.ticker }]);
          });
          
          return updated;
        });
        alert("Yahoo Finance live stock prices and moving averages synchronized successfully!");
      } else {
        alert("Live stock pricing endpoint didn't return any data. Using static fallbacks.");
      }
    } catch (err) {
      console.error("Failed to sync current prices:", err);
      alert("Pricing sync API currently offline. Reverting to high-fidelity presets.");
    } finally {
      setIsSyncingPrices(false);
    }
  };

  // Setup Supabase live update subscription and fetch initial list
  useEffect(() => {
    loadStocksFromSupabase();
    loadLiveNews();

    // Set up a recurring interval to fetch news every 15 minutes (15 * 60 * 1000 ms)
    const newsInterval = setInterval(() => {
      loadLiveNews();
    }, 15 * 60 * 1000);

    // Setup active real-time channel synchronizing updates across clients
    const channel = supabase
      .channel("entries_realtime_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "entries" },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const newRow = payload.new;
            if (newRow && newRow.author) {
              const ticker = newRow.author;
              if (newRow.text === "DELETED") {
                setStocks((prev) => prev.filter((s) => s.ticker !== ticker));
              } else {
                try {
                  const updatedStock = JSON.parse(newRow.text) as Stock;
                  setStocks((prev) => {
                    const exists = prev.some((s) => s.ticker === ticker);
                    if (exists) {
                      return prev.map((s) => (s.ticker === ticker ? updatedStock : s));
                    } else {
                      return [updatedStock, ...prev];
                    }
                  });
                } catch (e) {
                  console.error("Failed to parse real-time stock payload:", e);
                }
              }
            }
          } else if (payload.eventType === "DELETE") {
            // Trigger a full list reload to check for missing rows
            loadStocksFromSupabase();
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(newsInterval);
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAddStock = async (newStock: Stock) => {
    // Avoid local duplicates before requesting network insert
    if (stocks.some((s) => s.ticker === newStock.ticker)) {
      alert(`${newStock.ticker} is already registered in watchlist.`);
      return;
    }
    const { error } = await supabase
      .from("entries")
      .insert([{ text: JSON.stringify(newStock), author: newStock.ticker }]);
    if (error) {
      console.error("Failed to add stock to Supabase:", error);
    }
  };

  const handleUpdateStock = async (updatedStock: Stock) => {
    const { error } = await supabase
      .from("entries")
      .insert([{ text: JSON.stringify(updatedStock), author: updatedStock.ticker }]);
    if (error) {
      console.error("Failed to update stock in Supabase:", error);
    }
  };

  const handleRemoveStock = async (ticker: string) => {
    const { error } = await supabase
      .from("entries")
      .insert([{ text: "DELETED", author: ticker }]);
    if (error) {
      console.error("Failed to remove stock from Supabase:", error);
    }
  };

  const handleRestoreDefaults = async () => {
    if (confirm("Reset current watchlist to default sample focus stocks? Any custom scores/decisions will be reset.")) {
      // Clear previous rows from table
      const { error: deleteError } = await supabase
        .from("entries")
        .delete()
        .gt("id", 0);

      if (deleteError) {
        console.error("Failed to clear entries on restore defaults:", deleteError);
      }

      // Bulk insert default stocks
      const seedRows = defaultStocks.map((stock) => ({
        text: JSON.stringify(stock),
        author: stock.ticker,
      }));
      const { error: insertError } = await supabase.from("entries").insert(seedRows);
      if (insertError) {
        console.error("Failed to insert seeding defaults:", insertError);
      }

      await loadStocksFromSupabase();
      if (defaultStocks.length > 0) {
        setSelectedTicker(defaultStocks[0].ticker);
      }
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
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col antialiased relative selection:bg-indigo-600 selection:text-white">
      
      {/* Primary Branded Header - Streamlined for Mobile, Interactive for Desktop */}
      <header className="sticky top-0 z-50 bg-slate-900 border-b border-slate-850 px-4 md:px-6 py-3.5 flex justify-between items-center text-white">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-md flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold tracking-widest text-indigo-400 block leading-none uppercase">ASYNCHRONOUS ALPHA</span>
            <h1 className="text-sm md:text-md font-extrabold tracking-tight font-display text-white mt-1">EQUILIBRIUM SUITE</h1>
          </div>
        </div>

        {/* Global tab navbar row - Visible only on Desktop screens (md and wider) */}
        <nav className="hidden md:flex flex-wrap items-center justify-end gap-1.5 font-sans font-semibold text-3xs uppercase">
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
            onClick={handleSyncPrices}
            disabled={isSyncingPrices}
            className={`px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border ml-1.5 hover:shadow-md ${
              isSyncingPrices 
                ? "bg-slate-850 text-slate-500 border-slate-800" 
                : "bg-emerald-950/40 hover:bg-emerald-900/30 text-emerald-300 border-emerald-500/30 font-semibold"
            }`}
          >
            <TrendingUp className={`w-3.5 h-3.5 ${isSyncingPrices ? "animate-spin" : ""}`} />
            {isSyncingPrices ? "Syncing..." : "Sync Live Prices"}
          </button>

          <button
            onClick={() => setShowDiscussion(true)}
            className="px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 ml-1.5"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Live Comments
          </button>

          <button
            onClick={() => setShowGlossary(true)}
            className="px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 ml-1.5"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Beginner Glossary
          </button>
        </nav>

        {/* Quick Help / Disqus Button - Streamlined for Mobile Navbar right side to maximize touch accessibility */}
        <div className="md:hidden flex gap-1.5 items-center bg-slate-800 rounded-xl px-2 py-1 border border-slate-750 max-h-[40px]">
          <button
            onClick={handleSyncPrices}
            disabled={isSyncingPrices}
            className="px-2 py-1 flex items-center gap-1 text-emerald-400 hover:text-white transition-colors cursor-pointer"
          >
            <TrendingUp className={`w-3 h-3 ${isSyncingPrices ? "animate-spin" : ""}`} />
            <span className="text-[10px] uppercase font-extrabold leading-none">{isSyncingPrices ? "Sync" : "Sync"}</span>
          </button>
          <div className="w-px bg-slate-700 self-stretch my-1" />
          <button
            onClick={() => setShowDiscussion(true)}
            className="px-2 py-1 flex items-center gap-1 text-teal-300 hover:text-white transition-colors cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="text-[10px] uppercase font-extrabold leading-none">Comments</span>
          </button>
          <div className="w-px bg-slate-700 self-stretch my-1" />
          <button
            onClick={() => setShowGlossary(true)}
            className="px-2 py-1 flex items-center gap-1 text-teal-300 hover:text-white transition-colors cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="text-[10px] uppercase font-extrabold leading-none">Glossary</span>
          </button>
        </div>
      </header>

      {/* Primary viewport content - Balanced spacing with safe margins preventing bottom dock coverage */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 py-6 pb-24 md:pb-8">
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

      {/* iOS styled Bottom Tab Bar for Mobile (iPhone viewports) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[80] bg-white/85 backdrop-blur-md border-t border-gray-150 pb-5 pt-1.5 shadow-[0_-5px_15px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-around h-12 px-2">
          {/* Dashboard Tab */}
          <button
            onClick={() => { setActiveTab("dashboard"); setShowMoreMenu(false); }}
            className={`flex flex-col items-center justify-center flex-1 h-full cursor-pointer transition-colors ${
              activeTab === "dashboard" ? "text-indigo-600 font-extrabold" : "text-gray-400 font-medium"
            }`}
          >
            <BarChart4 className="w-5 h-5 mb-0.5" />
            <span className="text-[9px] tracking-tight leading-none">Dashboard</span>
          </button>

          {/* Core Guide Tab */}
          <button
            onClick={() => { setActiveTab("recommendations"); setShowMoreMenu(false); }}
            className={`flex flex-col items-center justify-center flex-1 h-full cursor-pointer transition-colors ${
              activeTab === "recommendations" ? "text-indigo-600 font-extrabold" : "text-gray-400 font-medium"
            }`}
          >
            <Zap className="w-5 h-5 mb-0.5" />
            <span className="text-[9px] tracking-tight leading-none">Trade Guide</span>
          </button>

          {/* Scorecard Tab */}
          <button
            onClick={() => { setActiveTab("scorecard"); setShowMoreMenu(false); }}
            className={`flex flex-col items-center justify-center flex-1 h-full cursor-pointer transition-colors ${
              activeTab === "scorecard" ? "text-indigo-600 font-extrabold" : "text-gray-400 font-medium"
            }`}
          >
            <Sliders className="w-5 h-5 mb-0.5" />
            <span className="text-[9px] tracking-tight leading-none">Screener</span>
          </button>

          {/* Portfolio Tab */}
          <button
            onClick={() => { setActiveTab("portfolio"); setShowMoreMenu(false); }}
            className={`flex flex-col items-center justify-center flex-1 h-full cursor-pointer transition-colors ${
              activeTab === "portfolio" ? "text-indigo-600 font-extrabold" : "text-gray-400 font-medium"
            }`}
          >
            <Briefcase className="w-5 h-5 mb-0.5" />
            <span className="text-[9px] tracking-tight leading-none">Portfolio</span>
          </button>

          {/* More actions Tab (slide up drawer) */}
          <button
            onClick={() => setShowMoreMenu(prev => !prev)}
            className={`flex flex-col items-center justify-center flex-1 h-full cursor-pointer transition-colors ${
              showMoreMenu ? "text-indigo-600 font-extrabold" : "text-gray-400 font-medium"
            }`}
          >
            <MoreHorizontal className="w-5 h-5 mb-0.5" />
            <span className="text-[9px] tracking-tight leading-none">More Tools</span>
          </button>
        </div>
      </div>

      {/* iOS style Overlay Slide-up Drawer for Mobile Auxiliary Tools */}
      {showMoreMenu && (
        <div className="fixed inset-0 z-[75] bg-black/40 backdrop-blur-xs md:hidden animate-fade-in" onClick={() => setShowMoreMenu(false)}>
          <div 
            className="absolute bottom-20 left-4 right-4 bg-white rounded-2xl border border-gray-150 shadow-2xl p-5 space-y-4 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-gray-100 pb-2.5">
              <h3 className="font-bold text-xs uppercase text-slate-400 tracking-wider font-mono">Auxiliary Trading Tools</h3>
              <button 
                onClick={() => setShowMoreMenu(false)}
                className="text-4xs font-bold text-indigo-600 uppercase tracking-widest px-2 py-1 bg-indigo-50 rounded-lg"
              >
                Done
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 pb-2 select-none">
              <button
                onClick={() => { setActiveTab("scanner"); setShowMoreMenu(false); }}
                className={`py-3 px-3 rounded-xl border flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer ${
                  activeTab === "scanner" ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-50 border-gray-150 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Search className="w-4 h-4" />
                <span className="text-4xs font-bold uppercase tracking-wider block">Event Scanner</span>
              </button>

              <button
                onClick={() => { setActiveTab("watchlist"); setShowMoreMenu(false); }}
                className={`py-3 px-3 rounded-xl border flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer ${
                  activeTab === "watchlist" ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-50 border-gray-150 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <FolderPlus className="w-4 h-4" />
                <span className="text-4xs font-bold uppercase tracking-wider block">Watchlist Add</span>
              </button>

              <button
                onClick={() => { setActiveTab("decision"); setShowMoreMenu(false); }}
                className={`py-3 px-3 rounded-xl border flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer ${
                  activeTab === "decision" ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-50 border-gray-150 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span className="text-4xs font-bold uppercase tracking-wider block">Decide Tool</span>
              </button>

              <button
                onClick={() => { setActiveTab("chart"); setShowMoreMenu(false); }}
                className={`py-3 px-3 rounded-xl border flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer ${
                  activeTab === "chart" ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-50 border-gray-150 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <LineChart className="w-4 h-4" />
                <span className="text-4xs font-bold uppercase tracking-wider block">Performance</span>
              </button>

              <button
                onClick={() => { setActiveTab("thesis"); setShowMoreMenu(false); }}
                className={`py-3 px-3 rounded-xl border flex flex-col items-center justify-center gap-1 text-center transition-col cursor-pointer col-span-2 ${
                  activeTab === "thesis" ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-50 border-gray-150 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span className="text-4xs font-bold uppercase tracking-wider block">Thesis Checklists</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Branded Status Footer */}
      <footer className="bg-white border-t border-gray-100 py-4 px-6 mt-8 mb-20 md:mb-0 text-center text-4xs font-mono font-bold tracking-wider text-gray-400 uppercase select-none">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="flex items-center gap-1">
            <Fingerprint className="w-3.5 h-3.5 text-indigo-500" />
            <span>LOCAL MEMORY BLOCK SANDBOXED ACTIVE</span>
          </div>
          <span>EQUILIBRIUM PORTFOLIO SCREENER • © 2026</span>
        </div>
      </footer>

      {/* GLOBAL BEGINNER GLOSSARY MODAL WITH DISQUS INTEGRATION */}
      {showGlossary && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] border border-gray-150 shadow-2xl flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-950 text-white shrink-0">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-teal-400 font-bold" />
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Equilibrium Knowledge & Discussion Hub</h3>
                  <p className="text-4xs text-slate-300 font-sans mt-0.5">Learn trading definitions and post comments or strategy ideas live with your peers.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowGlossary(false)}
                className="text-slate-300 hover:text-white px-2.5 py-1 text-3xs font-bold uppercase hover:bg-white/10 rounded-lg cursor-pointer transition-all"
              >
                Close
              </button>
            </div>

            {/* Modal Body / Split screen columns */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-150">
              
              {/* Left Column: Beginner Investment Glossary */}
              <div className="p-6 space-y-5 font-sans divide-y divide-gray-100 overflow-y-auto max-h-[45vh] md:max-h-full">
                <h4 className="text-3xs uppercase font-extrabold tracking-wider text-slate-400 font-mono pb-2">
                  Part 1: Trading Concept Help
                </h4>

                <div className="space-y-1 pt-3">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 block flex-shrink-0" />
                    Stock Connection / Correlation 
                    <span className="text-[9px] font-mono font-bold text-indigo-500 uppercase bg-indigo-50 px-1.5 py-0.5 rounded ml-auto">r Value</span>
                  </h4>
                  <p className="text-3xs text-gray-600 leading-relaxed">
                    <strong>What it means:</strong> A "friendship score" that shows if two stocks dance to the exact same tune. 
                    If Stock A goes up and Stock B always climbs right along with it, they have a strong positive correlation (+1 is a perfect match!). Zero means they are totally independent.
                  </p>
                </div>

                <div className="space-y-1 pt-4">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 block flex-shrink-0" />
                    Stock Price Outliers
                    <span className="text-[9px] font-mono font-bold text-teal-600 uppercase bg-teal-50 px-1.5 py-0.5 rounded ml-auto">Outlier</span>
                  </h4>
                  <p className="text-3xs text-gray-600 leading-relaxed">
                    <strong>What it means:</strong> Think of a stock's price like a rubber band centered around its historical average. 
                    When the price gets stretched way too high or too low, we call it an "outlier". Low outliers are heavily discounted and often make amazing buying opportunities!
                  </p>
                </div>

                <div className="space-y-1 pt-4">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 block flex-shrink-0" />
                    Normal Boundaries / Standard Deviation
                    <span className="text-[9px] font-mono font-bold text-indigo-500 uppercase bg-indigo-50 px-1.5 py-0.5 rounded ml-auto">Sigma &sigma;</span>
                  </h4>
                  <p className="text-3xs text-gray-600 leading-relaxed">
                    <strong>What it means:</strong> The standard boundary limits within which a stock's price normally trades. 
                    Crossing these boundaries is unusual and signals that a stock is either historically cheap (buying opportunity) or overheated (selling opportunity).
                  </p>
                </div>

                <div className="space-y-1 pt-4">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 block flex-shrink-0" />
                    Deviation Score / Z-Score
                    <span className="text-[9px] font-mono font-bold text-indigo-500 uppercase bg-indigo-50 px-1.5 py-0.5 rounded ml-auto">Z-Score</span>
                  </h4>
                  <p className="text-3xs text-gray-600 leading-relaxed">
                    <strong>What it means:</strong> A helper count showing just how far todays price has wandered away from its historical average. 
                    A score of +1.5 means the price is unusually expensive, while -1.5 means the price is unusually cheap and highly discounted.
                  </p>
                </div>

                <div className="space-y-1 pt-4">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 block flex-shrink-0" />
                    Shared Trend Fit
                    <span className="text-[9px] font-mono font-bold text-indigo-500 uppercase bg-indigo-50 px-1.5 py-0.5 rounded ml-auto">R-Squared R²</span>
                  </h4>
                  <p className="text-3xs text-gray-600 leading-relaxed">
                    <strong>What it means:</strong> Explains what percentage of the companion stock's prices are directly tied to or driven by the main tech stock. 
                    For example, an R² of 85% means that 85% of the helper stock's changes happen because of trends in the main stock!
                  </p>
                </div>

                <div className="space-y-1 pt-4">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 block flex-shrink-0" />
                    Amplification Multiplier
                    <span className="text-[9px] font-mono font-bold text-indigo-500 uppercase bg-indigo-50 px-1.5 py-0.5 rounded ml-auto">Beta &beta;</span>
                  </h4>
                  <p className="text-3xs text-gray-600 leading-relaxed">
                    <strong>What it means:</strong> An amplification score. 
                    If a complementary helper stock has a Beta of 1.5, it normally swings 50% wider/further than the main stock when prices move, creating higher percentage opportunities.
                  </p>
                </div>

                <div className="space-y-1 pt-4">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 block flex-shrink-0" />
                    Co-Integration
                    <span className="text-[9px] font-mono font-bold text-indigo-500 uppercase bg-indigo-50 px-1.5 py-0.5 rounded ml-auto">Co-Int</span>
                  </h4>
                  <p className="text-3xs text-gray-600 leading-relaxed">
                    <strong>What it means:</strong> Describes two stocks that are tethered together in the real-world utility or supply chain. This means even if they wander apart temporarily, they will always move back together soon.
                  </p>
                </div>
              </div>

              {/* Right Column: Disqus Live Comments Widget */}
              <div className="p-6 bg-slate-50 overflow-y-auto max-h-[45vh] md:max-h-full flex flex-col justify-start">
                <div className="flex items-center gap-2 border-b border-gray-200 pb-3 mb-4 shrink-0">
                  <MessageSquare className="w-5 h-5 text-indigo-600" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-950 font-sans">Part 2: Community Discussion Feed</h4>
                    <p className="text-4xs text-slate-400 font-sans">Disqus widget • English (Singapore) en_SG preset enabled</p>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-150 shadow-xs flex-1 min-h-[300px]">
                  <DiscussionEmbed
                    shortname="smu-agentic-ai-stock-analyse"
                    config={{
                      url: typeof window !== "undefined" ? window.location.href : "https://smu-agentic-ai-stock-analyse.com",
                      identifier: "smu-agentic-ai-stock-analyse-comments-v1",
                      title: "SMU Agentic AI Stock Analyse Discussion Hub",
                      language: "en_SG"
                    }}
                  />
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-150 rounded-b-2xl text-center shrink-0">
              <button 
                onClick={() => setShowGlossary(false)}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-3xs font-mono uppercase tracking-wider font-bold shadow cursor-pointer transition-all"
              >
                Got it, close hub!
              </button>
            </div>

          </div>
        </div>
      )}

      {/* DISQUS DISCUSSIONS OVERLAY SECTION */}
      {showDiscussion && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] border border-gray-150 shadow-2xl flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-950 text-white shrink-0">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-teal-400 font-bold" />
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Equilibrium Community Strategy Hub</h3>
                  <p className="text-4xs text-slate-300 font-sans mt-0.5">Exchange strategies with other traders. English (Singapore) language translation is enabled.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowDiscussion(false)}
                className="text-slate-300 hover:text-white px-2.5 py-1 text-3xs font-bold uppercase hover:bg-white/10 rounded-lg cursor-pointer transition-all"
              >
                Close
              </button>
            </div>

            {/* Modal Body / Comments Section */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
              <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-150 shadow-xs">
                <DiscussionEmbed
                  shortname='smu-agentic-ai-stock-analyse'
                  config={
                    {
                      url: commentsProps.article.url,
                      identifier: commentsProps.article.id,
                      title: commentsProps.article.title,
                      language: 'en_SG' //e.g. for English (Singapore)
                    }
                  }
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-150 rounded-b-2xl text-center shrink-0">
              <button 
                onClick={() => setShowDiscussion(false)}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-3xs font-mono uppercase tracking-wider font-bold shadow cursor-pointer transition-all"
              >
                Got it, let's discuss!
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
