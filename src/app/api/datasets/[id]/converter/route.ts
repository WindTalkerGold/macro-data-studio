import { NextResponse } from 'next/server';
import { getConverterScript, saveConverterScript, getDataset } from '@/lib/datasets';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const script = await getConverterScript(id);
    if (!script) {
      return NextResponse.json(
        { error: 'Converter script not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ script });
  } catch (error) {
    console.error('Error getting converter script:', error);
    return NextResponse.json(
      { error: 'Failed to get converter script' },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    const { script } = await request.json();
    if (!script || typeof script !== 'string') {
      return NextResponse.json(
        { error: 'Script content is required' },
        { status: 400 }
      );
    }

    await saveConverterScript(id, script);

    return NextResponse.json({ message: 'Converter script updated successfully' });
  } catch (error) {
    console.error('Error updating converter script:', error);
    return NextResponse.json(
      { error: 'Failed to update converter script' },
      { status: 500 }
    );
  }
}
