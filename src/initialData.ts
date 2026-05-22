import { Stock, MarketEvent, AsymmetryMetrics } from "./types";

export function calculateAsymmetryScore(asymmetry: AsymmetryMetrics): number {
  const numerator = (asymmetry.upside || 1) + (asymmetry.conviction || 1) + (asymmetry.catalyst || 1);
  const denominator = (asymmetry.downside || 1) + (asymmetry.risk || 1);
  return parseFloat((numerator / denominator).toFixed(2));
}

// Generate high fidelity semi-annual price data from 2020 to 2026 for each stock
export function generatePriceHistoryForTicker(ticker: string, basePrice: number): { date: string; price: number }[] {
  const dates = [
    "2020-01", "2020-07",
    "2021-01", "2021-07",
    "2022-01", "2022-07",
    "2023-01", "2023-07",
    "2024-01", "2024-07",
    "2025-01", "2025-07",
    "2026-01", "2026-05"
  ];

  // Specific multipliers for each stock to reflect real-world trends from 2020 to 2026.
  const trends: Record<string, number[]> = {
    NVDA: [0.08, 0.15, 0.22, 0.32, 0.25, 0.14, 0.28, 0.45, 0.65, 0.85, 1.00, 0.95, 1.10, 1.15],
    TSM:  [0.40, 0.65, 0.90, 0.95, 0.85, 0.55, 0.62, 0.75, 0.88, 1.10, 0.90, 1.05, 1.18, 1.25],
    AMD:  [0.35, 0.55, 0.68, 0.85, 0.72, 0.48, 0.54, 0.78, 0.92, 1.05, 0.84, 0.94, 1.12, 1.15],
    AVGO: [0.22, 0.26, 0.35, 0.42, 0.45, 0.38, 0.48, 0.62, 0.85, 1.10, 0.98, 1.15, 1.22, 1.28],
    MSFT: [0.42, 0.55, 0.62, 0.78, 0.82, 0.68, 0.74, 0.85, 0.95, 1.08, 1.02, 1.12, 1.18, 1.22],
    AMZN: [0.55, 0.85, 0.92, 0.98, 0.85, 0.62, 0.58, 0.72, 0.84, 0.95, 0.90, 1.05, 1.12, 1.16],
    GOOGL:[0.44, 0.58, 0.65, 0.82, 0.85, 0.64, 0.60, 0.75, 0.88, 1.02, 0.96, 1.08, 1.16, 1.20],
    EQIX: [0.72, 0.82, 0.85, 0.92, 0.88, 0.78, 0.82, 0.88, 0.94, 1.05, 0.98, 1.05, 1.12, 1.15],
    VST:  [0.18, 0.22, 0.20, 0.24, 0.22, 0.26, 0.28, 0.32, 0.45, 0.65, 0.85, 1.05, 1.15, 1.20],
    IONQ: [0.35, 0.42, 1.00, 0.85, 0.40, 0.22, 0.38, 0.60, 0.55, 0.42, 0.52, 0.75, 0.82, 0.88],
    GS:   [0.60, 0.68, 0.75, 0.86, 0.88, 0.72, 0.68, 0.78, 0.85, 0.96, 0.92, 1.02, 1.10, 1.14],
    ASML: [0.30, 0.50, 0.72, 0.80, 0.76, 0.54, 0.60, 0.74, 0.86, 1.04, 0.88, 1.00, 1.14, 1.20]
  };

  const selectedTrend = trends[ticker] || [0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0, 1.05];

  return dates.map((date, idx) => {
    const multiplier = selectedTrend[idx] || 1;
    return {
      date,
      price: Math.round(basePrice * multiplier * 100) / 100
    };
  });
}

