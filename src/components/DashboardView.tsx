import React from "react";
import { motion } from "motion/react";
import { Stock, MarketEvent } from "../types";
import { 
  Briefcase, 
  Eye, 
  Clock, 
  ArrowUpRight, 
  Activity, 
  Scale, 
  TrendingUp, 
  ShieldAlert,
  Zap,
  Globe
} from "lucide-react";

interface DashboardViewProps {
  stocks: Stock[];
  events: MarketEvent[];
  onNavigate: (tab: string, ticker?: string) => void;
}

export function DashboardView({ stocks, events, onNavigate }: DashboardViewProps) {
  // Statistics
  const holdings = stocks.filter(s => s.decisionState === "BUY");
  const watchlisted = stocks.filter(s => s.decisionState === "WATCHLIST" || s.decisionState === "HOLD");
  const reviewsCount = stocks.filter(s => s.decisionState === "REVIEW" || (s.nextReviewDate && new Date(s.nextReviewDate) <= new Date())).length;
  
  // Calculate Portfolio Value Estimations
  const totalPositionSize = holdings.reduce((sum, h) => sum + (h.decisionData?.positionSizePercent || 0), 0);

  // Sector or Theme counts
  const themeCounts = stocks.reduce((acc, stock) => {
    const t = stock.theme.toUpperCase();
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Classifications
  const coreAnchors = stocks.filter(s => s.anchorClassification === "core_anchor");
  const asymmetricPicks = stocks.filter(s => s.anchorClassification === "asymmetric_opportunity");
  const speculativePlays = stocks.filter(s => s.anchorClassification === "speculative_opportunity");

  // Get Top Asymmetry Scores
  const sortedAsymmetry = [...stocks]
    .filter(s => s.asymmetry.asymmetryScore !== undefined)
    .sort((a, b) => (b.asymmetry.asymmetryScore || 0) - (a.asymmetry.asymmetryScore || 0))
    .slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Portfolio Decision Room</h1>
          <p className="text-gray-500 mt-1 max-w-2xl text-sm">
            AI-assisted screening and decision tracking suite. Focus on asymmetrical risk-reward loops across core technologies: AI, quantum, chips and clean energy grids.
          </p>
        </div>
        <div className="mt-4 md:mt-0 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center gap-2">
          <Globe className="w-4 h-4 text-indigo-600 animate-pulse" />
          <span className="text-xs font-mono text-indigo-700 font-medium">Asymmetry Ratio Engaged</span>
        </div>
      </div>

      {/* High-level Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div 
          onClick={() => onNavigate("portfolio")}
          whileHover={{ y: -2 }}
          className="p-5 bg-white rounded-xl border border-gray-100 shadow-xs cursor-pointer hover:shadow-md transition-all flex justify-between items-center"
        >
          <div className="space-y-1">
            <span className="text-xs font-mono font-medium text-gray-400">HOLDINGS (BUY)</span>
            <div className="text-2xl font-semibold font-display">{holdings.length} Positions</div>
            <p className="text-xs text-green-600 flex items-center gap-1 font-medium mt-1">
              <TrendingUp className="w-3 h-3" />
              Allocated: {totalPositionSize}% of Total
            </p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Briefcase className="w-5 h-5" />
          </div>
        </motion.div>

        <motion.div 
          onClick={() => onNavigate("portfolio")}
          whileHover={{ y: -2 }}
          className="p-5 bg-white rounded-xl border border-gray-100 shadow-xs cursor-pointer hover:shadow-md transition-all flex justify-between items-center"
        >
          <div className="space-y-1">
            <span className="text-xs font-mono font-medium text-gray-400">WATCHLIST / HOLDS</span>
            <div className="text-2xl font-semibold font-display">{watchlisted.length} Assets</div>
            <p className="text-xs text-gray-500 mt-1">Active coverage framework</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Eye className="w-5 h-5" />
          </div>
        </motion.div>

        <motion.div 
          onClick={() => onNavigate("reviews")}
          whileHover={{ y: -2 }}
          className="p-5 bg-white rounded-xl border border-gray-100 shadow-xs cursor-pointer hover:shadow-md transition-all flex justify-between items-center"
        >
          <div className="space-y-1">
            <span className="text-xs font-mono font-medium text-gray-400">PENDING ACTION</span>
            <div className="text-2xl font-semibold font-display text-amber-600">{reviewsCount} Reviews</div>
            <p className="text-xs text-amber-500 font-medium flex items-center gap-1 mt-1">
              <ShieldAlert className="w-3 h-3" />
              Schedules requiring updates
            </p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
        </motion.div>

        <motion.div 
          onClick={() => onNavigate("scanner")}
          whileHover={{ y: -2 }}
          className="p-5 bg-white rounded-xl border border-gray-100 shadow-xs cursor-pointer hover:shadow-md transition-all flex justify-between items-center"
        >
          <div className="space-y-1">
            <span className="text-xs font-mono font-medium text-gray-400">MARKET scanner</span>
            <div className="text-2xl font-semibold font-display">{events.length} Historical Events</div>
            <p className="text-xs text-indigo-600 font-medium flex items-center gap-1 mt-1">
              <Activity className="w-3 h-3 text-indigo-500" />
              Connected to intelligence terminal
            </p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Activity className="w-5 h-5" />
          </div>
        </motion.div>
      </div>

      {/* Main Grid: Sector counts, Highest Asymmetry, Classifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Anchor & Speculative splits */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-5">
          <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-50 pb-3 flex items-center gap-2">
            <Scale className="w-4 h-4 text-gray-500" />
            Anchor Classifications
          </h2>
          
          <div className="space-y-3">
            <div className="p-3 bg-slate-50 rounded-lg flex justify-between items-center">
              <div>
                <p className="text-xs font-semibold text-slate-700">Core Anchors</p>
                <p className="text-2xs text-gray-400">Market monopolies / High cash-flows</p>
              </div>
              <span className="px-2.5 py-1 bg-slate-200 text-slate-800 text-xs font-mono rounded-md font-semibold">{coreAnchors.length}</span>
            </div>

            <div className="p-3 bg-emerald-50 rounded-lg flex justify-between items-center">
              <div>
                <p className="text-xs font-semibold text-emerald-800">Asymmetric opportunities</p>
                <p className="text-2xs text-emerald-600">High upside relative to low downside</p>
              </div>
              <span className="px-2.5 py-1 bg-emerald-200 text-emerald-850 text-xs font-mono rounded-md font-semibold">{asymmetricPicks.length}</span>
            </div>

            <div className="p-3 bg-purple-50 rounded-lg flex justify-between items-center">
              <div>
                <p className="text-xs font-semibold text-purple-800">Speculative Plays</p>
                <p className="text-2xs text-purple-600">Pure pre-revenue high stakes growth</p>
              </div>
              <span className="px-2.5 py-1 bg-purple-200 text-purple-850 text-xs font-mono rounded-md font-semibold">{speculativePlays.length}</span>
            </div>
          </div>

          <div className="pt-2">
            <h3 className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-2 font-semibold">Allocated Themes</h3>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(themeCounts).map(([theme, count]) => (
                <span key={theme} className="px-2 py-1 bg-indigo-50 text-indigo-700 text-3xs font-mono font-bold rounded-lg uppercase">
                  {theme} ({count})
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Middle Column: Top Asymmetry Picks */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4 lg:col-span-2">
          <div className="flex justify-between items-center border-b border-gray-50 pb-3">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              Highest Asymmetry Scores
            </h2>
            <button 
              onClick={() => onNavigate("asymmetry")}
              className="text-xs text-indigo-600 font-medium hover:underline flex items-center gap-0.5"
            >
              Analyze Scorecard <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedAsymmetry.map((stock) => (
              <div 
                key={stock.ticker}
                className="p-4 border border-gray-100 rounded-xl hover:bg-slate-50/50 transition-all flex flex-col justify-between"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="font-mono text-xs font-bold px-1.5 py-0.5 bg-gray-100 rounded text-gray-700">{stock.ticker}</span>
                    <h3 className="text-xs font-medium text-gray-800 mt-1 lines-clamp-1">{stock.companyName}</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-2xs text-gray-400 font-mono block">ASYM SCORE</span>
                    <span className="text-emerald-600 font-mono font-bold text-sm bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">{stock.asymmetry.asymmetryScore}</span>
                  </div>
                </div>

                <p className="text-3xs text-gray-500 line-clamp-2 mt-1 mb-3">{stock.reasonForInclusion || stock.rationale}</p>
                
                <div className="flex justify-between items-center text-3xs border-t border-gray-50 pt-2 font-mono">
                  <span className="text-gray-400">Current: <strong className="text-gray-700">${stock.stats.currentPrice}</strong></span>
                  <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded capitalize">{stock.theme}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Immediate Reminders Section */}
      <div className="p-6 bg-white rounded-xl border border-gray-100 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-indigo-500" />
          Underlying Strategic Checkpoints
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-100/60 space-y-2">
            <h3 className="text-xs font-semibold text-amber-900 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-600" />
              Upcoming Review Milestones
            </h3>
            <p className="text-3xs text-amber-800 leading-relaxed">
              Your core asset cycle reviews are nearing. Under asymmetric protocols, stocks should be evaluated monthly, rotating fully out of holdings where fundamentals trigger SELL levels or the macro valuation margin safety narrows.
            </p>
            <button 
              onClick={() => onNavigate("reviews")} 
              className="text-3xs bg-amber-600 hover:bg-amber-700 text-white font-semibold py-1 px-2.5 rounded transition-colors"
            >
              Examine Review Queue
            </button>
          </div>

          <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100/60 space-y-2">
            <h3 className="text-xs font-semibold text-indigo-900 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-indigo-600" />
              Event News Check
            </h3>
            <p className="text-3xs text-indigo-800 leading-relaxed">
              New policy shifts, grid utility upgrades, or logical quantum corrections can dynamically alter your security score targets. Run Gemini AI on recent policy announcements to trace impact vectors clearly.
            </p>
            <button 
              onClick={() => onNavigate("scanner")} 
              className="text-3xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-1 px-2.5 rounded transition-colors block"
            >
              Analyze Macro News
            </button>
          </div>
        </div>
      </div>

      {/* Data Citations & Resource Center */}
      <div className="p-6 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-850 pb-3">
          <Globe className="w-5 h-5 text-indigo-400" />
          <div>
            <h2 className="text-sm font-bold tracking-tight text-white font-sans uppercase">Asynchronous Alpha Data Feeds & Citation Registry</h2>
            <p className="text-[10px] text-slate-400 mt-0.5">Disclosed real-time API bindings and algorithmic data compliance standards.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-[11px]">
          
          <div className="space-y-1.5 p-3 rounded-lg bg-slate-850/50 border border-slate-800 flex flex-col justify-between">
            <div>
              <h3 className="font-mono font-bold text-teal-400 uppercase tracking-wider text-[10px]">Yahoo Finance v8 API</h3>
              <p className="text-slate-400 mt-1 leading-snug">Yields real-time price indicators (regularMarketPrice, fiftyTwoWeekHigh, fiftyTwoWeekLow, and fiftyDayAverage) server-side via Node proxy.</p>
            </div>
            <div className="font-mono text-[9px] text-indigo-300 select-all underline leading-none pt-2">
              https://query1.finance.yahoo.com
            </div>
          </div>

          <div className="space-y-1.5 p-3 rounded-lg bg-slate-850/50 border border-slate-800 flex flex-col justify-between">
            <div>
              <h3 className="font-mono font-bold text-teal-400 uppercase tracking-wider text-[10px]">Google News RSS Feed</h3>
              <p className="text-slate-400 mt-1 leading-snug">Streams live thematic intelligence headlines focused on specialized computing, foundry breakthroughs, quantum coherence, and baseload power.</p>
            </div>
            <div className="font-mono text-[9px] text-indigo-300 select-all underline leading-none pt-2">
              https://news.google.com/rss
            </div>
          </div>

          <div className="space-y-1.5 p-3 rounded-lg bg-slate-850/50 border border-slate-800 flex flex-col justify-between">
            <div>
              <h3 className="font-mono font-bold text-indigo-350 uppercase tracking-wider text-[10px]">Disqus Comments Hub</h3>
              <p className="text-slate-400 mt-1 leading-snug">Empowers collaborative local-to-global strategy sharing. The widget loads on demand under international en_SG English Singapore rules.</p>
            </div>
            <div className="font-mono text-[9px] text-indigo-300 select-all underline leading-none pt-2">
              https://disqus.com
            </div>
          </div>

          <div className="space-y-1.5 p-3 rounded-lg bg-slate-850/50 border border-slate-800 flex flex-col justify-between">
            <div>
              <h3 className="font-mono font-bold text-amber-400 uppercase tracking-wider text-[10px]">DeepMind Gemini API</h3>
              <p className="text-slate-400 mt-1 leading-snug">Produces professional institutional-grade stock scorecards, fundamental thesis checkpoints, and processes NLP macro events.</p>
            </div>
            <div className="font-mono text-[9px] text-indigo-300 select-all underline leading-none pt-2">
              @google/genai (3.5-flash)
            </div>
          </div>

        </div>

        <div className="pt-2 border-t border-slate-850 flex flex-col sm:flex-row justify-between items-start sm:items-center text-[10px] text-slate-500 gap-2">
          <span>Registered Watchlist Focus: TSM, NVDA, AMD, AVGO, MSFT, AMZN, GOOGL, EQIX, VST, IONQ, GS, ASML</span>
          <span className="font-mono">Real-time Node proxy actively cached | Standard Singapore (SG) localization preset</span>
        </div>
      </div>
    </div>
  );
}
