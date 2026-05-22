import React, { useState } from "react";
import { Stock } from "../types";
import { 
  Bell, 
  Trash2, 
  Plus, 
  Mail, 
  ExternalLink, 
  Database, 
  CheckCircle,
  AlertTriangle,
  Play,
  RotateCcw,
  TrendingUp,
  TrendingDown
} from "lucide-react";

export interface PriceAlert {
  id: string;
  ticker: string;
  condition: "ABOVE" | "BELOW";
  targetPrice: number;
  email: string;
  triggerType: "BUY" | "SELL";
  isActive: boolean;
  createdAt: string;
  triggeredAt?: string;
}

interface PriceAlertsViewProps {
  stocks: Stock[];
  alerts: PriceAlert[];
  onAddAlert: (alert: PriceAlert) => void;
  onRemoveAlert: (id: string) => void;
  onToggleAlert: (id: string) => void;
  onTestEmail: (alert: PriceAlert) => Promise<any>;
  isProcessing: boolean;
}

export function PriceAlertsView({
  stocks,
  alerts,
  onAddAlert,
  onRemoveAlert,
  onToggleAlert,
  onTestEmail,
  isProcessing
}: PriceAlertsViewProps) {
  const [selectedTicker, setSelectedTicker] = useState<string>(stocks[0]?.ticker || "");
  const [triggerType, setTriggerType] = useState<"BUY" | "SELL">("BUY");
  const [condition, setCondition] = useState<"ABOVE" | "BELOW">("BELOW");
  const [targetPrice, setTargetPrice] = useState<string>("");
  const [email, setEmail] = useState<string>("leokoh75@gmail.com");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [lastDispatchedLog, setLastDispatchedLog] = useState<any>(null);

  // Auto-adjust default condition based on BUY or SELL trigger type selection
  React.useEffect(() => {
    if (triggerType === "BUY") {
      setCondition("BELOW"); // Buy when price drops below limit
    } else {
      setCondition("ABOVE"); // Sell when price rises above limit
    }
  }, [triggerType]);

  // Set default target price when ticker changes
  React.useEffect(() => {
    const stock = stocks.find(s => s.ticker === selectedTicker);
    if (stock) {
      setTargetPrice(stock.stats.currentPrice.toString());
    }
  }, [selectedTicker, stocks]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicker || !targetPrice || isNaN(Number(targetPrice))) {
      alert("Please provide a valid ticker and target numeric price.");
      return;
    }

    const emailInput = email.trim() || "leokoh75@gmail.com";

    const newAlert: PriceAlert = {
      id: `alert_${Date.now()}`,
      ticker: selectedTicker,
      condition,
      targetPrice: Number(Number(targetPrice).toFixed(2)),
      email: emailInput,
      triggerType,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    onAddAlert(newAlert);
    setSuccessMsg(`${triggerType} Alert created for ${selectedTicker}!`);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handleManualTrigger = async (alertItem: PriceAlert) => {
    try {
      const res = await onTestEmail(alertItem);
      setLastDispatchedLog(res);
      if (res && res.success) {
        setSuccessMsg(`Email trigger processed! (Dispatched using: ${res.senderType})`);
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        alert(`Email Dispatch Feedback: ${res?.error || "Unknown response"}`);
      }
    } catch (err: any) {
      alert(`Manual dispatch exception: ${err.message}`);
    }
  };

  const activeStock = stocks.find(s => s.ticker === selectedTicker);

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 flex items-center gap-2.5">
            <Bell className="w-7 h-7 text-indigo-600" />
            Asymmetry Price Alert Room
          </h1>
          <p className="text-gray-500 mt-1 max-w-2xl text-sm">
            Configure dynamic triggers matching standard Yahoo Finance updates. Programmatically deliver threshold BUY/SELL breaches straight to your inbox (<strong>leokoh75@gmail.com</strong>) via SMTP server nodes.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Create Alert Form Panel */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 border-b border-gray-50 pb-3 font-sans flex items-center gap-2">
            <Mail className="w-4 h-4 text-indigo-500" />
            Add New Email Trigger
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Ticker Selector */}
            <div className="space-y-1">
              <label className="text-3xs font-mono font-bold uppercase text-gray-400">Target Asset</label>
              <select
                value={selectedTicker}
                onChange={(e) => setSelectedTicker(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-slate-50/50 p-2 text-xs font-semibold focus:outline-indigo-500 cursor-pointer text-gray-800"
              >
                {stocks.map(s => (
                  <option key={s.ticker} value={s.ticker}>
                    {s.ticker} — {s.companyName} (${s.stats.currentPrice})
                  </option>
                ))}
              </select>
            </div>

            {/* Trigger Action Type */}
            <div className="space-y-1">
              <label className="text-3xs font-mono font-bold uppercase text-gray-400">Trigger Action Type</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setTriggerType("BUY")}
                  className={`py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    triggerType === "BUY"
                      ? "bg-emerald-50 border-emerald-350 text-emerald-700 shadow-2xs"
                      : "bg-slate-50/55 border-gray-200 text-gray-400 hover:bg-slate-50"
                  }`}
                >
                  <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />
                  BUY Trigger
                </button>
                <button
                  type="button"
                  onClick={() => setTriggerType("SELL")}
                  className={`py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    triggerType === "SELL"
                      ? "bg-rose-50 border-rose-350 text-rose-700 shadow-2xs"
                      : "bg-slate-50/55 border-gray-200 text-gray-400 hover:bg-slate-50"
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5 text-rose-500" />
                  SELL Trigger
                </button>
              </div>
            </div>

            {/* Price Condition Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-3xs font-mono font-bold uppercase text-gray-400">Condition</label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as "ABOVE" | "BELOW")}
                  className="w-full rounded-xl border border-gray-200 bg-slate-50/50 p-2 text-xs font-semibold focus:outline-indigo-500 cursor-pointer text-gray-800"
                >
                  <option value="BELOW">BELOW (📈 Buy Low/Entry)</option>
                  <option value="ABOVE">ABOVE (📉 Take Profit/Exit)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-3xs font-mono font-bold uppercase text-gray-400">Target Price (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-slate-50/50 p-2 text-xs font-bold focus:outline-indigo-500 text-gray-800"
                  placeholder="e.g. 135.50"
                  required
                />
              </div>
            </div>

            {/* Recipient Email */}
            <div className="space-y-1">
              <label className="text-3xs font-mono font-bold uppercase text-gray-400 block">
                Your Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-slate-50/50 p-2 text-xs focus:outline-indigo-500 text-gray-800 font-mono"
                placeholder="leokoh75@gmail.com"
                required
              />
              <span className="text-3xs text-gray-400 leading-tight block">
                Alerts will be dispatched immediately to this specific destination email coordinates.
              </span>
            </div>

            {successMsg && (
              <div className="p-2.5 bg-indigo-50 border border-indigo-150 rounded-xl text-3xs font-semibold text-indigo-700 flex items-center gap-1.5 animate-pulse">
                <CheckCircle className="w-3.5 h-3.5 text-indigo-500" />
                {successMsg}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs hover:shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Activate Sentinel Trigger
            </button>
          </form>
        </div>

        {/* Alerts Monitoring Deck */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 lg:col-span-2 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 border-b border-gray-50 pb-3 flex justify-between items-center font-sans">
              <span>Active Sentinel Alerts ({alerts.length})</span>
              <span className="text-3xs font-mono font-normal text-indigo-500">Auto-monitored in background</span>
            </h2>

            {alerts.length === 0 ? (
              <div className="py-12 text-center text-gray-400 space-y-2">
                <Bell className="w-8 h-8 mx-auto stroke-1.5 text-gray-300" />
                <p className="text-xs">No active price alert checkpoints registered.</p>
                <p className="text-3xs max-w-xs mx-auto">Fill out the trigger setup card to the left to establish real-time automated email briefings.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 mt-4">
                {alerts.map((alertItem) => {
                  const stock = stocks.find(s => s.ticker === alertItem.ticker);
                  const curPrice = stock ? stock.stats.currentPrice : 0;
                  const isMet = alertItem.condition === "ABOVE" ? curPrice >= alertItem.targetPrice : curPrice <= alertItem.targetPrice;
                  const isBuy = alertItem.triggerType === "BUY";

                  return (
                    <div 
                      key={alertItem.id} 
                      className={`p-3.5 border rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3 transition-all ${
                        isMet 
                          ? isBuy 
                            ? "bg-emerald-50/60 border-emerald-250 text-emerald-950 shadow-2xs" 
                            : "bg-rose-50/60 border-rose-250 text-rose-950 shadow-2xs"
                          : "bg-slate-50/50 border-gray-150"
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded-sm">
                            {alertItem.ticker}
                          </span>
                          <span className={`text-[10px] font-bold font-mono px-1.5 py-0.3 rounded flex items-center gap-1 ${
                            isBuy ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                          }`}>
                            {isBuy ? "🟢 BUY TRIGGER" : "🔴 SELL TRIGGER"}
                          </span>
                          <span className="text-[10.5px] font-medium text-gray-500">
                            Threshold: {alertItem.condition} <strong>${alertItem.targetPrice}</strong>
                          </span>
                          {!alertItem.isActive && (
                            <span className="bg-gray-150 text-gray-500 text-4xs font-mono px-1 rounded uppercase">Deactivated</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 font-mono text-3xs text-gray-400">
                          <span>Live Index: <strong className="text-indigo-600">${curPrice}</strong></span>
                          <span>•</span>
                          <span>Recipient: <strong>{alertItem.email}</strong></span>
                          {alertItem.triggeredAt && (
                            <>
                              <span>•</span>
                              <span className="text-red-500 font-bold">Triggered at {new Date(alertItem.triggeredAt).toLocaleTimeString()}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                        <button
                          onClick={() => onToggleAlert(alertItem.id)}
                          className={`text-4xs uppercase tracking-wider font-extrabold px-2 py-1.5 rounded-lg border cursor-pointer transition-all ${
                            alertItem.isActive 
                              ? "bg-white hover:bg-gray-50 text-gray-500 border-gray-200" 
                              : "bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border-indigo-200"
                          }`}
                        >
                          {alertItem.isActive ? "Pause" : "Resume"}
                        </button>

                        <button
                          onClick={() => handleManualTrigger(alertItem)}
                          disabled={isProcessing}
                          className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-4xs font-extrabold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
                          title="Instant simulated dispatch check"
                        >
                          <Play className="w-3 h-3 text-white" />
                          Test Email
                        </button>

                        <button
                          onClick={() => onRemoveAlert(alertItem.id)}
                          className="p-1.5 hover:bg-red-50 text-red-500 border border-transparent hover:border-red-100 rounded-lg cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-gray-100 flex flex-wrap gap-2 justify-end text-3xs">
            <button
              onClick={() => {
                handleManualTrigger({
                  id: "sample_check",
                  ticker: "TSM",
                  condition: "BELOW",
                  targetPrice: 200,
                  email: email || "leokoh75@gmail.com",
                  triggerType: "BUY",
                  isActive: true,
                  createdAt: new Date().toISOString()
                });
              }}
              disabled={isProcessing}
              className="py-1 px-3 bg-slate-150 hover:bg-slate-200 text-gray-700 font-bold rounded-lg cursor-pointer flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3 text-gray-500" />
              Dispatch Trial BUY Email (TSM)
            </button>
          </div>
        </div>

      </div>

      {/* Integration Docs / Settings info card */}
      <div className="p-6 bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-850 pb-3">
          <Database className="w-5 h-5 text-emerald-400" />
          <div>
            <h2 className="text-sm font-bold tracking-tight text-white font-sans uppercase">Enterprise Notification Grid (SMTP/Email Transmission Engine)</h2>
            <p className="text-[10px] text-slate-400 mt-0.5">Disclosed API parameters, SMTP bindings, and live telemetry log feeds.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-[11px] text-slate-400 leading-relaxed">
          
          <div className="space-y-1.5">
            <h3 className="font-mono font-bold text-teal-400 uppercase tracking-wider text-[10px]">1. Local Dev Simulation Logs</h3>
            <p>
              By default, if credentials are empty in system settings, our dispatcher saves alerts instantly to server logging queues and yields a comprehensive pre-composed direct <code>mailto:</code> link fallback. This provides universal delivery to your default email client (Gmail/Outlook) with zero configuration hurdles.
            </p>
          </div>

          <div className="space-y-1.5 font-sans">
            <h3 className="font-mono font-bold text-amber-400 uppercase tracking-wider text-[10px]">2. Automated SMTP Server Setup</h3>
            <p>
              To run continuous cell communications without holding browser focus, configure these secret environment keys in your settings (Secrets Menu / <strong>.env</strong>):
            </p>
            <div className="bg-slate-850 p-2.5 rounded-lg font-mono text-[9.5px] text-indigo-300 select-all space-y-0.5 border border-slate-800">
              <div>SMTP_HOST=smtp.gmail.com</div>
              <div>SMTP_PORT=587</div>
              <div>SMTP_USER=myemail@gmail.com</div>
              <div>SMTP_PASS=app_password_here</div>
              <div>SMTP_FROM="Sentinels" &lt;myemail@gmail.com&gt;</div>
            </div>
          </div>

          <div className="space-y-1.5">
            <h3 className="font-mono font-bold text-teal-400 uppercase tracking-wider text-[10px]">3. Background Check Sentinel</h3>
            <p>
              The system's active sentinel scans stock pricing every 5 minutes in step with Yahoo Finance updates. If custom threshold breaches matching the <strong>BUY</strong> or <strong>SELL</strong> signals are flagged, the background pipeline dispatches the corresponding Whatsapp intelligence briefing autonomously to <code>{email || "leokoh75@gmail.com"}</code>.
            </p>
          </div>

        </div>

        {lastDispatchedLog && (
          <div className="mt-4 p-3 bg-slate-850 border border-slate-800 rounded-xl space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="font-mono font-bold text-[10px] text-teal-400">SMTP DISPATCH TELEMETRY FEED:</span>
              <div className="flex items-center gap-2">
                {lastDispatchedLog.mailtoBytes && (
                  <a 
                    href={lastDispatchedLog.mailtoBytes} 
                    className="text-[9px] text-indigo-400 hover:text-indigo-300 underline flex items-center gap-1"
                    title="Open mail application"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Open Local Mail Client Fallback
                  </a>
                )}
                <span className="text-slate-500">•</span>
                <button onClick={() => setLastDispatchedLog(null)} className="text-[9px] text-slate-500 hover:text-slate-300">Clear</button>
              </div>
            </div>
            <pre className="text-[9px] font-mono text-slate-300 overflow-x-auto select-all max-h-[100px] leading-tight">
              {JSON.stringify(lastDispatchedLog, null, 2)}
            </pre>
          </div>
        )}
      </div>

    </div>
  );
}
