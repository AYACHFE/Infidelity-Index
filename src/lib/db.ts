import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

export interface StockPoint {
  day: string;
  stock: number;
  spy: number;
}

export interface ScandalRecord {
  id: number;
  company_name: string;
  ticker: string;
  exchange: string;
  sector: string;
  executive_name: string;
  role: string;
  role_weight: number;
  incident_date: string;
  year: number;
  unfaithfulness_score: number;
  involved_subordinate: number;
  misused_company_funds: number;
  board_investigation: number;
  caught_method: string;
  consequence: string;
  parachute_or_clawback_millions: number;
  divorce_or_settlement_millions: number;
  market_cap_billions: number;
  stock_impact_t30_before: number;
  stock_impact_t7_after: number;
  stock_impact_t90_after: number;
  stock_series_json: string;
  sec_or_fraud_correlation: number;
  sec_correlation_note: string;
  tenure_years: number;
  exec_age: number;
  pr_euphemism: string;
  plain_english_translation: string;
  summary: string;
  evidence_tier: 'CONFIRMED_OFFICIAL' | 'REPORTED_MAJOR_MEDIA' | string;
  source_label: string;
}

export interface PrRedFlag {
  id: number;
  euphemism: string;
  plain_english: string;
  risk_level: string;
  typical_lead_time_days: number;
  historical_example: string;
}

export interface CommunityTip {
  id: number;
  company_name: string;
  ticker: string;
  executive_name: string;
  role: string;
  incident_date: string;
  evidence_tier: string;
  source_url: string;
  notes: string;
  status: string;
  created_at: string;
}

function getDb() {
  const dbPath = path.join(process.cwd(), 'data', 'cheating-index.db');
  return new DatabaseSync(dbPath);
}

export function getAllTerminalData() {
  const db = getDb();
  try {
    const rawScandals = db
      .prepare('SELECT * FROM scandals ORDER BY incident_date DESC')
      .all() as unknown as ScandalRecord[];

    const rawRedFlags = db
      .prepare('SELECT * FROM pr_red_flags ORDER BY id ASC')
      .all() as unknown as PrRedFlag[];

    const rawTips = db
      .prepare('SELECT * FROM community_tips ORDER BY id DESC')
      .all() as unknown as CommunityTip[];

    // node:sqlite returns null-prototype objects (Object.create(null));
    // spread them into plain objects so Next.js Server -> Client serialization succeeds.
    const scandals = rawScandals.map((r) => ({ ...r }));
    const redFlags = rawRedFlags.map((r) => ({ ...r }));
    const tips = rawTips.map((r) => ({ ...r }));

    return { scandals, redFlags, tips };
  } finally {
    db.close();
  }
}

export function addCommunityTip(input: {
  company_name: string;
  ticker: string;
  executive_name: string;
  role: string;
  incident_date: string;
  evidence_tier: string;
  source_url: string;
  notes: string;
}) {
  const db = getDb();
  try {
    const stmt = db.prepare(`
      INSERT INTO community_tips (
        company_name, ticker, executive_name, role, incident_date,
        evidence_tier, source_url, notes, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_MODERATION', ?)
    `);
    const now = new Date().toISOString();
    const res = stmt.run(
      input.company_name.trim(),
      input.ticker.trim().toUpperCase(),
      input.executive_name.trim(),
      input.role.trim(),
      input.incident_date.trim(),
      input.evidence_tier,
      input.source_url.trim(),
      input.notes.trim(),
      now
    );
    return { id: Number(res.lastInsertRowid), created_at: now };
  } finally {
    db.close();
  }
}
