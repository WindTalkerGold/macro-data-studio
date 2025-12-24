import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  locales: ['en', 'zh-CN'],
  defaultLocale: 'en'
});

export const config = {
  matcher: [
    '/((?!_next|api|.*\\.\w+$).*)'
  ]
};
