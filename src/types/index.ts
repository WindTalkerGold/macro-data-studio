export interface DatasetMetadata {
  id: string;
  name: string;
  description: string;
  source: string;
  created: string;
  updated: string;
  hasConverter?: boolean; // Whether a converter is available for this dataset
  converterType?: 'predefined' | 'custom' | 'llm'; // Source of converter
  predefinedConverterId?: string; // ID of predefined converter if using one
  visualization?: VisualizationConfig; // How to visualize this dataset
}

export interface VisualizationConfig {
  type: 'timeseries'; // Chart type - currently only timeseries supported
  xAxis: 'year-month'; // X-axis format
  yAxis: string; // Y-axis label
  indicatorField: string; // Field name for indicator grouping
  dataField: string; // Field name for data array
  valueField: string; // Field name for value in data points
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
