import { NextRequest } from 'next/server';
import { defaultLocale, locales } from './index';

export function getRequestLocale(req: NextRequest): string {
  const { pathname } = req.nextUrl;
  const pathLocale = locales.find((l) => pathname.startsWith(`/${l}`));
  if (pathLocale) return pathLocale;
  // Fallback to default if none in path
  return defaultLocale;
}
