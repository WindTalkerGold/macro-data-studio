// Predefined converter registry
// Each converter has an id, name, description, and the script content

import fs from 'fs';
import path from 'path';

export interface PredefinedConverter {
  id: string;
  name: string;
  description: string;
}

// List of available predefined converters
export const predefinedConverters: PredefinedConverter[] = [
  {
    id: 'stats-gov-cn',
    name: 'data.stats.gov.cn',
    description: '国家统计局时间序列数据 (National Bureau of Statistics time series)',
  },
];

// Get the script content for a predefined converter
export function getPredefinedConverterScript(id: string): string | null {
  const convertersDir = path.join(process.cwd(), 'src', 'converters');
  const filePath = path.join(convertersDir, `${id}.js`);

  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

// Check if a converter ID is predefined
export function isPredefinedConverter(id: string): boolean {
  return predefinedConverters.some(c => c.id === id);
}
