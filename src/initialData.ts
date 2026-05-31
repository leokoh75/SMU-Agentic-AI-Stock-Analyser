import { Stock, MarketEvent, AsymmetryMetrics, CoupledPair } from "./types";

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
    MSFT: [0.42, 0.55, 0.62, 0.78, 0.82, 0.68, 0.74, 0.85, 0.95, 1.08, 1.02, 1.12, 1.18, 1.22],
    GOOGL:[0.44, 0.58, 0.65, 0.82, 0.85, 0.64, 0.60, 0.75, 0.88, 1.02, 0.96, 1.08, 1.16, 1.20],
    AMD:  [0.35, 0.55, 0.68, 0.85, 0.72, 0.48, 0.54, 0.78, 0.92, 1.05, 0.84, 0.94, 1.12, 1.15],
    AVGO: [0.22, 0.26, 0.35, 0.42, 0.45, 0.38, 0.48, 0.62, 0.85, 1.10, 0.98, 1.15, 1.22, 1.28],
    
    HON:  [0.55, 0.68, 0.75, 0.80, 0.85, 0.78, 0.82, 0.86, 0.92, 0.98, 0.90, 0.95, 1.02, 1.05],
    IBM:  [0.45, 0.52, 0.58, 0.64, 0.72, 0.68, 0.75, 0.84, 0.92, 1.02, 0.96, 1.04, 1.12, 1.16],
    INTC: [0.85, 0.94, 0.88, 0.75, 0.62, 0.55, 0.48, 0.52, 0.60, 0.68, 0.58, 0.62, 0.68, 0.72],
    IONQ: [0.35, 0.42, 1.00, 0.85, 0.40, 0.22, 0.38, 0.60, 0.55, 0.42, 0.52, 0.75, 0.82, 0.88],
    RGTI: [0.45, 0.52, 1.20, 0.95, 0.35, 0.18, 0.32, 0.55, 0.48, 0.35, 0.42, 0.65, 0.78, 0.82],

    EQIX: [0.72, 0.82, 0.85, 0.92, 0.88, 0.78, 0.82, 0.88, 0.94, 1.05, 0.98, 1.05, 1.12, 1.15],
    ANET: [0.24, 0.32, 0.42, 0.55, 0.62, 0.58, 0.68, 0.75, 0.88, 1.02, 0.94, 1.05, 1.15, 1.22],
    DLR:  [0.65, 0.72, 0.78, 0.85, 0.80, 0.72, 0.78, 0.82, 0.88, 0.96, 0.90, 0.96, 1.04, 1.08],
    ORCL: [0.45, 0.55, 0.62, 0.68, 0.74, 0.70, 0.78, 0.85, 0.92, 1.04, 0.98, 1.06, 1.14, 1.18],
    VRT:  [0.15, 0.22, 0.28, 0.35, 0.42, 0.38, 0.48, 0.58, 0.72, 0.95, 0.88, 1.02, 1.14, 1.22],

    CEG:  [0.32, 0.38, 0.42, 0.48, 0.55, 0.52, 0.58, 0.68, 0.82, 1.02, 0.95, 1.08, 1.15, 1.20],
    GEV:  [0.35, 0.42, 0.48, 0.54, 0.60, 0.58, 0.64, 0.72, 0.84, 1.02, 0.94, 1.06, 1.14, 1.18],
    VST:  [0.18, 0.22, 0.20, 0.24, 0.22, 0.26, 0.28, 0.32, 0.45, 0.65, 0.85, 1.05, 1.15, 1.20],
    NEE:  [0.75, 0.82, 0.88, 0.96, 0.92, 0.84, 0.80, 0.86, 0.90, 0.98, 0.92, 0.96, 1.02, 1.05],
    OKLO: [0.30, 0.35, 0.42, 0.55, 0.48, 0.32, 0.40, 0.58, 0.65, 0.85, 0.72, 0.92, 1.12, 1.20]
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
  // ==================== CATEGORY: AI ====================
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
      valuationRisk: 2,
      catalystStrength: 5,
      downsideRisk: 3,
      asymmetricPotential: 4
    },
    asymmetry: {
      upside: 5,
      downside: 3,
      conviction: 5,
      catalyst: 5,
      risk: 3
    },
    rationale: "NVDA holds a virtual monopoly in datacenter AI training hardware. Its CUDA lock-in renders it the ultimate compute anchor.",
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
      buyExpectedCatalyst: "Blackwell deliveries and hyperscaler GPU order additions.",
      decidedAt: "2026-05-15"
    }
  },
  {
    ticker: "MSFT",
    companyName: "Microsoft Corporation",
    sector: "Software",
    region: "US",
    marketCap: 3100,
    theme: "AI",
    reasonForInclusion: "Vanguard of software AI deployment through OpenAI backing, Azure cloud, and Copilot integrations.",
    anchorClassification: "core_anchor",
    scores: {
      marketLeadership: 5,
      growthExposure: 5,
      revenueGrowth: 3,
      profitability: 5,
      balanceSheet: 5,
      valuationRisk: 3,
      catalystStrength: 4,
      downsideRisk: 5,
      asymmetricPotential: 3
    },
    asymmetry: {
      upside: 3,
      downside: 1,
      conviction: 5,
      catalyst: 4,
      risk: 1
    },
    rationale: "MSFT translates raw AI compute into corporate SaaS licensing expansion at scale, backed by enterprise-grade models.",
    stats: {
      currentPrice: 422.00,
      high52w: 430.80,
      low52w: 315.15,
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
      buyReason: "Stable enterprise AI monetization and robust cloud scaling.",
      buyExpectedCatalyst: "Azure SaaS expansion exceeds street forecasts.",
      decidedAt: "2026-05-12"
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
    rationale: "Alphabet's robust Google Cloud TPU ecosystem and foundational DeepMind research allow strong vertical integration.",
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
    ticker: "AMD",
    companyName: "Advanced Micro Devices",
    sector: "Semiconductors",
    region: "US",
    marketCap: 280,
    theme: "AI",
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
    rationale: "AMD represents a secondary alternative to NVDA. Hyperscalers represent a captive buyer base eager to see a viable competitor.",
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
    theme: "AI",
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
    rationale: "Broadcom captures high premium software revenues alongside customized ASIC chips designed for major cloud co-development clients.",
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

  // ==================== CATEGORY: QUANTUM ====================
  {
    ticker: "HON",
    companyName: "Honeywell International Inc.",
    sector: "Industrial Technologies",
    region: "US",
    marketCap: 140,
    theme: "Quantum",
    reasonForInclusion: "Owns Quantinuum, the leading trapped-ion quantum developer with pioneer logical-qubit execution.",
    anchorClassification: "core_anchor",
    scores: {
      marketLeadership: 5,
      growthExposure: 4,
      revenueGrowth: 2,
      profitability: 5,
      balanceSheet: 4,
      valuationRisk: 4,
      catalystStrength: 4,
      downsideRisk: 5,
      asymmetricPotential: 3
    },
    asymmetry: {
      upside: 4,
      downside: 1,
      conviction: 5,
      catalyst: 4,
      risk: 1
    },
    rationale: "HON provides a highly defensive way to access quantum upside, backed by a massive cash-generating aerospace and building controls parent firm.",
    stats: {
      currentPrice: 215.00,
      high52w: 228.00,
      low52w: 175.50,
      movingAverage50: 210.20,
      revenueGrowthRate: 6,
      earningsTrend: "Highly stable enterprise revenues with rising margin structures",
      valuationPE: "22x Forward P/E",
      debtLevel: "Medium",
      leverageRatio: "Debt/Equity 0.85"
    },
    decisionState: "HOLD",
    nextReviewDate: "2026-08-10",
    decisionData: {
      holdReason: "Quantum wing is incredibly promising, but parent industrial cycles represent the main driver today.",
      holdKeyRisk: "Commercial quantum scaling takes longer than estimated.",
      holdTrigger: "Add on general industrial market drawdowns.",
      decidedAt: "2026-05-18"
    }
  },
  {
    ticker: "IBM",
    companyName: "International Business Machines",
    sector: "Software & Technology",
    region: "US",
    marketCap: 170,
    theme: "Quantum",
    reasonForInclusion: "Pioneering leader in superconductive qubit architectures, offering standard cloud access to actual multi-qubit utilities.",
    anchorClassification: "core_anchor",
    scores: {
      marketLeadership: 5,
      growthExposure: 4,
      revenueGrowth: 3,
      profitability: 4,
      balanceSheet: 4,
      valuationRisk: 4,
      catalystStrength: 4,
      downsideRisk: 4,
      asymmetricPotential: 3
    },
    asymmetry: {
      upside: 3,
      downside: 1,
      conviction: 4,
      catalyst: 4,
      risk: 2
    },
    rationale: "IBM is the world's most deployed quantum compiler company. Their hybrid cloud software base backstops extensive research and development channels.",
    stats: {
      currentPrice: 188.00,
      high52w: 199.10,
      low52w: 130.20,
      movingAverage50: 182.40,
      revenueGrowthRate: 8,
      earningsTrend: "Strong software expansion and cash conversion performance",
      valuationPE: "18x Forward P/E",
      debtLevel: "Medium",
      leverageRatio: "Debt/Equity 1.20"
    },
    decisionState: "BUY",
    nextReviewDate: "2026-07-25",
    decisionData: {
      positionSizePercent: 5,
      targetPrice: 220.00,
      stopLoss: 165.00,
      buyReason: "Very reasonable valuation, strong enterprise hybrid cloud, leading quantum hardware network.",
      buyExpectedCatalyst: "System Condor scaling announcement displaying logical quantum superiority.",
      decidedAt: "2026-05-14"
    }
  },
  {
    ticker: "INTC",
    companyName: "Intel Corporation",
    sector: "Semiconductors",
    region: "US",
    marketCap: 135,
    theme: "Quantum",
    reasonForInclusion: "Developing silicon spin qubit chips ('Tunnel Falls') leveraging standard advanced CMOS foundry fabrication lines.",
    anchorClassification: "asymmetric_opportunity",
    scores: {
      marketLeadership: 3,
      growthExposure: 4,
      revenueGrowth: 2,
      profitability: 2,
      balanceSheet: 3,
      valuationRisk: 4,
      catalystStrength: 3,
      downsideRisk: 3,
      asymmetricPotential: 4
    },
    asymmetry: {
      upside: 4,
      downside: 3,
      conviction: 3,
      catalyst: 3,
      risk: 3
    },
    rationale: "Intel's silicon spin qubit leverages existing silicon fab pipelines. Although standard revenue is stagnant, quantum scaling acts as a long-term asymmetric options lever.",
    stats: {
      currentPrice: 32.00,
      high52w: 50.40,
      low52w: 26.20,
      movingAverage50: 34.50,
      revenueGrowthRate: -3,
      earningsTrend: "Losing ground on standard CPU; heavy foundry spending",
      valuationPE: "28x Forward P/E",
      debtLevel: "High",
      leverageRatio: "Debt/Equity 0.45"
    },
    decisionState: "REVIEW",
    nextReviewDate: "2026-06-12"
  },
  {
    ticker: "IONQ",
    companyName: "IonQ, Inc.",
    sector: "Quantum Computing",
    region: "US",
    marketCap: 2.3,
    theme: "Quantum",
    reasonForInclusion: "Pioneering pure-play quantum hardware vendor delivering trapped-ion computer processing units via cloud platforms.",
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
    rationale: "High risk speculative pure play. Trapped-ion modular QPUs can scale to logic qubit correction relatively quickly.",
    stats: {
      currentPrice: 11.20,
      high52w: 20.10,
      low52w: 6.80,
      movingAverage50: 10.80,
      revenueGrowthRate: 88,
      earningsTrend: "GAAP loss of ~$150M oper. loss; supported by $400M cash",
      valuationPE: "P/S 43x",
      debtLevel: "Low",
      leverageRatio: "Debt/Equity 0.05"
    },
    decisionState: "SELL",
    nextReviewDate: "2026-05-30",
    decisionData: {
      sellReason: "Reached target tech resistance. Partially rebalancing to energy (VST).",
      realizedGainPercent: 45,
      sellLesson: "Trim highly volatile speculative positions when momentum peaks.",
      keepOnWatchlist: true,
      decidedAt: "2026-05-19"
    }
  },
  {
    ticker: "RGTI",
    companyName: "Rigetti Computing Inc.",
    sector: "Quantum Computing",
    region: "US",
    marketCap: 0.25,
    theme: "Quantum",
    reasonForInclusion: "Pure-play fabricator of superconductive multi-qubit chips, launching Ankaa-9Q processing units.",
    anchorClassification: "speculative_opportunity",
    scores: {
      marketLeadership: 2,
      growthExposure: 5,
      revenueGrowth: 3,
      profitability: 1,
      balanceSheet: 3,
      valuationRisk: 1,
      catalystStrength: 4,
      downsideRisk: 2,
      asymmetricPotential: 5
    },
    asymmetry: {
      upside: 5,
      downside: 5,
      conviction: 2,
      catalyst: 4,
      risk: 5
    },
    rationale: "Highly speculative microcap computing stock. Rigetti occupies a pure-play niche but faces continuous dilution risk.",
    stats: {
      currentPrice: 1.45,
      high52w: 3.20,
      low52w: 0.75,
      movingAverage50: 1.30,
      revenueGrowthRate: 12,
      earningsTrend: "Substantial cash burn, operating losses narrowing slightly",
      valuationPE: "N/A",
      debtLevel: "Low",
      leverageRatio: "Debt/Equity 0.08"
    },
    decisionState: "WATCHLIST",
    nextReviewDate: "2026-06-20"
  },

  // ==================== CATEGORY: DATA CENTRES ====================
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
    rationale: "Equinix provides critical networking nodes. Steady defensive infrastructure play with reliable rental escalators.",
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
    ticker: "ANET",
    companyName: "Arista Networks, Inc.",
    sector: "Networking Software",
    region: "US",
    marketCap: 92,
    theme: "Data Centres",
    reasonForInclusion: "Leading designer of high-performance switches supporting rapid AI datacenter cluster interconnects.",
    anchorClassification: "core_anchor",
    scores: {
      marketLeadership: 5,
      growthExposure: 5,
      revenueGrowth: 4,
      profitability: 5,
      balanceSheet: 5,
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
    rationale: "Essential hardware builder for multi-node AI training systems. High margin EOS software layer creates strong operational moat.",
    stats: {
      currentPrice: 290.00,
      high52w: 310.50,
      low52w: 162.00,
      movingAverage50: 275.40,
      revenueGrowthRate: 28,
      earningsTrend: "Stellar earnings velocity guided by cloud titian orders",
      valuationPE: "35x Forward P/E",
      debtLevel: "Low",
      leverageRatio: "Debt/Equity 0.02"
    },
    decisionState: "BUY",
    nextReviewDate: "2026-07-15",
    decisionData: {
      positionSizePercent: 6,
      targetPrice: 340.00,
      stopLoss: 250.00,
      buyReason: "Networking is the bottleneck of AI clusters; Infiniband challenger.",
      buyExpectedCatalyst: "Ultra Ethernet Consortium standard adoption spike.",
      decidedAt: "2026-05-16"
    }
  },
  {
    ticker: "DLR",
    companyName: "Digital Realty Trust",
    sector: "Data Centres",
    region: "US",
    marketCap: 45,
    theme: "Data Centres",
    reasonForInclusion: "Global wholesale datacenter REIT with significant power allocations in Virginia and Dallas hubs.",
    anchorClassification: "core_anchor",
    scores: {
      marketLeadership: 4,
      growthExposure: 4,
      revenueGrowth: 2,
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
    rationale: "Wholesale space landlord. Provides immediate physical co-location spaces for hyperscalers experiencing massive capacity constraints.",
    stats: {
      currentPrice: 148.00,
      high52w: 160.20,
      low52w: 110.10,
      movingAverage50: 144.10,
      revenueGrowthRate: 9,
      earningsTrend: "Securing higher lease escalators on high space demand",
      valuationPE: "21x Price/AFFO",
      debtLevel: "High",
      leverageRatio: "Debt/Equity 1.55"
    },
    decisionState: "HOLD",
    nextReviewDate: "2026-06-28",
    decisionData: {
      holdReason: "Strong fundamental occupancy rate, but limited by slow utility power connection arrivals.",
      holdKeyRisk: "Regional electrical grid constraints blocking lease initiations.",
      holdTrigger: "Buy more if local substation permits get approved sooner.",
      decidedAt: "2026-05-15"
    }
  },
  {
    ticker: "ORCL",
    companyName: "Oracle Corporation",
    sector: "Enterprise Software",
    region: "US",
    marketCap: 330,
    theme: "Data Centres",
    reasonForInclusion: "Rapidly expanding OCI (Oracle Cloud Infrastructure) database clusters hosting state-of-the-art AI training lines.",
    anchorClassification: "asymmetric_opportunity",
    scores: {
      marketLeadership: 4,
      growthExposure: 4,
      revenueGrowth: 3,
      profitability: 4,
      balanceSheet: 3,
      valuationRisk: 4,
      catalystStrength: 4,
      downsideRisk: 4,
      asymmetricPotential: 4
    },
    asymmetry: {
      upside: 4,
      downside: 2,
      conviction: 4,
      catalyst: 4,
      risk: 2
    },
    rationale: "Moated databases moving aggressively into hyperscaler cloud hosting, utilizing customized GPU clusters to offer highly specialized sovereign clouds.",
    stats: {
      currentPrice: 122.00,
      high52w: 132.80,
      low52w: 98.50,
      movingAverage50: 118.20,
      revenueGrowthRate: 12,
      earningsTrend: "OCI cloud revenues growing 45%+ y/y, offsetting legacy software flat lines",
      valuationPE: "19x Forward P/E (Cheap Growth)",
      debtLevel: "High",
      leverageRatio: "Debt/Equity 1.90"
    },
    decisionState: "BUY",
    nextReviewDate: "2026-07-10",
    decisionData: {
      positionSizePercent: 5,
      targetPrice: 155.00,
      stopLoss: 105.00,
      buyReason: "Rapid database migrate velocity and key co-hosting deals with Microsoft/Google.",
      buyExpectedCatalyst: "Massive sovereign cloud database contract signoffs across European zones.",
      decidedAt: "2026-05-18"
    }
  },
  {
    ticker: "VRT",
    companyName: "Vertiv Holdings Co",
    sector: "Industrial Hardware",
    region: "US",
    marketCap: 35,
    theme: "Data Centres",
    reasonForInclusion: "Premier provider of global liquid cooling and thermal-management systems crucial for high-load chip density configurations.",
    anchorClassification: "asymmetric_opportunity",
    scores: {
      marketLeadership: 5,
      growthExposure: 5,
      revenueGrowth: 4,
      profitability: 4,
      balanceSheet: 3,
      valuationRisk: 2, // fully valued
      catalystStrength: 5,
      downsideRisk: 3,
      asymmetricPotential: 5
    },
    asymmetry: {
      upside: 5,
      downside: 3,
      conviction: 4,
      catalyst: 5,
      risk: 3
    },
    rationale: "Blackwell chip clusters generate massive thermal grids requiring direct-to-chip liquid cooling. Vertiv dominates wholesale thermal controls contracts.",
    stats: {
      currentPrice: 94.00,
      high52w: 108.00,
      low52w: 32.50,
      movingAverage50: 89.10,
      revenueGrowthRate: 35,
      earningsTrend: "Substantial margin expanding on premium cooling systems pricing power",
      valuationPE: "40x Forward P/E",
      debtLevel: "Medium",
      leverageRatio: "Debt/Equity 1.25"
    },
    decisionState: "BUY",
    nextReviewDate: "2026-06-20",
    decisionData: {
      positionSizePercent: 4,
      targetPrice: 120.00,
      stopLoss: 78.00,
      buyReason: "Thermal liquid cooling is moving from optional to absolute mandatory for >100kW racks.",
      buyExpectedCatalyst: "Backlog backlog expansion announcements highlighting long-lead customer lock.",
      decidedAt: "2026-05-17"
    }
  },

  // ==================== CATEGORY: POWER ====================
  {
    ticker: "CEG",
    companyName: "Constellation Energy",
    sector: "Energy / Utilities",
    region: "US",
    marketCap: 68,
    theme: "Power",
    reasonForInclusion: "The largest US carbon-free company, containing massive nuclear generation capacity located near dense internet nodes.",
    anchorClassification: "core_anchor",
    scores: {
      marketLeadership: 5,
      growthExposure: 5,
      revenueGrowth: 3,
      profitability: 4,
      balanceSheet: 3,
      valuationRisk: 3,
      catalystStrength: 5,
      downsideRisk: 4,
      asymmetricPotential: 4
    },
    asymmetry: {
      upside: 4,
      downside: 1,
      conviction: 5,
      catalyst: 5,
      risk: 2
    },
    rationale: "Unrivaled nuclear fleet capacity. Ideally positioned to sign premium, physical behind-the-meter co-location clean power agreements with hyperscalers.",
    stats: {
      currentPrice: 212.00,
      high52w: 232.00,
      low52w: 110.00,
      movingAverage50: 198.50,
      revenueGrowthRate: 15,
      earningsTrend: "Strong earnings expansions on carbon offsets and long-term utility margins",
      valuationPE: "26x Forward P/E",
      debtLevel: "High",
      leverageRatio: "Debt/Equity 1.65"
    },
    decisionState: "BUY",
    nextReviewDate: "2026-06-30",
    decisionData: {
      positionSizePercent: 5,
      targetPrice: 260.00,
      stopLoss: 180.00,
      buyReason: "Premier zero-emissions baseload source. Absolute physical limitation play.",
      buyExpectedCatalyst: "Signing 20-year corporate behind-the-meter contract with leading public cloud provider.",
      decidedAt: "2026-05-19"
    }
  },
  {
    ticker: "GEV",
    companyName: "GE Vernova Inc.",
    sector: "Industrial Utilities",
    region: "US",
    marketCap: 44,
    theme: "Power",
    reasonForInclusion: "Recently spun-off leader in wind turbines, gas generators, and physical grid electrification networks backing heavy grid additions.",
    anchorClassification: "core_anchor",
    scores: {
      marketLeadership: 5,
      growthExposure: 4,
      revenueGrowth: 3,
      profitability: 3,
      balanceSheet: 4,
      valuationRisk: 4,
      catalystStrength: 4,
      downsideRisk: 4,
      asymmetricPotential: 3
    },
    asymmetry: {
      upside: 3,
      downside: 1,
      conviction: 4,
      catalyst: 4,
      risk: 2
    },
    rationale: "Moated designer of heavy physical machinery. If the electric grid upgrades to support 40GW additions, Vernova grid transformers are mandatory.",
    stats: {
      currentPrice: 162.00,
      high52w: 178.50,
      low52w: 120.40,
      movingAverage50: 155.20,
      revenueGrowthRate: 10,
      earningsTrend: "Turnaround profitable margins on solid equipment backlogs",
      valuationPE: "24x Forward P/E",
      debtLevel: "Low",
      leverageRatio: "Debt/Equity 0.18"
    },
    decisionState: "BUY",
    nextReviewDate: "2026-07-20",
    decisionData: {
      positionSizePercent: 4,
      targetPrice: 195.00,
      stopLoss: 135.00,
      buyReason: "Essential transmission line transformer monpoloy provider; power machinery cycles rising.",
      buyExpectedCatalyst: "Sustained grid integration bottlenecks forcing massive utility upgrade mandates.",
      decidedAt: "2026-05-19"
    }
  },
  {
    ticker: "VST",
    companyName: "Vistra Corp.",
    sector: "Energy / Utilities",
    region: "US",
    marketCap: 38,
    theme: "Power",
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
    rationale: "Power is the defining physical constraint. Vistra's nuclear assets represent reliable clean baseload power valued highly by hyperscalers.",
    stats: {
      currentPrice: 85.00,
      high52w: 92.50,
      low52w: 24.10,
      movingAverage50: 78.40,
      revenueGrowthRate: 16,
      earningsTrend: "Margins expanding on power purchasing agreement premium yields",
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
    ticker: "NEE",
    companyName: "NextEra Energy, Inc.",
    sector: "Energy / Utilities",
    region: "US",
    marketCap: 150,
    theme: "Power",
    reasonForInclusion: "World's largest operator of solar, wind and battery storage networks, backed by a huge regulated utility business (FPL).",
    anchorClassification: "core_anchor",
    scores: {
      marketLeadership: 5,
      growthExposure: 4,
      revenueGrowth: 2,
      profitability: 4,
      balanceSheet: 3,
      valuationRisk: 4,
      catalystStrength: 3,
      downsideRisk: 5,
      asymmetricPotential: 3
    },
    asymmetry: {
      upside: 3,
      downside: 1,
      conviction: 5,
      catalyst: 3,
      risk: 2
    },
    rationale: "Safe, heavily moated hybrid utility. Solves immediate zero-carbon goals through solar/wind additions with localized battery storage.",
    stats: {
      currentPrice: 74.50,
      high52w: 82.10,
      low52w: 49.80,
      movingAverage50: 71.30,
      revenueGrowthRate: 7,
      earningsTrend: "Extremely stable regulated asset base and expanding green contracts",
      valuationPE: "16x Forward P/E (Value Yield)",
      debtLevel: "High",
      leverageRatio: "Debt/Equity 1.80"
    },
    decisionState: "HOLD",
    nextReviewDate: "2026-08-01",
    decisionData: {
      holdReason: "Heavily defensive regulated cash flows but solar additions face localized transmission congestion delays.",
      holdKeyRisk: "Prolonged high interest state lowering capital yields on lease infrastructure.",
      holdTrigger: "Evaluate potential add sizing if stock consolidates 5-10% below average.",
      decidedAt: "2026-05-16"
    }
  },
  {
    ticker: "OKLO",
    companyName: "Oklo Inc.",
    sector: "Advanced Nuclear",
    region: "US",
    marketCap: 1.5,
    theme: "Power",
    reasonForInclusion: "Pioneering developer of fast-fission micro-reactors designed to supply clean 15MWe baseload electricity direct to datacenters.",
    anchorClassification: "speculative_opportunity",
    scores: {
      marketLeadership: 3,
      growthExposure: 5,
      revenueGrowth: 5,
      profitability: 1,
      balanceSheet: 4,
      valuationRisk: 1,
      catalystStrength: 5,
      downsideRisk: 3,
      asymmetricPotential: 5
    },
    asymmetry: {
      upside: 5,
      downside: 4,
      conviction: 2,
      catalyst: 5,
      risk: 4
    },
    rationale: "High risk, pre-commercialization atomic microcap. Oklo represents the ultimate physical call-option on modular microgrid energy deployment.",
    stats: {
      currentPrice: 12.50,
      high52w: 18.80,
      low52w: 5.40,
      movingAverage50: 11.20,
      revenueGrowthRate: 0,
      earningsTrend: "Pre-operational R&D state, backed by solid cash runway",
      valuationPE: "N/A",
      debtLevel: "Low",
      leverageRatio: "Debt/Equity 0.02"
    },
    decisionState: "WATCHLIST",
    nextReviewDate: "2026-06-15"
  }
];

// Populate and stitch sample price history array for all 20 stocks.
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
      { ticker: "CEG", impact: "Positive", analysis: "Nuclear fleet leader excellently positioned to lock premium datacenter co-locations." }
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
      { ticker: "GOOGL", impact: "Positive", analysis: "DeepMind quantum optimization teams gain massive computing simulation potential." },
      { ticker: "IBM", impact: "Positive", analysis: "Validates superconducting quantum interconnect architectures as error-correction accelerates." }
    ]
  }
];

