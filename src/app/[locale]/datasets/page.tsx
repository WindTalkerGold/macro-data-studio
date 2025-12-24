'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { DatasetWithVersions } from '@/types';

export default function DatasetsPage() {
  const t = useTranslations('datasets');
  const locale = useLocale();
  const router = useRouter();

  const [datasets, setDatasets] = useState<DatasetWithVersions[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreateExpanded, setIsCreateExpanded] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [source, setSource] = useState('');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    fetchDatasets();
  }, []);

  async function fetchDatasets() {
    try {
      const response = await fetch('/api/datasets');
      if (response.ok) {
        const data = await response.json();
        setDatasets(data);
      }
    } catch (err) {
      console.error('Failed to fetch datasets:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);
      formData.append('source', source);
      if (file) {
        formData.append('file', file);
      }

      const response = await fetch('/api/datasets', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create dataset');
      }

      const { id } = await response.json();
      router.push(`/${locale}/datasets/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setCreating(false);
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">{t('title')}</h1>

      {/* Dataset List - Shown first */}
      <section>
        <h2 className="text-lg font-medium mb-4">{t('list.title')}</h2>
        {loading ? (
          <p className="text-neutral-500">{t('list.loading')}</p>
        ) : datasets.length === 0 ? (
          <p className="text-neutral-500">{t('list.empty')}</p>
        ) : (
          <div className="grid gap-4">
            {datasets.map((dataset) => (
              <a
                key={dataset.metadata.id}
                href={`/${locale}/datasets/${dataset.metadata.id}`}
                className="block border rounded-lg p-4 hover:border-blue-500 transition-colors"
              >
                <h3 className="font-medium">{dataset.metadata.name}</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                  {dataset.metadata.description}
                </p>
                <div className="flex gap-4 mt-2 text-xs text-neutral-500">
                  <span>{t('list.source')}: {dataset.metadata.source}</span>
                  <span>{t('list.versions')}: {dataset.versions.length}</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      {/* Create Dataset Form - Collapsible */}
      <section className="border rounded-lg bg-white dark:bg-neutral-900">
        <button
          type="button"
          onClick={() => setIsCreateExpanded(!isCreateExpanded)}
          className="w-full p-4 flex items-center justify-between text-left"
        >
          <h2 className="text-lg font-medium">{t('create.title')}</h2>
          <span className="text-xl">{isCreateExpanded ? '−' : '+'}</span>
        </button>

        {isCreateExpanded && (
          <form onSubmit={handleSubmit} className="p-6 pt-0 space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                {t('create.name')}
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-md bg-transparent"
                placeholder={t('create.namePlaceholder')}
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-1">
                {t('create.description')}
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={3}
                className="w-full px-3 py-2 border rounded-md bg-transparent"
                placeholder={t('create.descriptionPlaceholder')}
              />
            </div>

            <div>
              <label htmlFor="source" className="block text-sm font-medium mb-1">
                {t('create.source')}
              </label>
              <input
                id="source"
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-md bg-transparent"
                placeholder={t('create.sourcePlaceholder')}
              />
            </div>

            <div>
              <label htmlFor="file" className="block text-sm font-medium mb-1">
                {t('create.file')}
              </label>
              <input
                id="file"
                type="file"
                accept=".csv"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 border rounded-md bg-transparent"
              />
              <p className="text-xs text-neutral-500 mt-1">{t('create.fileHint')}</p>
            </div>

            {error && (
              <p className="text-red-600 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? t('create.creating') : t('create.submit')}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
