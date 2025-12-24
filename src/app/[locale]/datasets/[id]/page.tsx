'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { DatasetWithVersions, MergeStrategy } from '@/types';
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
  const [originalScript, setOriginalScript] = useState<string>(''); // Track original for comparison
  const [isPredefinedConverter, setIsPredefinedConverter] = useState(false);
  const [converterOpen, setConverterOpen] = useState(false);
  const [scriptLoading, setScriptLoading] = useState(false);
  const [scriptSaving, setScriptSaving] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [scriptSuccess, setScriptSuccess] = useState(false);

  // File preview modal state
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Merge state
  const [mergeOpen, setMergeOpen] = useState(false);
  const [selectedForMerge, setSelectedForMerge] = useState<string[]>([]);
  const [mergeStrategy, setMergeStrategy] = useState<MergeStrategy>('latest');
  const [merging, setMerging] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [mergeSuccess, setMergeSuccess] = useState(false);

  // Delete state
  const [deletingVersion, setDeletingVersion] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  async function handleDelete(timestamp: string) {
    if (!datasetId) return;

    setDeletingVersion(timestamp);
    try {
      const response = await fetch(`/api/datasets/${datasetId}/versions/${timestamp}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete version');
      }

      const { dataset: updatedDataset } = await response.json();
      setDataset(updatedDataset);
      setDeleteConfirm(null);
      // Clear from merge selection if it was selected
      setSelectedForMerge((prev) => prev.filter((t) => t !== timestamp));
    } catch (err) {
      console.error('Delete failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete version');
    } finally {
      setDeletingVersion(null);
    }
  }

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
        setOriginalScript(data.script);
        setIsPredefinedConverter(data.isPredefined);
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

      // After saving, it becomes a custom converter
      setOriginalScript(converterScript);
      setIsPredefinedConverter(false);
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

  function toggleVersionForMerge(timestamp: string) {
    setSelectedForMerge((prev) =>
      prev.includes(timestamp)
        ? prev.filter((t) => t !== timestamp)
        : [...prev, timestamp]
    );
  }

  async function handleMerge() {
    if (!datasetId || selectedForMerge.length < 2) return;

    setMerging(true);
    setMergeError(null);
    setMergeSuccess(false);

    try {
      const response = await fetch(`/api/datasets/${datasetId}/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamps: selectedForMerge,
          strategy: mergeStrategy,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to merge versions');
      }

      const { dataset: updatedDataset } = await response.json();
      setDataset(updatedDataset);
      setSelectedForMerge([]);
      setMergeSuccess(true);
      setTimeout(() => setMergeSuccess(false), 3000);
    } catch (err) {
      setMergeError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setMerging(false);
    }
  }

  // Get versions that have processed data (eligible for merging)
  const mergeableVersions = dataset?.versions.filter((v) => v.processedFileName) || [];

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
                    <td className="px-4 py-2 font-mono text-xs">
                      <div className="flex items-center gap-2">
                        {version.timestamp}
                        {version.isMerged && (
                          <span className="px-1.5 py-0.5 text-xs bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 rounded">
                            {t('detail.versions.merged')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      {version.rawFileName ? (
                        <button
                          onClick={() => handlePreviewFile(
                            version.rawFileName!,
                            'csv',
                            `/api/datasets/${datasetId}/raw/${version.rawFileName}`
                          )}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 disabled:opacity-50"
                          disabled={previewLoading}
                        >
                          {version.rawFileName}
                        </button>
                      ) : (
                        <span className="text-neutral-400">-</span>
                      )}
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
                      <div className="flex items-center gap-2">
                        {version.processedFileName && (
                          <Link
                            href={`/${locale}/datasets/${datasetId}/visualize/${version.timestamp}`}
                            className="px-2 py-1 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-800"
                          >
                            {t('detail.versions.visualize')}
                          </Link>
                        )}
                        {deleteConfirm === version.timestamp ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(version.timestamp)}
                              disabled={deletingVersion === version.timestamp}
                              className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                            >
                              {deletingVersion === version.timestamp
                                ? t('detail.versions.deleting')
                                : t('detail.versions.confirmDelete')}
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              disabled={deletingVersion === version.timestamp}
                              className="px-2 py-1 text-xs bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300 rounded hover:bg-neutral-300 dark:hover:bg-neutral-600 disabled:opacity-50"
                            >
                              {t('detail.versions.cancel')}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(version.timestamp)}
                            className="px-2 py-1 text-xs bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800"
                          >
                            {t('detail.versions.delete')}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-neutral-500 text-xs">
                      {version.mergedFrom ? (
                        <span title={version.mergedFrom.join(', ')}>
                          {version.note}
                        </span>
                      ) : (
                        version.note || '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Merge Versions */}
      {mergeableVersions.length >= 2 && (
        <section className="border rounded-lg bg-white dark:bg-neutral-900">
          <button
            onClick={() => setMergeOpen(!mergeOpen)}
            className="w-full flex items-center justify-between p-6 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg"
          >
            <h2 className="text-lg font-medium">{t('detail.merge.title')}</h2>
            <span className="text-neutral-500">{mergeOpen ? '▼' : '▶'}</span>
          </button>
          {mergeOpen && (
            <div className="px-6 pb-6">
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                {t('detail.merge.description')}
              </p>

              {/* Version Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  {t('detail.merge.selectVersions')}
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-2">
                  {mergeableVersions.map((version) => (
                    <label
                      key={version.timestamp}
                      className="flex items-center gap-2 p-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedForMerge.includes(version.timestamp)}
                        onChange={() => toggleVersionForMerge(version.timestamp)}
                        className="text-blue-600"
                      />
                      <span className="font-mono text-sm">{version.timestamp}</span>
                      {version.isMerged && (
                        <span className="px-1.5 py-0.5 text-xs bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 rounded">
                          {t('detail.versions.merged')}
                        </span>
                      )}
                      <span className="text-neutral-500 text-xs">{version.note}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  {t('detail.merge.selected', { count: selectedForMerge.length })}
                </p>
              </div>

              {/* Merge Strategy */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  {t('detail.merge.strategy')}
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="mergeStrategy"
                      value="latest"
                      checked={mergeStrategy === 'latest'}
                      onChange={() => setMergeStrategy('latest')}
                      className="text-blue-600"
                    />
                    <span className="text-sm">{t('detail.merge.strategyLatest')}</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="mergeStrategy"
                      value="average"
                      checked={mergeStrategy === 'average'}
                      onChange={() => setMergeStrategy('average')}
                      className="text-blue-600"
                    />
                    <span className="text-sm">{t('detail.merge.strategyAverage')}</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="mergeStrategy"
                      value="first"
                      checked={mergeStrategy === 'first'}
                      onChange={() => setMergeStrategy('first')}
                      className="text-blue-600"
                    />
                    <span className="text-sm">{t('detail.merge.strategyFirst')}</span>
                  </label>
                </div>
              </div>

              {/* Merge Button */}
              <div className="flex items-center gap-4">
                <button
                  onClick={handleMerge}
                  disabled={merging || selectedForMerge.length < 2}
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
                >
                  {merging ? t('detail.merge.merging') : t('detail.merge.submit')}
                </button>
                {mergeSuccess && (
                  <span className="text-green-600 text-sm">{t('detail.merge.success')}</span>
                )}
                {mergeError && (
                  <span className="text-red-600 text-sm">{mergeError}</span>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Converter Script Editor */}
      {dataset.metadata.hasConverter && (
        <section className="border rounded-lg bg-white dark:bg-neutral-900">
          <button
            onClick={() => setConverterOpen(!converterOpen)}
            className="w-full flex items-center justify-between p-6 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg"
          >
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-medium">{t('detail.converter.title')}</h2>
              {isPredefinedConverter && (
                <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded">
                  {t('detail.converter.predefined')}
                </span>
              )}
            </div>
            <span className="text-neutral-500">{converterOpen ? '▼' : '▶'}</span>
          </button>
          {converterOpen && (
            <div className="px-6 pb-6">
              {isPredefinedConverter && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-md">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {t('detail.converter.predefinedHint')}
                  </p>
                </div>
              )}
              <div className="flex items-center justify-end gap-2 mb-4">
                {scriptSuccess && (
                  <span className="text-green-600 text-sm">{t('detail.converter.saved')}</span>
                )}
                {scriptError && (
                  <span className="text-red-600 text-sm">{scriptError}</span>
                )}
                {isPredefinedConverter && converterScript !== originalScript && (
                  <button
                    onClick={() => setConverterScript(originalScript)}
                    className="px-3 py-1 border text-sm rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  >
                    {t('detail.converter.reset')}
                  </button>
                )}
                <button
                  onClick={handleSaveScript}
                  disabled={scriptSaving || scriptLoading || converterScript === originalScript}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {scriptSaving ? t('detail.converter.saving') : t('detail.converter.saveAsCustom')}
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
