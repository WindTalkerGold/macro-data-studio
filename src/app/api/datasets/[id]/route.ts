import { NextResponse } from 'next/server';
import { getDataset } from '@/lib/datasets';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const dataset = await getDataset(id);

    if (!dataset) {
      return NextResponse.json(
        { error: 'Dataset not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(dataset);
  } catch (error) {
    console.error('Error getting dataset:', error);
    return NextResponse.json(
      { error: 'Failed to get dataset' },
      { status: 500 }
    );
  }
}