// ── Coupled Pairs: 10 economically-linked cross-sector pairs ──────────────────
// Logic: normalize both stocks to index=100, compute shared trajectory (average).
// If one stock rises ABOVE trajectory → SELL that stock (overvalued vs pair).
// If one stock falls BELOW trajectory → BUY that stock (undervalued vs pair).
export const COUPLED_PAIRS: CoupledPair[] = [
  {
    id: "nvda-ceg",
    tickerA: "NVDA",
    tickerB: "CEG",
    relationship: "NVIDIA's AI GPUs require enormous electricity. Constellation Energy (nuclear) supplies clean, reliable power to AI data centers under long-term Power Purchase Agreements. NVDA demand growth directly expands CEG's contracted revenue.",
    divergenceThreshold: 15
  },
  {
    id: "msft-anet",
    tickerA: "MSFT",
    tickerB: "ANET",
    relationship: "Arista Networks supplies the high-speed switching fabric inside Microsoft's Azure data centers. Every new Azure region Microsoft opens generates direct ANET hardware procurement. Their expansion cycles are tightly coupled.",
    divergenceThreshold: 15
  },
  {
    id: "avgo-vrt",
    tickerA: "AVGO",
    tickerB: "VRT",
    relationship: "Broadcom's AI networking ASICs (XPU/TPU custom silicon) pack enormous heat density into data centers. Vertiv supplies the thermal management and power distribution infrastructure those racks require. AVGO density growth scales VRT revenue.",
    divergenceThreshold: 15
  },
  {
    id: "googl-dlr",
    tickerA: "GOOGL",
    tickerB: "DLR",
    relationship: "Digital Realty provides the physical colocation space that Google leases for its global GCP infrastructure. Google's AI hyperscaler investments directly increase DLR's long-term lease occupancy and data center build pipeline.",
    divergenceThreshold: 15
  },
  {
    id: "amd-eqix",
    tickerA: "AMD",
    tickerB: "EQIX",
    relationship: "AMD EPYC CPUs and Instinct MI GPU clusters are deployed inside Equinix colocation data centers by hyperscalers and enterprise AI customers. AMD's data center win rate expands Equinix's compute density and interconnection revenue.",
    divergenceThreshold: 15
  },
  {
    id: "ionq-ibm",
    tickerA: "IONQ",
    tickerB: "IBM",
    relationship: "IonQ (trapped-ion) and IBM (superconducting) are the two leading quantum computing platforms. Their market sentiment tracks the same enterprise quantum adoption curve. When one is priced for hype and the other lags, a relative opportunity opens.",
    divergenceThreshold: 15
  },
  {
    id: "intc-hon",
    tickerA: "INTC",
    tickerB: "HON",
    relationship: "Intel and Honeywell co-develop hybrid quantum-classical architectures. Intel supplies the classical processing substrate; Honeywell's trapped-ion systems run quantum layers on top. Both benefit from enterprise quantum R&D budgets.",
    divergenceThreshold: 15
  },
  {
    id: "orcl-gev",
    tickerA: "ORCL",
    tickerB: "GEV",
    relationship: "Oracle's aggressive AI cloud expansion (10+ new data center regions) requires gigawatts of reliable power generation. GE Vernova builds the gas turbines and grid infrastructure feeding those Oracle campus expansions.",
    divergenceThreshold: 15
  },
  {
    id: "rgti-vst",
    tickerA: "RGTI",
    tickerB: "VST",
    relationship: "Rigetti's quantum data centers are concentrated in power-intensive Texas and California corridors. Vistra Energy dominates Texas power generation and benefits from the same AI + quantum compute electricity demand wave.",
    divergenceThreshold: 15
  },
  {
    id: "oklo-nee",
    tickerA: "OKLO",
    tickerB: "NEE",
    relationship: "Oklo's micro nuclear reactors represent next-generation on-site power for data centers. NextEra dominates today's clean energy infrastructure. Both benefit from AI data center power demand—different time horizons, same macro tailwind.",
    divergenceThreshold: 15
  }
];