export const INITIAL_STOCKS: Stock[] = [
  {
    ticker: "NVDA",
    companyName: "NVIDIA Corporation",
    sector: "Semiconductors",
    region: "US",
    marketCap: 2200,
    theme: "AI",
    reasonForInclusion: "Dominant designer of GPU systems and owner of the CUDA programmer ecosystem.",
    anchorClassification: "core_anchor",
    scores: {
      marketLeadership: 5,
      growthExposure: 5,
      revenueGrowth: 5,
      profitability: 5,
      balanceSheet: 5,
      valuationRisk: 2, // High risk = low score
      catalystStrength: 5,
      downsideRisk: 3, // Modest safety
      asymmetricPotential: 4
    },
    asymmetry: {
      upside: 5,
      downside: 3,
      conviction: 5,
      catalyst: 5,
      risk: 3
    },
    rationale: "NVDA holds a virtual monopoly in datacenter AI training hardware. While extremely popular, its ecosystem lock-in (CUDA) renders it the ultimate computing anchor for this transition cycle.",
    stats: {
      currentPrice: 920.00,
      high52w: 974.00,
      low52w: 480.00,
      movingAverage50: 890.30,
      revenueGrowthRate: 125,
      earningsTrend: "Exceptional profitability, 130% EBITDA growth",
      valuationPE: "68x Trailing P/E, 32x Forward",
      debtLevel: "Low",
      leverageRatio: "Debt/Equity 0.15"
    },
    decisionState: "BUY",
    nextReviewDate: "2026-06-30",
    decisionData: {
      positionSizePercent: 8,
      targetPrice: 1100.00,
      stopLoss: 750.00,
      buyReason: "Standard heavy hardware compute lock-in. Key anchor.",
      buyExpectedCatalyst: "Next earnings print displaying continued Blackwell chip pre-orders.",
      decidedAt: "2026-05-15"
    }
  },
  {
    ticker: "AMD",
    companyName: "Advanced Micro Devices",
    sector: "Semiconductors",
    region: "US",
    marketCap: 280,
    theme: "Chips",
    reasonForInclusion: "Leading challenger in x86 CPUs and high-end AI accelerator chip silicon, launching MI300/MI325 series.",
    anchorClassification: "asymmetric_opportunity",
    scores: {
      marketLeadership: 3,
      growthExposure: 5,
      revenueGrowth: 4,
      profitability: 3,
      balanceSheet: 4,
      valuationRisk: 3,
      catalystStrength: 4,
      downsideRisk: 4,
      asymmetricPotential: 5
    },
    asymmetry: {
      upside: 5,
      downside: 2,
      conviction: 4,
      catalyst: 4,
      risk: 2
    },
    rationale: "AMD represents a secondary alternative to NVDA. Hyperscalers represent a captive buyer base eager to see a viable competitor. MI300 acceleration serves as a massive valuation lever.",
    stats: {
      currentPrice: 164.50,
      high52w: 227.30,
      low52w: 104.10,
      movingAverage50: 168.10,
      revenueGrowthRate: 18,
      earningsTrend: "Improving, GAAP profits expanding on datacenter chip ramp",
      valuationPE: "45x Forward P/E",
      debtLevel: "Low",
      leverageRatio: "Debt/Equity 0.08"
    },
    decisionState: "WATCHLIST",
    nextReviewDate: "2026-06-15"
  },
  {
    ticker: "AVGO",
    companyName: "Broadcom Inc.",
    sector: "Semiconductors",
    region: "US",
    marketCap: 680,
    theme: "Chips",
    reasonForInclusion: "Supreme leader in custom silicon (ASICs) for Google TPUs and advanced networking switch hardware.",
    anchorClassification: "core_anchor",
    scores: {
      marketLeadership: 5,
      growthExposure: 4,
      revenueGrowth: 3,
      profitability: 5,
      balanceSheet: 3,
      valuationRisk: 4,
      catalystStrength: 4,
      downsideRisk: 4,
      asymmetricPotential: 4
    },
    asymmetry: {
      upside: 4,
      downside: 2,
      conviction: 5,
      catalyst: 4,
      risk: 2
    },
    rationale: "Broadcom captures high premium software revenues from VMWare alongside customized ASIC chips designed for major cloud co-development clients (Google, Meta). Great cash flow profiles.",
    stats: {
      currentPrice: 142.50,
      high52w: 151.20,
      low52w: 78.40,
      movingAverage50: 138.90,
      revenueGrowthRate: 34,
      earningsTrend: "Robust free cash flow matching a 45%+ operating margin",
      valuationPE: "28x Forward P/E",
      debtLevel: "Medium",
      leverageRatio: "Debt/Equity 1.15"
    },
    decisionState: "HOLD",
    nextReviewDate: "2026-07-20",
    decisionData: {
      holdReason: "Strong fundamental ASIC revenue but valuation fully pricing custom TPU/VMWare synergies in the short term.",
      holdKeyRisk: "Slowing cloud CAPEX budgets or client insourcing of custom ASIC design.",
      holdTrigger: "Evaluate potential add size if stock consolidates 10-15% lower.",
      decidedAt: "2026-05-10"
    }
  },
  {
    ticker: "TSM",
    companyName: "Taiwan Semiconductor Manufacturing Co.",
    sector: "Semiconductors",
    region: "Asia",
    marketCap: 780,
    theme: "Infrastructure",
    reasonForInclusion: "Constructs over 90% of globally deployed high-end processor silicon.",
    anchorClassification: "core_anchor",
    scores: {
      marketLeadership: 5,
      growthExposure: 5,
      revenueGrowth: 4,
      profitability: 5,
      balanceSheet: 4,
      valuationRisk: 4,
      catalystStrength: 4,
      downsideRisk: 3,
      asymmetricPotential: 4
    },
    asymmetry: {
      upside: 4,
      downside: 2,
      conviction: 5,
      catalyst: 4,
      risk: 3
    },
    rationale: "Unrivaled fabrication monopolist. Safe and cheap fundamentally ($23x forward earnings), though constrained by geographic tension on the Taiwan strait. Irreplaceable link in compute hardware.",
    stats: {
      currentPrice: 154.00,
      high52w: 162.00,
      low52w: 92.00,
      movingAverage50: 145.40,
      revenueGrowthRate: 26,
      earningsTrend: "Highly profitable, rising gross margins to 53%",
      valuationPE: "23x Forward P/E",
      debtLevel: "Medium",
      leverageRatio: "Debt/Equity 0.38"
    },
    decisionState: "BUY",
    nextReviewDate: "2026-06-30",
    decisionData: {
      positionSizePercent: 6,
      targetPrice: 185.00,
      stopLoss: 125.00,
      buyReason: "Monopoly foundry. Essential component. Lower multiples balance the regional risks.",
      buyExpectedCatalyst: "US CHIPS Act subsidies payout approvals and 2nm production line schedule releases.",
      decidedAt: "2026-05-18"
    }
  },
  {
    ticker: "MSFT",
    companyName: "Microsoft Corporation",
    sector: "Software",
    region: "US",
    marketCap: 3100,
    theme: "Cloud",
    reasonForInclusion: "Vanguard of software AI deployment through OpenAI backing, Azure cloud systems, and Copilot integrations.",
    anchorClassification: "core_anchor",
    scores: {
      marketLeadership: 5,
      growthExposure: 5,
      revenueGrowth: 3,
      profitability: 5,
      balanceSheet: 5,
      valuationRisk: 3,
      catalystStrength: 4,
      downsideRisk: 5, // High safety = high score
      asymmetricPotential: 3 // Core compounder, slightly less spec upside
    },
    asymmetry: {
      upside: 3,
      downside: 1,
      conviction: 5,
      catalyst: 4,
      risk: 1
    },
    rationale: "MSFT translates raw AI compute into corporate SaaS licensing expansion at scale. Backed by AAA balance sheet and massive Azure cloud infrastructure.",
    stats: {
      currentPrice: 422.00,
      high52w: 430.80,
      low52w: 315.10,
      movingAverage50: 412.50,
      revenueGrowthRate: 17,
      earningsTrend: "Steadily rising cash flows, 20% y/y net margins",
      valuationPE: "35x Trailing P/E",
      debtLevel: "Low",
      leverageRatio: "Debt/Equity 0.22"
    },
    decisionState: "BUY",
    nextReviewDate: "2026-07-31",
    decisionData: {
      positionSizePercent: 10,
      targetPrice: 480.00,
      stopLoss: 380.00,
      buyReason: "Extremely stable enterprise AI translation vector and high margin recurring database subscription fees.",
      buyExpectedCatalyst: "Quarterly Azure revenue growth exceeding 30% indicating massive corporate cloud ingestion.",
      decidedAt: "2026-05-12"
    }
  },
  {
    ticker: "AMZN",
    companyName: "Amazon.com, Inc.",
    sector: "Cloud / Infrastructure",
    region: "US",
    marketCap: 1900,
    theme: "Cloud",
    reasonForInclusion: "AWS operates the leading public cloud hosting data centers globally with heavy customized silicon investments.",
    anchorClassification: "core_anchor",
    scores: {
      marketLeadership: 5,
      growthExposure: 4,
      revenueGrowth: 3,
      profitability: 4,
      balanceSheet: 4,
      valuationRisk: 4,
      catalystStrength: 3,
      downsideRisk: 4,
      asymmetricPotential: 3
    },
    asymmetry: {
      upside: 3,
      downside: 2,
      conviction: 4,
      catalyst: 3,
      risk: 2
    },
    rationale: "AWS commands premier infrastructure share. Large free cash flow optimization from e-commerce logistics can backstop massive computing data centre builds globally.",
    stats: {
      currentPrice: 182.00,
      high52w: 191.70,
      low52w: 118.20,
      movingAverage50: 179.20,
      revenueGrowthRate: 14,
      earningsTrend: "Growing operating margin over 11% led by AWS efficiency",
      valuationPE: "42x Trailing P/E",
      debtLevel: "Medium",
      leverageRatio: "Debt/Equity 0.35"
    },
    decisionState: "HOLD",
    nextReviewDate: "2026-08-01",
    decisionData: {
      holdReason: "Retail margins stabilized, but AWS margins priced in. Looking for better cloud SaaS breakthrough.",
      holdKeyRisk: "Price wars on bare metal VMs among Azure, AWS, and GCP.",
      holdTrigger: "Buy more if AWS growth sweeps past 21% or nuclear power deals finalized.",
      decidedAt: "2026-05-11"
    }
  },
  {
    ticker: "GOOGL",
    companyName: "Alphabet Inc.",
    sector: "Software",
    region: "US",
    marketCap: 2100,
    theme: "AI",
    reasonForInclusion: "Pioneer in transformer architectures, creators of Gemini, and owners of high-end TPU custom silicon lines.",
    anchorClassification: "core_anchor",
    scores: {
      marketLeadership: 4,
      growthExposure: 5,
      revenueGrowth: 3,
      profitability: 5,
      balanceSheet: 5,
      valuationRisk: 4,
      catalystStrength: 4,
      downsideRisk: 4,
      asymmetricPotential: 4
    },
    asymmetry: {
      upside: 4,
      downside: 2,
      conviction: 5,
      catalyst: 4,
      risk: 1
    },
    rationale: "Very stable valuation (22x forward) with enormous proprietary data vectors. Vertically integrated from TPUs up to YouTube, android search and deep academic research (DeepMind).",
    stats: {
      currentPrice: 174.50,
      high52w: 178.60,
      low52w: 120.40,
      movingAverage50: 169.80,
      revenueGrowthRate: 15,
      earningsTrend: "Expanding GAAP profits, initiating dividend payouts",
      valuationPE: "22x Forward P/E (Value Buy)",
      debtLevel: "Low",
      leverageRatio: "Debt/Equity 0.05"
    },
    decisionState: "WATCHLIST",
    nextReviewDate: "2026-06-25"
  },
  {
    ticker: "EQIX",
    companyName: "Equinix, Inc.",
    sector: "Data Centres",
    region: "US",
    marketCap: 75,
    theme: "Data Centres",
    reasonForInclusion: "Leading global carrier-neutral datacenter co-location provider, crucial to interconnecting public and private clouds.",
    anchorClassification: "core_anchor",
    scores: {
      marketLeadership: 4,
      growthExposure: 4,
      revenueGrowth: 3,
      profitability: 4,
      balanceSheet: 3,
      valuationRisk: 3,
      catalystStrength: 3,
      downsideRisk: 4,
      asymmetricPotential: 3
    },
    asymmetry: {
      upside: 3,
      downside: 2,
      conviction: 4,
      catalyst: 3,
      risk: 2
    },
    rationale: "A retail REIT yielding dividends. Equinix provides the critical cross-connect networking nodes. Less explosive, but steady defensive infrastructure play with contract escalators.",
    stats: {
      currentPrice: 785.00,
      high52w: 912.00,
      low52w: 671.00,
      movingAverage50: 775.20,
      revenueGrowthRate: 8,
      earningsTrend: "Consistent AFFO (adjusted funds from ops) growth",
      valuationPE: "25x Price/AFFO",
      debtLevel: "High",
      leverageRatio: "Debt/Equity 1.40"
    },
    decisionState: "REVIEW",
    nextReviewDate: "2026-05-28"
  },
  {
    ticker: "VST",
    companyName: "Vistra Corp.",
    sector: "Energy / Utilities",
    region: "US",
    marketCap: 38,
    theme: "Energy",
    reasonForInclusion: "Independent power producer possessing substantial nuclear and gas assets located near key US internet hub facilities.",
    anchorClassification: "asymmetric_opportunity",
    scores: {
      marketLeadership: 4,
      growthExposure: 5,
      revenueGrowth: 3,
      profitability: 4,
      balanceSheet: 3,
      valuationRisk: 3,
      catalystStrength: 5,
      downsideRisk: 4,
      asymmetricPotential: 5
    },
    asymmetry: {
      upside: 5,
      downside: 1,
      conviction: 4,
      catalyst: 5,
      risk: 2
    },
    rationale: "Power is the single most defining physical constraint on datacenter deployment. Vistra's nuclear assets represent reliable clean baseload power valued highly by hyperscalers.",
    stats: {
      currentPrice: 85.00,
      high52w: 92.50,
      low52w: 24.10,
      movingAverage50: 78.40,
      revenueGrowthRate: 16,
      earningsTrend: "Margins expanding heavily on power purchasing agreement premium yields",
      valuationPE: "20x Forward P/E",
      debtLevel: "High",
      leverageRatio: "Debt/Equity 1.95"
    },
    decisionState: "BUY",
    nextReviewDate: "2026-06-20",
    decisionData: {
      positionSizePercent: 4,
      targetPrice: 110.00,
      stopLoss: 68.00,
      buyReason: "Baseload nuclear power is an absolute necessity for 24/7 AI workloads.",
      buyExpectedCatalyst: "Signing co-location nuclear agreements with hyperscalers in Texas grid.",
      decidedAt: "2026-05-14"
    }
  },
  {
    ticker: "IONQ",
    companyName: "IonQ, Inc.",
    sector: "Quantum Computing",
    region: "US",
    marketCap: 2.3,
    theme: "Quantum",
    reasonForInclusion: "Pioneering pure-play quantum hardware vendor delivering trapped-ion computer processing units via cloud.",
    anchorClassification: "speculative_opportunity",
    scores: {
      marketLeadership: 3,
      growthExposure: 5,
      revenueGrowth: 5,
      profitability: 1,
      balanceSheet: 4,
      valuationRisk: 2,
      catalystStrength: 4,
      downsideRisk: 4,
      asymmetricPotential: 5
    },
    asymmetry: {
      upside: 5,
      downside: 4,
      conviction: 3,
      catalyst: 4,
      risk: 4
    },
    rationale: "High risk, cash burn speculative pick. Excellent asymmetry: absolute zero or 50x upside. Trapped-ion modular QPUs can scale to logic qubit correction quickly, disrupting encryption, logistics, and modeling.",
    stats: {
      currentPrice: 11.20,
      high52w: 20.10,
      low52w: 6.80,
      movingAverage50: 10.80,
      revenueGrowthRate: 88,
      earningsTrend: "Loss making (~$150M oper. loss), supported by $400M solid cash cushion",
      valuationPE: "P/S 43x",
      debtLevel: "Low",
      leverageRatio: "Debt/Equity 0.05"
    },
    decisionState: "SELL",
    nextReviewDate: "2026-05-30",
    decisionData: {
      sellReason: "Reached target technical resistance point. Rebalancing into energy anchor (VST).",
      realizedGainPercent: 45,
      sellLesson: "Exit volatile pre-revenue stocks partially when hype peaks.",
      keepOnWatchlist: true,
      decidedAt: "2026-05-19"
    }
  },
  {
    ticker: "GS",
    companyName: "Goldman Sachs Group",
    sector: "Financial Services",
    region: "US",
    marketCap: 155,
    theme: "Capital Markets",
    reasonForInclusion: "Strong macro partner that finances and benefits from tech waves and capital recycling.",
    anchorClassification: "core_anchor",
    scores: {
      marketLeadership: 4,
      growthExposure: 3,
      revenueGrowth: 3,
      profitability: 4,
      balanceSheet: 4,
      valuationRisk: 4,
      catalystStrength: 3,
      downsideRisk: 4,
      asymmetricPotential: 3
    },
    asymmetry: {
      upside: 3,
      downside: 2,
      conviction: 4,
      catalyst: 3,
      risk: 2
    },
    rationale: "Goldman Sachs represents the premier financial sponsor of corporate tech expansion through advisory and capital underwriting, highly correlated with tech cycles in relative proportions.",
    stats: {
      currentPrice: 380.00,
      high52w: 420.00,
      low52w: 305.00,
      movingAverage50: 368.50,
      revenueGrowthRate: 15,
      earningsTrend: "Sustained investment banking advisory fee growth",
      valuationPE: "11x Forward P/E",
      debtLevel: "High",
      leverageRatio: "Debt/Equity 2.50"
    },
    decisionState: "HOLD",
    nextReviewDate: "2026-07-15",
    decisionData: {
      holdReason: "Strong capital market activities, highly correlated with tech liquidity waves.",
      holdKeyRisk: "Interest rate volatile, private credit competition risk.",
      holdTrigger: "Buy more if capital transactions/IPO volume shows multi-quarter spike.",
      decidedAt: "2026-05-18"
    }
  },
  {
    ticker: "ASML",
    companyName: "ASML Holding N.V.",
    sector: "Semiconductors",
    region: "Europe",
    marketCap: 360,
    theme: "Chips",
    reasonForInclusion: "Unrivaled monopoly supplier of Extreme Ultraviolet (EUV) photolithography machines to chip foundries.",
    anchorClassification: "core_anchor",
    scores: {
      marketLeadership: 5,
      growthExposure: 5,
      revenueGrowth: 4,
      profitability: 5,
      balanceSheet: 4,
      valuationRisk: 3,
      catalystStrength: 4,
      downsideRisk: 4,
      asymmetricPotential: 4
    },
    asymmetry: {
      upside: 4,
      downside: 2,
      conviction: 5,
      catalyst: 4,
      risk: 2
    },
    rationale: "ASML is the ultimate bottleneck in semiconductor manufacturing. Every modern GPU designed by NVIDIA and fabricated by TSMC requires ASML's lithography systems, making it the perfect tech hardware proxy.",
    stats: {
      currentPrice: 910.00,
      high52w: 1020.00,
      low52w: 610.00,
      movingAverage50: 885.05,
      revenueGrowthRate: 30,
      earningsTrend: "Industry-leading 50%+ gross margin backed by multi-billion order backlog",
      valuationPE: "38x Forward P/E",
      debtLevel: "Low",
      leverageRatio: "Debt/Equity 0.25"
    },
    decisionState: "BUY",
    nextReviewDate: "2026-06-30",
    decisionData: {
      positionSizePercent: 5,
      targetPrice: 1100.00,
      stopLoss: 780.00,
      buyReason: "Monopoly lithography node supplier, core hardware value chain component.",
      buyExpectedCatalyst: "TSMC and Samsung expanding factory capacities and placing huge orders for High-NA machines.",
      decidedAt: "2026-05-18"
    }
  }
];

