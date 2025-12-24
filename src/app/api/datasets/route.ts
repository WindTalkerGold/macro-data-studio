import { NextResponse } from 'next/server';
import {
  createDataset,
  listDatasets,
  saveRawFile,
  saveProcessedFile,
  saveConverterScript,
} from '@/lib/datasets';
import { generateConverterScript, executeConverter, simulateApiLatency } from '@/lib/llm';

export async function GET() {
  try {
    const datasets = await listDatasets();
    return NextResponse.json(datasets);
  } catch (error) {
    console.error('Error listing datasets:', error);
    return NextResponse.json(
      { error: 'Failed to list datasets' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const source = formData.get('source') as string;
    const file = formData.get('file') as File | null;

    if (!name || !description || !source) {
      return NextResponse.json(
        { error: 'Name, description, and source are required' },
        { status: 400 }
      );
    }

    // Create the dataset
    const metadata = await createDataset(name, description, source);

    // If a file was uploaded, process it
    if (file) {
      const csvContent = await file.text();

      // Save raw file
      const version = await saveRawFile(metadata.id, csvContent, file.name);

      // Simulate LLM API call to generate converter script
      await simulateApiLatency();

      // Generate converter script based on CSV structure
      const converterResult = await generateConverterScript(csvContent);

      // Save the converter script
      await saveConverterScript(metadata.id, converterResult.script);

      // Execute the converter to process the initial file
      const processedData = executeConverter(converterResult.script, csvContent);

      // Save processed file
      await saveProcessedFile(metadata.id, version.timestamp, processedData);
    }

    return NextResponse.json({ id: metadata.id, metadata }, { status: 201 });
  } catch (error) {
    console.error('Error creating dataset:', error);
    return NextResponse.json(
      { error: 'Failed to create dataset' },
      { status: 500 }
    );
  }
}
