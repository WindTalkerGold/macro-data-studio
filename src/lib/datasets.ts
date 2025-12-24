import fs from 'fs/promises';
import path from 'path';
import { DatasetMetadata, DatasetRegistry, DatasetWithVersions, DataVersion } from '@/types';
import { getPredefinedConverterScript, isPredefinedConverter } from '@/converters';

const DATA_STORE_DIR = 'data-store';

export function getDataStorePath(): string {
  return path.join(process.cwd(), DATA_STORE_DIR);
}

export async function ensureDataStore(): Promise<void> {
  const dataStorePath = getDataStorePath();
  try {
    await fs.access(dataStorePath);
  } catch {
    await fs.mkdir(dataStorePath, { recursive: true });
  }
}

export async function getRegistry(): Promise<DatasetRegistry> {
  await ensureDataStore();
  const registryPath = path.join(getDataStorePath(), 'datasets.json');
  try {
    const content = await fs.readFile(registryPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

export async function saveRegistry(registry: DatasetRegistry): Promise<void> {
  await ensureDataStore();
  const registryPath = path.join(getDataStorePath(), 'datasets.json');
  await fs.writeFile(registryPath, JSON.stringify(registry, null, 2), 'utf-8');
}

function generateId(): string {
  return `ds_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

function getTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

export async function createDataset(
  name: string,
  description: string,
  source: string,
  converterOption?: {
    type: 'none' | 'predefined' | 'llm';
    predefinedId?: string;
  }
): Promise<DatasetMetadata> {
  const id = generateId();
  const now = new Date().toISOString();

  const metadata: DatasetMetadata = {
    id,
    name,
    description,
    source,
    created: now,
    updated: now,
    hasConverter: false,
  };

  // Set converter metadata based on option
  if (converterOption?.type === 'predefined' && converterOption.predefinedId) {
    metadata.hasConverter = true;
    metadata.converterType = 'predefined';
    metadata.predefinedConverterId = converterOption.predefinedId;
  } else if (converterOption?.type === 'llm') {
    metadata.converterType = 'llm';
    // hasConverter will be set to true after LLM generates the script
  }

  // Create dataset directory structure
  const datasetPath = path.join(getDataStorePath(), id);
  await fs.mkdir(datasetPath, { recursive: true });
  await fs.mkdir(path.join(datasetPath, 'raw'), { recursive: true });
  await fs.mkdir(path.join(datasetPath, 'processed'), { recursive: true });

  // Save metadata.json
  await fs.writeFile(
    path.join(datasetPath, 'metadata.json'),
    JSON.stringify(metadata, null, 2),
    'utf-8'
  );

  // Update registry
  const registry = await getRegistry();
  registry[id] = {
    metadata,
    versions: [],
  };
  await saveRegistry(registry);

  return metadata;
}

export async function getDataset(id: string): Promise<DatasetWithVersions | null> {
  const registry = await getRegistry();
  return registry[id] || null;
}

export async function listDatasets(): Promise<DatasetWithVersions[]> {
  const registry = await getRegistry();
  return Object.values(registry);
}

/**
 * Save the converter script for a dataset.
 * If the dataset uses a predefined converter, this creates a custom override.
 */
export async function saveConverterScript(id: string, script: string): Promise<void> {
  const registry = await getRegistry();
  if (!registry[id]) {
    throw new Error(`Dataset ${id} not found`);
  }

  const converterPath = path.join(getDataStorePath(), id, 'converter.js');
  await fs.writeFile(converterPath, script, 'utf-8');

  // Update metadata - mark as custom converter now (overriding predefined if any)
  registry[id].metadata.hasConverter = true;
  registry[id].metadata.converterType = 'custom';
  // Keep predefinedConverterId so we know the original source
  registry[id].metadata.updated = new Date().toISOString();
  await saveRegistry(registry);

  // Also update metadata.json
  const metadataPath = path.join(getDataStorePath(), id, 'metadata.json');
  await fs.writeFile(
    metadataPath,
    JSON.stringify(registry[id].metadata, null, 2),
    'utf-8'
  );
}

/**
 * Get the converter script for a dataset.
 * Returns custom script if exists, otherwise predefined script.
 */
export async function getConverterScript(id: string): Promise<{ script: string | null; isPredefined: boolean }> {
  const registry = await getRegistry();
  const dataset = registry[id];

  if (!dataset) {
    return { script: null, isPredefined: false };
  }

  // First try to get custom converter from dataset folder
  const converterPath = path.join(getDataStorePath(), id, 'converter.js');
  try {
    const script = await fs.readFile(converterPath, 'utf-8');
    return { script, isPredefined: false };
  } catch {
    // No custom converter, check for predefined
    if (dataset.metadata.predefinedConverterId) {
      const script = getPredefinedConverterScript(dataset.metadata.predefinedConverterId);
      return { script, isPredefined: true };
    }
    return { script: null, isPredefined: false };
  }
}

/**
 * Get converter script content for execution (either custom or predefined)
 */
export async function getConverterScriptForExecution(id: string): Promise<string | null> {
  const { script } = await getConverterScript(id);
  return script;
}

export async function saveRawFile(id: string, content: string, originalName?: string): Promise<DataVersion> {
  const registry = await getRegistry();
  if (!registry[id]) {
    throw new Error(`Dataset ${id} not found`);
  }

  const timestamp = getTimestamp();
  const rawFileName = `${timestamp}.csv`;
  const rawPath = path.join(getDataStorePath(), id, 'raw', rawFileName);

  await fs.writeFile(rawPath, content, 'utf-8');

  const version: DataVersion = {
    timestamp,
    rawFileName,
    note: originalName ? `Uploaded from: ${originalName}` : undefined,
  };

  registry[id].versions.push(version);
  registry[id].metadata.updated = new Date().toISOString();
  await saveRegistry(registry);

  return version;
}

export async function saveProcessedFile(
  id: string,
  timestamp: string,
  jsonData: unknown
): Promise<void> {
  const registry = await getRegistry();
  if (!registry[id]) {
    throw new Error(`Dataset ${id} not found`);
  }

  const processedFileName = `${timestamp}.json`;
  const processedPath = path.join(getDataStorePath(), id, 'processed', processedFileName);

  await fs.writeFile(processedPath, JSON.stringify(jsonData, null, 2), 'utf-8');

  // Update version with processed file name
  const versionIndex = registry[id].versions.findIndex(v => v.timestamp === timestamp);
  if (versionIndex !== -1) {
    registry[id].versions[versionIndex].processedFileName = processedFileName;
    await saveRegistry(registry);
  }
}

export async function getRawFileContent(id: string, fileName: string): Promise<string> {
  const filePath = path.join(getDataStorePath(), id, 'raw', fileName);
  return fs.readFile(filePath, 'utf-8');
}

export async function getProcessedFileContent(id: string, fileName: string): Promise<unknown> {
  const filePath = path.join(getDataStorePath(), id, 'processed', fileName);
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content);
}