// Populate and stitch sample price history array for all 10 stocks.
INITIAL_STOCKS.forEach(stock => {
  stock.priceHistory = generatePriceHistoryForTicker(stock.ticker, stock.stats.currentPrice);
  stock.asymmetry.asymmetryScore = calculateAsymmetryScore(stock.asymmetry);
});

export const SAMPLE_EVENTS: MarketEvent[] = [
  {
    id: "evt_1",
    title: "AWS Closes Long-term Nuclear Baseload Deal with Utility",
    rawContent: "Amazon Web Services has finalized plans to purchase a massive nuclear capacity link directly from a regional power utility to serve its expanded 1.5GW datacenter footprint in Pennsylvania. This guarantees steady, clean baseload power and completely bypasses grid allocation queues.",
    timestamp: "2026-05-21T14:32:00Z",
    sentiment: "Bullish",
    analysisSummary: "Confirms grid bottlenecks are driving premium direct-nuclear co-location deals. Massive macro tailwind for energy utilities.",
    impactedSectors: [
      { sector: "Energy / Utilities", impact: "Positive", rationale: "Guaranteed high capacity factors and zero-carbon premiums." },
      { sector: "Data Centres", impact: "Positive", rationale: "Ensures reliable uninterruptible power for next-gen clusters." }
    ],
    stockImpacts: [
      { ticker: "VST", impact: "Positive", analysis: "Direct nuclear operator with scale, highly positioned to co-locate with hyperscalers." },
      { ticker: "AMZN", impact: "Positive", analysis: "Secures power runway ahead of competitors experiencing grid constraints." },
      { ticker: "EQIX", impact: "Neutral", analysis: "REIT spaces may experience mild demand tilt as hyperscalers prioritize direct-owned large nuclear sites." }
    ]
  },
  {
    id: "evt_2",
    title: "Blackwell Accelerator Yields Reported Superb at Lead Foundry",
    rawContent: "An industry publication reports that manufacturing yields for the multi-die Blackwell AI packaging lines have achieved highly stable output numbers, ahead of early schedules. However, CoWoS high-bandwidth memory placement bottleneck is expected to keep lead-times near 24 weeks.",
    timestamp: "2026-05-18T09:15:00Z",
    sentiment: "Bullish",
    analysisSummary: "Bullish for chip designers as supply constraints are yield-related, preserving high ASP pricing power.",
    impactedSectors: [
      { sector: "Semiconductors", impact: "Positive", rationale: "Accelerates unit shipments for GPUs and memory systems." },
      { sector: "Cloud", impact: "Positive", rationale: "Azure and AWS will receive early batch shipments to expand services." }
    ],
    stockImpacts: [
      { ticker: "NVDA", impact: "Positive", analysis: "Saves margin profiles and ensures continuous quarterly guidance beats." },
      { ticker: "TSM", impact: "Positive", analysis: "Solidifies fabrication superiority and pricing power over packaging stages." },
      { ticker: "AMD", impact: "Neutral", analysis: "Maintains standard high market appetite for MI300 variants serving as secondary options." }
    ]
  },
  {
    id: "evt_3",
    title: "Quantum Entanglement Fault-Tolerance Demonstrated in Trapped-Ion Rig",
    rawContent: "Researchers have achieved logical-qubit fault tolerance with consecutive error-corrected gate operations at 99.98% fidelity. The modular silicon-photonic waveguide coupling demonstrated can allow multiple cryogenic dilution units to link with negligible latency.",
    timestamp: "2026-05-15T11:00:00Z",
    sentiment: "Bullish",
    analysisSummary: "A substantial milestone for physical quantum scaling, turning pure speculative assets into valid medium-term candidates.",
    impactedSectors: [
      { sector: "Quantum Computing", impact: "Positive", rationale: "Expands physical capability and drives commercial software pre-contracts." }
    ],
    stockImpacts: [
      { ticker: "IONQ", impact: "Positive", analysis: "Direct pioneer of trapped-ion systems, directly validates optical waveguide roadmap." },
      { ticker: "GOOGL", impact: "Positive", analysis: "DeepMind quantum optimization teams gain massive computing simulation potential." }
    ]
  }
];
