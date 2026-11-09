import { NextResponse } from 'next/server';
import { getAllTerminalData, addCommunityTip } from '@/lib/db';

export async function GET() {
  try {
    const data = getAllTerminalData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('SQLite fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to load SQLite index data' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      company_name,
      ticker,
      executive_name,
      role,
      incident_date,
      evidence_tier,
      source_url,
      notes,
    } = body;

    if (!company_name || !executive_name || !source_url) {
      return NextResponse.json(
        { error: 'Company name, executive name, and source URL are required.' },
        { status: 400 }
      );
    }

    const created = addCommunityTip({
      company_name,
      ticker: ticker || 'PVT',
      executive_name,
      role: role || 'CEO',
      incident_date: incident_date || new Date().toISOString().slice(0, 10),
      evidence_tier: evidence_tier || 'REPORTED_MAJOR_MEDIA',
      source_url,
      notes: notes || '',
    });

    const updatedData = getAllTerminalData();
    return NextResponse.json({
      success: true,
      created,
      tips: updatedData.tips,
    });
  } catch (error) {
    console.error('Failed to insert tip:', error);
    return NextResponse.json(
      { error: 'Failed to save tip to SQLite database' },
      { status: 500 }
    );
  }
}
