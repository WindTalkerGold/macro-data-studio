import { NextResponse } from 'next/server';

export async function POST() {
  // Mock: return a simple ECharts option stub
  return NextResponse.json({ ok: true, option: { title: { text: 'Mock Chart' } } }, { status: 200 });
}
