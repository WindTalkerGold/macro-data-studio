import { NextResponse } from 'next/server';
import { getRawFileContent } from '@/lib/datasets';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; filename: string }> }
) {
  try {
    const { id, filename } = await params;

    const content = await getRawFileContent(id, filename);

    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error downloading raw file:', error);
    return NextResponse.json(
      { error: 'File not found' },
      { status: 404 }
    );
  }
}
