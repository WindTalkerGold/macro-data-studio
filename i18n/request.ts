import {getRequestConfig} from 'next-intl/server';
import {routing} from '../src/i18n';

export default getRequestConfig(async ({requestLocale}) => {
  let locale = await requestLocale;

  // Validate that the incoming locale is valid
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  const messages = (await import(`../src/i18n/locales/${locale}.json`)).default;
  return {locale, messages};
});
