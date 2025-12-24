import {getTranslations, setRequestLocale} from 'next-intl/server';

export default async function DashboardPage({
  params
}: {
  params: Promise<{locale: string}>
}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  return (
    <section>
      <h1 className="text-2xl font-semibold mb-2">{t('dashboard.title')}</h1>
      <ul className="list-disc pl-6 text-sm text-neutral-700">
        <li>Datasets summary (mock)</li>
        <li>Recent uploads (mock)</li>
        <li>Charts preview (mock)</li>
      </ul>
    </section>
  );
}
