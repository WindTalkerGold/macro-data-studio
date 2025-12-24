import { NextResponse } from 'next/server';

export async function POST() {
  // Mock: pretend to merge selected versions
  return NextResponse.json({ ok: true }, { status: 200 });
}
