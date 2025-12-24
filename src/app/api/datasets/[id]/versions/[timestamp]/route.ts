import { NextResponse } from 'next/server';
import { getDataset, deleteVersion } from '@/lib/datasets';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; timestamp: string }> }
) {
  try {
    const { id, timestamp } = await params;

    // Check if dataset exists
    const dataset = await getDataset(id);
    if (!dataset) {
      return NextResponse.json(
        { error: 'Dataset not found' },
        { status: 404 }
      );
    }

    // Check if version exists
    const version = dataset.versions.find(v => v.timestamp === timestamp);
    if (!version) {
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      );
    }

    // Delete the version
    const result = await deleteVersion(id, timestamp);

    // Get updated dataset
    const updatedDataset = await getDataset(id);

    return NextResponse.json({
      message: 'Version deleted successfully',
      ...result,
      dataset: updatedDataset,
    });
  } catch (error) {
    console.error('Error deleting version:', error);
    return NextResponse.json(
      { error: 'Failed to delete version' },
      { status: 500 }
    );
  }
}
