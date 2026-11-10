'use client';

import React, { useState, useMemo } from 'react';
import type { ScandalRecord, PrRedFlag, CommunityTip, StockPoint } from '@/lib/db';

interface Props {
  initialScandals: ScandalRecord[];
  initialRedFlags: PrRedFlag[];
  initialTips: CommunityTip[];
}

type TabId = 'INDEX' | 'ALPHA' | 'INSIGHTS' | 'SUBMIT';
type QuickFilter = 'ALL' | 'BILLIONAIRES' | 'CLAWBACKS' | 'RECENT' | 'VIRAL';

export default function TerminalDashboard({
  initialScandals,
  initialRedFlags,
  initialTips,
}: Props) {
  const [scandals] = useState<ScandalRecord[]>(initialScandals);
  const [redFlags] = useState<PrRedFlag[]>(initialRedFlags);
  const [tips, setTips] = useState<CommunityTip[]>(initialTips);

  // Focused 4-tab navigation (defaults to clean Index + Dossier view)
  const [activeTab, setActiveTab] = useState<TabId>('INDEX');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected scandal for the right-hand Dossier
  const [selectedScandalId, setSelectedScandalId] = useState<number>(
    initialScandals[0]?.id ?? 1
  );

  // Modal receipt state
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);
  const [copiedReceipt, setCopiedReceipt] = useState<boolean>(false);

  // ETF Simulator state
  const [etfCapital, setEtfCapital] = useState<number>(10000);
  const [etfStrategy, setEtfStrategy] = useState<'SHORT_CHEATERS' | 'LONG_CHEATERS'>(
    'SHORT_CHEATERS'
  );

  // Community Tip Form state
  const [tipForm, setTipForm] = useState({
    company_name: '',
    ticker: '',
    executive_name: '',
    role: 'CEO',
    incident_date: '2026-11-09',
    evidence_tier: 'CONFIRMED_OFFICIAL',
    source_url: '',
    notes: '',
  });
  const [submittingTip, setSubmittingTip] = useState(false);
  const [tipSuccessMsg, setTipSuccessMsg] = useState<string | null>(null);

  const selectedScandal = useMemo(
    () => scandals.find((s) => s.id === selectedScandalId) || scandals[0],
    [scandals, selectedScandalId]
  );

  // Format financial impact cleanly (Clawback vs Divorce Settlement)
  const formatFinancialCost = (s: ScandalRecord) => {
    if (s.parachute_or_clawback_millions < 0) {
      return {
        label: `-$${Math.abs(s.parachute_or_clawback_millions)}M Clawback`,
        short: `-$${Math.abs(s.parachute_or_clawback_millions)}M`,
        type: 'clawback' as const,
      };
    }
    if (s.divorce_or_settlement_millions >= 1000) {
      return {
        label: `$${(s.divorce_or_settlement_millions / 1000).toFixed(1)}B Divorce Split`,
        short: `$${(s.divorce_or_settlement_millions / 1000).toFixed(1)}B Div`,
        type: 'divorce' as const,
      };
    }
    if (s.divorce_or_settlement_millions > 0) {
      return {
        label: `$${s.divorce_or_settlement_millions}M Settlement`,
        short: `$${s.divorce_or_settlement_millions}M`,
        type: 'settlement' as const,
      };
    }
    return {
      label: 'Forfeited Bonus / Exit',
      short: 'Ousted',
      type: 'none' as const,
    };
  };

  // Filtered list based on 1-click pills + search bar
  const filteredScandals = useMemo(() => {
    return scandals.filter((s) => {
      if (quickFilter === 'BILLIONAIRES' && s.divorce_or_settlement_millions < 500) {
        return false;
      }
      if (quickFilter === 'CLAWBACKS' && s.parachute_or_clawback_millions >= 0) {
        return false;
      }
      if (quickFilter === 'RECENT' && s.year < 2023) {
        return false;
      }
      if (
        quickFilter === 'VIRAL' &&
        !['ASTR-PVT', 'TRY-PVT', 'AMZN', 'MSFT', 'MCD', 'TKO'].includes(s.ticker)
      ) {
        return false;
      }
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        return (
          s.company_name.toLowerCase().includes(q) ||
          s.ticker.toLowerCase().includes(q) ||
          s.executive_name.toLowerCase().includes(q) ||
          s.sector.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [scandals, quickFilter, searchQuery]);

  // Core summary stats (kept to 4 high-impact numbers)
  const summaryStats = useMemo(() => {
    const totalClawbacks = scandals.reduce(
      (acc, s) => acc + Math.abs(Math.min(0, s.parachute_or_clawback_millions)),
      0
    );
    const totalDivorceBillions =
      scandals.reduce((acc, s) => acc + s.divorce_or_settlement_millions, 0) / 1000;
    const subordinatePct = Math.round(
      (scandals.filter((s) => s.involved_subordinate === 1).length /
        (scandals.length || 1)) *
        100
    );
    const oustedPct = Math.round(
      (scandals.filter((s) => !s.consequence.includes('Kept Job')).length /
        (scandals.length || 1)) *
        100
    );
    return {
      totalCases: scandals.length,
      totalClawbacks: Math.round(totalClawbacks),
      totalDivorceBillions: totalDivorceBillions.toFixed(1),
      subordinatePct,
      oustedPct,
    };
  }, [scandals]);

  // Parse selected scandal's T-30 to T+90 stock series
  const stockSeries: StockPoint[] = useMemo(() => {
    if (!selectedScandal) return [];
    try {
      return JSON.parse(selectedScandal.stock_series_json);
    } catch {
      return [];
    }
  }, [selectedScandal]);

  // Sector aggregation for Insights tab
  const sectorStats = useMemo(() => {
    const map = new Map<string, { count: number; totalScore: number; totalT90: number }>();
    for (const s of scandals) {
      const curr = map.get(s.sector) || { count: 0, totalScore: 0, totalT90: 0 };
      curr.count += 1;
      curr.totalScore += s.unfaithfulness_score;
      curr.totalT90 += s.stock_impact_t90_after;
      map.set(s.sector, curr);
    }
    return Array.from(map.entries())
      .map(([sector, d]) => ({
        sector,
        count: d.count,
        avgScore: Math.round(d.totalScore / d.count),
        avgT90: +(d.totalT90 / d.count).toFixed(1),
      }))
      .sort((a, b) => b.count - a.count);
  }, [scandals]);

  // Caught method aggregation for Insights tab
  const caughtBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of scandals) {
      map.set(s.caught_method, (map.get(s.caught_method) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([method, count]) => ({
        method,
        count,
        pct: Math.round((count / (scandals.length || 1)) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [scandals]);

  // ETF Simulator 2021-2026
  const etfSimulationSeries = useMemo(() => {
    const years = [
      { year: '2021', spyMult: 1.0, shortAlphaMult: 1.0, longCheatersMult: 1.0 },
      { year: '2022', spyMult: 0.82, shortAlphaMult: 1.19, longCheatersMult: 0.74 },
      { year: '2023', spyMult: 1.02, shortAlphaMult: 1.44, longCheatersMult: 0.83 },
      { year: '2024', spyMult: 1.26, shortAlphaMult: 1.72, longCheatersMult: 0.91 },
      { year: '2025', spyMult: 1.43, shortAlphaMult: 2.08, longCheatersMult: 0.86 },
      { year: '2026', spyMult: 1.58, shortAlphaMult: 2.34, longCheatersMult: 0.89 },
    ];
    return years.map((y) => ({
      year: y.year,
      spy: Math.round(etfCapital * y.spyMult),
      strategy: Math.round(
        etfCapital *
          (etfStrategy === 'SHORT_CHEATERS' ? y.shortAlphaMult : y.longCheatersMult)
      ),
    }));
  }, [etfCapital, etfStrategy]);

  const handleCopyReceipt = () => {
    if (!selectedScandal) return;
    const cost = formatFinancialCost(selectedScandal);
    const receiptText = [
      '========================================',
      '   CHTR // EXECUTIVE FALLOUT RECEIPT',
      '========================================',
      `COMPANY:    ${selectedScandal.company_name} (${selectedScandal.ticker})`,
      `EXECUTIVE:  ${selectedScandal.executive_name} (${selectedScandal.role})`,
      `DATE:       ${selectedScandal.incident_date}`,
      `SCORE:      ${selectedScandal.unfaithfulness_score}/100`,
      `CAUGHT BY:  ${selectedScandal.caught_method}`,
      `OUTCOME:    ${selectedScandal.consequence}`,
      `COST:       ${cost.label}`,
      `90D STOCK:  ${selectedScandal.stock_impact_t90_after >= 0 ? '+' : ''}${selectedScandal.stock_impact_t90_after}%`,
      '----------------------------------------',
      `REALITY: "${selectedScandal.plain_english_translation}"`,
      '========================================',
    ].join('\n');
    navigator.clipboard.writeText(receiptText);
    setCopiedReceipt(true);
    setTimeout(() => setCopiedReceipt(false), 2000);
  };

  const handleTipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tipForm.company_name || !tipForm.executive_name || !tipForm.source_url) return;
    setSubmittingTip(true);
    setTipSuccessMsg(null);
    try {
      const res = await fetch('/api/scandals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tipForm),
      });
      const data = await res.json();
      if (data.success && data.tips) {
        setTips(data.tips);
        setTipSuccessMsg(`Saved to SQLite (#${data.created.id})`);
        setTipForm({
          company_name: '',
          ticker: '',
          executive_name: '',
          role: 'CEO',
          incident_date: '2026-11-09',
          evidence_tier: 'CONFIRMED_OFFICIAL',
          source_url: '',
          notes: '',
        });
      }
    } finally {
      setSubmittingTip(false);
    }
  };

  // Spotlight shortcuts for 1-click exploration
  const spotlights = [
    { label: 'Bill Gates ($76B Divorce)', ticker: 'MSFT', exec: 'Bill Gates' },
    { label: 'Jeff Bezos ($38.3B Split)', ticker: 'AMZN', exec: 'Jeff Bezos' },
    { label: 'Coldplay Kiss Cam CEO', ticker: 'ASTR-PVT', exec: 'Andy Byron' },
    { label: 'McDonald’s (-$105M Clawback)', ticker: 'MCD', exec: 'Steve Easterbrook' },
    { label: 'Kohl’s CEO (Fired in 100d)', ticker: 'KSS', exec: 'Ashley Buchanan' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#09090b] text-zinc-100">
      {/* SUBTLE TOP TICKER */}
      <div className="bg-[#050506] border-b border-zinc-800 py-1.5 overflow-hidden select-none">
        <div className="animate-ticker flex items-center space-x-6 text-xs font-mono-num">
          {[...scandals, ...scandals].map((item, idx) => (
            <button
              key={`${item.id}-${idx}`}
              onClick={() => {
                setSelectedScandalId(item.id);
                setActiveTab('INDEX');
              }}
              className="flex items-center space-x-2 hover:bg-zinc-900 px-2 py-0.5 transition cursor-pointer"
            >
              <span className="font-bold text-yellow-400">{item.ticker}</span>
              <span className="text-zinc-300">{item.executive_name}</span>
              <span
                className={
                  item.stock_impact_t90_after >= 0
                    ? 'text-green-400'
                    : 'text-red-400'
                }
              >
                {item.stock_impact_t90_after >= 0 ? '+' : ''}
                {item.stock_impact_t90_after}%
              </span>
              <span className="text-zinc-700">/</span>
            </button>
          ))}
        </div>
      </div>

      {/* CLEAN HEADER & 4-TAB NAVIGATION */}
      <header className="bg-[#111113] border-b border-zinc-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 bg-yellow-400 text-black font-bold font-mono-num">
                CHTR INDEX
              </span>
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Corporate Infidelity Terminal
              </h1>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Tracking C-Suite affairs, billionaire divorces, executive clawbacks &amp; 90-day stock impact
            </p>
          </div>

          {/* 4 CLEAN NAVIGATION TABS */}
          <nav className="flex items-center bg-[#09090b] border border-zinc-800 text-xs sm:text-sm">
            {(
              [
                { id: 'INDEX', label: '01 / Leaderboard & Dossier' },
                { id: 'ALPHA', label: '02 / ETF Simulator & Alpha' },
                { id: 'INSIGHTS', label: '03 / Stats & PR Decoder' },
                { id: 'SUBMIT', label: `04 / Submit Tip (${tips.length})` },
              ] as const
            ).map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-2 font-mono-num text-xs transition cursor-pointer border-r last:border-r-0 border-zinc-800 ${
                    active
                      ? 'bg-yellow-400 text-black font-bold'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* MAIN WORKSPACE */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex-1 space-y-6">
        {/* =========================================================
            TAB 1: LEADERBOARD & EXECUTIVE DOSSIER (DEFAULT VIEW)
           ========================================================= */}
        {activeTab === 'INDEX' && (
          <>
            {/* 4 CLEAN SUMMARY METRICS */}
            <div className="bg-[#111113] border border-zinc-800 grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-zinc-800">
              <div className="p-4">
                <div className="text-xs text-zinc-400 uppercase font-mono-num">
                  Indexed Scandals
                </div>
                <div className="text-2xl font-bold text-white mt-1 font-mono-num">
                  {summaryStats.totalCases} Cases
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  Fortune 500, Big Tech &amp; Unicorns
                </div>
              </div>

              <div className="p-4">
                <div className="text-xs text-zinc-400 uppercase font-mono-num">
                  Divorce &amp; Settlement Equity
                </div>
                <div className="text-2xl font-bold text-yellow-400 mt-1 font-mono-num">
                  ${summaryStats.totalDivorceBillions}B+
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  Led by Gates ($76B) &amp; Bezos ($38.3B)
                </div>
              </div>

              <div className="p-4">
                <div className="text-xs text-zinc-400 uppercase font-mono-num">
                  Severance Clawed Back
                </div>
                <div className="text-2xl font-bold text-red-400 mt-1 font-mono-num">
                  -${summaryStats.totalClawbacks}M
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  Forfeited pay &amp; equity awards
                </div>
              </div>

              <div className="p-4">
                <div className="text-xs text-zinc-400 uppercase font-mono-num">
                  Involved a Subordinate
                </div>
                <div className="text-2xl font-bold text-white mt-1 font-mono-num">
                  {summaryStats.subordinatePct}%
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  {summaryStats.oustedPct}% resulted in CEO/Exec exit
                </div>
              </div>
            </div>

            {/* FAMOUS CASE SPOTLIGHT PILLS */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono-num uppercase tracking-wider text-zinc-400 mr-1">
                Famous Cases:
              </span>
              {spotlights.map((sp) => {
                const match = scandals.find(
                  (s) => s.ticker === sp.ticker && s.executive_name.includes(sp.exec.split(' ')[1])
                );
                if (!match) return null;
                const isSelected = selectedScandal?.id === match.id;
                return (
                  <button
                    key={sp.label}
                    onClick={() => setSelectedScandalId(match.id)}
                    className={`text-xs px-3 py-1.5 border transition cursor-pointer font-mono-num ${
                      isSelected
                        ? 'bg-zinc-100 border-zinc-100 text-black font-bold'
                        : 'bg-[#111113] border-zinc-800 text-zinc-300 hover:border-zinc-600'
                    }`}
                  >
                    {sp.label}
                  </button>
                );
              })}
            </div>

            {/* MAIN SPLIT VIEW: LEFT LEADERBOARD (7 COLS) + RIGHT DOSSIER (5 COLS) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* LEFT: CLEAN, SCANNABLE LEADERBOARD */}
              <div className="lg:col-span-7 bg-[#111113] border border-zinc-800">
                {/* SEARCH & QUICK FILTER BAR */}
                <div className="p-4 border-b border-zinc-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search company, ticker, or executive (e.g. Amazon, Bezos, Gates, MCD)..."
                        className="w-full bg-[#09090b] border border-zinc-800 focus:border-yellow-400 px-3 pr-14 py-2 text-sm text-white placeholder-zinc-500 outline-none"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono-num text-zinc-400 hover:text-white cursor-pointer"
                        >
                          CLEAR
                        </button>
                      )}
                    </div>
                  </div>

                  {/* FILTER PILLS */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {(
                        [
                          { id: 'ALL', label: `All (${scandals.length})` },
                          { id: 'BILLIONAIRES', label: 'Billionaire Divorces' },
                          { id: 'CLAWBACKS', label: 'Pay Clawbacks' },
                          { id: 'RECENT', label: 'Recent (2023–2026)' },
                          { id: 'VIRAL', label: 'Most Viral' },
                        ] as const
                      ).map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setQuickFilter(f.id)}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                            quickFilter === f.id
                              ? 'bg-amber-500 text-black font-semibold'
                              : 'bg-[#070a0f] text-slate-400 hover:text-white border border-slate-800'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                    <span className="text-xs text-slate-400 font-mono-num">
                      {filteredScandals.length} results
                    </span>
                  </div>
                </div>

                {/* STREAMLINED 5-COLUMN LIST */}
                <div className="divide-y divide-slate-800/70 max-h-[640px] overflow-y-auto">
                  {filteredScandals.map((s) => {
                    const isSelected = s.id === selectedScandal?.id;
                    const cost = formatFinancialCost(s);
                    return (
                      <div
                        key={s.id}
                        onClick={() => setSelectedScandalId(s.id)}
                        className={`p-3.5 sm:px-4 flex items-center justify-between gap-3 cursor-pointer transition ${
                          isSelected
                            ? 'bg-amber-500/10 border-l-4 border-l-amber-400'
                            : 'hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono-num text-xs font-bold px-1.5 py-0.5 rounded bg-slate-800 text-amber-400">
                              {s.ticker}
                            </span>
                            <span className="font-semibold text-sm text-white truncate">
                              {s.executive_name}
                            </span>
                            <span className="text-xs text-slate-400 hidden sm:inline">
                              • {s.company_name}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-400">
                            <span>{s.role}</span>
                            <span>•</span>
                            <span>{s.year}</span>
                            <span>•</span>
                            <span className="text-slate-300">{s.caught_method}</span>
                          </div>
                        </div>

                        {/* RIGHT METRICS: FINANCIAL COST, 90D STOCK, SCORE */}
                        <div className="flex items-center gap-3 sm:gap-4 shrink-0 text-right font-mono-num">
                          <div className="hidden sm:block">
                            <div className="text-xs font-semibold text-amber-300">
                              {cost.short}
                            </div>
                            <div
                              className={`text-[11px] ${
                                s.stock_impact_t90_after >= 0
                                  ? 'text-emerald-400'
                                  : 'text-rose-400'
                              }`}
                            >
                              90D: {s.stock_impact_t90_after >= 0 ? '+' : ''}
                              {s.stock_impact_t90_after}%
                            </div>
                          </div>

                          <div
                            className={`w-11 h-11 rounded-lg flex flex-col items-center justify-center border ${
                              s.unfaithfulness_score >= 92
                                ? 'bg-rose-950/60 border-rose-700/70 text-rose-300'
                                : 'bg-amber-950/60 border-amber-700/70 text-amber-300'
                            }`}
                          >
                            <span className="text-sm font-bold leading-none">
                              {s.unfaithfulness_score}
                            </span>
                            <span className="text-[9px] opacity-75 mt-0.5">IDX</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* RIGHT: STICKY EXECUTIVE DOSSIER (FOCUSED & READABLE) */}
              {selectedScandal && (
                <div className="lg:col-span-5 bg-[#0d121b] border border-slate-800 rounded-xl p-5 lg:sticky lg:top-20 space-y-4">
                  {/* DOSSIER HEADER */}
                  <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-amber-500 text-black font-bold text-xs rounded font-mono-num">
                          {selectedScandal.ticker}
                        </span>
                        <span className="text-xs text-slate-400">
                          {selectedScandal.company_name} • {selectedScandal.incident_date}
                        </span>
                      </div>
                      <h2 className="text-lg font-bold text-white mt-1.5">
                        {selectedScandal.executive_name}
                      </h2>
                      <p className="text-xs text-slate-400">
                        {selectedScandal.role} • Tenure: {selectedScandal.tenure_years} yrs (Age{' '}
                        {selectedScandal.exec_age})
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-[11px] text-slate-400">Infidelity Score</div>
                      <div className="text-2xl font-black text-rose-400 font-mono-num">
                        {selectedScandal.unfaithfulness_score}
                        <span className="text-xs text-slate-500 font-normal">/100</span>
                      </div>
                    </div>
                  </div>

                  {/* THE REALITY (PLAIN ENGLISH HIGHLIGHT) */}
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 mb-1">
                      What Actually Happened
                    </div>
                    <p className="text-sm text-slate-100 leading-relaxed">
                      {selectedScandal.plain_english_translation}
                    </p>
                  </div>

                  {/* 3 KEY FALLOUT PILLS */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="bg-[#070a0f] border border-slate-800 rounded-lg p-2.5">
                      <div className="text-[10px] uppercase text-slate-400">How Caught</div>
                      <div className="text-xs font-semibold text-white mt-1">
                        {selectedScandal.caught_method}
                      </div>
                    </div>
                    <div className="bg-[#070a0f] border border-slate-800 rounded-lg p-2.5">
                      <div className="text-[10px] uppercase text-slate-400">Fallout</div>
                      <div className="text-xs font-semibold text-white mt-1">
                        {selectedScandal.consequence.split(' (')[0]}
                      </div>
                    </div>
                    <div className="bg-[#070a0f] border border-slate-800 rounded-lg p-2.5">
                      <div className="text-[10px] uppercase text-slate-400">Financial Hit</div>
                      <div className="text-xs font-semibold text-amber-400 mt-1 font-mono-num">
                        {formatFinancialCost(selectedScandal).label}
                      </div>
                    </div>
                  </div>

                  {/* CLEAN STOCK IMPACT CHART (T-30 TO T+90) */}
                  <div className="bg-[#070a0f] border border-slate-800 rounded-lg p-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-200">
                        Stock Impact (30d Before → 90d After)
                      </span>
                      <span
                        className={`text-xs font-bold font-mono-num ${
                          selectedScandal.stock_impact_t90_after >= 0
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        90D: {selectedScandal.stock_impact_t90_after >= 0 ? '+' : ''}
                        {selectedScandal.stock_impact_t90_after}%
                      </span>
                    </div>

                    {stockSeries.length > 0 && (
                      <div className="w-full h-36">
                        {(() => {
                          const allVals = stockSeries.flatMap((p) => [p.stock, p.spy]);
                          const minVal = Math.min(...allVals) - 3;
                          const maxVal = Math.max(...allVals) + 3;
                          const width = 460;
                          const height = 130;
                          const padX = 24;
                          const padY = 14;

                          const toX = (i: number) =>
                            padX + (i / (stockSeries.length - 1)) * (width - padX * 2);
                          const toY = (v: number) =>
                            height -
                            padY -
                            ((v - minVal) / (maxVal - minVal || 1)) * (height - padY * 2);

                          const stockPath = stockSeries
                            .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(pt.stock)}`)
                            .join(' ');
                          const spyPath = stockSeries
                            .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(pt.spy)}`)
                            .join(' ');

                          const t0Index = stockSeries.findIndex((p) => p.day === 'T=0');
                          const t0X = t0Index >= 0 ? toX(t0Index) : toX(4);

                          return (
                            <svg
                              viewBox={`0 0 ${width} ${height}`}
                              className="w-full h-full overflow-visible"
                            >
                              <line
                                x1={padX}
                                y1={toY(100)}
                                x2={width - padX}
                                y2={toY(100)}
                                stroke="#1e293b"
                                strokeDasharray="3 3"
                              />
                              <line
                                x1={t0X}
                                y1={4}
                                x2={t0X}
                                y2={height - padY}
                                stroke="#f43f5e"
                                strokeDasharray="3 3"
                                strokeWidth="1.5"
                              />
                              <text
                                x={t0X + 4}
                                y={12}
                                fill="#fb7185"
                                fontSize="9"
                                fontWeight="bold"
                              >
                                SCANDAL BREAKS
                              </text>
                              <path
                                d={spyPath}
                                fill="none"
                                stroke="#38bdf8"
                                strokeWidth="1.5"
                                strokeOpacity="0.6"
                              />
                              <path
                                d={stockPath}
                                fill="none"
                                stroke="#f59e0b"
                                strokeWidth="2.5"
                              />
                              {stockSeries.map((pt, idx) => (
                                <g key={pt.day}>
                                  <circle
                                    cx={toX(idx)}
                                    cy={toY(pt.stock)}
                                    r="2.5"
                                    fill="#f59e0b"
                                  />
                                  {(idx === 0 || idx === 4 || idx === stockSeries.length - 1) && (
                                    <text
                                      x={toX(idx)}
                                      y={height - 1}
                                      fill="#94a3b8"
                                      fontSize="9"
                                      textAnchor="middle"
                                    >
                                      {pt.day}
                                    </text>
                                  )}
                                </g>
                              ))}
                            </svg>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* OFFICIAL PR STATEMENT & RECEIPT BUTTON */}
                  <div className="text-xs text-slate-400 bg-[#070a0f] border border-slate-800/80 rounded-lg p-3">
                    <span className="font-semibold text-slate-300">Official PR Spin: </span>
                    <span className="italic">&ldquo;{selectedScandal.pr_euphemism}&rdquo;</span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-zinc-400 font-mono-num">
                      SOURCE: {selectedScandal.source_label}
                    </span>

                    <button
                      onClick={() => setShowReceiptModal(true)}
                      className="px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-xs font-mono-num transition cursor-pointer"
                    >
                      PRINT RECEIPT
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* =========================================================
            TAB 2: ETF SIMULATOR & FINANCIAL ALPHA
           ========================================================= */}
        {activeTab === 'ALPHA' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* ETF SIMULATOR */}
            <div className="lg:col-span-7 bg-[#0d121b] border border-slate-800 rounded-xl p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-white">
                    &ldquo;Short the Cheaters&rdquo; ETF Simulator ($CHTR vs. S&amp;P 500)
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    How an initial investment performs avoiding/shorting companies with C-suite governance scandals
                  </p>
                </div>

                <div className="flex items-center gap-1.5 bg-[#070a0f] p-1 rounded-lg border border-slate-800 text-xs">
                  <button
                    onClick={() => setEtfStrategy('SHORT_CHEATERS')}
                    className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer ${
                      etfStrategy === 'SHORT_CHEATERS'
                        ? 'bg-emerald-500 text-black'
                        : 'text-slate-400'
                    }`}
                  >
                    Short Cheaters
                  </button>
                  <button
                    onClick={() => setEtfStrategy('LONG_CHEATERS')}
                    className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer ${
                      etfStrategy === 'LONG_CHEATERS'
                        ? 'bg-rose-500 text-black'
                        : 'text-slate-400'
                    }`}
                  >
                    Hold Cheaters
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#070a0f] border border-slate-800 p-4 rounded-xl">
                  <div className="text-xs text-slate-400">Starting Investment</div>
                  <div className="text-xl font-bold text-amber-400 font-mono-num mt-1">
                    ${etfCapital.toLocaleString()}
                  </div>
                  <input
                    type="range"
                    min={1000}
                    max={100000}
                    step={1000}
                    value={etfCapital}
                    onChange={(e) => setEtfCapital(Number(e.target.value))}
                    className="w-full accent-amber-500 mt-2 cursor-pointer"
                  />
                </div>

                <div className="bg-[#070a0f] border border-slate-800 p-4 rounded-xl">
                  <div className="text-xs text-slate-400">Strategy Value (2026)</div>
                  <div
                    className={`text-xl font-bold font-mono-num mt-1 ${
                      etfStrategy === 'SHORT_CHEATERS' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    ${etfSimulationSeries[etfSimulationSeries.length - 1].strategy.toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {etfStrategy === 'SHORT_CHEATERS' ? '+134% Return' : '-11% Return'}
                  </div>
                </div>

                <div className="bg-[#070a0f] border border-slate-800 p-4 rounded-xl">
                  <div className="text-xs text-slate-400">S&amp;P 500 Benchmark</div>
                  <div className="text-xl font-bold text-sky-400 font-mono-num mt-1">
                    ${etfSimulationSeries[etfSimulationSeries.length - 1].spy.toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">+58% Return</div>
                </div>
              </div>

              <div className="grid grid-cols-6 gap-3 pt-2">
                {etfSimulationSeries.map((row) => {
                  const maxVal = etfCapital * 2.5;
                  const stratH = Math.max(14, Math.round((row.strategy / maxVal) * 130));
                  const spyH = Math.max(14, Math.round((row.spy / maxVal) * 130));
                  return (
                    <div
                      key={row.year}
                      className="bg-[#070a0f] border border-slate-800/80 rounded-xl p-3 flex flex-col items-center"
                    >
                      <div className="h-32 flex items-end gap-2 w-full justify-center">
                        <div
                          style={{ height: `${stratH}px` }}
                          className={`w-4 rounded-t ${
                            etfStrategy === 'SHORT_CHEATERS'
                              ? 'bg-emerald-500'
                              : 'bg-rose-500'
                          }`}
                        />
                        <div
                          style={{ height: `${spyH}px` }}
                          className="w-4 bg-sky-500/80 rounded-t"
                        />
                      </div>
                      <div className="text-xs font-bold text-white mt-2">{row.year}</div>
                      <div className="text-[11px] text-slate-400 font-mono-num">
                        ${Math.round(row.strategy / 1000)}k
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* BIGGEST DIVORCE & CLAWBACK RANKING */}
            <div className="lg:col-span-5 bg-[#0d121b] border border-slate-800 rounded-xl p-6 space-y-4">
              <div>
                <h2 className="text-base font-bold text-white">
                  Largest Financial Fallouts in Corporate History
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Billionaire divorce stock transfers &amp; board-enforced executive clawbacks
                </p>
              </div>

              <div className="space-y-2.5">
                {[
                  {
                    title: 'Bill Gates • Microsoft (MSFT)',
                    sub: 'Board probe into engineer affair & 2021 divorce split',
                    val: '$76.0B Divorce',
                  },
                  {
                    title: 'Jeff Bezos • Amazon (AMZN)',
                    sub: '4% of Amazon stock transferred following 2019 affair leak',
                    val: '$38.3B Divorce',
                  },
                  {
                    title: 'Sergey Brin & Drummond • Google (GOOGL)',
                    sub: 'Divorce split + $310M shareholder lawsuit over executive affairs',
                    val: '$8.8B Total',
                  },
                  {
                    title: 'Steve Easterbrook • McDonald’s (MCD)',
                    sub: 'Severance clawed back after forensic email probe + SEC fine',
                    val: '-$105.0M Clawback',
                  },
                  {
                    title: 'Brian Krzanich • Intel (INTC)',
                    sub: 'Ousted for subordinate affair; forfeited unvested equity',
                    val: '-$45.3M Forfeited',
                  },
                  {
                    title: 'Bernard Looney • BP (BP)',
                    sub: 'Dismissed for misleading board over colleague relationships',
                    val: '-$40.6M Forfeited',
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="bg-[#070a0f] border border-slate-800 rounded-lg p-3 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-sm font-semibold text-white">{item.title}</div>
                      <div className="text-xs text-slate-400">{item.sub}</div>
                    </div>
                    <div className="text-xs font-bold text-amber-400 font-mono-num shrink-0">
                      {item.val}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            TAB 3: STATS & CORPORATE PR DECODER
           ========================================================= */}
        {activeTab === 'INSIGHTS' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* HOW THEY GOT CAUGHT + SECTOR BREAKDOWN */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-[#111113] border border-zinc-800 p-5 space-y-4">
                <h2 className="text-base font-bold text-white border-b border-zinc-800 pb-2.5">
                  How Executives Got Caught
                </h2>
                <div className="space-y-3">
                  {caughtBreakdown.map((item) => (
                    <div key={item.method}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-zinc-200 font-medium">{item.method}</span>
                        <span className="text-yellow-400 font-bold font-mono-num">
                          {item.count} cases ({item.pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-[#09090b] border border-zinc-800 h-2">
                        <div
                          className="bg-yellow-400 h-full"
                          style={{ width: `${item.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#111113] border border-zinc-800 p-5 space-y-3">
                <h2 className="text-base font-bold text-white border-b border-zinc-800 pb-2.5">
                  Scandals by Industry Sector
                </h2>
                <div className="divide-y divide-zinc-800 border border-zinc-800 bg-[#09090b]">
                  {sectorStats.map((sec) => (
                    <div
                      key={sec.sector}
                      className="p-3 flex items-center justify-between"
                    >
                      <div>
                        <div className="text-sm font-semibold text-white">{sec.sector}</div>
                        <div className="text-xs text-zinc-400">
                          Avg Score: {sec.avgScore}/100
                        </div>
                      </div>
                      <div className="text-right font-mono-num">
                        <div className="text-xs font-bold text-yellow-400">
                          {sec.count} Cases
                        </div>
                        <div
                          className={`text-xs ${
                            sec.avgT90 >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          90D Avg: {sec.avgT90 >= 0 ? '+' : ''}
                          {sec.avgT90}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* CORPORATE PR EUPHEMISM DECODER */}
            <div className="lg:col-span-7 bg-[#111113] border border-zinc-800 p-5 space-y-4">
              <div className="border-b border-zinc-800 pb-2.5">
                <h2 className="text-base font-bold text-white">
                  Corporate PR Euphemism Translator
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  How SEC Form 8-K filings and press releases disguise executive relationship scandals
                </p>
              </div>

              <div className="space-y-3">
                {redFlags.map((rf) => (
                  <div
                    key={rf.id}
                    className="bg-[#070a0f] border border-slate-800 rounded-xl p-4 space-y-2"
                  >
                    <div className="text-sm font-semibold text-amber-400">
                      {rf.euphemism}
                    </div>
                    <div className="text-sm text-slate-200">
                      <span className="text-emerald-400 font-bold text-xs uppercase mr-2">
                        Translation:
                      </span>
                      {rf.plain_english}
                    </div>
                    <div className="text-xs text-slate-400 pt-1 border-t border-slate-800/80 flex items-center justify-between">
                      <span>Examples: {rf.historical_example}</span>
                      <span className="text-rose-400 font-medium">{rf.risk_level}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            TAB 4: SUBMIT TIP TO SQLITE DATABASE
           ========================================================= */}
        {activeTab === 'SUBMIT' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 bg-[#0d121b] border border-slate-800 rounded-xl p-6">
              <h2 className="text-base font-bold text-white mb-1">
                Submit a Verified Corporate Scandal Tip
              </h2>
              <p className="text-xs text-slate-400 mb-4">
                Submissions are saved directly to the local SQLite database (`data/cheating-index.db`).
              </p>

              <form onSubmit={handleTipSubmit} className="space-y-3.5 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-xs text-slate-400 block mb-1">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={tipForm.company_name}
                      onChange={(e) =>
                        setTipForm({ ...tipForm, company_name: e.target.value })
                      }
                      placeholder="e.g. Acme Corp"
                      className="w-full bg-[#070a0f] border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Ticker</label>
                    <input
                      type="text"
                      value={tipForm.ticker}
                      onChange={(e) => setTipForm({ ...tipForm, ticker: e.target.value })}
                      placeholder="ACME"
                      className="w-full bg-[#070a0f] border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">
                      Executive Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={tipForm.executive_name}
                      onChange={(e) =>
                        setTipForm({ ...tipForm, executive_name: e.target.value })
                      }
                      placeholder="Full Name"
                      className="w-full bg-[#070a0f] border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Role</label>
                    <select
                      value={tipForm.role}
                      onChange={(e) => setTipForm({ ...tipForm, role: e.target.value })}
                      className="w-full bg-[#070a0f] border border-slate-700 rounded-lg px-3 py-2 text-white outline-none"
                    >
                      <option value="CEO">CEO (3x Weight)</option>
                      <option value="Founder / Board">Founder / Board (3x Weight)</option>
                      <option value="CFO / C-Suite">CFO / C-Suite (2x Weight)</option>
                      <option value="VP / SVP">VP / SVP (1x Weight)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    Source Link (SEC 8-K or Major Financial Outlet) *
                  </label>
                  <input
                    type="url"
                    required
                    value={tipForm.source_url}
                    onChange={(e) =>
                      setTipForm({ ...tipForm, source_url: e.target.value })
                    }
                    placeholder="https://..."
                    className="w-full bg-[#070a0f] border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Summary Notes</label>
                  <input
                    type="text"
                    value={tipForm.notes}
                    onChange={(e) => setTipForm({ ...tipForm, notes: e.target.value })}
                    placeholder="What happened and what was the board fallout?"
                    className="w-full bg-[#070a0f] border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-amber-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingTip}
                  className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm transition cursor-pointer"
                >
                  {submittingTip ? 'Saving to SQLite...' : 'Submit Tip'}
                </button>

                {tipSuccessMsg && (
                  <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-600 text-emerald-300 text-xs font-semibold">
                    {tipSuccessMsg}
                  </div>
                )}
              </form>
            </div>

            <div className="lg:col-span-6 bg-[#0d121b] border border-slate-800 rounded-xl p-6 space-y-3">
              <h2 className="text-base font-bold text-white">
                Recent Community Submissions ({tips.length})
              </h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {tips.map((t) => (
                  <div
                    key={t.id}
                    className="bg-[#070a0f] border border-slate-800 rounded-xl p-3.5 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-white">
                        <span className="text-amber-400 font-mono-num mr-1.5">
                          [{t.ticker}]
                        </span>
                        {t.company_name} — {t.executive_name}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-semibold">
                        {t.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">{t.notes}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: SHAREABLE GOLDEN PARACHUTE / CLAWBACK RECEIPT */}
      {showReceiptModal && selectedScandal && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setShowReceiptModal(false)}
        >
          <div
            className="bg-[#111113] border border-zinc-700 max-w-md w-full p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <span className="text-xs font-bold uppercase font-mono-num text-yellow-400">
                Executive Fallout Receipt
              </span>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="text-xs font-mono-num text-zinc-400 hover:text-white cursor-pointer"
              >
                [CLOSE]
              </button>
            </div>

            <div className="bg-[#09090b] border border-dashed border-zinc-700 p-4 font-mono-num text-xs space-y-2">
              <div className="text-center border-b border-dashed border-zinc-800 pb-2">
                <div className="font-bold text-white">
                  {selectedScandal.company_name} ({selectedScandal.ticker})
                </div>
                <div className="text-zinc-400">
                  {selectedScandal.executive_name} / {selectedScandal.role}
                </div>
              </div>

              <div className="space-y-1.5 py-1">
                <div className="flex justify-between">
                  <span className="text-zinc-400">SCANDAL DATE:</span>
                  <span className="text-white">{selectedScandal.incident_date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">INFIDELITY SCORE:</span>
                  <span className="text-red-400 font-bold">
                    {selectedScandal.unfaithfulness_score} / 100
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">CAUGHT BY:</span>
                  <span className="text-yellow-400">{selectedScandal.caught_method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">FINANCIAL FALLOUT:</span>
                  <span className="text-white font-bold">
                    {formatFinancialCost(selectedScandal).label}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">90D STOCK IMPACT:</span>
                  <span
                    className={
                      selectedScandal.stock_impact_t90_after >= 0
                        ? 'text-green-400 font-bold'
                        : 'text-red-400 font-bold'
                    }
                  >
                    {selectedScandal.stock_impact_t90_after >= 0 ? '+' : ''}
                    {selectedScandal.stock_impact_t90_after}%
                  </span>
                </div>
              </div>

              <div className="border-t border-dashed border-zinc-800 pt-2 text-zinc-300 font-sans">
                {selectedScandal.plain_english_translation}
              </div>
            </div>

            <button
              onClick={handleCopyReceipt}
              className="w-full py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-xs font-mono-num uppercase transition cursor-pointer"
            >
              {copiedReceipt ? 'COPIED TO CLIPBOARD' : 'COPY SHAREABLE RECEIPT'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}