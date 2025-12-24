/**
 * LLM Service for Converter Script Generation
 *
 * This module generates JavaScript converter scripts by analyzing CSV structure.
 * In production, this would call the DeepSeek API to generate intelligent converters.
 * Currently uses mock implementations that detect common data patterns.
 */

export interface ConverterGenerationResult {
  script: string;
  detectedFormat: string;
  sampleOutput: Record<string, unknown>[];
}

/**
 * Analyzes CSV content and generates a JavaScript converter script.
 *
 * Mock implementation: Detects common Chinese statistical data formats
 * and generates appropriate converter scripts.
 *
 * In production, this would call DeepSeek API with a prompt like:
 * "分析以下CSV数据的结构，生成一个JavaScript转换函数..."
 */
export async function generateConverterScript(csvContent: string): Promise<ConverterGenerationResult> {
  const lines = csvContent.trim().split('\n');

  // Detect the data format
  const format = detectDataFormat(lines);

  let script: string;
  let sampleOutput: Record<string, unknown>[] = [];

  switch (format) {
    case 'stats-gov-timeseries':
      script = generateStatsGovTimeseriesConverter();
      sampleOutput = executeConverter(script, csvContent).slice(0, 3);
      break;
    case 'standard-csv':
    default:
      script = generateStandardCsvConverter(lines);
      sampleOutput = executeConverter(script, csvContent).slice(0, 3);
      break;
  }

  return {
    script,
    detectedFormat: format,
    sampleOutput,
  };
}

/**
 * Detects the format of the CSV data
 */
function detectDataFormat(lines: string[]): string {
  // Check for Chinese National Bureau of Statistics format
  // Characteristics:
  // - First line contains metadata like "数据库：月度数据"
  // - Has "指标" column with time periods as other columns
  // - Time format: "2025年11月" or similar

  if (lines.length >= 3) {
    const firstLine = lines[0];
    const thirdLine = lines[2] || '';

    // Check for stats.gov.cn format markers
    if (
      (firstLine.includes('数据库') || firstLine.includes('时间')) &&
      thirdLine.includes('指标') &&
      /\d{4}年\d{1,2}月/.test(thirdLine)
    ) {
      return 'stats-gov-timeseries';
    }
  }

  return 'standard-csv';
}

/**
 * Generates converter for National Bureau of Statistics time series data
 * Format: Rows are indicators, columns are time periods
 */
function generateStatsGovTimeseriesConverter(): string {
  return `/**
 * 国家统计局时间序列数据转换器
 * 数据格式：行为指标，列为时间段（如"2025年11月"）
 * 输出格式：按指标分组，每个指标下按时间排序的数据
 */
module.exports = function convert(csvContent) {
  const lines = csvContent.trim().split('\\n');

  // 跳过元数据行，找到包含"指标"的行作为表头
  let headerLineIndex = -1;
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    if (lines[i].includes('指标')) {
      headerLineIndex = i;
      break;
    }
  }

  if (headerLineIndex === -1) {
    return [];
  }

  // 解析表头获取时间列
  const headerCells = parseCSVLine(lines[headerLineIndex]);
  const timeColumns = [];

  for (let i = 1; i < headerCells.length; i++) {
    const cell = headerCells[i].trim();
    const match = cell.match(/(\\d{4})年(\\d{1,2})月/);
    if (match) {
      timeColumns.push({
        index: i,
        year: parseInt(match[1], 10),
        month: parseInt(match[2], 10)
      });
    }
  }

  // 按时间排序（从早到晚）
  timeColumns.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });

  // 解析数据行，按指标分组
  const result = [];

  for (let i = headerLineIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.includes('数据来源')) continue;

    const cells = parseCSVLine(line);
    const indicator = cells[0]?.trim();

    if (!indicator) continue;

    // 为每个指标创建一个对象，包含时间序列数据
    const indicatorData = {
      indicator: indicator,
      data: []
    };

    // 按时间顺序添加数据点
    for (const tc of timeColumns) {
      const valueStr = cells[tc.index]?.trim();
      const value = valueStr ? parseFloat(valueStr) : null;

      if (value !== null && !isNaN(value)) {
        indicatorData.data.push({
          year: tc.year,
          month: tc.month,
          value: value
        });
      }
    }

    result.push(indicatorData);
  }

  return result;
};

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}`;
}

/**
 * Generates converter for standard CSV format
 */
function generateStandardCsvConverter(lines: string[]): string {
  const headers = lines[0]?.split(',').map(h => h.trim().replace(/"/g, '')) || [];

  return `/**
 * 标准CSV数据转换器
 * 自动检测到的列：${headers.join(', ')}
 */
module.exports = function convert(csvContent) {
  const lines = csvContent.trim().split('\\n');
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const result = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    const row = {};

    headers.forEach((header, index) => {
      const value = values[index]?.trim().replace(/"/g, '') || '';

      // 尝试转换为数字
      if (value && !isNaN(Number(value))) {
        row[header.trim()] = Number(value);
      } else if (value === '' || value.toLowerCase() === 'null') {
        row[header.trim()] = null;
      } else {
        row[header.trim()] = value;
      }
    });

    result.push(row);
  }

  return result;
};

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}`;
}

/**
 * Executes a converter script on CSV content
 * Used both for generating sample output and for actual conversion
 */
export function executeConverter(script: string, csvContent: string): Record<string, unknown>[] {
  try {
    // Create a function from the script
    // The script exports a convert function via module.exports
    const moduleExports: { exports: unknown } = { exports: null };
    const moduleFunc = new Function('module', 'exports', script);
    moduleFunc(moduleExports, moduleExports.exports);

    const convert = moduleExports.exports as (csv: string) => Record<string, unknown>[];
    return convert(csvContent);
  } catch (error) {
    console.error('Error executing converter:', error);
    return [];
  }
}

/**
 * Mock delay to simulate API latency
 */
export async function simulateApiLatency(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 300));
}
