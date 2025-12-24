'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { DatasetWithVersions } from '@/types';
import FilePreviewModal from '@/components/FilePreviewModal';

interface PreviewFile {
  fileName: string;
  content: string;
  fileType: 'csv' | 'json';
  downloadUrl: string;
}

export default function DatasetDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const t = useTranslations('datasets');

  const [datasetId, setDatasetId] = useState<string | null>(null);
  const [locale, setLocale] = useState<string>('en');
  const [dataset, setDataset] = useState<DatasetWithVersions | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  // Converter script state
  const [converterScript, setConverterScript] = useState<string>('');
  const [converterOpen, setConverterOpen] = useState(false);
  const [scriptLoading, setScriptLoading] = useState(false);
  const [scriptSaving, setScriptSaving] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [scriptSuccess, setScriptSuccess] = useState(false);

  // File preview modal state
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    params.then(({ id, locale: l }) => {
      setDatasetId(id);
      setLocale(l);
      fetchDataset(id);
      fetchConverterScript(id);
    });
  }, [params]);

  async function fetchDataset(id: string) {
    try {
      const response = await fetch(`/api/datasets/${id}`);
      if (response.ok) {
        const data = await response.json();
        setDataset(data);
      } else if (response.status === 404) {
        setError(t('detail.notFound'));
      }
    } catch (err) {
      console.error('Failed to fetch dataset:', err);
      setError(t('detail.fetchError'));
    } finally {
      setLoading(false);
    }
  }

  async function fetchConverterScript(id: string) {
    setScriptLoading(true);
    try {
      const response = await fetch(`/api/datasets/${id}/converter`);
      if (response.ok) {
        const data = await response.json();
        setConverterScript(data.script);
      }
    } catch (err) {
      console.error('Failed to fetch converter script:', err);
    } finally {
      setScriptLoading(false);
    }
  }

  async function handleSaveScript() {
    if (!datasetId) return;

    setScriptSaving(true);
    setScriptError(null);
    setScriptSuccess(false);

    try {
      const response = await fetch(`/api/datasets/${datasetId}/converter`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: converterScript }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save script');
      }

      setScriptSuccess(true);
      setTimeout(() => setScriptSuccess(false), 3000);
    } catch (err) {
      setScriptError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setScriptSaving(false);
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !datasetId) return;

    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/datasets/${datasetId}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload file');
      }

      const { dataset: updatedDataset } = await response.json();
      setDataset(updatedDataset);
      setFile(null);

      // Reset file input
      const fileInput = document.getElementById('upload-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setUploading(false);
    }
  }

  async function handlePreviewFile(
    fileName: string,
    fileType: 'csv' | 'json',
    downloadUrl: string
  ) {
    setPreviewLoading(true);
    try {
      const response = await fetch(downloadUrl);
      if (response.ok) {
        const content = await response.text();
        setPreviewFile({
          fileName,
          content,
          fileType,
          downloadUrl,
        });
      }
    } catch (err) {
      console.error('Failed to fetch file for preview:', err);
    } finally {
      setPreviewLoading(false);
    }
  }

  if (loading) {
    return <p className="text-neutral-500">{t('detail.loading')}</p>;
  }

  if (error && !dataset) {
    return <p className="text-red-600">{error}</p>;
  }

  if (!dataset) {
    return <p className="text-neutral-500">{t('detail.notFound')}</p>;
  }

  return (
    <div className="space-y-8">
      {/* Dataset Info */}
      <section>
        <h1 className="text-2xl font-semibold">{dataset.metadata.name}</h1>
        <p className="text-neutral-600 dark:text-neutral-400 mt-2">
          {dataset.metadata.description}
        </p>
        <div className="flex gap-4 mt-4 text-sm text-neutral-500">
          <span>{t('detail.source')}: {dataset.metadata.source}</span>
          <span>{t('detail.created')}: {new Date(dataset.metadata.created).toLocaleDateString()}</span>
        </div>
      </section>

      {/* Upload New Version */}
      <section className="border rounded-lg p-6 bg-white dark:bg-neutral-900">
        <h2 className="text-lg font-medium mb-4">{t('detail.upload.title')}</h2>
        <form onSubmit={handleUpload} className="flex gap-4 items-end">
          <div className="flex-1">
            <label htmlFor="upload-file" className="block text-sm font-medium mb-1">
              {t('detail.upload.file')}
            </label>
            <input
              id="upload-file"
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 border rounded-md bg-transparent"
            />
          </div>
          <button
            type="submit"
            disabled={!file || uploading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {uploading ? t('detail.upload.uploading') : t('detail.upload.submit')}
          </button>
        </form>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      </section>

      {/* Versions List */}
      <section>
        <h2 className="text-lg font-medium mb-4">{t('detail.versions.title')}</h2>
        {dataset.versions.length === 0 ? (
          <p className="text-neutral-500">{t('detail.versions.empty')}</p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-neutral-100 dark:bg-neutral-800">
                <tr>
                  <th className="px-4 py-2 text-left">{t('detail.versions.timestamp')}</th>
                  <th className="px-4 py-2 text-left">{t('detail.versions.rawFile')}</th>
                  <th className="px-4 py-2 text-left">{t('detail.versions.processedFile')}</th>
                  <th className="px-4 py-2 text-left">{t('detail.versions.actions')}</th>
                  <th className="px-4 py-2 text-left">{t('detail.versions.note')}</th>
                </tr>
              </thead>
              <tbody>
                {dataset.versions.map((version) => (
                  <tr key={version.timestamp} className="border-t">
                    <td className="px-4 py-2 font-mono text-xs">{version.timestamp}</td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => handlePreviewFile(
                          version.rawFileName,
                          'csv',
                          `/api/datasets/${datasetId}/raw/${version.rawFileName}`
                        )}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 disabled:opacity-50"
                        disabled={previewLoading}
                      >
                        {version.rawFileName}
                      </button>
                    </td>
                    <td className="px-4 py-2">
                      {version.processedFileName ? (
                        <button
                          onClick={() => handlePreviewFile(
                            version.processedFileName!,
                            'json',
                            `/api/datasets/${datasetId}/processed/${version.processedFileName}`
                          )}
                          className="px-2 py-1 text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-800 disabled:opacity-50"
                          disabled={previewLoading}
                        >
                          {version.processedFileName}
                        </button>
                      ) : (
                        <span className="text-neutral-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {version.processedFileName ? (
                        <Link
                          href={`/${locale}/datasets/${datasetId}/visualize/${version.timestamp}`}
                          className="px-2 py-1 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-800"
                        >
                          {t('detail.versions.visualize')}
                        </Link>
                      ) : (
                        <span className="text-neutral-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-neutral-500">{version.note || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Converter Script Editor */}
      {dataset.metadata.hasConverter && (
        <section className="border rounded-lg bg-white dark:bg-neutral-900">
          <button
            onClick={() => setConverterOpen(!converterOpen)}
            className="w-full flex items-center justify-between p-6 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg"
          >
            <h2 className="text-lg font-medium">{t('detail.converter.title')}</h2>
            <span className="text-neutral-500">{converterOpen ? '▼' : '▶'}</span>
          </button>
          {converterOpen && (
            <div className="px-6 pb-6">
              <div className="flex items-center justify-end gap-2 mb-4">
                {scriptSuccess && (
                  <span className="text-green-600 text-sm">{t('detail.converter.saved')}</span>
                )}
                {scriptError && (
                  <span className="text-red-600 text-sm">{scriptError}</span>
                )}
                <button
                  onClick={handleSaveScript}
                  disabled={scriptSaving || scriptLoading}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {scriptSaving ? t('detail.converter.saving') : t('detail.converter.save')}
                </button>
              </div>
              {scriptLoading ? (
                <p className="text-neutral-500">{t('detail.converter.loading')}</p>
              ) : (
                <textarea
                  value={converterScript}
                  onChange={(e) => setConverterScript(e.target.value)}
                  className="w-full h-96 px-3 py-2 border rounded-md bg-neutral-50 dark:bg-neutral-800 font-mono text-sm"
                  spellCheck={false}
                />
              )}
              <p className="text-xs text-neutral-500 mt-2">{t('detail.converter.hint')}</p>
            </div>
          )}
        </section>
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <FilePreviewModal
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
          fileName={previewFile.fileName}
          content={previewFile.content}
          fileType={previewFile.fileType}
          downloadUrl={previewFile.downloadUrl}
          downloadLabel={t('detail.preview.download')}
          closeLabel={t('detail.preview.close')}
        />
      )}
    </div>
  );
}
