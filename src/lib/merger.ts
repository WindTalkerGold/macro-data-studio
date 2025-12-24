import { IndicatorData, TimeSeriesDataPoint, MergeStrategy } from '@/types';

/**
 * Merge multiple processed JSON datasets into one.
 *
 * Algorithm:
 * 1. Read all selected JSON files
 * 2. Perform full outer join on (indicator, year, month)
 * 3. Handle duplicates based on strategy (latest, average, first)
 * 4. Output merged JSON data
 *
 * @param datasets Array of processed data arrays to merge
 * @param strategy How to handle duplicate data points
 * @returns Merged data array
 */
export function mergeDatasets(
  datasets: IndicatorData[][],
  strategy: MergeStrategy = 'latest'
): IndicatorData[] {
  if (datasets.length === 0) {
    return [];
  }

  if (datasets.length === 1) {
    return datasets[0];
  }

  // Map: indicator -> Map<"year-month" -> {values: number[], latestIndex: number}>
  const indicatorMap = new Map<string, Map<string, { values: number[]; latestIndex: number }>>();

  // Process each dataset (in order, later = newer)
  datasets.forEach((dataset, datasetIndex) => {
    dataset.forEach((indicatorData) => {
      const indicator = indicatorData.indicator;

      if (!indicatorMap.has(indicator)) {
        indicatorMap.set(indicator, new Map());
      }

      const timeMap = indicatorMap.get(indicator)!;

      indicatorData.data.forEach((point) => {
        const timeKey = `${point.year}-${point.month}`;

        if (!timeMap.has(timeKey)) {
          timeMap.set(timeKey, { values: [], latestIndex: datasetIndex });
        }

        const entry = timeMap.get(timeKey)!;
        entry.values.push(point.value);
        entry.latestIndex = datasetIndex; // Track which dataset was latest
      });
    });
  });

  // Build merged result
  const result: IndicatorData[] = [];

  indicatorMap.forEach((timeMap, indicator) => {
    const dataPoints: TimeSeriesDataPoint[] = [];

    timeMap.forEach((entry, timeKey) => {
      const [yearStr, monthStr] = timeKey.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);

      let value: number;

      switch (strategy) {
        case 'latest':
          // Use the last value (from latest dataset)
          value = entry.values[entry.values.length - 1];
          break;
        case 'average':
          // Calculate average of all values
          value = entry.values.reduce((sum, v) => sum + v, 0) / entry.values.length;
          // Round to reasonable precision
          value = Math.round(value * 1000) / 1000;
          break;
        case 'first':
          // Use the first value (from earliest dataset)
          value = entry.values[0];
          break;
        default:
          value = entry.values[entry.values.length - 1];
      }

      dataPoints.push({ year, month, value });
    });

    // Sort data points by time (year, month)
    dataPoints.sort((a, b) => {
      if (a.year !== b.year) {
        return a.year - b.year;
      }
      return a.month - b.month;
    });

    result.push({
      indicator,
      data: dataPoints,
    });
  });

  // Sort indicators alphabetically for consistent output
  result.sort((a, b) => a.indicator.localeCompare(b.indicator));

  return result;
}

/**
 * Get merge statistics to show to the user
 */
export function getMergeStats(
  datasets: IndicatorData[][],
  merged: IndicatorData[]
): {
  totalIndicators: number;
  totalDataPoints: number;
  uniqueIndicators: number;
  duplicatesHandled: number;
} {
  // Count total data points from all source datasets
  let totalDataPoints = 0;
  const allIndicators = new Set<string>();

  datasets.forEach((dataset) => {
    dataset.forEach((indicatorData) => {
      allIndicators.add(indicatorData.indicator);
      totalDataPoints += indicatorData.data.length;
    });
  });

  // Count merged data points
  let mergedDataPoints = 0;
  merged.forEach((indicatorData) => {
    mergedDataPoints += indicatorData.data.length;
  });

  return {
    totalIndicators: allIndicators.size,
    totalDataPoints,
    uniqueIndicators: merged.length,
    duplicatesHandled: totalDataPoints - mergedDataPoints,
  };
}
