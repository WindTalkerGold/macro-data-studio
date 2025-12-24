import { NextResponse } from 'next/server';
import { getDataset, getProcessedFileContent, saveMergedVersion } from '@/lib/datasets';
import { mergeDatasets, getMergeStats } from '@/lib/merger';
import { IndicatorData, MergeStrategy } from '@/types';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if dataset exists
    const dataset = await getDataset(id);
    if (!dataset) {
      return NextResponse.json(
        { error: 'Dataset not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { timestamps, strategy = 'latest', note } = body as {
      timestamps: string[];
      strategy?: MergeStrategy;
      note?: string;
    };

    // Validate timestamps
    if (!timestamps || !Array.isArray(timestamps) || timestamps.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 version timestamps are required for merging' },
        { status: 400 }
      );
    }

    // Validate strategy
    if (!['latest', 'average', 'first'].includes(strategy)) {
      return NextResponse.json(
        { error: 'Invalid merge strategy. Use: latest, average, or first' },
        { status: 400 }
      );
    }

    // Find versions and load their processed data
    const datasets: IndicatorData[][] = [];
    const validTimestamps: string[] = [];

    for (const timestamp of timestamps) {
      const version = dataset.versions.find(v => v.timestamp === timestamp);
      if (!version) {
        return NextResponse.json(
          { error: `Version with timestamp ${timestamp} not found` },
          { status: 400 }
        );
      }

      if (!version.processedFileName) {
        return NextResponse.json(
          { error: `Version ${timestamp} does not have processed data` },
          { status: 400 }
        );
      }

      const data = await getProcessedFileContent(id, version.processedFileName) as IndicatorData[];
      datasets.push(data);
      validTimestamps.push(timestamp);
    }

    // Merge the datasets
    const mergedData = mergeDatasets(datasets, strategy);
    const stats = getMergeStats(datasets, mergedData);

    // Save the merged version
    const mergedVersion = await saveMergedVersion(
      id,
      mergedData,
      validTimestamps,
      note
    );

    // Get updated dataset
    const updatedDataset = await getDataset(id);

    return NextResponse.json({
      message: 'Versions merged successfully',
      version: mergedVersion,
      stats,
      dataset: updatedDataset,
    });
  } catch (error) {
    console.error('Error merging versions:', error);
    return NextResponse.json(
      { error: 'Failed to merge versions' },
      { status: 500 }
    );
  }
}
