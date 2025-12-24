import { NextResponse } from 'next/server';
import { getProcessedFileContent } from '@/lib/datasets';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; filename: string }> }
) {
  try {
    const { id, filename } = await params;

    const content = await getProcessedFileContent(id, filename);

    return new NextResponse(JSON.stringify(content, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error downloading processed file:', error);
    return NextResponse.json(
      { error: 'File not found' },
      { status: 404 }
    );
  }
}
