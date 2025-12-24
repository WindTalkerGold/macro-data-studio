import { NextResponse } from 'next/server';
import { listDatasets } from '@/lib/datasets';
import { DatasetWithVersions, DataVersion } from '@/types';

export interface DashboardSummary {
  totalDatasets: number;
  totalVersions: number;
  datasetsWithConverter: number;
  recentUpdates: RecentUpdate[];
}

export interface RecentUpdate {
  datasetId: string;
  datasetName: string;
  version: DataVersion;
  updatedAt: string;
}

export async function GET() {
  try {
    const datasets = await listDatasets();

    // Calculate summary
    const totalDatasets = datasets.length;
    const totalVersions = datasets.reduce((sum, ds) => sum + ds.versions.length, 0);
    const datasetsWithConverter = datasets.filter(ds => ds.metadata.hasConverter).length;

    // Get recent updates (all versions from all datasets, sorted by timestamp)
    const allUpdates: RecentUpdate[] = [];
    for (const dataset of datasets) {
      for (const version of dataset.versions) {
        allUpdates.push({
          datasetId: dataset.metadata.id,
          datasetName: dataset.metadata.name,
          version,
          updatedAt: parseTimestamp(version.timestamp),
        });
      }
    }

    // Sort by timestamp descending (most recent first) and take top 10
    allUpdates.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const recentUpdates = allUpdates.slice(0, 10);

    const summary: DashboardSummary = {
      totalDatasets,
      totalVersions,
      datasetsWithConverter,
      recentUpdates,
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}

// Parse timestamp format YYYYMMDD_HHmmss to ISO string
function parseTimestamp(timestamp: string): string {
  const year = timestamp.slice(0, 4);
  const month = timestamp.slice(4, 6);
  const day = timestamp.slice(6, 8);
  const hour = timestamp.slice(9, 11);
  const minute = timestamp.slice(11, 13);
  const second = timestamp.slice(13, 15);
  return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
}
