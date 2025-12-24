'use client';

import { useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';

interface RecentUpdate {
  datasetId: string;
  datasetName: string;
  version: {
    timestamp: string;
    rawFileName: string;
    processedFileName?: string;
    note?: string;
  };
  updatedAt: string;
}

interface DashboardSummary {
  totalDatasets: number;
  totalVersions: number;
  datasetsWithConverter: number;
  recentUpdates: RecentUpdate[];
}

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const locale = useLocale();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    try {
      const response = await fetch('/api/dashboard');
      if (response.ok) {
        const data = await response.json();
        setSummary(data);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }

  function formatTimestamp(timestamp: string): string {
    // Format: YYYYMMDD_HHmmss -> YYYY-MM-DD HH:mm
    const year = timestamp.slice(0, 4);
    const month = timestamp.slice(4, 6);
    const day = timestamp.slice(6, 8);
    const hour = timestamp.slice(9, 11);
    const minute = timestamp.slice(11, 13);
    return `${year}-${month}-${day} ${hour}:${minute}`;
  }

  if (loading) {
    return (
      <section>
        <h1 className="text-2xl font-semibold mb-4">{t('title')}</h1>
        <p className="text-neutral-500">{t('loading')}</p>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <h1 className="text-2xl font-semibold">{t('title')}</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded-lg p-6 bg-white dark:bg-neutral-900">
          <div className="text-3xl font-bold text-blue-600">
            {summary?.totalDatasets ?? 0}
          </div>
          <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            {t('summary.datasets')}
          </div>
        </div>
        <div className="border rounded-lg p-6 bg-white dark:bg-neutral-900">
          <div className="text-3xl font-bold text-green-600">
            {summary?.totalVersions ?? 0}
          </div>
          <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            {t('summary.versions')}
          </div>
        </div>
        <div className="border rounded-lg p-6 bg-white dark:bg-neutral-900">
          <div className="text-3xl font-bold text-purple-600">
            {summary?.datasetsWithConverter ?? 0}
          </div>
          <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            {t('summary.withConverter')}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="border rounded-lg p-6 bg-white dark:bg-neutral-900">
        <h2 className="text-lg font-medium mb-4">{t('quickActions.title')}</h2>
        <div className="flex gap-4">
          <Link
            href={`/${locale}/datasets`}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            {t('quickActions.viewDatasets')}
          </Link>
          <Link
            href={`/${locale}/datasets?action=create`}
            className="px-4 py-2 border rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-sm"
          >
            {t('quickActions.createDataset')}
          </Link>
        </div>
      </div>

      {/* Recent Updates */}
      <div className="border rounded-lg bg-white dark:bg-neutral-900">
        <div className="p-6 border-b">
          <h2 className="text-lg font-medium">{t('recentUpdates.title')}</h2>
        </div>
        {!summary?.recentUpdates || summary.recentUpdates.length === 0 ? (
          <div className="p-6 text-neutral-500 text-sm">
            {t('recentUpdates.empty')}
          </div>
        ) : (
          <div className="divide-y">
            {summary.recentUpdates.map((update, index) => (
              <div key={`${update.datasetId}-${update.version.timestamp}-${index}`} className="p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Link
                      href={`/${locale}/datasets/${update.datasetId}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {update.datasetName}
                    </Link>
                    <div className="text-sm text-neutral-500 mt-1">
                      {update.version.note || update.version.rawFileName}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono text-neutral-600 dark:text-neutral-400">
                      {formatTimestamp(update.version.timestamp)}
                    </div>
                    <div className="text-xs text-neutral-400 mt-1">
                      {update.version.processedFileName ? (
                        <span className="text-green-600">{t('recentUpdates.processed')}</span>
                      ) : (
                        <span className="text-yellow-600">{t('recentUpdates.rawOnly')}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
