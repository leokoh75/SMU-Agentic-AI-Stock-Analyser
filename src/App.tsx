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
import { CoupledPairsView } from "./components/CoupledPairsView";
import { PriceAlertsView, PriceAlert } from "./components/PriceAlertsView";
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
  MessageSquare,
  Bell,
  Sun,
  Moon,
  Link2
} from "lucide-react";

// Helper to determine minutes corresponding to standard refresh keys
const getRefreshMinutes = (rate: string): number => {
  switch (rate) {
    case "15min": return 15;
    case "30min": return 30;
    case "1hr": return 60;
    case "6hr": return 360;
    case "12hr": return 720;
    case "24hr": return 1440;
    default: return 15;
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [showGlossary, setShowGlossary] = useState<boolean>(false);
  const [showDiscussion, setShowDiscussion] = useState<boolean>(false);
  const [showMoreMenu, setShowMoreMenu] = useState<boolean>(false);

  // User-configurable refresh rate of all data points
  const [refreshRate, setRefreshRate] = useState<string>(() => {
    try {
      return localStorage.getItem("equilibrium_refresh_rate") || "15min";
    } catch {
      return "15min";
    }
  });

  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState<number>(() => {
    return getRefreshMinutes(localStorage.getItem("equilibrium_refresh_rate") || "15min") * 60;
  });

  // Helper to format countdown seconds nicely
  const formatCountdown = (secs: number): string => {
    if (secs >= 365) {
      if (secs >= 3600) {
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        return `${h}h ${m}m ${secs % 60}s`;
      }
    }
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  useEffect(() => {
    try {
      localStorage.setItem("equilibrium_refresh_rate", refreshRate);
    } catch (e) {
      console.warn("Refresh rate storage blocked:", e);
    }
    setSecondsUntilRefresh(getRefreshMinutes(refreshRate) * 60);
  }, [refreshRate]);

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("equilibrium_theme");
      return stored === "dark";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("equilibrium_theme", darkMode ? "dark" : "light");
      if (darkMode) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } catch (e) {
      console.warn("Theme toggle error:", e);
    }
  }, [darkMode]);

  // Load registered price alerts from local memory
  const [alerts, setAlerts] = useState<PriceAlert[]>(() => {
    try {
      const cached = localStorage.getItem("equilibrium_price_alerts");
      if (!cached) return [];
      const parsed = JSON.parse(cached) as any[];
      return parsed.map(item => ({
        ...item,
        email: item.email || "leokoh75@gmail.com",
        triggerType: item.triggerType || (item.condition === "BELOW" ? "BUY" : "SELL")
      }));
    } catch {
      return [];
    }
  });

  const [isSendingAlert, setIsSendingAlert] = useState<boolean>(false);

  // Sync price alerts to local storage
  useEffect(() => {
    try {
      localStorage.setItem("equilibrium_price_alerts", JSON.stringify(alerts));
    } catch (e) {
      console.warn("localStorage alerts write blocked:", e);
    }
  }, [alerts]);

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

      // Check if any default stocks are missing from stockMap completely (never in database)
      const missingDefaults = defaultStocks.filter(ds => !stockMap.has(ds.ticker));
      if (missingDefaults.length > 0) {
        console.log(`Discovered ${missingDefaults.length} missing default stocks. Merging and seeding...`);
        const seedRows = missingDefaults.map((stock) => ({
          text: JSON.stringify(stock),
          author: stock.ticker,
        }));
        const { error: seedError } = await supabase.from("entries").insert(seedRows);
        if (seedError) {
          console.error("Failed to seed missing defaults:", seedError);
        }
        activeStocks.push(...missingDefaults);
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

  // Evaluate active alerts against the newest stock pricing indices
  const checkActiveAlertsAndNotify = async (currentStocksList: Stock[]) => {
    // We need to bypass stale state reading from closure by reading from the current list
    const activeAlerts = alertsRef.current.filter(a => a.isActive);
    if (activeAlerts.length === 0) return;

    const triggeredAlertIds: string[] = [];

    for (const alertItem of activeAlerts) {
      const matched = currentStocksList.find(s => s.ticker === alertItem.ticker);
      if (!matched) continue;

      const livePrice = matched.stats.currentPrice;
      const thresholdPrice = alertItem.targetPrice;
      const isBreached = alertItem.condition === "ABOVE" 
        ? livePrice >= thresholdPrice 
        : livePrice <= thresholdPrice;

      if (isBreached) {
        triggeredAlertIds.push(alertItem.id);
        console.log(`Alert sentinel triggered for ${alertItem.ticker}: Live $${livePrice} crossed Limit $${thresholdPrice}`);

        try {
          // Fire alert payload into Express backend
          const res = await fetch("/api/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ticker: alertItem.ticker,
              currentPrice: livePrice,
              targetPrice: thresholdPrice,
              condition: alertItem.condition,
              triggerType: alertItem.triggerType || "BUY",
              email: alertItem.email || "leokoh75@gmail.com"
            })
          });
          const responseData = await res.json();
          console.log("Automated Email Sentinel Response:", responseData);
        } catch (err) {
          console.error("Failed to deliver automated sentinel check over background channels:", err);
        }
      }
    }

    if (triggeredAlertIds.length > 0) {
      setAlerts(prev => prev.map(a => 
        triggeredAlertIds.includes(a.id) 
          ? { ...a, isActive: false, triggeredAt: new Date().toISOString() } 
          : a
      ));
    }
  };

  const silentSyncPrices = async (currentStocks: Stock[]) => {
    if (currentStocks.length === 0) return;
    try {
      const tickers = currentStocks.map(s => s.ticker);
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

          // Evaluate alerts against fresh prices
          checkActiveAlertsAndNotify(updated);

          return updated;
        });
      }
    } catch (err) {
      console.warn("Silent background price sync execution error:", err);
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
        let freshStocks: Stock[] = [];
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
          
          freshStocks = updated;
          return updated;
        });

        // Evaluate alerts against newly loaded manual prices
        setTimeout(() => {
          if (freshStocks.length > 0) {
            checkActiveAlertsAndNotify(freshStocks);
          }
        }, 100);

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

  const handleTestEmail = async (alertItem: PriceAlert) => {
    setIsSendingAlert(true);
    try {
      const stock = stocks.find(s => s.ticker === alertItem.ticker);
      const curPrice = stock ? stock.stats.currentPrice : alertItem.targetPrice;

      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: alertItem.ticker,
          currentPrice: curPrice,
          targetPrice: alertItem.targetPrice,
          condition: alertItem.condition,
          triggerType: alertItem.triggerType || "BUY",
          email: alertItem.email || "leokoh75@gmail.com"
        })
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      console.error("Failed to execute manual Email dispatch helper:", err);
      return { success: false, error: err.message };
    } finally {
      setIsSendingAlert(false);
    }
  };

  const stocksRef = React.useRef(stocks);
  const alertsRef = React.useRef(alerts);

  useEffect(() => {
    stocksRef.current = stocks;
  }, [stocks]);

  useEffect(() => {
    alertsRef.current = alerts;
  }, [alerts]);

  // Setup Supabase live update subscription and fetch initial list
  useEffect(() => {
    loadStocksFromSupabase();
    loadLiveNews();

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
      supabase.removeChannel(channel);
    };
  }, []);

  // Central timer clock ticking every 1 sec to count down and trigger silent refresh of prices and news
  useEffect(() => {
    const rateMinutes = getRefreshMinutes(refreshRate);
    setSecondsUntilRefresh(rateMinutes * 60);

    const secondsClock = setInterval(() => {
      setSecondsUntilRefresh((prev) => {
        if (prev <= 1) {
          console.log(`Timer elapsed for refresh rate ${refreshRate}. Refreshing all live datapoint feeds...`);
          
          // Trigger dual background syncs non-blockingly
          loadLiveNews();
          if (stocksRef.current && stocksRef.current.length > 0) {
            silentSyncPrices(stocksRef.current);
          }
          
          return rateMinutes * 60; // Reset countdown
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(secondsClock);
    };
  }, [refreshRate]);

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
    <div className={`min-h-screen ${darkMode ? "dark bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-800"} flex flex-col antialiased relative selection:bg-indigo-600 selection:text-white`}>
      
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
            onClick={() => setActiveTab("pairs")}
            className={`px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "pairs" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            Coupled Pairs
          </button>

          <button
            onClick={() => setActiveTab("alerts")}
            className={`px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "alerts" ? "bg-indigo-600 text-white" : "text-indigo-400 hover:text-indigo-300"
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            Alerts Hub
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

          {/* Theme Toggle Button */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            title={darkMode ? "Switch to light mode" : "Switch to late-night screen mode"}
            className="px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 ml-1.5 active:scale-95"
          >
            {darkMode ? (
              <Sun className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-spin-slow" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-indigo-300" />
            )}
            <span>{darkMode ? "Light" : "Dark"}</span>
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
          <div className="w-px bg-slate-700 self-stretch my-1" />
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="px-2 py-1 flex items-center gap-1 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            {darkMode ? (
              <Sun className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-indigo-300" />
            )}
            <span className="text-[10px] uppercase font-extrabold leading-none">{darkMode ? "Light" : "Dark"}</span>
          </button>
        </div>
      </header>

      {/* Real-time Data Freshness & Custom Refresh Rate Control HUD */}
      <section id="refresh-hud" className="bg-slate-900 border-b border-slate-800 px-4 md:px-6 py-2.5 text-slate-400 text-3xs font-mono tracking-wide flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 select-none shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse shrink-0"></span>
          <span className="font-extrabold uppercase text-emerald-400">Data-Grid Active</span>
          <span className="text-slate-700">|</span>
          <span className="text-slate-400">Next Automatic Live Sync in:</span>
          <span className="px-2 py-0.5 bg-indigo-950/80 border border-indigo-800 text-indigo-300 rounded font-bold">{formatCountdown(secondsUntilRefresh)}</span>
          {isSyncingPrices && (
            <span className="text-emerald-400 animate-pulse text-[10px] ml-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 animate-spin" /> syncing...
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 font-sans text-3xs">
          <label htmlFor="refresh-rate" className="text-slate-400 font-mono font-bold">Refresh Rate Period:</label>
          <select
            id="refresh-rate"
            value={refreshRate}
            onChange={(e) => setRefreshRate(e.target.value)}
            className="p-1 px-1.5 border border-slate-700 rounded-md bg-slate-850 text-slate-200 font-bold font-mono focus:outline-hidden"
          >
            <option value="15min">15 Minutes</option>
            <option value="30min">30 Minutes</option>
            <option value="1hr">1 Hour</option>
            <option value="6hr">6 Hours</option>
            <option value="12hr">12 Hours</option>
            <option value="24hr">24 Hours</option>
          </select>
        </div>
      </section>

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
            onAddAlert={(add) => setAlerts(p => [add, ...p])}
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
        {activeTab === "pairs" && (
          <CoupledPairsView stocks={stocks} />
        )}
        {activeTab === "alerts" && (
          <PriceAlertsView
            stocks={stocks}
            alerts={alerts}
            onAddAlert={(add) => setAlerts(p => [add, ...p])}
            onRemoveAlert={(id) => setAlerts(p => p.filter(a => a.id !== id))}
            onToggleAlert={(id) => setAlerts(p => p.map(a => a.id === id ? { ...a, isActive: !a.isActive } : a))}
            onTestEmail={handleTestEmail}
            isProcessing={isSendingAlert}
          />
        )}
      </main>

      {/* iOS styled Bottom Tab Bar for Mobile (iPhone viewports) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[80] bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-t border-gray-150 dark:border-slate-800 pb-5 pt-1.5 shadow-[0_-5px_15px_rgba(0,0,0,0.06)] dark:shadow-[0_-5px_15px_rgba(0,0,0,0.3)]">
        <div className="flex items-center justify-around h-12 px-2">
          {/* Dashboard Tab */}
          <button
            onClick={() => { setActiveTab("dashboard"); setShowMoreMenu(false); }}
            className={`flex flex-col items-center justify-center flex-1 h-full cursor-pointer transition-colors ${
              activeTab === "dashboard" ? "text-indigo-600 dark:text-indigo-400 font-extrabold" : "text-gray-400 dark:text-slate-400 font-medium"
            }`}
          >
            <BarChart4 className="w-5 h-5 mb-0.5" />
            <span className="text-[9px] tracking-tight leading-none">Dashboard</span>
          </button>

          {/* Core Guide Tab */}
          <button
            onClick={() => { setActiveTab("recommendations"); setShowMoreMenu(false); }}
            className={`flex flex-col items-center justify-center flex-1 h-full cursor-pointer transition-colors ${
              activeTab === "recommendations" ? "text-indigo-600 dark:text-indigo-400 font-extrabold" : "text-gray-400 dark:text-slate-400 font-medium"
            }`}
          >
            <Zap className="w-5 h-5 mb-0.5" />
            <span className="text-[9px] tracking-tight leading-none">Trade Guide</span>
          </button>

          {/* Scorecard Tab */}
          <button
            onClick={() => { setActiveTab("scorecard"); setShowMoreMenu(false); }}
            className={`flex flex-col items-center justify-center flex-1 h-full cursor-pointer transition-colors ${
              activeTab === "scorecard" ? "text-indigo-600 dark:text-indigo-400 font-extrabold" : "text-gray-400 dark:text-slate-400 font-medium"
            }`}
          >
            <Sliders className="w-5 h-5 mb-0.5" />
            <span className="text-[9px] tracking-tight leading-none">Screener</span>
          </button>

          {/* Portfolio Tab */}
          <button
            onClick={() => { setActiveTab("portfolio"); setShowMoreMenu(false); }}
            className={`flex flex-col items-center justify-center flex-1 h-full cursor-pointer transition-colors ${
              activeTab === "portfolio" ? "text-indigo-600 dark:text-indigo-400 font-extrabold" : "text-gray-400 dark:text-slate-400 font-medium"
            }`}
          >
            <Briefcase className="w-5 h-5 mb-0.5" />
            <span className="text-[9px] tracking-tight leading-none">Portfolio</span>
          </button>

          {/* More actions Tab (slide up drawer) */}
          <button
            onClick={() => setShowMoreMenu(prev => !prev)}
            className={`flex flex-col items-center justify-center flex-1 h-full cursor-pointer transition-colors ${
              showMoreMenu ? "text-indigo-600 dark:text-indigo-400 font-extrabold" : "text-gray-400 dark:text-slate-400 font-medium"
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
            className="absolute bottom-20 left-4 right-4 bg-white dark:bg-slate-900 rounded-2xl border border-gray-150 dark:border-slate-800 shadow-2xl p-5 space-y-4 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-800 pb-2.5">
              <h3 className="font-bold text-xs uppercase text-slate-400 tracking-wider font-mono">Auxiliary Trading Tools</h3>
              <button 
                onClick={() => setShowMoreMenu(false)}
                className="text-4xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest px-2 py-1 bg-indigo-50 dark:bg-indigo-950/60 rounded-lg"
              >
                Done
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 pb-2 select-none">
              <button
                onClick={() => { setActiveTab("scanner"); setShowMoreMenu(false); }}
                className={`py-3 px-3 rounded-xl border flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer ${
                  activeTab === "scanner" ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-50 dark:bg-slate-850 border-gray-150 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <Search className="w-4 h-4" />
                <span className="text-4xs font-bold uppercase tracking-wider block">Event Scanner</span>
              </button>

              <button
                onClick={() => { setActiveTab("watchlist"); setShowMoreMenu(false); }}
                className={`py-3 px-3 rounded-xl border flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer ${
                  activeTab === "watchlist" ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-50 dark:bg-slate-850 border-gray-150 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <FolderPlus className="w-4 h-4" />
                <span className="text-4xs font-bold uppercase tracking-wider block">Watchlist Add</span>
              </button>

              <button
                onClick={() => { setActiveTab("decision"); setShowMoreMenu(false); }}
                className={`py-3 px-3 rounded-xl border flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer ${
                  activeTab === "decision" ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-50 dark:bg-slate-850 border-gray-150 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span className="text-4xs font-bold uppercase tracking-wider block">Decide Tool</span>
              </button>

              <button
                onClick={() => { setActiveTab("chart"); setShowMoreMenu(false); }}
                className={`py-3 px-3 rounded-xl border flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer ${
                  activeTab === "chart" ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-50 dark:bg-slate-850 border-gray-150 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <LineChart className="w-4 h-4 animate-pulse" />
                <span className="text-4xs font-bold uppercase tracking-wider block">Performance</span>
              </button>

              <button
                onClick={() => { setActiveTab("thesis"); setShowMoreMenu(false); }}
                className={`py-3 px-3 rounded-xl border flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer ${
                  activeTab === "thesis" ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-50 dark:bg-slate-850 border-gray-150 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <FileText className="w-4 h-4" />
                <span className="text-4xs font-bold uppercase tracking-wider block">Thesis Checklists</span>
              </button>

              <button
                onClick={() => { setActiveTab("pairs"); setShowMoreMenu(false); }}
                className={`py-3 px-3 rounded-xl border flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer ${
                  activeTab === "pairs" ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-50 dark:bg-slate-850 border-gray-150 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <Link2 className="w-4 h-4" />
                <span className="text-4xs font-bold uppercase tracking-wider block">Coupled Pairs</span>
              </button>

              <button
                onClick={() => { setActiveTab("alerts"); setShowMoreMenu(false); }}
                className={`py-3 px-3 rounded-xl border flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer ${
                  activeTab === "alerts" ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-50 dark:bg-slate-850 border-gray-150 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <Bell className="w-4 h-4" />
                <span className="text-4xs font-bold uppercase tracking-wider block">Alerts Hub</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Branded Status Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 py-4 px-6 mt-8 mb-20 md:mb-0 text-center text-4xs font-mono font-bold tracking-wider text-gray-400 dark:text-slate-500 uppercase select-none">
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
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-6xl w-full max-h-[90vh] border border-gray-150 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-slate-100">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-indigo-950 text-white shrink-0">
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
            <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-150 dark:divide-slate-800">
              
              {/* Left Column: Beginner Investment Glossary */}
              <div className="p-6 space-y-5 font-sans divide-y divide-gray-100 dark:divide-slate-800 text-slate-800 dark:text-slate-100 overflow-y-auto max-h-[45vh] md:max-h-full">
                <h4 className="text-3xs uppercase font-extrabold tracking-wider text-slate-400 font-mono pb-2">
                  Part 1: Trading Calculations & Concept Help
                </h4>

                <div className="space-y-1 pt-3">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 block flex-shrink-0" />
                    Normal Average (YTD Timeline)
                    <span className="text-[9px] font-mono font-bold text-indigo-505 uppercase bg-indigo-50 px-1.5 py-0.5 rounded ml-auto">Normal Avg (YTD)</span>
                  </h4>
                  <p className="text-3xs text-gray-600 leading-relaxed">
                    <strong>What it is:</strong> The typical average price of the stock calculated using Year-To-Date (YTD) data—meaning from January 1st of the current year (2026) up to today. 
                    <br />
                    <strong>Why it matters:</strong> It acts as a realistic baseline. By looking at the normal average price since the year started, you can immediately tell if today's price is unusually cheap or expensive compared to its recent normal path.
                  </p>
                </div>

                <div className="space-y-1 pt-4">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 block flex-shrink-0" />
                    Asymmetry Score
                    <span className="text-[9px] font-mono font-bold text-teal-600 uppercase bg-teal-50 px-1.5 py-0.5 rounded ml-auto">Factor Score</span>
                  </h4>
                  <p className="text-3xs text-gray-600 leading-relaxed">
                    <strong>What it is:</strong> A risk-reward score from 1.0 to 10.0 that measures how much money you could gain relative to what you might lose.
                    <br />
                    <strong>Formula (simplified):</strong> <code>(Upside Potenz + Conviction + upcoming catalysts) / (Downside vulnerability + bankruptcy risk)</code>. 
                    <br />
                    <strong>Why it matters:</strong> A high score means a great asymmetric trade. This ensures you only invest when the potential reward is far bigger than the possible loss.
                  </p>
                </div>

                <div className="space-y-1 pt-4">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 block flex-shrink-0" />
                    Normal Boundaries / Volatility Range
                    <span className="text-[9px] font-mono font-bold text-indigo-500 uppercase bg-indigo-50 px-1.5 py-0.5 rounded ml-auto">Sigma &sigma;</span>
                  </h4>
                  <p className="text-3xs text-gray-600 leading-relaxed">
                    <strong>What it is:</strong> A measure of price variation (standard deviation), defining the standard price swings the stock experiences. 
                    <br />
                    <strong>Why it matters:</strong> If a stock has high volatility, its normal boundaries are wider. Knowing these boundaries helps you filter out random price noise and identify real, major trend deviations.
                  </p>
                </div>

                <div className="space-y-1 pt-4">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 block flex-shrink-0" />
                    Deviation Score / Z-Score
                    <span className="text-[9px] font-mono font-bold text-indigo-500 uppercase bg-indigo-50 px-1.5 py-0.5 rounded ml-auto">Z-Score</span>
                  </h4>
                  <p className="text-3xs text-gray-600 leading-relaxed">
                    <strong>What it is:</strong> A simple number that tells you how many steps (standard deviations) today's price is away from its YTD normal average.
                    <br />
                    <strong>Why it matters:</strong> A score of 0 is exactly normal. A score below <strong>-1.5</strong> means the price has nose-dived into extremely rare, cheap bargain territory. A score above <strong>+1.5</strong> means the stock is historically overheated and expensive.
                  </p>
                </div>

                <div className="space-y-1 pt-4">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 block flex-shrink-0" />
                    Safe Buy Price (Buy Low Threshold)
                    <span className="text-[9px] font-mono font-bold text-emerald-600 uppercase bg-emerald-50 px-1.5 py-0.5 rounded ml-auto">Safe Entry</span>
                  </h4>
                  <p className="text-3xs text-gray-600 leading-relaxed">
                    <strong>What it is:</strong> A conservative bargain entry line representing the price at which the stock becomes statistically hand-selected.
                    <br />
                    <strong>Formula:</strong> <code>YTD Normal Average * (1 - 1.5 * Volatility Rate)</code>.
                    <br />
                    <strong>Why it matters:</strong> If a stock's live price drops below this safe buy price, it signals a strong buying opportunity with excellent downside mitigation.
                  </p>
                </div>

                <div className="space-y-1 pt-4">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 block flex-shrink-0" />
                    Target Sell Price
                    <span className="text-[9px] font-mono font-bold text-rose-600 uppercase bg-rose-50 px-1.5 py-0.5 rounded ml-auto">Target Exit</span>
                  </h4>
                  <p className="text-3xs text-gray-600 leading-relaxed">
                    <strong>What it is:</strong> An expensive target exit line where the stock is considered stretched and statistically overvalued.
                    <br />
                    <strong>Formula:</strong> <code>YTD Normal Average * (1 + 1.5 * Volatility Rate)</code>.
                    <br />
                    <strong>Why it matters:</strong> Reaching this level indicates the stock's price is stretched too far upward. This is an optimal point to realize gains or trimmer positions because the risk of a downward drop is rising.
                  </p>
                </div>

                <div className="space-y-1 pt-4">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 block flex-shrink-0" />
                    Stock Correlation / Connection
                    <span className="text-[9px] font-mono font-bold text-indigo-500 uppercase bg-indigo-50 px-1.5 py-0.5 rounded ml-auto">r Value</span>
                  </h4>
                  <p className="text-3xs text-gray-600 leading-relaxed">
                    <strong>What it is:</strong> A score between -1 and +1 measuring how closely two stocks move together. 
                    <br />
                    <strong>Why it matters:</strong> Positive correlation means they rise and fall together (e.g. semiconductor foundries and AI chip designers). Low or negative correlation helps you diversify your portfolio so that all of your holdings don't drop at the same time.
                  </p>
                </div>

                <div className="space-y-1 pt-4">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 block flex-shrink-0" />
                    Weighted Average Cost (WAC)
                    <span className="text-[9px] font-mono font-bold text-indigo-500 uppercase bg-indigo-50 px-1.5 py-0.5 rounded ml-auto">Avg Purchase Price</span>
                  </h4>
                  <p className="text-3xs text-gray-600 leading-relaxed">
                    <strong>What it is:</strong> The average price you paid to buy each share of a stock that you currently own, adjusting for different buy sizes over time.
                    <br />
                    <strong>Formula:</strong> <code>Total Cash Paid to Buy / Total Shares Owned Today</code>.
                    <br />
                    <strong>Why it matters:</strong> This is your break-even line. If the live stock price is above your average purchase price, your position is in a profit.
                  </p>
                </div>

                <div className="space-y-1 pt-4">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 block flex-shrink-0" />
                    Unrealized Gain / Loss (Paper Profit)
                    <span className="text-[9px] font-mono font-bold text-emerald-600 uppercase bg-emerald-50 px-1.5 py-0.5 rounded ml-auto">Paper P&amp;L</span>
                  </h4>
                  <p className="text-3xs text-gray-600 leading-relaxed">
                    <strong>What it is:</strong> The theoretical profit or loss you would make if you sold all of your current shares of a stock at today's live market price.
                    <br />
                    <strong>Formula:</strong> <code>Current Market Value of Shares - Total Cost of buying them</code>.
                    <br />
                    <strong>Why it matters:</strong> It changes minute-by-minute as the stock price fluctuates. It is called "unrealized" because you haven't locked it in yet.
                  </p>
                </div>

                <div className="space-y-1 pt-4">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 block flex-shrink-0" />
                    Realized Gain / Loss (Locked Profit)
                    <span className="text-[9px] font-mono font-bold text-purple-600 uppercase bg-purple-50 px-1.5 py-0.5 rounded ml-auto">Realized P&amp;L</span>
                  </h4>
                  <p className="text-3xs text-gray-600 leading-relaxed">
                    <strong>What it is:</strong> The historical hard profit or loss that you have permanently locked-in by selling some of your shares.
                    <br />
                    <strong>Why it matters:</strong> Unlike paper profits, realized profits cannot change and are finalized cash balances recorded in your transaction ledger.
                  </p>
                </div>
              </div>

              {/* Right Column: Disqus Live Comments Widget */}
              <div className="p-6 bg-slate-50 dark:bg-slate-950 overflow-y-auto max-h-[45vh] md:max-h-full flex flex-col justify-start">
                <div className="flex items-center gap-2 border-b border-gray-200 dark:border-slate-800 pb-3 mb-4 shrink-0">
                  <MessageSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-950 dark:text-slate-100 font-sans">Part 2: Community Discussion Feed</h4>
                    <p className="text-4xs text-slate-400 dark:text-slate-500 font-sans">Disqus widget • English (Singapore) en_SG preset enabled</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-150 dark:border-slate-800 shadow-xs flex-1 min-h-[300px]">
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
            <div className="p-4 bg-gray-50 dark:bg-slate-950 border-t border-gray-150 dark:border-slate-800 rounded-b-2xl text-center shrink-0">
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
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[90vh] border border-gray-150 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-indigo-950 text-white shrink-0">
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
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950">
              <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-2xl border border-gray-150 dark:border-slate-800 shadow-xs">
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
            <div className="p-4 bg-gray-50 dark:bg-slate-950 border-t border-gray-150 dark:border-slate-800 rounded-b-2xl text-center shrink-0">
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
