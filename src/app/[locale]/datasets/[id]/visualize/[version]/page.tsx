'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { DatasetMetadata } from '@/types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface TimeSeriesData {
  indicator: string;
  data: { year: number; month: number; value: number }[];
}

// Generate distinct colors for chart lines
function generateColors(count: number) {
  const colors = [
    'rgb(59, 130, 246)',   // blue
    'rgb(239, 68, 68)',    // red
    'rgb(34, 197, 94)',    // green
    'rgb(249, 115, 22)',   // orange
    'rgb(168, 85, 247)',   // purple
    'rgb(236, 72, 153)',   // pink
    'rgb(20, 184, 166)',   // teal
    'rgb(234, 179, 8)',    // yellow
    'rgb(99, 102, 241)',   // indigo
    'rgb(107, 114, 128)',  // gray
    'rgb(6, 182, 212)',    // cyan
    'rgb(132, 204, 22)',   // lime
  ];
  return colors.slice(0, count);
}

export default function VisualizePage({
  params,
}: {
  params: Promise<{ id: string; version: string; locale: string }>;
}) {
  const t = useTranslations('datasets');

  const [datasetId, setDatasetId] = useState<string | null>(null);
  const [version, setVersion] = useState<string | null>(null);
  const [locale, setLocale] = useState<string>('en');
  const [metadata, setMetadata] = useState<DatasetMetadata | null>(null);
  const [data, setData] = useState<TimeSeriesData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndicators, setSelectedIndicators] = useState<Set<string>>(new Set());

  // Time range state
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');

  useEffect(() => {
    params.then(({ id, version: v, locale: l }) => {
      setDatasetId(id);
      setVersion(v);
      setLocale(l);
      fetchData(id, v);
    });
  }, [params]);

  // Calculate available time range from data
  const timeRange = useMemo(() => {
    if (!data) return { min: '', max: '', all: [] as string[] };

    const allTimePoints = new Set<string>();
    data.forEach(series => {
      series.data.forEach(point => {
        allTimePoints.add(`${point.year}-${String(point.month).padStart(2, '0')}`);
      });
    });
    const sorted = Array.from(allTimePoints).sort();
    return {
      min: sorted[0] || '',
      max: sorted[sorted.length - 1] || '',
      all: sorted,
    };
  }, [data]);

  // Initialize time range when data loads
  useEffect(() => {
    if (timeRange.min && timeRange.max && !startTime && !endTime) {
      setStartTime(timeRange.min);
      setEndTime(timeRange.max);
    }
  }, [timeRange, startTime, endTime]);

  async function fetchData(id: string, ver: string) {
    try {
      // Fetch metadata
      const metaResponse = await fetch(`/api/datasets/${id}`);
      if (!metaResponse.ok) {
        throw new Error('Failed to fetch dataset');
      }
      const { metadata: meta } = await metaResponse.json();
      setMetadata(meta);

      // Fetch processed data
      const dataResponse = await fetch(`/api/datasets/${id}/processed/${ver}.json`);
      if (!dataResponse.ok) {
        throw new Error('Failed to fetch data');
      }
      const jsonData = await dataResponse.json();
      setData(jsonData);

      // Select first indicator by default
      if (jsonData.length > 0) {
        setSelectedIndicators(new Set([jsonData[0].indicator]));
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  function toggleIndicator(indicator: string) {
    setSelectedIndicators(prev => {
      const next = new Set(prev);
      if (next.has(indicator)) {
        next.delete(indicator);
      } else {
        next.add(indicator);
      }
      return next;
    });
  }

  function selectAll() {
    if (data) {
      setSelectedIndicators(new Set(data.map(d => d.indicator)));
    }
  }

  function deselectAll() {
    setSelectedIndicators(new Set());
  }

  function resetTimeRange() {
    setStartTime(timeRange.min);
    setEndTime(timeRange.max);
  }

  if (loading) {
    return <p className="text-neutral-500">{t('visualize.loading')}</p>;
  }

  if (error) {
    return <p className="text-red-600">{error}</p>;
  }

  if (!data || !metadata) {
    return <p className="text-neutral-500">{t('detail.notFound')}</p>;
  }

  // Build chart data with time range filter
  const selectedData = data.filter(d => selectedIndicators.has(d.indicator));
  const colors = generateColors(selectedData.length);

  // Filter labels by time range
  const labels = timeRange.all.filter(t => t >= startTime && t <= endTime);

  const chartData = {
    labels,
    datasets: selectedData.map((series, index) => {
      // Create a map for quick lookup
      const valueMap = new Map<string, number>();
      series.data.forEach(point => {
        valueMap.set(`${point.year}-${String(point.month).padStart(2, '0')}`, point.value);
      });

      return {
        label: series.indicator,
        data: labels.map(label => valueMap.get(label) ?? null),
        borderColor: colors[index],
        backgroundColor: colors[index],
        tension: 0.1,
        pointRadius: 2,
        spanGaps: true,
      };
    }),
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // We use our own legend
      },
      title: {
        display: true,
        text: metadata.name,
      },
    },
    scales: {
      y: {
        title: {
          display: true,
          text: metadata.visualization?.yAxis || 'Value',
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{metadata.name}</h1>
          <p className="text-sm text-neutral-500">{t('visualize.version')}: {version}</p>
        </div>
        <Link
          href={`/${locale}/datasets/${datasetId}`}
          className="px-3 py-1.5 text-sm border rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          {t('visualize.back')}
        </Link>
      </div>

      {/* Time Range Control */}
      <div className="border rounded-lg p-4 bg-white dark:bg-neutral-900">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium">{t('visualize.timeRange')}</h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-neutral-500">
              {startTime} ~ {endTime} ({labels.length} {t('visualize.dataPoints')})
            </span>
            <button
              onClick={resetTimeRange}
              className="px-2 py-1 text-xs border rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              {t('visualize.resetRange')}
            </button>
          </div>
        </div>
        <div className="relative pt-1">
          <div className="flex items-center gap-4">
            <span className="text-xs text-neutral-500 w-16">{timeRange.min}</span>
            <div className="flex-1 relative h-8">
              {/* Track background */}
              <div className="absolute top-1/2 -translate-y-1/2 w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded" />
              {/* Selected range */}
              <div
                className="absolute top-1/2 -translate-y-1/2 h-2 bg-blue-500 rounded"
                style={{
                  left: `${(timeRange.all.indexOf(startTime) / (timeRange.all.length - 1)) * 100}%`,
                  right: `${100 - (timeRange.all.indexOf(endTime) / (timeRange.all.length - 1)) * 100}%`,
                }}
              />
              {/* Start slider */}
              <input
                type="range"
                min={0}
                max={timeRange.all.length - 1}
                value={timeRange.all.indexOf(startTime)}
                onChange={(e) => {
                  const idx = parseInt(e.target.value);
                  const endIdx = timeRange.all.indexOf(endTime);
                  if (idx <= endIdx) {
                    setStartTime(timeRange.all[idx]);
                  }
                }}
                className="absolute w-full h-8 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0"
              />
              {/* End slider */}
              <input
                type="range"
                min={0}
                max={timeRange.all.length - 1}
                value={timeRange.all.indexOf(endTime)}
                onChange={(e) => {
                  const idx = parseInt(e.target.value);
                  const startIdx = timeRange.all.indexOf(startTime);
                  if (idx >= startIdx) {
                    setEndTime(timeRange.all[idx]);
                  }
                }}
                className="absolute w-full h-8 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0"
              />
            </div>
            <span className="text-xs text-neutral-500 w-16 text-right">{timeRange.max}</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="border rounded-lg p-4 bg-white dark:bg-neutral-900">
        <div className="h-[500px]">
          {selectedData.length > 0 ? (
            <Line data={chartData} options={chartOptions} />
          ) : (
            <div className="h-full flex items-center justify-center text-neutral-500">
              {t('visualize.selectIndicator')}
            </div>
          )}
        </div>
      </div>

      {/* Indicator Selection */}
      <div className="border rounded-lg p-4 bg-white dark:bg-neutral-900">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">{t('visualize.indicators')}</h2>
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="px-2 py-1 text-xs border rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              {t('visualize.selectAll')}
            </button>
            <button
              onClick={deselectAll}
              className="px-2 py-1 text-xs border rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              {t('visualize.deselectAll')}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.map((series) => {
            const isSelected = selectedIndicators.has(series.indicator);
            const color = isSelected ? colors[Array.from(selectedIndicators).indexOf(series.indicator)] : undefined;
            return (
              <button
                key={series.indicator}
                onClick={() => toggleIndicator(series.indicator)}
                className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                  isSelected
                    ? 'border-transparent text-white'
                    : 'border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
                style={isSelected ? { backgroundColor: color } : undefined}
              >
                {series.indicator}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
