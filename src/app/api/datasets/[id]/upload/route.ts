import { NextResponse } from 'next/server';

export async function POST() {
  // Mock: accept upload but do nothing
  return NextResponse.json({ ok: true }, { status: 200 });
}
