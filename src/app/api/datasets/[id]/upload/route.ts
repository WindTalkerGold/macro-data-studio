import { NextResponse } from 'next/server';
import {
  getDataset,
  getConverterScriptForExecution,
  saveRawFile,
  saveProcessedFile,
} from '@/lib/datasets';
import { executeConverter } from '@/lib/llm';

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

    // Check if converter script exists (either custom or predefined)
    const converterScript = await getConverterScriptForExecution(id);
    if (!converterScript) {
      return NextResponse.json(
        { error: 'No converter script found for this dataset. Please upload initial data first.' },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const csvContent = await file.text();

    // Save raw file
    const version = await saveRawFile(id, csvContent, file.name);

    // Execute the existing converter script (no LLM call needed!)
    const processedData = executeConverter(converterScript, csvContent);

    // Save processed file
    await saveProcessedFile(id, version.timestamp, processedData);

    // Get updated dataset
    const updatedDataset = await getDataset(id);

    return NextResponse.json({
      message: 'File uploaded and processed successfully',
      version,
      dataset: updatedDataset,
      recordsProcessed: Array.isArray(processedData) ? processedData.length : 0,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
