export interface DatasetMetadata {
  id: string;
  name: string;
  description: string;
  source: string;
  created: string;
  updated: string;
  hasConverter?: boolean; // Whether converter.js exists for this dataset
}

export interface DataVersion {
  timestamp: string; // Format: YYYYMMDD_HHmmss
  rawFileName: string;
  processedFileName?: string;
  note?: string;
}

export interface DatasetWithVersions {
  metadata: DatasetMetadata;
  versions: DataVersion[];
}

// Stored in data-store/datasets.json
export interface DatasetRegistry {
  [datasetId: string]: DatasetWithVersions;
}
