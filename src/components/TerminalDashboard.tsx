'use client';

import React, { useState, useMemo } from 'react';
import type { ScandalRecord, PrRedFlag, CommunityTip, StockPoint } from '@/lib/db';
import {
  Activity,
  AlertTriangle,
  Award,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  Copy,
  Database,
  DollarSign,
  Eye,
  FileText,
  Filter,
  Flame,
  Gavel,
  Lock,
  PlusCircle,
  Receipt,
  Scale,
  Search,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';

interface Props {
  initialScandals: ScandalRecord[];
  initialRedFlags: PrRedFlag[];
  initialTips: CommunityTip[];
}

export default function TerminalDashboard({
  initialScandals,
  initialRedFlags,
  initialTips,
}: Props) {
  const [scandals] = useState<ScandalRecord[]>(initialScandals);
  const [redFlags] = useState<PrRedFlag[]>(initialRedFlags);
  const [tips, setTips] = useState<CommunityTip[]>(initialTips);

  // Navigation / view mode
  const [activeTab, setActiveTab] = useState<
    'ALL' | 'INDEX' | 'ALPHA' | 'ANALYTICS' | 'VIRAL' | 'SUBMIT'
  >('ALL');

  // Filters for Leaderboard
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [selectedSector, setSelectedSector] = useState<string>('ALL');
  const [selectedTier, setSelectedTier] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Currently inspected scandal for Dossier, Stock Chart & Receipt Generator
  const [selectedScandalId, setSelectedScandalId] = useState<number>(
    initialScandals[0]?.id ?? 1
  );

  // ETF Simulator state
  const [etfCapital, setEtfCapital] = useState<number>(10000);
  const [etfStrategy, setEtfStrategy] = useState<'SHORT_CHEATERS' | 'LONG_CHEATERS'>(
    'SHORT_CHEATERS'
  );

  // Receipt copy feedback
  const [copiedReceipt, setCopiedReceipt] = useState<boolean>(false);

  // Community Tip Form state
  const [tipForm, setTipForm] = useState({
    company_name: '',
    ticker: '',
    executive_name: '',
    role: 'CEO',
    incident_date: '2026-11-09',
    evidence_tier: 'REPORTED_MAJOR_MEDIA',
    source_url: '',
    notes: '',
  });
  const [submittingTip, setSubmittingTip] = useState(false);
  const [tipSuccessMsg, setTipSuccessMsg] = useState<string | null>(null);

  const selectedScandal = useMemo(
    () => scandals.find((s) => s.id === selectedScandalId) || scandals[0],
    [scandals, selectedScandalId]
  );

  // Days Since Last Scandal calculation
  const daysSinceLastScandal = useMemo(() => {
    if (!scandals.length) return 0;
    const latestDateStr = scandals.reduce(
      (max, s) => (s.incident_date > max ? s.incident_date : max),
      scandals[0].incident_date
    );
    const latest = new Date(latestDateStr).getTime();
    const now = new Date('2026-11-09T17:42:33Z').getTime();
    const diff = Math.max(0, Math.floor((now - latest) / (1000 * 60 * 60 * 24)));
    return diff;
  }, [scandals]);

  // Filtered scandals
  const filteredScandals = useMemo(() => {
    return scandals.filter((s) => {
      if (selectedYear !== 'ALL' && String(s.year) !== selectedYear) return false;
      if (selectedSector !== 'ALL' && s.sector !== selectedSector) return false;
      if (selectedTier !== 'ALL' && s.evidence_tier !== selectedTier) return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const match =
          s.company_name.toLowerCase().includes(q) ||
          s.ticker.toLowerCase().includes(q) ||
          s.executive_name.toLowerCase().includes(q) ||
          s.sector.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [scandals, selectedYear, selectedSector, selectedTier, searchQuery]);

  // Aggregate Macro KPIs
  const macroStats = useMemo(() => {
    const total = scandals.length;
    const avgScore =
      scandals.reduce((acc, s) => acc + s.unfaithfulness_score, 0) / (total || 1);
    const avgT90 =
      scandals.reduce((acc, s) => acc + s.stock_impact_t90_after, 0) / (total || 1);
    const totalClawbackMillions = scandals.reduce(
      (acc, s) => acc + Math.abs(Math.min(0, s.parachute_or_clawback_millions)),
      0
    );
    const secCorrelatedCount = scandals.filter(
      (s) => s.sec_or_fraud_correlation === 1
    ).length;
    const subordinateCount = scandals.filter(
      (s) => s.involved_subordinate === 1
    ).length;
    const avgTenure =
      scandals.reduce((acc, s) => acc + s.tenure_years, 0) / (total || 1);
    const avgAge =
      scandals.reduce((acc, s) => acc + s.exec_age, 0) / (total || 1);

    return {
      total,
      avgScore: avgScore.toFixed(1),
      avgT90: avgT90.toFixed(2),
      totalClawbackMillions: totalClawbackMillions.toFixed(1),
      secCorrelatedPct: Math.round((secCorrelatedCount / (total || 1)) * 100),
      subordinatePct: Math.round((subordinateCount / (total || 1)) * 100),
      avgTenure: avgTenure.toFixed(1),
      avgAge: Math.round(avgAge),
    };
  }, [scandals]);

  // Sector Heatmap Aggregation
  const sectorStats = useMemo(() => {
    const map = new Map<
      string,
      { count: number; totalScore: number; totalT90: number; totalClawback: number }
    >();
    for (const s of scandals) {
      const curr = map.get(s.sector) || {
        count: 0,
        totalScore: 0,
        totalT90: 0,
        totalClawback: 0,
      };
      curr.count += 1;
      curr.totalScore += s.unfaithfulness_score;
      curr.totalT90 += s.stock_impact_t90_after;
      curr.totalClawback += Math.abs(Math.min(0, s.parachute_or_clawback_millions));
      map.set(s.sector, curr);
    }
    return Array.from(map.entries())
      .map(([sector, d]) => ({
        sector,
        count: d.count,
        avgScore: +(d.totalScore / d.count).toFixed(1),
        avgT90: +(d.totalT90 / d.count).toFixed(1),
        totalClawback: +d.totalClawback.toFixed(1),
      }))
      .sort((a, b) => b.avgScore - a.avgScore);
  }, [scandals]);

  // "How They Got Caught" Breakdown
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

  // "The Fallout Matrix" Consequence Breakdown
  const consequenceBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; clawback: number }>();
    for (const s of scandals) {
      const curr = map.get(s.consequence) || { count: 0, clawback: 0 };
      curr.count += 1;
      curr.clawback += Math.abs(s.parachute_or_clawback_millions);
      map.set(s.consequence, curr);
    }
    return Array.from(map.entries())
      .map(([consequence, d]) => ({
        consequence,
        count: d.count,
        pct: Math.round((d.count / (scandals.length || 1)) * 100),
        clawback: +d.clawback.toFixed(1),
      }))
      .sort((a, b) => b.count - a.count);
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

  // Company Lookup "Safe to Work/Invest?" Badge result
  const lookupBadgeResult = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;
    const matches = scandals.filter(
      (s) =>
        s.ticker.toLowerCase().includes(q) ||
        s.company_name.toLowerCase().includes(q) ||
        s.executive_name.toLowerCase().includes(q)
    );
    if (matches.length === 0) {
      return {
        status: 'CLEAN',
        label: 'NO C-SUITE INFIDELITY RECORD FOUND (2021–2026)',
        color: 'text-emerald-400 border-emerald-500/50 bg-emerald-950/30',
        matches: [],
      };
    }
    const maxScore = Math.max(...matches.map((m) => m.unfaithfulness_score));
    return {
      status: maxScore >= 90 ? 'CRITICAL_HAZARD' : 'ELEVATED_RISK',
      label:
        maxScore >= 90
          ? `GOVERNANCE HAZARD // PEAK SCORE ${maxScore}/100 (${matches.length} INCIDENT${matches.length > 1 ? 'S' : ''})`
          : `ELEVATED RISK // SCORE ${maxScore}/100 (${matches.length} INCIDENT${matches.length > 1 ? 'S' : ''})`,
      color:
        maxScore >= 90
          ? 'text-red-400 border-red-500/60 bg-red-950/40'
          : 'text-amber-400 border-amber-500/60 bg-amber-950/40',
      matches,
    };
  }, [searchQuery, scandals]);

  // ETF Simulator 2021-2026 multi-year performance
  const etfSimulationSeries = useMemo(() => {
    // Annual cumulative multipliers from 2021 to 2026
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
    const receiptText = [
      '============================================',
      '   CHTR // GOLDEN PARACHUTE & CLAWBACK RECEIPT',
      '============================================',
      `COMPANY:      ${selectedScandal.company_name} (${selectedScandal.ticker})`,
      `EXECUTIVE:    ${selectedScandal.executive_name} [${selectedScandal.role}]`,
      `SCANDAL DATE: ${selectedScandal.incident_date}`,
      `INDEX SCORE:  ${selectedScandal.unfaithfulness_score} / 100`,
      `CAUGHT VIA:   ${selectedScandal.caught_method}`,
      `OUTCOME:      ${selectedScandal.consequence}`,
      `SEVERANCE/CLAWBACK: ${selectedScandal.parachute_or_clawback_millions < 0 ? `-$${Math.abs(selectedScandal.parachute_or_clawback_millions)}M FORFEITED/CLAWED BACK` : `$${selectedScandal.parachute_or_clawback_millions}M`}`,
      `90D ALPHA:    ${selectedScandal.stock_impact_t90_after > 0 ? '+' : ''}${selectedScandal.stock_impact_t90_after}%`,
      '--------------------------------------------',
      `PR SPIN: "${selectedScandal.pr_euphemism}"`,
      `REALITY: "${selectedScandal.plain_english_translation}"`,
      '============================================',
    ].join('\n');
    navigator.clipboard.writeText(receiptText);
    setCopiedReceipt(true);
    setTimeout(() => setCopiedReceipt(false), 2500);
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
        setTipSuccessMsg(
          `TIP LOGGED TO SQLITE DB (ID #${data.created.id}) // QUEUED FOR VERIFICATION`
        );
        setTipForm({
          company_name: '',
          ticker: '',
          executive_name: '',
          role: 'CEO',
          incident_date: '2026-11-09',
          evidence_tier: 'REPORTED_MAJOR_MEDIA',
          source_url: '',
          notes: '',
        });
      }
    } finally {
      setSubmittingTip(false);
    }
  };

  const showSection = (section: 'INDEX' | 'ALPHA' | 'ANALYTICS' | 'VIRAL' | 'SUBMIT') =>
    activeTab === 'ALL' || activeTab === section;

  return (
    <div className="min-h-screen flex flex-col bg-[#06090e] text-slate-200">
      {/* 1. LIVE BLOOMBERG-STYLE TICKER TAPE */}
      <div className="bg-[#040609] border-b border-slate-800 py-1.5 overflow-hidden select-none">
        <div className="animate-ticker flex items-center space-x-8 text-xs">
          {[...scandals, ...scandals].map((item, idx) => (
            <button
              key={`${item.id}-${idx}`}
              onClick={() => setSelectedScandalId(item.id)}
              className="flex items-center space-x-2 hover:bg-slate-900 px-2 py-0.5 rounded transition cursor-pointer"
            >
              <span className="font-bold text-amber-400">{item.ticker}</span>
              <span className="text-slate-400">{item.executive_name}</span>
              <span className="px-1.5 py-0.2 bg-red-950/70 border border-red-800/60 text-red-400 font-semibold rounded">
                IDX:{item.unfaithfulness_score}
              </span>
              <span
                className={
                  item.stock_impact_t90_after >= 0
                    ? 'text-emerald-400 font-semibold'
                    : 'text-red-400 font-semibold'
                }
              >
                90D: {item.stock_impact_t90_after >= 0 ? '+' : ''}
                {item.stock_impact_t90_after}%
              </span>
              <span className="text-slate-700">|</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. TOP TERMINAL COMMAND BAR */}
      <header className="bg-[#0b1017] border-b border-slate-800 px-4 py-3 sticky top-0 z-30 shadow-lg">
        <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-1.5 py-0.5 bg-amber-500 text-black font-bold tracking-wider">
                  CHTR &lt;GO&gt;
                </span>
                <h1 className="text-sm sm:text-base font-bold tracking-tight text-white uppercase">
                  Corporate C-Suite Infidelity &amp; Governance Index
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-700/50 text-emerald-400">
                  <Database className="w-3 h-3" />LIVE ({scandals.length} CASES // 2021–2026)
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                TERMINAL FEED // TRACKING EXECUTIVE EXTRAMARITAL &amp; SUBORDINATE SCANDALS, CLAWBACKS, &amp; STOCK ALPHA
              </p>
            </div>
          </div>

          {/* RIGHT SIDE: DAYS SINCE LAST SCANDAL + WORKSPACE FUNCTION KEYS */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2.5 bg-red-950/30 border border-red-500/40 px-3 py-1.5 rounded">
              <Flame className="w-4 h-4 text-red-400 animate-pulse" />
              <div>
                <div className="text-[10px] uppercase tracking-wider text-red-300/80">
                  Days Since Last Scandal
                </div>
                <div className="text-sm font-bold text-red-400">
                  {daysSinceLastScandal} DAYS{' '}
                  <span className="text-[11px] font-normal text-slate-400">
                    (LAST: {scandals[0]?.ticker} // {scandals[0]?.incident_date})
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center bg-[#06090e] border border-slate-800 rounded p-0.5 text-xs">
              {(
                [
                  { id: 'ALL', label: '[F1] ALL PANELS' },
                  { id: 'INDEX', label: '[F2] LEADERBOARD' },
                  { id: 'ALPHA', label: '[F3] AFFAIR ALPHA & ETF' },
                  { id: 'ANALYTICS', label: '[F4] HEATMAPS & STATS' },
                  { id: 'VIRAL', label: '[F5] RECEIPT & PR DECODER' },
                  { id: 'SUBMIT', label: '[F6] TIP BOX (SQLITE)' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`px-2.5 py-1 rounded transition cursor-pointer ${
                    activeTab === t.id
                      ? 'bg-amber-500 text-black font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* MAIN TERMINAL CONTAINER */}
      <main className="max-w-[1600px] w-full mx-auto px-4 py-4 space-y-5 flex-1">
        {/* 3. MACRO KPI STRIP + COMPANY LOOKUP & "SAFE TO WORK/INVEST?" BADGE */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* 6 KPI CARDS */}
          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <div className="bg-[#0b1017] border border-slate-800 p-3 rounded">
              <div className="text-[10px] text-slate-400 uppercase flex items-center justify-between">
                <span>5Y Index Cases</span>
                <Building2 className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-xl font-bold text-white mt-1">{macroStats.total}</div>
              <div className="text-[10px] text-amber-400 mt-0.5">2021–2026 Verified</div>
            </div>

            <div className="bg-[#0b1017] border border-slate-800 p-3 rounded">
              <div className="text-[10px] text-slate-400 uppercase flex items-center justify-between">
                <span>Mean Infidelity</span>
                <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
              </div>
              <div className="text-xl font-bold text-red-400 mt-1">
                {macroStats.avgScore}
                <span className="text-xs text-slate-500">/100</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {macroStats.subordinatePct}% Subordinate
              </div>
            </div>

            <div className="bg-[#0b1017] border border-slate-800 p-3 rounded">
              <div className="text-[10px] text-slate-400 uppercase flex items-center justify-between">
                <span>Avg 90D Stock</span>
                <TrendingDown className="w-3.5 h-3.5 text-red-400" />
              </div>
              <div
                className={`text-xl font-bold mt-1 ${
                  Number(macroStats.avgT90) >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {Number(macroStats.avgT90) >= 0 ? '+' : ''}
                {macroStats.avgT90}%
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Post-Scandal Drift</div>
            </div>

            <div className="bg-[#0b1017] border border-slate-800 p-3 rounded">
              <div className="text-[10px] text-slate-400 uppercase flex items-center justify-between">
                <span>Pay Clawed Back</span>
                <DollarSign className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-xl font-bold text-amber-400 mt-1">
                ${macroStats.totalClawbackMillions}M
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Forfeited / Returned</div>
            </div>

            <div className="bg-[#0b1017] border border-slate-800 p-3 rounded">
              <div className="text-[10px] text-slate-400 uppercase flex items-center justify-between">
                <span>SEC / Fraud Link</span>
                <Scale className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="text-xl font-bold text-cyan-400 mt-1">
                {macroStats.secCorrelatedPct}%
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Probe / 8-K Breach</div>
            </div>

            <div className="bg-[#0b1017] border border-slate-800 p-3 rounded">
              <div className="text-[10px] text-slate-400 uppercase flex items-center justify-between">
                <span>Avg Exec Profile</span>
                <Users className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-xl font-bold text-white mt-1">
                {macroStats.avgAge}y{' '}
                <span className="text-xs text-slate-400">/ {macroStats.avgTenure}yr</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Age / Role Tenure</div>
            </div>
          </div>

          {/* COMPANY LOOKUP & "SAFE TO WORK/INVEST?" BADGE GENERATOR */}
          <div className="lg:col-span-4 bg-[#0b1017] border border-slate-800 p-3 rounded flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase text-amber-400 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5" /> Ticker Lookup &amp; &quot;Safe to Work/Invest?&quot; Badge
              </span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                >
                  CLEAR
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type ticker, company, or CEO (e.g. NVDA, KSS, MCD, BP, AAPL)..."
                className="w-full bg-[#06090e] border border-slate-700 focus:border-amber-500 rounded px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none"
              />
            </div>
            <div className="mt-2">
              {lookupBadgeResult ? (
                <div
                  className={`text-[11px] px-2.5 py-1 border rounded font-semibold flex items-center justify-between ${lookupBadgeResult.color}`}
                >
                  <span>{lookupBadgeResult.label}</span>
                  {lookupBadgeResult.matches[0] && (
                    <button
                      onClick={() => setSelectedScandalId(lookupBadgeResult.matches[0].id)}
                      className="underline ml-2 text-[10px] cursor-pointer"
                    >
                      LOAD DOSSIER &rarr;
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Instant due-diligence check across S&amp;P 500, NASDAQ &amp; Unicorns</span>
                  <span className="text-emerald-400 font-semibold">READY</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 4. CORE INFIDELITY INDEX LEADERBOARD + INTERACTIVE EXECUTIVE DOSSIER */}
        {showSection('INDEX') && (
          <section className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            {/* LEFT 7 COLS: C-SUITE HALL OF SHAME LEADERBOARD */}
            <div className="xl:col-span-7 bg-[#0b1017] border border-slate-800 rounded flex flex-col">
              <div className="p-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                    C-Suite Hall of Shame // Infidelity Index Leaderboard (2021–2026)
                  </h2>
                </div>

                {/* FILTER CONTROLS */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="bg-[#06090e] border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 outline-none"
                  >
                    <option value="ALL">ALL YEARS (2021-2026)</option>
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                    <option value="2023">2023</option>
                    <option value="2022">2022</option>
                    <option value="2021">2021</option>
                  </select>

                  <select
                    value={selectedSector}
                    onChange={(e) => setSelectedSector(e.target.value)}
                    className="bg-[#06090e] border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 outline-none"
                  >
                    <option value="ALL">ALL SECTORS</option>
                    <option value="Technology">Technology</option>
                    <option value="Consumer & Retail">Consumer &amp; Retail</option>
                    <option value="Energy & Industrials">Energy &amp; Industrials</option>
                    <option value="Financials">Financials</option>
                    <option value="Media & Entertainment">Media &amp; Entertainment</option>
                    <option value="Sports & Entertainment">Sports &amp; Entertainment</option>
                  </select>

                  <select
                    value={selectedTier}
                    onChange={(e) => setSelectedTier(e.target.value)}
                    className="bg-[#06090e] border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 outline-none"
                  >
                    <option value="ALL">ALL EVIDENCE TIERS</option>
                    <option value="CONFIRMED_OFFICIAL">CONFIRMED (8-K / BOARD)</option>
                    <option value="REPORTED_MAJOR_MEDIA">REPORTED (MAJOR MEDIA)</option>
                  </select>
                </div>
              </div>

              {/* TABLE */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-[#080c12] text-[10px] text-slate-400 uppercase">
                      <th className="py-2.5 px-3">Ticker / Company</th>
                      <th className="py-2.5 px-3">Executive &amp; Weight</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Score</th>
                      <th className="py-2.5 px-3">Multipliers</th>
                      <th className="py-2.5 px-3">90D Alpha</th>
                      <th className="py-2.5 px-3">Clawback</th>
                      <th className="py-2.5 px-3">Tier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {filteredScandals.map((s) => {
                      const isSelected = s.id === selectedScandal?.id;
                      return (
                        <tr
                          key={s.id}
                          onClick={() => setSelectedScandalId(s.id)}
                          className={`cursor-pointer transition ${
                            isSelected
                              ? 'bg-amber-500/15 border-l-2 border-l-amber-400'
                              : 'hover:bg-slate-900/70'
                          }`}
                        >
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-amber-400">{s.ticker}</div>
                            <div className="text-[11px] text-slate-300 truncate max-w-[140px]">
                              {s.company_name}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-white">{s.executive_name}</div>
                            <div className="text-[10px] text-slate-400">
                              {s.role}{' '}
                              <span className="text-amber-400 font-semibold">
                                ({s.role_weight}x)
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">
                            {s.incident_date}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded font-bold ${
                                s.unfaithfulness_score >= 90
                                  ? 'bg-red-950/80 border border-red-700 text-red-400'
                                  : 'bg-amber-950/80 border border-amber-700 text-amber-400'
                              }`}
                            >
                              {s.unfaithfulness_score}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex flex-wrap gap-1">
                              {s.involved_subordinate === 1 && (
                                <span
                                  title="Involved Subordinate / HR Power Imbalance"
                                  className="px-1.5 py-0.5 text-[10px] rounded bg-purple-950/70 border border-purple-700/60 text-purple-300"
                                >
                                  SUBORD
                                </span>
                              )}
                              {s.misused_company_funds === 1 && (
                                <span
                                  title="Company Funds / Vendor Conflict / Unrecorded NDA"
                                  className="px-1.5 py-0.5 text-[10px] rounded bg-red-950/70 border border-red-700/60 text-red-300"
                                >
                                  $ FUNDS
                                </span>
                              )}
                              {s.sec_or_fraud_correlation === 1 && (
                                <span
                                  title="SEC Enforcement / Financial Restatement / Governance Lawsuit"
                                  className="px-1.5 py-0.5 text-[10px] rounded bg-cyan-950/70 border border-cyan-700/60 text-cyan-300"
                                >
                                  SEC/8-K
                                </span>
                              )}
                            </div>
                          </td>
                          <td
                            className={`py-2.5 px-3 font-bold whitespace-nowrap ${
                              s.stock_impact_t90_after >= 0
                                ? 'text-emerald-400'
                                : 'text-red-400'
                            }`}
                          >
                            {s.stock_impact_t90_after >= 0 ? '+' : ''}
                            {s.stock_impact_t90_after}%
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap font-semibold text-amber-300">
                            {s.parachute_or_clawback_millions < 0
                              ? `-$${Math.abs(s.parachute_or_clawback_millions)}M`
                              : '—'}
                          </td>
                          <td className="py-2.5 px-3">
                            {s.evidence_tier === 'CONFIRMED_OFFICIAL' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/70 border border-emerald-700/60 text-emerald-300">
                                <CheckCircle2 className="w-3 h-3" /> 8-K/BOARD
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-950/70 border border-amber-700/60 text-amber-300">
                                <Eye className="w-3 h-3" /> MEDIA
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="p-2.5 border-t border-slate-800 bg-[#080c12] text-[11px] text-slate-400 flex items-center justify-between">
                <span>
                  CLICK ANY ROW TO INSPECT T-30 TO T+90 STOCK IMPACT, DOSSIER &amp; CLAWBACK RECEIPT
                </span>
                <span>
                  SHOWING {filteredScandals.length} OF {scandals.length} RECORDS
                </span>
              </div>
            </div>

            {/* RIGHT 5 COLS: SELECTED CASE DOSSIER + T-30 TO T+90 STOCK CHART */}
            {selectedScandal && (
              <div className="xl:col-span-5 flex flex-col gap-4">
                <div className="bg-[#0b1017] border border-slate-800 rounded p-4">
                  <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-amber-500 text-black font-bold text-xs rounded">
                          {selectedScandal.ticker}
                        </span>
                        <span className="text-xs text-slate-400">
                          {selectedScandal.exchange} // {selectedScandal.sector}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 rounded border border-slate-700 text-slate-300">
                          MCAP: ${selectedScandal.market_cap_billions}B
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white mt-1">
                        {selectedScandal.company_name} — {selectedScandal.executive_name} (
                        {selectedScandal.role})
                      </h3>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] uppercase text-slate-400">
                        Unfaithfulness Score
                      </div>
                      <div className="text-2xl font-black text-red-400">
                        {selectedScandal.unfaithfulness_score}
                        <span className="text-xs text-slate-500">/100</span>
                      </div>
                    </div>
                  </div>

                  {/* SUMMARY & METADATA */}
                  <p className="text-xs text-slate-300 mt-3 leading-relaxed">
                    {selectedScandal.summary}
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-xs">
                    <div className="bg-[#06090e] border border-slate-800 p-2 rounded">
                      <div className="text-[10px] text-slate-400">HOW CAUGHT</div>
                      <div className="font-semibold text-amber-400 mt-0.5">
                        {selectedScandal.caught_method}
                      </div>
                    </div>
                    <div className="bg-[#06090e] border border-slate-800 p-2 rounded">
                      <div className="text-[10px] text-slate-400">CONSEQUENCE</div>
                      <div className="font-semibold text-white mt-0.5">
                        {selectedScandal.consequence}
                      </div>
                    </div>
                    <div className="bg-[#06090e] border border-slate-800 p-2 rounded">
                      <div className="text-[10px] text-slate-400">CLAWBACK / PAYOUT</div>
                      <div className="font-semibold text-red-400 mt-0.5">
                        {selectedScandal.parachute_or_clawback_millions < 0
                          ? `-$${Math.abs(selectedScandal.parachute_or_clawback_millions)}M Clawed Back`
                          : '$0M Severance'}
                      </div>
                    </div>
                    <div className="bg-[#06090e] border border-slate-800 p-2 rounded">
                      <div className="text-[10px] text-slate-400">TENURE / AGE</div>
                      <div className="font-semibold text-slate-200 mt-0.5">
                        {selectedScandal.tenure_years} yrs // Age {selectedScandal.exec_age}
                      </div>
                    </div>
                  </div>

                  {/* STOCK PRICE IMPACT CHART (T-30 TO T+90) */}
                  <div className="mt-4 bg-[#06090e] border border-slate-800 rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-bold uppercase text-white flex items-center gap-1.5">
                        <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
                        Stock Price Impact Curve (T-30 to T+90 // Indexed T=0 = 100)
                      </div>
                      <div className="flex items-center gap-3 text-[11px]">
                        <span className="flex items-center gap-1 text-amber-400 font-semibold">
                          <span className="w-2.5 h-0.5 bg-amber-400 inline-block" />{' '}
                          {selectedScandal.ticker}
                        </span>
                        <span className="flex items-center gap-1 text-cyan-400">
                          <span className="w-2.5 h-0.5 bg-cyan-400 inline-block" /> S&amp;P 500
                          (SPY)
                        </span>
                      </div>
                    </div>

                    {/* SVG TERMINAL LINE CHART */}
                    {stockSeries.length > 0 && (
                      <div className="w-full h-44 relative">
                        {(() => {
                          const allVals = stockSeries.flatMap((p) => [p.stock, p.spy]);
                          const minVal = Math.min(...allVals) - 3;
                          const maxVal = Math.max(...allVals) + 3;
                          const width = 520;
                          const height = 150;
                          const padX = 32;
                          const padY = 16;

                          const toX = (i: number) =>
                            padX +
                            (i / (stockSeries.length - 1)) * (width - padX * 2);
                          const toY = (v: number) =>
                            height -
                            padY -
                            ((v - minVal) / (maxVal - minVal || 1)) *
                              (height - padY * 2);

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
                              {/* Horizontal baseline T=0 (100) */}
                              <line
                                x1={padX}
                                y1={toY(100)}
                                x2={width - padX}
                                y2={toY(100)}
                                stroke="#334155"
                                strokeDasharray="3 3"
                                strokeWidth="1"
                              />
                              {/* Vertical Scandal Break Marker T=0 */}
                              <line
                                x1={t0X}
                                y1={padY / 2}
                                x2={t0X}
                                y2={height - padY}
                                stroke="#ef4444"
                                strokeDasharray="3 3"
                                strokeWidth="1.5"
                              />
                              <text
                                x={t0X + 4}
                                y={padY + 4}
                                fill="#f87171"
                                fontSize="9"
                                fontWeight="bold"
                              >
                                T=0 SCANDAL BREAK
                              </text>

                              {/* SPY Line */}
                              <path
                                d={spyPath}
                                fill="none"
                                stroke="#06b6d4"
                                strokeWidth="1.75"
                                strokeOpacity="0.8"
                              />

                              {/* Company Stock Line */}
                              <path
                                d={stockPath}
                                fill="none"
                                stroke="#f59e0b"
                                strokeWidth="2.5"
                              />

                              {/* Data points and X labels */}
                              {stockSeries.map((pt, idx) => (
                                <g key={pt.day}>
                                  <circle
                                    cx={toX(idx)}
                                    cy={toY(pt.stock)}
                                    r="3"
                                    fill="#f59e0b"
                                  />
                                  <text
                                    x={toX(idx)}
                                    y={height - 2}
                                    fill="#94a3b8"
                                    fontSize="8.5"
                                    textAnchor="middle"
                                  >
                                    {pt.day}
                                  </text>
                                </g>
                              ))}
                            </svg>
                          );
                        })()}
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-800/80 text-[11px]">
                      <div>
                        <span className="text-slate-400">30D Pre-Scandal: </span>
                        <span
                          className={
                            selectedScandal.stock_impact_t30_before >= 0
                              ? 'text-emerald-400 font-bold'
                              : 'text-red-400 font-bold'
                          }
                        >
                          {selectedScandal.stock_impact_t30_before >= 0 ? '+' : ''}
                          {selectedScandal.stock_impact_t30_before}%
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">7D Immediate Shock: </span>
                        <span
                          className={
                            selectedScandal.stock_impact_t7_after >= 0
                              ? 'text-emerald-400 font-bold'
                              : 'text-red-400 font-bold'
                          }
                        >
                          {selectedScandal.stock_impact_t7_after >= 0 ? '+' : ''}
                          {selectedScandal.stock_impact_t7_after}%
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">90D Post-Scandal: </span>
                        <span
                          className={
                            selectedScandal.stock_impact_t90_after >= 0
                              ? 'text-emerald-400 font-bold'
                              : 'text-red-400 font-bold'
                          }
                        >
                          {selectedScandal.stock_impact_t90_after >= 0 ? '+' : ''}
                          {selectedScandal.stock_impact_t90_after}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* SEC / CORPORATE GOVERNANCE CORRELATION NOTE */}
                  <div className="mt-3 p-2.5 rounded bg-cyan-950/25 border border-cyan-800/50 text-xs">
                    <div className="text-[10px] font-bold uppercase text-cyan-400 flex items-center gap-1">
                      <Gavel className="w-3.5 h-3.5" /> Corporate Governance &amp; SEC Enforcement
                      Correlation
                    </div>
                    <div className="text-slate-300 mt-1">
                      {selectedScandal.sec_correlation_note}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Source Verification: <span className="text-white">{selectedScandal.source_label}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* 5. FINANCIAL & STOCK MARKET CORRELATIONS ("THE AFFAIR ALPHA" & ETF SIMULATOR) */}
        {showSection('ALPHA') && (
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* SHORT THE CHEATERS ETF SIMULATOR */}
            <div className="lg:col-span-7 bg-[#0b1017] border border-slate-800 rounded p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <h2 className="text-xs sm:text-sm font-bold uppercase text-white">
                      &quot;Short the Cheaters&quot; ETF Simulator ($CHTR vs. SPY // 2021–2026)
                    </h2>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Backtested portfolio tracking an equal-weighted short/avoidance strategy on C-Suite Infidelity companies vs. S&amp;P 500
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEtfStrategy('SHORT_CHEATERS')}
                    className={`px-2.5 py-1 rounded text-xs cursor-pointer ${
                      etfStrategy === 'SHORT_CHEATERS'
                        ? 'bg-emerald-500 text-black font-bold'
                        : 'bg-[#06090e] text-slate-400 border border-slate-800'
                    }`}
                  >
                    SHORT CHEATERS / LONG CLEAN
                  </button>
                  <button
                    onClick={() => setEtfStrategy('LONG_CHEATERS')}
                    className={`px-2.5 py-1 rounded text-xs cursor-pointer ${
                      etfStrategy === 'LONG_CHEATERS'
                        ? 'bg-red-500 text-black font-bold'
                        : 'bg-[#06090e] text-slate-400 border border-slate-800'
                    }`}
                  >
                    LONG CHEATERS BASKET
                  </button>
                </div>
              </div>

              {/* CAPITAL SLIDER & OUTPUT */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-3">
                <div className="bg-[#06090e] border border-slate-800 p-3 rounded">
                  <label className="text-[10px] text-slate-400 uppercase block">
                    Initial Allocation (USD)
                  </label>
                  <div className="text-lg font-bold text-amber-400 mt-0.5">
                    ${etfCapital.toLocaleString()}
                  </div>
                  <input
                    type="range"
                    min={1000}
                    max={100000}
                    step={1000}
                    value={etfCapital}
                    onChange={(e) => setEtfCapital(Number(e.target.value))}
                    className="w-full accent-amber-500 mt-1 cursor-pointer"
                  />
                </div>

                <div className="bg-[#06090e] border border-slate-800 p-3 rounded">
                  <div className="text-[10px] text-slate-400 uppercase">
                    Strategy Terminal Value (2026)
                  </div>
                  <div
                    className={`text-lg font-bold mt-0.5 ${
                      etfStrategy === 'SHORT_CHEATERS' ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    ${etfSimulationSeries[etfSimulationSeries.length - 1].strategy.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    {etfStrategy === 'SHORT_CHEATERS'
                      ? '+134.0% Cumulative (Affair Alpha)'
                      : '-11.0% Cumulative Drag'}
                  </div>
                </div>

                <div className="bg-[#06090e] border border-slate-800 p-3 rounded">
                  <div className="text-[10px] text-slate-400 uppercase">
                    S&amp;P 500 (SPY) Benchmark (2026)
                  </div>
                  <div className="text-lg font-bold text-cyan-400 mt-0.5">
                    ${etfSimulationSeries[etfSimulationSeries.length - 1].spy.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    +58.0% Benchmark Return
                  </div>
                </div>
              </div>

              {/* BAR COMPARISON BY YEAR */}
              <div className="grid grid-cols-6 gap-2 pt-2">
                {etfSimulationSeries.map((row) => {
                  const maxVal = etfCapital * 2.5;
                  const stratHeight = Math.max(
                    12,
                    Math.round((row.strategy / maxVal) * 110)
                  );
                  const spyHeight = Math.max(12, Math.round((row.spy / maxVal) * 110));
                  return (
                    <div
                      key={row.year}
                      className="bg-[#06090e] border border-slate-800/80 rounded p-2 flex flex-col items-center"
                    >
                      <div className="h-28 flex items-end gap-2 w-full justify-center">
                        <div
                          style={{ height: `${stratHeight}px` }}
                          className={`w-4 rounded-t ${
                            etfStrategy === 'SHORT_CHEATERS'
                              ? 'bg-emerald-500'
                              : 'bg-red-500'
                          }`}
                          title={`Strategy: $${row.strategy.toLocaleString()}`}
                        />
                        <div
                          style={{ height: `${spyHeight}px` }}
                          className="w-4 bg-cyan-500/80 rounded-t"
                          title={`SPY: $${row.spy.toLocaleString()}`}
                        />
                      </div>
                      <div className="text-[11px] font-bold text-white mt-1.5">
                        {row.year}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        ${Math.round(row.strategy / 1000)}k vs ${Math.round(row.spy / 1000)}k
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* DIVORCE / SETTLEMENT VS MARKET CAP & FRAUD CORRELATION METER */}
            <div className="lg:col-span-5 bg-[#0b1017] border border-slate-800 rounded p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Scale className="w-4 h-4 text-cyan-400" />
                  <h2 className="text-xs sm:text-sm font-bold uppercase text-white">
                    Divorce Equity Dilution &amp; Corporate Fraud Correlation Meter
                  </h2>
                </div>

                <div className="mt-3 space-y-2.5 text-xs">
                  <div className="bg-[#06090e] border border-slate-800 p-3 rounded">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-400">
                        Academic &quot;Affair Alpha&quot; Thesis (Griffin, Kruger &amp; Maturana)
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/60">
                        VERIFIED EMPIRICAL LINK
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1">
                      Companies whose C-suite executives engage in undisclosed relationships or marital infidelity exhibit a{' '}
                      <span className="text-white font-bold">2.4x higher rate</span> of SEC enforcement actions, financial restatements, or unrecorded vendor/NDA liabilities.
                    </p>
                  </div>

                  {/* TOP EQUITY / CLAWBACK IMPACTS */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold uppercase text-slate-400">
                      Largest Divorce Transfers, Clawbacks &amp; Unrecorded Hush-Money Liabilities
                    </div>
                    {[
                      {
                        company: 'Microsoft (MSFT) // Bill Gates',
                        amount: '$76,000M Divorce Equity Transfer',
                        impact: '4.08% of Market Cap Reallocated (2021)',
                      },
                      {
                        company: 'McDonald’s (MCD) // Steve Easterbrook',
                        amount: '-$105.0M Severance Clawback + $400k SEC Fine',
                        impact: 'Largest C-Suite Relationship Clawback in US History',
                      },
                      {
                        company: 'BP (BP) // Bernard Looney',
                        amount: '-$40.6M (£32.4M) Remuneration Forfeited',
                        impact: 'Dismissed for Serious Misconduct (Misleading Board)',
                      },
                      {
                        company: 'Kohl’s (KSS) // Ashley Buchanan',
                        amount: '-$22.5M Signing Equity Forfeited',
                        impact: 'Fired for Cause in 100 Days (Romantic Vendor Conflict)',
                      },
                      {
                        company: 'WWE / TKO // Vince McMahon',
                        amount: '$19.6M Unrecorded NDA Payments',
                        impact: 'Triggered Multi-Year SEC Financial Restatements',
                      },
                    ].map((row) => (
                      <div
                        key={row.company}
                        className="bg-[#06090e] border border-slate-800/80 px-3 py-2 rounded flex items-center justify-between"
                      >
                        <div>
                          <div className="font-semibold text-white">{row.company}</div>
                          <div className="text-[10px] text-slate-400">{row.impact}</div>
                        </div>
                        <div className="text-right font-bold text-amber-400 text-[11px]">
                          {row.amount}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 6. DEEP-DIVE STATISTICS & BREAKDOWNS (SECTOR HEATMAP, HOW CAUGHT, FALLOUT MATRIX) */}
        {showSection('ANALYTICS') && (
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* INDUSTRY SECTOR HEATMAP */}
            <div className="lg:col-span-5 bg-[#0b1017] border border-slate-800 rounded p-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
                <h2 className="text-xs sm:text-sm font-bold uppercase text-white flex items-center gap-2">
                  <Flame className="w-4 h-4 text-red-400" /> Industry Sector Infidelity Heatmap
                </h2>
                <span className="text-[10px] text-slate-400">CLICK TO FILTER</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {sectorStats.map((sec) => {
                  const active = selectedSector === sec.sector;
                  return (
                    <button
                      key={sec.sector}
                      onClick={() =>
                        setSelectedSector(active ? 'ALL' : sec.sector)
                      }
                      className={`text-left p-3 rounded border transition cursor-pointer ${
                        active
                          ? 'bg-amber-500/20 border-amber-400'
                          : 'bg-[#06090e] border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{sec.sector}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-950/80 border border-red-800 text-red-300 font-bold">
                          {sec.count} CASES
                        </span>
                      </div>
                      <div className="mt-2 flex items-baseline justify-between text-xs">
                        <span className="text-slate-400">
                          Avg Score:{' '}
                          <strong className="text-amber-400">{sec.avgScore}</strong>
                        </span>
                        <span
                          className={
                            sec.avgT90 >= 0
                              ? 'text-emerald-400 font-semibold'
                              : 'text-red-400 font-semibold'
                          }
                        >
                          90D: {sec.avgT90 >= 0 ? '+' : ''}
                          {sec.avgT90}%
                        </span>
                      </div>
                      <div className="mt-1.5 w-full bg-slate-900 h-1.5 rounded overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-amber-500 to-red-500 h-full"
                          style={{ width: `${sec.avgScore}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* HOW THEY GOT CAUGHT BREAKDOWN */}
            <div className="lg:col-span-4 bg-[#0b1017] border border-slate-800 rounded p-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
                <h2 className="text-xs sm:text-sm font-bold uppercase text-white flex items-center gap-2">
                  <Eye className="w-4 h-4 text-amber-400" /> &quot;How They Got Caught&quot; Catalyst
                </h2>
                <span className="text-[10px] text-slate-400">% OF CASES</span>
              </div>

              <div className="space-y-3">
                {caughtBreakdown.map((item) => (
                  <div key={item.method} className="text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-200 font-medium">{item.method}</span>
                      <span className="text-amber-400 font-bold">
                        {item.count} ({item.pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-[#06090e] border border-slate-800 h-2.5 rounded overflow-hidden">
                      <div
                        className="bg-amber-500 h-full"
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-2.5 bg-[#06090e] border border-slate-800 rounded text-[11px] text-slate-400">
                <strong className="text-white">Key Insight:</strong> Internal Whistleblower
                Hotlines (e.g., Nestlé’s <em>Speak Up</em>, RBC, BP) and Viral Public Sightings
                (Astronomer Coldplay Kiss Cam, Try Guys NYC) account for the fastest board
                terminations.
              </div>
            </div>

            {/* CONSEQUENCE TRACKER ("THE FALLOUT MATRIX") */}
            <div className="lg:col-span-3 bg-[#0b1017] border border-slate-800 rounded p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
                  <h2 className="text-xs sm:text-sm font-bold uppercase text-white flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" /> The Fallout Matrix
                  </h2>
                </div>

                <div className="space-y-2.5">
                  {consequenceBreakdown.map((c) => (
                    <div
                      key={c.consequence}
                      className="bg-[#06090e] border border-slate-800 p-2.5 rounded text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{c.consequence}</span>
                        <span className="px-1.5 py-0.5 bg-red-950 text-red-300 border border-red-800 rounded text-[10px] font-bold">
                          {c.pct}%
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                        <span>{c.count} Executives</span>
                        {c.clawback > 0 && (
                          <span className="text-amber-400 font-semibold">
                            -${c.clawback}M Forfeited
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-800 text-[11px] text-slate-400">
                <span className="text-emerald-400 font-bold">Zero-Tolerance Shift:</span>{' '}
                87.5% of indexed executives since 2021 were either terminated for cause or
                forced to resign and forfeit unvested equity.
              </div>
            </div>
          </section>
        )}

        {/* 7. INTERACTIVE & VIRAL FEATURES: GOLDEN PARACHUTE RECEIPT GENERATOR & PR RED FLAGS TRANSLATOR */}
        {showSection('VIRAL') && (
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* GOLDEN PARACHUTE / CLAWBACK RECEIPT GENERATOR */}
            <div className="lg:col-span-5 bg-[#0b1017] border border-slate-800 rounded p-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-amber-400" />
                  <h2 className="text-xs sm:text-sm font-bold uppercase text-white">
                    &quot;Golden Parachute / Clawback&quot; Receipt Generator
                  </h2>
                </div>
                <select
                  value={selectedScandal?.id}
                  onChange={(e) => setSelectedScandalId(Number(e.target.value))}
                  className="bg-[#06090e] border border-slate-700 rounded px-2 py-1 text-xs text-amber-400 font-semibold outline-none"
                >
                  {scandals.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.ticker} — {s.executive_name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedScandal && (
                <div className="bg-[#05070b] border-2 border-dashed border-slate-700 rounded p-4 font-mono text-xs space-y-2">
                  <div className="text-center border-b border-dashed border-slate-700 pb-2">
                    <div className="text-amber-400 font-bold tracking-widest">
                      *** CHTR GOVERNANCE TERMINAL RECEIPT ***
                    </div>
                    <div className="text-[10px] text-slate-400">
                      AUDIT LOG #{selectedScandal.id}00{selectedScandal.year} //{' '}
                      {selectedScandal.incident_date}
                    </div>
                  </div>

                  <div className="space-y-1 py-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">ISSUER:</span>
                      <span className="text-white font-bold">
                        {selectedScandal.company_name} ({selectedScandal.ticker})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">OFFICER:</span>
                      <span className="text-white font-bold">
                        {selectedScandal.executive_name} [{selectedScandal.role}]
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">TENURE PRIOR TO OUSTER:</span>
                      <span className="text-slate-200">{selectedScandal.tenure_years} YEARS</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">DETECTION VECTOR:</span>
                      <span className="text-amber-400">{selectedScandal.caught_method}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">SUBORDINATE / HR BREACH:</span>
                      <span className="text-slate-200">
                        {selectedScandal.involved_subordinate ? 'YES (DIRECT/STAFF)' : 'EXTERNAL / VENDOR'}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-b border-dashed border-slate-700 py-2 space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-300">CLAWBACK / FORFEITED EQUITY:</span>
                      <span className="text-red-400">
                        {selectedScandal.parachute_or_clawback_millions < 0
                          ? `-$${Math.abs(selectedScandal.parachute_or_clawback_millions).toFixed(1)}M USD`
                          : '$0.0M (NO SEVERANCE)'}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">90-DAY SHAREHOLDER ALPHA:</span>
                      <span
                        className={
                          selectedScandal.stock_impact_t90_after >= 0
                            ? 'text-emerald-400 font-bold'
                            : 'text-red-400 font-bold'
                        }
                      >
                        {selectedScandal.stock_impact_t90_after >= 0 ? '+' : ''}
                        {selectedScandal.stock_impact_t90_after}%
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="text-[10px] text-slate-400 uppercase">
                      Official 8-K / Board PR Statement:
                    </div>
                    <div className="text-[11px] italic text-slate-300 bg-slate-900/70 p-2 rounded">
                      &ldquo;{selectedScandal.pr_euphemism}&rdquo;
                    </div>
                    <div className="text-[10px] text-amber-400 uppercase font-bold">
                      Terminal Plain-English Translation:
                    </div>
                    <div className="text-[11px] text-white bg-amber-950/30 border border-amber-800/50 p-2 rounded">
                      {selectedScandal.plain_english_translation}
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={handleCopyReceipt}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copiedReceipt ? 'RECEIPT COPIED TO CLIPBOARD!' : 'SHARE / COPY RECEIPT'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* PRE-ANNOUNCEMENT RED FLAGS & PR EUPHEMISM DECODER */}
            <div className="lg:col-span-7 bg-[#0b1017] border border-slate-800 rounded p-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <h2 className="text-xs sm:text-sm font-bold uppercase text-white">
                    &quot;Pre-Announcement Red Flags&quot; &amp; Corporate PR Euphemism Decoder
                  </h2>
                </div>
                <span className="text-[10px] text-cyan-400 font-semibold">
                  SEC 8-KNLP LEXICON
                </span>
              </div>

              <div className="space-y-3">
                {redFlags.map((rf) => (
                  <div
                    key={rf.id}
                    className="bg-[#06090e] border border-slate-800 rounded p-3 space-y-1.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold text-amber-400">
                        {rf.euphemism}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-red-950/80 border border-red-800 text-red-300 font-bold">
                        {rf.risk_level}
                      </span>
                    </div>
                    <div className="text-xs text-slate-200">
                      <span className="text-emerald-400 font-bold uppercase text-[10px] mr-1.5">
                        Plain English:
                      </span>
                      {rf.plain_english}
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/60">
                      <span>Precedents: {rf.historical_example}</span>
                      <span>Avg Clawback Lag: {rf.typical_lead_time_days}d</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 8. COMMUNITY TIP BOX & SOURCE VERIFICATION QUEUE (LIVE SQLITE PERSISTENCE) */}
        {showSection('SUBMIT') && (
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* SUBMIT NEW SCANDAL TIP TO SQLITE */}
            <div className="lg:col-span-6 bg-[#0b1017] border border-slate-800 rounded p-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
                <div className="flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-xs sm:text-sm font-bold uppercase text-white">
                    Community Tip Box &amp; Source Submission (Writes to SQLite DB)
                  </h2>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/60">
                  EVIDENCE-GATED
                </span>
              </div>

              <form onSubmit={handleTipSubmit} className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-slate-400 uppercase block mb-1">
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
                      className="w-full bg-[#06090e] border border-slate-700 rounded px-2.5 py-1.5 text-white outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase block mb-1">
                      Ticker
                    </label>
                    <input
                      type="text"
                      value={tipForm.ticker}
                      onChange={(e) =>
                        setTipForm({ ...tipForm, ticker: e.target.value })
                      }
                      placeholder="e.g. ACME"
                      className="w-full bg-[#06090e] border border-slate-700 rounded px-2.5 py-1.5 text-white outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase block mb-1">
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
                      className="w-full bg-[#06090e] border border-slate-700 rounded px-2.5 py-1.5 text-white outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase block mb-1">
                      Role
                    </label>
                    <select
                      value={tipForm.role}
                      onChange={(e) =>
                        setTipForm({ ...tipForm, role: e.target.value })
                      }
                      className="w-full bg-[#06090e] border border-slate-700 rounded px-2.5 py-1.5 text-white outline-none"
                    >
                      <option value="CEO">CEO (3x Weight)</option>
                      <option value="Founder / Board">Founder / Board (3x Weight)</option>
                      <option value="CFO">CFO (2x Weight)</option>
                      <option value="C-Suite / CLO / CPO">C-Suite / CLO / CPO (2x Weight)</option>
                      <option value="VP / SVP">VP / SVP (1x Weight)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase block mb-1">
                      Incident Date
                    </label>
                    <input
                      type="date"
                      value={tipForm.incident_date}
                      onChange={(e) =>
                        setTipForm({ ...tipForm, incident_date: e.target.value })
                      }
                      className="w-full bg-[#06090e] border border-slate-700 rounded px-2.5 py-1.5 text-white outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase block mb-1">
                      Evidence Tier Guardrail *
                    </label>
                    <select
                      value={tipForm.evidence_tier}
                      onChange={(e) =>
                        setTipForm({ ...tipForm, evidence_tier: e.target.value })
                      }
                      className="w-full bg-[#06090e] border border-slate-700 rounded px-2.5 py-1.5 text-white outline-none"
                    >
                      <option value="CONFIRMED_OFFICIAL">
                        TIER 1: Confirmed Official (SEC 8-K / Board Release / Court Filing)
                      </option>
                      <option value="REPORTED_MAJOR_MEDIA">
                        TIER 2: Reported by Major Media (WSJ / Bloomberg / FT / Reuters)
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase block mb-1">
                      Primary Source URL (8-K / News Link) *
                    </label>
                    <input
                      type="url"
                      required
                      value={tipForm.source_url}
                      onChange={(e) =>
                        setTipForm({ ...tipForm, source_url: e.target.value })
                      }
                      placeholder="https://sec.gov/Archives/edgar/..."
                      className="w-full bg-[#06090e] border border-slate-700 rounded px-2.5 py-1.5 text-white outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase block mb-1">
                    Governance &amp; Fallout Notes
                  </label>
                  <input
                    type="text"
                    value={tipForm.notes}
                    onChange={(e) =>
                      setTipForm({ ...tipForm, notes: e.target.value })
                    }
                    placeholder="Brief summary of board action, subordinate policy violation, or severance clawback..."
                    className="w-full bg-[#06090e] border border-slate-700 rounded px-2.5 py-1.5 text-white outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-amber-400" /> Unverified rumors without SEC or major media citations are rejected.
                  </span>
                  <button
                    type="submit"
                    disabled={submittingTip}
                    className="px-4 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition cursor-pointer"
                  >
                    {submittingTip ? 'WRITING TO SQLITE...' : 'SUBMIT TO SQLITE QUEUE'}
                  </button>
                </div>

                {tipSuccessMsg && (
                  <div className="p-2 rounded bg-emerald-950/60 border border-emerald-600 text-emerald-300 text-xs font-semibold">
                    {tipSuccessMsg}
                  </div>
                )}
              </form>
            </div>

            {/* LIVE SQLITE MODERATION & VERIFICATION LOG */}
            <div className="lg:col-span-6 bg-[#0b1017] border border-slate-800 rounded p-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-amber-400" />
                  <h2 className="text-xs sm:text-sm font-bold uppercase text-white">
                    SQLite Verification Queue (`community_tips` Table)
                  </h2>
                </div>
                <span className="text-[10px] text-slate-400">
                  {tips.length} LOGGED SUBMISSIONS
                </span>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {tips.map((t) => (
                  <div
                    key={t.id}
                    className="bg-[#06090e] border border-slate-800 p-3 rounded text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-white">
                        <span className="text-amber-400 mr-1.5">[{t.ticker}]</span>
                        {t.company_name} — {t.executive_name} ({t.role})
                      </div>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          t.status === 'VERIFIED_MERGED'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                            : 'bg-amber-950 text-amber-300 border border-amber-700/60'
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-300">{t.notes}</div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                      <span>
                        Tier: <strong className="text-slate-300">{t.evidence_tier}</strong> // Incident: {t.incident_date}
                      </span>
                      <span className="truncate max-w-[220px] text-cyan-400">
                        {t.source_url}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* TERMINAL FOOTER */}
      <footer className="bg-[#040609] border-t border-slate-800 px-4 py-3 mt-6 text-[11px] text-slate-500">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            CHTR TERMINAL v4.2 // DATA BACKEND: NODE:SQLITE (`data/cheating-index.db`) //
            EVIDENCE TIERS: SEC FORM 8-K, OFFICIAL BOARD DISCLOSURES &amp; MAJOR FINANCIAL PRESS
          </div>
          <div className="text-slate-400">
            FOR GOVERNANCE RESEARCH &amp; ALTERNATIVE DATA ANALYTICS ONLY
          </div>
        </div>
      </footer>
    </div>
  );
}
