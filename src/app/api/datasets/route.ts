import { NextResponse } from 'next/server';
import {
  createDataset,
  listDatasets,
  saveRawFile,
  saveProcessedFile,
  saveConverterScript,
  getConverterScriptForExecution,
} from '@/lib/datasets';
import { generateConverterScript, executeConverter, simulateApiLatency } from '@/lib/llm';
import { getPredefinedConverterScript } from '@/converters';

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
    const converterType = formData.get('converterType') as string | null; // 'none' | 'predefined' | 'llm'
    const predefinedConverterId = formData.get('predefinedConverterId') as string | null;

    if (!name || !description || !source) {
      return NextResponse.json(
        { error: 'Name, description, and source are required' },
        { status: 400 }
      );
    }

    // Determine converter option
    const converterOption = converterType ? {
      type: converterType as 'none' | 'predefined' | 'llm',
      predefinedId: predefinedConverterId || undefined,
    } : undefined;

    // Create the dataset
    const metadata = await createDataset(name, description, source, converterOption);

    // If a file was uploaded, process it
    if (file) {
      const csvContent = await file.text();

      // Save raw file
      const version = await saveRawFile(metadata.id, csvContent, file.name);

      let converterScript: string | null = null;

      if (converterType === 'predefined' && predefinedConverterId) {
        // Use predefined converter - no need to save, it's already available
        converterScript = getPredefinedConverterScript(predefinedConverterId);
      } else if (converterType === 'llm') {
        // Simulate LLM API call to generate converter script
        await simulateApiLatency();

        // Generate converter script based on CSV structure
        const converterResult = await generateConverterScript(csvContent);
        converterScript = converterResult.script;

        // Save the converter script
        await saveConverterScript(metadata.id, converterScript);
      }

      // Execute the converter to process the initial file (if we have one)
      if (converterScript) {
        const processedData = executeConverter(converterScript, csvContent);
        await saveProcessedFile(metadata.id, version.timestamp, processedData);
      }
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
