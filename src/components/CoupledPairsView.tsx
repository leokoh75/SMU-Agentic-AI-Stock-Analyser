import React, { useMemo, useState } from "react";
import { Stock, CoupledPair, PricePoint } from "../types";
import { COUPLED_PAIRS } from "../initialData";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Link,
  AlertTriangle,
  CheckCircle2,
  Info,
  ChevronDown,
  ChevronUp
} from "lucide-react";

interface CoupledPairsViewProps {
  stocks: Stock[];
}

// ── Maths helpers ─────────────────────────────────────────────────────────────

function normalizeSeries(history: PricePoint[]): { date: string; value: number }[] {
  if (history.length === 0) return [];
  const base = history[0].price;
  return history.map(p => ({ date: p.date, value: (p.price / base) * 100 }));
}

function sharedTrajectory(
  normA: { date: string; value: number }[],
  normB: { date: string; value: number }[]
): { date: string; value: number }[] {
  const mapB = new Map(normB.map(p => [p.date, p.value]));
  return normA
    .filter(p => mapB.has(p.date))
    .map(p => ({ date: p.date, value: (p.value + mapB.get(p.date)!) / 2 }));
}

function currentNormalized(stock: Stock): number {
  const h = stock.priceHistory || [];
  if (h.length === 0) return 100;
  return (stock.stats.currentPrice / h[0].price) * 100;
}

type Signal = "BUY" | "SELL" | "HOLD";

function deriveSignal(deviation: number, threshold: number): Signal {
  if (deviation < -threshold) return "BUY";
  if (deviation > threshold) return "SELL";
  return "HOLD";
}

// ── Tiny inline SVG sparkline ─────────────────────────────────────────────────

function MiniChart({
  seriesA,
  seriesB,
  trajectory,
}: {
  seriesA: { date: string; value: number }[];
  seriesB: { date: string; value: number }[];
  trajectory: { date: string; value: number }[];
}) {
  const W = 240;
  const H = 72;
  const PAD = 6;

  const allVals = [
    ...seriesA.map(p => p.value),
    ...seriesB.map(p => p.value),
    ...trajectory.map(p => p.value),
  ];
  if (allVals.length === 0) return <div className="h-18 bg-slate-100 rounded" />;

  const minV = Math.min(...allVals);
  const maxV = Math.max(...allVals);
  const rangeV = maxV - minV || 1;
  const n = seriesA.length;

  const xOf = (i: number) => PAD + ((i / (n - 1)) * (W - PAD * 2));
  const yOf = (v: number) => PAD + ((1 - (v - minV) / rangeV) * (H - PAD * 2));

  const polyline = (series: { value: number }[], color: string, dash?: string) => {
    if (series.length < 2) return null;
    const pts = series.map((p, i) => `${xOf(i).toFixed(1)},${yOf(p.value).toFixed(1)}`).join(" ");
    return (
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth={dash ? 1.5 : 2}
        strokeDasharray={dash}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.85}
      />
    );
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-18">
      {/* shared trajectory (dashed grey) */}
      {polyline(trajectory, "#94a3b8", "4 3")}
      {/* stock A (indigo) */}
      {polyline(seriesA, "#6366f1")}
      {/* stock B (emerald) */}
      {polyline(seriesB, "#10b981")}
    </svg>
  );
}

// ── Signal badge ──────────────────────────────────────────────────────────────

function SignalBadge({ signal }: { signal: Signal }) {
  if (signal === "BUY")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
        <TrendingUp className="w-3 h-3" />
        BUY
      </span>
    );
  if (signal === "SELL")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold uppercase bg-rose-100 text-rose-800 border border-rose-200">
        <TrendingDown className="w-3 h-3" />
        SELL
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold uppercase bg-amber-100 text-amber-800 border border-amber-200">
      <Minus className="w-3 h-3" />
      HOLD
    </span>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

