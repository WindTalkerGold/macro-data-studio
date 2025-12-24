import {getTranslations, setRequestLocale} from 'next-intl/server';

export default async function HomePage({
  params
}: {
  params: Promise<{locale: string}>
}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  return (
    <section>
      <h1 className="text-2xl font-semibold mb-2">{t('home.welcome')}</h1>
      <p className="text-sm text-neutral-600">Mocked landing content.</p>
    </section>
  );
}
