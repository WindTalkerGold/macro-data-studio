import {getRequestConfig} from 'next-intl/server';

export default getRequestConfig(async ({locale}) => {
  const supported = ['en', 'zh-CN'] as const;
  const normalized = supported.includes(locale as any) ? (locale as string) : 'en';
  const messages = (await import(`./src/i18n/locales/${normalized}.json`)).default;
  return {locale: normalized, messages};
});