export function CoupledPairsView({ stocks }: CoupledPairsViewProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterSignal, setFilterSignal] = useState<"ALL" | Signal>("ALL");

  const pairResults = useMemo(() => {
    return COUPLED_PAIRS.map(pair => {
      const sA = stocks.find(s => s.ticker === pair.tickerA);
      const sB = stocks.find(s => s.ticker === pair.tickerB);

      if (!sA || !sB) return null;

      const normA = normalizeSeries(sA.priceHistory || []);
      const normB = normalizeSeries(sB.priceHistory || []);
      const traj = sharedTrajectory(normA, normB);

      const curA = currentNormalized(sA);
      const curB = currentNormalized(sB);
      const latestTraj = traj.length > 0 ? traj[traj.length - 1].value : 100;

      const deviationA = ((curA - latestTraj) / latestTraj) * 100;
      const deviationB = ((curB - latestTraj) / latestTraj) * 100;

      const signalA = deriveSignal(deviationA, pair.divergenceThreshold);
      const signalB = deriveSignal(deviationB, pair.divergenceThreshold);

      const hasDivergence = signalA !== "HOLD" || signalB !== "HOLD";

      return {
        pair,
        sA,
        sB,
        normA,
        normB,
        traj,
        curA,
        curB,
        latestTraj,
        deviationA,
        deviationB,
        signalA,
        signalB,
        hasDivergence
      };
    }).filter(Boolean) as NonNullable<ReturnType<typeof COUPLED_PAIRS[number] extends never ? never : any>>;
  }, [stocks]);

  const buyCount = pairResults.filter(r => r.signalA === "BUY" || r.signalB === "BUY").length;
  const sellCount = pairResults.filter(r => r.signalA === "SELL" || r.signalB === "SELL").length;
  const syncCount = pairResults.filter(r => !r.hasDivergence).length;

  const filtered = filterSignal === "ALL"
    ? pairResults
    : pairResults.filter(r => r.signalA === filterSignal || r.signalB === filterSignal);

  return (
    <div className="space-y-6">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-6 border border-slate-800 shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono font-bold tracking-widest text-indigo-400 block uppercase leading-none">
              COUPLED PAIRS • TRAJECTORY DIVERGENCE ENGINE
            </span>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Link className="w-5 h-5 text-indigo-400" />
              Economically Linked Pair Signals
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
              Each pair shares a <strong>common price trajectory</strong> (indexed to 100 at start). When one stock
              deviates past ±{COUPLED_PAIRS[0]?.divergenceThreshold}% from that trajectory, a signal fires:{" "}
              <span className="text-emerald-400 font-bold">fallen below → BUY</span>,{" "}
              <span className="text-rose-400 font-bold">risen above → SELL</span>.
            </p>
          </div>

          <div className="flex gap-4 bg-indigo-950/60 p-4 rounded-xl border border-slate-800 text-center shrink-0">
            <div className="px-2">
              <span className="text-3xs text-slate-400 block uppercase font-bold tracking-wider mb-1">BUY Signals</span>
              <strong className="text-xl text-emerald-400 font-mono block leading-none">{buyCount}</strong>
            </div>
            <div className="border-r border-slate-800" />
            <div className="px-2">
              <span className="text-3xs text-slate-400 block uppercase font-bold tracking-wider mb-1">SELL Signals</span>
              <strong className="text-xl text-rose-400 font-mono block leading-none">{sellCount}</strong>
            </div>
            <div className="border-r border-slate-800" />
            <div className="px-2">
              <span className="text-3xs text-slate-400 block uppercase font-bold tracking-wider mb-1">In Sync</span>
              <strong className="text-xl text-amber-400 font-mono block leading-none">{syncCount}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ── Strategy note ─────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 p-4 bg-indigo-50 border border-indigo-150 rounded-xl text-3xs text-indigo-900">
        <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Pairs Trading Rule:</strong> Company A and Company B are economically coupled — one relies on the
          other's product. Their prices tend to move together over time (shared trajectory).
          When <strong>Company A rises above</strong> the shared trajectory → it is relatively overvalued → <span className="text-rose-700 font-bold">SELL A</span> (rotate to B).
          When <strong>Company B falls below</strong> the shared trajectory → it is relatively undervalued → <span className="text-emerald-700 font-bold">BUY B</span>.
          Full stop.
        </p>
      </div>

      {/* ── Filter row ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-3xs font-mono font-bold uppercase text-slate-500 tracking-wider">Filter:</span>
        {(["ALL", "BUY", "SELL", "HOLD"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilterSignal(f)}
            className={`px-3 py-1.5 rounded-lg text-3xs font-bold uppercase font-mono transition-all cursor-pointer border ${
              filterSignal === f
                ? f === "BUY" ? "bg-emerald-600 text-white border-emerald-600"
                  : f === "SELL" ? "bg-rose-600 text-white border-rose-600"
                  : f === "HOLD" ? "bg-amber-500 text-white border-amber-500"
                  : "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-slate-500 border-gray-200 hover:border-slate-400"
            }`}
          >
            {f === "ALL" ? `All Pairs (${pairResults.length})` : f}
          </button>
        ))}
      </div>

      {/* ── Pair cards ────────────────────────────────────────────────────── */}
      {filtered.length === 0 && (
        <div className="text-center py-12 text-slate-400 font-mono text-xs">
          No pairs match the current filter.
        </div>
      )}

      <div className="space-y-4">
        {filtered.map(r => {
          const isExpanded = expandedId === r.pair.id;
          const hasDivergence = r.hasDivergence;

          return (
            <div
              key={r.pair.id}
              className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                hasDivergence ? "border-indigo-200" : "border-gray-100"
              }`}
            >
              {/* Card header row */}
              <div
                className={`px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none ${
                  hasDivergence ? "bg-indigo-50/60" : "bg-white"
                }`}
                onClick={() => setExpandedId(isExpanded ? null : r.pair.id)}
              >
                {/* Left: company names */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1 min-w-0">
                  {/* Stock A chip */}
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                    <span className="font-mono text-xs font-extrabold text-indigo-800 bg-indigo-100 px-1.5 py-0.5 rounded border border-indigo-200">
                      {r.sA.ticker}
                    </span>
                    <span className="text-3xs text-slate-500 truncate max-w-[120px]">{r.sA.companyName.split(" ").slice(0, 2).join(" ")}</span>
                  </div>

                  <Link className="w-3.5 h-3.5 text-slate-400 shrink-0 hidden sm:block" />

                  {/* Stock B chip */}
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="font-mono text-xs font-extrabold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200">
                      {r.sB.ticker}
                    </span>
                    <span className="text-3xs text-slate-500 truncate max-w-[120px]">{r.sB.companyName.split(" ").slice(0, 2).join(" ")}</span>
                  </div>
                </div>

                {/* Right: signal badges + deviation + chevron */}
                <div className="flex items-center gap-3 shrink-0">
                  {/* Stock A signal */}
                  <div className="text-center">
                    <div className="text-3xs text-slate-400 font-mono mb-0.5">{r.sA.ticker}</div>
                    <SignalBadge signal={r.signalA} />
                    <div className={`text-[10px] font-mono font-bold mt-0.5 ${
                      r.deviationA > 0 ? "text-rose-600" : r.deviationA < 0 ? "text-emerald-600" : "text-slate-400"
                    }`}>
                      {r.deviationA > 0 ? "+" : ""}{r.deviationA.toFixed(1)}%
                    </div>
                  </div>

                  <div className="w-px h-8 bg-gray-100" />

                  {/* Stock B signal */}
                  <div className="text-center">
                    <div className="text-3xs text-slate-400 font-mono mb-0.5">{r.sB.ticker}</div>
                    <SignalBadge signal={r.signalB} />
                    <div className={`text-[10px] font-mono font-bold mt-0.5 ${
                      r.deviationB > 0 ? "text-rose-600" : r.deviationB < 0 ? "text-emerald-600" : "text-slate-400"
                    }`}>
                      {r.deviationB > 0 ? "+" : ""}{r.deviationB.toFixed(1)}%
                    </div>
                  </div>

                  {hasDivergence ? (
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  )}

                  {isExpanded
                    ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  }
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="border-t border-gray-100 p-5 grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* Left: mini chart */}
                  <div className="space-y-3">
                    <div className="text-3xs font-mono font-bold uppercase text-slate-400 tracking-wider">
                      Shared Trajectory Chart (indexed to 100)
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <MiniChart
                        seriesA={r.normA}
                        seriesB={r.normB}
                        trajectory={r.traj}
                      />
                      {/* Legend */}
                      <div className="flex items-center gap-4 mt-2 text-3xs font-mono">
                        <span className="flex items-center gap-1.5">
                          <span className="w-4 h-0.5 bg-indigo-500 inline-block rounded" />
                          {r.sA.ticker}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-4 h-0.5 bg-emerald-500 inline-block rounded" />
                          {r.sB.ticker}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-4 h-0.5 bg-slate-400 inline-block rounded" style={{ borderTop: "1.5px dashed #94a3b8" }} />
                          Shared Trajectory
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: stats + action */}
                  <div className="space-y-4">

                    {/* Relationship description */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-3xs font-mono font-bold uppercase text-slate-400 block mb-1.5 tracking-wider">Why These Two Are Linked:</span>
                      <p className="text-3xs text-slate-700 leading-relaxed font-sans">{r.pair.relationship}</p>
                    </div>

                    {/* Current numbers */}
                    <div className="grid grid-cols-3 gap-2 text-center text-3xs font-mono">
                      <div className="p-2 bg-indigo-50 rounded-lg border border-indigo-100">
                        <span className="block text-indigo-400 text-[9px] uppercase font-bold">{r.sA.ticker} Price</span>
                        <strong className="text-sm text-indigo-800 block mt-0.5">${r.sA.stats.currentPrice.toFixed(2)}</strong>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                        <span className="block text-slate-400 text-[9px] uppercase font-bold">Trajectory</span>
                        <strong className="text-sm text-slate-700 block mt-0.5">{r.latestTraj.toFixed(1)}</strong>
                        <span className="text-[9px] text-slate-400">index val</span>
                      </div>
                      <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                        <span className="block text-emerald-400 text-[9px] uppercase font-bold">{r.sB.ticker} Price</span>
                        <strong className="text-sm text-emerald-800 block mt-0.5">${r.sB.stats.currentPrice.toFixed(2)}</strong>
                      </div>
                    </div>

                    {/* Actionable signal summary */}
                    {hasDivergence && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5">
                        <span className="text-3xs font-mono font-bold uppercase text-amber-800 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Divergence Detected — Action Required
                        </span>
                        {r.signalA !== "HOLD" && (
                          <p className="text-3xs text-slate-700 font-sans leading-relaxed">
                            <strong className="text-indigo-700">{r.sA.ticker}</strong> is{" "}
                            {r.deviationA > 0
                              ? <><span className="text-rose-700 font-bold">+{r.deviationA.toFixed(1)}% above</span> the shared trajectory → <span className="text-rose-700 font-bold">SELL {r.sA.ticker}</span> or rotate into {r.sB.ticker}.</>
                              : <><span className="text-emerald-700 font-bold">{r.deviationA.toFixed(1)}% below</span> the shared trajectory → <span className="text-emerald-700 font-bold">BUY {r.sA.ticker}</span>.</>
                            }
                          </p>
                        )}
                        {r.signalB !== "HOLD" && (
                          <p className="text-3xs text-slate-700 font-sans leading-relaxed">
                            <strong className="text-emerald-700">{r.sB.ticker}</strong> is{" "}
                            {r.deviationB > 0
                              ? <><span className="text-rose-700 font-bold">+{r.deviationB.toFixed(1)}% above</span> the shared trajectory → <span className="text-rose-700 font-bold">SELL {r.sB.ticker}</span> or rotate into {r.sA.ticker}.</>
                              : <><span className="text-emerald-700 font-bold">{r.deviationB.toFixed(1)}% below</span> the shared trajectory → <span className="text-emerald-700 font-bold">BUY {r.sB.ticker}</span>.</>
                            }
                          </p>
                        )}
                      </div>
                    )}

                    {!hasDivergence && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-3xs font-sans text-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5 inline mr-1.5 text-emerald-600" />
                        Both stocks are trading <strong>within ±{r.pair.divergenceThreshold}%</strong> of their shared
                        trajectory. No divergence signal — <strong>hold current positions</strong>.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}
