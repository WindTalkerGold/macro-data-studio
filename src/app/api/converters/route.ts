import { NextResponse } from 'next/server';
import { predefinedConverters } from '@/converters';

export async function GET() {
  return NextResponse.json(predefinedConverters);
}
