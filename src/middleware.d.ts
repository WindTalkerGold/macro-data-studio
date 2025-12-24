import 'next-intl';

declare module 'next-intl' {
  export interface IntlMessages {
    'app.title': string;
    'nav.home': string;
    'nav.dashboard': string;
    'home.welcome': string;
    'dashboard.title': string;
    'language.switch': string;
  }
}
