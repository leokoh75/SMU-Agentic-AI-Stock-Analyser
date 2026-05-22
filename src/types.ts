export interface StockScores {
  marketLeadership: number; // 1-5
  growthExposure: number; // 1-5
  revenueGrowth: number; // 1-5
  profitability: number; // 1-5; 5 is highly profitable
  balanceSheet: number; // 1-5; 5 is very strong
  valuationRisk: number; // 1-5; 5 is very high risk (bad for asymmetry) OR let's treat it as: high score is safe (low risk). Let's define: 1 is extreme risky valuation, 5 is cheap.
  catalystStrength: number; // 1-5
  downsideRisk: number; // 1-5; 1 is high risk, 5 is low risk
  asymmetricPotential: number; // 1-5
}

export interface AsymmetryMetrics {
  upside: number; // 1-5
  downside: number; // 1-5; 1 is safe / limited downside, 5 is extreme downside
  conviction: number; // 1-5
  catalyst: number; // 1-5
  risk: number; // 1-5; 1 is minor risk, 5 is extreme bankruptcy risk
  asymmetryScore?: number; // Calculated dynamic: (upside + conviction + catalyst) / (downside + risk)
}

export type AnchorClassification = "core_anchor" | "asymmetric_opportunity" | "speculative_opportunity" | "reject";

export interface StockStats {
  currentPrice: number;
  high52w: number;
  low52w: number;
  movingAverage50: number;
  revenueGrowthRate: number; // % e.g., 42
  earningsTrend: string;
  valuationPE: string;
  debtLevel: "Low" | "Medium" | "High";
  leverageRatio: string;
}

export type DecisionState = "WATCHLIST" | "BUY" | "HOLD" | "SELL" | "REVIEW";

export interface DecisionData {
  // BUY columns
  positionSizePercent?: number;
  targetPrice?: number;
  stopLoss?: number;
  buyReason?: string;
  buyExpectedCatalyst?: string;
  
  // HOLD columns
  holdReason?: string;
  holdKeyRisk?: string;
  holdTrigger?: string;
  
  // SELL columns
  sellReason?: string;
  realizedGainPercent?: number;
  sellLesson?: string;
  keepOnWatchlist?: boolean;

  decidedAt?: string;
}

export interface PricePoint {
  date: string; // e.g., "2020-01-01"
  price: number;
}

export interface Stock {
  ticker: string; // NVDA, AMD etc
  companyName: string;
  sector: string;
  region: string;
  marketCap: number; // USD Billions
  theme: string; // "AI", "quantum", "data centres", "energy", "cloud", "chips", "infrastructure", "software"
  reasonForInclusion: string;
  anchorClassification: AnchorClassification;
  scores: StockScores;
  asymmetry: AsymmetryMetrics;
  rationale: string;
  stats: StockStats;
  decisionState: DecisionState;
  nextReviewDate?: string; // ISO date format "YYYY-MM-DD"
  decisionData?: DecisionData;
  priceHistory?: PricePoint[]; // Historical prices or simulated trend 2020-2026
}

export interface MarketEvent {
  id: string;
  title: string;
  rawContent: string;
  timestamp: string;
  sentiment?: "Bullish" | "Neutral" | "Bearish";
  analysisSummary?: string;
  impactedSectors?: { sector: string; impact: "Positive"; rationale: string }[];
  stockImpacts?: { ticker: string; impact: "Positive" | "Neutral" | "Negative"; analysis: string }[];
}
