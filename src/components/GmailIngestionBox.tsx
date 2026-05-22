import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Stock } from "../types";
import { PriceAlert } from "./PriceAlertsView";
import { 
  Mail, 
  Sparkles, 
  Linkedin, 
  Plus, 
  Bell, 
  Search, 
  Check, 
  Loader2, 
  CheckCircle, 
  AlertTriangle,
  RefreshCw,
  LogOut,
  Calendar,
  User,
  ExternalLink
} from "lucide-react";

interface GmailIngestionBoxProps {
  stocks: Stock[];
  onAddStock: (stock: Stock) => void;
  onAddAlert?: (alert: PriceAlert) => void;
  onSelectFeedTicker?: (ticker: string) => void;
}

export function GmailIngestionBox({ stocks, onAddStock, onAddAlert, onSelectFeedTicker }: GmailIngestionBoxProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [tokens, setTokens] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("subject:(stock OR portfolio OR research OR ticker OR watchlist OR buy OR sell) OR from:leokoh75@gmail.com");
  const [maxResults, setMaxResults] = useState(8);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [statusText, setStatusText] = useState("");
  const [errorText, setErrorText] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [addedTickers, setAddedTickers] = useState<Record<string, boolean>>({});
  const [addedAlerts, setAddedAlerts] = useState<Record<string, boolean>>({});

  // Check if we already connected in the current session
  useEffect(() => {
    const isCached = localStorage.getItem("equilibrium_gmail_connected");
    const cachedTokens = localStorage.getItem("equilibrium_gmail_tokens");
    if (isCached === "true" && cachedTokens) {
      try {
        setTokens(JSON.parse(cachedTokens));
        setIsConnected(true);
      } catch (err) {
        localStorage.removeItem("equilibrium_gmail_connected");
        localStorage.removeItem("equilibrium_gmail_tokens");
      }
    }
  }, []);

  // Listen for OAuth Success postMessage
  useEffect(() => {
    const handleOAuth = (event: MessageEvent) => {
      if (event.data?.type === "GOOGLE_OAUTH_SUCCESS") {
        const oauthTokens = event.data.tokens;
        setTokens(oauthTokens);
        setIsConnected(true);
        localStorage.setItem("equilibrium_gmail_connected", "true");
        localStorage.setItem("equilibrium_gmail_tokens", JSON.stringify(oauthTokens));
        setSuccessMsg("Successfully authenticated with Gmail! Use the panel below to pull news briefings.");
        
        // Auto pull after 400ms delay for seamless vibe
        setTimeout(() => {
          handlePullEmails(oauthTokens.access_token);
        }, 500);
      }
    };

    window.addEventListener("message", handleOAuth);
    return () => window.removeEventListener("message", handleOAuth);
  }, [searchQuery, maxResults]);

  const handleConnect = async () => {
    setErrorText(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/auth/google/url");
      if (!res.ok) {
        throw new Error("Failed to provision OAuth authorization URL from backend server node.");
      }
      const data = await res.json();
      
      const popupWidth = 600;
      const popupHeight = 650;
      const left = window.screen.width / 2 - popupWidth / 2;
      const top = window.screen.height / 2 - popupHeight / 2;

      const authPopup = window.open(
        data.url,
        "gmail_auth_gateway",
        `width=${popupWidth},height=${popupHeight},top=${top},left=${left},scrollbars=yes,status=yes`
      );

      if (!authPopup) {
        setErrorText("OAuth Gateway popup was blocked by your browser. Please allow popups to continue.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorText(`Authentication failed: ${err.message}`);
    }
  };

  const handleDisconnect = () => {
    setTokens(null);
    setIsConnected(false);
    setResults([]);
    localStorage.removeItem("equilibrium_gmail_connected");
    localStorage.removeItem("equilibrium_gmail_tokens");
    setSuccessMsg("Google Gmail account disconnected successfully.");
  };

  const handlePullEmails = async (providedAccessToken?: string) => {
    const activeToken = providedAccessToken || tokens?.access_token;
    if (!activeToken) {
      setErrorText("Google session expired. Please reconnect Gmail account.");
      setIsConnected(false);
      return;
    }

    setIsLoading(true);
    setErrorText(null);
    setSuccessMsg(null);
    setStatusText("Establishing Workspace link... Inbound filters requested.");

    try {
      // Rotate statuses to make the Gemini integration feel incredibly alive and futuristic
      const statuses = [
        "Consulting Workspace nodes for recent Gmail briefs...",
        "Decoding email packet headers safely...",
        "Running base64 content through clean pipelines...",
        "Bootstrapping Gemini 3.5-flash analytical engine...",
        "Evaluating ticker sentiment and isolating alpha risk triggers..."
      ];

      let idx = 0;
      const statusInterval = setInterval(() => {
        if (idx < statuses.length - 1) {
          idx++;
          setStatusText(statuses[idx]);
        }
      }, 1600);

      const res = await fetch("/api/gmail/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: activeToken,
          searchQuery,
          maxResults
        })
      });

      clearInterval(statusInterval);

      if (!res.ok) {
        const errObj = await res.json();
        throw new Error(errObj.error || "Workspace connection failure from servers.");
      }

      const parsedFeed = await res.json();
      if (parsedFeed.success) {
        setResults(parsedFeed.items || []);
        if (parsedFeed.count === 0) {
          setSuccessMsg(`No ticker recommendations extracted from the last ${parsedFeed.emailsFetchedCount} emails match the filters.`);
        } else {
          setSuccessMsg(`Successfully parsed ${parsedFeed.count} high-conviction trade indicators from ${parsedFeed.emailsFetchedCount} Gmail messages!`);
        }
      } else {
        throw new Error("Feed payload reports unhandled failure.");
      }

    } catch (err: any) {
      console.error(err);
      setErrorText(`Failed to scan Gmail inbox: ${err.message}. If authentication is expired, try logging in again.`);
    } finally {
      setIsLoading(false);
      setStatusText("");
    }
  };

  const handleAddToWatchlist = (item: any) => {
    try {
      const ticker = item.ticker.toUpperCase().trim();
      const alreadyHave = stocks.some(s => s.ticker === ticker);
      if (alreadyHave) {
        setSuccessMsg(`${ticker} is already registered in your active watchlist.`);
        setAddedTickers(p => ({ ...p, [ticker]: true }));
        return;
      }

      const generatedStock: Stock = {
        ticker,
        companyName: item.companyName || `${ticker} Corporation`,
        sector: "Technology (Ingested)",
        region: "US",
        marketCap: item.targetPrice ? parseFloat(((item.targetPrice * 0.8) / 10).toFixed(1)) : 140, // realistic cap simulation
        theme: "AI & Infrastructure",
        reasonForInclusion: item.analysisSummary || `Extracted via Gmail connection on ${item.date || "today"}.`,
        anchorClassification: "asymmetric_opportunity",
        scores: {
          marketLeadership: 3,
          growthExposure: 4,
          revenueGrowth: 4,
          profitability: 3,
          balanceSheet: 3,
          valuationRisk: 3,
          catalystStrength: 4,
          downsideRisk: 3,
          asymmetricPotential: 4,
        },
        asymmetry: {
          upside: 4,
          downside: 2,
          conviction: 3,
          catalyst: 3,
          risk: 2,
          asymmetryScore: 2.0,
        },
        rationale: item.analysisSummary || "Trade alert extracted directly from connected Gmail feed. Managed using automated sentinels.",
        stats: {
          currentPrice: item.targetPrice || 115.00,
          high52w: (item.targetPrice || 115.00) * 1.3,
          low52w: (item.targetPrice || 115.00) * 0.7,
          movingAverage50: item.targetPrice || 115.00,
          revenueGrowthRate: 35,
          earningsTrend: "Analyzing background performance",
          valuationPE: "N/A",
          debtLevel: "Medium",
          leverageRatio: "N/A",
        },
        decisionState: item.suggestedAction === "BUY" ? "BUY" : item.suggestedAction === "SELL" ? "SELL" : "WATCHLIST",
        priceHistory: []
      };

      onAddStock(generatedStock);
      setAddedTickers(p => ({ ...p, [ticker]: true }));
      setSuccessMsg(`✓ Added ${ticker} to your thematic portfolio watchlist successfully!`);
    } catch (err: any) {
      setErrorText(`Failed to append stock: ${err.message}`);
    }
  };

  const handleRegisterAlert = (item: any) => {
    if (!onAddAlert) return;
    try {
      const ticker = item.ticker.toUpperCase().trim();
      const targetVal = item.targetPrice || 120;
      const isBuyType = item.suggestedAction === "BUY";

      const newAlert: PriceAlert = {
        id: "g_alt_" + Date.now() + "_" + Math.floor(Math.random() * 100),
        ticker,
        targetPrice: targetVal,
        condition: isBuyType ? "BELOW" : "ABOVE",
        triggerType: isBuyType ? "BUY" : "SELL",
        isActive: true,
        email: "leokoh75@gmail.com",
        createdAt: new Date().toISOString()
      };

      onAddAlert(newAlert);
      setAddedAlerts(p => ({ ...p, [ticker]: true }));
      setSuccessMsg(`✓ Instantly registered Sentinel pricing trigger for ${ticker} matching target $${targetVal}!`);
    } catch (err: any) {
      setErrorText(`Failed to log sentinel alert: ${err.message}`);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-50 pb-5">
        <div className="flex items-start gap-3">
          <div className="p-3 bg-red-50 text-red-500 rounded-xl">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-md font-semibold text-gray-900 flex items-center gap-1.5 font-sans">
              Google Workspace Ingestion Engine
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-3xs font-medium font-mono bg-red-50 text-red-600">
                GMAIL API
              </span>
            </h2>
            <p className="text-gray-500 text-xs mt-0.5 max-w-lg">
              Synchronize stock portfolio alerts, market briefing letters, and investment newsletters straight from your Gmail. Our background parser runs with secure Google OAuth.
            </p>
          </div>
        </div>

        <div>
          {!isConnected ? (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleConnect}
              className="w-full md:w-auto px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold rounded-lg shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              {/* official material styling inside a premium button */}
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#ffffff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#ffffff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#ffffff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#ffffff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Connect Gmail Workspace</span>
            </motion.button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-3xs px-2.5 py-1 bg-green-50 text-green-700 font-semibold font-mono border border-green-150 rounded-lg flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
                CONNECTED: LEOKOH75
              </span>
              <button
                onClick={handleDisconnect}
                title="Disconnect Google Profile"
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-slate-50 border border-gray-100 rounded-lg cursor-pointer transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {errorText && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="p-3.5 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-3xs flex items-start gap-2.5"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <div>
              <span className="font-semibold">Workspace Ingestion Error:</span> {errorText}
            </div>
          </motion.div>
        )}

        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="p-3.5 bg-indigo-50 border border-indigo-100 text-indigo-800 rounded-xl text-3xs flex items-start gap-2.5"
          >
            <CheckCircle className="w-4 h-4 shrink-0 text-indigo-600 mt-0.5" />
            <div>{successMsg}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {isConnected && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-gray-100">
            <div className="md:col-span-2 space-y-1">
              <label className="text-3xs font-bold text-gray-600 uppercase font-mono tracking-wider">Gmail Search Filters</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-3xs pl-8 pr-3 py-1.5 bg-white border border-gray-150 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-400 font-sans text-gray-800"
                  placeholder="E.g., subject:alert OR from:newsletter@..."
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-3xs font-bold text-gray-600 uppercase font-mono tracking-wider">Volume Cap</label>
              <select
                value={maxResults}
                onChange={(e) => setMaxResults(Number(e.target.value))}
                className="w-full text-3xs px-2 py-1.5 bg-white border border-gray-150 rounded-lg focus:outline-hidden text-gray-800"
              >
                <option value={4}>4 Emails (Fast)</option>
                <option value={8}>8 Emails (Standard)</option>
                <option value={12}>12 Emails (Thorough)</option>
              </select>
            </div>

            <div className="flex items-end">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => handlePullEmails()}
                disabled={isLoading}
                className="w-full px-3 py-1.5 bg-indigo-600 text-white hover:bg-indigo-500 disabled:bg-indigo-400 text-3xs xs:text-2xs font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                {isLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                <span>Scan & Analyze Inbox</span>
              </motion.button>
            </div>
          </div>

          {isLoading && (
            <div className="p-8 text-center flex flex-col items-center justify-center space-y-3 bg-slate-25 border border-dashed border-gray-200 rounded-xl">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              <div className="space-y-1">
                <h3 className="text-xs font-semibold text-gray-800 animate-pulse">Running Inbound Synchronizer</h3>
                <p className="text-3xs text-gray-500 font-mono italic max-w-sm">{statusText}</p>
              </div>
            </div>
          )}

          {!isLoading && results.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-3xs font-bold text-gray-600 uppercase font-mono tracking-wider">
                  Extracted High-Conviction Stock Feeds (Gemini 3.5 Parse)
                </h3>
                <span className="text-4xs px-2 py-0.5 bg-indigo-50 text-indigo-600 font-mono rounded-md">
                  Found {results.length} Recommendations
                </span>
              </div>

              <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-50">
                {results.map((item, index) => {
                  const alreadyAdded = addedTickers[item.ticker.toUpperCase()];
                  const alertLogged = addedAlerts[item.ticker.toUpperCase()];
                  const inWatchlist = stocks.some(s => s.ticker === item.ticker.toUpperCase());

                  return (
                    <div key={item.emailId + "_" + index} className="p-4 bg-white hover:bg-slate-50/50 transition-colors flex flex-col md:flex-row items-start justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-indigo-600 bg-indigo-25 px-2 py-0.5 rounded-md font-mono">
                            {item.ticker}
                          </span>
                          <span className="text-xs font-semibold text-gray-850">
                            {item.companyName}
                          </span>
                          
                          {/* Suggestion Badging */}
                          <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full font-bold font-mono ${
                            item.suggestedAction === "BUY" ? "bg-green-50 text-green-700" :
                            item.suggestedAction === "SELL" ? "bg-rose-50 text-rose-700" :
                            "bg-amber-50 text-amber-700"
                          }`}>
                            {item.suggestedAction}
                          </span>

                          {item.targetPrice && (
                            <span className="text-3xs font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-md font-mono">
                              Limit: ${item.targetPrice}
                            </span>
                          )}
                        </div>

                        <p className="text-gray-600 text-[12px] leading-relaxed max-w-2xl">
                          {item.analysisSummary}
                        </p>

                        <div className="flex flex-wrap items-center gap-3 text-4xs text-gray-400 font-mono">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-gray-300" /> From: {item.senderInfo}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-gray-300" /> Date: {item.date}
                          </span>
                          <span className="text-[10px] text-gray-300">|</span>
                          <span className="text-gray-300">Sourced: Gmail Thread ID {item.emailId}</span>
                        </div>
                      </div>

                      <div className="flex md:flex-col items-center gap-2 shrink-0 self-center md:self-stretch justify-center">
                        <button
                          disabled={alreadyAdded || inWatchlist}
                          onClick={() => handleAddToWatchlist(item)}
                          className={`w-full md:w-32 py-1.5 px-2.5 text-3xs font-bold rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                            alreadyHave(item.ticker) || alreadyAdded ? 
                            "bg-green-50 text-green-700 border border-green-200" :
                            "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-xs"
                          }`}
                        >
                          {alreadyHave(item.ticker) || alreadyAdded ? (
                            <>
                              <Check className="w-3 h-3" />
                              <span>In Watchlist</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3 h-3" />
                              <span>Add Watchlist</span>
                            </>
                          )}
                        </button>

                        <button
                          disabled={alertLogged}
                          onClick={() => handleRegisterAlert(item)}
                          className={`w-full md:w-32 py-1.5 px-2.5 text-3xs font-bold rounded-lg border flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                            alertLogged ?
                            "bg-teal-50 text-teal-700 border-teal-200" :
                            "bg-white text-gray-750 border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          {alertLogged ? (
                            <>
                              <Check className="w-3 h-3" />
                              <span>Alert Created</span>
                            </>
                          ) : (
                            <>
                              <Bell className="w-3 h-3 text-gray-400" />
                              <span>Set Alert</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!isLoading && results.length === 0 && (
            <div className="p-8 text-center flex flex-col items-center justify-center space-y-2 bg-slate-25 border border-dashed border-gray-150 rounded-xl">
              <Mail className="w-6 h-6 text-gray-300" />
              <div>
                <h4 className="text-3xs font-bold text-gray-600 uppercase font-mono">No Email Reports Synced Yet</h4>
                <p className="text-4xs text-gray-400 max-w-xs mt-0.5">
                  Click 'Scan & Analyze Inbox' above to evaluate recent stock portfolio disclosures.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Standalone Mailto direct link alternative info banner for complete transparency */}
      <div className="p-3 bg-slate-50 rounded-xl border border-gray-100 text-[11px] text-gray-500 flex items-start gap-2 max-w-3xl">
        <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
        <p>
          <strong>Automatic Sync:</strong> Real-time pricing trigger alerts can be programmatically executed using this mailbox thread. Ensure that your automated trigger inbox is mapped to <code>leokoh75@gmail.com</code> for unified threshold notifications.
        </p>
      </div>
    </div>
  );

  function alreadyHave(symbol: string): boolean {
    return stocks.some(s => s.ticker === symbol.toUpperCase().trim());
  }
}
